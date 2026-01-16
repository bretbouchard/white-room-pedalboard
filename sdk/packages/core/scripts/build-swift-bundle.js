#!/usr/bin/env node

/**
 * Build Swift SDK Bundle for JavaScriptCore
 *
 * Compiles sdk-bundle.ts and transforms it into a format
 * suitable for JavaScriptCore on iOS/tvOS/macOS.
 *
 * Output: dist/swift/schillinger-sdk.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'swift');
const BUNDLE_SOURCE = path.join(DIST_DIR, 'sdk-bundle.js');
const BUNDLE_OUTPUT = path.join(DIST_DIR, 'schillinger-sdk.js');

console.log('🔨 Building Swift SDK bundle...');

// Clean dist directory
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// Step 1: Compile TypeScript to ES2020
console.log('📦 Compiling TypeScript...');
try {
  execSync(
    'tsc --module es2020 --target es2020 --outDir dist/swift --moduleResolution bundler --esModuleInterop --resolveJsonModule --skipLibCheck src/sdk-bundle.ts',
    {
      cwd: ROOT_DIR,
      stdio: 'inherit'
    }
  );
} catch (error) {
  console.error('❌ TypeScript compilation failed');
  process.exit(1);
}

// Step 2: Transform for JavaScriptCore
console.log('🔄 Transforming for JavaScriptCore...');
if (!fs.existsSync(BUNDLE_SOURCE)) {
  console.error(`❌ Compiled bundle not found: ${BUNDLE_SOURCE}`);
  process.exit(1);
}

let content = fs.readFileSync(BUNDLE_SOURCE, 'utf8');

// Remove CommonJS exports (they break in JSC)
content = content.replace(/module\.exports\s*=\s*[^;]+;?/g, '');
content = content.replace(/Object\.defineProperty[^;]+;?/g, '');

// Remove "use strict" directives (we'll add our own)
content = content.replace(/"use strict";?/g, '');
content = content.replace(/'use strict';?/g, '');

// Build final bundle
const bundle = `
// Schillinger SDK Bundle for JavaScriptCore
// Generated: ${new Date().toISOString()}
// Version: 1.0.0

"use strict";

${content}
`;

// Write bundle
fs.writeFileSync(BUNDLE_OUTPUT, bundle);

// Clean up intermediate file
fs.unlinkSync(BUNDLE_SOURCE);

// Copy to Swift frontend
const swiftResourcesDir = path.join(
  ROOT_DIR,
  '..',
  '..',
  '..',
  'swift_frontend',
  'src',
  'SwiftFrontendCore',
  'Resources'
);

if (fs.existsSync(swiftResourcesDir)) {
  const swiftBundlePath = path.join(swiftResourcesDir, 'schillinger-sdk.js');
  fs.copyFileSync(BUNDLE_OUTPUT, swiftBundlePath);
  console.log(`✅ Copied to Swift frontend: ${swiftBundlePath}`);
} else {
  console.log(`⚠️  Swift frontend Resources directory not found: ${swiftResourcesDir}`);
  console.log(`   Bundle available at: ${BUNDLE_OUTPUT}`);
}

console.log('✅ Swift SDK bundle built successfully!');
console.log(`   Output: ${BUNDLE_OUTPUT}`);
