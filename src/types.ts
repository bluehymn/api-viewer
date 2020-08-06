import * as ts from 'typescript';
import * as vscode from 'vscode';
import { JSONSchema4 } from 'json-schema';
export interface APIGroup {
  name: string;
  desc: string;
  addTime?: number;
  upTime?: number;
  list: API[];
}

export type RequestMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'OPTIONS'
  | 'PATCH';

export interface API {
  path: string;
  title: string;
  desc: string;
  method: RequestMethod;
  pathParams: string[];
  queryParams: string[];
  resBody: JSONSchema4 | null;
  reqBody: JSONSchema4 | null;
  yapi?: {
    id: number;
  };
}

export declare namespace YAPI {
  export interface YAPIGroup {
    index: number;
    name: string;
    desc: string;
    list: YapiJSON[];
  }
  export interface YapiJSON {
    query_path: QueryPath;
    edit_uid: number;
    status: string;
    type: string;
    req_body_is_json_schema: boolean;
    res_body_is_json_schema: boolean;
    api_opened: boolean;
    index: number;
    tag: string[];
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
    Delete = 'DELETE',
    Get = 'GET',
    Post = 'POST',
    Put = 'PUT',
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
    Form = 'form',
    JSON = 'json',
    Raw = 'raw',
  }

  export interface ReqHeader {
    required: string;
    _id: string;
    name: ReqHeaderName;
    value?: string;
  }

  export enum ReqHeaderName {
    APIKey = 'api_key',
    ContentType = 'Content-Type',
  }

  export interface Req {
    _id: string;
    name: string;
    desc: string;
    required?: string;
  }

  export enum Status {
    Undone = 'undone',
  }

  export enum Type {
    Static = 'static',
    Var = 'var',
  }
}

export interface Position {
  line: number;
  character: number;
}

export interface ParsedDeclarations {
  importDeclarations: DeclarationNode[];
  interfaceDeclarations: DeclarationNode[];
}

export interface DeclarationNode {
  declaration: any;
  startPosition: Position;
  endPosition: Position;
}

export interface ImportDeclarationNode extends DeclarationNode {
  declaration: ts.ImportDeclaration;
}

export interface TypeAliasDeclarationNode extends DeclarationNode {
  declaration: ts.TypeAliasDeclaration;
}

export interface InterfaceDeclarationNode extends DeclarationNode {
  declaration: ts.InterfaceDeclaration;
}

export interface ClassDeclarationNode extends DeclarationNode {
  declaration: ts.ClassDeclaration;
  constructor: ConstructorDeclarationNode | null;
  methods: MethodDeclarationNode[];
}

export interface FunctionDeclarationNode extends DeclarationNode {
  declaration: ts.FunctionDeclaration;
}

export interface MethodDeclarationNode extends DeclarationNode {
  declaration: ts.MethodDeclaration;
}

export interface ConstructorDeclarationNode extends DeclarationNode {
  declaration: ts.ConstructorDeclaration;
}

export interface ExportDeclarationNode extends DeclarationNode {
  declaration: ts.ExportDeclaration;
}

export declare namespace ExecutionRule {
  export interface InsertCode {
    code: vscode.SnippetString;
    line: number;
    character: number;
  }
}