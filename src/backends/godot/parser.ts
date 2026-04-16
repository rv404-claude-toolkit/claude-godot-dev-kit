// Godot Backend — Parser for .tscn, .tres, .gd, and project.godot files

import {
  ParsedScene,
  ExternalResource,
  SubResource,
  SceneNode,
  SceneConnection,
  SceneValue,
  ParsedScript,
  GDSignalDef,
  GDExportDef,
  GDVarDef,
  GDEnumDef,
  GDMethodDef,
  GDParamDef,
  GodotProjectConfig,
} from './types.js';
import { GodotParseError, GodotFormatError } from './errors.js';


// ===========================================================================
// TSCN / TRES PARSER
// ===========================================================================

/**
 * Parse a .tscn scene file into a structured ParsedScene.
 */
export function parseTscn(content: string): ParsedScene {
  return parseSceneOrResource(content, 'scene');
}

/**
 * Parse a .tres resource file into a structured ParsedScene.
 * Same format as .tscn but header is [gd_resource ...] instead of [gd_scene ...].
 */
export function parseTres(content: string): ParsedScene {
  return parseSceneOrResource(content, 'resource');
}


// ---------------------------------------------------------------------------
// Shared scene/resource parser
// ---------------------------------------------------------------------------

function parseSceneOrResource(content: string, expectedType: 'scene' | 'resource'): ParsedScene {
  const lines = content.split(/\r?\n/);
  const result: ParsedScene = {
    format: 3,
    loadSteps: 0,
    type: expectedType,
    externalResources: [],
    subResources: [],
    nodes: [],
    connections: [],
  };

  // Merge multi-line values: lines ending with continuation or inside braces/brackets
  const mergedLines = mergeMultilineValues(lines);

  // Parse the header (first non-empty line)
  const headerTag = expectedType === 'scene' ? 'gd_scene' : 'gd_resource';
  let headerFound = false;

  let i = 0;
  while (i < mergedLines.length) {
    const line = mergedLines[i];
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith(';')) {
      i++;
      continue;
    }

    // Match section headers: [section_type key=value ...]
    const sectionMatch = trimmed.match(/^\[(\w+)(\s+.*)?\]$/);
    if (sectionMatch) {
      const sectionType = sectionMatch[1];
      const sectionAttrs = sectionMatch[2]?.trim() || '';

      if (sectionType === headerTag) {
        headerFound = true;
        const attrs = parseSectionAttributes(sectionAttrs);
        result.format = attrs['format'] !== undefined ? Number(attrs['format']) : 3;
        result.loadSteps = attrs['load_steps'] !== undefined ? Number(attrs['load_steps']) : 0;
        i++;
        continue;
      }

      if (!headerFound) {
        throw new GodotParseError(
          `Expected [${headerTag} ...] header but found [${sectionType}] at line ${i + 1}`,
          { line: i + 1, found: sectionType, expected: headerTag }
        );
      }

      if (sectionType === 'ext_resource') {
        const attrs = parseSectionAttributes(sectionAttrs);
        result.externalResources.push({
          type: attrs['type'] || '',
          path: attrs['path'] || '',
          id: attrs['id'] || '',
        });
        i++;
        continue;
      }

      if (sectionType === 'sub_resource') {
        const attrs = parseSectionAttributes(sectionAttrs);
        const subResource: SubResource = {
          type: attrs['type'] || '',
          id: parseSubResourceId(attrs['id']),
          properties: {},
        };
        i++;
        // Collect properties until next section or blank line
        while (i < mergedLines.length) {
          const propLine = mergedLines[i].trim();
          if (propLine === '' || propLine.startsWith('[')) break;
          if (propLine.startsWith(';')) { i++; continue; }
          const [key, value] = parsePropertyLine(propLine, i);
          if (key !== null) {
            subResource.properties[key] = value;
          }
          i++;
        }
        result.subResources.push(subResource);
        continue;
      }

      if (sectionType === 'node') {
        const attrs = parseSectionAttributes(sectionAttrs);
        const node: SceneNode = {
          name: attrs['name'] || '',
          properties: {},
        };
        if (attrs['type']) node.type = attrs['type'];
        if (attrs['parent']) node.parent = attrs['parent'];
        if (attrs['instance']) node.instance = attrs['instance'];
        if (attrs['groups']) {
          node.groups = parseInlineArray(attrs['groups']);
        }
        i++;
        // Collect properties until next section or blank line
        while (i < mergedLines.length) {
          const propLine = mergedLines[i].trim();
          if (propLine === '' || propLine.startsWith('[')) break;
          if (propLine.startsWith(';')) { i++; continue; }
          const [key, value] = parsePropertyLine(propLine, i);
          if (key !== null) {
            node.properties[key] = value;
          }
          i++;
        }
        result.nodes.push(node);
        continue;
      }

      if (sectionType === 'connection') {
        const attrs = parseSectionAttributes(sectionAttrs);
        const connection: SceneConnection = {
          signal: attrs['signal'] || '',
          from: attrs['from'] || '',
          to: attrs['to'] || '',
          method: attrs['method'] || '',
        };
        if (attrs['flags'] !== undefined) {
          connection.flags = Number(attrs['flags']);
        }
        result.connections.push(connection);
        i++;
        continue;
      }

      // Unknown section — skip its properties
      i++;
      while (i < mergedLines.length) {
        const propLine = mergedLines[i].trim();
        if (propLine === '' || propLine.startsWith('[')) break;
        i++;
      }
      continue;
    }

    // Non-section, non-empty line outside a section — skip
    i++;
  }

  if (!headerFound) {
    throw new GodotParseError(
      `Missing [${headerTag} ...] header in ${expectedType} file`,
      { expected: headerTag }
    );
  }

  return result;
}


