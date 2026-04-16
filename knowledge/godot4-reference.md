---
name: godot4-reference
description: "Curated Godot 4 API reference for Claude Code — covers node hierarchy, GDScript 4 syntax, scene patterns, physics, UI, resources, input handling, and critical gotchas. Designed to prevent hallucinated or deprecated APIs."
version: "4.6"
---

# Godot 4 Reference (Curated for Claude Code)

This is a curated subset of the Godot 4 API and patterns. The full docs are 500K+ tokens.
This file covers the most important classes, syntax, patterns, and pitfalls for game development.

**Target version:** Godot 4.3 - 4.6 (GDScript 2.0)

---

## 1. Node Class Hierarchy

### Core Inheritance Chain

```
Object
└── Node                          # Base of all scene tree nodes
    ├── Node2D                    # 2D transform (position, rotation, scale)
    ├── Node3D                    # 3D transform
    ├── Control                   # UI base class
    ├── CanvasLayer               # Separate rendering layer (HUD, parallax)
    ├── AnimationPlayer           # Keyframe animation playback
    ├── AnimationTree             # State machine / blend tree for animations
    ├── AudioStreamPlayer         # Non-positional audio
    ├── AudioStreamPlayer2D       # Positional 2D audio
    ├── AudioStreamPlayer3D       # Positional 3D audio
    ├── Timer                     # Countdown timer node
    ├── HTTPRequest               # HTTP client node
    └── SubViewport               # Off-screen rendering target
```

### Node2D Subtree (2D Games)

```
Node2D
├── Sprite2D                      # Static texture display
├── AnimatedSprite2D              # Frame-based sprite animation
├── CharacterBody2D               # Kinematic body — use move_and_slide()
├── RigidBody2D                   # Physics-driven body
├── StaticBody2D                  # Immovable collision body
├── Area2D                        # Trigger zone (overlap detection)
├── Camera2D                      # 2D camera with smoothing/limits
├── TileMapLayer                  # Single tilemap layer (Godot 4.3+)
├── CollisionShape2D              # Defines collision geometry
├── CollisionPolygon2D            # Polygon-based collision
├── RayCast2D                     # Ray intersection query
├── ShapeCast2D                   # Shape sweep query
├── Line2D                        # 2D line drawing
├── Path2D                        # Bezier path
├── PathFollow2D                  # Follows a Path2D
├── NavigationAgent2D             # Pathfinding agent
├── Parallax2D                    # Parallax scrolling (Godot 4.3+)
├── PointLight2D                  # 2D point light
├── DirectionalLight2D            # 2D directional light
├── GPUParticles2D                # GPU-accelerated particles
└── CPUParticles2D                # CPU particles (more compatible)
```

**TileMap deprecation note (4.3+):** The monolithic `TileMap` node is deprecated. Use `TileMapLayer` instead. Each layer is a separate node. Migration: replace `TileMap` with one `TileMapLayer` per layer.

### Node3D Subtree (3D Games)

```
Node3D
├── MeshInstance3D                # Renders a 3D mesh
├── MultiMeshInstance3D           # Instanced rendering (grass, crowds)
├── CharacterBody3D               # Kinematic 3D body
├── RigidBody3D                   # Physics 3D body
├── StaticBody3D                  # Immovable 3D collision
├── Area3D                        # 3D trigger zone
├── Camera3D                      # 3D camera
├── CollisionShape3D              # 3D collision geometry
├── RayCast3D                     # 3D ray query
├── ShapeCast3D                   # 3D shape sweep
├── NavigationAgent3D             # 3D pathfinding agent
├── DirectionalLight3D            # Sun/moon light
├── OmniLight3D                   # Point light (all directions)
├── SpotLight3D                   # Cone light
├── WorldEnvironment               # Environment settings (sky, fog, tonemap)
├── GPUParticles3D                # GPU particles
├── CPUParticles3D                # CPU particles
├── Sprite3D                      # Billboard sprite in 3D
├── Label3D                       # Text in 3D space
├── CSGBox3D / CSGSphere3D / etc  # Constructive solid geometry
├── AnimatableBody3D              # Animated physics body
├── VehicleBody3D                 # Vehicle physics
└── BoneAttachment3D              # Attach to skeleton bone
```

### Control Subtree (UI)

```
Control                           # Base for all UI — has anchors, margins, focus
├── Label                         # Static text
├── RichTextLabel                 # BBCode-formatted text
├── Button                        # Clickable button
├── TextureButton                 # Image-based button
├── LinkButton                    # Hyperlink-style button
├── CheckBox                      # Toggle checkbox
├── CheckButton                   # Toggle switch
├── OptionButton                  # Dropdown select
├── SpinBox                       # Numeric input with arrows
├── LineEdit                      # Single-line text input
├── TextEdit                      # Multi-line text editor
├── CodeEdit                      # Code editor with syntax highlighting
├── ProgressBar                   # Progress indicator
├── HSlider / VSlider             # Slider controls
├── HScrollBar / VScrollBar       # Scroll bars
├── TextureRect                   # Display a texture
├── ColorRect                     # Solid color rectangle
├── Panel                         # Styled panel background
├── PanelContainer                # Panel that sizes to content
├── TabContainer                  # Tabbed UI
├── TabBar                        # Tab bar without content
├── Tree                          # Hierarchical list
├── ItemList                      # Selectable item list
├── FileDialog                    # File picker
├── AcceptDialog / ConfirmationDialog  # Modal dialogs
│
├── Container (layout managers)
│   ├── HBoxContainer             # Horizontal layout
│   ├── VBoxContainer             # Vertical layout
│   ├── GridContainer             # Grid layout
│   ├── MarginContainer           # Adds margins around child
│   ├── CenterContainer           # Centers child
│   ├── FlowContainer             # Wrapping flow layout
│   ├── HSplitContainer           # Draggable horizontal split
│   ├── VSplitContainer           # Draggable vertical split
│   ├── AspectRatioContainer      # Maintains aspect ratio
│   └── ScrollContainer           # Scrollable area
│
└── Popup
    ├── PopupMenu                 # Context menu
    └── PopupPanel                # Floating panel
```

### Other Important Nodes

| Node | Purpose |
|------|---------|
| `CanvasLayer` | Separate rendering layer (HUDs stay fixed while world scrolls) |
| `SubViewport` | Render to texture, picture-in-picture, split-screen |
| `SubViewportContainer` | Display a SubViewport in the scene |
| `AnimationPlayer` | Keyframe animation for any property |
| `AnimationTree` | State machine for animation blending |
| `Timer` | One-shot or repeating countdown |
| `HTTPRequest` | Async HTTP calls |
| `AudioStreamPlayer` | Non-positional audio (music, UI sounds) |
| `Marker2D` / `Marker3D` | Position reference points (spawn points, etc.) |
| `RemoteTransform2D/3D` | Mirror transform to another node |
| `CanvasGroup` | Group rendering effects (shared opacity) |

---

## 2. GDScript 4 Syntax Reference

### 2.1 Variables and Type Annotations

