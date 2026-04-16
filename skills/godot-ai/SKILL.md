---
name: godot-ai
description: Design NPC AI using LimboAI behavior trees and state machines for Godot 4 games.
trigger: When user wants to design game AI, create behavior trees, or work with LimboAI.
also_trigger_on: "godot ai", "behavior tree", "BT", "NPC AI", "LimboAI", "state machine", "game AI", "patrol", "enemy AI"
---

# Godot AI -- LimboAI Behavior Trees & State Machines

## What This Skill Does

Designs and generates NPC AI for Godot 4 games using the **LimboAI** plugin (v1.7.x). Covers:
- Behavior Tree (BT) design with composites, decorators, actions, and conditions
- Blackboard system for shared NPC state
- Hierarchical State Machines (HSM) with event-driven transitions
- BT + HSM hybrid architectures via BTState
- Common AI patterns: patrol, combat, flee, idle, resource gathering

---

## Core Concepts

### Behavior Tree Fundamentals

A **Behavior Tree** is a hierarchical structure controlling agent behavior. Each node is a **task** that returns one of three statuses every tick:

| Status | Meaning |
|--------|---------|
| `SUCCESS` | Task completed successfully |
| `FAILURE` | Task did not succeed |
| `RUNNING` | Task needs more frames to complete |

The tree is processed top-to-bottom each physics frame. Tasks are organized into four categories:

| Category | Role | Can Have Children | Base Class |
|----------|------|-------------------|------------|
| **Action** | Leaf task that performs work | No | `BTAction` |
| **Condition** | Leaf task that checks state | No | `BTCondition` |
| **Composite** | Controls child execution order | Yes (multiple) | `BTComposite` |
| **Decorator** | Modifies single child behavior | Yes (one) | `BTDecorator` |

### Task Lifecycle

Every task has these virtual methods (all optional except `_tick`):

```gdscript
func _setup() -> void       # Called once before first execution
func _enter() -> void       # Called when task starts (status != RUNNING)
func _tick(delta) -> Status  # Called every frame -- REQUIRED, return SUCCESS/FAILURE/RUNNING
func _exit() -> void        # Called after tick returns SUCCESS or FAILURE
func _generate_name() -> String  # Editor display name (requires @tool)
```

Execution order per tick: `_enter()` (if fresh) -> `_tick()` -> `_exit()` (if done)

---

## Complete LimboAI Task Reference

### Composites (Control Flow -- Multiple Children)

| Class | Behavior |
|-------|----------|
| **BTSequence** | Executes children left-to-right. Fails immediately if any child fails. Succeeds when all succeed. (AND logic) |
| **BTSelector** | Executes children left-to-right. Succeeds immediately when any child succeeds. Fails only if all fail. (OR logic) |
| **BTDynamicSequence** | Like Sequence but re-evaluates from the first child every tick. Good for priority-based checks. |
| **BTDynamicSelector** | Like Selector but re-evaluates from the first child every tick. Good for reactive priority systems. |
| **BTParallel** | Executes ALL children every tick simultaneously (not multithreaded). Configurable success/failure thresholds via `num_successes_required` and `num_failures_required`. Optional `repeat` mode. |
| **BTRandomSelector** | Like Selector but shuffles child order randomly each execution. |
| **BTRandomSequence** | Like Sequence but shuffles child order randomly each execution. |
| **BTProbabilitySelector** | Chooses one child to execute based on weighted probabilities. |

### Decorators (Modify Single Child)

| Class | Behavior | Key Properties |
|-------|----------|----------------|
| **BTAlwaysFail** | Forces child result to FAILURE | -- |
| **BTAlwaysSucceed** | Forces child result to SUCCESS | -- |
| **BTInvert** | Flips SUCCESS <-> FAILURE | -- |
| **BTCooldown** | Blocks re-execution for a duration after completion | `duration: float`, `start_cooled: bool`, `trigger_on_failure: bool`, `cooldown_state_var: StringName` |
| **BTDelay** | Waits before executing child | `seconds: float` |
| **BTRepeat** | Repeats child N times or forever | `times: int`, `forever: bool`, `abort_on_failure: bool` |
| **BTRepeatUntilFailure** | Repeats child until it returns FAILURE | -- |
| **BTRepeatUntilSuccess** | Repeats child until it returns SUCCESS | -- |
| **BTRunLimit** | Allows child to execute only N times total | `run_limit: int` |
| **BTTimeLimit** | Aborts child if it takes too long | `time_limit: float` |
| **BTProbability** | Executes child only with a given probability | `run_chance: float` |
| **BTForEach** | Iterates an array, executing child per element | `array_var: StringName`, `save_var: StringName` |
| **BTNewScope** | Creates a new Blackboard scope for child | -- |
| **BTSubtree** | Loads and runs a separate BehaviorTree resource | `subtree: BehaviorTree` |

