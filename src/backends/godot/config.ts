// Godot Backend — Configuration

import { GodotBackendConfig } from './types.js';

export function loadConfig(): GodotBackendConfig {
  return {
    projectPath: process.env.GODOT_PROJECT_PATH || undefined,
    executablePath: process.env.GODOT_EXECUTABLE_PATH || undefined,
    debugHost: process.env.GODOT_DEBUG_HOST || 'localhost',
    debugPort: parseInt(process.env.GODOT_DEBUG_PORT || '6007', 10),
    maxFileSizeMB: parseFloat(process.env.GODOT_MAX_FILE_SIZE_MB || '10'),
    parserTimeoutMs: parseInt(process.env.GODOT_PARSER_TIMEOUT_MS || '5000', 10),
  };
}
