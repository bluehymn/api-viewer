import * as ejs from 'ejs';
import * as vscode from 'vscode';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as _path_ from 'path';
import * as _ from 'lodash';
import { SimpleAstParser } from './ast-parser';

import { MethodDeclarationNode } from './types';
import { APINode } from './tree-view';
import { DEFAULT_REQ_BODY_TYPE_NAME } from './constants';
const DEFAULT_TEMPLATE_FILE_PATH = 'template.apiviewer';

const DEFAULT_METHOD_TEMPLATE = `
  <%= method_name %>(<%= params_str %><% if (need_request_body) { %><% if (params_str) { %>, <% } %>reqBody: <%= req_body_type %><% } %>) {
    return this.http.<%= http_method %><<%= response_type %>>(\`<%= path %><%- query_params_str %>\`<% if (need_request_body) { %>, reqBody <% } %>);
  }
`;

const DEFAULT_FUNCTION_TEMPLATE = `
  export const <%= method_name %> = (<%= params_str %><% if (need_request_body) { %><% if (params_str) { %>, <% } %>reqBody: <%= req_body_type %><% } %>) => {
    return http.<%= http_method %><<%= response_type %>>(\`<%= path %><%- query_params_str %>\`<% if (need_request_body) { %>, reqBody <% } %>);
  }
`;

/**
 * 模板提供的 data 变量属性
 * @property {string} method_name 方法名
 * @property {string} http_method http 方法类型
 * @property {string} response_type response 数据类型名
 * @property {array} params - 入参列表
 * @property {boolean} need_request_body - 是否需要 request body
 * @property {string} req_body_type - request body 类型名
 * @property {string} res_type - response type
 * @property {string} path - 接口路径
 * @property {array} query_params - query 参数列表
 * @property {string} params_str - 已拼接的入参
 * @property {string} query_params_str - 已拼接的 query 参数
 */

function genRequestCode(
  method: string,
  path: string,
  resTypeName = 'ResponseType',
  methodName = 'requestSomething',
  pathParams: string[] = [],
  queryParams: string[] = [],
  reqBodyTypeName: string,
  templateStr: string
) {
  // 读取模板文件
  if (vscode.workspace.rootPath) {
    const configTemplateFilePath = _.trim(
      vscode.workspace.getConfiguration('api-viewer').templateFilePath,
    );
    if (configTemplateFilePath) {
      const fileFullPath = _path_.join(
        vscode.workspace.rootPath || '',
        configTemplateFilePath || DEFAULT_TEMPLATE_FILE_PATH,
      );
      const fileBuffer = fs.readFileSync(fileFullPath);
      const fileStr = fileBuffer.toString();
      let templateMatches = fileStr.match(/```method((.|[\r\n\s])+)```/m);
      if (templateMatches) {
        const tmpStr = templateMatches[1];
        templateStr = tmpStr;
      }
    }

  }

  // 拼接参数
  let paramsStr = '';
  let queryParamsStr = '';
  let needReqBody = false;
  if (pathParams.length) {
    paramsStr += pathParams.map((i) => i + ': string, ').join('');
  }
  if (queryParams.length) {
    if (paramsStr === '') {
      paramsStr += queryParams.map((i) => i + ': string, ').join('');
    }
    queryParamsStr = '?';
    queryParams.forEach((param, index) => {
      queryParamsStr += (index === 0 ? '' : '&') + `${param}=\${${param}}`;
    });
  }

  // 暂时只区分 Post Put 与其它 method
  if (['POST', 'PUT'].indexOf(method) > -1) {
    if (reqBodyTypeName) {
      needReqBody = true;
    }
  }
  paramsStr = paramsStr.replace(/,\s$/, '');
  method = method.toLowerCase();
  const str = ejs.render(templateStr, {
    method_name: methodName,
    params_str: paramsStr,
    req_body_type: reqBodyTypeName,
    http_method: method,
    response_type: resTypeName,
    path,
    query_params_str: queryParamsStr,
    need_request_body: needReqBody,
  });
  return str;
}

/**
 *
 * @param editor
 * @param parser
 * @param props
 * @param resTypeName
 * @param requestMethodName
 *
 * 方法将插入到最后 一个 public method 下面一行
 * 如果没有定义 method, 将插入到 constructor 下面一行
 */

export async function insertMethod(
  editor: vscode.TextEditor,
  parser: SimpleAstParser,
  props: APINode['props'],
  resTypeName: string,
  requestMethodName: string,
  insertPlace: vscode.QuickPickItem | undefined,
) {
  const doc = editor.document;
  const fullFilePath = editor.document.fileName;
  // 插入请求方法
  const classNodes = parser.parseClass(fullFilePath, doc.getText());
  if (classNodes.length) {
    let serviceClass;
    for (let i = 0; i < classNodes.length; i++) {
      const className = classNodes[i].declaration.name;
      if (className?.text.match(/Service$/)) {
        serviceClass = classNodes[i];
        break;
      }
    }
    if (serviceClass) {
      const methods = serviceClass.methods;
      const constructorNode = serviceClass.constructor;
      const method = props.method;
      let path = props.path;
      const pathParams = props.req_params.map((i) => i.name);
      const queryParams = props.req_query.map((i) => i.name);
      let insertLine = -1;
      // 将 path 修改成模板字符串
      if (pathParams.length) {
        pathParams.forEach((param) => {
          path = path.replace(new RegExp(`([^$]){${param}}`), `$1\${${param}}`);
        });
      }
      if (constructorNode) {
        insertLine = constructorNode.startPosition.line + 1;
      }
      if (methods.length) {
        let lastPublicMethod: MethodDeclarationNode | null = null;
        methods.forEach((m) => {
          let isPrivateMethod = false;
          ts.forEachChild(m.declaration, (node) => {
            if (node.kind === ts.SyntaxKind.PrivateKeyword) {
              isPrivateMethod = true;
            }
          });
          if (!isPrivateMethod) {
            lastPublicMethod = m;
          }
        });
        if (lastPublicMethod) {
          insertLine =
            (<MethodDeclarationNode>lastPublicMethod).endPosition.line + 1;
        }
      }
      if (insertLine > 0) {
        const comment = `/* ${props.title} */\n`;
        let templateStr = DEFAULT_FUNCTION_TEMPLATE;
        if (insertPlace?.label === 'service-class') {
          templateStr = DEFAULT_METHOD_TEMPLATE;
        }
        let _snippetString = genRequestCode(
          method,
          path,
          resTypeName,
          requestMethodName,
          pathParams,
          queryParams,
          DEFAULT_REQ_BODY_TYPE_NAME,
          templateStr
        );
        _snippetString = '\n  ' + comment + '  ' + _snippetString + '\n';
        const snippetString = new vscode.SnippetString();
        snippetString.appendText(_snippetString);
        if (insertPlace) {
          if (insertPlace.label === 'service-class') {
            editor.insertSnippet(
              snippetString,
              new vscode.Position(insertLine, 0),
            );
          }
          if (insertPlace.label === 'cursor-position') {
            editor.insertSnippet(snippetString);
          }
        } else {
          editor.insertSnippet(snippetString);
        }
      }
    }
  }
}
