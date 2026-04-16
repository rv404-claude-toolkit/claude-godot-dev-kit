---
name: godot-build
description: Scaffold new Godot scenes, generate GDScript files, and create LimboAI behavior trees for game projects.
trigger: When user wants to create new Godot content — scenes, scripts, or behavior trees.
also_trigger_on: "godot build", "new scene", "scaffold scene", "generate script", "new script", "behavior tree", "new BT", "scaffold", "godot scaffold", "godot generate"
---

# Godot Build — Scene & Script Generator

## What This Skill Does

Creates new Godot 4 content by calling the godot backend in mcp-launchpad:
- **Scenes** — scaffold .tscn files with proper node hierarchy
- **Scripts** — generate .gd files with signals, exports, methods
- **Behavior Trees** — create LimboAI .tres behavior tree files

## How to Use

### Detect Intent
From the user's message, determine what they want to create:
- Scene → use `scaffold_scene` action
- Script → use `write_script` action
- Behavior tree → use `scaffold_behavior_tree` action
- If unclear, ask

### Required Context
Before generating, determine:
1. **Project path** — Where is their Godot project? Check for GODOT_PROJECT_PATH env var, or ask.
2. **File path** — Where should the new file go? Use res:// format (e.g., `res://scenes/new_scene.tscn`)
3. **Content spec** — What nodes/methods/signals to include

### Scene Scaffolding
Call via MCP Launchpad:
```
route_request(service="godot", action="scaffold_scene", params={
  projectPath: "<project path>",
  scenePath: "res://scenes/MyScene.tscn",
  rootType: "Node3D",
  rootName: "MyScene",
  children: [
    { name: "MeshInstance", type: "MeshInstance3D" },
    { name: "CollisionShape", type: "CollisionShape3D" }
  ],
  script: "res://src/my_scene.gd"
})
```

### Script Generation
Call via MCP Launchpad:
```
route_request(service="godot", action="write_script", params={
  projectPath: "<project path>",
  scriptPath: "res://src/my_script.gd",
  extends: "Node3D",
  className: "MyScript",
  signals: [{ name: "health_changed", params: [{ name: "new_health", type: "int" }] }],
  exports: [{ name: "max_health", type: "int", defaultValue: "100" }],
  methods: [
    { name: "_ready", returnType: "void" },
    { name: "take_damage", params: [{ name: "amount", type: "int" }], returnType: "void", body: "\thealth -= amount\n\thealth_changed.emit(health)" }
  ]
})
```

### Behavior Tree Generation
Call via MCP Launchpad:
```
route_request(service="godot", action="scaffold_behavior_tree", params={
  projectPath: "<project path>",
  treePath: "res://ai/patrol_bt.tres",
  tree: {
    type: "BTSequence",
    name: "PatrolSequence",
    children: [
      { type: "BTCondition", name: "IsAlive" },
      { type: "BTSelector", children: [
        { type: "BTSequence", children: [
          { type: "BTCondition", name: "EnemyInRange" },
          { type: "BTAction", name: "Attack" }
        ]},
        { type: "BTAction", name: "Patrol" }
      ]}
    ]
  }
})
```

### After Generation
1. Show the user what was created (file path, node count, method count)
2. Offer to create the corresponding script if they scaffolded a scene (and vice versa)
3. Offer to validate the generated files

### Error Handling
- If project path not found: suggest setting GODOT_PROJECT_PATH or provide the path
- If file already exists: ask if they want to overwrite (pass overwrite: true)
- If generation fails: show the error and suggest fixes

### Analyze Conventions First (Optional)
Before generating, optionally call `analyze_conventions` to match the project's existing style:
```
route_request(service="godot", action="analyze_conventions", params={ projectPath: "<path>" })
```
Then apply those conventions to the generated code.
