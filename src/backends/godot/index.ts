// Godot Backend — Main Entry Point
// Implements the mcp-launchpad Backend interface for Godot 4 game engine

import { Backend, BackendAction, HealthStatus } from '../../types.js';
import { parseTscn, parseTres, parseGDScript, parseProjectConfig } from './parser.js';
import { generateTscn, generateGDScript, generateBehaviorTree } from './generator.js';
import { validateScene, validateScript } from './validator.js';
import { analyzeConventions } from './conventions.js';
import {
  readProjectFile,
  writeProjectFile,
  listProjectFiles,
  resolveProjectPath,
  isGodotProject,
  fromResPath,
} from './utils.js';
import { loadConfig } from './config.js';
import { GodotConnection } from './connection.js';
import type {
  ScaffoldSceneSpec,
  ScaffoldNodeSpec,
  ScriptSpec,
  BTNodeSpec,
  GDSignalDef,
  GDExportDef,
  GDMethodSpec,
  ParsedScript,
} from './types.js';

// ============================================================================
// LAZY SINGLETON — GodotConnection
// ============================================================================

let _connection: GodotConnection | null = null;

function getConnection(): GodotConnection {
  if (!_connection) {
    _connection = new GodotConnection();
  }
  return _connection;
}

// ============================================================================
// ACTION DEFINITIONS
// ============================================================================

