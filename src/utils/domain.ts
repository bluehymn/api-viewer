import { getConfiguration } from "./vscode";
import { DEFAULT_DOMAIN_PATH } from "../constants";
import * as vscode from 'vscode';
import * as path from 'path';

export function getDomainFullPath(domainName: string) {
  const workspacePath = vscode.workspace.rootPath;
  if (workspacePath) {
    return path.join(workspacePath, DEFAULT_DOMAIN_PATH, domainName);
  }
}