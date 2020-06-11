import ts = require("typescript");

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
  methods: MethodDeclarationNode[];
}

export interface FunctionDeclarationNode extends DeclarationNode {
  declaration: ts.FunctionDeclaration;
}

export interface MethodDeclarationNode extends DeclarationNode {
  declaration: ts.MethodDeclaration;
}

export interface ExportDeclarationNode extends DeclarationNode {
  declaration: ts.ExportDeclaration;
}

const enum SyntaxKind {
  Unknown=0,
  EndOfFileToken=1,
  SingleLineCommentTrivia=2,
  MultiLineCommentTrivia=3,
  NewLineTrivia=4,
  WhitespaceTrivia=5,
  // We detect and preserve #! on the first line
  ShebangTrivia=6,
  // We detect and provide better error recovery when we encounter a git merge marker.  This
  // allows us to edit files with git-conflict markers in them in a much more pleasant manner.
  ConflictMarkerTrivia=7,
  // Literals
  NumericLiteral=8,
  BigIntLiteral=9,
  StringLiteral=10,
  JsxText=11,
  JsxTextAllWhiteSpaces=12,
  RegularExpressionLiteral=13,
  NoSubstitutionTemplateLiteral=14,
  // Pseudo-literals
  TemplateHead=15,
  TemplateMiddle=16,
  TemplateTail=17,
  // Punctuation
  OpenBraceToken=18,
  CloseBraceToken=19,
  OpenParenToken=20,
  CloseParenToken=21,
  OpenBracketToken=22,
  CloseBracketToken=23,
  DotToken=24,
  DotDotDotToken=25,
  SemicolonToken=26,
  CommaToken=27,
  QuestionDotToken=28,
  LessThanToken=29,
  LessThanSlashToken=30,
  GreaterThanToken=31,
  LessThanEqualsToken=32,
  GreaterThanEqualsToken=33,
  EqualsEqualsToken=34,
  ExclamationEqualsToken=35,
  EqualsEqualsEqualsToken=36,
  ExclamationEqualsEqualsToken=37,
  EqualsGreaterThanToken=38,
  PlusToken=39,
  MinusToken=40,
  AsteriskToken=41,
  AsteriskAsteriskToken=42,
  SlashToken=43,
  PercentToken=44,
  PlusPlusToken=45,
  MinusMinusToken=46,
  LessThanLessThanToken=47,
  GreaterThanGreaterThanToken=48,
  GreaterThanGreaterThanGreaterThanToken=49,
  AmpersandToken=50,
  BarToken=51,
  CaretToken=52,
  ExclamationToken=53,
  TildeToken=54,
  AmpersandAmpersandToken=55,
  BarBarToken=56,
  QuestionToken=57,
  ColonToken=58,
  AtToken=59,
  QuestionQuestionToken=60,
  /** Only the JSDoc scanner produces BacktickToken. The normal scanner produces NoSubstitutionTemplateLiteral and related kinds. */
  BacktickToken=61,
  // Assignments
  EqualsToken=62,
  PlusEqualsToken=63,
  MinusEqualsToken=64,
  AsteriskEqualsToken=65,
  AsteriskAsteriskEqualsToken=66,
  SlashEqualsToken=67,
  PercentEqualsToken=68,
  LessThanLessThanEqualsToken=69,
  GreaterThanGreaterThanEqualsToken=70,
  GreaterThanGreaterThanGreaterThanEqualsToken=71,
  AmpersandEqualsToken=72,
  BarEqualsToken=73,
  BarBarEqualsToken=74,
  AmpersandAmpersandEqualsToken=75,
  QuestionQuestionEqualsToken=76,
  CaretEqualsToken=77,
  // Identifiers and PrivateIdentifiers
  Identifier=78,
  PrivateIdentifier=79,
  // Reserved words
  BreakKeyword=80,
  CaseKeyword=81,
  CatchKeyword=82,
  ClassKeyword=83,
  ConstKeyword=84,
  ContinueKeyword=85,
  DebuggerKeyword=86,
  DefaultKeyword=87,
  DeleteKeyword=88,
  DoKeyword=89,
  ElseKeyword=90,
  EnumKeyword=91,
  ExportKeyword=92,
  ExtendsKeyword=93,
  FalseKeyword=94,
  FinallyKeyword=95,
  ForKeyword=96,
  FunctionKeyword=97,
  IfKeyword=98,
  ImportKeyword=99,
  InKeyword=100,
  InstanceOfKeyword=101,
  NewKeyword=102,
  NullKeyword=103,
  ReturnKeyword=104,
  SuperKeyword=105,
  SwitchKeyword=106,
  ThisKeyword=107,
  ThrowKeyword=108,
  TrueKeyword=109,
  TryKeyword=110,
  TypeOfKeyword=111,
  VarKeyword=112,
  VoidKeyword=113,
  WhileKeyword=114,
  WithKeyword=115,
  // Strict mode reserved words
  ImplementsKeyword=116,
  InterfaceKeyword=117,
  LetKeyword=118,
  PackageKeyword=119,
  PrivateKeyword=120,
  ProtectedKeyword=121,
  PublicKeyword=122,
  StaticKeyword=123,
  YieldKeyword=124,
  // Contextual keywords
  AbstractKeyword=125,
  AsKeyword=126,
  AssertsKeyword=127,
  AnyKeyword=128,
  AsyncKeyword=129,
  AwaitKeyword=130,
  BooleanKeyword=131,
  ConstructorKeyword=132,
  DeclareKeyword=133,
  GetKeyword=134,
  InferKeyword=135,
  IsKeyword=136,
  KeyOfKeyword=137,
  ModuleKeyword=138,
  NamespaceKeyword=139,
  NeverKeyword=140,
  ReadonlyKeyword=141,
  RequireKeyword=142,
  NumberKeyword=143,
  ObjectKeyword=144,
  SetKeyword=145,
  StringKeyword=146,
  SymbolKeyword=147,
  TypeKeyword=148,
  UndefinedKeyword=149,
  UniqueKeyword=150,
  UnknownKeyword=151,
  FromKeyword=152,
  GlobalKeyword=153,
  BigIntKeyword=154,
  OfKeyword=155, // LastKeyword and LastToken and LastContextualKeyword

  // Parse tree nodes

  // Names
  QualifiedName=156,
  ComputedPropertyName=157,
  // Signature elements
  TypeParameter=158,
  Parameter=159,
  Decorator=160,
  // TypeMember
  PropertySignature=161,
  PropertyDeclaration=162,
  MethodSignature=163,
  MethodDeclaration=164,
  Constructor=165,
  GetAccessor=166,
  SetAccessor=167,
  CallSignature=168,
  ConstructSignature=169,
  IndexSignature=170,
  // Type
  TypePredicate=171,
  TypeReference=172,
  FunctionType=173,
  ConstructorType=174,
  TypeQuery=175,
  TypeLiteral=176,
  ArrayType=177,
  TupleType=178,
  OptionalType=179,
  RestType=180,
  UnionType=181,
  IntersectionType=182,
  ConditionalType=183,
  InferType=184,
  ParenthesizedType=185,
  ThisType=186,
  TypeOperator=187,
  IndexedAccessType=188,
  MappedType=189,
  LiteralType=190,
  NamedTupleMember=191,
  ImportType=192,
  // Binding patterns
  ObjectBindingPattern=193,
  ArrayBindingPattern=194,
  BindingElement=195,
  // Expression
  ArrayLiteralExpression=196,
  ObjectLiteralExpression=197,
  PropertyAccessExpression=198,
  ElementAccessExpression=199,
  CallExpression=200,
  NewExpression=201,
  TaggedTemplateExpression=202,
  TypeAssertionExpression=203,
  ParenthesizedExpression=204,
  FunctionExpression=205,
  ArrowFunction=206,
  DeleteExpression=207,
  TypeOfExpression=208,
  VoidExpression=209,
  AwaitExpression=210,
  PrefixUnaryExpression=211,
  PostfixUnaryExpression=212,
  BinaryExpression=213,
  ConditionalExpression=214,
  TemplateExpression=215,
  YieldExpression=216,
  SpreadElement=217,
  ClassExpression=218,
  OmittedExpression=219,
  ExpressionWithTypeArguments=220,
  AsExpression=221,
  NonNullExpression=222,
  MetaProperty=223,
  SyntheticExpression=224,

  // Misc
  TemplateSpan=225,
  SemicolonClassElement=226,
  // Element
  Block=227,
  EmptyStatement=228,
  VariableStatement=229,
  ExpressionStatement=230,
  IfStatement=231,
  DoStatement=232,
  WhileStatement=233,
  ForStatement=234,
  ForInStatement=235,
  ForOfStatement=236,
  ContinueStatement=237,
  BreakStatement=238,
  ReturnStatement=239,
  WithStatement=240,
  SwitchStatement=241,
  LabeledStatement=242,
  ThrowStatement=243,
  TryStatement=244,
  DebuggerStatement=245,
  VariableDeclaration=246,
  VariableDeclarationList=247,
  FunctionDeclaration=248,
  ClassDeclaration=249,
  InterfaceDeclaration=250,
  TypeAliasDeclaration=251,
  EnumDeclaration=252,
  ModuleDeclaration=253,
  ModuleBlock=254,
  CaseBlock=255,
  NamespaceExportDeclaration=256,
  ImportEqualsDeclaration=257,
  ImportDeclaration=258,
  ImportClause=259,
  NamespaceImport=260,
  NamedImports=261,
  ImportSpecifier=262,
  ExportAssignment=263,
  ExportDeclaration=264,
  NamedExports=265,
  NamespaceExport=266,
  ExportSpecifier=267,
  MissingDeclaration=268,

  // Module references
  ExternalModuleReference=269,

  // JSX
  JsxElement=270,
  JsxSelfClosingElement=271,
  JsxOpeningElement=272,
  JsxClosingElement=273,
  JsxFragment=274,
  JsxOpeningFragment=275,
  JsxClosingFragment=276,
  JsxAttribute=277,
  JsxAttributes=278,
  JsxSpreadAttribute=279,
  JsxExpression=280,

  // Clauses
  CaseClause=281,
  DefaultClause=282,
  HeritageClause=283,
  CatchClause=284,

  // Property assignments
  PropertyAssignment=285,
  ShorthandPropertyAssignment=286,
  SpreadAssignment=287,

  // Enum
  EnumMember=288,
  // Unparsed
  UnparsedPrologue=289,
  UnparsedPrepend=290,
  UnparsedText=291,
  UnparsedInternalText=292,
  UnparsedSyntheticReference=293,

  // Top-level nodes
  SourceFile=294,
  Bundle=295,
  UnparsedSource=296,
  InputFiles=297,

  // JSDoc nodes
  JSDocTypeExpression=298,
  // The * type
  JSDocAllType=299,
  // The ? type
  JSDocUnknownType=300,
  JSDocNullableType=301,
  JSDocNonNullableType=302,
  JSDocOptionalType=303,
  JSDocFunctionType=304,
  JSDocVariadicType=305,
  // https://jsdoc.app/about-namepaths.html
  JSDocNamepathType=306,
  JSDocComment=307,
  JSDocTypeLiteral=308,
  JSDocSignature=309,
  JSDocTag=310,
  JSDocAugmentsTag=311,
  JSDocImplementsTag=312,
  JSDocAuthorTag=313,
  JSDocClassTag=314,
  JSDocPublicTag=315,
  JSDocPrivateTag=316,
  JSDocProtectedTag=317,
  JSDocReadonlyTag=318,
  JSDocCallbackTag=319,
  JSDocEnumTag=320,
  JSDocParameterTag=321,
  JSDocReturnTag=322,
  JSDocThisTag=323,
  JSDocTypeTag=324,
  JSDocTemplateTag=325,
  JSDocTypedefTag=326,
  JSDocPropertyTag=327,

  // Synthesized list
  SyntaxList=328,

  // Transformation nodes
  NotEmittedStatement=329,
  PartiallyEmittedExpression=330,
  CommaListExpression=331,
  MergeDeclarationMarker=332,
  EndOfDeclarationMarker=333,
  SyntheticReferenceExpression=334,

  // Enum value count
  Count=335,

  // Markers
  FirstAssignment = EqualsToken,
  LastAssignment = CaretEqualsToken,
  FirstCompoundAssignment = PlusEqualsToken,
  LastCompoundAssignment = CaretEqualsToken,
  FirstReservedWord = BreakKeyword,
  LastReservedWord = WithKeyword,
  FirstKeyword = BreakKeyword,
  LastKeyword = OfKeyword,
  FirstFutureReservedWord = ImplementsKeyword,
  LastFutureReservedWord = YieldKeyword,
  FirstTypeNode = TypePredicate,
  LastTypeNode = ImportType,
  FirstPunctuation = OpenBraceToken,
  LastPunctuation = CaretEqualsToken,
  FirstToken = Unknown,
  LastToken = LastKeyword,
  FirstTriviaToken = SingleLineCommentTrivia,
  LastTriviaToken = ConflictMarkerTrivia,
  FirstLiteralToken = NumericLiteral,
  LastLiteralToken = NoSubstitutionTemplateLiteral,
  FirstTemplateToken = NoSubstitutionTemplateLiteral,
  LastTemplateToken = TemplateTail,
  FirstBinaryOperator = LessThanToken,
  LastBinaryOperator = CaretEqualsToken,
  FirstStatement = VariableStatement,
  LastStatement = DebuggerStatement,
  FirstNode = QualifiedName,
  FirstJSDocNode = JSDocTypeExpression,
  LastJSDocNode = JSDocPropertyTag,
  FirstJSDocTagNode = JSDocTag,
  LastJSDocTagNode = JSDocPropertyTag,
  /* @internal */ FirstContextualKeyword = AbstractKeyword,
  /* @internal */ LastContextualKeyword = OfKeyword,
}