/**
 * Merge multi-line values. Godot .tscn files can have values that span lines,
 * particularly Object(...) calls in [input] sections and multi-line dictionaries.
 * A line is continued if braces/brackets/parentheses are not balanced.
 */
function mergeMultilineValues(lines: string[]): string[] {
  const merged: string[] = [];
  let buffer = '';
  let depth = 0; // Track nesting depth of (), [], {}

  for (const line of lines) {
    const trimmed = line.trim();

    // Section headers are never continued
    if (depth === 0 && trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (buffer) {
        merged.push(buffer);
        buffer = '';
      }
      merged.push(line);
      continue;
    }

    if (depth === 0 && buffer === '') {
      // Start fresh
      buffer = line;
      depth = countNestingDelta(line);
      if (depth <= 0) {
        merged.push(buffer);
        buffer = '';
        depth = 0;
      }
    } else if (depth > 0) {
      // Continuation of a multi-line value
      buffer += '\n' + line;
      depth += countNestingDelta(line);
      if (depth <= 0) {
        merged.push(buffer);
        buffer = '';
        depth = 0;
      }
    } else {
      // depth === 0 and buffer is non-empty — push and start fresh
      if (buffer) {
        merged.push(buffer);
      }
      buffer = line;
      depth = countNestingDelta(line);
      if (depth <= 0) {
        merged.push(buffer);
        buffer = '';
        depth = 0;
      }
    }
  }

  if (buffer) {
    merged.push(buffer);
  }

  return merged;
}


/**
 * Count the nesting delta of a line (opens minus closes) for (), [], {}.
 * Ignores characters inside quoted strings.
 */
function countNestingDelta(line: string): number {
  let delta = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (inString) {
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') delta++;
    if (ch === ')' || ch === ']' || ch === '}') delta--;
  }

  return delta;
}


/**
 * Parse section attributes from strings like:
 *   type="Script" path="res://foo.gd" id="1"
 *   name="Node" type="Node3D" parent="."
 *   load_steps=2 format=3 uid="uid://abc"
 */
function parseSectionAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Match key=value or key="value" pairs
  const regex = /(\w+)\s*=\s*(?:"([^"]*)"|([\w.]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return attrs;
}


/**
 * Parse sub-resource ID — can be numeric or string.
 */
function parseSubResourceId(idStr: string | undefined): number | string {
  if (idStr === undefined) return 0;
  const num = Number(idStr);
  return isNaN(num) ? idStr : num;
}