```gdscript
# Inferred type
var speed := 200.0                       # float (inferred from literal)
var name := "Player"                     # String

# Explicit type
var health: int = 100
var position: Vector2 = Vector2.ZERO
var items: Array[String] = []
var scores: Dictionary = {}

# Constants
const MAX_SPEED: float = 400.0
const GRAVITY: float = 980.0

# Static variables (shared across instances, Godot 4.1+)
static var instance_count: int = 0
```

### 2.2 Functions

```gdscript
# Typed parameters and return
func take_damage(amount: int, source: Node = null) -> bool:
    health -= amount
    if health <= 0:
        die()
        return true
    return false

# Void return (no -> annotation needed, but recommended)
func die() -> void:
    queue_free()

# Static functions (callable on class name)
static func create_at(pos: Vector2) -> Node2D:
    var instance := preload("res://scenes/enemy.tscn").instantiate()
    instance.position = pos
    return instance
```

### 2.3 @export Variants

```gdscript
# Basic export (appears in Inspector)
@export var speed: float = 200.0
@export var player_name: String = "Hero"
@export var color: Color = Color.WHITE

# Range slider
@export_range(0, 100, 1) var health: int = 100
@export_range(0.0, 1.0, 0.01) var volume: float = 0.8
@export_range(1, 10, 1, "or_greater") var level: int = 1

# Enum dropdown
@export_enum("Sword", "Bow", "Staff") var weapon: int = 0
@export_enum("Normal:0", "Hard:1", "Nightmare:2") var difficulty: int = 0

# Resource/scene references
@export var weapon_data: Resource
@export var bullet_scene: PackedScene
@export var texture: Texture2D
@export var mesh: Mesh

# File picker
@export_file("*.png", "*.jpg") var sprite_path: String
@export_dir var save_directory: String
@export_global_file("*.json") var config_path: String

# Flags (bitmask checkboxes)
@export_flags("Fire", "Water", "Earth", "Wind") var elements: int = 0

# Node path
@export var target_path: NodePath
@export_node_path("CharacterBody2D", "RigidBody2D") var body_path: NodePath

# Multiline string
@export_multiline var description: String = ""

# Color without alpha
@export_color_no_alpha var base_color: Color = Color.WHITE

# Categories and groups
@export_category("Movement")
@export var walk_speed: float = 100.0
@export var run_speed: float = 200.0

@export_group("Combat")
@export var attack_damage: int = 10
@export var attack_range: float = 50.0

@export_subgroup("Projectile")
@export var projectile_speed: float = 300.0
```

### 2.4 @onready

```gdscript
# Resolved when _ready() is called (after scene tree entry)
@onready var sprite: Sprite2D = $Sprite2D
@onready var anim: AnimationPlayer = $AnimationPlayer
@onready var collision: CollisionShape2D = $CollisionShape2D
@onready var label: Label = $UI/HealthLabel
@onready var raycast: RayCast2D = $RayCast2D

# Using get_node with type hint
@onready var camera := get_node("Camera2D") as Camera2D

# Using % for unique name (scene-unique node)
@onready var health_bar: ProgressBar = %HealthBar
```

**Scene-unique nodes (% prefix):** In the editor, right-click a node and "Access as Unique Name." Then reference it with `%NodeName` from anywhere in the scene. Avoids brittle paths.

### 2.5 Signals

```gdscript
# Declaration
signal health_changed(new_value: int)
signal died
signal item_collected(item_name: String, quantity: int)

# Emit
health_changed.emit(health)
died.emit()
item_collected.emit("coin", 5)

# Connect in code
func _ready() -> void:
    health_changed.connect(_on_health_changed)
    # With lambda
    died.connect(func(): print("Player died"))

# Disconnect
health_changed.disconnect(_on_health_changed)

# One-shot connection (auto-disconnects after first emit)
died.connect(_on_died, CONNECT_ONE_SHOT)

# Deferred connection (called next frame, not immediately)
health_changed.connect(_on_health_changed, CONNECT_DEFERRED)

# Check connection
if health_changed.is_connected(_on_health_changed):
    pass

# Await a signal
await get_tree().create_timer(1.0).timeout
await animation_player.animation_finished
```

### 2.6 Enums

```gdscript
# Named enum
enum State { IDLE, RUNNING, JUMPING, FALLING, ATTACKING }

# Usage
var current_state: State = State.IDLE

func _physics_process(delta: float) -> void:
    match current_state:
        State.IDLE:
            _handle_idle(delta)
        State.RUNNING:
            _handle_running(delta)
        State.JUMPING:
            _handle_jumping(delta)

# Anonymous enum (constants on the class)
enum { UP, DOWN, LEFT, RIGHT }

# Enum with explicit values
enum Element { FIRE = 0, WATER = 1, EARTH = 2, WIND = 3 }
```

### 2.7 Match Statement

```gdscript
match current_state:
    State.IDLE:
        velocity.x = 0
    State.RUNNING:
        velocity.x = direction * speed
    State.JUMPING, State.FALLING:   # Multiple values
        velocity.y += gravity * delta
    _:                               # Default case
        push_warning("Unknown state")

# Binding patterns
match command:
    ["move", var direction]:
        move(direction)
    ["attack", var target, var damage]:
        attack(target, damage)
    ["heal", var amount] when amount > 0:    # Guard clause (4.x)
        heal(amount)
```

### 2.8 Lambda / Callable

```gdscript
# Lambda
var double := func(x: int) -> int: return x * 2
print(double.call(5))  # 10

# Multi-line lambda
var process := func(items: Array) -> Array:
    var result: Array = []
    for item in items:
        if item.is_valid():
            result.append(item)
    return result

# As signal callback
button.pressed.connect(func(): start_game())
timer.timeout.connect(func(): spawn_enemy())

# Callable from method reference
var callback: Callable = _on_button_pressed
callback.call()

# Bind arguments to callable
var cb := _on_damage.bind("fire", 1.5)
cb.call(50)  # calls _on_damage(50, "fire", 1.5)
```

### 2.9 Await and Coroutines

```gdscript
# Wait for timer
await get_tree().create_timer(2.0).timeout

# Wait for signal
await animation_player.animation_finished

# Wait for tween completion
var tween := create_tween()
tween.tween_property(self, "modulate:a", 0.0, 1.0)
await tween.finished

# Coroutine pattern — function that awaits returns a Signal
func spawn_wave() -> void:
    for i in range(5):
        _spawn_enemy()
        await get_tree().create_timer(0.5).timeout
    wave_complete.emit()

# Calling a coroutine and waiting
await spawn_wave()
print("Wave complete!")

# CAUTION: if the node is freed while awaiting, code after await never runs.
# Guard with is_instance_valid():
await get_tree().create_timer(1.0).timeout
if not is_instance_valid(self):
    return
```

### 2.10 Typed Arrays and Dictionaries

```gdscript
# Typed arrays
var enemies: Array[Enemy] = []
var positions: Array[Vector2] = []
var names: Array[String] = ["Alice", "Bob"]
var scores: Array[int] = [100, 200, 300]

# Packed arrays (contiguous memory, better perf for large data)
var vertices: PackedVector2Array = PackedVector2Array()
var floats: PackedFloat32Array = PackedFloat32Array()
var colors: PackedColorArray = PackedColorArray()

# Dictionary (always untyped in GDScript 4)
var inventory: Dictionary = {
    "sword": 1,
    "potion": 5,
    "key": 2,
}

# Access
var count: int = inventory.get("potion", 0)  # default if missing
```

