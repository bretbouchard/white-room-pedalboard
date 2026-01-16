# 🧠 OpenAI Apps SDK Integration Guide  
### Context: Schillinger / AG-UI / Tauri / Clerk / Local-First Architecture  
*(Internal Developer Document — October 2025)*

---

## 1. Purpose

This document describes how to integrate the **OpenAI Apps SDK** (preview, 2025) into our existing ecosystem — including **Schillinger**, **AG-UI**, and **Tauri-packaged local builds** — so our app can run **inside ChatGPT** *and* locally as a standalone AG-UI interface.

Our goal is a **hybrid architecture**:

- **Local-first:** Core logic, data, and state persist locally (via SQLite + Clerk session).  
- **Cloud-synced:** Optional backup and state sync through Supabase/Postgres.  
- **Unified agent backend:** Shared MCP (Model Context Protocol) server connecting both local Tauri app and ChatGPT-embedded instance.  
- **Consistent identity:** Clerk authentication layer reused for both contexts.

---

## 2. Architecture Overview

```
[ ChatGPT + OpenAI Apps SDK ]
            │
            │  (MCP / HTTPS)
            ▼
    ┌───────────────────────────────┐
    │      MCP Gateway Server       │
    │  - FastAPI / LangGraph        │
    │  - Clerk JWT validation       │
    │  - A2A / AG-UI bridge         │
    └───────────────────────────────┘
            │
  ┌─────────┴─────────┐
  │                   │
  ▼                   ▼
[Local Tauri App]   [Supabase Cloud Backup]
(AG-UI frontend)     (optional sync)
```

### Key Characteristics
| Component | Description |
|------------|-------------|
| **ChatGPT App** | Renders inside ChatGPT using OpenAI’s Apps SDK. Connects to our MCP server for logic, UI, and state updates. |
| **Tauri Local App** | AG-UI-based frontend (Next.js + React) with Three.js and audio integration. Full offline mode. |
| **MCP Server (FastAPI)** | Our main agent router. Exposes endpoints to both Tauri and ChatGPT. Handles local/remote storage, state sync, and Clerk identity. |
| **Supabase Cloud Backup** | Periodic backup + optional collaboration. Used for sync, not as primary state. |
| **LangGraph + A2A** | Core orchestration layer for agents, session awareness, and tool registry. |

---

## 3. Why the Apps SDK Matters

- **Native presence inside ChatGPT:** Our Schillinger ecosystem can be accessed conversationally without leaving ChatGPT.  
- **Shared code path:** The same backend, same LangGraph state, and same tools serve both ChatGPT and Tauri.  
- **Developer efficiency:** No duplication of logic; the Apps SDK simply adds a UI wrapper layer via MCP.  
- **User experience:** Seamless transition between local editing and cloud-linked ChatGPT sessions.

---

## 4. Implementation Plan

### Step 1 — Add `/mcp` Endpoint to FastAPI Backend

Create a new router at `/api/mcp`:

```python
# src/backend/routes/mcp.py
from fastapi import APIRouter, Depends
from app.auth import require_clerk_user
from app.mcp import handle_mcp_message

router = APIRouter(prefix="/mcp", tags=["mcp"])

@router.post("")
async def mcp_entry(payload: dict, user=Depends(require_clerk_user)):
    return await handle_mcp_message(payload, user)
```

- This endpoint will handle the OpenAI Apps SDK’s MCP requests.  
- Reuse `require_clerk_user()` from our current session validation logic.

---

### Step 2 — Define the App Manifest

Add a new file:  
`/apps/schillinger/manifest.json`

```json
{
  "name": "Schillinger Composer",
  "description": "Generative composition environment using LangGraph + Schillinger system.",
  "mcp_server": "https://api.schillinger.app/api/mcp",
  "capabilities": ["ui", "music_generation", "state_sync"],
  "auth": {
    "type": "oauth2",
    "provider": "clerk",
    "scopes": ["openid", "profile", "email"]
  },
  "icon": "https://cdn.schillinger.app/assets/icon.png",
  "developer": "Vector Labs"
}
```

This manifest allows ChatGPT to load our app, discover capabilities, and communicate securely via MCP.

---

### Step 3 — UI Schema Definition

Define how UI components appear inside ChatGPT.

