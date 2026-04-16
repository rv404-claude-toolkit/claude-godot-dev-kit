// Godot Backend — Scene, Script, and Behavior Tree Generators

import {
  ScaffoldSceneSpec,
  ScaffoldNodeSpec,
  ScriptSpec,
  GDMethodSpec,
  BTNodeSpec,
  SceneValue,
  GDSignalDef,
  GDExportDef,
  GDVarDef,
} from './types.js';
import { GodotGenerationError } from './errors.js';


// ===========================================================================
// TSCN SCENE GENERATOR
// ===========================================================================

/**
 * Generate a .tscn scene file from a ScaffoldSceneSpec.
 *
 * Produces a valid Godot 4.x scene file with:
 * - [gd_scene] header with computed load_steps
 * - [ext_resource] entries for referenced scripts
 * - [node] entries with proper parent paths
 * - Property assignments on nodes
 */
export function generateTscn(spec: ScaffoldSceneSpec): string {
  if (!spec.rootName || !spec.rootType) {
    throw new GodotGenerationError('ScaffoldSceneSpec requires rootName and rootType', {
      rootName: spec.rootName,
      rootType: spec.rootType,
    });
  }

  // Collect all scripts referenced to create ext_resource entries
  const scripts: string[] = [];
  if (spec.script) {
    scripts.push(spec.script);
  }
  collectScripts(spec.children || [], scripts);

  // Compute load_steps: 1 (base) + number of ext_resources
  const loadSteps = scripts.length > 0 ? scripts.length + 1 : 1;

  const lines: string[] = [];

  // Header
  lines.push(`[gd_scene load_steps=${loadSteps} format=3]`);
  lines.push('');

  // External resources (scripts)
  const scriptIdMap = new Map<string, string>();
  scripts.forEach((scriptPath, idx) => {
    const id = `${idx + 1}`;
    scriptIdMap.set(scriptPath, id);
    lines.push(`[ext_resource type="Script" path="${scriptPath}" id="${id}"]`);
  });

  if (scripts.length > 0) {
    lines.push('');
  }

  // Root node
  lines.push(`[node name="${escapeNodeName(spec.rootName)}" type="${spec.rootType}"]`);
  if (spec.script && scriptIdMap.has(spec.script)) {
    lines.push(`script = ExtResource("${scriptIdMap.get(spec.script)}")`);
  }

  // Child nodes (recursive)
  if (spec.children) {
    for (const child of spec.children) {
      emitNode(child, '.', lines, scriptIdMap);
    }
  }

  lines.push('');
  return lines.join('\n');
}


/**
 * Recursively collect all script paths from node specs.
 */
function collectScripts(nodes: ScaffoldNodeSpec[], scripts: string[]): void {
  for (const node of nodes) {
    if (node.script && !scripts.includes(node.script)) {
      scripts.push(node.script);
    }
    if (node.children) {
      collectScripts(node.children, scripts);
    }
  }
}


/**
 * Emit a node entry and its children recursively.
 */
function emitNode(
  node: ScaffoldNodeSpec,
  parentPath: string,
  lines: string[],
  scriptIdMap: Map<string, string>,
): void {
  lines.push('');
  lines.push(`[node name="${escapeNodeName(node.name)}" type="${node.type}" parent="${parentPath}"]`);

  // Script reference
  if (node.script && scriptIdMap.has(node.script)) {
    lines.push(`script = ExtResource("${scriptIdMap.get(node.script)}")`);
  }

  // Properties
  if (node.properties) {
    for (const [key, value] of Object.entries(node.properties)) {
      lines.push(`${key} = ${formatSceneValue(value)}`);
    }
  }

  // Children — compute their parent path
  if (node.children) {
    const childParentPath = parentPath === '.' ? node.name : `${parentPath}/${node.name}`;
    for (const child of node.children) {
      emitNode(child, childParentPath, lines, scriptIdMap);
    }
  }
}


/**
 * Format a SceneValue into its Godot text representation.
 */
