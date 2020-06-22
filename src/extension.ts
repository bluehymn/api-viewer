// The module 'vscode' contains the VS Code extensibility API
import got from 'got';
import * as _ from 'lodash';
import * as _path_ from 'path';
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { SimpleAstParser } from './ast-parser';
import { APIGroup } from './types';
import * as strings from './utils/strings';
import { insertMethod } from './insert-method';
import { insertTypes } from './insert-types';
import { DEFAULT_RES_BODY_TYPE_NAME } from './constants';
import { TreeNode, TreeNodeProvider, APINode } from './tree-view';
import { importJson } from './swagger';

export let apiGroups: APIGroup[] = [];
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
  const syncCommand = vscode.commands.registerCommand(
    'vscode-api-viewer.sync',
    () => {
      (async () => {
        await sync();
      })();
    },
  );

  const insertTypeCodeCommand = vscode.commands.registerCommand(
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

  const openInBrowserCommand = vscode.commands.registerCommand(
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

  context.subscriptions.push(
    syncCommand,
    insertTypeCodeCommand,
    openInBrowserCommand,
  );

  sync();
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function sync() {
  if (apiViewListTree) {
    apiViewListTree.message = '';
  }
  apiGroups = [];

  const swaggerJsonUrl = vscode.workspace.getConfiguration('api-viewer.swagger').url;
  if (swaggerJsonUrl) {
    await importJson(swaggerJsonUrl);
  } else {
    await syncFromYapi();
  }

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

async function syncFromYapi() {
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

  // 登录获取cookie
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

  // 获取接口文档数据
  const apiResponse = await got(
    `${url}api/plugin/export?type=json&pid=${pid}&status=all&isWiki=false`,
    {
      headers: {
        cookie: cookies?.join(';'),
      },
    },
  );

  apiGroups = JSON.parse(apiResponse.body) as any[];
}
