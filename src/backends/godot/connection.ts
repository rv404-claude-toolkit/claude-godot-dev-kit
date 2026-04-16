// Godot Backend — Runtime Connection Stub
// Phase 1: All runtime methods throw GodotNotRunningError
// Phase 3 will implement DAP/debugger protocol for live scene inspection

import { GodotNotRunningError } from './errors.js';

export class GodotConnection {
  async connect(): Promise<void> {
    throw new GodotNotRunningError(
      'Runtime connection not implemented. Coming in Phase 3.'
    );
  }

  async disconnect(): Promise<void> {
    // No-op in stub
  }

  async inspectSceneTree(): Promise<never> {
    throw new GodotNotRunningError();
  }

  async runProject(): Promise<never> {
    throw new GodotNotRunningError();
  }

  get isConnected(): boolean {
    return false;
  }
}
