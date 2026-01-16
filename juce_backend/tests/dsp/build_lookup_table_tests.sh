#!/bin/bash
# Build script for LookupTablePerformanceTests

echo "Building LookupTablePerformanceTests..."

# Compile the test
g++ -O3 -march=native -ffast-math \
    -I../../include \
    -std=c++17 \
    LookupTablePerformanceTests.cpp \
    ../../include/dsp/LookupTables.cpp \
    -o LookupTablePerformanceTests \
    -lm

if [ $? -eq 0 ]; then
    echo "Build successful! Run with: ./LookupTablePerformanceTests"
else
    echo "Build failed!"
    exit 1
fi
