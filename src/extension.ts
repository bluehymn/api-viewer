// The module 'vscode' contains the VS Code extensibility API
import * as dayjs from 'dayjs';
import got from 'got';
import * as _ from 'lodash';
import * as _path_ from 'path';
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { SimpleAstParser } from './ast-parser';
import { API, APIGroup } from './types';
import * as strings from './utils/strings';
import {insertMethod} from './insert-method';
import {insertTypes} from './insert-types';
import { DEFAULT_RES_BODY_TYPE_NAME } from './constants';

let apiGroups: APIGroup[] = [];
let apiViewListTree: vscode.TreeView<TreeNode>;
let provider: vscode.TreeDataProvider<TreeNode>;


const INSERT_POSITION: vscode.QuickPickItem[] = [
  {
    label: 'cursor-position',
    description: 'insert at cursor position',
    picked: true,
  },
  {
    label: 'service-class',
    description:
      "insert into angular service class which with a 'Service' suffix",
  },
];

export function activate(context: vscode.ExtensionContext) {
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
        value: DEFAULT_RES_BODY_TYPE_NAME,
        prompt: 'Input type name',
      });

      let requestMethodName = await vscode.window.showInputBox({
        value: 'requestMethod',
        prompt: 'Input method name',
      });

      let insertPosition = await vscode.window.showQuickPick(INSERT_POSITION, {
        placeHolder: `Which place do you want insert the request method?`,
        ignoreFocusOut: true,
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
              insertPosition,
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
    light: _path_.join(__filename, '..', '..', 'resources', 'folder.svg'),
    dark: _path_.join(__filename, '..', '..', 'resources', 'folder.svg'),
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
    light: _path_.join(__filename, '..', '..', 'resources', 'api.svg'),
    dark: _path_.join(__filename, '..', '..', 'resources', 'api.svg'),
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
