// Test SDK exports
import sdk from './packages/core/dist/index.js';

console.log('=== SchillingerSDK v1 Exports Check ===\n');

console.log('Expected Functions:');
console.log('  realizeSong:', typeof sdk.realizeSong);
console.log('  classifyEdits:', typeof sdk.classifyEdits);
console.log('  reconcile:', typeof sdk.reconcile);

const expectedExports = ['realizeSong', 'classifyEdits', 'reconcile'];
const results = expectedExports.map(name => ({
  name,
  present: typeof sdk[name] === 'function'
}));

console.log('\n=== Results ===');
results.forEach(r => {
  console.log(`${r.name}: ${r.present ? '✓ PRESENT' : '✗ MISSING'}`);
});

const allPresent = results.every(r => r.present);
console.log(`\n${allPresent ? '✅ SUCCESS' : '❌ FAILURE'}: ${allPresent ? 'All' : 'Some'} functions are exported`);

// Also check for types
console.log('\n=== Additional Types ===');
console.log('  SchillingerSong_v1:', typeof sdk.SchillingerSong_v1 !== 'undefined' ? '✓' : '✗');
console.log('  SongModel_v1:', typeof sdk.SongModel_v1 !== 'undefined' ? '✓' : '✗');
console.log('  RhythmSystem:', typeof sdk.RhythmSystem !== 'undefined' ? '✓' : '✗');
console.log('  MelodySystem:', typeof sdk.MelodySystem !== 'undefined' ? '✓' : '✗');
console.log('  HarmonySystem:', typeof sdk.HarmonySystem !== 'undefined' ? '✓' : '✗');
