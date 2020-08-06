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
// 行号开始于0
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
    const sourceFile = SimpleAstParser.createSourceFile(fullFilePath, sourceText);
    const delinted = this.delintImportsAndTypes(sourceFile, _sourceText);
    return delinted;
  }

  static createSourceFile(fullFilePath: string, sourceText: string) {
    return ts.createSourceFile(
      fullFilePath,
      sourceText,
      ts.ScriptTarget.Latest,
      false,
    );
  }

  // 获取节点代码的首尾行
  static getCodeLineNumbers(node: ts.Node, sourceFile: ts.SourceFile) {
    const startLineAndCharacter = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    const endLineAndCharacter = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return { startLineAndCharacter, endLineAndCharacter };
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
    const sourceFile = SimpleAstParser.createSourceFile(fullFilePath, sourceText);
    return this.delintClasses(sourceFile, _sourceText);
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
      const lines = SimpleAstParser.getCodeLineNumbers(node, sourceFile);

      let isSkipChildNode = false;
      switch (node.kind) {
        case ts.SyntaxKind.ImportDeclaration:
          importNodes.push({
            declaration: node as ts.ImportDeclaration,
            startPosition: lines.startLineAndCharacter,
            endPosition: lines.endLineAndCharacter,
          });
          isSkipChildNode = true;
          break;
        case ts.SyntaxKind.InterfaceDeclaration:
          interfaceNodes.push({
            declaration: node as ts.InterfaceDeclaration,
            startPosition: lines.startLineAndCharacter,
            endPosition: lines.endLineAndCharacter,
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

  // 获取所有class节点
  private delintClasses(sourceFile: ts.SourceFile, sourceText?: string) {
    const classNodes: ClassDeclarationNode[] = [];
    const delintNode = (node: ts.Node) => {
      const lines = SimpleAstParser.getCodeLineNumbers(node, sourceFile);
      let isSkipChildNode = false;
      if (node.kind === ts.SyntaxKind.ClassDeclaration) {
        classNodes.push({
          declaration: node as ts.ClassDeclaration,
          startPosition: lines.startLineAndCharacter,
          endPosition: lines.endLineAndCharacter,
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
      const lines = SimpleAstParser.getCodeLineNumbers(node, sourceFile);
      let isSkipChildNode = false;
      if (node.kind === ts.SyntaxKind.MethodDeclaration) {
        methodMembers.push({
          declaration: node as ts.MethodDeclaration,
          startPosition: lines.startLineAndCharacter,
          endPosition: lines.endLineAndCharacter,
        });
        isSkipChildNode = true;
      }
      if (node.kind === ts.SyntaxKind.Constructor) {
        constructorMember = {
          declaration: node as ts.ConstructorDeclaration,
          startPosition: lines.startLineAndCharacter,
          endPosition: lines.endLineAndCharacter,
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

}
