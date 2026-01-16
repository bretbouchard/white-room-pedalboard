#!/bin/bash

# White Room Pedalboard - JUCE Project Setup Script
# This script helps you create a proper JUCE plugin project

set -e

echo "🎸 White Room Pedalboard - JUCE Project Setup"
echo "=============================================="
echo ""

# Paths
PEDALBOARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JUCE_DIR="$PEDALBOARD_DIR/../../external/JUCE"
PROJUCER="$JUCE_DIR/extras/Projucer/Builds/MacOSX/build/Release/Projucer.app"

echo "📍 Pedalboard directory: $PEDALBOARD_DIR"
echo "📍 JUCE directory: $JUCE_DIR"
echo ""

# Check if JUCE exists
if [ ! -d "$JUCE_DIR" ]; then
    echo "❌ JUCE not found at: $JUCE_DIR"
    echo "   Please ensure JUCE is installed in: $PEDALBOARD_DIR/../../external/JUCE"
    exit 1
fi

echo "✅ JUCE found"
echo ""

# Check if Projucer is built
if [ ! -d "$PROJUCER" ]; then
    echo "⚠️  Projucer not found at: $PROJUCER"
    echo "   Building Projucer..."
    cd "$JUCE_DIR/extras/Projucer/Builds/MacOSX"
    xcodebuild -project Projucer.xcodeproj -scheme Projucer -configuration Release build
    echo "✅ Projucer built"
fi

echo "🚀 Choose setup option:"
echo ""
echo "1) Quick Start - Copy JUCE example project (FASTEST - 5 minutes)"
echo "2) Projucer GUI - Create new project with GUI tool (RECOMMENDED - 15 minutes)"
echo "3) Manual CMake - Advanced manual setup (EXPERT - 30 minutes)"
echo "4) Web UI Only - Use existing web interface (INSTANT - already working!)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📋 Quick Start Setup"
        echo "==================="
        echo ""
        echo "Copying JUCE example project..."

        # Create a working project from JUCE example
        EXAMPLE_DIR="$JUCE_DIR/examples/Plugins/ArbitraryMess"
        WORK_DIR="$PEDALBOARD_DIR/JUCE_Project"

        if [ -d "$WORK_DIR" ]; then
            echo "⚠️  Working directory exists: $WORK_DIR"
            read -p "Remove and recreate? (y/n): " confirm
            if [ "$confirm" = "y" ]; then
                rm -rf "$WORK_DIR"
            else
                echo "❌ Aborted"
                exit 1
            fi
        fi

        cp -r "$EXAMPLE_DIR" "$WORK_DIR"
        echo "✅ Example copied to: $WORK_DIR"

        echo ""
        echo "Next steps:"
        echo "1. Open Projucer:"
        echo "   open $PROJUCER"
        echo ""
        echo "2. In Projucer, open: $WORK_DIR/Builds/MacOSX/ArbitraryMess.jucer"
        echo ""
        echo "3. Project Settings:"
        echo "   - Plugin Name: WhiteRoomPedalboard"
        echo "   - Plugin Code: WHTR"
        echo "   - Formats: VST3, AU, Standalone"
        echo ""
        echo "4. Save and Open in Xcode"
        echo ""
        ;;

    2)
        echo ""
        echo "🎨 Projucer GUI Setup"
        echo "===================="
        echo ""
        echo "Launching Projucer..."
        open "$PROJUCER"

        echo ""
        echo "📝 Follow these steps in Projucer:"
        echo ""
        echo "1. Create New Project"
        echo "   - File → New Project"
        echo "   - Select 'Plugin' project type"
        echo ""
        echo "2. Project Settings"
        echo "   - Name: WhiteRoomPedalboard"
        echo "   - Location: $PEDALBOARD_DIR"
        echo "   - Plugin Code: WHTR"
        echo "   - Formats: VST3, AU, Standalone"
        echo ""
        echo "3. Add Source Files"
        echo "   - Right-click 'Source' folder"
        echo "   - Add existing files:"
        echo "     • $PEDALBOARD_DIR/src/PedalboardProcessor.cpp"
        echo "     • $PEDALBOARD_DIR/PedalboardEditor.cpp"
        echo "     • $PEDALBOARD_DIR/include/PedalboardProcessor.h"
        echo "     • $PEDALBOARD_DIR/PedalboardEditor.h"
        echo "     • All files from: $PEDALBOARD_DIR/../pedals/src/dsp/"
        echo ""
        echo "4. Add Header Search Paths"
        echo "   - In Config tab, add:"
        echo "     • ../../external/JUCE/modules"
        echo "     • ../pedals/include"
        echo "     • /opt/homebrew/Cellar/nlohmann-json/3.12.0/include"
        echo ""
        echo "5. Exporters"
        echo "   - Select 'macOS (AU/VST/Standalone)' exporter"
        echo "   - Click 'Save and Open in IDE'"
        echo ""
        ;;

    3)
        echo ""
        echo "🔧 Manual CMake Setup"
        echo "===================="
        echo ""
        echo "This requires advanced JUCE CMake knowledge."
        echo ""
        echo "Key requirements:"
        echo "1. Include JUCE as subdirectory:"
        echo "   add_subdirectory(\${JUCE_PATH}/extras/Build/CMake)"
        echo ""
        echo "2. Use juce_add_plugin:"
        echo "   juce_add_plugin(WhiteRoomPedalboard"
        echo "       FORMATS VST3 AU Standalone"
        echo "       PLUGIN_CODE \"WHTR\""
        echo "   )"
        echo ""
        echo "3. Add sources:"
        echo "   target_sources(... PRIVATE"
        echo "       \${PEDALBOARD_SOURCES}"
        echo "       \${PEDAL_DSP_SOURCES}"
        echo "   )"
        echo ""
        echo "See JUCE_PLUGIN_FORMATS_GUIDE.md for details."
        echo ""
        ;;

    4)
        echo ""
        echo "🌐 Web UI Setup"
        echo "=============="
        echo ""
        echo "✅ Web UI is already working!"
        echo ""
        echo "Launch it now:"
        echo "   open $PEDALBOARD_DIR/web_ui/pedalboard.html"
        echo ""
        echo "The web UI provides:"
        echo "  ✅ Drag-and-drop pedal management"
        echo "  ✅ All 10 guitar effects"
        echo "  ✅ Preset save/load"
        echo "  ✅ 8 scene slots"
        echo "  ✅ Parameter controls"
        echo ""
        echo "Opening web UI..."
        open "$PEDALBOARD_DIR/web_ui/pedalboard.html"
        exit 0
        ;;

    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📚 Documentation available:"
echo "   - $PEDALBOARD_DIR/JUCE_PLUGIN_FORMATS_GUIDE.md"
echo "   - $PEDALBOARD_DIR/SUCCESS_REPORT.md"
echo ""
echo "🎯 Need help? Check the guides above!"
echo ""
