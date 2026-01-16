#!/usr/bin/env bash
set -euo pipefail

# Splits the Vitest suite into fixed-size batches of test files to reduce
# memory pressure. Files are discovered with ripgrep globs that mirror the
# default include/exclude rules in vitest.config.ts.
#
# Usage:
#   ./scripts/run-vitest-chunks.sh          # run all chunks sequentially
#   ./scripts/run-vitest-chunks.sh 3        # run only chunk number 3 (1-indexed)
#
# Environment overrides:
#   VITEST_CHUNK_SIZE     -> number of files per chunk (default 40)
#   VITEST_THREADS        -> max workers per chunk (default 1)
#   VITEST_REPORTER       -> reporter (default dot)
#   VITEST_SILENT         -> pass --silent when set to 1 (default 1)
#   VITEST_ARGS           -> extra args appended to each Vitest invocation
#   VITEST_ARGS_CONCURRENCY -> appended with concurrency-safe defaults when unset
#   VITEST_CHUNK_LOG_DIR  -> where to write per-chunk logs (default reports/vitest-chunks)
#   NODE_OPTIONS          -> respected as-is for heap sizing
#   DRY_RUN               -> if set to 1, print chunk summaries and exit without running vitest

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CHUNK_SIZE=${VITEST_CHUNK_SIZE:-40}
THREADS=${VITEST_THREADS:-1}
REPORTER=${VITEST_REPORTER:-dot}
SILENT_FLAG=${VITEST_SILENT:-1}
EXTRA_ARGS=${VITEST_ARGS:-}
CONCURRENCY_ARGS=${VITEST_ARGS_CONCURRENCY:-"--no-file-parallelism --maxConcurrency=1"}
LOG_DIR=${VITEST_CHUNK_LOG_DIR:-reports/vitest-chunks}

mkdir -p "$LOG_DIR"

