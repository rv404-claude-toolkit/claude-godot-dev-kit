---
name: godot-scene
description: Inspect, parse, validate, and analyze existing Godot scenes, scripts, and project structure.
trigger: When user wants to examine existing Godot content — parse scenes, validate files, list project structure, or analyze conventions.
also_trigger_on: "godot scene", "parse scene", "read scene", "show scene", "scene tree", "validate scene", "validate script", "godot validate", "list project", "godot project", "conventions", "godot analyze", "godot inspect"
---

# Godot Scene — Inspector & Validator

## What This Skill Does

Reads and analyzes existing Godot 4 project files via the godot backend in mcp-launchpad:
- **Parse scenes** — show .tscn node hierarchy as readable tree
- **Parse scripts** — extract GDScript metadata (signals, exports, methods)
- **List project** — show full project file tree
- **Validate** — check scenes and scripts for errors
- **Analyze conventions** — detect project coding patterns

## How to Use

### Detect Intent
From the user's message, determine what they want:
- "Show me the scene tree" / "Parse this scene" → `parse_scene`
- "What's in this script?" / "Show methods" → `read_script`
- "List all scenes" / "Show project structure" → `list_project`
- "Check for errors" / "Validate" → `validate_scene` or `validate_script`
- "What conventions does this project use?" → `analyze_conventions`
- "Show project config" → `read_project_config`

### Parse a Scene
```
route_request(service="godot", action="parse_scene", params={
  projectPath: "<path>",
  filePath: "res://scenes/v3/GameBoardV3.tscn"
})
```

Format the output as an indented tree:
```
GameBoardV3 (Node3D) [script: res://scenes/v3/GameBoardV3.gd]
  Camera (Camera3D)
    properties: fov=75, near=0.1, far=1000
  Light (DirectionalLight3D)
  Board (Node3D)
    HexGrid (Node3D)
    Units (Node3D)
```

### Read a Script
```
route_request(service="godot", action="read_script", params={
  projectPath: "<path>",
  filePath: "res://src/systems/game_mode_manager.gd"
})
```

Format as a summary:
```
game_mode_manager.gd
  extends: Node
  enums: GameMode (SKIRMISH, SANDBOX), MapSize (SMALL, MEDIUM, LARGE)
  vars: current_mode, config
  methods: _ready(), set_mode(), set_config_value(), get_config(), is_sandbox()
```

### List Project Files
```
route_request(service="godot", action="list_project", params={
  projectPath: "<path>",
  filter: "scenes"  // or "scripts", "resources", "all"
})
```

### Validate
```
route_request(service="godot", action="validate_scene", params={
  projectPath: "<path>",
  filePath: "res://scenes/v3/GameBoardV3.tscn"
})
```

Format validation results:
```
Validation: GameBoardV3.tscn
  Status: PASS (2 warnings)
  Errors: none
  Warnings:
    - ext_resource path not verified
    - unused signal connection
```

### Project Config
```
route_request(service="godot", action="read_project_config", params={
  projectPath: "<path>"
})
```

Show: project name, Godot version, main scene, autoloads, display settings.

### Error Handling
- If project not found: suggest setting GODOT_PROJECT_PATH or provide path
- If file not found: list available files with `list_project` and suggest alternatives
- If parse error: show the error with line number and context
