# CCA (Confucius Code Agent) Integration

## Overview

The CCA Orchestrator MCP Server provides hierarchical memory and cross-session learning capabilities for the White Room project.

## What It Does

**Hierarchical Memory System:**
- Four-tier scope architecture (Repository → Submodule → Session → Task)
- Intelligent context compression (40-60% token reduction)
- Cross-session learning from resolved bd issues
- Pattern extraction and note generation

## Available Tools

### 1. `memory_store`
Store artifacts in the hierarchical memory system.

**Use when:**
- You learn something important during a task
- You discover a pattern or solution approach
- You encounter an error and its fix
- You make a design decision

**Example:**
```json
{
  "content": "Error: TypeScript compilation failed due to missing .js extensions in ES module imports",
  "type": "error_message",
  "scope": "repository",
  "tags": ["typescript", "esm", "imports"],
  "confidence": 1.0
}
```

### 2. `memory_retrieve`
Retrieve relevant context from hierarchical memory.

**Use when:**
- Starting a new task
- Encountering a similar problem
- Need historical context
- Looking for patterns or solutions

**Example:**
```json
{
  "query": "TypeScript ES module import errors",
  "activeScope": "repository"
}
```

### 3. `memory_create_task_scope`
Create a task-specific memory scope for bd issues.

**Use when:**
- Starting work on a bd task
- Need to isolate task-specific context
- Want to track task-level learning

**Example:**
```json
{
  "taskId": "white_room-123",
  "title": "Fix TypeScript compilation",
  "description": "Resolve ES module import issues"
}
```

### 4. `memory_query`
Get statistics about memory usage.

**Use when:**
- Checking memory system health
- Monitoring artifact counts
- Reviewing compression ratios

**Example:**
```json
{
  "scope": "repository"
}
```

### 5. `memory_clear_scope`
Clear a specific scope in memory.

**Use when:**
- Resetting task scope after completion
- Cleaning up test artifacts
- Managing memory size

**Example:**
```json
{
  "scope": "task",
  "taskId": "white_room-123"
}
```

## Artifact Types

- **pattern**: Reusable solutions, best practices
- **error_message**: Errors and their fixes
- **design_decision**: Architectural decisions
- **build_log**: Build issues and resolutions
- **test_result**: Test failures and fixes
- **conversation**: Important discussion summaries

## Scope Levels

- **repository** (10%): Project-wide patterns and conventions
- **submodule** (30%): Module-specific context (sdk, juce_backend, swift_frontend)
- **session** (30%): Cross-task session memory
- **task** (30%): Individual task context

## Best Practices

1. **Store Important Patterns**: When you solve a problem, store it with `memory_store`
2. **Retrieve Context**: Use `memory_retrieve` before starting similar tasks
3. **Use Task Scopes**: Create task scopes for bd issues to track task-specific learning
4. **Set Confidence**: Use `confidence: 1.0` for critical information
5. **Add Tags**: Use descriptive tags for better retrieval

## Integration with Beads

The CCA system automatically integrates with your bd task management:

- **Pattern Extraction**: Automatically extracts patterns from resolved issues
- **Note Generation**: Creates structured notes from closed bd tasks
- **Cross-Session Learning**: Remembers solutions across different work sessions

## Configuration

The CCA server is configured in `.claude/settings.json`:

```json
{
  "cca-orchestrator": {
    "command": "node",
    "args": ["cca-orchestrator-mcp/dist/index.js"],
    "env": {
      "CCA_REPOSITORY": "/Users/bretbouchard/apps/schill/white_room",
      "CCA_SUBMODULES": "sdk,juce_backend,swift_frontend",
      "CCA_STORAGE_PATH": ".beads/memory"
    }
  }
}
```

## Performance

- **Retrieval Latency**: <100ms average
- **Compression Ratio**: 40-60% token reduction
- **Storage**: Filesystem-based with sharding
- **Scalability**: Handles 100K+ artifacts

## Storage Location

Artifacts are stored in: `.beads/memory/`

Storage structure:
```
.beads/memory/
├── artifacts/
│   ├── a0/
│   ├── b1/
│   └── ...
└── index/
```

## Troubleshooting

**Server not starting:**
- Check that the MCP server is built: `cd cca-orchestrator-mcp && npm run build`
- Verify the path in settings.json is correct

**Tools not available:**
- Restart Claude Code after updating settings.json
- Check the MCP server logs for errors

**Memory not persisting:**
- Verify write permissions to `.beads/memory/`
- Check storage backend configuration

## Related Documentation

- **Performance**: `cca-memory/PERFORMANCE.md`
- **Phase 1 Summary**: `cca-memory/PHASE1-COMPLETION.md`
- **Implementation**: `cca-memory/README.md`

## Example Workflow

```bash
# 1. Start a new bd task
bd create "Fix TypeScript compilation"

# 2. Create task scope in CCA
memory_create_task_scope(taskId="white_room-123", ...)

# 3. Retrieve relevant context
memory_retrieve(query="TypeScript compilation errors")

# 4. Work on the task...

# 5. Store learned patterns
memory_store(
  type="pattern",
  content="Always add .js extensions for ES module imports",
  confidence=1.0
)

# 6. Close bd task
bd close white_room-123

# 7. CCA automatically extracts patterns and generates notes
```

---

**Status**: ✅ Production Ready
**Version**: 1.0.0 (Phase 1 Complete)
**Last Updated**: 2025-01-11
