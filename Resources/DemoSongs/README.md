# White Room Demo Song Library

## Overview

This library contains demonstration songs showcasing the full capabilities of the White Room Schillinger Engine.

## Directory Structure

```
demo_songs/
├── starter/           # Beginner-friendly songs (1-5)
├── showcase/          # Feature-specific demonstrations (6-15)
├── advanced/          # Full system complexity (16-20)
└── converted/         # Songs from analyses (3 songs)
```

## Song Categories

### Starter Songs (1-5)
Simple, accessible demonstrations perfect for:
- First-time users
- Learning basic concepts
- Quick inspiration
- Understanding the UI

### Showcase Songs (6-15)
Each song highlights specific capabilities:
- Rhythmic complexity
- Melodic generation
- Harmonic systems
- Formal structures
- Agent coordination
- Preset evolution
- Multi-stream techniques

### Advanced Songs (16-20)
Maximum complexity demonstrations:
- Full agent orchestration
- Predictability management
- Complex formal structures
- Advanced schillinger techniques
- System limits exploration

### Converted Songs
Analyses converted to performable presets:
- Bad Guy (Pop analysis)
- HBO Feature Presentation (Identity theme)
- The Rite of Spring (Structural analysis)

## Usage

### Loading a Song

1. Open White Room
2. Navigate to Demo Songs panel
3. Select song by category
4. Click "Load Song"
5. Press Play

### Song Metadata

Each song includes:
- **Name**: Descriptive title
- **Difficulty**: Beginner/Intermediate/Advanced
- **Focus**: What it demonstrates
- **Duration**: Approximate length
- **Agents Required**: Which agents are active
- **Description**: What to listen for

### Learning Path

**New Users**: Start with Starter 1-5, in order
**Feature Exploration**: Jump to specific Showcase songs
**Advanced Study**: Work through Advanced 16-20 sequentially

## Contributing

When adding new demo songs:

1. Place in appropriate category directory
2. Include complete metadata
3. Test performability
4. Document key concepts
5. Update this README

## Song Format

Each song is a JSON preset containing:

```json
{
  "name": "Song Name",
  "category": "starter|showcase|advanced",
  "difficulty": "beginner|intermediate|advanced",
  "focus": ["key", "concepts", "demonstrated"],
  "duration_seconds": 180,
  "agents": ["Rhythm", "Pitch", "Structure"],
  "description": "What makes this song interesting",
  "session_model": { /* Full SessionModel configuration */ },
  "preset_evolution": { /* Optional evolution config */ },
  "performance_notes": "Tips for best results"
}
```

## Standards

### Quality Guidelines
- All songs must be performable (no broken presets)
- Clear educational value
- Distinct from other songs
- Well-documented
- Tested across playback

### Design Principles
1. **Teach Something**: Every song demonstrates specific concepts
2. **Be Musical**: Quality matters, even in demos
3. **Start Simple**: Easy entry, depth available
4. **Show Range**: Cover full system capabilities
5. **Inspire Creation**: Users should want to make their own

## Future Enhancements

- [ ] Interactive tutorials integrated with songs
- [ ] User-submitted demo songs
- [ ] Difficulty rating system
- [ ] Playlist functionality
- [ ] Performance analytics
- [ ] Community sharing

---

**Last Updated**: 2026-01-16
**Version**: 1.0.0
**Maintainer**: White Room Development Team