### 2.11 String Operations

```gdscript
# String formatting
var msg := "Health: %d / %d" % [current, maximum]
var path := "res://scenes/%s.tscn" % scene_name

# StringName (interned, fast comparison — used for signals, methods)
var signal_name: StringName = &"health_changed"
var method_name: StringName = &"_on_pressed"

# NodePath
var node_path: NodePath = ^"UI/HealthBar"

# Common string methods
"Hello World".to_lower()        # "hello world"
"Hello World".to_upper()        # "HELLO WORLD"
"  spaced  ".strip_edges()      # "spaced"
"a,b,c".split(",")             # ["a", "b", "c"]
"player_001".get_basename()     # "player_001"
"path/to/file.png".get_file()   # "file.png"
"path/to/file.png".get_extension() # "png"
```

### 2.12 Class Inheritance

```gdscript
# base_enemy.gd
class_name BaseEnemy
extends CharacterBody2D

@export var max_health: int = 50
var health: int

func _ready() -> void:
    health = max_health

func take_damage(amount: int) -> void:
    health -= amount
    if health <= 0:
        die()

func die() -> void:
    queue_free()

# slime.gd — inherits from BaseEnemy
class_name Slime
extends BaseEnemy

func die() -> void:
    # Split into smaller slimes before dying
    _spawn_mini_slimes()
    super.die()  # Call parent's die()
```

### 2.13 Inner Classes

```gdscript
# Using inner classes for related data
class HitResult:
    var damage: int
    var critical: bool
    var element: String

    func _init(dmg: int, crit: bool, elem: String = "physical") -> void:
        damage = dmg
        critical = crit
        element = elem

# Usage
var hit := HitResult.new(50, true, "fire")
```

### 2.14 Utility Functions

```gdscript
# Math
clampf(value, 0.0, 1.0)          # Clamp float
clampi(value, 0, 100)             # Clamp int
lerpf(a, b, 0.5)                  # Linear interpolate float
lerp(vec_a, vec_b, 0.5)           # Lerp for Vector2/Vector3/Color
move_toward(current, target, step) # Move value toward target
smoothstep(0.0, 1.0, t)           # Smooth interpolation
remap(value, 0, 100, 0.0, 1.0)    # Remap range
snapped(value, 0.5)               # Snap to increment
wrapf(angle, 0.0, TAU)            # Wrap float in range
wrapi(index, 0, array.size())     # Wrap int in range
absf(x)                           # Absolute float
absi(x)                           # Absolute int
signf(x)                          # Sign of float (-1, 0, 1)
signi(x)                          # Sign of int

# IMPORTANT: maxf() / minf() take EXACTLY 2 arguments
maxf(a, b)                        # Max of two floats
minf(a, b)                        # Min of two floats
# For 3+ values, nest: maxf(maxf(a, b), c)

# Random
randf()                           # 0.0 to 1.0
randf_range(-1.0, 1.0)            # Float in range
randi_range(0, 10)                # Int in range (inclusive)
randi() % 6                       # 0 to 5

# Type checking
x is int                          # Type check
x is CharacterBody2D
typeof(x) == TYPE_STRING
str(42)                           # Convert to string
int("42")                         # Convert to int
float("3.14")                     # Convert to float

# Printing
print("hello")                    # stdout
print_rich("[color=red]Error![/color]")  # BBCode in output
push_error("Critical failure")    # Error (shows in Debugger)
push_warning("Something odd")     # Warning
printerr("Error message")         # stderr
```

---

## 3. Scene Tree Patterns

### 3.1 Composition Over Inheritance

Prefer building entities by composing child nodes rather than deep inheritance chains.

```
# PREFER: Composition
Player (CharacterBody2D)
├── Sprite2D
├── CollisionShape2D
├── AnimationPlayer
├── StateMachine (Node)          # Custom state machine component
├── HitboxComponent (Area2D)     # Reusable hitbox
├── HealthComponent (Node)       # Reusable health logic
├── WeaponSlot (Marker2D)        # Weapon mount point
└── Camera2D

# AVOID: Deep inheritance
BaseEntity → LivingEntity → Humanoid → Player → PlayerWarrior
```

### 3.2 Packed Scenes and Instancing

```gdscript
# Preload at parse time (preferred for known scenes)
const EnemyScene: PackedScene = preload("res://scenes/enemies/slime.tscn")
const BulletScene: PackedScene = preload("res://scenes/projectiles/bullet.tscn")

# Load at runtime (for dynamic/conditional loading)
var scene: PackedScene = load("res://scenes/levels/level_%d.tscn" % level_num)

# Instantiate and add to tree
func spawn_enemy(pos: Vector2) -> void:
    var enemy := EnemyScene.instantiate() as CharacterBody2D
    enemy.position = pos
    add_child(enemy)

# Deferred add (safe during physics callbacks)
func _on_area_entered(area: Area2D) -> void:
    var effect := EffectScene.instantiate()
    effect.position = area.global_position
    call_deferred("add_child", effect)

# Instantiate a scene you don't hold a reference to
var scene := ResourceLoader.load("res://scenes/boss.tscn") as PackedScene
var boss := scene.instantiate()
```

### 3.3 Node Path Conventions

```gdscript
$Sprite2D                        # Direct child
$Body/CollisionShape2D           # Nested path
$"My Node"                       # Name with spaces
%HealthBar                       # Scene-unique name (%)
$"../Sibling"                    # Sibling node (via parent)
get_node("../Sibling")           # Equivalent to above
get_parent()                     # Parent node
get_tree().root                  # Scene root
get_tree().current_scene         # Currently loaded scene
```

### 3.4 Groups

```gdscript
# Add to group (in code)
add_to_group("enemies")
add_to_group("damageable")

# Or set groups in the editor's Node panel

# Query groups
var all_enemies := get_tree().get_nodes_in_group("enemies")
for enemy in all_enemies:
    enemy.take_damage(10)

# Call method on all group members
get_tree().call_group("enemies", "freeze")

# Check membership
if is_in_group("damageable"):
    take_damage(amount)
```

### 3.5 Autoload Singletons

**When to use autoload:**
- Global state (score, settings, save data)
- Event bus (cross-system communication)
- Audio manager (music persists across scenes)
- Scene transition manager

**When NOT to use autoload:**
- Game-specific systems (BuildingManager, CombatSystem) -- use scene-local nodes with injection
- Anything that should reset when the scene changes
- Anything only one scene needs

```gdscript
# Register in Project > Project Settings > Autoload
# Name: GameManager, Path: res://scripts/autoload/game_manager.gd

# game_manager.gd — NO class_name (see Gotchas section)
extends Node

signal score_changed(new_score: int)
signal game_over

var score: int = 0:
    set(value):
        score = value
        score_changed.emit(score)

var high_score: int = 0

func reset() -> void:
    score = 0

# Access from anywhere:
# GameManager.score += 10
# GameManager.score_changed.connect(update_ui)
```

