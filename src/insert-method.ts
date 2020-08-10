import * as ejs from 'ejs';
import * as vscode from 'vscode';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as _path_ from 'path';
import * as _ from 'lodash';
import { SimpleAstParser } from './ast-parser';

import {
  MethodDeclarationNode,
  ExecutionRule,
  Position,
  ClassDeclarationNode,
} from './types';
import { APINode } from './tree-view';
import {
  DEFAULT_REQ_BODY_TYPE_NAME,
  InsertReqCodePosition,
  ParamsStructureType,
} from './constants';
import { getConfiguration } from './utils/vscode';
import { getRepositoryFileFullPath } from './utils/domain';
import { insertTextIntoFile } from './utils/file';
import { DEFAULT_FUNCTION_TEMPLATE, DEFAULT_METHOD_TEMPLATE } from './template';
const DEFAULT_TEMPLATE_FILE_PATH = 'template.apiviewer';



/**
 * 模板提供的 data 变量属性
 * @property {string} method_name 方法名
 * @property {string} http_method http 方法类型
 * @property {string} response_type response 数据类型名
 * @property {array} params 入参列表
 * @property {boolean} need_request_body 是否需要 request body
 * @property {string} req_body_type request body 类型名
 * @property {string} res_type response type
 * @property {string} path 接口路径
 * @property {array} query_params - query 参数列表
 * @property {string} params_str 已拼接的入参
 * @property {object} params_object_str 对象类型的入参
 * @property {string} query_params_str 已拼接的 query 参数
 */

/**
 *
 * @param method
 * @param path
 * @param resTypeName
 * @param methodName
 * @param pathParams
 * @param queryParams
 * @param reqBodyTypeName
 * @param templateStr
 * @param paramsStructureType
 */

function genRequestCode(
  method: string,
  path: string,
  resTypeName: string,
  methodName = 'requestSomething',
  pathParams: string[] = [],
  queryParams: string[] = [],
  reqBodyTypeName: string | null,
  templateStr: string,
  paramsStructureType: ParamsStructureType,
  title: string,
) {
  // 将 path 修改成模板字符串
  if (pathParams.length) {
    pathParams.forEach((param) => {
      path = path.replace(new RegExp(`([^$]){${param}}`), `$1\${${param}}`);
    });
  }
  // 读取模板文件
  if (vscode.workspace.rootPath) {
    const configTemplateFilePath = _.trim(
      getConfiguration('api-viewer', 'templateFilePath') as string,
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
  let paramsObjectTypeStr = '';
  let needReqBody = false;
  if (pathParams.length) {
    paramsStr += pathParams.map((i) => i + ': string, ').join('');
  }
  if (queryParams.length) {
    paramsObjectTypeStr =
      '{' + queryParams.map((i) => i + ': string;').join('') + '}';
    if (paramsStructureType === 'Normal') {
      paramsStr += queryParams.map((i) => i + ': string, ').join('');
    } else {
      // 插入params及类型
      paramsStr += ' params:' + paramsObjectTypeStr;
    }
    queryParamsStr = '?';
    queryParams.forEach((param, index) => {
      if (paramsStructureType === 'Normal') {
        queryParamsStr += (index === 0 ? '' : '&') + `${param}=\${${param}}`;
      } else {
        queryParamsStr +=
          (index === 0 ? '' : '&') + `${param}=\${params.${param}}`;
      }
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
  let str = ejs.render(templateStr, {
    method_name: methodName,
    params_str: paramsStr,
    req_body_type: reqBodyTypeName,
    http_method: method,
    response_type: resTypeName,
    path,
    query_params_str: queryParamsStr,
    need_request_body: needReqBody && reqBodyTypeName,
  });
  const comment = `/* ${title} */\n`;
  str = '\n  ' + comment + '  ' + str + '\n';
  return str;
}

export function getLastPublicMethodPosition(
  classNode: ClassDeclarationNode,
): Position {
  let line = 0;
  if (classNode) {
    const methods = classNode.methods;
    const constructorNode = classNode.constructor;
    if (constructorNode) {
      line = constructorNode.endPosition.line;
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
        line =
          (<MethodDeclarationNode>lastPublicMethod).endPosition.line;
      }
    }
  }
  return {
    line: line,
    character: 0,
  };
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

export async function createInsertMethodRule(
  editor: vscode.TextEditor,
  props: APINode['props'],
  resTypeName: string,
  requestMethodName: string,
  insertPlace: vscode.QuickPickItem | undefined,
  paramsStructureType: ParamsStructureType,
): Promise<ExecutionRule.InsertCode | undefined> {
  let line = 0;

  const isInsertInAngularServiceClass =
    insertPlace?.label === InsertReqCodePosition.AngularServiceClass;
  const isInsertInCursorPlace =
    insertPlace?.label === InsertReqCodePosition.CursorPosition;
  const codeText = editor.document.getText();
  const fileFullPath = editor.document.fileName;
  const parser = new SimpleAstParser(fileFullPath, codeText);

  if (isInsertInAngularServiceClass) {
    let serviceClass = parser
      .getClasses()
      .find((i) => i.declaration.name?.text.match(/Service$/));
    if (serviceClass) {
      const position = getLastPublicMethodPosition(serviceClass);
      line = position.line + 1;
    } else {
      console.error('没有找到 service class');
      return undefined;
    }
  }

  // 插入请求方法
  const method = props.method;
  let path = props.path;
  const pathParams = props.pathParams;
  const queryParams = props.queryParams;
  const needReqBody = !!props.reqBody;

  let templateStr = DEFAULT_FUNCTION_TEMPLATE;
  if (isInsertInAngularServiceClass) {
    templateStr = DEFAULT_METHOD_TEMPLATE;
  }

  let snippetString = genRequestCode(
    method,
    path,
    resTypeName,
    requestMethodName,
    pathParams,
    queryParams,
    needReqBody ? DEFAULT_REQ_BODY_TYPE_NAME : null,
    templateStr,
    paramsStructureType,
    props.title,
  );

  return {
    text: snippetString,
    line,
    character: 0,
  };
}

export function insertMethodIntoRepository(
  domainName: string,
  props: APINode['props'],
  resTypeName: string,
  requestMethodName: string,
  paramsStructureType: ParamsStructureType,
) {
  let line = 0;
  const repositoryFileFullPath = getRepositoryFileFullPath(domainName);
  if (!repositoryFileFullPath) {
    return;
  }
  const sourceText = fs.readFileSync(repositoryFileFullPath).toString();
  const parser = new SimpleAstParser(repositoryFileFullPath, sourceText);
  // 插入请求方法
  const method = props.method;
  let path = props.path;
  const pathParams = props.pathParams;
  const queryParams = props.queryParams;
  const needReqBody = !!props.reqBody;
  resTypeName += 'Entity';

  let templateStr = DEFAULT_METHOD_TEMPLATE;

  let snippetString = genRequestCode(
    method,
    path,
    resTypeName,
    requestMethodName,
    pathParams,
    queryParams,
    needReqBody ? DEFAULT_REQ_BODY_TYPE_NAME : null,
    templateStr,
    paramsStructureType,
    props.title,
  );

  let _class = parser
    .getClasses()
    .find((i) => i.declaration.name?.text.match(/Repository$/));
  if (_class) {
    const position = getLastPublicMethodPosition(_class);
    line = position.line;
    insertTextIntoFile(repositoryFileFullPath, line + 1, 0, snippetString);
  } else {
    console.error('没有找到 class');
    return undefined;
  }
}
