// Godot Backend — Scene & Script Validation
// Heuristic validation without requiring a running Godot instance

import { access } from 'node:fs/promises';
import {
  ParsedScene,
  ParsedScript,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types.js';
import { GodotValidationError } from './errors.js';
import { fromResPath } from './utils.js';

// Common Godot 4.x base classes that scripts can extend
const KNOWN_BASE_CLASSES = new Set([
  'Node', 'Node2D', 'Node3D', 'Control', 'Resource', 'RefCounted', 'Object',
  'Area2D', 'Area3D',
  'CharacterBody2D', 'CharacterBody3D',
  'RigidBody2D', 'RigidBody3D',
  'StaticBody2D', 'StaticBody3D',
  'Camera2D', 'Camera3D',
  'Light3D', 'MeshInstance3D',
  'Sprite2D', 'Sprite3D',
  'AnimationPlayer', 'Timer',
  'AudioStreamPlayer', 'HTTPRequest',
  'SubViewport', 'CanvasLayer',
  'Panel', 'Label', 'Button', 'LineEdit', 'TextEdit', 'RichTextLabel',
  'VBoxContainer', 'HBoxContainer', 'GridContainer', 'MarginContainer',
  'ScrollContainer', 'TabContainer',
  'ItemList', 'Tree',
  'ColorRect', 'TextureRect',
  'ProgressBar', 'SpinBox', 'OptionButton',
  'CheckBox', 'CheckButton',
  'FileDialog', 'AcceptDialog', 'ConfirmationDialog', 'Popup', 'Window',
  // Additional commonly used classes
  'AnimatedSprite2D', 'AnimatedSprite3D',
  'CollisionShape2D', 'CollisionShape3D',
  'CollisionPolygon2D', 'CollisionPolygon3D',
  'RayCast2D', 'RayCast3D',
  'PathFollow2D', 'PathFollow3D',
  'Path2D', 'Path3D',
  'TileMap', 'TileMapLayer',
  'NavigationAgent2D', 'NavigationAgent3D',
  'NavigationRegion2D', 'NavigationRegion3D',
  'CPUParticles2D', 'CPUParticles3D',
  'GPUParticles2D', 'GPUParticles3D',
  'DirectionalLight3D', 'OmniLight3D', 'SpotLight3D',
  'WorldEnvironment', 'Environment',
  'AudioStreamPlayer2D', 'AudioStreamPlayer3D',
  'Viewport', 'SubViewportContainer',
  'CanvasGroup', 'CanvasModulate',
  'ParallaxBackground', 'ParallaxLayer',
  'Line2D', 'Polygon2D',
  'Marker2D', 'Marker3D',
  'RemoteTransform2D', 'RemoteTransform3D',
  'VisibleOnScreenNotifier2D', 'VisibleOnScreenNotifier3D',
  'SkeletonModification2D',
  'Skeleton2D', 'Skeleton3D',
  'BoneAttachment3D',
  'MultiMeshInstance3D',
  'CSGBox3D', 'CSGCylinder3D', 'CSGMesh3D', 'CSGPolygon3D', 'CSGSphere3D', 'CSGTorus3D', 'CSGCombiner3D',
  'VehicleBody3D', 'VehicleWheel3D',
  'SoftBody3D',
  'Joint2D', 'PinJoint2D', 'DampedSpringJoint2D', 'GrooveJoint2D',
  'Joint3D', 'PinJoint3D', 'HingeJoint3D', 'SliderJoint3D', 'ConeTwistJoint3D', 'Generic6DOFJoint3D',
  'AnimationTree', 'AnimationNodeStateMachinePlayback',
  'ShapeCast2D', 'ShapeCast3D',
  'XROrigin3D', 'XRCamera3D', 'XRController3D',
]);

// Valid Godot types for @export annotations
const VALID_EXPORT_TYPES = new Set([
  // Primitives
  'int', 'float', 'bool', 'String', 'StringName', 'NodePath',
  // Math
  'Vector2', 'Vector2i', 'Vector3', 'Vector3i', 'Vector4', 'Vector4i',
  'Rect2', 'Rect2i', 'Transform2D', 'Transform3D',
  'Basis', 'Quaternion', 'AABB', 'Plane', 'Projection',
  'Color',
  // Collections
  'Array', 'Dictionary',
  'PackedByteArray', 'PackedInt32Array', 'PackedInt64Array',
  'PackedFloat32Array', 'PackedFloat64Array',
  'PackedStringArray', 'PackedVector2Array', 'PackedVector3Array',
  'PackedColorArray',
  // Resources
  'Resource', 'Texture2D', 'Texture3D', 'CompressedTexture2D',
  'AudioStream', 'AudioStreamWAV', 'AudioStreamOggVorbis', 'AudioStreamMP3',
  'PackedScene', 'Material', 'ShaderMaterial', 'StandardMaterial3D',
  'Mesh', 'ArrayMesh', 'BoxMesh', 'CapsuleMesh', 'CylinderMesh', 'PlaneMesh', 'SphereMesh',
  'Font', 'FontFile', 'FontVariation',
  'Curve', 'Curve2D', 'Curve3D', 'Gradient',
  'StyleBox', 'StyleBoxFlat', 'StyleBoxTexture',
  'Theme', 'Animation', 'SpriteFrames',
  'Shape2D', 'Shape3D', 'CircleShape2D', 'RectangleShape2D', 'CapsuleShape2D',
  'BoxShape3D', 'CapsuleShape3D', 'CylinderShape3D', 'SphereShape3D',
  'TileSet', 'NavigationMesh', 'NavigationPolygon',
  'Script', 'GDScript',
  'Shader', 'Environment',
  'PhysicsMaterial',
  'Node', 'NodePath',
]);


// ============================================================================
// SCENE VALIDATION
// ============================================================================

/**
 * Validate a parsed scene against its project filesystem.
 * Checks resource paths, node types, parent references, and duplicate names.
 */
export async function validateScene(
  parsedScene: ParsedScene,
  projectPath: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Check all ext_resource paths resolve to files that exist on disk
  await validateExternalResources(parsedScene, projectPath, errors, warnings);

  // 2. Check node types are non-empty strings
  validateNodeTypes(parsedScene, errors);

  // 3. Check parent references form a valid tree
  validateNodeTree(parsedScene, errors);

  // 4. Check no duplicate node names at the same level
  validateNoDuplicateNames(parsedScene, errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}


/**
 * Validate that all external resource paths point to existing files.
 */
async function validateExternalResources(
  scene: ParsedScene,
  projectPath: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): Promise<void> {
  for (const extRes of scene.externalResources) {
    if (!extRes.path) {
      errors.push({
        code: 'MISSING_RESOURCE_PATH',
        message: `External resource id="${extRes.id}" type="${extRes.type}" has no path`,
      });
      continue;
    }

    if (!extRes.path.startsWith('res://')) {
      warnings.push({
        code: 'NON_RES_PATH',
        message: `External resource id="${extRes.id}" has non-res:// path: ${extRes.path}`,
      });
      continue;
    }

    try {
      const absolutePath = fromResPath(projectPath, extRes.path);
      await access(absolutePath);
    } catch {
      errors.push({
        code: 'RESOURCE_NOT_FOUND',
        message: `External resource id="${extRes.id}" path not found: ${extRes.path}`,
      });
    }
  }
}


/**
 * Validate that all nodes have non-empty type strings (where type is specified).
 */
function validateNodeTypes(scene: ParsedScene, errors: ValidationError[]): void {
  for (const node of scene.nodes) {
    // Nodes can omit type if they use instance (instanced scenes)
    if (node.type !== undefined) {
      if (typeof node.type !== 'string' || node.type.trim() === '') {
        errors.push({
          code: 'EMPTY_NODE_TYPE',
          message: `Node "${node.name}" has an empty or invalid type`,
        });
      }
    }

    if (!node.name || typeof node.name !== 'string' || node.name.trim() === '') {
      errors.push({
        code: 'EMPTY_NODE_NAME',
        message: `A node has an empty or missing name`,
      });
    }
  }
}


/**
 * Validate that parent references form a valid tree:
 * - Exactly one root node (no parent attribute)
 * - Every other node's parent reference resolves to an existing node
 */
function validateNodeTree(scene: ParsedScene, errors: ValidationError[]): void {
  if (scene.nodes.length === 0) return;

  // Build a set of known node paths
  // Root node is ".", child nodes reference parents using paths like ".", "ParentName", "ParentName/ChildName"
  const rootNodes = scene.nodes.filter(n => n.parent === undefined);

  if (rootNodes.length === 0) {
    errors.push({
      code: 'NO_ROOT_NODE',
      message: 'Scene has no root node (no node without a parent attribute)',
    });
    return;
  }

  if (rootNodes.length > 1) {
    errors.push({
      code: 'MULTIPLE_ROOT_NODES',
      message: `Scene has ${rootNodes.length} root nodes (expected exactly 1): ${rootNodes.map(n => n.name).join(', ')}`,
    });
  }

  // Build a map of node paths for parent validation
  // Root node has path = root name
  // Children with parent="." are direct children of root
  // Children with parent="ParentName" or parent="A/B" are deeper
  const rootName = rootNodes[0]?.name;
  const nodePaths = new Set<string>();

  // The root itself
  nodePaths.add('.');

  for (const node of scene.nodes) {
    if (node.parent === undefined) {
      // root node, path is implicitly "."
      continue;
    }

    // Build the full path for this node
    const fullPath = node.parent === '.'
      ? node.name
      : `${node.parent}/${node.name}`;
    nodePaths.add(fullPath);
  }

  // Now check each non-root node's parent exists
  for (const node of scene.nodes) {
    if (node.parent === undefined) continue;

    // Parent "." always exists (it's the root)
    if (node.parent === '.') continue;

    // Check if the parent path exists in our nodePaths
    if (!nodePaths.has(node.parent)) {
      errors.push({
        code: 'INVALID_PARENT',
        message: `Node "${node.name}" references parent "${node.parent}" which does not exist in the scene tree`,
      });
    }
  }
}


/**
 * Validate that no two nodes at the same level share a name.
 */
function validateNoDuplicateNames(scene: ParsedScene, errors: ValidationError[]): void {
  // Group nodes by their parent path
  const namesByParent = new Map<string, string[]>();

  for (const node of scene.nodes) {
    const parentKey = node.parent ?? '__ROOT__';
    if (!namesByParent.has(parentKey)) {
      namesByParent.set(parentKey, []);
    }
    namesByParent.get(parentKey)!.push(node.name);
  }

  // Check for duplicates within each group
  for (const [parentKey, names] of namesByParent) {
    const seen = new Set<string>();
    for (const name of names) {
      if (seen.has(name)) {
        const parentDesc = parentKey === '__ROOT__' ? 'root level' : `parent "${parentKey}"`;
        errors.push({
          code: 'DUPLICATE_NODE_NAME',
          message: `Duplicate node name "${name}" at ${parentDesc}`,
        });
      }
      seen.add(name);
    }
  }
}


// ============================================================================
// SCRIPT VALIDATION (Heuristic — ~80% coverage without Godot)
// ============================================================================

/**
 * Heuristic validation of GDScript content.
 * Checks extends class, signal syntax, export types, bracket balance, and indentation.
 */
export function validateScript(
  content: string,
  parsedScript: ParsedScript
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const lines = content.split(/\r?\n/);

  // 1. Check extends class is known
  validateExtendsClass(parsedScript, errors, warnings);

  // 2. Check signal parameter syntax
  validateSignals(parsedScript, content, errors, warnings);

  // 3. Check @export type annotations use valid Godot types
  validateExportTypes(parsedScript, errors, warnings);

  // 4. Check balanced brackets/parentheses
  validateBracketBalance(content, errors);

  // 5. Check indentation consistency (should be tabs in GDScript)
  validateIndentation(lines, errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}


/**
 * Check that the extends class is a known Godot base class or looks like a project class.
 */
function validateExtendsClass(
  script: ParsedScript,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!script.extends) {
    warnings.push({
      code: 'NO_EXTENDS',
      message: 'Script has no "extends" declaration. Will default to RefCounted.',
    });
    return;
  }

  const extendsClass = script.extends;

  // Known base class — valid
  if (KNOWN_BASE_CLASSES.has(extendsClass)) return;

  // Project class references (paths like "res://...") are valid
  if (extendsClass.startsWith('"res://') || extendsClass.startsWith('res://')) return;

  // PascalCase names that aren't in our list — could be project classes, warn
  if (/^[A-Z][a-zA-Z0-9_]*$/.test(extendsClass)) {
    warnings.push({
      code: 'UNKNOWN_BASE_CLASS',
      message: `Extends "${extendsClass}" — not in known Godot base class list. May be a project class (valid if defined).`,
    });
    return;
  }

  // Does not look like a valid class name
  errors.push({
    code: 'INVALID_EXTENDS',
    message: `Invalid extends value "${extendsClass}" — must be a class name or resource path`,
  });
}


/**
 * Validate signal parameter syntax.
 */
function validateSignals(
  script: ParsedScript,
  content: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const signal of script.signals) {
    // Signal name should be snake_case (convention)
    if (signal.name !== signal.name.toLowerCase()) {
      warnings.push({
        code: 'SIGNAL_NAMING',
        message: `Signal "${signal.name}" is not snake_case (Godot convention)`,
      });
    }

    // Check params for valid identifiers
    for (const param of signal.params) {
      if (!param.name || !/^\w+$/.test(param.name)) {
        errors.push({
          code: 'INVALID_SIGNAL_PARAM',
          message: `Signal "${signal.name}" has invalid parameter name: "${param.name}"`,
        });
      }

      // If param has a type, check it's valid
      if (param.type && !isValidGodotType(param.type)) {
        warnings.push({
          code: 'UNKNOWN_SIGNAL_PARAM_TYPE',
          message: `Signal "${signal.name}" parameter "${param.name}" has unknown type "${param.type}"`,
        });
      }
    }
  }
}


/**
 * Validate @export type annotations.
 */
function validateExportTypes(
  script: ParsedScript,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  for (const exp of script.exports) {
    if (!exp.type) {
      warnings.push({
        code: 'EXPORT_NO_TYPE',
        message: `@export var "${exp.name}" has no type annotation. Consider adding one for editor integration.`,
      });
      continue;
    }

    if (!isValidGodotType(exp.type)) {
      warnings.push({
        code: 'UNKNOWN_EXPORT_TYPE',
        message: `@export var "${exp.name}" has unknown type "${exp.type}". May be a project-defined class.`,
      });
    }
  }
}


/**
 * Check that all brackets, parentheses, and braces are balanced.
 */
function validateBracketBalance(content: string, errors: ValidationError[]): void {
  const stack: { char: string; line: number }[] = [];
  const lines = content.split(/\r?\n/);
  let inString = false;
  let stringChar = '';
  let inMultilineString = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Skip comment-only lines
    const trimmed = line.trimStart();
    if (trimmed.startsWith('#') && !inMultilineString && !inString) continue;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      // Handle triple-quoted strings (multiline)
      if (!inString && !inMultilineString && i + 2 < line.length) {
        const triple = line.slice(i, i + 3);
        if (triple === '"""' || triple === "'''") {
          inMultilineString = true;
          stringChar = triple[0];
          i += 2;
          continue;
        }
      }

      if (inMultilineString) {
        if (i + 2 < line.length && line.slice(i, i + 3) === stringChar.repeat(3)) {
          inMultilineString = false;
          i += 2;
        }
        continue;
      }

      // Handle single-line strings
      if (!inString) {
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
          continue;
        }
      } else {
        if (ch === '\\') {
          i++; // skip escaped char
          continue;
        }
        if (ch === stringChar) {
          inString = false;
        }
        continue;
      }

      // Handle inline comments
      if (ch === '#') break;

      // Track brackets
      if (ch === '(' || ch === '[' || ch === '{') {
        stack.push({ char: ch, line: lineIdx + 1 });
      } else if (ch === ')' || ch === ']' || ch === '}') {
        const expected = ch === ')' ? '(' : ch === ']' ? '[' : '{';
        if (stack.length === 0) {
          errors.push({
            line: lineIdx + 1,
            code: 'UNMATCHED_BRACKET',
            message: `Unmatched closing '${ch}' at line ${lineIdx + 1}`,
          });
        } else {
          const top = stack[stack.length - 1];
          if (top.char !== expected) {
            errors.push({
              line: lineIdx + 1,
              code: 'MISMATCHED_BRACKET',
              message: `Mismatched bracket: expected closing for '${top.char}' (opened at line ${top.line}) but found '${ch}' at line ${lineIdx + 1}`,
            });
            stack.pop();
          } else {
            stack.pop();
          }
        }
      }
    }
  }

  // Report unclosed brackets
  for (const unclosed of stack) {
    errors.push({
      line: unclosed.line,
      code: 'UNCLOSED_BRACKET',
      message: `Unclosed '${unclosed.char}' opened at line ${unclosed.line}`,
    });
  }
}