function formatSceneValue(value: SceneValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') return `"${value}"`;

  if (Array.isArray(value)) {
    const elements = value.map(v => formatSceneValue(v));
    return `[${elements.join(', ')}]`;
  }

  if (typeof value === 'object' && '_type' in value) {
    switch ((value as { _type: string })._type) {
      case 'resource_ref': {
        const v = value as { _type: 'resource_ref'; ref: string };
        return `"${v.ref}"`;
      }
      case 'ext_resource': {
        const v = value as { _type: 'ext_resource'; id: string };
        return `ExtResource("${v.id}")`;
      }
      case 'sub_resource': {
        const v = value as { _type: 'sub_resource'; id: number | string };
        return `SubResource("${v.id}")`;
      }
      case 'vector2': {
        const v = value as { _type: 'vector2'; x: number; y: number };
        return `Vector2(${formatNumber(v.x)}, ${formatNumber(v.y)})`;
      }
      case 'vector3': {
        const v = value as { _type: 'vector3'; x: number; y: number; z: number };
        return `Vector3(${formatNumber(v.x)}, ${formatNumber(v.y)}, ${formatNumber(v.z)})`;
      }
      case 'color': {
        const v = value as { _type: 'color'; r: number; g: number; b: number; a: number };
        return `Color(${formatNumber(v.r)}, ${formatNumber(v.g)}, ${formatNumber(v.b)}, ${formatNumber(v.a)})`;
      }
      case 'rect2': {
        const v = value as { _type: 'rect2'; x: number; y: number; w: number; h: number };
        return `Rect2(${formatNumber(v.x)}, ${formatNumber(v.y)}, ${formatNumber(v.w)}, ${formatNumber(v.h)})`;
      }
      case 'transform3d': {
        const v = value as { _type: 'transform3d'; values: number[] };
        return `Transform3D(${v.values.map(formatNumber).join(', ')})`;
      }
      case 'packed_array': {
        const v = value as { _type: 'packed_array'; arrayType: string; values: SceneValue[] };
        if (v.arrayType === 'PackedStringArray') {
          const strings = v.values.map((s: SceneValue) => `"${s}"`);
          return `${v.arrayType}(${strings.join(', ')})`;
        }
        return `${v.arrayType}(${v.values.map((s: SceneValue) => formatSceneValue(s)).join(', ')})`;
      }
      default:
        return `"${JSON.stringify(value)}"`;
    }
  }

  // Plain object — format as dictionary
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, SceneValue>);
    const pairs = entries.map(([k, v]) => `"${k}": ${formatSceneValue(v)}`);
    return `{${pairs.join(', ')}}`;
  }

  return `"${String(value)}"`;
}


/**
 * Format a number for Godot output: integers without decimal, floats with decimal.
 */
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toString();
}


/**
 * Escape special characters in node names for .tscn format.
 */
