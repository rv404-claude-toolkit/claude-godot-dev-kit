// Godot Backend — Type Definitions
// All interfaces for parsed Godot project data

export interface ParsedScene {
  format: number;
  loadSteps: number;
  type: 'scene' | 'resource';
  externalResources: ExternalResource[];
  subResources: SubResource[];
  nodes: SceneNode[];
  connections: SceneConnection[];
}

export interface ExternalResource {
  type: string;
  path: string;
  id: string;
}

export interface SubResource {
  type: string;
  id: number | string;
  properties: Record<string, SceneValue>;
}

export interface SceneNode {
  name: string;
  type?: string;
  parent?: string;
  instance?: string;
  properties: Record<string, SceneValue>;
  groups?: string[];
}

export interface SceneConnection {
  signal: string;
  from: string;
  to: string;
  method: string;
  flags?: number;
}

export type SceneValue =
  | string
  | number
  | boolean
  | null
  | SceneValue[]
  | { [key: string]: SceneValue }
  | { _type: 'resource_ref'; ref: string }
  | { _type: 'ext_resource'; id: string }
  | { _type: 'sub_resource'; id: number | string }
  | { _type: 'vector2'; x: number; y: number }
  | { _type: 'vector3'; x: number; y: number; z: number }
  | { _type: 'color'; r: number; g: number; b: number; a: number }
  | { _type: 'rect2'; x: number; y: number; w: number; h: number }
  | { _type: 'transform3d'; values: number[] }
  | { _type: 'packed_array'; arrayType: string; values: SceneValue[] };

export interface ParsedScript {
  extends: string;
  className?: string;
  signals: GDSignalDef[];
  exports: GDExportDef[];
  onreadyVars: GDVarDef[];
  regularVars: GDVarDef[];
  enums: GDEnumDef[];
  methods: GDMethodDef[];
  comments: string[];
}

export interface GDSignalDef {
  name: string;
  params: GDParamDef[];
}

export interface GDParamDef {
  name: string;
  type?: string;
  defaultValue?: string;
}

export interface GDExportDef {
  name: string;
  type?: string;
  defaultValue?: string;
  hint?: string;
}

export interface GDVarDef {
  name: string;
  type?: string;
  defaultValue?: string;
}

export interface GDEnumDef {
  name: string;
  values: { name: string; value?: number }[];
}

export interface GDMethodDef {
  name: string;
  params: GDParamDef[];
  returnType?: string;
  isStatic: boolean;
  isOverride: boolean;
}

export interface GodotProjectConfig {
  configVersion: number;
  name: string;
  mainScene?: string;
  features: string[];
  tags: string[];
  autoloads: Record<string, string>;
  inputActions: string[];
  displayWidth?: number;
  displayHeight?: number;
  renderingBackend?: string;
}

export interface ProjectConventions {
  namingStyle: 'snake_case' | 'PascalCase' | 'mixed';
  signalNamingPattern: string;
  exportNamingPattern: string;
  commonBaseClasses: string[];
  indentStyle: 'tabs' | 'spaces';
  indentSize?: number;
  avgMethodsPerFile: number;
  avgSignalsPerFile: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  line?: number;
  message: string;
  code: string;
}

export interface ValidationWarning {
  line?: number;
  message: string;
  code: string;
}

export interface WriteResult {
  path: string;
  bytesWritten: number;
  created: boolean;
}

// Scaffold specs for generators
export interface ScaffoldSceneSpec {
  rootType: string;
  rootName: string;
  children?: ScaffoldNodeSpec[];
  script?: string;
}

export interface ScaffoldNodeSpec {
  name: string;
  type: string;
  properties?: Record<string, SceneValue>;
  children?: ScaffoldNodeSpec[];
  script?: string;
}

export interface ScriptSpec {
  extends: string;
  className?: string;
  signals?: GDSignalDef[];
  exports?: GDExportDef[];
  onreadyVars?: GDVarDef[];
  methods?: GDMethodSpec[];
}

export interface GDMethodSpec {
  name: string;
  params?: GDParamDef[];
  returnType?: string;
  body?: string;
  isStatic?: boolean;
}

export interface BTNodeSpec {
  type: string; // BTSequence, BTSelector, BTAction, BTCondition, etc.
  name?: string;
  properties?: Record<string, SceneValue>;
  children?: BTNodeSpec[];
}

export interface GodotBackendConfig {
  projectPath?: string;
  executablePath?: string;
  debugHost: string;
  debugPort: number;
  maxFileSizeMB: number;
  parserTimeoutMs: number;
}
