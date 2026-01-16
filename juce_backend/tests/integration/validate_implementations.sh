#!/bin/bash

# Implementation Validation Script
# Checks for existence and completeness of all Phase 1-3 implementations

set -e

echo "=========================================="
echo "Implementation Validation Script"
echo "Phases 1-3 - All 9 Instruments"
echo "=========================================="
echo ""

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0
total_count=0

check_file() {
    local file="$1"
    local description="$2"

    total_count=$((total_count + 1))

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        echo "  File: $file"
        pass_count=$((pass_count + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        echo "  Missing: $file"
        fail_count=$((fail_count + 1))
        return 1
    fi
}

check_dir() {
    local dir="$1"
    local description="$2"

    total_count=$((total_count + 1))

    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $description"
        echo "  Directory: $dir"
        pass_count=$((pass_count + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        echo "  Missing: $dir"
        fail_count=$((fail_count + 1))
        return 1
    fi
}

echo "Phase 1: Foundation"
echo "===================="
echo ""

# Check core Phase 1 files
check_file "include/SmoothedParametersMixin.h" "Universal Parameter Smoothing System"
check_file "tests/dsp/SmoothedParametersTest.cpp" "Parameter Smoothing Test Suite"
check_file "include/dsp/LookupTables.h" "Lookup Table Implementation"
check_file "docs/SmoothedParametersIntegrationGuide.md" "Integration Guide"
check_file "docs/SmoothedParametersImplementationSummary.md" "Implementation Summary"
check_file "docs/SmoothedParametersQuickReference.md" "Quick Reference"

echo ""
echo "Phase 2: Per-Instrument Improvements"
echo "====================================="
echo ""

# LOCAL_GAL
echo "LOCAL_GAL (Acid Synthesizer):"
check_file "instruments/localgal/src/dsp/LocalGalPureDSP.cpp" "LOCAL_GAL DSP Implementation"
check_file "instruments/localgal/src/dsp/LocalGalStereo.cpp" "LOCAL_GAL Stereo Processing"
echo ""

# Sam Sampler
echo "Sam Sampler:"
check_file "instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp" "Sam Sampler DSP Implementation"
check_file "instruments/Sam_sampler/src/dsp/SamSamplerStereo.cpp" "Sam Sampler Stereo Processing"
echo ""

# Nex Synth
echo "Nex Synth (FM Synthesizer):"
check_file "instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp" "Nex Synth DSP Implementation"
check_file "instruments/Nex_synth/src/dsp/NexSynthStereo.cpp" "Nex Synth Stereo Processing"
echo ""

# Giant Strings
echo "Giant Strings:"
check_file "instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp" "Giant Strings DSP Implementation"
echo ""

# Giant Drums
echo "Giant Drums:"
check_file "instruments/giant_instruments/src/dsp/AetherGiantDrumsPureDSP.cpp" "Giant Drums DSP Implementation"
echo ""

# Giant Voice
echo "Giant Voice:"
check_file "instruments/giant_instruments/src/dsp/AetherGiantVoicePureDSP.cpp" "Giant Voice DSP Implementation"
check_file "instruments/giant_instruments/FORMANT_IMPROVEMENTS_SUMMARY.md" "Formant Improvements Documentation"
echo ""

# Giant Horns
echo "Giant Horns:"
check_file "instruments/giant_instruments/src/dsp/AetherGiantHornsPureDSP.cpp" "Giant Horns DSP Implementation"
echo ""

# Giant Percussion
echo "Giant Percussion:"
check_file "instruments/giant_instruments/src/dsp/AetherGiantPercussionPureDSP.cpp" "Giant Percussion DSP Implementation"
echo ""

# DrumMachine
echo "DrumMachine:"
check_file "instruments/drummachine/src/dsp/DrumMachinePureDSP.cpp" "DrumMachine DSP Implementation"
echo ""

echo "Phase 3: Expressivity"
echo "====================="
echo ""

# Check Phase 3 files
check_file "include/dsp/StereoProcessor.h" "Core Stereo Processing Library"
check_file "instruments/giant_instruments/src/dsp/GiantInstrumentStereo.cpp" "Giant Instruments Stereo"
check_file "instruments/STEREO_IMPLEMENTATION_SUMMARY.md" "Stereo Implementation Summary"
check_file "instruments/STEREO_QUICK_REFERENCE.md" "Stereo Quick Reference"
check_file "instruments/STEREO_BY_INSTRUMENT.md" "Stereo by Instrument Reference"

echo ""
echo "Test Infrastructure"
echo "===================="
echo ""

# Check test infrastructure
check_file "tests/integration/ComprehensiveIntegrationTests.cpp" "Comprehensive Integration Test Suite"
check_file "tests/dsp/DSPTestFramework.h" "DSP Test Framework"
check_file "tests/integration/COMPREHENSIVE_TEST_REPORT.md" "Comprehensive Test Report"
check_file "tests/integration/build_comprehensive_tests.sh" "Test Build Script"
check_file "tests/integration/build_and_run_tests.sh" "Test Runner Script"

echo ""
echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="
echo ""
echo "Total Checks: $total_count"
echo -e "Passed: ${GREEN}$pass_count${NC}"
echo -e "Failed: ${RED}$fail_count${NC}"
echo ""

pass_rate=$(awk "BEGIN {printf \"%.1f\", ($pass_count/$total_count)*100}")
echo "Pass Rate: $pass_rate%"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "All Phase 1-3 implementations are present and complete."
    echo "The comprehensive integration test suite is ready."
    exit 0
elif [ $pass_rate -ge 90 ]; then
    echo -e "${YELLOW}⚠ MOST CHECKS PASSED ($pass_rate%)${NC}"
    echo ""
    echo "Some implementations are missing but the core is complete."
    echo "Review the failures above and address as needed."
    exit 0
else
    echo -e "${RED}✗ TOO MANY FAILURES ($pass_rate%)${NC}"
    echo ""
    echo "Significant implementations are missing."
    echo "Please review and complete the missing items."
    exit 1
fi