const actions: BackendAction[] = [
  {
    name: 'list_project',
    description: 'List files in a Godot project directory, optionally filtered by type (scenes, scripts, resources)',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'filter', type: 'string', required: false, description: 'Filter files by type', enum: ['scenes', 'scripts', 'resources', 'all'] },
      { name: 'maxDepth', type: 'number', required: false, description: 'Maximum directory depth to traverse (default: 10)' },
    ],
  },
  {
    name: 'read_project_config',
    description: 'Read and parse the project.godot configuration file',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
    ],
  },
  {
    name: 'parse_scene',
    description: 'Parse a .tscn or .tres file into a structured representation with nodes, resources, and connections',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'filePath', type: 'string', required: true, description: 'Path to the scene file (absolute or res://)' },
      { name: 'includeProperties', type: 'boolean', required: false, description: 'Include node properties in output (default: true)' },
    ],
  },
  {
    name: 'scaffold_scene',
    description: 'Generate a .tscn scene file from a specification (root type, children, scripts)',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'scenePath', type: 'string', required: true, description: 'Output path for the .tscn file (absolute or res://)' },
      { name: 'rootType', type: 'string', required: true, description: 'Godot class for the root node (e.g., Node2D, Control)' },
      { name: 'rootName', type: 'string', required: true, description: 'Name of the root node' },
      { name: 'children', type: 'object', required: false, description: 'Array of child node specs: { name, type, properties?, children?, script? }' },
      { name: 'script', type: 'string', required: false, description: 'res:// path to attach a script to the root node' },
      { name: 'overwrite', type: 'boolean', required: false, description: 'Overwrite existing file (default: false)' },
    ],
  },
  {
    name: 'read_script',
    description: 'Read and parse a GDScript (.gd) file, extracting class info, signals, exports, methods',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'filePath', type: 'string', required: true, description: 'Path to the .gd file (absolute or res://)' },
    ],
  },
  {
    name: 'write_script',
    description: 'Generate and write a GDScript (.gd) file from a specification',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'scriptPath', type: 'string', required: true, description: 'Output path for the .gd file (absolute or res://)' },
      { name: 'extends', type: 'string', required: true, description: 'Base class to extend (e.g., Node2D, CharacterBody2D)' },
      { name: 'className', type: 'string', required: false, description: 'Optional class_name declaration' },
      { name: 'signals', type: 'object', required: false, description: 'Array of signal definitions: { name, params?: [{ name, type? }] }' },
      { name: 'exports', type: 'object', required: false, description: 'Array of export definitions: { name, type?, defaultValue?, hint? }' },
      { name: 'methods', type: 'object', required: false, description: 'Array of method specs: { name, params?, returnType?, body?, isStatic? }' },
      { name: 'overwrite', type: 'boolean', required: false, description: 'Overwrite existing file (default: false)' },
    ],
  },
  {
    name: 'analyze_conventions',
    description: 'Analyze coding conventions used across GDScript files in a project',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'sampleSize', type: 'number', required: false, description: 'Maximum number of scripts to analyze (default: 20)' },
    ],
  },
  {
    name: 'validate_scene',
    description: 'Validate a .tscn scene file: check resource paths, node types, parent references, duplicate names',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'filePath', type: 'string', required: true, description: 'Path to the .tscn file (absolute or res://)' },
    ],
  },
  {
    name: 'validate_script',
    description: 'Heuristic validation of a GDScript file: extends class, signal syntax, export types, brackets, indentation',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'filePath', type: 'string', required: true, description: 'Path to the .gd file (absolute or res://)' },
    ],
  },
  {
    name: 'scaffold_behavior_tree',
    description: 'Generate a behavior tree resource (.tres) from a tree specification',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'treePath', type: 'string', required: true, description: 'Output path for the .tres file (absolute or res://)' },
      { name: 'tree', type: 'object', required: true, description: 'Behavior tree spec: { type, name?, properties?, children? }' },
      { name: 'overwrite', type: 'boolean', required: false, description: 'Overwrite existing file (default: false)' },
    ],
  },
  {
    name: 'inspect_runtime',
    description: 'Inspect a Godot scene tree by loading it headless and dumping the node hierarchy as JSON',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'scenePath', type: 'string', required: false, description: 'Scene to inspect (res:// path). If omitted, inspects the main scene from project.godot' },
      { name: 'timeoutMs', type: 'number', required: false, description: 'Timeout in milliseconds (default: 30000)' },
    ],
  },
  {
    name: 'run_project',
    description: 'Launch a Godot project (opens the game window or runs headless). Returns the PID for later stop.',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'scene', type: 'string', required: false, description: 'Specific scene to run (res:// path)' },
      { name: 'headless', type: 'boolean', required: false, description: 'Run in headless mode (no window)' },
      { name: 'additionalArgs', type: 'object', required: false, description: 'Array of additional CLI arguments to pass to Godot' },
    ],
  },
  {
    name: 'stop_project',
    description: 'Stop a previously launched Godot project instance',
    params: [],
  },
  {
    name: 'validate_with_godot',
    description: 'Validate a GDScript file using Godot\'s own parser (more accurate than heuristic validation)',
    params: [
      { name: 'projectPath', type: 'string', required: true, description: 'Absolute path to the Godot project root' },
      { name: 'scriptPath', type: 'string', required: true, description: 'Path to the .gd file (absolute or res://)' },
      { name: 'timeoutMs', type: 'number', required: false, description: 'Timeout in milliseconds (default: 30000)' },
    ],
  },
];


// ============================================================================
// EXECUTE
// ============================================================================

