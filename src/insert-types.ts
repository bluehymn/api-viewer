import * as vscode from 'vscode';
import { SimpleAstParser } from './ast-parser';
import { compile as schemaToTypescript } from 'json-schema-to-typescript';
import * as strings from './utils/strings';
import * as fs from 'fs';
import * as path from 'path';
import { APINode } from './tree-view';
import { DEFAULT_REQ_BODY_TYPE_NAME } from './constants';
import { ExecutionRule, Position, API, ImportDeclarationNode } from './types';
import { getDomainFullPath } from './utils/domain';
import { insertTextIntoFile } from './utils/file';
import * as ts from 'typescript';

// 查找最后一个interface的位置, 没有则返回最后一个import的位置，默认返回第一行
export function getLastInterfacePosition(
  fullFilePath: string,
  codeText: string,
): Position {
  const parser = new SimpleAstParser();
  let line = -1;
  const { importNodes, interfaceNodes } = parser.parseImportsAndTypes(
    fullFilePath,
    codeText,
  );

  if (importNodes.length) {
    const lastImportNode = importNodes[importNodes.length - 1];
    line = lastImportNode.endPosition.line;
  }
  if (interfaceNodes.length) {
    const lastInterfaceNode = interfaceNodes[interfaceNodes.length - 1];
    line = lastInterfaceNode.endPosition.line;
  }
  return {
    line,
    character: 0,
  };
}

export function getImportDeclarationNodeByModule(
  fullFilePath: string,
  sourceText: string,
  module: string,
): {
  target: ImportDeclarationNode | undefined;
  importNodes: ImportDeclarationNode[];
} {
  const parser = new SimpleAstParser();
  let insertLine = 0;
  const { importNodes } = parser.parseImportsAndTypes(fullFilePath, sourceText);
  const sourceFile = SimpleAstParser.createSourceFile(fullFilePath, sourceText);
  const result: ReturnType<typeof getImportDeclarationNodeByModule> = {
    target: undefined,
    importNodes,
  };
  for (let i = 0; i < importNodes.length; i++) {
    const node = importNodes[i];
    const moduleSpec = node.declaration.moduleSpecifier;
    // @ts-ignore'
    // moduleSpecifier 是 ts.Expression 类型没有 text 成员，实际有 text
    if (moduleSpec.text === module) {
      result.target = node;
      return result;
    }
  }
  return result;
}

export async function genResponseTypes(
  resBody: API['resBody'],
  resTypeName: string,
) {
  let responseTypeStr = '';
  if (resBody) {
    let resBodyJson;
    resBodyJson = resBody;
    responseTypeStr = await schemaToTypescript(resBody, resTypeName, {
      bannerComment: `/* ${strings.classify(resTypeName)} */`,
    });
    responseTypeStr = responseTypeStr.replace(
      /\s*\[k: string\]:\sunknown;/g,
      '',
    );
  }
  return responseTypeStr;
}

export async function genRequestTypes(reqBody: API['reqBody']) {
  let reqBodyTypeStr: string = '';
  if (reqBody) {
    reqBodyTypeStr = await schemaToTypescript(
      reqBody,
      DEFAULT_REQ_BODY_TYPE_NAME,
      {
        bannerComment: '',
      },
    );
    reqBodyTypeStr = reqBodyTypeStr.replace(/\s*\[k: string\]:\sunknown;/g, '');
  }
  return reqBodyTypeStr;
}

/**
 *
 * @param editor
 * @param parser
 * @param props
 * @param resTypeName
 *
 * 插入到最后一个类型定义或者 import 语句下面一行
 */

export async function createInsertTypesRule(
  editor: vscode.TextEditor,
  props: APINode['props'],
  resTypeName: string,
): Promise<ExecutionRule.InsertCode> {
  const codeText = editor.document.getText();
  const fullFilePath = editor.document.fileName;
  const snippetString = new vscode.SnippetString();
  const rule: ExecutionRule.InsertCode = {
    code: snippetString,
    line: 0,
    character: 0,
  };
  try {
    const responseTypeStr = await genResponseTypes(props.resBody, resTypeName);
    const reqBodyTypeStr = await genRequestTypes(props.reqBody);
    // TODO：'\n' +
    snippetString.appendText(responseTypeStr + reqBodyTypeStr);
    const position = getLastInterfacePosition(fullFilePath, codeText);
    rule.line = position.line + 1;
  } catch (e) {
    console.error(e);
  }
  return rule;
}

