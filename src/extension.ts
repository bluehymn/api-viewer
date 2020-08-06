// The module 'vscode' contains the VS Code extensibility API
import * as _ from 'lodash';
import * as _path_ from 'path';
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { APIGroup } from './types';
import * as strings from './utils/strings';
import { createInsertMethodRule } from './insert-method';
import { createInsertTypesRule, insertTypesIntoModel } from './insert-types';
import {
  DEFAULT_RES_BODY_TYPE_NAME,
  InsertReqCodePosition,
  ParamsStructureType,
  InsertMode,
} from './constants';
import { TreeNode, TreeNodeProvider, APINode } from './tree-view';
import { syncFromSwagger } from './swagger-sync';
import { syncFromYapi } from './yapi-sync';
import { getConfiguration } from './utils/vscode';

export let apiGroups: APIGroup[] = [];
let apiViewListTree: vscode.TreeView<TreeNode>;
let provider: vscode.TreeDataProvider<TreeNode>;

const INSERT_POSITION: vscode.QuickPickItem[] = [
  {
    label: InsertReqCodePosition.CursorPosition,
    description: 'insert at cursor position',
    picked: true,
  },
  {
    label: InsertReqCodePosition.AngularServiceClass,
    description:
      "Insert into angular service class which with a 'Service' suffix",
  },
];

const DOMAIN_INSERT_POSITION = [
  {
    label: InsertMode.Domain,
    description:
      'Insert types into model files and request code into repository of specified domain folder',
    picked: true,
  },
  {
    label: InsertMode.Skip,
    description: 'Skip to next',
  },
];

const PARAMS_TYPE: vscode.QuickPickItem[] = [
  {
    label: ParamsStructureType.Object,
    description:
      'Example: method(params: {param1: string; param2: string;}){...}',
    picked: true,
  },
  {
    label: ParamsStructureType.Normal,
    description: 'Example: method(param1: string, param2: string){...}',
  },
];

export function activate(context: vscode.ExtensionContext) {
  // 同步
  const syncCommand = vscode.commands.registerCommand(
    'vscode-api-viewer.sync',
    () => {
      (async () => {
        await sync();
      })();
    },
  );

  // 插入代码
  const insertTypeCodeCommand = vscode.commands.registerCommand(
    'vscode-api-viewer.insertTypeCode',
    async (node) => {
      const supportDomain = getConfiguration('api-viewer', 'supportDomain');
      let insertIntoDomain = false;
      let insertReqCodePosition;
      let resTypeName: string | undefined = '';
      let requestMethodName: string | undefined = '';
      let domainName: string | undefined;

      if (supportDomain) {
        const insertMode = await vscode.window.showQuickPick(
          DOMAIN_INSERT_POSITION,
          {
            placeHolder: `Do you want insert code into a domain?`,
            ignoreFocusOut: true,
          },
        );
        if (insertMode && insertMode.label === InsertMode.Domain) {
          insertIntoDomain = true;
          domainName = await vscode.window.showInputBox({
            prompt: 'Input domain name',
          });
        }
        if (!insertMode) {
          return;
        }
      }

      resTypeName = await vscode.window.showInputBox({
        value: DEFAULT_RES_BODY_TYPE_NAME,
        prompt: 'Input type name',
      });

      if (!resTypeName) {
        return;
      }

      requestMethodName = await vscode.window.showInputBox({
        value: 'requestMethod',
        prompt: 'Input method name',
      });

      if (!requestMethodName) {
        return;
      }

      if (!insertIntoDomain) {
        insertReqCodePosition = await vscode.window.showQuickPick(
          INSERT_POSITION,
          {
            placeHolder: `Which place do you want insert the request method?`,
            ignoreFocusOut: true,
          },
        );
      }

      let paramsStructureTypePick = await vscode.window.showQuickPick(
        PARAMS_TYPE,
        {
          placeHolder: `Which place do you want insert the request method?`,
          ignoreFocusOut: true,
        },
      );

      const paramsStructureType = paramsStructureTypePick!
        .label as ParamsStructureType;

      if (node.type === 'api') {
        const props = node.props as APINode['props'];
        resTypeName = strings.classify(<string>resTypeName);
        requestMethodName = strings.camelize(<string>requestMethodName);
        const activeTextEditor = vscode.window.activeTextEditor;
        // 在 domain 中插入
        if (insertIntoDomain) {
          if (domainName) {
            insertTypesIntoModel(domainName, props, resTypeName);
          }
        } else {
          if (activeTextEditor) {
            const isTypescript =
              activeTextEditor.document.languageId === 'typescript';
            // 只能在 ts 文件中插入代码
            if (isTypescript) {
              const insertTypesRule = await createInsertTypesRule(
                activeTextEditor,
                props,
                resTypeName,
              );
              await activeTextEditor.insertSnippet(
                insertTypesRule.code,
                new vscode.Position(
                  insertTypesRule.line,
                  insertTypesRule.character,
                ),
              );
              const insertMethodRule = await createInsertMethodRule(
                activeTextEditor,
                props,
                resTypeName,
                requestMethodName,
                insertReqCodePosition,
                paramsStructureType,
              );
              const isInsertInAngularServiceClass =
                insertReqCodePosition?.label ===
                InsertReqCodePosition.AngularServiceClass;
              const isInsertInCursorPlace =
                insertReqCodePosition?.label ===
                InsertReqCodePosition.CursorPosition;
              if (isInsertInAngularServiceClass) {
                await activeTextEditor.insertSnippet(
                  insertMethodRule.code,
                  new vscode.Position(
                    insertMethodRule.line,
                    insertMethodRule.character,
                  ),
                );
              }
              if (isInsertInCursorPlace) {
                await activeTextEditor.insertSnippet(insertMethodRule.code);
              }
            }
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
        let url = _.trim(getConfiguration('api-viewer.yapi', 'url') as string);
        url = url.match(/\/$/) ? url : url + '/';
        const pid = _.trim(
          getConfiguration('api-viewer.yapi', 'pid') as string,
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

  const swaggerJsonUrl = getConfiguration(
    'api-viewer.swagger',
    'url',
  ) as string;
  if (swaggerJsonUrl) {
    from = 'Swagger';
    vscode.commands.executeCommand('setContext', 'api-platform', 'Swagger');
    apiGroups = await syncFromSwagger(swaggerJsonUrl);
  } else {
    from = 'Yapi';
    vscode.commands.executeCommand('setContext', 'api-platform', 'Yapi');
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
