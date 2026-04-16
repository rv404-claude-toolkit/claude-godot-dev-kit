# claude-godot-dev-kit

Godot 4 game engine toolkit for Claude Code. Adds a `godot` backend service to [mcp-launchpad](https://github.com/rv404-claude-toolkit/router-mcp) so Claude can parse, generate, validate, and inspect Godot projects directly.

## What It Does

- **Parse Godot projects** — read .tscn scenes, .tres resources, .gd scripts, and project.godot configs into structured JSON
- **Generate content** — scaffold new scenes, write GDScript files, create LimboAI behavior trees
- **Validate files** — check scene integrity, script syntax, and project conventions without running Godot

## Phase Status

| Phase | What | Status |
|-------|------|--------|
| 1. Filesystem Mode | Parse/generate/validate Godot files on disk | Done |
| 2. Knowledge + Agent | Godot 4 docs, LimboAI docs, specialist agent, /godot-ai skill | Planned |
| 3. Runtime Inspection | Live scene tree inspection via Godot debug protocol | Planned |

## Prerequisites

- [Claude Code](https://claude.ai/claude-code) installed
- [mcp-launchpad](https://github.com/rv404-claude-toolkit/router-mcp) configured as an MCP server
- Node.js 20+ (for mcp-launchpad)
- A Godot 4.x project to work with

## Quick Install

See [INSTALL.md](INSTALL.md) for detailed step-by-step instructions.

**TL;DR for Claude Code users:**

```
Tell your Claude: "Install the godot dev kit from rv404-claude-toolkit/claude-godot-dev-kit using the INSTALL.md instructions"
```

## Available Actions

All actions are called via mcp-launchpad:

```
route_request(service="godot", action="<action>", params={...})
```

| Action | Description | Phase |
|--------|-------------|-------|
| `list_project` | List all files in a Godot project | 1 |
| `read_project_config` | Parse project.godot settings | 1 |
| `parse_scene` | Parse .tscn/.tres into structured JSON | 1 |
| `scaffold_scene` | Generate a new .tscn scene file | 1 |
| `read_script` | Parse .gd script metadata | 1 |
| `write_script` | Generate a .gd script file | 1 |
| `analyze_conventions` | Detect project coding patterns | 1 |
| `validate_scene` | Validate scene file integrity | 1 |
| `validate_script` | Validate GDScript syntax (heuristic) | 1 |
| `scaffold_behavior_tree` | Generate LimboAI behavior tree .tres | 1 |
| `inspect_runtime` | Inspect running scene tree | 3 (stub) |
| `run_project` | Launch Godot project | 3 (stub) |

## Skills

| Skill | Trigger | What It Does |
|-------|---------|-------------|
| `/godot-build` | "new scene", "scaffold", "generate script", "behavior tree" | Create new Godot content |
| `/godot-scene` | "parse scene", "validate", "list project", "conventions" | Inspect and analyze existing content |
| `/godot-ai` | "behavior tree", "NPC AI", "LimboAI" | Design AI with LimboAI patterns (Phase 2) |

## Configuration

Set these environment variables (all optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `GODOT_PROJECT_PATH` | (none) | Default Godot project directory |
| `GODOT_EXECUTABLE_PATH` | (none) | Path to Godot executable (Phase 3) |
| `GODOT_DEBUG_HOST` | `localhost` | Debug connection host (Phase 3) |
| `GODOT_DEBUG_PORT` | `6007` | Debug connection port (Phase 3) |
| `GODOT_MAX_FILE_SIZE_MB` | `10` | Max file size for parsing |
| `GODOT_PARSER_TIMEOUT_MS` | `5000` | Parser timeout |

## Project Structure

```
claude-godot-dev-kit/
├── src/backends/godot/       # MCP backend (TypeScript)
│   ├── index.ts              # Backend entry point (12 actions)
│   ├── parser.ts             # .tscn/.tres/.gd parser
│   ├── generator.ts          # Scene/script/BT generators
│   ├── validator.ts          # Scene + script validation
│   ├── conventions.ts        # Project convention analyzer
│   ├── types.ts              # TypeScript interfaces
│   ├── errors.ts             # Error class hierarchy
│   ├── config.ts             # Configuration loader
│   ├── utils.ts              # Path security + file I/O
│   └── connection.ts         # Runtime connection (Phase 3 stub)
├── skills/
│   ├── godot-build/          # /godot-build skill
│   └── godot-scene/          # /godot-scene skill
├── agents/                   # Specialist agent (Phase 2)
├── knowledge/                # Godot docs + LimboAI docs (Phase 2)
├── docs/                     # Additional documentation
├── INSTALL.md                # Installation guide
├── CHANGELOG.md              # Version history
└── README.md                 # This file
```

## Security

- Zero external npm dependencies — uses only Node.js built-ins + existing mcp-launchpad deps
- All file access sandboxed to project directory (path traversal prevention)
- No network calls — filesystem only (Phase 1-2). Phase 3 connects to localhost only.
- No telemetry, no analytics, no API keys required
- Audited source: all code inspired by (but independent of) [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp) which was security-audited before development

## License

Internal toolkit — rv404 team use.
