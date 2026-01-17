#!/bin/bash

# Comprehensive fix script for all instrument and effect repositories
# This script standardizes ALL repositories to match the mandatory structure

set -e  # Exit on error

INSTRUMENTS_DIR="/Users/bretbouchard/apps/schill/white_room/juce_backend/instruments"
EFFECTS_DIR="/Users/bretbouchard/apps/schill/white_room/juce_backend/effects"

echo "=========================================="
echo "REPOSITORY STANDARDIZATION SCRIPT"
echo "=========================================="
echo ""

# Function to create standard directory structure
create_standard_structure() {
    local repo_path=$1
    local repo_type=$2

    echo "Creating standard structure for: $(basename $repo_path)"

    # Create all required directories
    mkdir -p "$repo_path/plugins/VST"
    mkdir -p "$repo_path/plugins/AU"
    mkdir -p "$repo_path/plugins/CLAP"
    mkdir -p "$repo_path/plugins/LV2"

    # AUv3 has different structure for instruments vs effects
    if [ "$repo_type" == "instrument" ]; then
        mkdir -p "$repo_path/plugins/AUv3"
    else
        mkdir -p "$repo_path/plugins/AUv3/EFFECT"
    fi

    mkdir -p "$repo_path/plugins/Standalone"
    mkdir -p "$repo_path/docs"
    mkdir -p "$repo_path/presets/factory"
    mkdir -p "$repo_path/src/dsp"
    mkdir -p "$repo_path/tests/unit"
    mkdir -p "$repo_path/tests/integration"

    # Move ios-auv3 to plugins/AUv3 if it exists in root
    if [ -d "$repo_path/ios-auv3" ]; then
        echo "  Moving ios-auv3 to plugins/AUv3"
        if [ "$repo_type" == "instrument" ]; then
            mv "$repo_path/ios-auv3"/* "$repo_path/plugins/AUv3/" 2>/dev/null || true
        else
            mv "$repo_path/ios-auv3"/* "$repo_path/plugins/AUv3/EFFECT/" 2>/dev/null || true
        fi
        rmdir "$repo_path/ios-auv3" 2>/dev/null || true
    fi

    # Move loose markdown/txt/py files to docs/
    for file in "$repo_path"/*.{md,txt,py,sh}; do
        if [ -f "$file" ]; then
            local basename=$(basename "$file")
            if [ "$basename" != "README.md" ] && [ "$basename" != "CMakeLists.txt" ] && [ "$basename" != "LICENSE" ]; then
                echo "  Moving $basename to docs/"
                mv "$file" "$repo_path/docs/" 2>/dev/null || true
            fi
        fi
    done

    # Move presets to presets/factory if they're in presets/ root
    if [ -d "$repo_path/presets" ] && [ -d "$repo_path/presets/factory" ]; then
        # Find any preset files not in factory/ subdirectory
        find "$repo_path/presets" -maxdepth 1 -type f \( -name "*.preset" -o -name "*.xml" -o -name "*.json" \) -exec mv {} "$repo_path/presets/factory/" \; 2>/dev/null || true
    fi

    echo "  Structure created"
}

# Function to create standard documentation files
create_standard_docs() {
    local repo_path=$1
    local repo_name=$(basename "$repo_path")
    local repo_type=$2

    echo "Creating standard documentation for: $repo_name"

    # Create docs/BUILD.md
    if [ ! -f "$repo_path/docs/BUILD.md" ]; then
        cat > "$repo_path/docs/BUILD.md" << 'EOF'
# Build Instructions

## Prerequisites

- JUCE 7.0.0 or later
- CMake 3.15 or later
- macOS 10.15 or later (for AU/AUv3)
- Xcode 12 or later (for macOS builds)

## Building All Formats

### VST3
```bash
cmake -B build/VST -DJUCE_FORMATS=VST .
cmake --build build/VST --config Release
```

### Audio Unit (macOS)
```bash
cmake -B build/AU -DJUCE_FORMATS=AU .
cmake --build build/AU --config Release
```

### CLAP
```bash
cmake -B build/CLAP -DJUCE_FORMATS=CLAP .
cmake --build build/CLAP --config Release
```

### LV2
```bash
cmake -B build/LV2 -DJUCE_FORMATS=LV2 .
cmake --build build/LV2 --config Release
```

### Standalone
```bash
cmake -B build/Standalone -DJUCE_FORMATS=Standalone .
cmake --build build/Standalone --config Release
```

### AUv3 (iOS)
```bash
cmake -B build/AUv3 -DJUCE_FORMATS=AUv3 -DIOS=1 .
cmake --build build/AUv3 --config Release
```

## Installation

### macOS
VST3: `cp -R build/VST/[Plugin].vst3 ~/Library/Audio/Plug-Ins/VST3/`
AU: `cp -R build/AU/[Plugin].component ~/Library/Audio/Plug-Ins/Components/`
Standalone: `cp build/Standalone/[Plugin] /Applications/`

### iOS
AUv3: Deploy via Xcode to device or simulator

## Troubleshooting

See README.md for common issues and solutions.
EOF
    fi

    # Create docs/PARAMETERS.md
    if [ ! -f "$repo_path/docs/PARAMETERS.md" ]; then
        cat > "$repo_path/docs/PARAMETERS.md" << EOF
# Parameters Documentation

## Overview

This document describes all parameters for $repo_name.

## Parameter List

| Name | Type | Range | Default | Description |
|------|------|-------|---------|-------------|
| TODO | float | 0.0-1.0 | 0.5 | Parameter description |

## MIDI CC Mapping

| CC Number | Parameter |
|-----------|-----------|
| TODO | Parameter name |

## Automation

All parameters are automatable in supported hosts.
EOF
    fi

    # Create docs/PRESETS.md
    if [ ! -f "$repo_path/docs/PRESETS.md" ]; then
        cat > "$repo_path/docs/PRESETS.md" << EOF
# Presets Documentation

## Factory Presets

Location: \`presets/factory/\`

### Available Presets

| Name | Description | Category |
|------|-------------|----------|
| TODO | Preset description | Category |

### Categories

- **Init**: Default initialization preset
- **Category**: Category description

## Creating Custom Presets

1. In your DAW, create your desired sound
2. Use the DAW's "Save Preset" function
3. Store in your user preset location

## Preset Format

Presets are stored in JUCE's standard XML format for cross-host compatibility.

## Importing/Exporting

Use your DAW's built-in preset management or copy files directly to the presets directory.
EOF
    fi

    # Create LICENSE if missing
    if [ ! -f "$repo_path/LICENSE" ]; then
        cat > "$repo_path/LICENSE" << 'EOF'
MIT License

Copyright (c) 2025 White Room Audio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
    fi

    # Create CMakeLists.txt if missing
    if [ ! -f "$repo_path/CMakeLists.txt" ]; then
        cat > "$repo_path/CMakeLists.txt" << EOF
cmake_minimum_required(VERSION 3.15)
project(${repo_name} VERSION 1.0.0)

# JUCE setup
set(JUCE_MODULES_DIR
    \${CMAKE_CURRENT_LIST_DIR}/../../external/JUCE/modules
    CACHE INTERNAL "")

add_subdirectory(\${JUCE_MODULES_DIR} JUCE)

# Plugin formats
set(JUCE_FORMATS VST;AU;CLAP;LV2;Standalone)

# Plugin source files
set(PLUGIN_SRC
    src/${repo_name}Plugin.cpp
    src/${repo_name}PluginEditor.cpp
)

# Create plugin target
juce_add_plugin(${repo_name}
    PLUGIN_SRC \${PLUGIN_SRC}
    FORMAT \${JUCE_FORMATS}
)

# Link JUCE modules
target_link_libraries(${repo_name}
    PRIVATE
        juce::juce_audio_plugin_client
        juce::juce_audio_utils
        juce::juce_dsp
)
EOF
    fi

    # Update README.md to document all formats if it exists
    if [ -f "$repo_path/README.md" ]; then
        # Check if README already has formats section
        if ! grep -q "## Plugin Formats" "$repo_path/README.md"; then
            # Add formats section to README
            cat >> "$repo_path/README.md" << EOF

## Plugin Formats

This plugin is available in the following formats:

- **VST3**: Cross-platform plugin format (Windows, macOS, Linux)
- **Audio Unit (AU)**: macOS-only format (macOS 10.15+)
- **CLAP**: Modern cross-platform format (CLAP 1.1+)
- **LV2**: Linux plugin format (LV2 1.18+)
- **AUv3**: iOS format (iOS 13+)
- **Standalone**: Desktop application (Windows, macOS, Linux)

### Build Status

See docs/BUILD.md for build instructions and current status.

### Installation

Each format installs to its standard system location. See docs/BUILD.md for details.
EOF
        fi
    fi

    echo "  Documentation created"
}

# Process all instruments
echo "=========================================="
echo "PROCESSING INSTRUMENTS"
echo "=========================================="
echo ""

for instrument in choral drummachine giant_instruments kane_marco localgal Nex_synth Sam_sampler; do
    INSTRUMENT_PATH="$INSTRUMENTS_DIR/$instrument"

    # Skip if directory doesn't exist
    if [ ! -d "$INSTRUMENT_PATH" ]; then
        echo "Skipping $instrument (directory does not exist)"
        continue
    fi

    # Skip if empty (we'll handle localgal separately)
    if [ -z "$(ls -A $INSTRUMENT_PATH)" ]; then
        echo "Skipping $instrument (empty - will handle separately)"
        continue
    fi

    echo "---"
    create_standard_structure "$INSTRUMENT_PATH" "instrument"
    create_standard_docs "$INSTRUMENT_PATH" "$instrument" "instrument"
    echo ""
done

# Process all effects
echo "=========================================="
echo "PROCESSING EFFECTS"
echo "=========================================="
echo ""

for effect in AetherDrive biPhase farfaraway filtergate monument pedalboard overdrive_pedal chorus_pedal; do
    EFFECT_PATH="$EFFECTS_DIR/$effect"

    # Skip if directory doesn't exist
    if [ ! -d "$EFFECT_PATH" ]; then
        echo "Skipping $effect (directory does not exist)"
        continue
    fi

    echo "---"
    create_standard_structure "$EFFECT_PATH" "effect"
    create_standard_docs "$EFFECT_PATH" "$effect" "effect"
    echo ""
done

echo "=========================================="
echo "STANDARDIZATION COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review changes in each repository"
echo "2. Test builds for each format"
echo "3. Update documentation with actual parameters"
echo "4. Commit changes"
echo ""
