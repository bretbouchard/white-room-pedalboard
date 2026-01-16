# tvOS Build Configuration Guide

**Status**: tvOS Branch (Local-Only Architecture)
**Last Updated**: 2025-12-31

---

## Overview

The tvOS build creates a **local-only** version of the Schillinger SDK optimized for Apple TV with these constraints:

- ✅ JavaScriptCore embedding
- ✅ IR-based music generation
- ✅ Local caching (in-memory)
- ❌ No networking
- ❌ No authentication
- ❌ No cloud sync

---

## Build Configuration

### TypeScript Compilation

Use `tsconfig.tvos.json` for tvOS builds:

```bash
# Build for tvOS
tsc -p tsconfig.tvos.json
```

**Excluded Packages:**
- `packages/gateway/` - Backend communication
- `packages/audio/` - Audio (delegated to JUCE)
- `src/realtime/realtime-*.ts` - WebSocket collaboration
- `src/collaboration/` - Multi-user features
- `src/auth/` - Authentication

**Included Packages:**
- `packages/shared/` - Types and utilities
- `packages/core/` - Generators and planning
- `packages/analysis/` - Reverse analysis
- `packages/generation/` - AI-assisted generation

---

## Build Targets

### Development Build

```bash
# Clean build
rm -rf dist/tvos

# Compile TypeScript
npm run build:tvos

# Bundle for JSCore
npm run bundle:tvos
```

### Production Build

```bash
# Minified bundle
npm run bundle:tvos:prod

# Generate source maps (for debugging)
npm run bundle:tvos:sourcemaps
```

---

## Package.json Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "build:tvos": "tsc -p tsconfig.tvos.json",
    "bundle:tvos": "webpack --config webpack.tvos.config.js",
    "bundle:tvos:prod": "webpack --config webpack.tvos.config.js --mode production",
    "bundle:tvos:sourcemaps": "webpack --config webpack.tvos.config.js --mode production --devtool source-map",
    "test:tvos": "vitest run --config vitest.tvos.config.ts",
    "validate:tvos": "npm run build:tvos && npm run test:tvos"
  }
}
```

---

## Webpack Configuration (tvOS)

Create `webpack.tvos.config.js`:

```javascript
const path = require('path');

module.exports = {
  target: 'node',  // JSCore uses Node-like module system
  entry: {
    'schillinger-sdk': './packages/core/src/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/tvos'),
    filename: 'schillinger-sdk.js',
    library: {
      type: 'commonjs2',  // For JSCore require()
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@schillinger-sdk/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@schillinger-sdk/core': path.resolve(__dirname, 'packages/core/src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    // ❌ No Node.js built-ins available in JSCore
    'fs': true,
    'path': true,
    'crypto': true,
    'http': true,
    'https': true,
    'net': true,
  },
  optimization: {
    minimize: true,
  },
};
```

---

## Runtime Guards

### Compile-Time Checks

Add these guards to prevent accidental network usage:

```typescript
// packages/core/src/tvos-guards.ts

#if os(tvOS)
  // These will cause compile errors if referenced
  export const DISABLED_NETWORK = "Networking disabled on tvOS";
  export const DISABLED_AUTH = "Authentication disabled on tvOS";
  export const DISABLED_WEBSOCKETS = "WebSockets disabled on tvOS";
#endif
```

### Runtime Assertions

```typescript
// packages/core/src/tvos-runtime.ts

export function assertLocalOnly(feature: string): void {
  if (typeof window !== 'undefined' && window.location?.hostname !== 'localhost') {
    throw new Error(
      `[tvOS] ${feature} requires local-only mode. ` +
      `External network access is disabled on tvOS builds.`
    );
  }
}

export function assertNoNetwork(): void {
  if (typeof fetch !== 'undefined' || typeof WebSocket !== 'undefined') {
    console.warn('[tvOS] Network APIs detected. These should be disabled.');
  }
}
```

---

## Feature Flags

Create `packages/shared/src/tvos-features.ts`:

```typescript
/**
 * tvOS Feature Flags
 *
 * These flags control what features are available in tvOS builds.
 */

export const TVOS_FEATURES = {
  // ✅ Enabled
  GENERATORS: true,
  ANALYSIS: true,
  DETERMINISTIC_EMITTER: true,
  IR_SERIALIZATION: true,
  LOCAL_CACHE: true,

  // ❌ Disabled
  NETWORKING: false,
  AUTHENTICATION: false,
  WEBSOCKETS: false,
  COLLABORATION: false,
  PERSISTENT_CACHE: false,  // tvOS: in-memory only
  BACKGROUND_SYNC: false,
} as const;

export type TVOSFeature = keyof typeof TVOS_FEATURES;

/**
 * Check if a feature is enabled in tvOS builds
 */
export function isFeatureEnabled(feature: TVOSFeature): boolean {
  return TVOS_FEATURES[feature];
}

/**
 * Assert that a feature is enabled (throw if not)
 */
