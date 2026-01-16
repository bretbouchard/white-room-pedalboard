#!/usr/bin/env node

/**
 * Build Script for Schillinger SDK Bundle
 *
 * Compiles TypeScript SDK into a single JavaScript bundle
 * for loading into JavaScriptCore on iOS/tvOS/macOS.
 *
 * Usage: node build-sdk.js
 * Output: dist/schillinger-sdk.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building Schillinger SDK Bundle...');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build TypeScript
console.log('📦 Compiling TypeScript...');
try {
  execSync('npx tsc', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('✅ TypeScript compiled');
} catch (error) {
  console.error('❌ TypeScript compilation failed:', error.message);
  process.exit(1);
}

// Bundle with esbuild (faster than webpack for this use case)
console.log('📦 Bundling with esbuild...');
try {
  const esbuild = require('esbuild');

  esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'src/sdk-bundle.ts')],
    bundle: true,
    outfile: path.join(distDir, 'schillinger-sdk.js'),
    format: 'iife',
    globalName: 'SchillingerSDK',
    target: 'es2020',
    minify: true,
    sourcemap: false,
    platform: 'browser',
    external: [], // Bundle everything
    logLevel: 'info'
  });

  console.log('✅ Bundle created: dist/schillinger-sdk.js');

  // Get file size
  const stats = fs.statSync(path.join(distDir, 'schillinger-sdk.js'));
  const sizeKB = (stats.size / 1024).toFixed(2);
  console.log(`📊 Bundle size: ${sizeKB} KB`);

  if (stats.size > 500000) { // 500 KB warning
    console.warn('⚠️  Bundle is large (>500KB). Consider code splitting for production.');
  }

  console.log('✅ Build complete!');
} catch (error) {
  console.error('❌ Bundling failed:', error.message);

  // Fallback: Try webpack if esbuild not available
  console.log('🔄 Trying webpack fallback...');
  try {
    execSync('npx webpack --config webpack.sdk.config.js', {
      cwd: __dirname,
      stdio: 'inherit'
    });
    console.log('✅ Webpack bundle created');
  } catch (webpackError) {
    console.error('❌ All bundling methods failed');
    process.exit(1);
  }
}