### Actions (Leaf -- Do Something)

| Class | Behavior | Key Properties |
|-------|----------|----------------|
| **BTWait** | Waits for duration, then returns SUCCESS | `duration: float` |
| **BTRandomWait** | Waits random duration in range | `min_duration: float`, `max_duration: float` |
| **BTWaitTicks** | Waits for N ticks | `num_ticks: int` |
| **BTCallMethod** | Calls a method on a Node/Object | `method: StringName`, `node: BBNode`, `args: Array` |
| **BTConsolePrint** | Prints text to console | `text: String` |
| **BTEvaluateExpression** | Evaluates a GDScript expression | `expression: String`, `node: BBNode` |
| **BTFail** | Always returns FAILURE | -- |
| **BTPlayAnimation** | Plays animation on AnimationPlayer | `animation_player: BBNode`, `animation_name: StringName`, `blend: float`, `speed: float`, `await_completion: float` |
| **BTAwaitAnimation** | Waits for animation to finish | `animation_player: BBNode`, `max_duration: float` |
| **BTPauseAnimation** | Pauses AnimationPlayer | `animation_player: BBNode` |
| **BTStopAnimation** | Stops AnimationPlayer | `animation_player: BBNode` |
| **BTSetAgentProperty** | Sets a property on the agent node | `property: StringName`, `value: BBVariant` |
| **BTSetVar** | Sets a Blackboard variable | `variable: StringName`, `value: BBVariant`, `operation: Operation` |

### Conditions (Leaf -- Check Something)

| Class | Behavior | Key Properties |
|-------|----------|----------------|
| **BTCheckVar** | Checks a Blackboard variable against a value | `variable: StringName`, `value: BBVariant`, `check_type: CheckType` |
| **BTCheckTrigger** | Checks and consumes a boolean trigger variable | `variable: StringName` |
| **BTCheckAgentProperty** | Checks an agent node property | `property: StringName`, `value: BBVariant`, `check_type: CheckType` |

### Other

| Class | Purpose |
|-------|---------|
| **BTComment** | Adds annotations/notes to a BehaviorTree (no execution) |
| **BTPlayer** | Node that runs a BehaviorTree resource on an agent |
| **BTState** | LimboState that hosts a BehaviorTree (for HSM integration) |

---

## Blackboard System

The **Blackboard** is a key/value store shared between BT tasks and HSM states. Each BT instance gets its own Blackboard.

### Reading and Writing Variables

```gdscript
# In a custom task (_tick method):
var target = blackboard.get_var("target", null)       # get with default
blackboard.set_var("speed", 200.0)                     # set
if blackboard.has_var("waypoint"):                      # check existence
    var wp = blackboard.get_var("waypoint")

# For potentially freed objects, always validate:
var obj = blackboard.get_var("target")
if is_instance_valid(obj):
    # safe to use
```

### BBParam Types

Export parameters that read from Blackboard OR use a literal value:

```gdscript
@export var speed: BBFloat
@export var target: BBNode
@export var name: BBString

func _tick(delta: float) -> Status:
    var current_speed: float = speed.get_value(scene_root, blackboard, 0.0)
    var target_node: Node2D = target.get_value(scene_root, blackboard)
```

Available BBParam types: `BBInt`, `BBFloat`, `BBBool`, `BBString`, `BBNode`, `BBVector2`, `BBVector3`, `BBColor`, `BBArray`, `BBDictionary`, `BBVariant`, and many more.

### BlackboardPlan

The **BlackboardPlan** resource defines which variables exist, their types, and default values. Configured in the LimboAI editor or on a BTPlayer node.

```
# In .tres format:
[sub_resource type="BlackboardPlan" id="BlackboardPlan_abc"]
var/speed/name = &"speed"
var/speed/type = 3          # Variant type (3 = float)
var/speed/value = 400.0
var/speed/hint = 1          # RANGE hint
var/speed/hint_string = "10,1000,10"
```

### Variable Scoping

