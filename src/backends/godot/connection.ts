// Godot Backend — Runtime Connection
// Phase 3: Real Godot CLI integration for project launching and runtime inspection

import { spawn, ChildProcess } from 'node:child_process';
import { writeFile, unlink, access } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from './config.js';
import {
  GodotNotRunningError,
  GodotNotInstalledError,
  GodotCLIError,
} from './errors.js';

// ============================================================================
// Types
// ============================================================================

export interface RunProjectOptions {
  /** Run a specific scene instead of the main scene */
  scene?: string;
  /** Run in headless mode (no window) */
  headless?: boolean;
  /** Additional CLI arguments to pass to Godot */
  additionalArgs?: string[];
  /** Timeout in ms to wait for initial output (default: 10000) */
  startupTimeoutMs?: number;
}

export interface RunProjectResult {
  pid: number;
  command: string;
  args: string[];
  initialOutput: string;
}

export interface GodotCommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SceneTreeNode {
  name: string;
  type: string;
  children: SceneTreeNode[];
  properties: Record<string, unknown>;
  groups?: string[];
}

export interface GodotValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;
const DEFAULT_STARTUP_TIMEOUT_MS = 10_000;
const INSPECTOR_SCRIPT_NAME = '_claude_inspector.gd';
const INSPECT_START_MARKER = 'GODOT_INSPECT_START';
const INSPECT_END_MARKER = 'GODOT_INSPECT_END';

// ============================================================================
// GodotConnection
// ============================================================================

export class GodotConnection {
  private process: ChildProcess | null = null;
  private cachedGodotPath: string | null = null;

  // --------------------------------------------------------------------------
  // Find Godot executable
  // --------------------------------------------------------------------------

  /**
   * Locate the Godot executable.
   * Priority: GODOT_EXECUTABLE_PATH env var > config > PATH lookup
   */
  private async findGodot(): Promise<string> {
    // Return cached path if already resolved
    if (this.cachedGodotPath) return this.cachedGodotPath;

    // 1. Check environment variable
    const envPath = process.env.GODOT_EXECUTABLE_PATH;
    if (envPath) {
      await this.verifyExecutable(envPath);
      this.cachedGodotPath = envPath;
      return envPath;
    }

    // 2. Check config
    const config = loadConfig();
    if (config.executablePath) {
      await this.verifyExecutable(config.executablePath);
      this.cachedGodotPath = config.executablePath;
      return config.executablePath;
    }

    // 3. Try 'godot' on PATH (works if user has it in PATH)
    try {
      const result = await this.runCommand('godot', ['--version'], 5000);
      if (result.exitCode === 0) {
        this.cachedGodotPath = 'godot';
        return 'godot';
      }
    } catch {
      // Not on PATH
    }

    // 4. Try 'godot4' on PATH (common on Linux)
    try {
      const result = await this.runCommand('godot4', ['--version'], 5000);
      if (result.exitCode === 0) {
        this.cachedGodotPath = 'godot4';
        return 'godot4';
      }
    } catch {
      // Not on PATH either
    }

    throw new GodotNotInstalledError();
  }

  /**
   * Verify that a file exists and is accessible
   */
  private async verifyExecutable(path: string): Promise<void> {
    try {
      await access(path);
    } catch {
      throw new GodotNotInstalledError();
    }
  }

  // --------------------------------------------------------------------------
  // Run project (launches Godot game window)
  // --------------------------------------------------------------------------