export function requireFeature(feature: TVOSFeature): void {
  if (!TVOS_FEATURES[feature]) {
    throw new Error(
      `[tvOS] Feature "${feature}" is disabled in tvOS builds. ` +
      `See docs/ARCHITECTURE_AUTHORITY.md for details.`
    );
  }
}
```

---

## Testing

### Unit Tests (tvOS)

Create `vitest.tvos.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  testMatch: [
    '**/__tests__/**/!(realtime|collaboration|auth|network)/**/*.test.ts',
  ],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/packages/gateway/**',
    '**/src/realtime/realtime-*.ts',
    '**/src/collaboration/**',
  ],
});
```

Run tvOS-specific tests:

```bash
npm run test:tvos
```

### Integration Tests

Test the JSCore → JUCE pipeline:

```typescript
// packages/core/__tests__/tvos/jSCORE-bridge.test.ts

import { describe, it, expect } from 'vitest';
import { SchillingerSDK } from '../../src/index';

describe('tvOS JSCore Bridge', () => {
  it('should generate pattern IR without network', async () => {
    const sdk = new SchillingerSDK();

    const ir = await sdk.rhythm.generateResultant({
      generator: 'resultant',
      primary: 3,
      secondary: 4,
      bars: 16,
    });

    // Verify IR is serializable (for passing to JUCE)
    expect(JSON.stringify(ir)).toBeTruthy();
    expect(ir.version).toBe('1.0');
  });

  it('should not attempt network calls', async () => {
    const sdk = new SchillingerSDK();

    // This should work without network
    const result = await sdk.validateLocally();
    expect(result.valid).toBe(true);
  });
});
```

---

## Deployment

### Bundle Size Targets

- **Development**: ~500KB (unminified + sourcemaps)
- **Production**: ~150KB (minified + gzipped)

### JSCore Loading

From Swift, load the bundled JS:

```swift
import JavaScriptCore

class SchillingerHost {
  let jsContext: JSContext
  let jsBundle: String

  init() {
    self.jsContext = JSContext()!
    self.jsBundle = try! String(
      contentsOfFile: Bundle.main.path(forResource: "schillinger-sdk", ofType: "js")!
    )

    // Evaluate the bundled SDK
    _ = jsContext.evaluateScript(jsBundle)
  }

  func generatePattern() -> String {
    // Call TS SDK function
    let generateFn = jsContext.objectForKeyedSubscript("generatePattern")
    let result = generateFn?.call(withArguments: [
      3,  // primary
      4,  // secondary
      16  // bars
    ])

    // Return IR as JSON string
    return result?.toString() ?? "{}"
  }
}
```

---

## Verification Checklist

Before releasing a tvOS build:

- [ ] All network packages excluded from `tsconfig.tvos.json`
- [ ] No `fetch` or `WebSocket` calls in included code
- [ ] All authentication paths gated with `#if !os(tvOS)`
- [ ] Unit tests pass with `npm run test:tvos`
- [ ] Bundle size under 200KB (minified + gzipped)
- [ ] JSCore can load and evaluate the bundle
- [ ] IR serialization/deserialization works end-to-end
- [ ] No external dependencies on Node.js built-ins

---

## Performance Optimization

### Bundle Splitting

Split into smaller chunks for faster loading:

```javascript
// webpack.tvos.config.js
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      generators: {
        test: /[\\/]rhythm[\\/]/,
        name: 'generators',
        priority: 10,
      },
      analysis: {
        test: /[\\/]analysis[\\/]/,
        name: 'analysis',
        priority: 9,
      },
      shared: {
        test: /[\\/]shared[\\/]/,
        name: 'shared',
        priority: 8,
      },
    },
  },
},
```

### Tree Shaking

Ensure only used code is included:

```typescript
// packages/core/src/index.ts (tvOS entry point)

// ❌ Don't export networking code
// export * from './network';

// ✅ Only export what tvOS needs
export * from './rhythm';
export * from './harmony';
export * from './melody';
export * from './composition';
export * from './realtime/emitter';  // DeterministicEventEmitter only
```

---

## Troubleshooting

### Build Fails with "Module not found"

**Problem**: TypeScript can't resolve a module.

**Solution**: The module might be in an excluded package. Check `tsconfig.tvos.json` exclude list.

### Runtime Error: "fetch is not defined"

**Problem**: Code is trying to use networking.

**Solution**:
1. Check if the code is in an excluded package
2. Add runtime guard:
   ```typescript
   if (typeof fetch === 'undefined') {
     throw new Error('Networking disabled on tvOS');
   }
   ```

### Bundle Too Large

**Problem**: Bundle exceeds size targets.

**Solution**:
1. Check bundle analyzer: `npm run analyze:tvos`
2. Ensure tree-shaking is working
3. Split into smaller chunks
4. Remove unused dependencies

---

## Related Documentation

- **Architecture Authority**: [ARCHITECTURE_AUTHORITY.md](ARCHITECTURE_AUTHORITY.md)
- **JSCore Embedding**: [JSCORE_EMBEDDING.md](JSCORE_EMBEDDING.md) (to be created)
- **Swift Integration**: [SWIFT_HOST_GUIDE.md](SWIFT_HOST_GUIDE.md) (to be created)

---

## Status

**Last Updated**: 2025-12-31
**Branch**: tvOS
**Status**: Active Development
