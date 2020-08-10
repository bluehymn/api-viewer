import { getConfiguration } from "./vscode";
import { DEFAULT_DOMAIN_PATH } from "../constants";
import * as vscode from 'vscode';
import * as path from 'path';
import * as strings from './strings';

export function getDomainFullPath(domainName: string) {
  const workspacePath = vscode.workspace.rootPath;
  if (workspacePath) {
    return path.join(workspacePath, DEFAULT_DOMAIN_PATH, domainName);
  }
}

export function getRepositoryFileFullPath(domainName: string) {
  const domainFullPath = getDomainFullPath(domainName);
  if (domainFullPath && domainName) {
    const repositoryFileFullPath = path.join(
      domainFullPath,
      'repository',
      strings.dasherize(domainName) + '.repository.ts',
    );
    return repositoryFileFullPath;
  } else {
    return undefined;
  }
}
