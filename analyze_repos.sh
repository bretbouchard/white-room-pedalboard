#!/bin/bash

# Comprehensive analysis script for all instrument and effect repositories

echo "=========================================="
echo "REPOSITORY STRUCTURE ANALYSIS"
echo "=========================================="
echo ""

INSTRUMENTS_DIR="/Users/bretbouchard/apps/schill/white_room/juce_backend/instruments"
EFFECTS_DIR="/Users/bretbouchard/apps/schill/white_room/juce_backend/effects"

analyze_repo() {
    local repo_path=$1
    local repo_name=$(basename "$repo_path")
    local repo_type=$2

    echo "=== $repo_name ($repo_type) ==="
    echo "Path: $repo_path"

    # Check if empty
    if [ -z "$(ls -A $repo_path)" ]; then
        echo "STATUS: EMPTY - No files"
        echo ""
        return
    fi

    # Check for required directories
    echo "Required Directories:"

    for dir in "plugins/VST" "plugins/AU" "plugins/CLAP" "plugins/LV2" "plugins/AUv3" "plugins/Standalone" "docs" "presets/factory" "src" "tests/unit" "tests/integration"; do
        if [ -d "$repo_path/$dir" ]; then
            echo "  ✓ $dir"
        else
            echo "  ✗ $dir (MISSING)"
        fi
    done

    echo ""
    echo "Required Files:"

    # Check for required files
    for file in "README.md" "CMakeLists.txt" "LICENSE" "docs/BUILD.md" "docs/PARAMETERS.md" "docs/PRESETS.md"; do
        if [ -f "$repo_path/$file" ]; then
            echo "  ✓ $file"
        else
            echo "  ✗ $file (MISSING)"
        fi
    done

    echo ""
    echo "Loose Files in Root (should be in docs/ or other locations):"
    ls -1 "$repo_path" | grep -E '\.(md|txt|py|sh)$' | while read file; do
        if [ "$file" != "README.md" ] && [ "$file" != "CMakeLists.txt" ] && [ "$file" != "LICENSE" ]; then
            echo "  - $file"
        fi
    done

    echo ""
}

echo "=========================================="
echo "INSTRUMENTS"
echo "=========================================="
echo ""

for instrument in choral drummachine giant_instruments kane_marco localgal Nex_synth Sam_sampler; do
    analyze_repo "$INSTRUMENTS_DIR/$instrument" "instrument"
done

echo "=========================================="
echo "EFFECTS"
echo "=========================================="
echo ""

for effect in AetherDrive biPhase farfaraway filtergate monument pedalboard; do
    analyze_repo "$EFFECTS_DIR/$effect" "effect"
done

echo "=========================================="
echo "INDIVIDUAL PEDALS"
echo "=========================================="
echo ""

for pedal in overdrive_pedal chorus_pedal; do
    if [ -d "$EFFECTS_DIR/$pedal" ]; then
        analyze_repo "$EFFECTS_DIR/$pedal" "pedal"
    fi
done

echo "=========================================="
echo "ANALYSIS COMPLETE"
echo "=========================================="
