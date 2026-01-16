#!/usr/bin/env node

/**
 * Generate Test Songs Script
 *
 * Generates all 100 test songs for E2E testing
 */

import { TestSongGenerator } from '../framework/test-song-generator';
import * as path from 'path';
import * as fs from 'fs/promises';

async function main() {
  console.log('🎵 Generating E2E Test Songs...\n');

  const generator = new TestSongGenerator(42);
  const outputDir = path.join(__dirname, '..', 'test_songs');

  // Generate all test songs
  console.log('Generating test songs...');
  const songs = generator.generateAllTestSongs();

  console.log(`Generated ${songs.size} test songs\n`);

  // Save to disk
  console.log('Saving test songs to disk...');
  await generator.saveTestSongs(songs, outputDir);

  // Print summary
  console.log('\n📊 Test Song Summary:');
  printSummary(songs);

  console.log('\n✅ Test song generation complete!');
  console.log(`📁 Location: ${outputDir}`);
}

function printSummary(songs: Map<string, any>) {
  const summary = {
    simple: 0,
    medium: 0,
    complex: 0,
    edgeCases: 0,
    instruments: 0,
    console: 0,
  };

  for (const [id, song] of songs) {
    if (id.startsWith('simple-')) summary.simple++;
    else if (id.startsWith('medium-')) summary.medium++;
    else if (id.startsWith('complex-')) summary.complex++;
    else if (id.startsWith('edge-')) summary.edgeCases++;
    else if (id.startsWith('instrument-')) summary.instruments++;
    else if (id.startsWith('console-')) summary.console++;
  }

  console.log(`  Simple:       ${summary.simple} songs`);
  console.log(`  Medium:       ${summary.medium} songs`);
  console.log(`  Complex:      ${summary.complex} songs`);
  console.log(`  Edge Cases:   ${summary.edgeCases} songs`);
  console.log(`  Instruments:  ${summary.instruments} songs`);
  console.log(`  Console:      ${summary.console} songs`);
  console.log(`  ──────────────────────────`);
  console.log(`  Total:        ${songs.size} songs`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error generating test songs:', error);
    process.exit(1);
  });
}

export { main };
