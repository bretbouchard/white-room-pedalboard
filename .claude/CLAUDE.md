# White Room Project - Claude AI Instructions

## Project Overview

White Room is a next-generation audio plugin development environment integrating JUCE backend (C++), Swift frontend, and Python tooling with AI-driven development workflows.

## Core Development Principles

### 🎸 **PLUGIN ARCHITECTURE CONTRACT (MANDATORY)**

**⚠️ CRITICAL: EVERY instrument/effect MUST follow these rules:**

1. **Separate Repository**: Each instrument/effect has its own GitHub repo
   - Example: `https://github.com/bretbouchard/biPhase.git`
   - NEVER add to `audio_agent_juce` repo directly

2. **Standard Folder Structure**:
   ```
   [NAME]/
   ├── plugins/              ← REQUIRED ROOT FOLDER
   │   ├── dsp/              ← Pure DSP (no wrapper)
   │   ├── vst/              ← VST3 build output
   │   ├── au/               ← AU build output
   │   ├── clap/             ← CLAP build output
   │   ├── lv2/              ← LV2 build output
   │   ├── auv3/             ← iOS AUv3 build output
   │   └── standalone/       ← Standalone app
   ├── include/              ← DSP headers
   ├── src/                  ← DSP implementation
   ├── tests/                ← Test harness
   ├── presets/              ← Factory presets
   └── CMakeLists.txt        ← Build config
   ```

3. **ALL 7 Formats Required**:
   - DSP, VST3, AU, CLAP, LV2, AUv3, Standalone
   - NO EXCEPTIONS (except individual pedals in Pedalboard)

4. **Implementation Order**:
   - DSP first (100% tested)
   - Then plugin wrapper
   - Then build all formats
   - Then test in DAWs

5. **Repository Hierarchy**:
   ```
   juce_backend/ (audio_agent_juce - parent)
   ├── effects/              ← Child repos
   │   ├── biPhase/          ← Own repo
   │   ├── filtergate/       ← Own repo
   │   └── pedalboard/       ← Own repo (except individual pedals)
   └── instruments/          ← Child repos
       └── [INSTRUMENT]/     ← Own repo
   ```

**📖 FULL CONTRACT**: See `.claude/PLUGIN_ARCHITECTURE_CONTRACT.md`

**❌ VIOLATIONS WILL RESULT IN ARCHITECTURAL DEBT**

---

### SLC Development Philosophy
- **Simple**: Focused features, intuitive design, zero learning curve
- **Lovable**: Delights users, solves problems magically
- **Complete**: Fulfills core promise without workarounds or gaps
- **No compromises**: SLC overrides all other considerations

### Task Management
- **ALL work must be tracked in `bd` (Beads)** - no exceptions
- Before starting any task: `bd ready --json` to check for existing work
- Create bd issues for ALL tasks (feature work, bugs, refactoring, docs)
- Link related issues with `discovered-from` dependencies

### Quality Standards
- No stub methods or TODO/FIXME without actionable tickets
- No "good enough" temporary solutions
- Every feature must be complete and production-ready
- Run validation before committing: `/validate`

---

## 🧠 Confucius - Hierarchical Memory System

### What is Confucius?

Confucius is an AI-powered hierarchical memory system that **automatically learns** from every closed bd issue and **retrieves relevant context** to help you work smarter.

### When to Use Confucius

#### ✅ ALWAYS Use Confucius When:

1. **Starting a New Task**
   ```
   Before beginning any work, ask: "Check Confucius for any patterns related to [task topic]"
   ```

2. **Encountering an Error**
   ```
   When you see an error, ask: "Search Confucius for patterns about [error type or component]"
   ```

3. **Making Design Decisions**
   ```
   Before deciding, ask: "What has Confucius learned about [topic] from past issues?"
   ```

4. **Repeating Work**
   ```
   If something feels familiar: "Check Confucius for similar past solutions"
   ```

