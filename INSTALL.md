# Installation Guide

Step-by-step instructions for installing the Godot Dev Kit into your Claude Code environment.

## What Gets Installed

1. **Godot backend** — TypeScript files added to your mcp-launchpad instance
2. **Skills** — `/godot-build` and `/godot-scene` added to your Claude Code skills
3. **Agent** — Godot specialist agent (Phase 2)
4. **Knowledge base** — Godot 4 + LimboAI docs (Phase 2)

## Prerequisites

Before installing, make sure you have:

- [ ] Claude Code installed and working
- [ ] mcp-launchpad cloned and configured as an MCP server
- [ ] Node.js 20+ installed
- [ ] A Godot 4.x project to test with

## Step 1: Clone This Repo

```bash
git clone https://github.com/rv404-claude-toolkit/claude-godot-dev-kit.git
cd claude-godot-dev-kit
```

## Step 2: Install the MCP Backend

Copy the godot backend files into your mcp-launchpad installation:

```bash
# Replace <MCP_LAUNCHPAD_PATH> with your mcp-launchpad directory
cp -r src/backends/godot/ <MCP_LAUNCHPAD_PATH>/src/backends/godot/
```

### Register the Backend

Edit `<MCP_LAUNCHPAD_PATH>/src/backends/index.ts` — add these lines:

```typescript
// At the top, with other imports:
import { godotBackend } from './godot/index.js';

// Inside registerAllBackends(), with other registrations:
router.registerBackend('godot', godotBackend);
```

### Add to SERVICES

Edit `<MCP_LAUNCHPAD_PATH>/src/types.ts`:

1. Add `'godot'` to the `SERVICES` array:
```typescript
export const SERVICES = [...existing..., 'godot'] as const;
```

2. Add timeout config in `DEFAULT_TIMEOUTS`:
```typescript
godot: 15000,
```

3. Add action timeout overrides in `ACTION_TIMEOUT_OVERRIDES`:
```typescript
godot: {
  scaffold_scene: 30000,
  write_script: 30000,
  validate_scene: 30000,
  validate_script: 30000,
  scaffold_behavior_tree: 30000,
},
```

### Build

```bash
cd <MCP_LAUNCHPAD_PATH>
npm run build
```

Verify it compiles with zero errors.

## Step 3: Install Skills

Copy the skill directories to your Claude Code skills folder:

```bash
# Linux/macOS
cp -r skills/godot-build/ ~/.claude/skills/godot-build/
cp -r skills/godot-scene/ ~/.claude/skills/godot-scene/

# Windows
xcopy /E /I skills\godot-build "%USERPROFILE%\.claude\skills\godot-build"
xcopy /E /I skills\godot-scene "%USERPROFILE%\.claude\skills\godot-scene"
```

## Step 4: Configure (Optional)

Set the `GODOT_PROJECT_PATH` environment variable to your default Godot project:

```bash
# Linux/macOS — add to ~/.bashrc or ~/.zshrc
export GODOT_PROJECT_PATH="/path/to/your/godot/project"

# Windows — add to system environment variables
setx GODOT_PROJECT_PATH "C:\path\to\your\godot\project"
```

This is optional — you can also pass `projectPath` as a parameter to every action.

## Step 5: Verify Installation

In Claude Code, test the backend:

```
Tell Claude: "List the files in my Godot project at <YOUR_PROJECT_PATH>"
```

Or call directly:
```
route_request(service="godot", action="list_project", params={projectPath: "<YOUR_PROJECT_PATH>"})
```

You should see a list of .tscn, .tres, and .gd files.

## Troubleshooting

### "Unknown service: godot"
- Make sure you added `'godot'` to the `SERVICES` const in types.ts
- Make sure you registered the backend in backends/index.ts
- Rebuild mcp-launchpad: `npm run build`

### TypeScript compile errors
- Make sure all imports use `.js` extensions (ESM convention)
- Check that your mcp-launchpad has the `Backend` interface in types.ts
- Try: `npx tsc --noEmit` to see detailed errors

### "Godot project not found"
- Check that your project path points to a directory containing `project.godot`
- Use absolute paths, not relative

### Skills not showing up
- Verify the SKILL.md files are in the correct directory
- Restart Claude Code to pick up new skills
- Check that the skill frontmatter (name, description, trigger) is valid

## Updating

When new phases are released:

```bash
cd claude-godot-dev-kit
git pull
```

Then repeat Step 2 (copy new/updated backend files) and rebuild mcp-launchpad.

## Uninstalling

1. Remove `src/backends/godot/` from mcp-launchpad
2. Remove the import and registration lines from `backends/index.ts`
3. Remove `'godot'` from `SERVICES` in `types.ts`
4. Remove timeout config entries
5. Rebuild mcp-launchpad
6. Delete skill directories from `~/.claude/skills/`
