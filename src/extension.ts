// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import got from 'got';
import * as _ from 'lodash';
import { compile as schemaToTypescript } from 'json-schema-to-typescript';
import * as dayjs from 'dayjs';
import { API, APIGroup, MethodDeclarationNode } from './types';
import { SimpleAstParser } from './ast-parser';
import * as strings from './utils/strings';
import * as ts from 'typescript';

let apiGroups: APIGroup[] = [];
let apiViewListTree: vscode.TreeView<TreeNode>;
let provider: vscode.TreeDataProvider<TreeNode>;
let onDiskPath: string;
let reqBodyTypeName = 'ReqBodyType';

export function activate(context: vscode.ExtensionContext) {
  onDiskPath = context.extensionPath;
  console.log(
    'Congratulations, your extension "vscode-api-viewer" is now active!',
  );
  let updateCommand = vscode.commands.registerCommand(
    'vscode-api-viewer.update',
    () => {
      (async () => {
        await update();
      })();
    },
  );

  let insertTypeCodeCommand = vscode.commands.registerCommand(
    'vscode-api-viewer.insertTypeCode',
    async (node) => {
      let resTypeName = await vscode.window.showInputBox({
        value: 'ResponseDataType',
        prompt: 'Input type name',
      });
      let requestMethodName = await vscode.window.showInputBox({
        value: 'requestMethod',
        prompt: 'Input method name',
      });
      if (node.type === 'api') {
        const props = node.props as APINode['props'];
        resTypeName = strings.classify(<string>resTypeName);
        requestMethodName = strings.camelize(<string>requestMethodName);
        const activeTextEditor = vscode.window.activeTextEditor;
        const parser = new SimpleAstParser();
        if (activeTextEditor) {
          const isTypescript =
            activeTextEditor.document.languageId === 'typescript';
          if (isTypescript) {
            await insertTypes(activeTextEditor, parser, props, resTypeName);
            await insertMethod(
              activeTextEditor,
              parser,
              props,
              resTypeName,
              requestMethodName,
            );
          }
        }
      }
    },
  );

  let openInBrowserCommand = vscode.commands.registerCommand(
    'vscode-api-viewer.openInBrowser',
    (node) => {
      if (node.type === 'api') {
        const props = node.props as APINode['props'];
        let url = _.trim(
          vscode.workspace.getConfiguration('api-viewer.yapi').url,
        );
        url = url.match(/\/$/) ? url : url + '/';
        const pid = _.trim(
          vscode.workspace.getConfiguration('api-viewer.yapi').pid,
        );

        vscode.env.openExternal(
          vscode.Uri.parse(`${url}project/${pid}/interface/api/${props._id}`),
        );
      }
    },
  );

  context.subscriptions.push(updateCommand, insertTypeCodeCommand);

  update();
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function update() {
  if (apiViewListTree) {
    apiViewListTree.message = '';
  }
  apiGroups = [];
  // 读取配置文件
  const email = vscode.workspace.getConfiguration('api-viewer.yapi').email;
  const password = vscode.workspace.getConfiguration('api-viewer.yapi')
    .password;
  let url = _.trim(vscode.workspace.getConfiguration('api-viewer.yapi').url);
  url = url.match(/\/$/) ? url : url + '/';
  const pid = _.trim(vscode.workspace.getConfiguration('api-viewer.yapi').pid);

  if (!(email && password && url && pid)) {
    vscode.window.showInformationMessage(
      'APIViewer: Missing some configurations!',
    );
    return;
  }

  vscode.window.showInformationMessage('APIViewer: Syncing data from Yapi');

  const response = await got(`${url}api/user/login`, {
    method: 'POST',
    json: { email, password },
  });

  const responseJson = JSON.parse(response.body);
  if (responseJson.errcode === 405) {
    vscode.window.showInformationMessage(
      'APIViewer: Incorrect account or password',
    );
  }

  const cookies = response.headers['set-cookie']?.map((cookie) => {
    return cookie.split(';')[0];
  });

  const apiResponse = await got(
    `${url}api/plugin/export?type=json&pid=${pid}&status=all&isWiki=false`,
    {
      headers: {
        cookie: cookies?.join(';'),
      },
    },
  );

  apiGroups = JSON.parse(apiResponse.body) as any[];

  // 销毁已创建的TreeView
  if (apiViewListTree) {
    apiViewListTree.dispose();
  }

  provider = new TreeNodeProvider(apiGroups);
  apiViewListTree = vscode.window.createTreeView('api-viewer-list', {
    treeDataProvider: provider,
  });

  vscode.window.showInformationMessage('APIViewer: Sync successful');
}

export class TreeNodeProvider implements vscode.TreeDataProvider<TreeNode> {
  constructor(private groups: any[]) {}

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (element) {
      if (element.type === 'group') {
        return getApiList((<GroupNode>element).list);
      }
      if (element.type === 'api') {
        return getApiProps((<APINode>element).props);
      }
    } else {
      return getGroups();
    }
    return [];
  }
}

