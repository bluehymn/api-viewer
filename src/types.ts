import * as ts from 'typescript';

export interface APIGroup {
  index: number;
  name: NameElement;
  desc: string;
  add_time: number;
  up_time: number;
  list: API[];
}

export interface API {
  query_path: QueryPath;
  edit_uid: number;
  status: Status;
  type: Type;
  req_body_is_json_schema: boolean;
  res_body_is_json_schema: boolean;
  api_opened: boolean;
  index: number;
  tag: NameElement[];
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
  Delete = "DELETE",
  Get = "GET",
  Post = "POST",
  Put = "PUT",
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
  Form = "form",
  JSON = "json",
  Raw = "raw",
}

export interface ReqHeader {
  required: string;
  _id: string;
  name: ReqHeaderName;
  value?: string;
}

export enum ReqHeaderName {
  APIKey = "api_key",
  ContentType = "Content-Type",
}

export interface Req {
  _id: string;
  name: string;
  desc: string;
  required?: string;
}

export enum Status {
  Undone = "undone",
}

export enum NameElement {
  Pet = "pet",
  Store = "store",
  User = "user",
}

export enum Type {
  Static = "static",
  Var = "var",
}

export interface ParsedDeclarations {
  importDeclarations: DeclarationNode[];
  interfaceDeclarations: DeclarationNode[];
}

export interface DeclarationNode {
  declaration: any;
  startPosition: { line: number; character: number };
  endPosition: { line: number; character: number };
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