Blackboards support parent-child scope chains. When a variable is not found locally, the system searches parent scopes.

New scopes are created by:
- `BTNewScope` decorator
- `BTSubtree` decorator
- `LimboState` nodes with non-empty plans
- `LimboHSM` nodes

Access root scope: `blackboard.top().set_var("shared_target", target)`

### Sharing Data Between Agents

```gdscript
# Link multiple agents to a shared scope:
var shared_bb = Blackboard.new()
agent1.get_node("BTPlayer").blackboard.set_parent(shared_bb)
agent2.get_node("BTPlayer").blackboard.set_parent(shared_bb)

# Now both agents can read/write shared variables
shared_bb.set_var("group_target", enemy)
```

### Variable Mapping (BT <-> HSM)

When using BTState inside an HSM, map variables between scopes:

```gdscript
var hsm_bb = hsm.get_blackboard()
var bt_bb = bt_state.get_blackboard()
bt_bb.link_var("target_pos", hsm_bb, "target_pos")  # Bidirectional link
```

---

## Hierarchical State Machines (HSM)

LimboAI provides **LimboHSM** -- an event-based hierarchical state machine that manages **LimboState** instances.

### Setting Up an HSM

```gdscript
@onready var hsm: LimboHSM = $LimboHSM

func _ready() -> void:
    _init_state_machine()

func _init_state_machine() -> void:
    var idle_state = LimboState.new().named("Idle") \
        .call_on_enter(func(): animation_player.play("idle")) \
        .call_on_update(_idle_update)

    var combat_state = LimboState.new().named("Combat") \
        .call_on_enter(func(): animation_player.play("combat_ready")) \
        .call_on_update(_combat_update)

    hsm.add_child(idle_state)
    hsm.add_child(combat_state)

    # Transitions: from_state, to_state, event_name, optional guard
    hsm.add_transition(idle_state, combat_state, &"enemy_spotted")
    hsm.add_transition(combat_state, idle_state, &"enemy_lost")
    hsm.add_transition(hsm.ANYSTATE, idle_state, &"reset")  # From any state

    hsm.initial_state = idle_state
    hsm.initialize(self)
    hsm.set_active(true)
```

### LimboState Virtual Methods

```gdscript
func _setup() -> void          # Called once during initialization
func _enter() -> void          # Called when state becomes active
func _exit() -> void           # Called when leaving state
func _update(delta) -> void    # Called each frame while active
```

### Event Dispatch

Events propagate from leaf state to root. Consumed when matched by a transition or handler.

```gdscript
# Dispatch from inside a state:
dispatch(&"enemy_spotted")

# With cargo (optional data):
dispatch(&"take_damage", { amount = 10 })

# Receive cargo in handler:
func _on_damage(cargo = null) -> bool:
    health -= cargo.amount
    return true  # consumed
```

### Guard Functions

Prevent transitions conditionally:

```gdscript
hsm.add_transition(idle, combat, &"enemy_spotted", _can_enter_combat)

func _can_enter_combat() -> bool:
    return health > 20  # Don't fight if low HP
```

### Update Modes

| Mode | When Updated |
|------|-------------|
| `IDLE` | During idle process |
| `PHYSICS` | During physics process (default) |
| `MANUAL` | Only when you call `hsm.update(delta)` |

---

## BT + HSM Hybrid Architecture

Use **BTState** to run behavior trees inside state machine states. This is the most powerful pattern for complex NPCs.

```gdscript
func _init_state_machine() -> void:
    hsm = LimboHSM.new()
    add_child(hsm)

    # BTState runs a BehaviorTree as an HSM state
    var patrol_state = BTState.new()
    patrol_state.name = "Patrol"
    patrol_state.behavior_tree = preload("res://ai/trees/patrol.tres")
    patrol_state.success_event = &"patrol_done"    # Dispatched on BT SUCCESS
    patrol_state.failure_event = &"patrol_failed"  # Dispatched on BT FAILURE

    var combat_state = BTState.new()
    combat_state.name = "Combat"
    combat_state.behavior_tree = preload("res://ai/trees/combat.tres")
    combat_state.success_event = &"enemy_defeated"
    combat_state.failure_event = &"retreat"

    var flee_state = BTState.new()
    flee_state.name = "Flee"
    flee_state.behavior_tree = preload("res://ai/trees/flee.tres")

    hsm.add_child(patrol_state)
    hsm.add_child(combat_state)
    hsm.add_child(flee_state)

    hsm.add_transition(patrol_state, combat_state, &"enemy_spotted")
    hsm.add_transition(combat_state, patrol_state, &"enemy_defeated")
    hsm.add_transition(combat_state, flee_state, &"retreat")
    hsm.add_transition(flee_state, patrol_state, &"safe")
    hsm.add_transition(hsm.ANYSTATE, flee_state, &"critical_health")

    hsm.initial_state = patrol_state
    hsm.initialize(self)
    hsm.set_active(true)
```

