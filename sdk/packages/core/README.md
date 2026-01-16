# @schillinger-sdk/core-v1

**Schillinger SDK v1** - Theory-First Architecture with Deterministic Realization

## Overview

This is the complete rewrite of the Schillinger System SDK, implementing a theory-first architecture where songs are authored as pure Schillinger systems (zero notes required) and deterministically realized into executable song models.

### Key Features

- **Theory-First Authoring**: Create songs using Schillinger's complete system (Books I-V) without any notes
- **Deterministic Realization**: Same input + seed → bit-for-bit identical results across platforms
- **Round-Trip Reconciliation**: Edit realized songs and reconcile back to theory with confidence scoring
- **Cross-Platform**: TypeScript (primary) + Dart (mobile via FFI) with guaranteed consistency
- **Explainable Systems**: Every musical decision traceable back to theory parameters

## Architecture

```
SchillingerSong_v1 (Theory)
    ↓ realize(song, seed)
SongModel_v1 (Executable) + DerivationRecord_v1
    ↓ (user edits)
    ↓ reconcile(song, editedModel)
ReconciliationReport_v1 (confidence, loss, or updated theory)
```

## Installation

```bash
npm install @schillinger-sdk/core-v1
```

## Quick Start

```typescript
import { SchillingerSong, realize, reconcile, validate } from '@schillinger-sdk/core-v1';

// 1. Create a song using pure theory
const song: SchillingerSong_v1 = {
  schemaVersion: "1.0",
  songId: "uuid",
  bookI_rhythmSystems: [...],
  bookII_melodySystems: [],
  bookIII_harmonySystems: [],
  bookIV_formSystem: null,
  bookV_orchestration: {...},
  // ... (see quickstart.md for complete example)
};

// 2. Validate theory
const validation = await validate(song);
if (!validation.valid) {
  console.error(validation.errors);
}

// 3. Realize deterministically
const seed = 12345;
const { songModel, derivationRecord } = await realize(song, seed);

// 4. Export or play
console.log(`Generated ${songModel.notes.length} notes`);

// 5. Edit (in DAW or programmatically)
songModel.notes[0].velocity = 100;

// 6. Reconcile back to theory
const report = await reconcile(song, songModel);
console.log(`Confidence: ${report.confidenceSummary.overall}`);

if (report.confidenceSummary.overall > 0.8) {
  song = report.proposedUpdate;
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint:fix

# Format
npm run format
```

## Documentation

- **Data Model**: See `../specs/schillinger-sdk-systemfirst-rewrite-20260107-084720/plan/data-model.md`
- **Quickstart Guide**: See `../specs/schillinger-sdk-systemfirst-rewrite-20260107-084720/plan/quickstart.md`
- **Implementation Plan**: See `../specs/schillinger-sdk-systemfirst-rewrite-20260107-084720/plan/plan.md`

## License

MIT

## Contributors

Schillinger SDK Contributors
