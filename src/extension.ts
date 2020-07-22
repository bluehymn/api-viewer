// The module 'vscode' contains the VS Code extensibility API
import * as _ from 'lodash';
import * as _path_ from 'path';
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { SimpleAstParser } from './ast-parser';
import { APIGroup } from './types';
import * as strings from './utils/strings';
import { insertMethod } from './insert-method';
import { insertTypes } from './insert-types';
import { DEFAULT_RES_BODY_TYPE_NAME, InsertPosition, ParamsStructureType } from './constants';
import { TreeNode, TreeNodeProvider, APINode } from './tree-view';
import { syncFromSwagger } from './swagger-sync';
import { syncFromYapi } from './yapi-sync';

export let apiGroups: APIGroup[] = [];
let apiViewListTree: vscode.TreeView<TreeNode>;
let provider: vscode.TreeDataProvider<TreeNode>;

const INSERT_POSITION: vscode.QuickPickItem[] = [
  {
    label: InsertPosition.CursorPosition,
    description: 'insert at cursor position',
    picked: true,
  },
  {
    label: InsertPosition.AngularServiceClass,
    description:
      "insert into angular service class which with a 'Service' suffix",
  },
];

const PARAMS_TYPE: vscode.QuickPickItem[] = [
  {
    label: ParamsStructureType.Object,
    description: 'Example: method(params: {param1: string; param2: string;}){...}',
    picked: true,
  },
  {
    label: ParamsStructureType.Normal,
    description:
      "Example: method(param1: string, param2: string){...}",
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

      if (!resTypeName) {
        return;
      }

      let requestMethodName = await vscode.window.showInputBox({
        value: 'requestMethod',
        prompt: 'Input method name',
      });

      if (!requestMethodName) {
        return;
      }

      let insertPosition = await vscode.window.showQuickPick(INSERT_POSITION, {
        placeHolder: `Which place do you want insert the request method?`,
        ignoreFocusOut: true,
      });

      let paramsStructureTypePick = await vscode.window.showQuickPick(PARAMS_TYPE, {
        placeHolder: `Which place do you want insert the request method?`,
        ignoreFocusOut: true,
      });

      if (!insertPosition) {
        return;
      }

      const paramsStructureType = paramsStructureTypePick!.label as ParamsStructureType;

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
              paramsStructureType
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
          vscode.Uri.parse(
            `${url}project/${pid}/interface/api/${props.yapi!.id}`,
          ),
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
  let from = '';
  if (apiViewListTree) {
    apiViewListTree.message = '';
  }
  apiGroups = [];

  const swaggerJsonUrl = vscode.workspace.getConfiguration('api-viewer.swagger')
    .url;
  if (swaggerJsonUrl) {
    from = 'Swagger';
    vscode.commands.executeCommand(
      'setContext',
      'api-platform',
      'Swagger'
    );
    apiGroups = await syncFromSwagger(swaggerJsonUrl);
  } else {
    from = 'Yapi';
    vscode.commands.executeCommand(
      'setContext',
      'api-platform',
      'Yapi'
    );
    const result = await syncFromYapi();
    if (result instanceof Error) {
      vscode.window.showInformationMessage(result.message);
      return;
    } else {
      apiGroups = result;
    }
  }

  // 销毁已创建的TreeView
  if (apiViewListTree) {
    apiViewListTree.dispose();
  }

  provider = new TreeNodeProvider(apiGroups);
  apiViewListTree = vscode.window.createTreeView('api-viewer-list', {
    treeDataProvider: provider,
  });

  vscode.window.showInformationMessage(
    `APIViewer: Sync from ${from} successful`,
  );
}
