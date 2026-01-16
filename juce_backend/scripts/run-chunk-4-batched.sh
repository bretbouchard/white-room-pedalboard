#!/bin/bash

# Run chunk 4 in smaller batches to handle memory-intensive SDK core tests
set -e

echo "=== Running Chunk 4 in smaller batches ==="

# Get all test files and extract chunk 4 (files 31-40)
TEST_FILES=($(find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) | grep -v node_modules | sort))
CHUNK_SIZE=10
CHUNK_START=$((3 * CHUNK_SIZE))  # Chunk 4 starts at index 30 (0-based)
CHUNK_END=$((CHUNK_START + CHUNK_SIZE - 1))

echo "Chunk 4 files (${CHUNK_START}-${CHUNK_END}):"
CHUNK_4_FILES=()
for i in $(seq $CHUNK_START $CHUNK_END); do
  if [[ $i -lt ${#TEST_FILES[@]} ]]; then
    echo "  ${TEST_FILES[$i]}"
    CHUNK_4_FILES+=("${TEST_FILES[$i]}")
  fi
done

# Run in batches of 2 files each
BATCH_SIZE=2
TOTAL_PASSED=0
TOTAL_FAILED=0
BATCH_NUM=1

for ((i=0; i<${#CHUNK_4_FILES[@]}; i+=BATCH_SIZE)); do
  echo ""
  echo "=== Batch $BATCH_NUM (files $((i+1))-$((i+BATCH_SIZE))) ==="
  
  BATCH_FILES=()
  for ((j=i; j<i+BATCH_SIZE && j<${#CHUNK_4_FILES[@]}; j++)); do
    BATCH_FILES+=("${CHUNK_4_FILES[$j]}")
  done
  
  echo "Running: ${BATCH_FILES[@]}"
  
  if NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" npx vitest run "${BATCH_FILES[@]}" \
    --no-file-parallelism --maxConcurrency=1 --pool=forks --poolOptions.forks.singleFork=true \
    --reporter=verbose 2>&1 | tee "reports/vitest-chunks/chunk-4-batch-$BATCH_NUM.log"; then
    echo "✅ Batch $BATCH_NUM passed"
    # Count tests from log
    BATCH_TESTS=$(grep -o '[0-9]\+ passed' "reports/vitest-chunks/chunk-4-batch-$BATCH_NUM.log" | tail -1 | grep -o '[0-9]\+' || echo "0")
    TOTAL_PASSED=$((TOTAL_PASSED + BATCH_TESTS))
  else
    echo "❌ Batch $BATCH_NUM failed"
    TOTAL_FAILED=$((TOTAL_FAILED + 1))
  fi
  
  BATCH_NUM=$((BATCH_NUM + 1))
  
  # Force garbage collection between batches
  sleep 2
done

echo ""
echo "=== Chunk 4 Summary ==="
echo "Total tests passed: $TOTAL_PASSED"
echo "Failed batches: $TOTAL_FAILED"

if [[ $TOTAL_FAILED -eq 0 ]]; then
  echo "🎉 All batches in chunk 4 passed!"
  exit 0
else
  echo "⚠️  Some batches failed"
  exit 1
fi