/**
 * Check indentation consistency.
 * GDScript convention is tabs. Warn about spaces, error about mixed.
 */
function validateIndentation(
  lines: string[],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  let tabCount = 0;
  let spaceCount = 0;
  let mixedLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // skip blank lines
    if (line.trim().startsWith('#')) continue; // skip comment-only lines

    const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
    if (leadingWhitespace.length === 0) continue; // no indentation

    const hasTabs = leadingWhitespace.includes('\t');
    const hasSpaces = leadingWhitespace.includes(' ');

    if (hasTabs && hasSpaces) {
      mixedLines.push(i + 1);
    } else if (hasTabs) {
      tabCount++;
    } else if (hasSpaces) {
      spaceCount++;
    }
  }

  if (mixedLines.length > 0) {
    errors.push({
      code: 'MIXED_INDENTATION',
      message: `Mixed tabs and spaces on ${mixedLines.length} line(s): ${mixedLines.slice(0, 5).join(', ')}${mixedLines.length > 5 ? '...' : ''}`,
    });
  }

  if (spaceCount > 0 && tabCount === 0) {
    warnings.push({
      code: 'SPACE_INDENTATION',
      message: `Script uses spaces for indentation (${spaceCount} lines). GDScript convention is tabs.`,
    });
  } else if (spaceCount > 0 && tabCount > 0 && mixedLines.length === 0) {
    // Some lines use tabs, some use spaces (but not mixed on same line)
    warnings.push({
      code: 'INCONSISTENT_INDENTATION',
      message: `Inconsistent indentation: ${tabCount} tab-indented lines, ${spaceCount} space-indented lines.`,
    });
  }
}


// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if a type string is a valid Godot type (or looks like one).
 */
function isValidGodotType(typeStr: string): boolean {
  const cleaned = typeStr.trim();

  // Direct match
  if (VALID_EXPORT_TYPES.has(cleaned)) return true;

  // Known base classes are also valid types
  if (KNOWN_BASE_CLASSES.has(cleaned)) return true;

  // Typed arrays: Array[Type]
  const arrayMatch = cleaned.match(/^Array\[(\w+)\]$/);
  if (arrayMatch) {
    return isValidGodotType(arrayMatch[1]);
  }

  // Enum references: looks like ClassName.EnumName
  if (/^\w+\.\w+$/.test(cleaned)) return true;

  // PascalCase — likely a custom class, accept with benefit of doubt
  if (/^[A-Z][a-zA-Z0-9_]*$/.test(cleaned)) return true;

  return false;
}
