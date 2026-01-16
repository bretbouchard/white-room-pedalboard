#!/bin/bash
# Build JUCE backend for ALL platforms
echo "🚀 Building JUCE backend for all platforms..."
./build_ios_device.sh
./build_ios_simulator.sh
./build_tvos.sh
./build_tvos_simulator.sh
./build_macos.sh
echo "✅ All platforms built successfully!"