`/apps/schillinger/ui_schema.json`

```json
{
  "components": [
    {
      "type": "music_block_editor",
      "inputs": ["chords", "notes", "rhythm"],
      "bindings": {
        "session_id": "session.uuid",
        "scale": "session.scale"
      },
      "actions": [
        { "label": "Generate", "event": "generate_notes" },
        { "label": "Analyze", "event": "analyze_pattern" }
      ]
    }
  ]
}
```

Inside ChatGPT, the Apps SDK renders equivalent native UI widgets.

---

### Step 4 — Synchronize Session State

- Use `LangGraphSession` for in-memory context.  
- Mirror all local changes (AG-UI edits, note/rhythm updates) to a `session.json` file stored locally.  
- Periodically push to Supabase for backup.  
- The ChatGPT app reads/writes via MCP calls → same session schema.

```ts
// Example: AG-UI sync hook
copilot.onUpdate(async (state) => {
  await fetch("/api/mcp", {
    method: "POST",
    headers: { "Authorization": `Bearer ${clerk.sessionToken}` },
    body: JSON.stringify({ type: "state_update", state })
  })
})
```

---

### Step 5 — Integrate with Tauri Build

#### Directory Layout

```
root/
 ├─ frontend/            # Next.js + AG-UI
 ├─ backend/             # FastAPI (MCP included)
 ├─ tauri/               # Desktop wrapper
 │   ├─ src-tauri/
 │   ├─ build.rs
 │   └─ tauri.conf.json
 ├─ apps/
 │   └─ schillinger/     # Apps SDK integration files
 └─ docs/
     └─ integration/
         └─ openai-apps-sdk.md
```

#### Build Steps
1. `pnpm build --filter frontend`  
2. `poetry run fastapi build`  
3. `tauri build`

Resulting app includes:
- Local server for MCP calls (`http://localhost:43110`)  
- Cloud-backup layer with Supabase sync  
- Same endpoint accessible remotely for ChatGPT app  

---

## 5. Security & Auth

- **Clerk as shared identity layer**  
  - ChatGPT app uses OAuth via Clerk.  
  - Local app uses Clerk’s embedded session (via JWT).  
  - Server verifies JWT in both cases for unified user ID.

- **Local-first principle**  
  - No sensitive data sent to OpenAI directly.  
  - ChatGPT app interacts only via authenticated MCP requests.  
  - Cloud backup is opt-in and encrypted before upload.

---

## 6. Development Workflow

| Task | Command | Description |
|------|----------|-------------|
| Run backend locally | `poetry run uvicorn app.main:app --reload` | Starts FastAPI with `/mcp` route. |
| Run frontend (AG-UI) | `pnpm dev --filter frontend` | Runs AG-UI in dev mode. |
| Run Tauri shell | `pnpm tauri dev` | Local test build with embedded backend. |
| Register app in ChatGPT | Upload manifest.json | Temporarily link our app for testing. |

---

## 7. Future Enhancements

- **Two-way live sync** between ChatGPT and local Tauri app via WebSocket.  
- **Offline mode detection** and deferred cloud backup queue.  
- **Encrypted Supabase row-level security (RLS)** for session data.  
- **Shared Observability** via CopilotKit hooks (`onPlan`, `onToolCall`).

---

## 8. Developer Notes

- Apps SDK is still in preview; expect API changes.  
- Keep `/apps/schillinger/manifest.json` versioned separately for easy updates.  
- Avoid coupling ChatGPT-UI logic too tightly — render through abstract JSON schema components.  
- Ensure LangGraph sessions remain deterministic between local and ChatGPT contexts.  
- Prefer **local → cloud → ChatGPT** flow for state propagation, not the reverse.

---

## 9. References

- 🔗 [OpenAI Apps SDK (Preview)](https://developers.openai.com/apps-sdk)  
- 🔗 [Model Context Protocol (MCP)](https://github.com/openai/model-context-protocol)  
- 🔗 [LangGraph Framework](https://github.com/langchain-ai/langgraph)  
- 🔗 [CopilotKit AG-UI](https://github.com/CopilotKit/CopilotKit)  
- 🔗 [Clerk for OAuth Integration](https://clerk.com/docs)  
- 🔗 [Tauri Desktop Framework](https://tauri.app)
