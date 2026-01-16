 # Schillinger Music API — Example requests & responses

This file captures canonical example JSON for the music generation and analysis flows used by the SDK. It maps the SDK `/music/*` expectations to the backend routes found in the `schillinger` repository:



- LangGraph generation routes: `src/schillinger/mcp/orchestration/langgraph_api.py` (POST `/generate`, `/generate/pattern`, `/generate/advanced`)

- MCP protocol route: `src/schillinger/api/mcp_server.py` (POST `/mcp/v1/query` — used for higher-level "generate composition" queries)

- Analyzer helpers: `src/schillinger/analysis/music_analyzer.py` (used for analysis outputs)

Notes:
- The SDK's `/api/music/generate` can map either to the LangGraph `/generate*` endpoints (pattern/note/rhythm generation) or to the MCP `/mcp/v1/query` with a `"generate ..."` query. Both example shapes are provided below.
- The SDK's `/api/music/analyze` is represented by the analyzer methods in `music_analyzer.py` and returns the analysis shapes shown below.

---
# Schillinger Music API — Example requests & responses

This document contains canonical example JSON for the music generation and analysis flows the SDK expects. It also maps those SDK expectations to where the logic lives in the `schillinger` repository.

Key backend mappings

- LangGraph generation routes: `src/schillinger/mcp/orchestration/langgraph_api.py` (POST `/generate`, `/generate/pattern`, `/generate/advanced`)

- MCP protocol route: `src/schillinger/api/mcp_server.py` (POST `/mcp/v1/query`) — used for higher-level "generate composition" queries

- Analyzer helpers: `src/schillinger/analysis/music_analyzer.py` (analysis primitives like `analyze_rhythm`, `analyze_melody`, `analyze_harmony`)

Notes

- The SDK's unified `/api/music/generate` can be implemented as an adapter that either calls the LangGraph `/generate*` endpoints (for pattern/note/rhythm generation) or the MCP `/mcp/v1/query` (for full composition generation). Example shapes for both approaches are below.

- The SDK's `/api/music/analyze` should map to analysis primitives in `music_analyzer.py`; examples of rhythm/melody/harmony analysis shapes are below.

---

## 1) LangGraph-style generation (POST /generate)

Request (GenerationRequest)

```json
{
  "prompt": "Create a short 8-bar rhythm pattern with a driving pop feel",
  "key": "C",
  "scale_type": "major",
  "emotion": "energetic",
  "filters": {"max_complexity": 6},
  "constraints": {"tempo": 120, "time_signature": "4/4"},
  "reference_pattern": null,
  "user_context": {"project": "demo"},
  "variation_type": null
}
```

Response (GenerationResponse) — example

```json
{
  "status": "success",
  "data": {
    "pattern_id": "pat_01",
    "notes": [60, 62, 64, 65, 67, 65, 64, 62],
    "durations": [0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],
    "metadata": {"tempo": 120, "time_signature": "4/4", "style": "pop"}
  },
  "chord_progression": null,
  "note_pattern": {
    "notes": [60,62,64,65,67,65,64,62],
    "durations": [0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],
    "key": "C",
    "scale_type": "major"
  },
  "rhythm_pattern": {
    "beats": [0,1,2,3],
    "durations": [1,1,1,1],
    "time_signature": "4/4"
  },
  "valid": true,
  "validation_message": null
}
```

---

## 2) MCP-style composition generation (POST /mcp/v1/query)

Request (MCPRequest)

```json
{
  "query": "generate composition",
  "parameters": {
    "key": "C",
    "scale": "major",
    "tempo": 100,
    "style": "jazz",
    "chord_progressions": [
      {"bars": 4, "chords": ["I","vi","IV","V"]}
    ],
    "intensity": 0.7
  },
  "session_id": "session_123"
}
```

Response (MCPResponse) — example

```json
{
  "response": {
    "composition": {
      "id": "comp_01",
      "sections": [
        {"name": "A", "bars": 8, "patterns": [{"type":"note","id":"pat_01"}]}
      ],
      "metadata": {"tempo": 100, "key": "C", "style": "jazz"}
    },
    "format": "json",
    "status": "success"
  },
  "session_id": "session_123",
  "status": "success",
  "metadata": {"schillinger_version": "1.0.0"}
}
```

---

## Concrete examples for the updated SDK endpoints