export async function insertTypesIntoModel(
  domainName: string,
  props: APINode['props'],
  resTypeName: string,
) {
  const domainFullPath = getDomainFullPath(domainName);
  let domainModelDirFullPath = '';
  let entityFileFullPath = '';
  let modelFileFullPath = '';
  let interfacesFileFullPath = '';
  let entityFileText = '';
  let modelFileText = '';
  let interfacesFileText = '';
  const entityName = resTypeName + 'Entity';
  const modelName = resTypeName + 'Model';
  const paramsName = DEFAULT_REQ_BODY_TYPE_NAME;
  const entityModule =
    '../model/' + strings.dasherize(domainName) + '.entity';
  const modelModule = '../model/' + strings.dasherize(domainName) + '.model';
  const interfacesModule = '../model/interfaces';

  if (!domainFullPath) {
    return undefined;
  }

  domainModelDirFullPath = domainFullPath + 'model';
  entityFileFullPath = path.join(
    domainFullPath,
    'model',
    entityModule + '.ts',
  );
  modelFileFullPath = path.join(
    domainFullPath,
    'model',
    modelModule + '.ts',
  );
  interfacesFileFullPath = path.join(domainFullPath, 'model', interfacesModule + '.ts');

  entityFileText = fs.readFileSync(entityFileFullPath).toString();
  modelFileText = fs.readFileSync(modelFileFullPath).toString();
  interfacesFileText = fs.readFileSync(interfacesFileFullPath).toString();

  try {
    const resTypeEntityStr = await genResponseTypes(props.resBody, entityName);
    const resTypeModelStr = await genResponseTypes(props.resBody, modelName);
    const reqBodyParamsTypeStr = await genRequestTypes(props.reqBody);
    const entityInsertPos = getLastInterfacePosition(
      entityFileFullPath,
      entityFileText,
    );
    const modelInsertPos = getLastInterfacePosition(
      modelFileFullPath,
      modelFileText,
    );
    const interfacesInsertPos = getLastInterfacePosition(
      interfacesFileFullPath,
      interfacesFileText,
    );

    insertTextIntoFile(
      entityFileFullPath,
      entityInsertPos.line + 1,
      0,
      resTypeEntityStr,
    );
    insertTextIntoFile(
      modelFileFullPath,
      modelInsertPos.line + 1,
      0,
      resTypeModelStr,
    );
    insertTextIntoFile(
      interfacesFileFullPath,
      interfacesInsertPos.line + 1,
      0,
      reqBodyParamsTypeStr,
    );

    importTypeIntoRepository(domainName, entityName, entityModule);
    importTypeIntoRepository(domainName, modelName, modelModule);
    if (reqBodyParamsTypeStr) {
      importTypeIntoRepository(domainName, paramsName, interfacesModule);
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * 将类型 import 到 repository
 * import { entity } from '../model/*.entity.ts';
 * import { model } from '../model/*.model.ts';
 * import { params } from '../model/interfaces.ts';
 * @param source 模块名或者模块路径
 */

export function importTypeIntoRepository(
  domainName: string,
  typeName: string,
  module: string,
) {
  const domainFullPath = getDomainFullPath(domainName);
  const repositoryFileFullPath = path.join(
    domainFullPath!,
    'repository',
    strings.dasherize(domainName) + '.repository.ts',
  );
  const sourceText = fs.readFileSync(repositoryFileFullPath, 'utf8').toString();
  const sourceFile = SimpleAstParser.createSourceFile(
    repositoryFileFullPath,
    sourceText,
  );
  const entityImportNode = getImportDeclarationNodeByModule(
    repositoryFileFullPath,
    sourceText,
    module,
  );

  if (entityImportNode.target) {
    // 找到 import 的 NameImports 插入到最后一个后面
    const importClause = entityImportNode.target.declaration.importClause;
    if (importClause) {
      const children = importClause.getChildren(sourceFile);
      for (let i = 0; i < children.length; i++) {
        if (children[i].kind === ts.SyntaxKind.NamedImports) {
          const nameImports = children[i].getChildren(sourceFile);
          if (nameImports.length) {
            /**
             * nameImports 的结构
             * 0: { - OpenBraceToken = 18,
             *
             * 1:  Name1, Name2... - SyntaxList = 324
             *
             * 2: } - CloseBraceToken = 19,
             */
            const syntaxNodeList = nameImports[1].getChildren(sourceFile);
            let lastNode: ts.Node | undefined;
            if (syntaxNodeList.length) {
              lastNode = syntaxNodeList[syntaxNodeList.length - 1];
            }
            if (lastNode?.kind !== ts.SyntaxKind.CommaToken) {
              typeName = ', ' + typeName;
            } else {
              typeName = ' ' + typeName;
            }
            if (lastNode) {
              const {
                endLineAndCharacter,
              } = SimpleAstParser.getCodeLineNumbers(lastNode, sourceFile);

              insertTextIntoFile(
                repositoryFileFullPath,
                endLineAndCharacter.line,
                endLineAndCharacter.character,
                typeName,
              );
            }
          }
          break;
        }
      }
    }
  } else {
    // prettier-ignore
    const importDeclarationStr = `import { ${typeName} } from '${module}'`;
    let lineNum = 0;
    const length = entityImportNode.importNodes.length;
    if (length > 0) {
      const lastNode = entityImportNode.importNodes[length - 1];
      lineNum = lastNode.endPosition.line;
    }
    insertTextIntoFile(
      repositoryFileFullPath,
      lineNum + 1,
      0,
      importDeclarationStr,
    );
  }
}
