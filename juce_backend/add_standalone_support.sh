#!/bin/bash

# Add BUILD_STANDALONE support to all plugins that don't have it
# ===============================================================

PLUGINS=(
    "sam_sampler_plugin_build:SamSampler:com.schillinger.SamSampler"
    "kane_marco_plugin_build:KaneMarcoAether:com.schillinger.KaneMarcoAether"
    "giant_instruments_plugin_build:GiantInstruments:com.schillinger.GiantInstruments"
)

for plugin_info in "${PLUGINS[@]}"; do
    IFS=':' read -r dir target_name bundle_id <<< "$plugin_info"

    echo "Processing: $dir"

    if [ ! -d "$dir" ]; then
        echo "  Directory not found, skipping"
        continue
    fi

    if [ ! -f "$dir/CMakeLists.txt" ]; then
        echo "  CMakeLists.txt not found, skipping"
        continue
    fi

    # Check if BUILD_STANDALONE already exists
    if grep -q "BUILD_STANDALONE" "$dir/CMakeLists.txt"; then
        echo "  Already has BUILD_STANDALONE, skipping"
        continue
    fi

    echo "  Adding BUILD_STANDALONE support..."

    # This is a placeholder - actual edits would be done programmatically
    # For now, we'll manually edit each file
    echo "  Please manually edit $dir/CMakeLists.txt"
    echo ""
done