/**
 * Parse a property line like:
 *   key = value
 *   theme_override_styles/panel = SubResource("bg_style")
 */
function parsePropertyLine(line: string, lineIndex: number): [string | null, SceneValue] {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) return [null, null];

  const key = line.slice(0, eqIdx).trim();
  const rawValue = line.slice(eqIdx + 1).trim();

  try {
    return [key, parseSceneValue(rawValue)];
  } catch (e) {
    // If value parsing fails, store as raw string
    return [key, rawValue];
  }
}


/**
 * Parse a Godot scene value from its text representation.
 */
function parseSceneValue(raw: string): SceneValue {
  const trimmed = raw.trim();

  if (trimmed === '') return null;
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // ExtResource("id")
  const extMatch = trimmed.match(/^ExtResource\(\s*"([^"]*)"\s*\)$/);
  if (extMatch) {
    return { _type: 'ext_resource', id: extMatch[1] };
  }

  // SubResource("id")
  const subMatch = trimmed.match(/^SubResource\(\s*"([^"]*)"\s*\)$/);
  if (subMatch) {
    return { _type: 'sub_resource', id: isNaN(Number(subMatch[1])) ? subMatch[1] : Number(subMatch[1]) };
  }

  // Vector2(x, y) and Vector2i(x, y)
  const vec2Match = trimmed.match(/^Vector2i?\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
  if (vec2Match) {
    return { _type: 'vector2', x: Number(vec2Match[1]), y: Number(vec2Match[2]) };
  }

  // Vector3(x, y, z) and Vector3i(x, y, z)
  const vec3Match = trimmed.match(/^Vector3i?\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
  if (vec3Match) {
    return { _type: 'vector3', x: Number(vec3Match[1]), y: Number(vec3Match[2]), z: Number(vec3Match[3]) };
  }

  // Color(r, g, b, a)
  const colorMatch = trimmed.match(/^Color\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
  if (colorMatch) {
    return { _type: 'color', r: Number(colorMatch[1]), g: Number(colorMatch[2]), b: Number(colorMatch[3]), a: Number(colorMatch[4]) };
  }

  // Rect2(x, y, w, h)
  const rect2Match = trimmed.match(/^Rect2\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
  if (rect2Match) {
    return { _type: 'rect2', x: Number(rect2Match[1]), y: Number(rect2Match[2]), w: Number(rect2Match[3]), h: Number(rect2Match[4]) };
  }

  // Transform3D(12 floats)
  const t3dMatch = trimmed.match(/^Transform3D\(([^)]+)\)$/);
  if (t3dMatch) {
    const values = t3dMatch[1].split(',').map(s => Number(s.trim()));
    return { _type: 'transform3d', values };
  }

  // PackedStringArray("a", "b", "c") and other Packed*Array types
  const packedMatch = trimmed.match(/^(Packed\w+Array)\(([^)]*)\)$/);
  if (packedMatch) {
    const arrayType = packedMatch[1];
    const inner = packedMatch[2].trim();
    if (inner === '') {
      return { _type: 'packed_array', arrayType, values: [] };
    }
    const values = parsePackedArrayValues(inner, arrayType);
    return { _type: 'packed_array', arrayType, values };
  }

  // Quoted string
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  // Numeric value (int or float)
  if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  // Inline array: [...]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return parseInlineArrayValue(trimmed);
  }

  // Inline dictionary: { ... }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return parseInlineDictValue(trimmed);
  }

  // Object(...) — complex inline object, store as raw string
  if (trimmed.startsWith('Object(')) {
    return trimmed;
  }

  // Resource reference — bare "res://..." (without quotes — unlikely but handle)
  if (trimmed.startsWith('res://')) {
    return { _type: 'resource_ref', ref: trimmed };
  }

  // Fall back to string representation
  return trimmed;
}


/**
 * Parse values inside a Packed*Array().
 */
function parsePackedArrayValues(inner: string, arrayType: string): SceneValue[] {
  if (arrayType === 'PackedStringArray') {
    // Extract quoted strings
    const matches = inner.match(/"([^"]*)"/g);
    if (!matches) return [];
    return matches.map(m => m.slice(1, -1));
  }

  // Numeric arrays
  return inner.split(',').map(s => {
    const num = Number(s.trim());
    return isNaN(num) ? s.trim() : num;
  });
}