TEST_FILES=()
if command -v rg >/dev/null 2>&1; then
  while IFS= read -r file; do
    if [[ "$file" == sdk/tests/integration/* && "${RUN_INTEGRATION_TESTS:-false}" != "true" ]]; then
      continue
    fi
    TEST_FILES+=("$file")
  done < <(
    rg --files \
      --iglob '*.{test,spec}.ts' \
      --iglob '*.{test,spec}.tsx' \
      -g '!node_modules/**' \
      -g '!external/**' \
      -g '!lib/sdk/**' \
      -g '!lib/**/node_modules/**' \
      -g '!coverage/**' \
      -g '!dist/**' \
      -g '!.next/**' \
      -g '!reports/**' \
      -g '!tmp/**' \
      -g '!sdk/tests/integration/**' \
      -g '!tests/e2e/**'
  )
else
  echo "ripgrep not found; falling back to find (slower)." >&2
  while IFS= read -r file; do
    if [[ "$file" == ./sdk/tests/integration/* && "${RUN_INTEGRATION_TESTS:-false}" != "true" ]]; then
      continue
    fi
    TEST_FILES+=("$file")
  done < <(
    find . \
      \( -path './node_modules' \
      -o -path './node_modules/*' \
      -o -path './external' \
      -o -path './external/*' \
      -o -path './lib/sdk' \
      -o -path './lib/sdk/*' \
      -o -path './coverage' \
      -o -path './coverage/*' \
      -o -path './dist' \
      -o -path './dist/*' \
      -o -path './.next' \
      -o -path './.next/*' \
      -o -path './reports' \
      -o -path './reports/*' \
      -o -path './tmp' \
      -o -path './tmp/*' \
      -o -path './tests/e2e' \
      -o -path './tests/e2e/*' \) -prune \
      -o \( -type f \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' \) -print \) | sort
  )
fi

TOTAL_FILES=${#TEST_FILES[@]}
if [[ $TOTAL_FILES -eq 0 ]]; then
  echo "No test files found by chunk runner." >&2
  exit 1
fi

TOTAL_CHUNKS=$(((TOTAL_FILES + CHUNK_SIZE - 1) / CHUNK_SIZE))

run_chunk() {
  local index=$1
  local start=$(( (index - 1) * CHUNK_SIZE ))
  local end=$(( start + CHUNK_SIZE ))
  if (( end > TOTAL_FILES )); then
    end=$TOTAL_FILES
  fi
  local -a files=("${TEST_FILES[@]:start:end-start}")
  echo "\n=== Vitest chunk ${index}/${TOTAL_CHUNKS} (${#files[@]} files, maxWorkers=${THREADS}) ==="
  if [[ "${DRY_RUN:-0}" == "1" ]]; then
    printf '%s\n' "${files[@]}"
    return 0
  fi
  local -a frontend_files=()
  local -a other_files=()
  for file in "${files[@]}"; do
    if [[ "$file" == frontend/* ]]; then
      frontend_files+=("${file#frontend/}")
    else
      other_files+=("$file")
    fi
  done

  local log_file="$LOG_DIR/chunk-${index}.log"
  local status=0

  if [[ ${#frontend_files[@]} -gt 0 ]]; then
    echo "Running ${#frontend_files[@]} frontend tests from frontend directory..." | tee "$log_file"
    local frontend_cmd=(npx vitest run --reporter="${REPORTER}" --maxWorkers="${THREADS}")
    if [[ "$SILENT_FLAG" == "1" ]]; then
      frontend_cmd+=(--silent)
    fi
    if [[ -n "$EXTRA_ARGS" ]]; then
      # shellcheck disable=SC2206
      frontend_cmd+=( $EXTRA_ARGS )
    fi
    if [[ -n "$CONCURRENCY_ARGS" ]]; then
      # shellcheck disable=SC2206
      frontend_cmd+=( $CONCURRENCY_ARGS )
    fi
    frontend_cmd+=("${frontend_files[@]}")
    if ! (cd frontend && "${frontend_cmd[@]}") 2>&1 | tee -a "$log_file"; then
      echo "Frontend tests in chunk ${index} failed. Log saved to $log_file" >&2
      status=1
    fi
  fi

  if [[ ${#other_files[@]} -gt 0 ]]; then
    if [[ ${#frontend_files[@]} -eq 0 ]]; then
      : >"$log_file"
    fi
    echo "Running ${#other_files[@]} non-frontend tests from root directory..." | tee -a "$log_file"
    local other_cmd=(npx vitest run --reporter="${REPORTER}" --maxWorkers="${THREADS}" --test-timeout=20000)
    if [[ "$SILENT_FLAG" == "1" ]]; then
      other_cmd+=(--silent)
    fi
    if [[ -n "$EXTRA_ARGS" ]]; then
      # shellcheck disable=SC2206
      other_cmd+=( $EXTRA_ARGS )
    fi
    if [[ -n "$CONCURRENCY_ARGS" ]]; then
      # shellcheck disable=SC2206
      other_cmd+=( $CONCURRENCY_ARGS )
    fi
    other_cmd+=("${other_files[@]}")
    if ! "${other_cmd[@]}" 2>&1 | tee -a "$log_file"; then
      echo "Non-frontend tests in chunk ${index} failed. Log saved to $log_file" >&2
      status=1
    fi
  fi

  return $status
}

if [[ $# -gt 0 ]]; then
  requested_chunk=$1
  if ! [[ $requested_chunk =~ ^[0-9]+$ ]]; then
    echo "Error: chunk must be a positive integer" >&2
    exit 1
  fi
  if (( requested_chunk < 1 || requested_chunk > TOTAL_CHUNKS )); then
    echo "Error: chunk ${requested_chunk} is out of range 1-${TOTAL_CHUNKS}" >&2
    exit 1
  fi
  run_chunk "$requested_chunk"
else
  status=0
  declare -a failed_chunks=()
  for chunk in $(seq 1 "$TOTAL_CHUNKS"); do
    if ! run_chunk "$chunk"; then
      failed_chunks+=("$chunk")
      status=1
    fi
  done

  if (( status != 0 )); then
    echo "\nChunks failed: ${failed_chunks[*]}" >&2
    echo "Re-run a specific chunk with: npm run test:vitest:chunks -- <chunk-number>" >&2
  fi

  exit "$status"
fi