5. **Learning About a Component**
   ```
   "What does Confucius know about [component/module]?"
   ```

#### ❌ DON'T Use Confucius For:

- Simple code syntax questions (use documentation directly)
- One-time calculations or transformations
- Tasks requiring real-time system status
- Questions completely unrelated to White Room

### How Confucius Works

#### Automatic Learning (Background)
When you close a bd issue, Confucius automatically:
1. Detects the closure
2. Extracts patterns and learnings
3. Stores as structured artifact in `.beads/memory/`
4. Tags with issue ID, labels, confidence score
5. **No action needed from you**

#### Manual Retrieval (On-Demand)
When you need past context:
1. Ask Claude to search Confucius
2. Confucius retrieves relevant artifacts
3. Injects context into current work
4. You get smarter solutions faster

### Confucius Tools Available

1. **`memory_retrieve`** - Search for relevant patterns
2. **`memory_store`** - Manually store important learnings
3. **`memory_create_task_scope`** - Auto-inject context for tasks
4. **`memory_query`** - Get statistics
5. **`memory_learning_status`** - Check if auto-learning is enabled
6. **`memory_clear_scope`** - Reset memory (rarely needed)

### Example Confucius Interactions

#### Before Starting Work:
```
"I'm starting work on fixing the JUCE build. Can you check Confucius for any
patterns about build errors, CMake configuration, or compilation issues?"
```

#### When Stuck:
```
"I'm getting a TypeScript module resolution error. What has Confucius learned
about ES modules, import paths, or TypeScript configuration?"
```

#### Before Making Decisions:
```
"What patterns has Confucius learned about audio plugin architecture from
past issues?"
```

#### After Learning Something:
```
"Store this in Confucius as a pattern: When fixing Swift UI preview crashes,
always check for missing @State bindings and ensure View conforms to Identifiable"
```

### Memory Scopes

Confucius organizes knowledge hierarchically:
- **Repository (10%)**: Project-wide patterns (architectural decisions, cross-cutting concerns)
- **Submodule (30%)**: Component-specific (sdk/, juce_backend/, swift_frontend/)
- **Session (30%)**: Current conversation context
- **Task (30%)**: Task-specific learnings

### Artifact Types

- `pattern` - Reusable solutions and approaches
- `error_message` - Common errors and fixes
- `design_decision` - Architectural decisions
- `build_log` - Build-related learnings
- `test_result` - Testing insights
- `conversation` - Important discussion summaries

---

## Development Workflow

### 1. Before Starting Any Work
```bash
# Check bd for existing work
bd ready --json

# Check Confucius for relevant patterns
"Check Confucius for patterns related to [your task]"
```

### 2. During Development
```bash
# Track work in bd
bd create [task description]

# Use Confucius when stuck
"What does Confucius know about [problem]?"
```

### 3. When Learning Something New
```
"Store this in Confucius: [your learning]"
```

### 4. Before Completing Work
```bash
# Run validation
/validate

# Close bd issue (triggers Confucius auto-learning)
bd close [issue-id]
```

---

## Project Structure

```
white_room/
├── sdk/                    # Shared TypeScript definitions
├── juce_backend/           # JUCE C++ audio plugin
├── swift_frontend/         # SwiftUI interface
├── daw_control/            # DAW integration layer
├── design_system/          # UI/UX components
├── infrastructure/         # Build, CI/CD, tooling
├── .beads/
│   └── memory/            # Confucius knowledge base
├── plans/                  # Implementation plans
├── specs/                  # Feature specifications
└── .claude/
    ├── settings.json       # MCP server configuration
    └── CLAUDE.md          # This file
```

---

## Key Technologies

- **Backend**: JUCE (C++), Python tooling
- **Frontend**: SwiftUI, Combine
- **SDK**: TypeScript (shared types)
- **Build**: CMake (JUCE), Swift Package Manager
- **Task Management**: Beads (bd)
- **AI Memory**: Confucius (hierarchical memory system)

---

