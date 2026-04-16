// Godot Backend — Error Hierarchy

export class GodotError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GodotError';
  }
}

export class GodotParseError extends GodotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GODOT_PARSE_ERROR', details);
    this.name = 'GodotParseError';
  }
}

export class GodotFormatError extends GodotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GODOT_FORMAT_ERROR', details);
    this.name = 'GodotFormatError';
  }
}

export class GodotValidationError extends GodotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GODOT_VALIDATION_ERROR', details);
    this.name = 'GodotValidationError';
  }
}

export class GodotProjectNotFoundError extends GodotError {
  constructor(projectPath: string) {
    super(
      `Godot project not found at: ${projectPath} (no project.godot file)`,
      'GODOT_PROJECT_NOT_FOUND',
      { projectPath }
    );
    this.name = 'GodotProjectNotFoundError';
  }
}

export class GodotFileNotFoundError extends GodotError {
  constructor(filePath: string) {
    super(
      `File not found: ${filePath}`,
      'GODOT_FILE_NOT_FOUND',
      { filePath }
    );
    this.name = 'GodotFileNotFoundError';
  }
}

export class GodotFileExistsError extends GodotError {
  constructor(filePath: string) {
    super(
      `File already exists: ${filePath} (use overwrite: true to replace)`,
      'GODOT_FILE_EXISTS',
      { filePath }
    );
    this.name = 'GodotFileExistsError';
  }
}

export class GodotPathSecurityError extends GodotError {
  constructor(targetPath: string, projectRoot: string) {
    super(
      `Path escapes project root: ${targetPath} is outside ${projectRoot}`,
      'GODOT_PATH_SECURITY',
      { targetPath, projectRoot }
    );
    this.name = 'GodotPathSecurityError';
  }
}

export class GodotConnectionError extends GodotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GODOT_CONNECTION_ERROR', details);
    this.name = 'GodotConnectionError';
  }
}

export class GodotNotRunningError extends GodotError {
  constructor(message: string = 'Godot is not running. Runtime inspection requires a running Godot instance.') {
    super(message, 'GODOT_NOT_RUNNING');
    this.name = 'GodotNotRunningError';
  }
}

export class GodotProtocolError extends GodotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GODOT_PROTOCOL_ERROR', details);
    this.name = 'GodotProtocolError';
  }
}

export class GodotGenerationError extends GodotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GODOT_GENERATION_ERROR', details);
    this.name = 'GodotGenerationError';
  }
}

export class GodotCLIError extends GodotError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'GODOT_CLI_ERROR', details);
    this.name = 'GodotCLIError';
  }
}

export class GodotNotInstalledError extends GodotError {
  constructor() {
    super(
      'Godot executable not found. Set GODOT_EXECUTABLE_PATH or add godot to PATH.',
      'GODOT_NOT_INSTALLED'
    );
    this.name = 'GodotNotInstalledError';
  }
}
