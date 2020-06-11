import * as ts from "typescript";
import * as fs from "fs";
import {
  DeclarationNode,
  ImportDeclarationNode,
  InterfaceDeclarationNode,
  ClassDeclarationNode,
  MethodDeclarationNode,
  ExportDeclarationNode,
} from "./types";

export class SimpleAstParser {
  public parseImportsAndTypes(
    fullFilePath: string,
    sourceText: string
  ): {
    importNodes: ImportDeclarationNode[];
    interfaceNodes: InterfaceDeclarationNode[];
  } {
    if (
      sourceText !== null &&
      sourceText !== undefined &&
      sourceText.trim() === ""
    ) {
      return {
        importNodes: [],
        interfaceNodes: [],
      };
    }
    const _sourceText = sourceText || fs.readFileSync(fullFilePath).toString();
    const sourceFile = this.createSourceFile(fullFilePath, sourceText);
    const delinted = this.delintImportsAndTypes(sourceFile, _sourceText);
    return delinted;
  }

  private createSourceFile(fullFilePath: string, sourceText: string) {
    return ts.createSourceFile(
      fullFilePath,
      sourceText,
      ts.ScriptTarget.Latest,
      false
    );
  }

  private delintImportsAndTypes(
    sourceFile: ts.SourceFile,
    sourceText?: string
  ): {
    importNodes: ImportDeclarationNode[];
    interfaceNodes: InterfaceDeclarationNode[];
  } {
    const importNodes: ImportDeclarationNode[] = [];
    const interfaceNodes: InterfaceDeclarationNode[] = [];
    const sourceFileText = sourceText || sourceFile.getText();
    const delintNode = (node: ts.Node) => {
      const lines = this.getCodeLineNumbers(node, sourceFile);

      let isSkipChildNode = false;
      switch (node.kind) {
        case ts.SyntaxKind.ImportDeclaration:
          importNodes.push({
            declaration: node as ts.ImportDeclaration,
            startPosition: lines.startLine,
            endPosition: lines.endLine,
          });
          // this.getCodeLineNumbers(node, sourceFile);
          //if we get import declaration then we do not want to do further delinting on the children of the node
          isSkipChildNode = true;
          break;
        case ts.SyntaxKind.InterfaceDeclaration:
          interfaceNodes.push({
            declaration: node as ts.InterfaceDeclaration,
            startPosition: lines.startLine,
            endPosition: lines.endLine,
          });
          // this.getCodeLineNumbers(node, sourceFile);
          //if we get import declaration then we do not want to do further delinting on the children of the node
          isSkipChildNode = true;
          break;
        default:
          break;
      }
      if (!isSkipChildNode) {
        ts.forEachChild(node, delintNode);
      }
    };
    delintNode(sourceFile);
    return { importNodes, interfaceNodes };
  }

  public parseClass(fullFilePath: string, sourceText: string) {
    if (
      sourceText !== null &&
      sourceText !== undefined &&
      sourceText.trim() === ""
    ) {
      return [];
    }
    const _sourceText = sourceText || fs.readFileSync(fullFilePath).toString();
    const sourceFile = this.createSourceFile(fullFilePath, sourceText);
    return this.delintClasses(sourceFile, _sourceText);
  }

  private delintClasses(sourceFile: ts.SourceFile, sourceText?: string) {
    const classNodes: ClassDeclarationNode[] = [];
    const delintNode = (node: ts.Node) => {
      const lines = this.getCodeLineNumbers(node, sourceFile);
      let isSkipChildNode = false;
      if (node.kind === ts.SyntaxKind.ClassDeclaration) {
        classNodes.push({
          declaration: node as ts.ClassDeclaration,
          startPosition: lines.startLine,
          endPosition: lines.endLine,
          methods: [],
        });
        isSkipChildNode = true;
      }
      if (!isSkipChildNode) {
        ts.forEachChild(node, delintNode);
      }
    };
    delintNode(sourceFile);
    if (classNodes.length) {
      classNodes.forEach((classNode) => {
        classNode.methods = this.delintClassFunctionMembers(
          classNode.declaration,
          sourceFile
        );
      });
    }
    return classNodes;
  }

  private delintClassFunctionMembers(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile
  ) {
    const functionMembers: MethodDeclarationNode[] = [];
    const delintNode = (node: ts.Node) => {
      const lines = this.getCodeLineNumbers(node, sourceFile);
      let isSkipChildNode = false;
      if (node.kind === ts.SyntaxKind.MethodDeclaration) {
        functionMembers.push({
          declaration: node as ts.MethodDeclaration,
          startPosition: lines.startLine,
          endPosition: lines.endLine,
        });
        isSkipChildNode = true;
      }
      if (!isSkipChildNode) {
        ts.forEachChild(node, delintNode);
      }
    };
    delintNode(node);
    return functionMembers;
  }

  private getCodeLineNumbers(node: ts.Node, sourceFile: ts.SourceFile) {
    const startLine = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile)
    );
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return { startLine, endLine };
  }
}