async function execute(
  action: string,
  params: Record<string, unknown>
): Promise<unknown> {
  switch (action) {
    // -----------------------------------------------------------------------
    // list_project
    // -----------------------------------------------------------------------
    case 'list_project': {
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const filter = (params.filter as 'scenes' | 'scripts' | 'resources' | 'all') || 'all';
      const maxDepth = params.maxDepth !== undefined ? Number(params.maxDepth) : undefined;
      const files = await listProjectFiles(projectPath, filter, maxDepth);
      return { projectPath, filter, files, count: files.length };
    }

    // -----------------------------------------------------------------------
    // read_project_config
    // -----------------------------------------------------------------------
    case 'read_project_config': {
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const content = await readProjectFile(projectPath, fromResPath(projectPath, 'res://project.godot'));
      const config = parseProjectConfig(content);
      return config;
    }

    // -----------------------------------------------------------------------
    // parse_scene
    // -----------------------------------------------------------------------
    case 'parse_scene': {
      if (!params.filePath) throw new Error('filePath is required for parse_scene');
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const content = await readProjectFile(projectPath, params.filePath as string);
      const filePath = params.filePath as string;
      const parsed = filePath.endsWith('.tres') ? parseTres(content) : parseTscn(content);

      // Optionally strip properties for a lighter response
      if (params.includeProperties === false) {
        for (const node of parsed.nodes) {
          node.properties = {};
        }
        for (const sub of parsed.subResources) {
          sub.properties = {};
        }
      }

      return parsed;
    }

    // -----------------------------------------------------------------------
    // scaffold_scene
    // -----------------------------------------------------------------------
    case 'scaffold_scene': {
      if (!params.scenePath) throw new Error('scenePath is required for scaffold_scene');
      if (!params.rootType) throw new Error('rootType is required for scaffold_scene');
      if (!params.rootName) throw new Error('rootName is required for scaffold_scene');

      const projectPath = await resolveProjectPath(params.projectPath as string);
      const spec: ScaffoldSceneSpec = {
        rootType: params.rootType as string,
        rootName: params.rootName as string,
        children: params.children as ScaffoldNodeSpec[] | undefined,
        script: params.script as string | undefined,
      };

      const tscnContent = generateTscn(spec);
      const result = await writeProjectFile(
        projectPath,
        params.scenePath as string,
        tscnContent,
        params.overwrite === true
      );
      return result;
    }

    // -----------------------------------------------------------------------
    // read_script
    // -----------------------------------------------------------------------
    case 'read_script': {
      if (!params.filePath) throw new Error('filePath is required for read_script');
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const content = await readProjectFile(projectPath, params.filePath as string);
      const parsed = parseGDScript(content);
      return parsed;
    }

    // -----------------------------------------------------------------------
    // write_script
    // -----------------------------------------------------------------------
    case 'write_script': {
      if (!params.scriptPath) throw new Error('scriptPath is required for write_script');
      if (!params.extends) throw new Error('extends is required for write_script');

      const projectPath = await resolveProjectPath(params.projectPath as string);
      const spec: ScriptSpec = {
        extends: params.extends as string,
        className: params.className as string | undefined,
        signals: params.signals as GDSignalDef[] | undefined,
        exports: params.exports as GDExportDef[] | undefined,
        methods: params.methods as GDMethodSpec[] | undefined,
      };

      const scriptContent = generateGDScript(spec);
      const result = await writeProjectFile(
        projectPath,
        params.scriptPath as string,
        scriptContent,
        params.overwrite === true
      );
      return result;
    }

    // -----------------------------------------------------------------------
    // analyze_conventions
    // -----------------------------------------------------------------------
    case 'analyze_conventions': {
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const sampleSize = params.sampleSize !== undefined ? Number(params.sampleSize) : 20;
      const scriptFiles = await listProjectFiles(projectPath, 'scripts');
      const filesToAnalyze = scriptFiles.slice(0, sampleSize);

      const parsedScripts: ParsedScript[] = [];
      for (const file of filesToAnalyze) {
        const content = await readProjectFile(projectPath, file);
        parsedScripts.push(parseGDScript(content));
      }

      const conventions = analyzeConventions(parsedScripts);
      return {
        projectPath,
        scriptsAnalyzed: filesToAnalyze.length,
        totalScripts: scriptFiles.length,
        conventions,
      };
    }

    // -----------------------------------------------------------------------
    // validate_scene
    // -----------------------------------------------------------------------
    case 'validate_scene': {
      if (!params.filePath) throw new Error('filePath is required for validate_scene');
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const content = await readProjectFile(projectPath, params.filePath as string);
      const filePath = params.filePath as string;
      const parsed = filePath.endsWith('.tres') ? parseTres(content) : parseTscn(content);
      const result = await validateScene(parsed, projectPath);
      return result;
    }

    // -----------------------------------------------------------------------
    // validate_script
    // -----------------------------------------------------------------------
    case 'validate_script': {
      if (!params.filePath) throw new Error('filePath is required for validate_script');
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const content = await readProjectFile(projectPath, params.filePath as string);
      const parsed = parseGDScript(content);
      const result = validateScript(content, parsed);
      return result;
    }

    // -----------------------------------------------------------------------
    // scaffold_behavior_tree
    // -----------------------------------------------------------------------
    case 'scaffold_behavior_tree': {
      if (!params.treePath) throw new Error('treePath is required for scaffold_behavior_tree');
      if (!params.tree) throw new Error('tree is required for scaffold_behavior_tree');

      const projectPath = await resolveProjectPath(params.projectPath as string);
      const treeSpec = params.tree as BTNodeSpec;
      const tresContent = generateBehaviorTree(treeSpec);
      const result = await writeProjectFile(
        projectPath,
        params.treePath as string,
        tresContent,
        params.overwrite === true
      );
      return result;
    }

    // -----------------------------------------------------------------------
    // Runtime actions (Phase 3 — real Godot CLI integration)
    // -----------------------------------------------------------------------
    case 'inspect_runtime': {
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const scenePath = params.scenePath as string | undefined;
      const timeoutMs = params.timeoutMs !== undefined ? Number(params.timeoutMs) : undefined;
      const conn = getConnection();
      const tree = await conn.inspectSceneTree(projectPath, scenePath, timeoutMs);
      return { projectPath, scenePath: scenePath || '(main scene)', tree };
    }

    case 'run_project': {
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const conn = getConnection();
      const result = await conn.runProject(projectPath, {
        scene: params.scene as string | undefined,
        headless: params.headless === true,
        additionalArgs: params.additionalArgs as string[] | undefined,
      });
      return {
        projectPath,
        pid: result.pid,
        command: result.command,
        args: result.args,
        initialOutput: result.initialOutput,
        status: 'running',
      };
    }

    case 'stop_project': {
      const conn = getConnection();
      const wasRunning = conn.isConnected;
      await conn.stopProject();
      return { stopped: wasRunning, status: 'stopped' };
    }

    case 'validate_with_godot': {
      if (!params.scriptPath) throw new Error('scriptPath is required for validate_with_godot');
      const projectPath = await resolveProjectPath(params.projectPath as string);
      const scriptPath = params.scriptPath as string;
      const timeoutMs = params.timeoutMs !== undefined ? Number(params.timeoutMs) : undefined;
      const conn = getConnection();

      // Resolve res:// paths to absolute for the connection
      const resolvedScript = scriptPath.startsWith('res://')
        ? fromResPath(projectPath, scriptPath)
        : scriptPath;

      const result = await conn.validateWithGodot(projectPath, resolvedScript, timeoutMs);
      return { scriptPath, ...result };
    }

    default:
      throw new Error(`Unknown godot action: ${action}`);
  }
}


// ============================================================================
// HEALTH CHECK
// ============================================================================

async function healthCheck(): Promise<HealthStatus> {
  const config = loadConfig();

  if (!config.projectPath) {
    // No project configured — filesystem mode still works with explicit paths
    return { status: 'healthy', latency_ms: 0 };
  }

  try {
    const start = Date.now();
    const isProject = await isGodotProject(config.projectPath);
    const latency = Date.now() - start;

    if (isProject) {
      return { status: 'healthy', latency_ms: latency };
    }

    return {
      status: 'degraded',
      latency_ms: latency,
      error: `GODOT_PROJECT_PATH is set but ${config.projectPath} is not a valid Godot project`,
    };
  } catch (err) {
    return {
      status: 'degraded',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}


// ============================================================================
// BACKEND EXPORT
// ============================================================================

export const godotBackend: Backend = {
  name: 'godot',
  description:
    'Godot 4 game engine: parse scenes, generate scripts, scaffold projects, validate files, launch projects, inspect scene trees',
  actions,
  execute,
  healthCheck,
};