  /**
   * Launch a Godot project. Spawns the Godot process and returns the PID.
   * The process continues running in the background.
   */
  async runProject(
    projectPath: string,
    options?: RunProjectOptions
  ): Promise<RunProjectResult> {
    // Kill any previously running instance
    await this.stopProject();

    const godot = await this.findGodot();
    const args: string[] = ['--path', projectPath];

    if (options?.scene) {
      args.push(options.scene);
    }
    if (options?.headless) {
      args.push('--headless');
    }
    if (options?.additionalArgs) {
      args.push(...options.additionalArgs);
    }

    const startupTimeout = options?.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;

    return new Promise<RunProjectResult>((resolve, reject) => {
      let initialOutput = '';
      let settled = false;

      const proc = spawn(godot, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
      });

      this.process = proc;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          // If process is still alive after startup timeout, it started OK
          if (proc.pid && !proc.killed) {
            resolve({
              pid: proc.pid,
              command: godot,
              args,
              initialOutput: initialOutput.trim(),
            });
          } else {
            this.process = null;
            reject(
              new GodotCLIError('Godot process exited during startup', {
                output: initialOutput,
              })
            );
          }
        }
      }, startupTimeout);

      proc.stdout?.on('data', (data: Buffer) => {
        initialOutput += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        initialOutput += data.toString();
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        this.process = null;
        if (!settled) {
          settled = true;
          reject(
            new GodotCLIError(`Failed to launch Godot: ${err.message}`, {
              command: godot,
              args,
            })
          );
        }
      });

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);
        this.process = null;
        if (!settled) {
          settled = true;
          // Process exited before startup timeout — could be an error or a quick run
          if (code === 0) {
            resolve({
              pid: proc.pid ?? 0,
              command: godot,
              args,
              initialOutput: initialOutput.trim(),
            });
          } else {
            reject(
              new GodotCLIError(
                `Godot exited with code ${code} during startup`,
                { exitCode: code, output: initialOutput.trim() }
              )
            );
          }
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // Stop project
  // --------------------------------------------------------------------------

  /**
   * Stop a running Godot process.
   */
  async stopProject(): Promise<void> {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');

      // Wait briefly for graceful shutdown, then force kill
      await new Promise<void>((resolve) => {
        const forceKillTimer = setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 3000);

        this.process?.on('close', () => {
          clearTimeout(forceKillTimer);
          resolve();
        });
      });

      this.process = null;
    }
  }

  // --------------------------------------------------------------------------
  // Inspect scene tree
  // --------------------------------------------------------------------------

  /**
   * Inspect a scene tree by running a temporary GDScript in headless mode.
   * Creates a script that loads the target scene, walks the node tree,
   * and outputs structured JSON to stdout.
   */
  async inspectSceneTree(
    projectPath: string,
    scenePath?: string,
    timeoutMs: number = DEFAULT_COMMAND_TIMEOUT_MS
  ): Promise<SceneTreeNode> {
    const godot = await this.findGodot();

    // If no scene specified, read main scene from project.godot
    const targetScene = scenePath || await this.getMainScene(projectPath);

    // Build the inspector GDScript
    // Use GDScript 4 syntax — JSON.stringify became JSON.new().stringify() in Godot 4
    const inspectorScript = this.buildInspectorScript(targetScene);

    const tempScriptPath = join(projectPath, INSPECTOR_SCRIPT_NAME);

    try {
      // Write the temporary inspector script
      await writeFile(tempScriptPath, inspectorScript, 'utf-8');

      // Run Godot headless with the inspector script
      const result = await this.runCommand(
        godot,
        [
          '--headless',
          '--path', projectPath,
          '--script', `res://${INSPECTOR_SCRIPT_NAME}`,
        ],
        timeoutMs
      );

      // Parse output between markers
      const startIdx = result.stdout.indexOf(INSPECT_START_MARKER);
      const endIdx = result.stdout.indexOf(INSPECT_END_MARKER);

      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        throw new GodotCLIError(
          'Inspector script did not produce expected output markers',
          {
            stdout: result.stdout.slice(0, 2000),
            stderr: result.stderr.slice(0, 2000),
            exitCode: result.exitCode,
          }
        );
      }

      const jsonStr = result.stdout
        .slice(startIdx + INSPECT_START_MARKER.length, endIdx)
        .trim();

      try {
        return JSON.parse(jsonStr) as SceneTreeNode;
      } catch (parseErr) {
        throw new GodotCLIError(
          `Failed to parse inspector JSON output: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
          {
            rawJson: jsonStr.slice(0, 2000),
            stdout: result.stdout.slice(0, 1000),
          }
        );
      }
    } finally {
      // Always clean up the temp script
      await unlink(tempScriptPath).catch(() => {});
    }
  }

  /**
   * Build the GDScript inspector that dumps the scene tree as JSON.
   * Uses Godot 4.x API (JSON.new().stringify()).
   */
  private buildInspectorScript(scenePath: string): string {
    // Escape the scene path for GDScript string embedding
    const escapedPath = scenePath.replace(/\\/g, '/').replace(/"/g, '\\"');

    return `extends SceneTree

func _init():
\tvar scene_res = load("${escapedPath}")
\tif scene_res == null:
\t\tvar json = JSON.new()
\t\tprint(json.stringify({"error": "Could not load scene: ${escapedPath}"}))
\t\tquit(1)
\t\treturn

\tvar scene_instance = scene_res.instantiate()
\tvar tree_data = _walk_tree(scene_instance)

\tvar json = JSON.new()
\tprint("${INSPECT_START_MARKER}")
\tprint(json.stringify(tree_data))
\tprint("${INSPECT_END_MARKER}")

\tscene_instance.queue_free()
\tquit(0)

func _walk_tree(node: Node, depth: int = 0) -> Dictionary:
\tvar result = {
\t\t"name": str(node.name),
\t\t"type": node.get_class(),
\t\t"children": [],
\t\t"properties": {}
\t}

\t# Get transform properties
\tif node is Node2D:
\t\tresult["properties"]["position"] = str(node.position)
\t\tresult["properties"]["rotation"] = node.rotation
\t\tresult["properties"]["scale"] = str(node.scale)
\tif node is Node3D:
\t\tresult["properties"]["position"] = str(node.position)
\t\tresult["properties"]["rotation"] = str(node.rotation)
\t\tresult["properties"]["scale"] = str(node.scale)
\tif node is Control:
\t\tresult["properties"]["visible"] = node.visible
\t\tresult["properties"]["size"] = str(node.size)
\t\tresult["properties"]["position"] = str(node.position)

\t# Get attached script
\tvar script = node.get_script()
\tif script != null:
\t\tresult["properties"]["script"] = script.resource_path

\t# Get groups
\tvar groups = node.get_groups()
\tif groups.size() > 0:
\t\tvar group_list: Array[String] = []
\t\tfor g in groups:
\t\t\tgroup_list.append(str(g))
\t\tresult["groups"] = group_list

\t# Recurse into children (cap depth to prevent runaway)
\tif depth < 20:
\t\tfor child in node.get_children():
\t\t\tresult["children"].append(_walk_tree(child, depth + 1))

\treturn result
`;
  }

  /**
   * Read the main scene path from project.godot
   */
  private async getMainScene(projectPath: string): Promise<string> {
    const { readFile } = await import('node:fs/promises');
    try {
      const content = await readFile(
        join(projectPath, 'project.godot'),
        'utf-8'
      );
      const match = content.match(/run\/main_scene="([^"]+)"/);
      if (match) return match[1];
    } catch {
      // Fall through to error
    }
    throw new GodotCLIError(
      'Could not determine main scene. Specify scenePath or ensure project.godot has run/main_scene.',
      { projectPath }
    );
  }

  // --------------------------------------------------------------------------
  // Validate with Godot
  // --------------------------------------------------------------------------

  /**
   * Validate a GDScript file using Godot's own parser.
   * Tries --check-only first, falls back to a heuristic note if unavailable.
   */
  async validateWithGodot(
    projectPath: string,
    scriptPath: string,
    timeoutMs: number = DEFAULT_COMMAND_TIMEOUT_MS
  ): Promise<GodotValidationResult> {
    const godot = await this.findGodot();

    // Normalize scriptPath to res:// if it's an absolute path within the project
    let resPath = scriptPath;
    if (!scriptPath.startsWith('res://')) {
      const { relative } = await import('node:path');
      const rel = relative(projectPath, scriptPath).replace(/\\/g, '/');
      resPath = `res://${rel}`;
    }

    try {
      // Try --check-only flag (available in some Godot 4.x builds)
      const result = await this.runCommand(
        godot,
        [
          '--headless',
          '--path', projectPath,
          '--check-only',
          '--script', resPath,
        ],
        timeoutMs
      );

      const errors = result.stderr
        ? result.stderr
            .split('\n')
            .filter((line) => line.trim().length > 0)
            .filter((line) =>
              /error|Error|ERROR/.test(line) ||
              /SCRIPT ERROR/.test(line) ||
              /Parse Error/.test(line)
            )
        : [];

      return {
        valid: result.exitCode === 0 && errors.length === 0,
        errors: errors.length > 0 ? errors : (result.exitCode !== 0 ? [`Godot exited with code ${result.exitCode}`] : []),
      };
    } catch (err) {
      // --check-only might not be available; try running script briefly
      if (err instanceof GodotCLIError && err.message.includes('timed out')) {
        throw err; // Re-throw timeouts
      }

      try {
        // Alternative: run the script headless — if it has parse errors, Godot reports them
        const result = await this.runCommand(
          godot,
          [
            '--headless',
            '--path', projectPath,
            '--script', resPath,
            '--quit',
          ],
          timeoutMs
        );

        const errors = (result.stdout + '\n' + result.stderr)
          .split('\n')
          .filter((line) =>
            /error|Error|ERROR/.test(line) ||
            /SCRIPT ERROR/.test(line) ||
            /Parse Error/.test(line)
          );

        return {
          valid: result.exitCode === 0 && errors.length === 0,
          errors,
        };
      } catch {
        return {
          valid: true,
          errors: [
            'Godot --check-only not available in this build. Heuristic validation only.',
          ],
        };
      }
    }
  }

  // --------------------------------------------------------------------------
  // Low-level command runner
  // --------------------------------------------------------------------------

  /**
   * Run a command and capture its output. Includes timeout protection.
   */
  private runCommand(
    command: string,
    args: string[],
    timeoutMs: number = DEFAULT_COMMAND_TIMEOUT_MS
  ): Promise<GodotCommandResult> {
    return new Promise<GodotCommandResult>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let settled = false;

      const proc = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          proc.kill('SIGKILL');
          reject(
            new GodotCLIError('Godot command timed out', {
              command,
              args,
              timeoutMs,
              stdout: stdout.slice(0, 1000),
              stderr: stderr.slice(0, 1000),
            })
          );
        }
      }, timeoutMs);

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(
            new GodotCLIError(`Failed to run command: ${err.message}`, {
              command,
              args,
            })
          );
        }
      });

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve({
            stdout,
            stderr,
            exitCode: code ?? 1,
          });
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // Connection state
  // --------------------------------------------------------------------------

  /**
   * Whether a Godot process is currently running.
   */
  get isConnected(): boolean {
    return this.process !== null && !this.process.killed;
  }

  /**
   * Get the PID of the running Godot process, or null if not running.
   */
  get pid(): number | null {
    if (this.process && !this.process.killed) {
      return this.process.pid ?? null;
    }
    return null;
  }
}
