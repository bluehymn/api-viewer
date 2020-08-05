import * as vscode from 'vscode';
import { SimpleAstParser } from './ast-parser';
import { compile as schemaToTypescript } from 'json-schema-to-typescript';
import * as strings from './utils/strings';
import * as fs from 'fs';
import * as path from 'path';
import { APINode } from './tree-view';
import { DEFAULT_REQ_BODY_TYPE_NAME } from './constants';
import { ExecutionPlan, Position, API } from './types';
import { getDomainFullPath } from './utils/domain';
import { insertCodeAfterLine } from './utils/file';

// 查找最后一个interface的位置, 没有则返回最后一个import的位置，默认返回第一行
export function getLastInterfacePosition(
  fullFilePath: string,
  codeText: string,
): Position {
  const parser = new SimpleAstParser();
  let insertLine = 0;
  const { importNodes, interfaceNodes } = parser.parseImportsAndTypes(
    fullFilePath,
    codeText,
  );
  
  if (importNodes.length) {
    const lastImportNode = importNodes[importNodes.length - 1];
    insertLine = lastImportNode.endPosition.line + 1;
  }
  if (interfaceNodes.length) {
    const lastInterfaceNode = interfaceNodes[interfaceNodes.length - 1];
    insertLine = lastInterfaceNode.endPosition.line + 1;
  }
  return {
    line: insertLine,
    character: 0,
  };
}

export async function genResponseTypes(resBody: API['resBody'], resTypeName: string) {
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
    reqBodyTypeStr = reqBodyTypeStr.replace(
      /\s*\[k: string\]:\sunknown;/g,
      '',
    );
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

export async function insertTypes(
  editor: vscode.TextEditor,
  props: APINode['props'],
  resTypeName: string,
): Promise<ExecutionPlan.InsertCode> {
  const codeText = editor.document.getText();
  const fullFilePath = editor.document.fileName;
  const snippetString = new vscode.SnippetString();

  try {
    const responseTypeStr = await genResponseTypes(props.resBody, resTypeName);
    const reqBodyTypeStr = await genRequestTypes(props.reqBody);
    snippetString.appendText('\n' + responseTypeStr + reqBodyTypeStr);
    const position = getLastInterfacePosition(fullFilePath, codeText);
    return {
      code: snippetString,
      line: position.line,
      character: 0,
    };
  } catch (e) {
    return {
      code: snippetString,
      line: -1,
      character: 0,
    };
  }
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

  if (!domainFullPath) {
    return undefined;
  }

  domainModelDirFullPath = domainFullPath + 'model';
  entityFileFullPath = path.join(domainFullPath, 'model', strings.dasherize(domainName) + '.entity.ts');
  modelFileFullPath = path.join(domainFullPath, 'model', strings.dasherize(domainName) + '.model.ts');
  interfacesFileFullPath = path.join(domainFullPath, 'model', 'interfaces.ts');
  
  entityFileText = fs.readFileSync(entityFileFullPath).toString();
  modelFileText = fs.readFileSync(modelFileFullPath).toString();
  interfacesFileText = fs.readFileSync(modelFileFullPath).toString();

  try {
    const resTypeEntityStr = await genResponseTypes(props.resBody, resTypeName + 'Entity');
    const resTypeModelStr = await genResponseTypes(props.resBody, resTypeName + 'Model');
    const reqBodyParamsTypeStr = await genRequestTypes(props.reqBody);
    const entityInsertPos = getLastInterfacePosition(entityFileFullPath, entityFileText);
    const modelInsertPos = getLastInterfacePosition(modelFileFullPath, modelFileText);
    const interfacesInsertPos = getLastInterfacePosition(interfacesFileFullPath, interfacesFileText);

    insertCodeAfterLine(entityFileFullPath, entityInsertPos.line, resTypeEntityStr);
    insertCodeAfterLine(modelFileFullPath, modelInsertPos.line, resTypeModelStr);
    insertCodeAfterLine(interfacesFileFullPath, interfacesInsertPos.line, reqBodyParamsTypeStr);
  } catch (e) {

  }
}