**CRITICAL: Never add `class_name` to autoload scripts.** See Gotchas section.

### 3.6 Scene Change

```gdscript
# Simple scene change
get_tree().change_scene_to_file("res://scenes/levels/level_02.tscn")

# With packed scene
var next_level: PackedScene = preload("res://scenes/levels/level_02.tscn")
get_tree().change_scene_to_packed(next_level)

# Reload current scene
get_tree().reload_current_scene()

# Quit
get_tree().quit()

# Pause
get_tree().paused = true   # Nodes with process_mode = PROCESS_MODE_ALWAYS still run
get_tree().paused = false
```

---

## 4. Godot 4.x Gotchas

These are hard-earned rules from production builds. Each one caused real bugs.

### 4.1 class_name + Autoload Conflict

If a script has `class_name X` AND is registered as autoload "X", Godot errors:
```
"Class X hides an autoload singleton."
```

**FIX:** Remove `class_name` from ALL autoload scripts. Access autoloads by their registered name only.

### 4.2 Built-in Method Name Shadows

These names exist on Object/Node and CANNOT be used as custom method names:

| Shadowed Name | Use Instead |
|---------------|-------------|
| `get_name()` | `get_entity_name()` |
| `connect()` | `connect_to_network()` |
| `disconnect()` | `disconnect_from_network()` |
| `has_signal()` | `has_custom_signal()` |
| `has_method()` | `supports_action()` |
| `get_class()` | `get_entity_class()` |
| `get_path()` | `get_file_path()` |
| `get_parent()` | `get_logical_parent()` |
| `is_connected()` | `is_linked()` |

**Rule:** Before naming any method, mentally check if Object, Node, or Node2D/3D already has it.

### 4.3 maxf() / minf() 2-Argument Limit

```gdscript
# WRONG — runtime error
maxf(a, b, c)

# CORRECT
maxf(maxf(a, b), c)
maxf(maxf(a, b), maxf(c, d))
```

### 4.4 Static vs Instance Method Calls

```gdscript
# WRONG — can't call instance methods on class name
BuildingManager.place_building(hex)

# CORRECT — use injected reference
_building_manager.place_building(hex)

# Only static func can be called on class name
class_name MathHelper
static func lerp_angle(a: float, b: float, t: float) -> float:
    return a + wrapf(b - a, -PI, PI) * t
# Usage: MathHelper.lerp_angle(...)
```

### 4.5 int == String Crash

Godot 4.x crashes on mixed-type comparison:

```gdscript
# CRASHES at runtime
if some_value == "text":  # some_value might be int

# SAFE
if some_value is String and some_value == "text":
    pass

# Or with typeof()
if typeof(some_value) == TYPE_STRING:
    pass
```

### 4.6 Signal Double-Connection

```gdscript
# WRONG — connecting in _ready() that runs multiple times
func _ready() -> void:
    button.pressed.connect(_on_pressed)  # duplicates if re-entered

# SAFE — guard the connection
func _ready() -> void:
    if not button.pressed.is_connected(_on_pressed):
        button.pressed.connect(_on_pressed)
```

### 4.7 Typed Signal Parameters with .bind()

`.bind()` appends arguments. The receiving function must accept signal args + bound args.

```gdscript
# If signal emits (item: String), and you bind(index: int):
signal item_selected(item: String)

# Receiver must accept: item: String, index: int
func _on_item_selected(item: String, index: int) -> void:
    pass

# Safer alternative — use lambda:
item_selected.connect(func(item): _on_item_selected(item, index))
```

### 4.8 WorkerThreadPool Safety

Only pass across thread boundaries:
- `PackedFloat32Array`, `PackedInt32Array`, `PackedVector2Array`, etc.
- Primitives: `int`, `float`, `bool`, `String`

NEVER pass: `Resource`, `Node`, `Dictionary` with Object values.

```gdscript
WorkerThreadPool.add_task(func():
    var result: PackedFloat32Array = _heavy_computation()
    call_deferred("_apply_result", result)
)
```

### 4.9 Await Node Lifetime

If a node is freed while an `await` is pending, code after `await` silently fails.

```gdscript
await get_tree().create_timer(2.0).timeout
if not is_instance_valid(self):
    return
# Safe to continue
```

### 4.10 Shader material_override on Sprite3D

Applying `material_override` to a billboard `Sprite3D` often makes it invisible. Bake effects into textures instead.

### 4.11 MultiMesh Visibility from Top-Down

Flat disc meshes (CylinderMesh with height ~0) are invisible from top-down cameras. Use `Label3D`, `Sprite3D` with billboard mode, or geometry with meaningful height.

### 4.12 Dictionary Stale References

Dictionaries tracking node IDs accumulate stale entries when nodes are freed. Add periodic purge functions:

```gdscript
func purge_stale_entries() -> void:
    var to_remove: Array = []
    for id in tracked_entities:
        if not tracked_entities[id].is_instance_valid():
            to_remove.append(id)
    for id in to_remove:
        tracked_entities.erase(id)
```

---

## 5. Input Handling

### 5.1 Input Actions (Project Settings > Input Map)

```gdscript
# Polling (in _process or _physics_process)
if Input.is_action_pressed("move_right"):       # Held down
    velocity.x = speed
if Input.is_action_just_pressed("jump"):         # Frame of press
    velocity.y = jump_force
if Input.is_action_just_released("shoot"):       # Frame of release
    fire_weapon()

# Axis (returns -1.0 to 1.0)
var horizontal := Input.get_axis("move_left", "move_right")
var vertical := Input.get_axis("move_up", "move_down")
var direction := Vector2(horizontal, vertical).normalized()

# Action strength (analog, 0.0 to 1.0)
var throttle := Input.get_action_strength("accelerate")
```

### 5.2 _input vs _unhandled_input vs _process

| Callback | When Called | Use For |
|----------|------------|---------|
| `_input(event)` | Every input event, before UI | Rarely — usually use _unhandled_input |
| `_unhandled_input(event)` | After UI consumes events | Game input (movement, shooting) |
| `_unhandled_key_input(event)` | Keyboard only, after UI | Debug shortcuts |
| `_process(delta)` | Every frame | Polling with `Input.is_action_*` |
| `_physics_process(delta)` | Fixed timestep (60Hz default) | Movement + physics polling |

```gdscript
# Event-driven (for discrete actions)
func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("interact"):
        interact_with_nearest()
        get_viewport().set_input_as_handled()  # Consume the event

    if event is InputEventMouseButton:
        if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
            shoot(event.position)

# Polling (for continuous input like movement)
func _physics_process(delta: float) -> void:
    var dir := Input.get_axis("move_left", "move_right")
    velocity.x = dir * speed
    move_and_slide()
```

### 5.3 Mouse Input

