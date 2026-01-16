#!/bin/bash

#==============================================================================
# Split Single Instrument (Helper Script)
#
# Quick wrapper to split a single instrument without parameters
# Useful for git hooks that need to split specific instruments
#==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Usage check
if [[ -z "$1" ]]; then
    echo "Usage: $0 <instrument_name>"
    echo ""
    echo "Available instruments:"
    echo "  LOCAL_GAL"
    echo "  Sam_Sampler"
    echo "  Nex_Synth"
    echo "  Kane_Marco"
    echo "  Giant_Instruments"
    echo "  Drum_Machine"
    exit 1
fi

# Call main split script
"$SCRIPT_DIR/split_instruments.sh" "$1"