/**
 * Parse an inline array value like [1, 2, 3] or ["a", "b"].
 * Simple top-level split — handles one level of nesting.
 */
function parseInlineArrayValue(raw: string): SceneValue[] {
  const inner = raw.slice(1, -1).trim();
  if (inner === '') return [];

  const elements = splitTopLevel(inner, ',');
  return elements.map(el => parseSceneValue(el.trim()));
}


/**
 * Parse an inline dictionary value like { "key": value, ... }.
 */
function parseInlineDictValue(raw: string): Record<string, SceneValue> {
  const inner = raw.slice(1, -1).trim();
  if (inner === '') return {};

  const result: Record<string, SceneValue> = {};
  const pairs = splitTopLevel(inner, ',');
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;
    let key = pair.slice(0, colonIdx).trim();
    // Remove quotes from key
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.slice(1, -1);
    }
    const value = parseSceneValue(pair.slice(colonIdx + 1).trim());
    result[key] = value;
  }
  return result;
}


/**
 * Split a string at top-level delimiters, respecting nesting and quotes.
 */
function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      current += ch;
      escaped = true;
      continue;
    }

    if (inString) {
      current += ch;
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      current += ch;
      continue;
    }

    if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      current += ch;
      continue;
    }

    if (ch === delimiter && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}


/**
 * Parse inline array from section attributes (e.g., groups=["group1", "group2"]).
 */
function parseInlineArray(raw: string): string[] {
  const inner = raw.replace(/^\[/, '').replace(/\]$/, '');
  if (!inner.trim()) return [];
  return inner.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
}


// ===========================================================================
// GDSCRIPT PARSER (Metadata Only)
// ===========================================================================

/** Override lifecycle method prefixes in Godot 4.x */
const OVERRIDE_PREFIXES = [
  '_ready', '_process', '_physics_process', '_input', '_unhandled_input',
  '_unhandled_key_input', '_notification', '_enter_tree', '_exit_tree',
  '_init', '_draw', '_gui_input', '_shortcut_input',
  '_get', '_set', '_get_property_list', '_property_can_revert',
  '_property_get_revert', '_validate_property',
];

/**
 * Parse GDScript metadata from a .gd file.
 * Extracts class info, signals, exports, vars, enums, and method signatures.
 * Does NOT parse function bodies — this is metadata-only line-by-line regex parsing.
 */
