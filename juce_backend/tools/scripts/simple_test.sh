#!/bin/bash

echo "🔍 Simple Plugin Test"
echo "===================="

# Test 1: Check if we can list VST3 plugins directly
echo "📁 VST3 Plugins in /Library/Audio/Plug-Ins/VST3:"
ls -1 "/Library/Audio/Plug-Ins/VST3" | head -10
echo ""

# Test 2: Count total VST3 plugins
VST3_COUNT=$(find "/Library/Audio/Plug-Ins/VST3" -name "*.vst3" -type f 2>/dev/null | wc -l)
echo "📊 Total VST3 plugins found: $VST3_COUNT"

# Test 3: Check AU plugins
echo ""
echo "📁 AU Plugins in /Library/Audio/Plug-Ins/Components:"
ls -1 "/Library/Audio/Plug-Ins/Components" | head -10 2>/dev/null || echo "No AU directory"
echo ""

AU_COUNT=$(find "/Library/Audio/Plug-Ins/Components" -name "*.component" -type f 2>/dev/null | wc -l)
echo "📊 Total AU plugins found: $AU_COUNT"

# Test 4: Total available plugins
TOTAL_PLUGINS=$((VST3_COUNT + AU_COUNT))
echo ""
echo "🎯 TOTAL AVAILABLE PLUGINS: $TOTAL_PLUGINS"

if [ $TOTAL_PLUGINS -gt 100 ]; then
    echo "🎉 EXCELLENT: $TOTAL_PLUGINS plugins available for scanning!"
    echo "✅ PluginLoader should find all of these now"
elif [ $TOTAL_PLUGINS -gt 50 ]; then
    echo "✅ GOOD: $TOTAL_PLUGINS plugins available"
    echo "⚠️  Should be more, but substantial improvement"
elif [ $TOTAL_PLUGINS -gt 0 ]; then
    echo "⚠️  LIMITED: Only $TOTAL_PLUGINS plugins found"
else
    echo "❌ NO PLUGINS FOUND - Check plugin directories"
fi

echo ""
echo "💡 If PluginLoader is fixed, it should now find: $TOTAL_PLUGINS plugins"
echo "   (Previously it only found 3 due to dummy KnownPluginList)"