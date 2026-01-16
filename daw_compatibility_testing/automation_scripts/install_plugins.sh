#!/bin/bash
# White Room Plugin Installation Script for macOS
# Installs VST3 plugins to standard plugin paths

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/bretbouchard/apps/schill/white_room"
VST3_SOURCE_DIR="$PROJECT_ROOT/juce_backend"
VST3_DEST_DIR="$HOME/Library/Audio/Plug-Ins/VST3"
AU_DEST_DIR="$HOME/Library/Audio/Plug-Ins/Components"

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Print section header
print_header() {
    echo ""
    print_message "$YELLOW" "========================================"
    print_message "$YELLOW" "$1"
    print_message "$YELLOW" "========================================"
    echo ""
}

# Check if directory exists
check_directory() {
    if [ ! -d "$1" ]; then
        print_message "$RED" "Error: Directory not found: $1"
        exit 1
    fi
}

# Main installation
main() {
    print_header "White Room Plugin Installation"

    # Check architecture
    ARCH=$(uname -m)
    print_message "$GREEN" "Architecture: $ARCH"

    if [ "$ARCH" != "arm64" ]; then
        print_message "$YELLOW" "Warning: Plugins are built for Apple Silicon (arm64)"
        print_message "$YELLOW" "Your architecture is $ARCH - plugins may not work"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Check project directory
    check_directory "$PROJECT_ROOT"
    check_directory "$VST3_SOURCE_DIR"

    # Create destination directory
    print_header "Creating Plugin Directory"
    mkdir -p "$VST3_DEST_DIR"
    print_message "$GREEN" "Plugin directory: $VST3_DEST_DIR"

    # Find and copy VST3 plugins
    print_header "Installing VST3 Plugins"

    # Count plugins
    PLUGIN_COUNT=$(find "$VST3_SOURCE_DIR" -name "*.vst3" -type d | wc -l | tr -d ' ')
    print_message "$GREEN" "Found $PLUGIN_COUNT VST3 plugins to install"

    # Copy each plugin
    INSTALLED_COUNT=0
    for plugin in "$VST3_SOURCE_DIR"/*_plugin_build/build/*_artefacts/Release/VST3/*.vst3; do
        if [ -d "$plugin" ]; then
            PLUGIN_NAME=$(basename "$plugin")
            print_message "$GREEN" "Installing: $PLUGIN_NAME"

            # Remove existing if present
            if [ -d "$VST3_DEST_DIR/$PLUGIN_NAME" ]; then
                print_message "$YELLOW" "  Removing existing installation"
                rm -rf "$VST3_DEST_DIR/$PLUGIN_NAME"
            fi

            # Copy plugin
            cp -R "$plugin" "$VST3_DEST_DIR/"
            INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
        fi
    done

    # Verify installation
    print_header "Verifying Installation"

    if [ $INSTALLED_COUNT -gt 0 ]; then
        print_message "$GREEN" "✅ Successfully installed $INSTALLED_COUNT VST3 plugins"

        echo ""
        print_message "$GREEN" "Installed plugins:"
        ls -1 "$VST3_DEST_DIR" | grep -E "\.(vst3)$"

        echo ""
        print_message "$GREEN" "Installation complete!"
        echo ""
        print_message "$YELLOW" "Next steps:"
        print_message "$YELLOW" "1. Open Reaper (or your preferred DAW)"
        print_message "$YELLOW" "2. Rescan plugins if needed"
        print_message "$YELLOW" "3. Create new instrument track"
        print_message "$YELLOW" "4. Insert a White Room plugin"
        print_message "$YELLOW" "5. Test basic functionality"
        echo ""
        print_message "$YELLOW" "See MANUAL_TESTING_GUIDE.md for detailed testing instructions"

    else
        print_message "$RED" "❌ No plugins were installed"
        print_message "$RED" "Please check that plugins are built:"
        print_message "$RED" "  cd $PROJECT_ROOT/juce_backend"
        print_message "$RED" "  cmake --build . --config Release"
        exit 1
    fi

    # AU installation (not yet built)
    print_header "AU Plugin Status"
    print_message "$YELLOW" "⚠️  AU plugins not yet built"
    print_message "$YELLOW" "Required for Logic Pro and GarageBand"
    print_message "$YELLOW" "To build AU versions, enable AU format in CMakeLists.txt"
}

# Run main function
main
