// Godot Backend — File Utilities

import { readFile, writeFile, readdir, stat, access } from 'node:fs/promises';
import { join, resolve, relative, sep, posix } from 'node:path';
import { GodotPathSecurityError, GodotFileNotFoundError, GodotProjectNotFoundError, GodotFileExistsError } from './errors.js';
import { loadConfig } from './config.js';

/**
 * Resolve a res:// path to an absolute filesystem path
 */
export function fromResPath(projectPath: string, resPath: string): string {
  if (!resPath.startsWith('res://')) {
    throw new Error(`Invalid resource path: ${resPath} (must start with res://)`);
  }
  const relativePart = resPath.slice(6); // Remove 'res://'
  return join(projectPath, relativePart);
}

/**
 * Convert an absolute path to a res:// path
 */
export function toResPath(projectPath: string, absolutePath: string): string {
  const resolved = resolve(absolutePath);
  const resolvedRoot = resolve(projectPath);
  const rel = relative(resolvedRoot, resolved);
  if (rel.startsWith('..') || resolve(resolvedRoot, rel) !== resolved) {
    throw new GodotPathSecurityError(absolutePath, projectPath);
  }
  return 'res://' + rel.split(sep).join(posix.sep);
}

/**
 * Assert a target path is within the project root (path traversal prevention)
 */
export function assertWithinProject(projectPath: string, targetPath: string): void {
  const resolvedTarget = resolve(targetPath);
  const resolvedRoot = resolve(projectPath);
  if (!resolvedTarget.startsWith(resolvedRoot + sep) && resolvedTarget !== resolvedRoot) {
    throw new GodotPathSecurityError(targetPath, projectPath);
  }
}

/**
 * Safely read a file from the project directory
 */
export async function readProjectFile(projectPath: string, filePath: string): Promise<string> {
  const absolutePath = filePath.startsWith('res://')
    ? fromResPath(projectPath, filePath)
    : resolve(filePath);

  assertWithinProject(projectPath, absolutePath);

  try {
    await access(absolutePath);
  } catch {
    throw new GodotFileNotFoundError(filePath);
  }

  const config = loadConfig();
  const stats = await stat(absolutePath);
  const maxBytes = config.maxFileSizeMB * 1024 * 1024;
  if (stats.size > maxBytes) {
    throw new Error(`File exceeds size limit (${config.maxFileSizeMB}MB): ${filePath} is ${(stats.size / 1024 / 1024).toFixed(1)}MB`);
  }

  return readFile(absolutePath, 'utf-8');
}

/**
 * Safely write a file to the project directory
 */
export async function writeProjectFile(
  projectPath: string,
  filePath: string,
  content: string,
  overwrite: boolean = false
): Promise<{ path: string; bytesWritten: number; created: boolean }> {
  const absolutePath = filePath.startsWith('res://')
    ? fromResPath(projectPath, filePath)
    : resolve(filePath);

  assertWithinProject(projectPath, absolutePath);

  let created = true;
  try {
    await access(absolutePath);
    created = false;
    if (!overwrite) {
      throw new GodotFileExistsError(filePath);
    }
  } catch (err) {
    if (err instanceof GodotFileExistsError) throw err;
    // File doesn't exist — that's fine, we'll create it
  }

  await writeFile(absolutePath, content, 'utf-8');
  return { path: absolutePath, bytesWritten: Buffer.byteLength(content), created };
}

/**
 * Recursively list project files with optional filter
 */
export async function listProjectFiles(
  projectPath: string,
  filter: 'scenes' | 'scripts' | 'resources' | 'all' = 'all',
  maxDepth: number = 10
): Promise<string[]> {
  const results: string[] = [];
  const extensions: Record<string, string[]> = {
    scenes: ['.tscn'],
    scripts: ['.gd'],
    resources: ['.tres'],
    all: ['.tscn', '.tres', '.gd', '.gdshader', '.import'],
  };
  const allowedExts = extensions[filter] || extensions.all;

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    // Skip hidden dirs and common non-source dirs
    const dirName = dir.split(sep).pop() || '';
    if (dirName.startsWith('.') || dirName === 'addons' && depth > 1) return;

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (allowedExts.some(ext => entry.name.endsWith(ext))) {
        results.push(toResPath(projectPath, fullPath));
      }
    }
  }

  await walk(projectPath, 0);
  return results.sort();
}

/**
 * Check if a directory is a Godot project (has project.godot)
 */
export async function isGodotProject(dirPath: string): Promise<boolean> {
  try {
    await access(join(dirPath, 'project.godot'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a project path — use explicit path or fall back to config
 */
export async function resolveProjectPath(explicitPath?: string): Promise<string> {
  const config = loadConfig();
  const projectPath = explicitPath || config.projectPath;

  if (!projectPath) {
    throw new GodotProjectNotFoundError('(no project path provided — set GODOT_PROJECT_PATH or pass projectPath parameter)');
  }

  const resolved = resolve(projectPath);
  if (!(await isGodotProject(resolved))) {
    throw new GodotProjectNotFoundError(resolved);
  }

  return resolved;
}
