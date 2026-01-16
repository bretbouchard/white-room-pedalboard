# White Room Code Style and Conventions

## Development Philosophy

### SLC (Simple, Lovable, Complete)
- **Simple**: Focused features, intuitive design, zero learning curve
- **Lovable**: Delights users, solves problems magically
- **Complete**: Fullfills core promise without workarounds
- **No compromises**: SLC overrides all other considerations

### Mandatory Rules
- **NO stub methods or TODO/FIXME** without actionable tickets
- **NO "good enough"** temporary solutions
- **NO workarounds** - build complete solutions
- **ALL work tracked in bd** - no exceptions

## TypeScript Conventions

### Style
- **2 spaces** for indentation
- **ESLint** with TypeScript ESLint parser
- **Strict mode** enabled
- **ES2020** target with ESNext modules
- **Bundler** module resolution

### Naming
- **camelCase** for variables and functions
- **PascalCase** for classes, interfaces, types
- **UPPER_SNAKE_CASE** for constants
- **kebab-case** for file names

### Type Safety
- **strict**: true in tsconfig
- **No implicit any**
- **Explicit return types** for public APIs
- **Type imports**: `import type { X }`

## Swift Conventions

### Style (swift-format)
```json
{
  "indentation": { "spaces": 2 },
  "lineLength": { "limit": 150 },
  "tabWidth": 2,
  "spacesAroundRangeOperators": false,
  "indentConditionalCompilationBlocks": true
}
```

### Naming
- **camelCase** for variables and functions
- **PascalCase** for types, protocols, enums
- **Prefix UI components** with semantic names

## C++ Conventions

### Style
- **C++17** standard
- **2 spaces** for indentation
- **snake_case** for functions and variables
- **PascalCase** for classes

### Real-time Safety
- **NO allocations** in audio thread
- **Deterministic execution** only
- **Lock-free** data structures for audio

## Architecture Conventions

### Authority Hierarchy
1. **TypeScript SDK** (Authoritative) - All musical decisions
2. **Audio Layer** (Consumer) - Renders audio, NO decision logic
3. **Swift** (Host) - UI and lifecycle, NO generation logic

### Execution Language
- Use **"voiceBus"** or **"executionLane"** instead of "track"

### Design Independence
- All visual aspects must be themeable
- Theme switching requires ZERO code changes

## Git Conventions

- **Feature branches** from main
- **Descriptive commit messages** with bd issue IDs: `[white_room-123] Fix build error`
- **PRs required** for main