---

## Writing Custom Tasks

### Custom Action

```gdscript
@tool
extends BTAction
## Pursue target until within attack range.
## Returns RUNNING while moving, SUCCESS when in range, FAILURE if target invalid.

@export var target_var: StringName = &"target"
@export var speed_var: StringName = &"speed"
@export var attack_range: float = 100.0

func _generate_name() -> String:
    return "Pursue %s" % [LimboUtility.decorate_var(target_var)]

func _tick(delta: float) -> Status:
    var target: Node2D = blackboard.get_var(target_var, null)
    if not is_instance_valid(target):
        return FAILURE

    var dist = agent.global_position.distance_to(target.global_position)
    if dist < attack_range:
        return SUCCESS

    var speed: float = blackboard.get_var(speed_var, 200.0)
    var dir = agent.global_position.direction_to(target.global_position)
    agent.velocity = dir * speed
    agent.move_and_slide()
    return RUNNING
```

### Custom Condition

```gdscript
@tool
extends BTCondition
## Check if agent health is below threshold.
## Returns SUCCESS if health is low, FAILURE otherwise.

@export var health_threshold: float = 30.0
@export var health_var: StringName = &"health"

func _generate_name() -> String:
    return "IsLowHealth (< %.0f)" % health_threshold

func _tick(_delta: float) -> Status:
    var health: float = blackboard.get_var(health_var, 100.0)
    if health < health_threshold:
        return SUCCESS
    return FAILURE
```

### File Organization

Place custom tasks in `res://ai/tasks/`. Subdirectories become categories:
```
res://ai/tasks/
  movement/
    pursue.gd
    flee.gd
    patrol_waypoint.gd
  combat/
    attack_melee.gd
    attack_ranged.gd
  conditions/
    in_range.gd
    is_low_health.gd
    has_target.gd
```

---

## Common BT Patterns

### Pattern 1: Simple Melee NPC

```
BTSequence "Root"
  BTSequence "Find Target"
    BTAction:GetFirstInGroup (group="player")
    BTCondition:InRange (distance_max=500)
  BTSelector "Behave"
    BTSequence "Attack" [BTCooldown duration=2.0]
      BTCondition:InRange (distance_max=100)
      BTAction:FaceTarget
      BTPlayAnimation "attack"
    BTSequence "Pursue"
      BTPlayAnimation "walk"
      BTAction:Pursue [BTTimeLimit 3.0]
    BTSequence "Idle"
      BTPlayAnimation "idle"
      BTRandomWait (0.5, 1.5)
```

### Pattern 2: Ranged Attacker with Kiting

```
BTSelector "Root"
  BTSequence "Flee If Too Close"
    BTCondition:InRange (distance_max=80)
    BTPlayAnimation "walk" (speed=-1.0)
    BTAction:BackAway [BTTimeLimit 1.5]
  BTSequence "Ranged Attack" [BTCooldown duration=3.0]
    BTCondition:InRange (distance_max=400)
    BTAction:FaceTarget
    BTPlayAnimation "attack_ranged" (await_completion=2.0)
  BTSequence "Approach"
    BTPlayAnimation "walk"
    BTAction:Pursue [BTTimeLimit 2.0]
  BTSequence "Idle"
    BTPlayAnimation "idle"
    BTRandomWait (1.0, 2.0)
```

### Pattern 3: Patrol with Alert States (HSM + BT)

**patrol.tres:**
```
BTSequence "Patrol"
  BTRepeat (forever=true)
    BTSequence
      BTAction:SelectNextWaypoint
      BTPlayAnimation "walk"
      BTAction:MoveToPosition [BTTimeLimit 5.0]
      BTPlayAnimation "idle"
      BTRandomWait (1.0, 3.0)
```