```gdscript
# Mouse position
var screen_pos: Vector2 = get_viewport().get_mouse_position()
var world_pos: Vector2 = get_global_mouse_position()

# Mouse button events
func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseButton:
        if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
            # Left click
            pass
        if event.button_index == MOUSE_BUTTON_WHEEL_UP:
            zoom_in()

    if event is InputEventMouseMotion:
        var relative: Vector2 = event.relative  # Mouse delta
```

### 5.4 Coyote Time and Jump Buffering

```gdscript
const COYOTE_TIME := 0.1
const JUMP_BUFFER := 0.12

var coyote_timer := 0.0
var jump_buffer_timer := 0.0

func _physics_process(delta: float) -> void:
    if is_on_floor():
        coyote_timer = COYOTE_TIME
    else:
        coyote_timer -= delta

    if Input.is_action_just_pressed("jump"):
        jump_buffer_timer = JUMP_BUFFER
    else:
        jump_buffer_timer -= delta

    var can_jump := is_on_floor() or coyote_timer > 0.0
    var wants_jump := Input.is_action_just_pressed("jump") or jump_buffer_timer > 0.0

    if can_jump and wants_jump:
        velocity.y = JUMP_FORCE
        coyote_timer = 0.0
        jump_buffer_timer = 0.0
```

---

## 6. Physics and Movement

### 6.1 CharacterBody2D / CharacterBody3D

The primary pattern for player-controlled characters.

```gdscript
extends CharacterBody2D

const SPEED := 200.0
const JUMP_VELOCITY := -400.0
const GRAVITY := 980.0
const ACCELERATION := 1200.0
const FRICTION := 800.0

func _physics_process(delta: float) -> void:
    # Gravity
    if not is_on_floor():
        velocity.y += GRAVITY * delta

    # Jump
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = JUMP_VELOCITY

    # Horizontal movement with acceleration
    var direction := Input.get_axis("move_left", "move_right")
    if direction:
        velocity.x = move_toward(velocity.x, direction * SPEED, ACCELERATION * delta)
    else:
        velocity.x = move_toward(velocity.x, 0, FRICTION * delta)

    move_and_slide()

    # After move_and_slide(), query results:
    if is_on_floor():
        pass
    if is_on_wall():
        pass
    if is_on_ceiling():
        pass

    # Slide collision info
    for i in get_slide_collision_count():
        var collision := get_slide_collision(i)
        var collider := collision.get_collider()
        var normal := collision.get_normal()
```

### 6.2 CharacterBody3D First-Person

```gdscript
extends CharacterBody3D

const SPEED := 5.0
const JUMP_VELOCITY := 4.5
const MOUSE_SENSITIVITY := 0.002

@onready var camera: Camera3D = $Camera3D

var gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")

func _ready() -> void:
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseMotion:
        rotate_y(-event.relative.x * MOUSE_SENSITIVITY)
        camera.rotate_x(-event.relative.y * MOUSE_SENSITIVITY)
        camera.rotation.x = clampf(camera.rotation.x, -PI / 2, PI / 2)

    if event.is_action_pressed("ui_cancel"):
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta

    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = JUMP_VELOCITY

    var input_dir := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()

    if direction:
        velocity.x = direction.x * SPEED
        velocity.z = direction.z * SPEED
    else:
        velocity.x = move_toward(velocity.x, 0, SPEED)
        velocity.z = move_toward(velocity.z, 0, SPEED)

    move_and_slide()
```

### 6.3 RigidBody2D / RigidBody3D

```gdscript
extends RigidBody2D

func _ready() -> void:
    # Configure physics material
    physics_material_override = PhysicsMaterial.new()
    physics_material_override.bounce = 0.5
    physics_material_override.friction = 0.8

# Apply forces (in _integrate_forces or via methods)
func push(direction: Vector2, force: float) -> void:
    apply_central_impulse(direction.normalized() * force)

func explode_nearby(radius: float, strength: float) -> void:
    apply_force(Vector2.UP * strength)

# For full control, override _integrate_forces:
func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
    var current_vel := state.linear_velocity
    # Modify state directly
    state.linear_velocity = current_vel.limit_length(max_speed)
```

### 6.4 RayCast Usage

```gdscript
# RayCast2D node approach
@onready var ray: RayCast2D = $RayCast2D

func check_ground() -> void:
    ray.force_raycast_update()  # Update immediately (normally updates in physics)
    if ray.is_colliding():
        var collider := ray.get_collider()
        var point := ray.get_collision_point()
        var normal := ray.get_collision_normal()

# Direct space query (no node needed)
func raycast_from_mouse() -> Dictionary:
    var space := get_world_2d().direct_space_state
    var query := PhysicsRayQueryParameters2D.create(
        global_position,
        get_global_mouse_position(),
        0xFFFFFFFF,     # collision mask (all layers)
        [self]          # exclude array
    )
    return space.intersect_ray(query)
    # Returns: { position, normal, collider, collider_id, rid, shape }
    # Returns empty dict if no hit
```

### 6.5 Area2D / Area3D for Triggers

```gdscript
extends Area2D

signal entered_zone(body: Node2D)

func _ready() -> void:
    body_entered.connect(_on_body_entered)
    body_exited.connect(_on_body_exited)
    # For Area-to-Area: area_entered / area_exited

func _on_body_entered(body: Node2D) -> void:
    if body.is_in_group("player"):
        entered_zone.emit(body)
        # Damage zone example:
        if body.has_method("take_damage"):
            body.take_damage(10)

func _on_body_exited(body: Node2D) -> void:
    pass
```

### 6.6 Collision Layers and Masks

```
Layer = what this object IS on
Mask  = what this object SCANS for (collides with)

Example setup:
  Layer 1: Player
  Layer 2: Enemies
  Layer 3: Environment
  Layer 4: Projectiles
  Layer 5: Pickups

Player:   layer=1, mask=2,3,5    (is player, detects enemies+env+pickups)
Enemy:    layer=2, mask=1,3,4    (is enemy, detects player+env+projectiles)
Bullet:   layer=4, mask=2,3      (is projectile, detects enemies+env)
```

```gdscript
# Set in code
collision_layer = 1       # Bit 1
collision_mask = 0b10110  # Bits 2, 3, 5

# Helper methods
set_collision_layer_value(1, true)   # Enable layer 1
set_collision_mask_value(2, true)    # Enable mask 2
```

---

## 7. UI Patterns

### 7.1 Anchors and Containers

**Layout priority:** Use Containers first. Manual anchors only when containers are insufficient.

```
Common layouts:

Full-screen HUD:
  CanvasLayer
  └── Control (full_rect)
      ├── MarginContainer (anchors: full rect, margins: 16px)
      │   ├── VBoxContainer (top section)
      │   │   ├── HBoxContainer
      │   │   │   ├── Label (health)
      │   │   │   └── ProgressBar
      │   │   └── Label (score)
      │   └── VBoxContainer (bottom section)

Centered menu:
  Control (full_rect)
  └── CenterContainer
      └── VBoxContainer
          ├── Label ("Game Title")
          ├── Button ("Start")
          ├── Button ("Options")
          └── Button ("Quit")
```

**Anchor presets (set in editor or code):**

