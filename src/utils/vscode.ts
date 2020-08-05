import * as vscode from 'vscode';

export function getConfiguration(section: string, key: string) {
  return vscode.workspace.getConfiguration(section).get(key);
}
