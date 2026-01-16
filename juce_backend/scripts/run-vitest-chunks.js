#!/usr/bin/env node
// Run vitest tests in sequential chunks to reduce memory pressure.
// Usage:
//   CHUNKS=4 CONFIG=vitest.sdk-unit.config.ts node scripts/run-vitest-chunks.js
//   NODE_OPTIONS="--max-old-space-size=4096" npm run test:vitest:chunks

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function resolveConfig(configPath) {
  const abs = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Config file not found: ${abs}`);
  }
  return abs;
}

function loadConfig(configPath) {
  // Load TypeScript/vitest config by importing via ts-node/register is heavy; instead
  // spawn `node -e` to print resolved include globs using a small runner that uses `esbuild-register` if needed.
  // Simpler approach: require the compiled JS if exists next to TS. Try to require TS via ts-node if installed.
  try {
    // Try to use vitest's own config loader via dynamic import of the TS file using node's loader
    // For simplicity, just import the TS/JS config via require after transpile by ts-node/register if available.
    require('ts-node/register');
  } catch (e) {
    // ts-node not available; proceed and try requiring .js alternative
  }

  const full = path.resolve(process.cwd(), configPath);
  let cfg = null;
  try {
    cfg = require(full);
    cfg = cfg && cfg.default ? cfg.default : cfg;
  } catch (err) {
    // try .js
    const jsPath = full.replace(/\.ts$/, '.js');
    if (fs.existsSync(jsPath)) {
      cfg = require(jsPath);
      cfg = cfg && cfg.default ? cfg.default : cfg;
    } else {
      throw err;
    }
  }
  return cfg;
}

function globToRegexPattern(glob) {
  // very small glob -> regex converter supporting **, *, ?
  let s = glob
    .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
    .replace(/\\\\\*\\\\\*/g, '::DOUBLESTAR::')
    .replace(/\\\\\*/g, '[^/]*')
    .replace(/\\\\\?/g, '.')
    .replace(/::DOUBLESTAR::/g, '(.|[\\r\\n])*');
  // anchor
  return new RegExp('^' + s + '$');
}

function expandGlobs(globs) {
  // Try to list files via git for speed and accuracy; fallback to a recursive fs walk
  const { execSync } = require('child_process');
  let allFiles = [];
  try {
    const out = execSync('git ls-files', { cwd: process.cwd(), encoding: 'utf8' });
    allFiles = out.split('\n').filter(Boolean);
  } catch (e) {
    // fallback: walk directory
    const walk = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const p = path.join(dir, ent.name);
        const rel = path.relative(process.cwd(), p);
        if (ent.isDirectory()) {
          walk(p);
        } else if (ent.isFile()) {
          allFiles.push(rel);
        }
      }
    };
    walk(process.cwd());
    // normalize to posix
    allFiles = allFiles.map(f => f.split(path.sep).join('/'));
  }

  // expand braces like {a,b} into multiple patterns
  function expandBraces(pattern) {
    const m = pattern.match(/\{([^}]+)\}/);
    if (!m) return [pattern];
    const parts = m[1].split(',');
    const pre = pattern.slice(0, m.index);
    const post = pattern.slice(m.index + m[0].length);
    const results = [];
    for (const p of parts) {
      results.push(...expandBraces(pre + p + post));
    }
    return results;
  }

  const expanded = [].concat(...globs.map(g => expandBraces(g)));
  const regexes = expanded.map(g => globToRegexPattern(g));
  const matched = allFiles.filter(f => regexes.some(rx => rx.test(f)));
  return matched.sort();
}

function chunkArray(arr, n) {
  const out = Array.from({ length: n }, () => []);
  for (let i = 0; i < arr.length; i++) {
    out[i % n].push(arr[i]);
  }
  return out;
}

async function main() {
  const CHUNKS = parseInt(process.env.CHUNKS || '4', 10) || 4;
  const CONFIG = process.env.CONFIG || 'vitest.config.ts';
  const RUNNER = process.env.RUNNER || 'vitest';

  console.log(`Running tests in ${CHUNKS} chunks using config ${CONFIG}`);

  const configPath = resolveConfig(CONFIG);
  let cfg;
  try {
    cfg = loadConfig(CONFIG);
  } catch (err) {
    console.warn('Could not require config file directly, falling back to default glob patterns. Error:', err.message);
    cfg = {};
  }

  let include = [];
  if (cfg && cfg.test && cfg.test.include) {
    include = cfg.test.include;
  }
  if (!include || include.length === 0) {
    // Fallback to common patterns
    include = ['**/__tests__/**/*.{test,spec}.{js,ts,tsx}', '**/*.test.{js,ts,tsx}', '**/*.spec.{js,ts,tsx}'];
  }

  const files = expandGlobs(include);
  if (!files.length) {
    console.error('No test files found for includes:', include);
    process.exit(2);
  }

  const chunks = chunkArray(files, CHUNKS);

  console.log(`Found ${files.length} test files; running ${chunks.length} chunk(s)`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk.length) continue;
    console.log(`\n=== Running chunk ${i + 1}/${chunks.length} with ${chunk.length} files ===`);

  const args = ['run', '--reporter=dot', '--threads=false', '--sequence', '--config', CONFIG, ...chunk];

    // Use cross-platform spawn
    const res = spawnSync(RUNNER, args, { stdio: 'inherit', env: { ...process.env } });
    if (res.error) {
      console.error('Failed to run vitest:', res.error);
      process.exit(1);
    }
    if (res.status !== 0) {
      console.error(`Chunk ${i + 1} failed with exit code ${res.status}`);
      process.exit(res.status);
    }
  }

  console.log('\nAll chunks finished successfully');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