export function parseGDScript(content: string): ParsedScript {
  const lines = content.split(/\r?\n/);

  const result: ParsedScript = {
    extends: '',
    signals: [],
    exports: [],
    onreadyVars: [],
    regularVars: [],
    enums: [],
    methods: [],
    comments: [],
  };

  let i = 0;

  // Collect leading doc comments (## lines at the top of the file)
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('##')) {
      result.comments.push(trimmed.slice(2).trim());
      i++;
    } else if (trimmed === '' || trimmed.startsWith('#')) {
      // Skip blank lines and regular comments in the header
      i++;
    } else {
      break;
    }
  }

  // Process remaining lines
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    // extends ClassName
    const extendsMatch = trimmed.match(/^extends\s+(\S+)/);
    if (extendsMatch) {
      result.extends = extendsMatch[1];
      i++;
      continue;
    }

    // class_name ClassName
    const classNameMatch = trimmed.match(/^class_name\s+(\S+)/);
    if (classNameMatch) {
      result.className = classNameMatch[1];
      i++;
      continue;
    }

    // signal signal_name(params)
    const signalMatch = trimmed.match(/^signal\s+(\w+)\s*(\(([^)]*)\))?/);
    if (signalMatch) {
      const signalDef: GDSignalDef = {
        name: signalMatch[1],
        params: signalMatch[3] ? parseGDParams(signalMatch[3]) : [],
      };
      result.signals.push(signalDef);
      i++;
      continue;
    }

    // enum EnumName { A, B, C } — may span multiple lines
    const enumMatch = trimmed.match(/^enum\s+(\w+)\s*\{/);
    if (enumMatch) {
      const enumDef = parseEnum(enumMatch[1], lines, i);
      result.enums.push(enumDef.def);
      i = enumDef.nextLine;
      continue;
    }

    // @export variants
    if (trimmed.startsWith('@export')) {
      const exportDef = parseExportLine(trimmed);
      if (exportDef) {
        result.exports.push(exportDef);
      }
      i++;
      continue;
    }

    // @onready var name: Type = ...
    if (trimmed.startsWith('@onready')) {
      const varDef = parseOnreadyLine(trimmed);
      if (varDef) {
        result.onreadyVars.push(varDef);
      }
      i++;
      continue;
    }

    // Regular var (class-level, not inside functions)
    // Only match if the line starts at column 0 (no indentation) or single tab (class-level in inner class)
    if ((trimmed.startsWith('var ') || trimmed.startsWith('const ')) && !line.startsWith('\t\t') && !line.startsWith('        ')) {
      // Only capture if line doesn't start with deep indentation (function body)
      const indent = line.length - line.trimStart().length;
      if (indent <= 1) { // 0 or 1 tab = class level
        const varDef = parseVarLine(trimmed);
        if (varDef) {
          result.regularVars.push(varDef);
        }
      }
      i++;
      continue;
    }

    // static var at class level
    if (trimmed.startsWith('static var ')) {
      const indent = line.length - line.trimStart().length;
      if (indent <= 1) {
        const varDef = parseVarLine(trimmed.replace(/^static\s+/, ''));
        if (varDef) {
          result.regularVars.push(varDef);
        }
      }
      i++;
      continue;
    }

    // func / static func — may span multiple lines when params are on subsequent lines
    const funcStartMatch = trimmed.match(/^(static\s+)?func\s+(\w+)\s*\(/);
    if (funcStartMatch) {
      // Collect the full signature — it may span multiple lines until "):' is found
      let fullSig = trimmed;
      let sigLineIdx = i;
      const funcIndent = line.length - line.trimStart().length;

      // Check if the opening paren is balanced on this line
      while (!isSignatureComplete(fullSig) && sigLineIdx + 1 < lines.length) {
        sigLineIdx++;
        fullSig += ' ' + lines[sigLineIdx].trim();
      }

      const funcMatch = fullSig.match(/^(static\s+)?func\s+(\w+)\s*\(([^)]*)\)\s*(->\s*(\S+))?\s*:/);
      if (funcMatch) {
        const methodDef: GDMethodDef = {
          name: funcMatch[2],
          params: funcMatch[3] ? parseGDParams(funcMatch[3]) : [],
          isStatic: funcMatch[1] !== undefined,
          isOverride: OVERRIDE_PREFIXES.includes(funcMatch[2]),
        };
        if (funcMatch[5]) {
          methodDef.returnType = funcMatch[5];
        }
        result.methods.push(methodDef);
        i = sigLineIdx + 1;
        // Skip function body (indented lines)
        while (i < lines.length) {
          const bodyLine = lines[i];
          // An empty line inside a function is allowed
          if (bodyLine.trim() === '') {
            i++;
            continue;
          }
          // If the line is indented (starts with tab or spaces), it's part of the body
          if (bodyLine.startsWith('\t') || bodyLine.startsWith('  ')) {
            // But make sure it's deeper than function-level indent
            const bodyIndent = bodyLine.length - bodyLine.trimStart().length;
            if (bodyIndent > funcIndent) {
              i++;
              continue;
            }
          }
          break;
        }
        continue;
      }
      // If regex still didn't match after merging, skip this line
      i++;
      continue;
    }

    i++;
  }

  return result;
}


/**
 * Check if a function signature line is complete (has balanced parens and ends with ':').
 */
