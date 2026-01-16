# SDK -> Backend Endpoint Mapping

This document maps the SDK's unified music endpoints to the implementation in the `schillinger` backend repo. Use this as the authoritative reference when implementing the SDK adapter or offline analyzer.

## High level

- SDK expects unified endpoints:
  - `POST /api/music/generate` (rhythm/melody/harmony generation)
  - `POST /api/music/analyze` (analysis of patterns, rhythms, harmony)

- Actual backend (schillinger) exposes MCP-style endpoints and orchestration routes:
  - `POST /api/v1/mcp/generate` — generic generation using MCP client (model_id, prompt, parameters)
  - `POST /api/v1/mcp/invoke` — invoke a registered tool by `tool_id` and `parameters`
  - Various orchestration and pattern services under `src/schillinger/services/*` and `src/schillinger/generation/*`

## Recommended adapter behavior

Adapter should translate SDK calls to one of the following depending on available runtime:

1. If running against a full schillinger backend, translate SDK payload -> `POST /api/v1/mcp/generate` with body: `{ "model_id": ..., "prompt": ..., "parameters": {...} }` and return the `result` object directly to the SDK caller.

2. If running offline (no AI provider available), use local implementations:
   - For analysis: call `SchillingerMusicAnalyzer` methods (`analyze_pattern`, `analyze_rhythm`, `analyze_melody`, `analyze_harmony`) and return their dict shapes.
   - For generation: call local pattern services (`schillinger/generation/pattern_generator.py` and `schillinger/services/pattern_service.py`) to synthesize deterministic patterns. Fallback to simple deterministic generators based on `complexity`/`seed` when full services are unavailable.

## Concrete route -> model mapping (examples)

- SDK `POST /api/music/generate` (rhythm)
  - Adapter -> `POST /api/v1/mcp/generate`
  - Body example:

    ```json
    {
      "model_id": "schillinger-pattern-v1",
      "prompt": "generate_rhythm",
      "parameters": { "length": 16, "time_signature": "4/4", "complexity": 0.6 }
    }
    ```
  - Expected response: pass-through of MCP `generate` result, typically includes `pattern` (array or structured object), `tempo`, `timeSignature`, and `metadata`.

- SDK `POST /api/music/analyze` (harmony)
  - Adapter -> local analyzer or `POST /api/v1/mcp/invoke` with `tool_id` set to `analyze_harmony`
  - Body example (invoke):

    ```json
    { "tool_id": "analyze_harmony", "parameters": { "progression": ["Cmaj7", "Am7", "Dm7", "G7"] } }
    ```
  - Analyzer response example (from `SchillingerMusicAnalyzer.analyze_harmony`):

    ```json
    { "tension": 0.4, "resolution": 0.6, "tonal_distance": 0.3 }
    ```

## Analyzer return shapes (reference)

- analyze_pattern(pattern) -> { "complexity": float, "density": float, "periodicity": float, "resultants": list }
- analyze_rhythm(rhythm_pattern) -> { "complexity": float, "density": float, "syncopation": float, "resultants": list }
- analyze_melody(melody_pattern) -> { "range": int, "contour": float, "tension": float, "projectional_patterns": list }
- analyze_harmony(chord_progression) -> { "tension": float, "resolution": float, "tonal_distance": float }

## Files of interest (sources)

- src/schillinger/api/mcp_routes.py (MCP endpoints and `generate`/`invoke` handlers)
- src/schillinger/api/orchestration_routes.py (orchestration/pipeline APIs)
- src/schillinger/ai/unified_client.py (AI provider integration and structured generation helpers)
- src/schillinger/analysis/music_analyzer.py (SchillingerMusicAnalyzer reference implementations)
- src/schillinger/generation/pattern_generator.py (pattern generators)

## Next steps

1. Implement SDK adapter: `sdk/packages/python/src/schillinger_sdk/adapter.py` that implements the above translation and configures an offline analyzer fallback.
2. Add unit tests in `sdk/packages/python/tests/` for generate/analyze happy path + offline fallbacks.
3. Add docs and example payloads to `docs/api_examples/music_endpoints.md` (already added).
