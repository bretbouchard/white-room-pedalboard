# Schillinger SDK Examples

Collection of working examples demonstrating the Schillinger SDK in action.

## Available Examples

### [simple.ts](./simple.ts)

**Level:** Beginner
**Time:** 5 minutes

The simplest possible example showing the basic workflow:
- Create a minimal theory
- Validate the theory
- Realize into notes
- Display results

**Perfect for:** First-time users, understanding the core concepts

### [complete-song.ts](./complete-song.ts)

**Level:** Intermediate
**Time:** 15 minutes

Complete song implementation using all 5 Schillinger books:
- Book I: Rhythm with multiple systems
- Book II: Melody with pitch cycles and constraints
- Book III: Harmony with chords and progressions
- Book IV: Form with sectional structure (ABA')
- Book V: Orchestration with full band ensemble

**Perfect for:** Understanding the complete system, real-world usage

### [reconciliation.ts](./reconciliation.ts)

**Level:** Advanced
**Time:** 20 minutes

Demonstrates round-trip editing workflow:
- Create and realize original theory
- Edit realized notes (velocity, pitch, duration)
- Reconcile edits back to theory
- Handle confidence scores and conflicts
- Make accept/reject decisions

**Perfect for:** Understanding the reconciliation system, edit workflows

## Running Examples

### Prerequisites

```bash
npm install @schillinger-sdk/core-v1
```

### Run with ts-node

```bash
# Install ts-node if needed
npm install -g ts-node

# Run an example
ts-node docs/examples/simple.ts
```

### Run with Node.js (after compilation)

```bash
# First compile
npm run build

# Then run
node dist/examples/simple.js
```

### Run in a Project

```typescript
// Copy example code into your project
import { SchillingerSong_v1, realize } from '@schillinger-sdk/core-v1';

// Paste example code here...
```

## Learning Path

We recommend exploring examples in this order:

1. **Start with `simple.ts`**
   - Understand the basic workflow
   - Learn the core concepts
   - Get comfortable with theory → realization

2. **Move to `complete-song.ts`**
   - See all 5 books in action
   - Understand how systems work together
   - Learn advanced theory features

3. **Explore `reconciliation.ts`**
   - Understand round-trip editing
   - Learn confidence scoring
   - Handle edit conflicts

## Key Concepts Demonstrated

### Theory-First Authoring

All examples start with theory (SchillingerSong_v1), not notes:

```typescript
const song: SchillingerSong_v1 = {
  bookI_rhythmSystems: [...],   // When notes occur
  bookII_melodySystems: [...],   // What pitches occur
  bookIII_harmonySystems: [...], // How pitches combine
  bookIV_formSystem: {...},      // Song structure
  bookV_orchestration: {...}     // Which instruments play
};
```

### Deterministic Realization

Same seed always produces identical results:

```typescript
const seed = 12345;
const result1 = await realize(song, seed);
const result2 = await realize(song, seed);

// These are bit-for-bit identical
```

### Validation

Always validate theory before realization:

```typescript
const validation = await validate(song);
if (!validation.valid) {
  // Handle errors
}
```

### Reconciliation

Edit realized notes and reconcile back to theory:

```typescript
// Edit notes
songModel.notes[0].velocity = 127;

// Reconcile
const report = await reconcile(song, songModel);

// Check confidence
if (report.confidenceSummary.overall > 0.8) {
  song = report.proposedUpdate;
}
```

## Common Patterns

### Multiple Rhythm Systems

```typescript
bookI_rhythmSystems: [
  { systemId: "bass", systemType: "generator", generators: [...] },
  { systemId: "drums", systemType: "generator", generators: [...] },
  { systemId: "lead", systemType: "generator", generators: [...] }
]
```

### Sectional Form

```typescript
bookIV_formSystem: {
  formType: "sectional",
  sections: [
    { sectionId: "A", lengthBars: 8, systemsBinding: ["rhythm-1", "melody-1"] },
    { sectionId: "B", lengthBars: 8, systemsBinding: ["rhythm-2", "melody-2"] },
    { sectionId: "A'", lengthBars: 8, systemsBinding: ["rhythm-1", "melody-1"] }
  ]
}
```

### Ensemble Configuration

```typescript
bookV_orchestration: {
  ensembleId: "rock-band",
  voices: [
    { id: "drums", name: "Drums", rolePools: [...] },
    { id: "bass", name: "Bass", rolePools: [...] },
    { id: "guitar", name: "Guitar", rolePools: [...] }
  ]
}
```

## Troubleshooting

### "Theory validation failed"

Check that:
- Generator periods are within valid range (1-16)
- Voice counts are within limits (1-100)
- System IDs in sections match system definitions
- Pitch ranges are reasonable (0-127)

### "Realization produced no notes"

Check that:
- Systems are bound to sections in form
- At least one rhythm system exists
- Voices are enabled in orchestration

### "Low reconciliation confidence"

Try:
- Editing fewer notes at once
- Making more conservative edits
- Checking for edit conflicts

## Next Steps

After exploring examples:

1. **Read the documentation:**
   - [Quickstart Guide](../quickstart.md)
   - [API Documentation](../api.md)
   - [Integration Guide](../integration.md)

2. **Build your own song:**
   - Start with simple theory
   - Add systems gradually
   - Experiment with parameters

3. **Integrate with your app:**
   - Follow integration guide for your platform
   - Connect to audio layer
   - Handle user edits

## Getting Help

- **Documentation:** See `docs/` directory
- **Issues:** Report bugs at GitHub Issues
- **Discussions:** Ask questions in GitHub Discussions

## Contributing Examples

Have a great example? We'd love to see it!

1. Create a new `.ts` file in this directory
2. Follow the existing example format
3. Add clear comments explaining each step
4. Update this README with your example
5. Submit a pull request

Example checklist:
- [ ] Clear, descriptive filename
- [ ] Level and time estimate
- [ ] Detailed description
- [ ] Well-commented code
- [ ] Console output for visibility
- [ ] Error handling
- [ ] README entry
