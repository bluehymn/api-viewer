// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import got from "got";
import * as _ from "lodash";
import { compile as schemaToTypescript } from "json-schema-to-typescript";
import * as dayjs from "dayjs";

let apiGroups: APIGroup[] = [];
let apiViewListTree: vscode.TreeView<TreeNode>;
let provider: vscode.TreeDataProvider<TreeNode>;
let onDiskPath: string;

export function activate(context: vscode.ExtensionContext) {
  onDiskPath = context.extensionPath;
  console.log(
    'Congratulations, your extension "vscode-api-viewer" is now active!'
  );
  let updateCommand = vscode.commands.registerCommand(
    "vscode-api-viewer.update",
    () => {
      (async () => {
        await update();
      })();
    }
  );

  let insertTypeCodeCommand = vscode.commands.registerCommand(
    "vscode-api-viewer.insertTypeCode",
    (node) => {
      if (node.type === "api") {
        const props = node.props as ApiNode["props"];
        try {
          schemaToTypescript(JSON.parse(props.res_body), "type").then(
            (out: string) => {
              // console.log(out);
              out = out.replace(/\s*\[k: string\]:\sunknown;/g, "");
              const activeTextEditor = vscode.window.activeTextEditor;
              if (activeTextEditor) {
                const snippetString = new vscode.SnippetString();
                snippetString.appendText(out);
                activeTextEditor.insertSnippet(snippetString);
              }
            }
          );
        } catch (e) {}
      }
    }
  );

  let openInBrowserCommand = vscode.commands.registerCommand(
    "vscode-api-viewer.openInBrowser",
    (node) => {
      if (node.type === "api") {
        const props = node.props as ApiNode["props"];
        let url = _.trim(
          vscode.workspace.getConfiguration("api-viewer.yapi").url
        );
        url = url.match(/\/$/) ? url : url + "/";
        const pid = _.trim(
          vscode.workspace.getConfiguration("api-viewer.yapi").pid
        );

        vscode.env.openExternal(
          vscode.Uri.parse(`${url}project/${pid}/interface/api/${props._id}`)
        );
      }
    }
  );

  context.subscriptions.push(updateCommand, insertTypeCodeCommand);

  update();
}

// this method is called when your extension is deactivated
export function deactivate() {}

async function update() {
  if (apiViewListTree) {
    apiViewListTree.message = "";
  }

  apiGroups = [];

  const email = vscode.workspace.getConfiguration("api-viewer.yapi").email;
  const password = vscode.workspace.getConfiguration("api-viewer.yapi")
    .password;
  let url = _.trim(vscode.workspace.getConfiguration("api-viewer.yapi").url);
  url = url.match(/\/$/) ? url : url + "/";
  const pid = _.trim(vscode.workspace.getConfiguration("api-viewer.yapi").pid);

  if (!(email && password && url && pid)) {
    vscode.window.showInformationMessage(
      "APIViewer: Missing some configurations!"
    );
    return;
  }

  vscode.window.showInformationMessage("APIViewer: Syncing data from Yapi");

  const response = await got(`${url}api/user/login`, {
    method: "POST",
    json: { email, password },
  });

  const responseJson = JSON.parse(response.body);
  if (responseJson.errcode === 405) {
    vscode.window.showInformationMessage(
      "APIViewer: Incorrect account or password"
    );
  }

  const cookies = response.headers["set-cookie"]?.map((cookie) => {
    return cookie.split(";")[0];
  });

  const apiResponse = await got(
    `${url}api/plugin/export?type=json&pid=${pid}&status=all&isWiki=false`,
    {
      headers: {
        cookie: cookies?.join(";"),
      },
    }
  );

  apiGroups = JSON.parse(apiResponse.body) as any[];

  if (!apiViewListTree) {
    provider = new TreeNodeProvider(apiGroups);
    apiViewListTree = vscode.window.createTreeView("api-viewer-list", {
      treeDataProvider: provider,
    });
  }
}

export class TreeNodeProvider implements vscode.TreeDataProvider<TreeNode> {
  constructor(private groups: any[]) {}

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (element) {
      if (element.type === "group") {
        return getApiList((element as GroupNode).list);
      }
      if (element.type === "api") {
        return getApiProps((element as ApiNode).props);
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

function getApiProps(props: API) {
  const treeNodes: ApiPropsNode[] = [];
  const method = new ApiPropsNode(
    `Method: ${props.method}`,
    "",
    vscode.TreeItemCollapsibleState.None
  );
  const path = new ApiPropsNode(
    `Path: ${props.path}`,
    "",
    vscode.TreeItemCollapsibleState.None
  );
  const desc = new ApiPropsNode(
    `Desc1: ${props.desc}`,
    "",
    vscode.TreeItemCollapsibleState.None
  );
  const time = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const updateTime = new ApiPropsNode(
    `UpdateAt: ${time}`,
    "",
    vscode.TreeItemCollapsibleState.None
  );

  treeNodes.push(method, path, desc, updateTime);
  return treeNodes;
}

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
  iconPath = {
    light: path.join(__filename, "..", "..", "resources", "folder.svg"),
    dark: path.join(__filename, "..", "..", "resources", "folder.svg"),
  };

  constructor(
    public label: string,
    desc: string,
    public list: API[],
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, desc, "group", collapsibleState);
  }

  get tooltip() {
    return `${this.label}`;
  }

  get description(): string {
    return this.desc;
  }
}

export class ApiNode extends TreeNode {
  iconPath = {
    light: path.join(__filename, "..", "..", "resources", "api.svg"),
    dark: path.join(__filename, "..", "..", "resources", "api.svg"),
  };

  constructor(
    public label: string,
    desc: string,
    public props: API,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, desc, "api", collapsibleState);
    this.label = `${props.method} ${props.path}`;
    this.contextValue = "ApiNode";
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
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, desc, "apiProps", collapsibleState);
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
  Delete = "DELETE",
  Get = "GET",
  Post = "POST",
  Put = "PUT",
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
  Form = "form",
  JSON = "json",
  Raw = "raw",
}

export interface ReqHeader {
  required: string;
  _id: string;
  name: ReqHeaderName;
  value?: string;
}

export enum ReqHeaderName {
  APIKey = "api_key",
  ContentType = "Content-Type",
}

export interface Req {
  _id: string;
  name: string;
  desc: string;
  required?: string;
}

export enum Status {
  Undone = "undone",
}

export enum NameElement {
  Pet = "pet",
  Store = "store",
  User = "user",
}

export enum Type {
  Static = "static",
  Var = "var",
}