## Build Artifact Management

### MANDATORY: Centralized Build System

**ALL build artifacts MUST be placed in `.build/` directory.**

**Build Directory Structure:**
```
.build/           # All build intermediates (gitignored)
├── xcode/       # Xcode builds
├── cmake/       # CMake builds
├── swift/       # Swift Package Manager builds
├── python/      # Python builds
└── temp/        # Temporary build files

.artifacts/      # Build outputs (gitignored)
├── ios/         # iOS apps
├── macos/       # macOS apps and plugins
└── plugins/     # VST3/AU plugins
```

### Agent Build Rules

**Before ANY Build Operation:**
1. Check if `.build/` exists: `ls -la .build/`
2. If not, run: `./build-config/scripts/setup-builds.sh`
3. Verify build location is correct

**During Build:**
1. Use centralized build paths
2. Never create `build/` in project root
3. Follow build system-specific conventions below

**After Build:**
1. Run: `./build-config/scripts/validate-builds.sh`
2. Fix any violations immediately
3. Store learnings in Confucius

### Build System Conventions

#### CMake (JUCE Plugins)
```bash
# Always use -B flag to specify build directory
cmake -B .build/cmake/<plugin-name> -S <source-dir>
cmake --build .build/cmake/<plugin-name>
```

#### Xcode (iOS/macOS Apps)
```bash
# Use derived data path
xcodebuild -project Project.xcodeproj \
  -derivedDataPath .build/xcode/DerivedData \
  -scheme SchemeName
```

#### Swift Package Manager
```bash
# Use scratch path
swift build --scratch-path .build/swift
```

#### Python
```bash
# Use build root
pip install . --build .build/python/build
```

### Build Cleanup

```bash
# Clean all build intermediates
./build-config/scripts/clean-builds.sh

# Clean everything including artifacts
./build-config/scripts/clean-builds.sh --all

# Validate build structure
./build-config/scripts/validate-builds.sh
```

### Violation Enforcement

**Any agent creating build artifacts outside `.build/` is in violation.**

**Validation:**
- Run `./build-config/scripts/validate-builds.sh --exit-code` in CI/CD
- Exit code 1 = violations found
- Must fix before merging

**See Also:**
- `/Users/bretbouchard/apps/schill/white_room/BUILD_STRUCTURE.md` - Full documentation
- `/Users/bretbouchard/apps/schill/white_room/.claude/BUILD_ENV.md` - Environment variables

---

## Common Patterns

### Build Issues
- Check Confucius: "Search for CMake, compilation, or linker patterns"
- Common: Missing .js extensions in TypeScript imports
- Common: Module resolution in tsconfig.json
- **Always** use `.build/cmake/` for CMake builds
- **Never** create `build/` in project root

### Testing
- Check Confucius: "What testing patterns exist?"
- Standard: Unit tests (vitest), Integration tests, E2E tests

### Git Workflow
- Feature branches from main
- Descriptive commit messages
- PRs required for main
- Use bd issue IDs in commits: `[white_room-123] Fix build error`

---

## Quality Checklist

Before considering any work complete:

- [ ] Tracked in bd (issue created or updated)
- [ ] Confucius consulted for relevant patterns
- [ ] SLC validation passed (no workarounds)
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] `/validate` passed
- [ ] Code reviewed (if applicable)
- [ ] Bd issue closed with resolution note

---

## Getting Help

1. **Check Confucius first** - Search for past solutions
2. **Check specs/** - Read feature specifications
3. **Check plans/** - Review implementation plans
4. **Use bd** - Create issue if blocked
5. **Ask team** - Escalate if needed

---

## Summary

**Confucius is your team's collective brain** - use it constantly!

- ✅ **Always check Confucius before starting work**
- ✅ **Store important learnings as you discover them**
- ✅ **Auto-learning happens when you close bd issues**
- ✅ **Retrieve context whenever you need past solutions**

The more you use Confucius, the smarter it gets!
