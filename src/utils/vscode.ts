import * as vscode from 'vscode';

export function getConfiguration<T>(section: string, key: string) {
  return vscode.workspace.getConfiguration(section).get<T>(key);
}
