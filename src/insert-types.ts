import * as vscode from 'vscode';
import { SimpleAstParser } from './ast-parser';
import { compile as schemaToTypescript } from 'json-schema-to-typescript';
import * as strings from './utils/strings';

import { APINode } from './extension';
import { DEFAULT_REQ_BODY_TYPE_NAME } from './constants';

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
  parser: SimpleAstParser,
  props: APINode['props'],
  resTypeName: string,
) {
  const doc = editor.document;
  const fullFilePath = editor.document.fileName;

  try {
    let responseTypeStr = '';
    if (props.res_body) {
      let resBodyJson;
      try {
        resBodyJson = JSON.parse(props.res_body);
        responseTypeStr = await schemaToTypescript(
          JSON.parse(props.res_body),
          resTypeName,
          {
            bannerComment: `/* ${strings.classify(resTypeName)} */`,
          },
        );
        responseTypeStr = responseTypeStr.replace(
          /\s*\[k: string\]:\sunknown;/g,
          '',
        );
      } catch (e) {}
    }

    let reqBodyTypeStr: string = '';
    // TODO: 参数类型JSON: 取req_body_other, 后续支持form类型
    if (props.req_body_other) {
      reqBodyTypeStr = await schemaToTypescript(
        JSON.parse(props.req_body_other),
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

    const snippetString = new vscode.SnippetString();
    snippetString.appendText('\n' + responseTypeStr + reqBodyTypeStr);
    const { importNodes, interfaceNodes } = parser.parseImportsAndTypes(
      fullFilePath,
      doc.getText(),
    );
    let insertLine = 0;
    if (importNodes.length) {
      const lastImportNode = importNodes[importNodes.length - 1];
      insertLine = lastImportNode.endPosition.line + 1;
    }
    if (interfaceNodes.length) {
      const lastInterfaceNode = interfaceNodes[interfaceNodes.length - 1];
      insertLine = lastInterfaceNode.endPosition.line + 1;
    }
    // 插入类型
    await editor.insertSnippet(
      snippetString,
      new vscode.Position(insertLine, 0),
    );
    return snippetString;
  } catch (e) {}
}