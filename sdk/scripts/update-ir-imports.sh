#!/bin/bash

# Update IR Type Imports in /core
#
# This script updates imports of IR types from @schillinger-sdk/shared
# to use relative imports from ./ir instead.

set -e

echo "🔄 Updating IR type imports in /core..."

# List of IR types that should be imported from ./ir
IR_TYPES=(
  "PatternIR"
  "InstrumentIR"
  "ControlIR"
  "TimelineIR"
  "SongGraphIR"
  "SongPlacementIR"
  "SignalGraphIR"
  "ProcessIR"
  "StructuralIR"
  "MixIR"
  "SceneIR"
  "RoleIR"
  "ConstraintIR"
  "RealizationPolicyIR"
  "GraphInstanceIR"
  "ParameterBindingIR"
  "AutomationIR"
  "PerformanceContextIR"
  "VariationIntentIR"
  "NamespaceIR"
  "IntentIR"
  "HumanIntentIR"
  "GestureIR"
  "ExplainabilityIR"
  "SongIR"
  "SectionIR"
  "RoleIR"
)

# Find all .ts files in /core (excluding .d.ts)
find core -name "*.ts" -not -name "*.d.ts" -type f | while read -r file; do
  # Check if file imports from @schillinger-sdk/shared
  if grep -q "from '@schillinger-sdk/shared'" "$file"; then
    # Check if the import contains IR types
    for type in "${IR_TYPES[@]}"; do
      if grep -q "$type" "$file"; then
        # Update the import
        sed -i '' "s|from '@schillinger-sdk/shared'|from './ir'|g" "$file"
        echo "✓ Updated $file"
        break  # Only update once per file
      fi
    done
  fi
done

echo ""
echo "✅ Import updates complete!"
echo ""
echo "📝 Next: Run TypeScript compilation to verify"