function getGroups() {
  const treeNodes: GroupNode[] = [];
  if (apiGroups.length) {
    apiGroups.forEach((group) => {
      treeNodes.push(
        new GroupNode(
          group.name,
          group.desc,
          group.list,
          vscode.TreeItemCollapsibleState.Collapsed,
        ),
      );
    });
  }
  return treeNodes;
}

function getApiList(list: API[]) {
  const treeNodes: APINode[] = [];
  if (list.length) {
    list.forEach((api) => {
      treeNodes.push(
        new APINode(
          api.title,
          api.desc,
          api,
          vscode.TreeItemCollapsibleState.Collapsed,
        ),
      );
    });
  }
  return treeNodes;
}

function getApiProps(props: API) {
  const treeNodes: ApiPropsNode[] = [];
  const method = new ApiPropsNode(
    `Method: ${props.method}`,
    '',
    vscode.TreeItemCollapsibleState.None,
  );
  const path = new ApiPropsNode(
    `Path: ${props.path}`,
    '',
    vscode.TreeItemCollapsibleState.None,
  );
  const desc = new ApiPropsNode(
    `Desc1: ${props.desc}`,
    '',
    vscode.TreeItemCollapsibleState.None,
  );
  const time = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const updateTime = new ApiPropsNode(
    `UpdateAt: ${time}`,
    '',
    vscode.TreeItemCollapsibleState.None,
  );

  treeNodes.push(method, path, desc, updateTime);
  return treeNodes;
}

export abstract class TreeNode extends vscode.TreeItem {
  constructor(
    public label: string,
    protected desc: string,
    public type: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, collapsibleState);
  }

  get tooltip() {
    return `${this.label}`;
  }

  get description(): string {
    return this.desc;
  }
}

export class GroupNode extends TreeNode {
  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'folder.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'folder.svg'),
  };

  constructor(
    public label: string,
    desc: string,
    public list: API[],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, desc, 'group', collapsibleState);
  }

  get tooltip() {
    return `${this.label}`;
  }

  get description(): string {
    return this.desc;
  }
}

export class APINode extends TreeNode {
  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'api.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'api.svg'),
  };

  constructor(
    public label: string,
    desc: string,
    public props: API,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, desc, 'api', collapsibleState);
    this.label = `${props.method} ${props.path}`;
    this.contextValue = 'APINode';
  }

  get tooltip() {
    return `${this.label}`;
  }

  get description(): string {
    return this.props.title;
  }
}

export class ApiPropsNode extends TreeNode {
  constructor(
    public label: string,
    desc: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(label, desc, 'apiProps', collapsibleState);
  }

  get tooltip() {
    return `${this.label}`;
  }

  get description(): string {
    return this.desc;
  }
}

function genRequestCode(
  method: string,
  path: string,
  resTypeName = 'ResponseType',
  methodName = 'requestSomething',
  pathParams: string[] = [],
  queryParams: string[] = [],
  reqBodyTypeName?: string,
) {
  // 拼接参数
  let argumentsStr = '';
  let queryParamsStr = '';
  if (pathParams.length) {
    argumentsStr += pathParams.map((i) => i + ': string, ').join('');
  }
  if (queryParams.length) {
    if (argumentsStr === '') {
      argumentsStr += queryParams.map((i) => i + ': string, ').join('');
    }
    queryParams.forEach((param, index) => {
      queryParamsStr += (index === 0 ? '' : '&') + `${param}=\${${param}}`;
    });
  }

  let reqBodyStr = '';
  
  // 暂时只区分 Post Put 与其它 method
  if (['POST', 'PUT'].indexOf(method) > -1) {
    if (reqBodyTypeName) {
      argumentsStr += `reqBody: ${reqBodyTypeName}`;
    }
    reqBodyStr = ', reqBody';
  }
  argumentsStr = argumentsStr.replace(/,\s$/, '');
  return `${methodName}(${argumentsStr}) {
    return this.http.${method.toLowerCase()}<${resTypeName}>(\`${path}${
      queryParamsStr ? '?' : ''
    }${queryParamsStr}\`${reqBodyStr});
  }`;
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

async function insertTypes(
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
        reqBodyTypeName,
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

async function insertMethod(
  editor: vscode.TextEditor,
  parser: SimpleAstParser,
  props: APINode['props'],
  resTypeName: string,
  requestMethodName: string,
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
        pathParams.forEach(param => {
          path = path.replace(new RegExp(`{${param}}`), `\${${param}}`);
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
        let _snippetString = genRequestCode(
          method,
          path,
          resTypeName,
          requestMethodName,
          pathParams,
          queryParams,
          reqBodyTypeName,
        );
        _snippetString =  '\n  ' + comment + '  ' + _snippetString + '\n';
        const snippetString = new vscode.SnippetString();
        snippetString.appendText(_snippetString);
        editor.insertSnippet(snippetString, new vscode.Position(insertLine, 0));
      }
    }
  }
}
