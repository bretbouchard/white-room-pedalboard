#!/bin/bash
# Run all Phase 2 instrument tests individually

echo ""
echo "==========================================="
echo "Phase 2 Instrument Test Suite"
echo "==========================================="
echo ""

PASS_COUNT=0
FAIL_COUNT=0

# Test 1: NexSynth
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1/5: NexSynth"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "./NexSynthDSP_PureTest" ]; then
    if ./NexSynthDSP_PureTest; then
        ((PASS_COUNT++))
        echo "✅ NexSynth: PASSED"
    else
        ((FAIL_COUNT++))
        echo "❌ NexSynth: FAILED"
    fi
else
    echo "⚠️  NexSynth test binary not found - compiling..."
    if g++ -std=c++17 \
        -I../../../juce_backend/include \
        -I../../../juce_backend/instruments/Nex_synth/include \
        NexSynthDSP_PureTest.cpp \
        ../../instruments/Nex_synth/src/dsp/NexSynthDSP_Pure.cpp \
        ../../../juce_backend/src/dsp/InstrumentFactory.cpp \
        -o NexSynthDSP_PureTest 2>&1; then
        if ./NexSynthDSP_PureTest; then
            ((PASS_COUNT++))
            echo "✅ NexSynth: PASSED"
        else
            ((FAIL_COUNT++))
            echo "❌ NexSynth: FAILED"
        fi
    else
        ((FAIL_COUNT++))
        echo "❌ NexSynth: COMPILATION FAILED"
    fi
fi
echo ""

# Test 2: SamSampler
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2/5: SamSampler"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "./SamSamplerDSP_PureTest" ]; then
    if ./SamSamplerDSP_PureTest; then
        ((PASS_COUNT++))
        echo "✅ SamSampler: PASSED"
    else
        ((FAIL_COUNT++))
        echo "❌ SamSampler: FAILED"
    fi
else
    echo "⚠️  SamSampler test binary not found - compiling..."
    if g++ -std=c++17 \
        -I../../../juce_backend/include \
        -I../../../juce_backend/instruments/Sam_sampler/include \
        SamSamplerDSP_PureTest.cpp \
        ../../instruments/Sam_sampler/src/dsp/SamSamplerDSP_Pure.cpp \
        ../../../juce_backend/src/dsp/InstrumentFactory.cpp \
        -o SamSamplerDSP_PureTest 2>&1; then
        if ./SamSamplerDSP_PureTest; then
            ((PASS_COUNT++))
            echo "✅ SamSampler: PASSED"
        else
            ((FAIL_COUNT++))
            echo "❌ SamSampler: FAILED"
        fi
    else
        ((FAIL_COUNT++))
        echo "❌ SamSampler: COMPILATION FAILED"
    fi
fi
echo ""

# Test 3: KaneMarcoAether (Aether String v2)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3/5: KaneMarcoAether (Aether String v2)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "./KaneMarcoAetherPureDSPTest" ]; then
    if ./KaneMarcoAetherPureDSPTest; then
        ((PASS_COUNT++))
        echo "✅ KaneMarcoAether: PASSED"
    else
        ((FAIL_COUNT++))
        echo "❌ KaneMarcoAether: FAILED"
    fi
else
    echo "⚠️  KaneMarcoAether test binary not found - compiling..."
    if g++ -std=c++17 \
        -I../../../juce_backend/include \
        -I../../../juce_backend/instruments/kane_marco/include \
        KaneMarcoAetherPureDSPTest.cpp \
        ../../instruments/kane_marco/src/dsp/KaneMarcoAetherPureDSP.cpp \
        ../../../juce_backend/src/dsp/InstrumentFactory.cpp \
        -o KaneMarcoAetherPureDSPTest 2>&1; then
        if ./KaneMarcoAetherPureDSPTest; then
            ((PASS_COUNT++))
            echo "✅ KaneMarcoAether: PASSED"
        else
            ((FAIL_COUNT++))
            echo "❌ KaneMarcoAether: FAILED"
        fi
    else
        ((FAIL_COUNT++))
        echo "❌ KaneMarcoAether: COMPILATION FAILED"
    fi
fi
echo ""

# Test 4: KaneMarco (Virtual Analog)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4/5: KaneMarco (Virtual Analog)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "./KaneMarcoPureDSPTest" ]; then
    if ./KaneMarcoPureDSPTest; then
        ((PASS_COUNT++))
        echo "✅ KaneMarco: PASSED"
    else
        ((FAIL_COUNT++))
        echo "❌ KaneMarco: FAILED"
    fi
else
    echo "⚠️  KaneMarco test binary not found - compiling..."
    if g++ -std=c++17 \
        -I../../../juce_backend/include \
        -I../../../juce_backend/instruments/kane_marco/include \
        KaneMarcoPureDSPTest.cpp \
        ../../instruments/kane_marco/src/dsp/KaneMarcoPureDSP.cpp \
        ../../../juce_backend/src/dsp/InstrumentFactory.cpp \
        -o KaneMarcoPureDSPTest 2>&1; then
        if ./KaneMarcoPureDSPTest; then
            ((PASS_COUNT++))
            echo "✅ KaneMarco: PASSED"
        else
            ((FAIL_COUNT++))
            echo "❌ KaneMarco: FAILED"
        fi
    else
        ((FAIL_COUNT++))
        echo "❌ KaneMarco: COMPILATION FAILED"
    fi
fi
echo ""

# Test 5: LocalGal
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5/5: LocalGal"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "./LocalGalPureDSPTest" ]; then
    if ./LocalGalPureDSPTest; then
        ((PASS_COUNT++))
        echo "✅ LocalGal: PASSED"
    else
        ((FAIL_COUNT++))
        echo "❌ LocalGal: FAILED"
    fi
else
    echo "⚠️  LocalGal test binary not found - compiling..."
    if g++ -std=c++17 \
        -I../../../juce_backend/include \
        -I../../../juce_backend/instruments/localgal/include \
        LocalGalPureDSPTest.cpp \
        ../../instruments/localgal/src/dsp/LocalGalPureDSP.cpp \
        ../../../juce_backend/src/dsp/InstrumentFactory.cpp \
        -o LocalGalPureDSPTest 2>&1; then
        if ./LocalGalPureDSPTest; then
            ((PASS_COUNT++))
            echo "✅ LocalGal: PASSED"
        else
            ((FAIL_COUNT++))
            echo "❌ LocalGal: FAILED"
        fi
    else
        ((FAIL_COUNT++))
        echo "❌ LocalGal: COMPILATION FAILED"
    fi
fi
echo ""

# Summary
echo "==========================================="
echo "SUMMARY"
echo "==========================================="
echo ""
echo "Total Instruments: 5"
echo "Passed: $PASS_COUNT/5"
echo "Failed: $FAIL_COUNT/5"
echo ""

if [ $PASS_COUNT -eq 5 ]; then
    echo "🎉 ALL TESTS PASSED! Phase 2 complete!"
    echo ""
    echo "All 5 Phase 2 Pure DSP instruments validated:"
    echo "  ✅ NexSynth - FM synthesizer"
    echo "  ✅ SamSampler - SF2 sampler"
    echo "  ✅ KaneMarcoAether - Aether String v2 physical modeling"
    echo "  ✅ KaneMarco - Virtual analog synthesizer"
    echo "  ✅ LocalGal - Feel Vector synthesizer"
    exit 0
else
    echo "⚠️  Some tests failed. Please review."
    exit 1
fi