```gdscript
# Common presets
control.set_anchors_preset(Control.PRESET_CENTER)        # Centered
control.set_anchors_preset(Control.PRESET_FULL_RECT)     # Fill parent
control.set_anchors_preset(Control.PRESET_TOP_LEFT)      # Pin to corner
control.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)   # Bottom edge, full width
```

### 7.2 Theme System

```gdscript
# Apply theme in code
var theme := Theme.new()

# Font
var font := load("res://assets/fonts/main.ttf") as Font
theme.set_font("font", "Label", font)
theme.set_font_size("font_size", "Label", 16)

# Colors
theme.set_color("font_color", "Label", Color.WHITE)
theme.set_color("font_color", "Button", Color.WHITE)
theme.set_color("font_hover_color", "Button", Color.YELLOW)

# StyleBox (backgrounds, borders)
var style := StyleBoxFlat.new()
style.bg_color = Color(0.1, 0.1, 0.1, 0.8)
style.corner_radius_top_left = 8
style.corner_radius_top_right = 8
style.corner_radius_bottom_left = 8
style.corner_radius_bottom_right = 8
style.content_margin_left = 12
style.content_margin_right = 12
style.content_margin_top = 8
style.content_margin_bottom = 8
theme.set_stylebox("panel", "Panel", style)
theme.set_stylebox("normal", "Button", style)

# Apply to root control (all children inherit)
$UI.theme = theme
```

### 7.3 Focus Navigation

```gdscript
# Set focus neighbors in code
button_a.focus_neighbor_bottom = button_b.get_path()
button_b.focus_neighbor_top = button_a.get_path()

# Grab focus programmatically
func _ready() -> void:
    $StartButton.grab_focus()

# Focus mode
control.focus_mode = Control.FOCUS_ALL    # Keyboard + click
control.focus_mode = Control.FOCUS_CLICK  # Click only
control.focus_mode = Control.FOCUS_NONE   # No focus
```

### 7.4 RichTextLabel BBCode

```gdscript
@onready var rich_label: RichTextLabel = $RichTextLabel

func show_damage(amount: int, is_critical: bool) -> void:
    if is_critical:
        rich_label.text = "[color=red][shake rate=20 level=5]-%d CRITICAL![/shake][/color]" % amount
    else:
        rich_label.text = "[color=white]-%d[/color]" % amount

# Common BBCode tags:
# [b]bold[/b]  [i]italic[/i]  [u]underline[/u]
# [color=red]colored[/color]
# [font_size=24]big[/font_size]
# [center]centered[/center]
# [url=https://example.com]link[/url]
# [wave amp=20 freq=5]wavy[/wave]
# [shake rate=10 level=5]shaky[/shake]
# [rainbow freq=0.2 sat=0.8 val=0.8]rainbow[/rainbow]
```

---

## 8. Resource System

### 8.1 Built-in Resource Types

| Extension | Type | Use |
|-----------|------|-----|
| `.tscn` | PackedScene (text) | Scene files |
| `.scn` | PackedScene (binary) | Binary scene |
| `.tres` | Resource (text) | Human-readable custom resources |
| `.res` | Resource (binary) | Binary resources (faster load) |
| `.gd` | GDScript | Scripts |
| `.gdshader` | Shader | Visual shaders |
| `.import` | Import config | Auto-generated, do not edit |

**Use `.tres` during development** (diffable, readable). Convert to `.res` for release builds if needed.

### 8.2 Custom Resources

```gdscript
# weapon_data.gd
class_name WeaponData
extends Resource

@export var name: String = "Sword"
@export var damage: int = 10
@export var attack_speed: float = 1.0
@export var range_distance: float = 50.0
@export var icon: Texture2D
@export var sound: AudioStream
@export_multiline var description: String = ""
```

Create instances in the editor: right-click in FileSystem > New Resource > WeaponData. Saves as `.tres`.

```gdscript
# Using custom resources
@export var weapon: WeaponData

func attack() -> void:
    if weapon:
        deal_damage(weapon.damage)
        $AudioPlayer.stream = weapon.sound
        $AudioPlayer.play()
```

### 8.3 Resource as Data Tables

```gdscript
# item_database.gd
class_name ItemDatabase
extends Resource

@export var items: Array[ItemData] = []

func get_item(id: String) -> ItemData:
    for item in items:
        if item.id == id:
            return item
    return null

# item_data.gd
class_name ItemData
extends Resource

@export var id: String
@export var display_name: String
@export var icon: Texture2D
@export var stack_size: int = 99
@export var value: int = 0
@export_enum("Weapon", "Armor", "Consumable", "Material") var category: int = 0
```

### 8.4 Loading Resources

```gdscript
# Preload (compile-time, path must be literal string)
const SwordData: WeaponData = preload("res://data/weapons/sword.tres")

# Load (runtime)
var data: WeaponData = load("res://data/weapons/%s.tres" % weapon_name) as WeaponData

# Async loading (for large resources)
func load_level_async(path: String) -> void:
    ResourceLoader.load_threaded_request(path)

func _process(_delta: float) -> void:
    var status := ResourceLoader.load_threaded_get_status(path)
    match status:
        ResourceLoader.THREAD_LOAD_IN_PROGRESS:
            var progress: Array = []
            ResourceLoader.load_threaded_get_status(path, progress)
            loading_bar.value = progress[0] * 100
        ResourceLoader.THREAD_LOAD_LOADED:
            var resource := ResourceLoader.load_threaded_get(path)
            get_tree().change_scene_to_packed(resource)
        ResourceLoader.THREAD_LOAD_FAILED:
            push_error("Failed to load: %s" % path)
```

### 8.5 Save / Load with Resources

```gdscript
# Save
func save_game() -> void:
    var save_data := SaveData.new()
    save_data.player_position = player.position
    save_data.health = player.health
    save_data.inventory = player.inventory.duplicate()
    ResourceSaver.save(save_data, "user://save.tres")

# Load
func load_game() -> void:
    if ResourceLoader.exists("user://save.tres"):
        var save_data := load("user://save.tres") as SaveData
        player.position = save_data.player_position
        player.health = save_data.health

# Alternative: JSON for cross-platform saves
func save_json() -> void:
    var data := {
        "position": [player.position.x, player.position.y],
        "health": player.health,
    }
    var file := FileAccess.open("user://save.json", FileAccess.WRITE)
    file.store_string(JSON.stringify(data))

func load_json() -> void:
    if FileAccess.file_exists("user://save.json"):
        var file := FileAccess.open("user://save.json", FileAccess.READ)
        var data: Dictionary = JSON.parse_string(file.get_as_text())
        player.position = Vector2(data.position[0], data.position[1])
        player.health = data.health
```

---

## 9. Animation

### 9.1 AnimationPlayer

```gdscript
@onready var anim: AnimationPlayer = $AnimationPlayer

func _ready() -> void:
    # Play animation
    anim.play("idle")

    # Play backwards
    anim.play_backwards("attack")

    # Queue (plays after current finishes)
    anim.queue("idle")

    # Speed
    anim.speed_scale = 2.0

    # Signals
    anim.animation_finished.connect(_on_animation_finished)

func _on_animation_finished(anim_name: StringName) -> void:
    if anim_name == &"attack":
        anim.play("idle")
```