function isSignatureComplete(sig: string): boolean {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  for (let j = 0; j < sig.length; j++) {
    const ch = sig[j];
    if (inString) {
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
  }
  // Complete when parens are balanced and line ends with ':'
  return depth <= 0 && sig.trimEnd().endsWith(':');
}


/**
 * Parse GDScript function/signal parameters from a comma-separated string.
 * Handles: "name: Type", "name: Type = default", "name"
 */
function parseGDParams(paramsStr: string): GDParamDef[] {
  const raw = paramsStr.trim();
  if (raw === '') return [];

  return raw.split(',').map(p => {
    const param = p.trim();
    const def: GDParamDef = { name: '' };

    // Handle "name: Type = default"
    const fullMatch = param.match(/^(\w+)\s*:\s*([^=]+?)(?:\s*=\s*(.+))?$/);
    if (fullMatch) {
      def.name = fullMatch[1];
      def.type = fullMatch[2].trim();
      if (fullMatch[3] !== undefined) {
        def.defaultValue = fullMatch[3].trim();
      }
      return def;
    }

    // Handle "name = default" (no type)
    const defaultMatch = param.match(/^(\w+)\s*=\s*(.+)$/);
    if (defaultMatch) {
      def.name = defaultMatch[1];
      def.defaultValue = defaultMatch[2].trim();
      return def;
    }

    // Just a name
    def.name = param.replace(/\s+/g, '');
    return def;
  }).filter(p => p.name !== '');
}


/**
 * Parse an enum definition that may span multiple lines.
 */
function parseEnum(name: string, lines: string[], startLine: number): { def: GDEnumDef; nextLine: number } {
  const enumDef: GDEnumDef = { name, values: [] };

  // Collect all content between { and }
  let content = '';
  let i = startLine;
  let depth = 0;

  while (i < lines.length) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    content += line + '\n';
    i++;
    if (depth <= 0) break;
  }

  // Extract the part between { and }
  const braceStart = content.indexOf('{');
  const braceEnd = content.lastIndexOf('}');
  if (braceStart === -1 || braceEnd === -1) {
    return { def: enumDef, nextLine: i };
  }

  const inner = content.slice(braceStart + 1, braceEnd).trim();
  if (inner === '') return { def: enumDef, nextLine: i };

  const parts = inner.split(',');
  let autoValue = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '') continue;

    // Remove trailing comments
    const commentFree = trimmed.replace(/#.*$/, '').trim();
    if (commentFree === '') continue;

    const assignMatch = commentFree.match(/^(\w+)\s*=\s*(\d+)/);
    if (assignMatch) {
      const value = Number(assignMatch[2]);
      enumDef.values.push({ name: assignMatch[1], value });
      autoValue = value + 1;
    } else {
      const nameMatch = commentFree.match(/^(\w+)/);
      if (nameMatch) {
        enumDef.values.push({ name: nameMatch[1], value: autoValue });
        autoValue++;
      }
    }
  }

  return { def: enumDef, nextLine: i };
}


/**
 * Parse an @export line into a GDExportDef.
 * Handles variants:
 *   @export var name: Type = default
 *   @export_range(min, max) var name: Type = default
 *   @export_enum("a", "b") var name: Type
 */
function parseExportLine(line: string): GDExportDef | null {
  // Extract hint from @export_xxx(...) if present
  let hint: string | undefined;
  const hintMatch = line.match(/^@export_(\w+)\(([^)]*)\)/);
  if (hintMatch) {
    hint = `${hintMatch[1]}(${hintMatch[2]})`;
  }

  // Extract the var part
  const varMatch = line.match(/var\s+(\w+)\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/);
  if (!varMatch) return null;

  const def: GDExportDef = {
    name: varMatch[1],
  };

  if (varMatch[2]) def.type = varMatch[2].trim();
  if (varMatch[3]) def.defaultValue = varMatch[3].trim();
  if (hint) def.hint = hint;

  return def;
}


/**
 * Parse an @onready var line into a GDVarDef.
 */
function parseOnreadyLine(line: string): GDVarDef | null {
  const varMatch = line.match(/var\s+(\w+)\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/);
  if (!varMatch) return null;

  const def: GDVarDef = { name: varMatch[1] };
  if (varMatch[2]) def.type = varMatch[2].trim();
  if (varMatch[3]) def.defaultValue = varMatch[3].trim();
  return def;
}


/**
 * Parse a var or const line into a GDVarDef.
 */
