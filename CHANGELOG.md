# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-04-16

### Phase 1: Filesystem Mode

#### Added
- Godot MCP backend with 12 actions (10 active, 2 Phase 3 stubs)
- `.tscn` and `.tres` scene/resource parser with full value type support
- `.gd` GDScript metadata extractor (signals, exports, methods, enums)
- `project.godot` config parser (autoloads, features, display settings)
- Scene scaffolding generator with proper node hierarchy and parent paths
- GDScript generator with tab indentation and Godot conventions
- LimboAI behavior tree `.tres` generator
- Scene validator (resource paths, node tree integrity, duplicate detection)
- GDScript validator (heuristic, 80% coverage without Godot installed)
- Project convention analyzer (naming patterns, common base classes)
- Path security: all file access sandboxed to project directory
- 13-class error hierarchy with router-compatible classification
- `/godot-build` skill — scaffold scenes, generate scripts, create behavior trees
- `/godot-scene` skill — parse, inspect, validate, analyze existing content
- Integration tested against real Godot 4.6 project (83 files parsed, 19/19 tests pass)
