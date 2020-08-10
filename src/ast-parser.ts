import * as ts from 'typescript';
import {
  ImportDeclarationNode,
  InterfaceDeclarationNode,
  ClassDeclarationNode,
  MethodDeclarationNode,
  ConstructorDeclarationNode,
  MemberModifier,
} from './types';

// 解析文件梳理出相关节点
// 行号开始于0
/**
 * 解析同一个文件的在修改文件或者model前，可以使用同一个parser；
 * 文件变更后需再 new 一个 parser；
 */
export class SimpleAstParser {
  private sourceFile: ts.SourceFile;
  private classNodeList: ClassDeclarationNode[] = [];
  private importNodeList: ImportDeclarationNode[] = [];
  private interfaceNodeList: InterfaceDeclarationNode[] = [];

  constructor(private fileFullPath: string, private sourceText: string) {
    this.sourceFile = SimpleAstParser.createSourceFile(
      fileFullPath,
      sourceText || '',
    );
    this.parse();
  }

  static createSourceFile(fileFullPath: string, sourceText: string) {
    return ts.createSourceFile(
      fileFullPath,
      sourceText,
      ts.ScriptTarget.Latest,
      false,
    );
  }

  getFileFullPath() {
    return this.fileFullPath;
  }

  getSourceText() {
    return this.sourceText;
  }

  getSourceFile() {
    return this.sourceFile;
  }

  getImports() {
    return this.importNodeList;
  }

  getInterfaces() {
    return this.interfaceNodeList;
  }

  getClasses() {
    return this.classNodeList;
  }

  parse() {
    this.delintModuleDeclarations();
  }

  // 获取节点代码的首尾行
  getCodeLineNumbers(node: ts.Node) {
    const startLineAndCharacter = this.sourceFile.getLineAndCharacterOfPosition(
      node.getStart(this.sourceFile),
    );
    const endLineAndCharacter = this.sourceFile.getLineAndCharacterOfPosition(
      node.getEnd(),
    );
    return { startLineAndCharacter, endLineAndCharacter };
  }

  // 获取所有import和interface节点
  private delintModuleDeclarations() {
    const importNodeList: ImportDeclarationNode[] = [];
    const interfaceNodeList: InterfaceDeclarationNode[] = [];
    const classNodeList: ClassDeclarationNode[] = [];

    const delintNode = (node: ts.Node) => {
      const lines = this.getCodeLineNumbers(node);
      let isSkipChildNode = false;

      switch (node.kind) {
        case ts.SyntaxKind.ImportDeclaration:
          importNodeList.push({
            declaration: node as ts.ImportDeclaration,
            startPosition: lines.startLineAndCharacter,
            endPosition: lines.endLineAndCharacter,
          });
          isSkipChildNode = true;
          break;
        case ts.SyntaxKind.InterfaceDeclaration:
          interfaceNodeList.push({
            declaration: node as ts.InterfaceDeclaration,
            startPosition: lines.startLineAndCharacter,
            endPosition: lines.endLineAndCharacter,
          });
          isSkipChildNode = true;
          break;
        case ts.SyntaxKind.ClassDeclaration:
          const {_constructor, methods} = this.delintClassMembers(node as ts.ClassDeclaration);
          const classNode = {
            declaration: node as ts.ClassDeclaration,
            startPosition: lines.startLineAndCharacter,
            endPosition: lines.endLineAndCharacter,
            constructor: _constructor,
            methods,
          };
          
          classNodeList.push(classNode);
          isSkipChildNode = true;
          break;
        default:
          break;
      }
      if (!isSkipChildNode) {
        ts.forEachChild(node, delintNode);
      }
    };
    delintNode(this.sourceFile);
    this.classNodeList = classNodeList;
    this.importNodeList = importNodeList;
    this.interfaceNodeList = interfaceNodeList;
  }

  /**
   * 解析 class 里面所有的 method 及 constructor
   */
  delintClassMembers(node: ts.ClassDeclaration) {
    const methodMembers: MethodDeclarationNode[] = [];
    let constructorMember: ConstructorDeclarationNode | null = null;
    const delintNode = (node: ts.Node) => {
      const lines = this.getCodeLineNumbers(node);
      let isSkipChildNode = false;
      if (node.kind === ts.SyntaxKind.MethodDeclaration) {
        methodMembers.push({
          declaration: node as ts.MethodDeclaration,
          startPosition: lines.startLineAndCharacter,
          endPosition: lines.endLineAndCharacter,
          modifier: this.getMemberModifier(node),
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
      _constructor: constructorMember,
    };
  }

  private getMemberModifier(node: ts.Node) {
    let modifier: MemberModifier = 'public';
    ts.forEachChild(node, (node) => {
      if (node.kind === ts.SyntaxKind.PrivateKeyword) {
        modifier === 'private';
      }
      if (node.kind === ts.SyntaxKind.ProtectedKeyword) {
        modifier === 'protected';
      }
    });
    return modifier;
  }
}
