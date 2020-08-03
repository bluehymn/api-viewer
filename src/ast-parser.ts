import * as ts from 'typescript';
import * as fs from 'fs';
import {
  ImportDeclarationNode,
  InterfaceDeclarationNode,
  ClassDeclarationNode,
  MethodDeclarationNode,
  ConstructorDeclarationNode,
} from './types';

// 解析文件梳理出相关节点
export class SimpleAstParser {
  public parseImportsAndTypes(
    fullFilePath: string,
    sourceText: string,
  ): {
    importNodes: ImportDeclarationNode[];
    interfaceNodes: InterfaceDeclarationNode[];
  } {
    if (
      sourceText !== null &&
      sourceText !== undefined &&
      sourceText.trim() === ''
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
      false,
    );
  }

  // 获取所有import和interface节点
  private delintImportsAndTypes(
    sourceFile: ts.SourceFile,
    sourceText?: string,
  ): {
    importNodes: ImportDeclarationNode[];
    interfaceNodes: InterfaceDeclarationNode[];
  } {
    const importNodes: ImportDeclarationNode[] = [];
    const interfaceNodes: InterfaceDeclarationNode[] = [];
    // const sourceFileText = sourceText || sourceFile.getText();
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
          isSkipChildNode = true;
          break;
        case ts.SyntaxKind.InterfaceDeclaration:
          interfaceNodes.push({
            declaration: node as ts.InterfaceDeclaration,
            startPosition: lines.startLine,
            endPosition: lines.endLine,
          });
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
      sourceText.trim() === ''
    ) {
      return [];
    }
    const _sourceText = sourceText || fs.readFileSync(fullFilePath).toString();
    const sourceFile = this.createSourceFile(fullFilePath, sourceText);
    return this.delintClasses(sourceFile, _sourceText);
  }

  // 获取所有class节点
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
          constructor: null,
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
        const { methods, constructorNode } = this.delintClassMembers(
          classNode.declaration,
          sourceFile,
        );
        classNode.methods = methods;
        classNode.constructor = constructorNode;
      });
    }
    return classNodes;
  }

  /**
   * 解析 class 里面所有的 method 及 constructor
   */
  private delintClassMembers(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
  ) {
    const methodMembers: MethodDeclarationNode[] = [];
    let constructorMember: ConstructorDeclarationNode | null = null;
    const delintNode = (node: ts.Node) => {
      const lines = this.getCodeLineNumbers(node, sourceFile);
      let isSkipChildNode = false;
      if (node.kind === ts.SyntaxKind.MethodDeclaration) {
        methodMembers.push({
          declaration: node as ts.MethodDeclaration,
          startPosition: lines.startLine,
          endPosition: lines.endLine,
        });
        isSkipChildNode = true;
      }
      if (node.kind === ts.SyntaxKind.Constructor) {
        constructorMember = {
          declaration: node as ts.ConstructorDeclaration,
          startPosition: lines.startLine,
          endPosition: lines.endLine,
        };
      }
      if (!isSkipChildNode) {
        ts.forEachChild(node, delintNode);
      }
    };
    delintNode(node);
    return {
      methods: methodMembers,
      constructorNode: constructorMember,
    };
  }

  // 获取节点代码的首尾行
  private getCodeLineNumbers(node: ts.Node, sourceFile: ts.SourceFile) {
    const startLine = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return { startLine, endLine };
  }
}