function escapeNodeName(name: string): string {
  // Godot node names in .tscn are quoted if they contain special characters
  // For simple alphanumeric + underscore names, no escaping needed
  return name.replace(/"/g, '\\"');
}


// ===========================================================================
// GDSCRIPT GENERATOR
// ===========================================================================

/** Override lifecycle methods that should call super() */
const SUPER_OVERRIDE_METHODS = [
  '_ready', '_process', '_physics_process', '_input', '_unhandled_input',
  '_unhandled_key_input', '_notification', '_enter_tree', '_exit_tree',
  '_draw', '_gui_input', '_shortcut_input',
];

/**
 * Generate a .gd script file from a ScriptSpec.
 *
 * Output order:
 * 1. class_name (if provided)
 * 2. extends
 * 3. signal declarations
 * 4. @export vars
 * 5. @onready vars
 * 6. method definitions
 *
 * Uses tabs for indentation (Godot convention).
 */
export function generateGDScript(spec: ScriptSpec): string {
  if (!spec.extends) {
    throw new GodotGenerationError('ScriptSpec requires an extends value', {
      extends: spec.extends,
    });
  }

  const sections: string[] = [];

  // 1. class_name (if provided)
  if (spec.className) {
    sections.push(`class_name ${spec.className}`);
  }

  // 2. extends
  sections.push(`extends ${spec.extends}`);

  // 3. Signal declarations
  if (spec.signals && spec.signals.length > 0) {
    sections.push('');
    for (const signal of spec.signals) {
      sections.push(formatSignal(signal));
    }
  }

  // 4. Export vars
  if (spec.exports && spec.exports.length > 0) {
    sections.push('');
    for (const exp of spec.exports) {
      sections.push(formatExport(exp));
    }
  }

  // 5. @onready vars
  if (spec.onreadyVars && spec.onreadyVars.length > 0) {
    sections.push('');
    for (const v of spec.onreadyVars) {
      sections.push(formatOnreadyVar(v));
    }
  }

  // 6. Method definitions
  if (spec.methods && spec.methods.length > 0) {
    for (const method of spec.methods) {
      sections.push('');
      sections.push(formatMethod(method));
    }
  }

  sections.push('');
  return sections.join('\n');
}


/**
 * Format a signal declaration.
 */
function formatSignal(signal: GDSignalDef): string {
  if (signal.params.length === 0) {
    return `signal ${signal.name}`;
  }
  const params = signal.params.map(p => {
    let s = p.name;
    if (p.type) s += `: ${p.type}`;
    return s;
  });
  return `signal ${signal.name}(${params.join(', ')})`;
}


/**
 * Format an @export variable declaration.
 */
function formatExport(exp: GDExportDef): string {
  let line = '@export var ' + exp.name;
  if (exp.type) line += `: ${exp.type}`;
  if (exp.defaultValue !== undefined) line += ` = ${exp.defaultValue}`;
  return line;
}


/**
 * Format an @onready variable declaration.
 */
function formatOnreadyVar(v: GDVarDef): string {
  let line = '@onready var ' + v.name;
  if (v.type) line += `: ${v.type}`;
  if (v.defaultValue !== undefined) line += ` = ${v.defaultValue}`;
  return line;
}


/**
 * Format a method definition with tab indentation.
 */
function formatMethod(method: GDMethodSpec): string {
  const lines: string[] = [];

  // Function signature
  let sig = '';
  if (method.isStatic) sig += 'static ';
  sig += `func ${method.name}(`;

  if (method.params && method.params.length > 0) {
    const params = method.params.map(p => {
      let s = p.name;
      if (p.type) s += `: ${p.type}`;
      if (p.defaultValue !== undefined) s += ` = ${p.defaultValue}`;
      return s;
    });
    sig += params.join(', ');
  }

  sig += ')';

  if (method.returnType) {
    sig += ` -> ${method.returnType}`;
  }

  sig += ':';
  lines.push(sig);

  // Method body
  if (method.body) {
    // Body is provided — indent each line with a tab
    const bodyLines = method.body.split('\n');
    for (const bodyLine of bodyLines) {
      lines.push(`\t${bodyLine}`);
    }
  } else {
    // No body — use super() for override methods, otherwise pass
    const isOverride = SUPER_OVERRIDE_METHODS.includes(method.name);
    if (isOverride) {
      // TODO: super() is not always appropriate for all overrides — simplest option per convention
      lines.push('\tsuper()');
    }
    lines.push('\tpass');
  }

  return lines.join('\n');
}


// ===========================================================================
// BEHAVIOR TREE GENERATOR (LimboAI .tres format)
// ===========================================================================

/** Counter for generating unique sub-resource IDs */
let idCounter = 0;

/**
 * Reset the ID counter (useful for testing deterministic output).
 */
export function resetIdCounter(): void {
  idCounter = 0;
}


/**
 * Generate a unique ID string for a BT sub-resource.
 */
function generateId(type: string): string {
  idCounter++;
  // Format: TypeName_hexCounter  (e.g., BTSequence_a1b2c3)
  const hex = idCounter.toString(16).padStart(6, '0');
  return `${type}_${hex}`;
}


/**
 * Collected sub-resource entry for building the .tres output.
 */
interface BTSubResource {
  type: string;
  id: string;
  properties: Record<string, string>;
  childIds: string[];
}


/**
 * Generate a LimboAI behavior tree .tres file from a BTNodeSpec tree.
 *
 * Output format:
 * - [gd_resource] header with computed load_steps
 * - [sub_resource] entries for each BT node
 * - [resource] section referencing the root task
 *
 * Each BTNodeSpec becomes a sub_resource. Children are wired via the
 * `children` property as an array of SubResource references.
 */
export function generateBehaviorTree(spec: BTNodeSpec): string {
  if (!spec.type) {
    throw new GodotGenerationError('BTNodeSpec requires a type', { type: spec.type });
  }

  // Reset counter for deterministic output within a single generation call
  idCounter = 0;

  // Flatten the tree into sub-resources
  const subResources: BTSubResource[] = [];
  const rootId = flattenBTNode(spec, subResources);

  // Compute load_steps: number of sub_resources + 1 for the resource itself
  const loadSteps = subResources.length + 1;

  const lines: string[] = [];

  // Header
  lines.push(`[gd_resource type="BehaviorTree" load_steps=${loadSteps} format=3]`);

  // Sub-resources (in order of creation — parents before children for readability,
  // but Godot actually processes by ID reference so order is flexible)
  for (const sub of subResources) {
    lines.push('');
    lines.push(`[sub_resource type="${sub.type}" id="${sub.id}"]`);

    // Custom properties (e.g., task_name for BTAction)
    for (const [key, value] of Object.entries(sub.properties)) {
      lines.push(`${key} = ${value}`);
    }

    // Children array
    if (sub.childIds.length > 0) {
      const refs = sub.childIds.map(id => `SubResource("${id}")`);
      lines.push(`children = [${refs.join(', ')}]`);
    }
  }

  // Resource section — references the root task
  lines.push('');
  lines.push('[resource]');
  lines.push(`root_task = SubResource("${rootId}")`);
  lines.push('');

  return lines.join('\n');
}


/**
 * Recursively flatten a BTNodeSpec tree into an array of BTSubResource entries.
 * Returns the ID of the generated sub-resource for the given node.
 */
function flattenBTNode(node: BTNodeSpec, subResources: BTSubResource[]): string {
  const id = generateId(node.type);

  // Process children first to get their IDs
  const childIds: string[] = [];
  if (node.children) {
    for (const child of node.children) {
      const childId = flattenBTNode(child, subResources);
      childIds.push(childId);
    }
  }

  // Build properties from the node spec
  const properties: Record<string, string> = {};

  if (node.name) {
    // For BTAction/BTCondition, the name maps to task_name
    if (node.type === 'BTAction' || node.type === 'BTCondition') {
      properties['task_name'] = `"${node.name}"`;
    } else {
      // For composite/decorator nodes, use custom_name
      properties['custom_name'] = `"${node.name}"`;
    }
  }

  // Add any additional properties from the spec
  if (node.properties) {
    for (const [key, value] of Object.entries(node.properties)) {
      properties[key] = formatSceneValue(value);
    }
  }

  subResources.push({ type: node.type, id, properties, childIds });
  return id;
}
