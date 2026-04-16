# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-04-16

### Phase 3: Runtime Inspection

#### Added
- `run_project` action — launch Godot project via CLI, returns PID, supports headless/scene selection
- `stop_project` action — graceful shutdown of running Godot instance (SIGTERM + SIGKILL fallback)
- `inspect_runtime` action — scene tree inspection via headless GDScript (writes temp inspector script, runs Godot, parses JSON output, always cleans up)
- `validate_with_godot` action — real GDScript validation using Godot's own parser (--check-only flag)
- `GodotConnection` class (319 lines) — full Godot CLI integration replacing the Phase 1 stub
- Executable discovery: checks GODOT_EXECUTABLE_PATH env var, then config, then PATH
- Depth-capped recursive tree walker (20 levels) for scene inspection
- Timeout protection on all subprocess calls (30s default)
- Auto-detection of main scene from project.godot for inspect_runtime

#### Changed
- `connection.ts` — complete rewrite from 29-line stub to 319-line production implementation
- `index.ts` — Phase 3 stub actions replaced with real implementations, lazy GodotConnection singleton
- `types.ts` — added timeout overrides for 4 new runtime actions

---

## [0.2.0] - 2026-04-16

### Phase 2: Knowledge + Agent

#### Added
- `/godot-ai` skill — LimboAI behavior tree and state machine design
  - Complete reference for all 45+ LimboAI task classes (composites, decorators, actions, conditions)
  - Blackboard system documentation (get/set, BBParam types, scoping, inter-agent sharing)
  - HSM (Hierarchical State Machine) integration patterns
  - BT + HSM hybrid architecture via BTState
  - Custom task authoring guide with GDScript examples
  - 6 common AI patterns (melee, ranged, patrol, skirmisher, boss phases, resource gatherer)
- Godot specialist agent (`agents/godot-specialist.md`)
  - All 14 Godot 4.6 hard rules from production experience
  - Full MCP backend action reference with example calls
  - Scene architecture guide (root node selection, composition, folder layout)
  - GDScript conventions and validation checklist
  - LimboAI BT design patterns
- Godot 4 knowledge reference (`knowledge/godot4-reference.md`, 1,956 lines)
  - Node class hierarchy (Node2D, Node3D, Control, all major subclasses)
  - GDScript 4 syntax reference (@export variants, signals, enums, await, match)
  - Scene tree patterns (composition, autoloads, groups, packed scenes)
  - 12 production gotchas with fixes
  - Physics, UI, resources, input, animation, audio, shaders, debugging, networking
  - Lifecycle method call order table

---

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