### 9.2 Tweens

```gdscript
# Create tween (auto-managed, freed when done)
var tween := create_tween()

# Property tween
tween.tween_property(sprite, "modulate:a", 0.0, 1.0)  # Fade out over 1s
tween.tween_property(sprite, "position", Vector2(100, 0), 0.5)

# Chaining (sequential by default)
tween.tween_property(self, "position:x", 200.0, 0.5)
tween.tween_property(self, "position:y", 100.0, 0.5)

# Parallel
tween.set_parallel(true)
tween.tween_property(self, "position", target, 0.5)
tween.tween_property(self, "modulate:a", 0.0, 0.5)

# Easing
tween.tween_property(self, "position", target, 0.5).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)

# Callback
tween.tween_callback(queue_free)                    # Call after tween
tween.tween_callback(func(): print("done"))         # Lambda

# Delay
tween.tween_interval(0.5)  # Wait 0.5s between steps

# Loop
tween.set_loops(3)     # Repeat 3 times
tween.set_loops(0)     # Infinite

# Await completion
await tween.finished

# Kill existing tween before creating new one
if tween and tween.is_running():
    tween.kill()
var tween := create_tween()
```

**Common easing types:**
| Transition | Effect |
|------------|--------|
| `TRANS_LINEAR` | Constant speed |
| `TRANS_SINE` | Smooth sine curve |
| `TRANS_CUBIC` | Accelerate/decelerate |
| `TRANS_BOUNCE` | Bouncing effect |
| `TRANS_ELASTIC` | Spring/elastic effect |
| `TRANS_BACK` | Overshoot and return |

---

## 10. Audio

```gdscript
# Play one-shot sound
@onready var sfx: AudioStreamPlayer = $SFX

func play_sound(stream: AudioStream, volume_db: float = 0.0) -> void:
    sfx.stream = stream
    sfx.volume_db = volume_db
    sfx.play()

# Background music with crossfade
@onready var music_a: AudioStreamPlayer = $MusicA
@onready var music_b: AudioStreamPlayer = $MusicB

func crossfade_to(new_stream: AudioStream, duration: float = 1.0) -> void:
    var current := music_a if music_a.playing else music_b
    var next := music_b if current == music_a else music_a

    next.stream = new_stream
    next.volume_db = -80
    next.play()

    var tween := create_tween().set_parallel(true)
    tween.tween_property(current, "volume_db", -80, duration)
    tween.tween_property(next, "volume_db", 0, duration)
    await tween.finished
    current.stop()

# Audio buses (configured in Project Settings > Audio)
AudioServer.set_bus_volume_db(AudioServer.get_bus_index("SFX"), -10.0)
AudioServer.set_bus_mute(AudioServer.get_bus_index("Music"), true)
```

---

## 11. Common Patterns

### 11.1 State Machine

```gdscript
class_name StateMachine
extends Node

@export var initial_state: State
var current_state: State
var states: Dictionary = {}

func _ready() -> void:
    for child in get_children():
        if child is State:
            states[child.name.to_lower()] = child
            child.transitioned.connect(_on_child_transition)
    if initial_state:
        initial_state.enter()
        current_state = initial_state

func _process(delta: float) -> void:
    if current_state:
        current_state.update(delta)

func _physics_process(delta: float) -> void:
    if current_state:
        current_state.physics_update(delta)

func _on_child_transition(state: State, new_state_name: String) -> void:
    if state != current_state:
        return
    var new_state: State = states.get(new_state_name.to_lower())
    if not new_state:
        return
    current_state.exit()
    new_state.enter()
    current_state = new_state

# state.gd
class_name State
extends Node

signal transitioned(state: State, new_state_name: String)

func enter() -> void: pass
func exit() -> void: pass
func update(_delta: float) -> void: pass
func physics_update(_delta: float) -> void: pass
```

### 11.2 Object Pool

```gdscript
class_name ObjectPool
extends Node

@export var scene: PackedScene
@export var pool_size: int = 20

var _pool: Array[Node] = []

func _ready() -> void:
    for i in pool_size:
        var instance := scene.instantiate()
        instance.set_process(false)
        instance.set_physics_process(false)
        instance.visible = false
        add_child(instance)
        _pool.append(instance)

func acquire() -> Node:
    for obj in _pool:
        if not obj.visible:
            obj.visible = true
            obj.set_process(true)
            obj.set_physics_process(true)
            return obj
    # Pool exhausted — expand
    var instance := scene.instantiate()
    add_child(instance)
    _pool.append(instance)
    return instance

func release(obj: Node) -> void:
    obj.visible = false
    obj.set_process(false)
    obj.set_physics_process(false)
```

### 11.3 Event Bus

```gdscript
# event_bus.gd (autoload — NO class_name)
extends Node

# Game events
signal player_died
signal enemy_killed(enemy: Node, position: Vector2)
signal item_collected(item_id: String, quantity: int)
signal level_completed(level_number: int)
signal score_changed(new_score: int)
signal health_changed(current: int, maximum: int)

# UI events
signal show_dialog(text: String)
signal screen_shake(intensity: float, duration: float)
```

### 11.4 Scene Transition Manager

```gdscript
# scene_manager.gd (autoload)
extends CanvasLayer

@onready var color_rect: ColorRect = $ColorRect  # Full-screen overlay
@onready var anim: AnimationPlayer = $AnimationPlayer

func change_scene(path: String) -> void:
    anim.play("fade_out")
    await anim.animation_finished
    get_tree().change_scene_to_file(path)
    anim.play("fade_in")
    await anim.animation_finished
```

### 11.5 Camera Shake

```gdscript
extends Camera2D

var shake_intensity: float = 0.0
var shake_decay: float = 5.0

func shake(intensity: float, duration: float = 0.3) -> void:
    shake_intensity = intensity
    var tween := create_tween()
    tween.tween_property(self, "shake_intensity", 0.0, duration)

func _process(delta: float) -> void:
    if shake_intensity > 0:
        offset = Vector2(
            randf_range(-shake_intensity, shake_intensity),
            randf_range(-shake_intensity, shake_intensity)
        )
    else:
        offset = Vector2.ZERO
```

---

## 12. Project Structure

### Recommended Layout

