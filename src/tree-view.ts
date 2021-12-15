import * as dayjs from 'dayjs';
import { API } from './types';
import * as vscode from 'vscode';
import { apiGroups } from './extension';
import * as _path_ from 'path';

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
    `Desc: ${props.desc}`,
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
    this.tooltip = label;
    this.description = desc;
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
    this.description = this.props.title;
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
}