Below are concrete, realistic JSON responses matching the updated SDK adapter wiring. Use these in docs or API examples to show the exact payloads returned by the updated endpoints.

### A) POST /api/v1/mcp/generate (pattern generation)

Request (example):

```json
{
  "model_id": "schillinger-pattern-v1",
  "prompt": "pattern",
  "parameters": {
    "generators": [3,5],
    "length": 8,
    "tempo": 120,
    "timeSignature": [4,4]
  }
}
```

Response (realistic example):

```json
{
  "status": "success",
  "data": {
    "pattern_id": "pat_live_20250929_001",
    "pattern": [1,0,0,1,0,0,1,0],
    "tempo": 120,
    "timeSignature": [4,4],
    "generators": [3,5],
    "metadata": {
      "source": "mcp.generate",
      "model": "schillinger-pattern-v1",
      "created_at": "2025-09-29T19:12:34Z"
    }
  }
}
```

Replaced with an exact, reproducible offline adapter output captured from the SDK (used when the SDK is configured with `offline_mode=true`). This is what the SDK adapter currently returns as a deterministic fallback:

```json
{
  "pattern": [
    1,
    0,
    0,
    1,
    0,
    0,
    1,
    0
  ],
  "tempo": 120,
  "timeSignature": [
    4,
    4
  ],
  "metadata": {
    "source": "offline_adapter"
  }
}
```

### B) POST /api/v1/mcp/invoke (analysis / tool invoke)

Request (example):

```json
{
  "tool_id": "analyze_harmony",
  "parameters": {
    "progression": ["C","G","Am","F"],
    "context": {"tempo": 100}
  }
}
```

Response (realistic example):

```json
{
  "status": "success",
  "tool_id": "analyze_harmony",
  "result": {
    "type": "harmony",
    "tension": 0.42,
    "resolution": 0.76,
    "tonal_distance": 0.18,
    "key_suggestion": "C",
    "cadences": [
      {"position": 3, "type": "authentic", "confidence": 0.92}
    ],
    "metadata": {"analyzer_version": "v0.9.3", "source": "mcp.invoke"}
  }
}
```

Replaced with the adapter's minimal offline analyzer fallback captured from the SDK (deterministic, reproducible):

```json
{
  "tension": 0.0,
  "resolution": 1.0,
  "tonal_distance": 0.0,
  "source": "offline_adapter"
}
```

---

## 3) Analysis examples (representing `SchillingerMusicAnalyzer` outputs)

Rhythm analysis (analyze_rhythm)

```json
{
  "type": "rhythm",
  "complexity": 0.5,
  "density": 0.6,
  "syncopation": 0.4,
  "resultants": []
}
```

Pattern / melody analysis (analyze_pattern / analyze_melody)

```json
{
  "type": "melody",
  "range": 12,
  "contour": 0.3,
  "tension": 0.5,
  "projectional_patterns": []
}
```

Harmony analysis (analyze_harmony)

```json
{
  "type": "harmony",
  "tension": 0.4,
  "resolution": 0.6,
  "tonal_distance": 0.3
}
```

---

Usage notes and mapping guidance

- If you want a single unified `/api/music/generate` in the SDK, implement a small adapter that inspects the SDK request and either calls the LangGraph `/generate*` endpoints (pattern-level) or issues an MCP `/mcp/v1/query` (composition-level). The request/response examples above provide canonical payload shapes.

- For `/api/music/analyze`, send `{ "type": "rhythm|melody|harmony", "data": ... }` and map the analyzer helpers' result to the response shapes above.

If you'd like I can:

- Add a small local adapter in the SDK that exposes `/api/music/generate` and `/api/music/analyze` and routes to LangGraph/MCP/analyzer functions with offline fallbacks.

- Capture live examples from a deployed backend (`schillinger-backend.fly.dev`) and replace the canonical examples with real outputs.

---

Files referenced

- `src/schillinger/mcp/orchestration/langgraph_api.py` (GenerationRequest/GenerationResponse)

- `src/schillinger/api/mcp_server.py` (MCPRequest/MCPResponse)

- `src/schillinger/analysis/music_analyzer.py` (analyze_* methods)
---

## 1) LangGraph-style generation (POST /generate)

Request (GenerationRequest) — fields correspond to `GenerationRequest` in `langgraph_api.py`:

```json
{
  "prompt": "Create a short 8-bar rhythm pattern with a driving pop feel",
  "key": "C",
  "scale_type": "major",
  "emotion": "energetic",
  "filters": {"max_complexity": 6},
  "constraints": {"tempo": 120, "time_signature": "4/4"},
  "reference_pattern": null,
  "user_context": {"project": "demo"},
  "variation_type": null
}
```

Response (GenerationResponse) — trimmed example using the `GenerationResponse` model:

```json
{
  "status": "success",
  "data": {
    "pattern_id": "pat_01",
    "notes": [60, 62, 64, 65, 67, 65, 64, 62],
    "durations": [0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],
    "metadata": {"tempo": 120, "time_signature": "4/4", "style": "pop"}
  },
  "chord_progression": null,
  "note_pattern": {
    "notes": [60,62,64,65,67,65,64,62],
    "durations": [0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],
    "key": "C",
    "scale_type": "major"
  },
  "rhythm_pattern": {
    "beats": [0,1,2,3],
    "durations": [1,1,1,1],
    "time_signature": "4/4"
  },
  "valid": true,
  "validation_message": null
}
```

---

## 2) MCP-style composition generation (POST /mcp/v1/query)

Request (MCPRequest) when asking the MCP server to "generate composition":

```json
{
  "query": "generate composition",
  "parameters": {
    "key": "C",
    "scale": "major",
    "tempo": 100,
    "style": "jazz",
    "chord_progressions": [
      {"bars": 4, "chords": ["I","vi","IV","V"]}
    ],
    "intensity": 0.7
  },
  "session_id": "session_123"
}
```

Response (MCPResponse) — MCP wrapper around the composition result. `response.composition` contains the generated composition JSON.

```json
{
  "response": {
    "composition": {
      "id": "comp_01",
      "sections": [
        {"name": "A", "bars": 8, "patterns": [{"type":"note","id":"pat_01"}]}
      ],
      "metadata": {"tempo": 100, "key": "C", "style": "jazz"}
    },
    "format": "json",
    "status": "success"
  },
  "session_id": "session_123",
  "status": "success",
  "metadata": {"schillinger_version": "1.0.0"}
}
```

---

## 3) Analysis examples (representing `SchillingerMusicAnalyzer` outputs)

The analyzer provides several analysis primitives. The SDK's `/api/music/analyze` can return one of these shapes depending on `type` (e.g., `rhythm`, `melody`, `harmony`).

- Rhythm analysis (analyze_rhythm):

```json
{
  "type": "rhythm",
  "complexity": 0.5,
  "density": 0.6,
  "syncopation": 0.4,
  "resultants": []
}
```

- Pattern/melody analysis (analyze_pattern / analyze_melody):

```json
{
  "type": "melody",
  "range": 12,
  "contour": 0.3,
  "tension": 0.5,
  "projectional_patterns": []
}
```

- Harmony analysis (analyze_harmony):

```json
{
  "type": "harmony",
  "tension": 0.4,
  "resolution": 0.6,
  "tonal_distance": 0.3
}
```

---

Usage notes and mapping guidance

- If you want the SDK to call a single unified endpoint `/api/music/generate`, implement a small HTTP adapter that translates that unified SDK payload into either a LangGraph `/generate*` call (for patterns) or into an MCP `/mcp/v1/query` with `"generate composition"` for full compositions. The LangGraph `GenerationRequest` and MCP `MCPRequest` examples above give canonical shapes.

- For `/api/music/analyze`, the SDK should send {"type":"rhythm|melody|harmony","data":...} and map the backend analyzer outputs to the analyzer response shapes shown above.

If you'd like I can:

- Add a small local adapter in the SDK that exposes `/api/music/generate` and `/api/music/analyze` and routes to the langgraph/mcp/analyzer functions offline (AI-free fallbacks where available).

- Run the local backend and capture live outputs from an existing deployed backend (`schillinger-backend.fly.dev`) if you prefer working with real production samples instead of these hand-crafted canonical examples.

---

Files referenced:

- `src/schillinger/mcp/orchestration/langgraph_api.py` (GenerationRequest/GenerationResponse)

- `src/schillinger/api/mcp_server.py` (MCPRequest/MCPResponse)

- `src/schillinger/analysis/music_analyzer.py` (analyze_* methods)