**combat.tres:**
```
BTSelector "Combat"
  BTSequence "Attack" [BTCooldown 1.5]
    BTCondition:InRange (distance_max=120)
    BTAction:FaceTarget
    BTPlayAnimation "attack" (await_completion=2.0)
  BTSequence "Chase"
    BTPlayAnimation "run"
    BTAction:Pursue [BTTimeLimit 4.0]
  BTSequence "Lost Target"
    BTAction:LookAround
    BTSetVar (variable="target", value=null)
    -- BT returns FAILURE, HSM dispatches "patrol_failed" -> transitions back to patrol
```

### Pattern 4: Skirmisher (Hit-and-Run)

```
BTSelector "Root"
  BTRunLimit (1)
    BTSequence "Summoning Sickness"
      BTAction:GetFirstInGroup (group="player")
      BTPlayAnimation "idle"
      BTRandomWait (2.0, 3.0)
  BTSequence "Melee Attack" [BTCooldown 2.0]
    BTCondition:InRange (distance_max=300)
    BTPlayAnimation "walk" (speed=1.2)
    BTAction:Pursue [BTTimeLimit 1.0]
    BTAction:FaceTarget
    BTWait (0.2)
    BTPlayAnimation "attack" (await_completion=2.0)
  BTSequence "Disengage"
    BTCondition:InRange (distance_max=300)
    BTPlayAnimation "walk" (speed=-0.7)
    BTAction:BackAway [BTTimeLimit 1.5] [BTAlwaysSucceed]
    BTPlayAnimation "idle"
    BTRandomWait
  BTSequence "Flank"
    BTPlayAnimation "walk" (speed=1.2)
    BTAction:SelectFlankingPos (side=BACK, range=90)
    BTAction:ArrivePos [BTTimeLimit]
```

### Pattern 5: Boss with Phases

```
BTSelector "Root"
  BTSequence "Phase 2: Enraged" [BTCondition:CheckVar health < 50]
    BTSelector
      BTSequence "AoE Attack" [BTCooldown 5.0]
        BTPlayAnimation "charge_aoe" (await_completion=3.0)
        BTAction:SpawnAoE
      BTSequence "Fast Combo" [BTCooldown 2.0]
        BTCondition:InRange (distance_max=150)
        BTAction:FaceTarget
        BTPlayAnimation "combo_attack" (await_completion=4.0)
      BTAction:Pursue [BTTimeLimit 3.0]
  BTSelector "Phase 1: Normal"
    BTSequence "Melee" [BTCooldown 2.0]
      BTCondition:InRange (distance_max=120)
      BTAction:FaceTarget
      BTPlayAnimation "attack" (await_completion=2.0)
    BTSequence "Approach"
      BTPlayAnimation "walk"
      BTAction:Pursue [BTTimeLimit 3.0]
    BTSequence "Idle"
      BTPlayAnimation "idle"
      BTRandomWait (0.5, 1.5)
```

### Pattern 6: Resource Gatherer

```
BTSelector "Root"
  BTSequence "Deposit Resources" [BTCondition:CheckVar inventory_full == true]
    BTAction:FindNearestDeposit
    BTPlayAnimation "walk"
    BTAction:MoveTo (target_var="deposit") [BTTimeLimit 10.0]
    BTPlayAnimation "deposit" (await_completion=2.0)
    BTAction:TransferResources
    BTSetVar (variable="inventory_full", value=false)
  BTSequence "Gather"
    BTAction:FindNearestResource
    BTPlayAnimation "walk"
    BTAction:MoveTo (target_var="resource") [BTTimeLimit 10.0]
    BTPlayAnimation "gather" (await_completion=3.0)
    BTAction:CollectResource
  BTSequence "Wander"
    BTAction:SelectRandomNearbyPos
    BTPlayAnimation "walk"
    BTAction:MoveTo [BTTimeLimit 5.0]
```

---

## Generating Behavior Trees

### Using MCP Launchpad

Call the godot service to generate .tres BT files:

```
route_request(service="godot", action="scaffold_behavior_tree", params={
  projectPath: "<godot project path>",
  treePath: "res://ai/trees/my_npc.tres",
  blackboardVars: [
    { name: "speed", type: "float", value: 400.0, hint: "range", hintString: "10,1000,10" },
    { name: "target", type: "Object", value: null },
    { name: "health", type: "float", value: 100.0 }
  ],
  tree: {
    type: "BTSelector",
    name: "Root",
    children: [
      {
        type: "BTSequence",
        name: "Attack",
        decorator: { type: "BTCooldown", duration: 2.0 },
        children: [
          { type: "BTCondition", name: "InRange", script: "res://ai/tasks/conditions/in_range.gd",
            properties: { distance_max: 120.0, target_var: "target" } },
          { type: "BTAction", name: "FaceTarget", script: "res://ai/tasks/movement/face_target.gd" },
          { type: "BTPlayAnimation", animation_name: "attack", await_completion: 2.0,
            animation_player: "AnimationPlayer" }
        ]
      },
      {
        type: "BTSequence",
        name: "Pursue",
        children: [
          { type: "BTPlayAnimation", animation_name: "walk", blend: 0.1 },
          {
            type: "BTAction", name: "Pursue", script: "res://ai/tasks/movement/pursue.gd",
            decorator: { type: "BTTimeLimit", time_limit: 3.0 }
          }
        ]
      },
      {
        type: "BTSequence",
        name: "Idle",
        children: [
          { type: "BTPlayAnimation", animation_name: "idle", blend: 0.1 },
          { type: "BTRandomWait", min_duration: 0.5, max_duration: 1.5 }
        ]
      }
    ]
  }
})
```

### Specification Format

When specifying a BT, use this structure:

```json
{
  "type": "BTCompositeOrDecorator",
  "name": "Optional display name",
  "script": "res://path/to/custom_task.gd (for custom actions/conditions)",
  "properties": { "key": "value pairs for exported vars" },
  "decorator": { "type": "BTDecoratorType", "...decorator props" },
  "children": [ "...child nodes" ]
}
```

Built-in actions use their class name directly (e.g., `BTPlayAnimation`, `BTWait`).
Custom actions use `BTAction` with a `script` property pointing to the .gd file.
Custom conditions use `BTCondition` with a `script` property.

---

## Accessing Scene Nodes from Tasks

Three methods to access nodes from inside BT tasks:

### 1. BBNode Export (Recommended)

```gdscript
@export var animation_player: BBNode

func _tick(delta: float) -> Status:
    var anim: AnimationPlayer = animation_player.get_value(scene_root, blackboard)
```

### 2. Direct NodePath

```gdscript
@export var target_path: NodePath

func _tick(delta: float) -> Status:
    var node = scene_root.get_node(target_path)
```

### 3. Blackboard NodePath Variable

Define a NodePath variable in the BlackboardPlan. With `BTPlayer.prefetch_nodepath_vars = true`, NodePath variables are automatically converted to node references at runtime.

```gdscript
var anim_player = blackboard.get_var("animation_player")
```

---

## Debugging

- **LimboAI Debugger**: Bottom Panel -> Debugger -> LimboAI tab
- Shows active BTs in real-time with task statuses
- Inspect Blackboard variables grouped by scope
- Edit variables live during runtime
- Can be detached for multi-monitor setups
- **Performance Monitor**: Enable `monitor_performance` on BTPlayer/BTState for timing data

---

## Design Workflow

When a user requests NPC AI:

1. **Clarify the behavior**: What should the NPC do? (patrol, attack, flee, gather, etc.)
2. **Identify states**: Does it need an HSM? (multiple distinct behavioral modes = yes)
3. **Design the BT structure**: Map out the tree using composites and decorators
4. **Define Blackboard variables**: What data does the NPC need to share between tasks?
5. **Identify custom tasks**: Which behaviors need custom GDScript?
6. **Generate**: Use `scaffold_behavior_tree` to create the .tres file
7. **Generate custom tasks**: Use `write_script` for any custom action/condition scripts

### Decision: BT-Only vs HSM+BT

| Use BT Only When | Use HSM + BT When |
|---|---|
| Single behavioral loop (attack/patrol) | Multiple distinct modes (patrol/combat/flee) |
| Simple priority-based decisions | State-dependent behavior changes |
| No complex transitions needed | Need guard conditions on transitions |
| Reactive moment-to-moment AI | Long-running states with BT logic inside |

---

## Quick Reference: Blackboard Variable Naming

Convention: use `_var` suffix on export properties that reference Blackboard variable names.

```gdscript
@export var target_var: StringName = &"target"     # BB variable name
@export var speed_var: StringName = &"speed"        # BB variable name
@export var health_var: StringName = &"health"      # BB variable name
@export var position_var: StringName = &"pos"       # BB variable name
```

This enables the LimboAI editor to provide a variable picker dropdown.
