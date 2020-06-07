// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import got from 'got';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

let apiGroups: APIGroup[] = [];

export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "vscode-api-viewer" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    'vscode-api-viewer.viewApiList',
    () => {
      // The code you place here will be executed every time your command is executed
      // fetch('https://petstore.swagger.io/v2/swagger.json').then((ret: any) => {
      //   console.log(ret);
      // });
      (async () => {
        const email = vscode.workspace.getConfiguration(
          'api-viewer.yapi'
        ).email;
        const password = vscode.workspace.getConfiguration(
          'api-viewer.yapi'
        ).password;
        const response = await got('http://127.0.0.1:3000/api/user/login', {
          method: 'POST',
          json: { email, password },
        });
        console.log(response);
        const cookies = response.headers['set-cookie']?.map((cookie) => {
          return cookie.split(';')[0];
        });

        const apiResponse = await got(
          'http://127.0.0.1:3000/api/plugin/export?type=json&pid=11&status=all&isWiki=false',
          {
            headers: {
              cookie: cookies?.join(';'),
            },
          }
        );

        apiGroups = JSON.parse(apiResponse.body) as any[];

        vscode.window.createTreeView('api-list-viewer', {
          treeDataProvider: new TreeNodeProvider(apiGroups),
        });
      })();
      // Display a message box to the user
      vscode.window.showInformationMessage(
        'Hello World from vscode-api-viewer!'
      );
    }
  );

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

export class TreeNodeProvider implements vscode.TreeDataProvider<TreeNode> {
  constructor(private groups: any[]) {}

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (element) {
      if (element.type === 'group') {
        return getApiList((element as GroupNode).list);
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
          vscode.TreeItemCollapsibleState.Collapsed
        )
      );
    });
  }
  return treeNodes;
}

function getApiList(list: API[]) {
  const treeNodes: ApiNode[] = [];
  if (list.length) {
    list.forEach((api) => {
      treeNodes.push(
        new ApiNode(
          api.title,
          api.desc,
          api,
          vscode.TreeItemCollapsibleState.Collapsed
        )
      );
    });
  }
  return treeNodes;
}

function getApiDetails(details: API) {}

export abstract class TreeNode extends vscode.TreeItem {
  constructor(
    public label: string,
    protected desc: string,
    public type: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
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
  constructor(
    public label: string,
    desc: string,
    public list: API[],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
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

export class ApiNode extends TreeNode {
  constructor(
    public label: string,
    desc: string,
    public detail: API,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, desc, 'api', collapsibleState);
    this.label = `${detail.method}:${detail.path}`;
  }

  get tooltip() {
    return `${this.label}`;
  }

  get description(): string {
    return this.desc;
  }
}

export class ApiDetailNode extends TreeNode {
  constructor(
    public label: string,
    desc: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, desc, 'api', collapsibleState);
  }

  get tooltip() {
    return `${this.label}`;
  }

  get description(): string {
    return this.desc;
  }
}

export interface APIGroup {
  index: number;
  name: NameElement;
  desc: string;
  add_time: number;
  up_time: number;
  list: API[];
}

export interface API {
  query_path: QueryPath;
  edit_uid: number;
  status: Status;
  type: Type;
  req_body_is_json_schema: boolean;
  res_body_is_json_schema: boolean;
  api_opened: boolean;
  index: number;
  tag: NameElement[];
  _id: number;
  method: Method;
  title: string;
  desc: string;
  path: string;
  req_params: Req[];
  req_body_form: ReqBodyForm[];
  req_headers: ReqHeader[];
  req_query: Req[];
  req_body_type: BodyType;
  res_body_type: BodyType;
  res_body: string;
  req_body_other?: string;
  project_id: number;
  catid: number;
  uid: number;
  add_time: number;
  up_time: number;
  __v: number;
}

export enum Method {
  Delete = 'DELETE',
  Get = 'GET',
  Post = 'POST',
  Put = 'PUT',
}

export interface QueryPath {
  path: string;
  params: any[];
}

export interface ReqBodyForm {
  required: string;
  _id: string;
  name: string;
  desc: string;
  type: string;
}

export enum BodyType {
  Form = 'form',
  JSON = 'json',
  Raw = 'raw',
}

export interface ReqHeader {
  required: string;
  _id: string;
  name: ReqHeaderName;
  value?: string;
}

export enum ReqHeaderName {
  APIKey = 'api_key',
  ContentType = 'Content-Type',
}

export interface Req {
  _id: string;
  name: string;
  desc: string;
  required?: string;
}

export enum Status {
  Undone = 'undone',
}

export enum NameElement {
  Pet = 'pet',
  Store = 'store',
  User = 'user',
}

export enum Type {
  Static = 'static',
  Var = 'var',
}