function parseVarLine(line: string): GDVarDef | null {
  // Match: var name: Type = default  OR  const NAME: Type = value
  const varMatch = line.match(/^(?:var|const)\s+(\w+)\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/);
  if (!varMatch) {
    // Try without the full match — some lines have complex defaults
    const simpleMatch = line.match(/^(?:var|const)\s+(\w+)/);
    if (simpleMatch) {
      const def: GDVarDef = { name: simpleMatch[1] };
      // Try to extract type
      const typeMatch = line.match(/:\s*(\w+)/);
      if (typeMatch) def.type = typeMatch[1];
      return def;
    }
    return null;
  }

  const def: GDVarDef = { name: varMatch[1] };
  if (varMatch[2]) def.type = varMatch[2].trim();
  if (varMatch[3]) def.defaultValue = varMatch[3].trim();
  return def;
}


// ===========================================================================
// PROJECT.GODOT PARSER
// ===========================================================================

/**
 * Parse a project.godot ConfigFile into a GodotProjectConfig.
 * Format: INI-style with [section] headers and key=value pairs.
 */
export function parseProjectConfig(content: string): GodotProjectConfig {
  const lines = content.split(/\r?\n/);

  const config: GodotProjectConfig = {
    configVersion: 5,
    name: '',
    features: [],
    tags: [],
    autoloads: {},
    inputActions: [],
  };

  // Parse into sections with key-value pairs
  const sections: Record<string, Record<string, string>> = {};
  let currentSection = '';

  // Merge multi-line values (for [input] section with Object(...) spanning lines)
  const mergedLines = mergeMultilineValues(lines);

  for (const line of mergedLines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed === '' || trimmed.startsWith(';')) continue;

    // Section header
    const sectionMatch = trimmed.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!sections[currentSection]) {
        sections[currentSection] = {};
      }
      continue;
    }

    // Key=value (first = only — values may contain = signs)
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1 && currentSection !== '') {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      sections[currentSection][key] = value;
    } else if (eqIdx !== -1 && currentSection === '') {
      // Top-level key=value (before any section)
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (key === 'config_version') {
        config.configVersion = Number(value);
      }
    }
  }

  // Extract application settings
  const app = sections['application'] || {};

  if (app['config/name']) {
    config.name = unquote(app['config/name']);
  }

  if (app['run/main_scene']) {
    config.mainScene = unquote(app['run/main_scene']);
  }

  if (app['config/features']) {
    config.features = parsePackedStringArrayValue(app['config/features']);
  }

  if (app['config/tags']) {
    config.tags = parsePackedStringArrayValue(app['config/tags']);
  }

  // Extract autoloads
  const autoloadSection = sections['autoload'] || {};
  for (const [key, value] of Object.entries(autoloadSection)) {
    // Value is like "*res://path/to/file.gd" (autoloaded) or "res://path" (not autoloaded singleton)
    config.autoloads[key] = unquote(value);
  }

  // Extract input actions
  const inputSection = sections['input'] || {};
  config.inputActions = Object.keys(inputSection);

  // Extract display settings
  const display = sections['display'] || {};
  if (display['window/size/viewport_width']) {
    config.displayWidth = Number(display['window/size/viewport_width']);
  }
  if (display['window/size/viewport_height']) {
    config.displayHeight = Number(display['window/size/viewport_height']);
  }

  // Extract rendering settings
  const rendering = sections['rendering'] || {};
  if (rendering['renderer/rendering_method']) {
    config.renderingBackend = unquote(rendering['renderer/rendering_method']);
  }

  return config;
}


/**
 * Parse PackedStringArray("a", "b", "c") from a project.godot value.
 */
function parsePackedStringArrayValue(raw: string): string[] {
  const match = raw.match(/^PackedStringArray\(([^)]*)\)$/);
  if (!match) return [];
  const inner = match[1].trim();
  if (inner === '') return [];
  const strings = inner.match(/"([^"]*)"/g);
  if (!strings) return [];
  return strings.map(s => s.slice(1, -1));
}


/**
 * Remove surrounding quotes from a string value.
 */
function unquote(s: string): string {
  if (s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return s;
}