```
my-game/
├── project.godot
├── export_presets.cfg
├── assets/
│   ├── sprites/
│   ├── audio/
│   │   ├── music/
│   │   └── sfx/
│   ├── fonts/
│   └── shaders/
├── scenes/
│   ├── main.tscn
│   ├── ui/
│   │   ├── hud.tscn
│   │   ├── main_menu.tscn
│   │   └── pause_menu.tscn
│   ├── levels/
│   │   ├── level_01.tscn
│   │   └── level_02.tscn
│   └── entities/
│       ├── player/
│       │   ├── player.tscn
│       │   └── player.gd
│       └── enemies/
│           ├── slime.tscn
│           └── slime.gd
├── scripts/
│   ├── autoload/
│   │   ├── game_manager.gd
│   │   ├── event_bus.gd
│   │   ├── audio_manager.gd
│   │   └── save_manager.gd
│   ├── components/
│   │   ├── health_component.gd
│   │   ├── hitbox_component.gd
│   │   └── state_machine.gd
│   └── resources/
│       ├── weapon_data.gd
│       └── item_data.gd
├── data/
│   ├── weapons/
│   │   ├── sword.tres
│   │   └── bow.tres
│   └── items/
│       └── potion.tres
└── addons/
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Script files | `snake_case.gd` | `player_controller.gd` |
| Scene files | `snake_case.tscn` | `main_menu.tscn` |
| Resource files | `snake_case.tres` | `fire_sword.tres` |
| Node names | `PascalCase` | `PlayerCharacter` |
| Variables | `snake_case` | `max_health` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_SPEED` |
| Signals | `snake_case` (past tense) | `health_changed` |
| Enums | `PascalCase` | `enum State { IDLE, RUNNING }` |
| class_name | `PascalCase` | `class_name WeaponData` |

---

## 13. Shaders Quick Reference

### 13.1 Canvas Item Shader (2D)

```gdshader
shader_type canvas_item;

uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float flash_amount : hint_range(0.0, 1.0) = 0.0;

void fragment() {
    vec4 tex_color = texture(TEXTURE, UV);
    COLOR = mix(tex_color, flash_color, flash_amount);
    COLOR.a = tex_color.a;
}
```

Apply flash from GDScript:
```gdscript
func flash() -> void:
    var material := sprite.material as ShaderMaterial
    material.set_shader_parameter("flash_amount", 1.0)
    var tween := create_tween()
    tween.tween_property(material, "shader_parameter/flash_amount", 0.0, 0.2)
```

### 13.2 Spatial Shader (3D)

```gdshader
shader_type spatial;

uniform sampler2D albedo_texture : source_color;
uniform float roughness : hint_range(0.0, 1.0) = 0.5;

void fragment() {
    ALBEDO = texture(albedo_texture, UV).rgb;
    ROUGHNESS = roughness;
    METALLIC = 0.0;
}
```

---

## 14. Debugging

```gdscript
# Breakpoints: click left margin in script editor

# Print debugging
print("Position: ", position)
print("State: %s, Health: %d" % [state, health])

# Debug drawing (2D)
func _draw() -> void:
    draw_circle(Vector2.ZERO, 50, Color.RED)
    draw_line(Vector2.ZERO, velocity, Color.GREEN, 2.0)
    draw_rect(Rect2(-16, -16, 32, 32), Color.BLUE, false, 2.0)
    queue_redraw()  # Call to trigger _draw() next frame

# Performance monitor
print(Engine.get_frames_per_second())
print(Performance.get_monitor(Performance.TIME_FPS))
print(Performance.get_monitor(Performance.OBJECT_NODE_COUNT))

# Remote scene tree: Run game, switch to "Remote" tab in Scene dock
```

---

## 15. Godot 4 Virtual Methods (Lifecycle)

| Method | Called When | Use For |
|--------|-----------|---------|
| `_init()` | Object construction | Initialize variables (no tree access) |
| `_enter_tree()` | Added to scene tree | Setup that needs tree but not children |
| `_ready()` | Node + all children are ready | Main initialization, signal connections |
| `_exit_tree()` | Removed from scene tree | Cleanup |
| `_process(delta)` | Every frame | Visual updates, input polling |
| `_physics_process(delta)` | Fixed timestep (60Hz) | Movement, physics |
| `_input(event)` | Every input event | Rarely used directly |
| `_unhandled_input(event)` | Input not consumed by UI | Game input |
| `_draw()` | When redraw requested | Custom 2D drawing |
| `_notification(what)` | Engine notifications | Advanced lifecycle hooks |

**Call order on scene load:**
1. `_init()` (all nodes, bottom-up)
2. `_enter_tree()` (top-down)
3. `_ready()` (bottom-up -- children ready before parents)

---

## 16. File System

```gdscript
# Read file
var file := FileAccess.open("user://config.json", FileAccess.READ)
if file:
    var content := file.get_as_text()
    file.close()

# Write file
var file := FileAccess.open("user://config.json", FileAccess.WRITE)
file.store_string(JSON.stringify(data))
file.close()

# Check existence
FileAccess.file_exists("user://save.json")
DirAccess.dir_exists_absolute("user://saves/")

# Create directory
DirAccess.make_dir_recursive_absolute("user://saves/slot1")

# List files
var dir := DirAccess.open("res://data/levels/")
if dir:
    dir.list_dir_begin()
    var file_name := dir.get_next()
    while file_name != "":
        if not dir.current_is_dir():
            print(file_name)
        file_name = dir.get_next()

# Path prefixes:
# res://  — project directory (read-only in export)
# user:// — writable user data directory
#   Windows: %APPDATA%/Godot/app_userdata/<project_name>/
#   Linux: ~/.local/share/godot/app_userdata/<project_name>/
#   macOS: ~/Library/Application Support/Godot/app_userdata/<project_name>/
```

---

## 17. Networking (High-Level Multiplayer)

```gdscript
# Host
func host_game(port: int = 9999) -> void:
    var peer := ENetMultiplayerPeer.new()
    peer.create_server(port)
    multiplayer.multiplayer_peer = peer

# Join
func join_game(address: String, port: int = 9999) -> void:
    var peer := ENetMultiplayerPeer.new()
    peer.create_client(address, port)
    multiplayer.multiplayer_peer = peer

# RPC
@rpc("any_peer", "call_local", "reliable")
func deal_damage(amount: int) -> void:
    health -= amount

# Spawn synchronization (MultiplayerSpawner node)
# Authority (MultiplayerSynchronizer node)

# Check authority
if multiplayer.is_server():
    pass
if is_multiplayer_authority():
    pass
var my_id := multiplayer.get_unique_id()  # 1 = server
```

---

## Quick Lookup Tables

### Vector2 / Vector3 Constants

| Constant | Value |
|----------|-------|
| `Vector2.ZERO` | `(0, 0)` |
| `Vector2.ONE` | `(1, 1)` |
| `Vector2.UP` | `(0, -1)` |
| `Vector2.DOWN` | `(0, 1)` |
| `Vector2.LEFT` | `(-1, 0)` |
| `Vector2.RIGHT` | `(1, 0)` |
| `Vector3.FORWARD` | `(0, 0, -1)` |
| `Vector3.BACK` | `(0, 0, 1)` |

### Common Math Constants

| Constant | Value |
|----------|-------|
| `PI` | `3.14159...` |
| `TAU` | `6.28318...` (2 * PI) |
| `INF` | Infinity |
| `NAN` | Not a number |

### Process Modes

| Mode | Runs When Paused | Use Case |
|------|-------------------|----------|
| `PROCESS_MODE_INHERIT` | Follows parent | Default |
| `PROCESS_MODE_PAUSABLE` | No | Normal game objects |
| `PROCESS_MODE_WHEN_PAUSED` | Yes (only when paused) | Pause menu |
| `PROCESS_MODE_ALWAYS` | Yes (always runs) | Music, analytics |
| `PROCESS_MODE_DISABLED` | Never | Inactive objects |
