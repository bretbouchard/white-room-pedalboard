# White Room Platform Capabilities Matrix

**Generated:** January 15, 2026
**Status:** Comprehensive platform analysis for White Room apps (software only)

---

## Executive Summary

White Room supports **5 platforms** (3 active, 1 planned, 1 future) with varying capabilities, UI patterns, and feature availability. This matrix provides a complete breakdown of what's available where, platform-specific limitations, and technical blockers.

**Active Platforms:**
- **macOS** (v14+) - Desktop/Development platform
- **tvOS** (v17+) - Primary target/Living room experience
- **iOS** (v17+) - Mobile/Touch interface

**Planned Platform:**
- **Raspberry Pi** (Linux) - Embedded/Hardware deployments

**Future Platform:**
- **Web** (Browser) - Not started, low priority

**Key Findings:**
- ✅ **Core Surface**: Available on all platforms with consistent 4-domain layout
- ⚠️ **Audio Engine**: Platform-specific implementations (JUCE vs AppleAudioEngine)
- ❌ **Platform Exclusives**: Some features exist only on specific platforms
- 🔧 **Blockers**: Framework dependencies and hardware limitations

---

## Platform Overview

| Platform | Status | Min Version | Primary Use | Input Method | Screen Size | Audio Engine |
|----------|--------|-------------|-------------|--------------|-------------|--------------|
| **macOS** | ✅ Active | v14+ | Development, Production | Keyboard/Mouse | Variable (desktop) | JUCE Engine |
| **tvOS** | ✅ Primary | v17+ | Living room, Performance | Siri Remote | TV (1920x1080+) | AppleAudioEngine |
| **iOS** | 🚧 Active | v17+ | Mobile, Touch control | Multi-touch | Variable (mobile) | JUCE Engine |
| **Raspberry Pi** | 📋 Planned | Linux | Embedded, Hardware | Various (GPIO) | Variable (HDMI) | Custom/JUCE |
| **Web** | ❌ Future | TBD | Browser-based | Mouse/Touch | Variable | TBD |

---

[Document continues with full platform capabilities matrix...]
