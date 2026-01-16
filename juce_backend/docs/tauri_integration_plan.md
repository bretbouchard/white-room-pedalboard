# 🦀 Tauri Integration & Maintenance Plan
### For Schillinger / Audio / White Room App Ecosystem

---

## 1. 🎯 Objective

We are adopting **Tauri** as our cross-platform packaging framework for the FastAPI + Next.js stack.  
This choice prioritizes:

- **Native system access** for MIDI, audio, and plug-ins (no container isolation)
- **Lightweight footprint** for local execution and offline capability
- **Secure and maintainable upgrade path** for long-term distribution
- **Unified architecture** that keeps backend, frontend, and agents consistent

This document defines the structure, integration points, and best practices for Tauri builds moving forward.

---

## 2. 🧩 Repository & Folder Structure

### Recommended Layout
```
/project-root/
 ├── backend/                # FastAPI backend
 │   ├── app/
 │   ├── requirements.txt
 │   └── start_backend.sh
 ├── frontend/               # Next.js frontend
 │   ├── public/
 │   ├── src/
 │   ├── next.config.js
 │   └── package.json
 ├── tauri/                  # Tauri wrapper (Rust + config)
 │   ├── src-tauri/
 │   │   ├── main.rs
 │   │   ├── commands.rs
 │   │   └── tauri.conf.json
 │   ├── package.json
 │   └── scripts/
 │       ├── build_all.sh
 │       └── run_dev.sh
 ├── package.json            # root workspace (if monorepo)
 ├── pyproject.toml          # backend package definition (optional)
 └── README.md
```

**Why this layout?**
- Each component (backend, frontend, tauri) can be built/tested independently.
- CI/CD remains clear and modular.
- Avoids circular build dependencies between Node, Python, and Rust.

---

## 3. ⚙️ Build Flow Overview

### Frontend (Next.js)
```bash
cd frontend
pnpm install
pnpm dev        # for development
pnpm build      # creates /frontend/out for Tauri to load
```

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Tauri (Rust + Wrapper)
```bash
cd tauri
pnpm install
pnpm tauri dev    # launches local app w/ live reload
pnpm tauri build  # builds production binaries
```

---

## 4. 🧱 Tauri Configuration

Edit `tauri/src-tauri/tauri.conf.json`:
```json
{
  "build": {
    "beforeBuildCommand": "cd ../frontend && pnpm build",
    "beforeDevCommand": "cd ../frontend && pnpm dev",
    "distDir": "../frontend/out",
    "devPath": "http://localhost:3000"
  },
  "package": {
    "productName": "SchillingerApp",
    "version": "1.0.0"
  }
}
```

**Behavior**
- During `tauri build`, the frontend is built automatically.
- During `tauri dev`, Tauri proxies to the live Next.js server.

---

## 5. 🧠 Backend Launch Integration

In `tauri/src-tauri/main.rs` or `commands.rs`:
```rust
use std::process::Command;

#[tauri::command]
fn start_backend() {
    let _ = Command::new("python")
        .args(["-m", "uvicorn", "backend.app.main:app", "--port", "8000"])
        .spawn()
        .expect("Failed to start FastAPI backend");
}
```

**Summary:**
- Starts FastAPI as a local process on app launch.
- Tauri terminates it cleanly when the app closes.
- Communication between frontend and backend happens via `http://localhost:8000`.

---

## 6. 🧰 Developer Requirements

| Component | Requirement |
|------------|--------------|
| **Rust Toolchain** | Install via `rustup`. Tauri ≥ 2.0 preferred. |
| **Node.js** | v20+ (for Next.js build). |
| **Python** | 3.11+ (for FastAPI backend). |
| **Package Managers** | `pnpm` or `npm` for frontend, `pipx` or `venv` for backend. |
| **OS Support** | macOS ≥ 13, Windows 10+, Ubuntu 22+. |

Bootstrap scripts in `tauri/scripts/bootstrap.[sh|ps1]` will automate setup.

---

## 7. 🔄 Auto-Update Strategy

- Enable the [Tauri updater](https://tauri.app/v1/guides/distribution/updater/).
- Host `update.json` in GitHub Releases, Cloudflare, or S3.
- Versions follow `semver` and sync with backend manifest (`/version` endpoint).
- Signed manifests prevent tampering.

Example:
```json
{
  "version": "1.4.0",
  "notes": "UI optimizations and FastAPI sync improvements",
  "pub_date": "2025-10-06T00:00:00Z",
  "platforms": {
    "darwin-aarch64": { "signature": "...", "url": "https://..." },
    "windows-x86_64": { "signature": "...", "url": "https://..." }
  }
}
```

---

## 8. 🧠 Maintainability Guidelines

- Keep **frontend decoupled** from Tauri — serve static build only.
- Expose only **minimal Rust commands** for system-level features.
- Keep **backend logic** in FastAPI, not in Rust.
- **Version-lock** crates in `Cargo.lock` to prevent drift.

### Version Sync Policy
- Increment `app_version` in `tauri.conf.json` each release.
- Backend `/version` endpoint must match.
- CI will fail if versions mismatch.

### Logging
- Use `tauri::api::log` for UI-level logs.
- Pipe backend logs via WebSocket → unified viewer.

---

## 9. 🧰 System Integration Targets

| Integration | Implementation Path | Notes |
|--------------|---------------------|--------|
| **Audio/MIDI Devices** | FastAPI or Rust plugin (e.g. `midir`, `cpal`) | Rust for real-time ops, Python for flexibility. |
| **File Access** | Tauri `dialog` and `fs` APIs | Configure `allowlist` in `tauri.conf.json`. |
| **Notifications / Tray** | Tauri `system-tray` plugin | Native menu/tray integration. |
| **Drag-and-drop Audio Files** | WebView events → FastAPI upload | Enables waveform or sample analysis. |
| **Clipboard / Screenshots** | `tauri-plugin-clipboard`, `tauri-plugin-screenshot` | Optional UX enhancements. |

---

## 10. 🧩 Upgrade & Compatibility Plan

| Version | Focus | Migration Notes |
|----------|--------|----------------|
| **v1.x → v2.x** | Tauri 2 IPC/multi-platform upgrades | Replace `invoke_handler` with new `Command` pattern. |
| **Next.js 14 → 15** | Static export refinements | Update `distDir` in config. |
| **Python 3.11 → 3.12+** | Minor changes | Verify uvicorn compatibility. |
| **macOS ARM/x86 builds** | Universal binaries | CI uses `lipo` to merge architectures. |

---

## 11. 🔒 Security Baselines

- Use Tauri’s **default CSP** in production.
- Disable `devtools` in release builds.
- Restrict `allowlist` permissions.
- Code-sign and notarize binaries on macOS/Windows.
- Verify updater signatures before applying.

---

## 12. 🚀 Rollout Plan

### Week 1–2
- Scaffold `/tauri` directory
- Integrate frontend + backend subprocess
- Confirm build and live dev flows

### Week 3–4
- Add auto-update + logging
- System tray integration
- CI signing for macOS + Windows

### Week 5–6
- QA: audio/MIDI, updates, process management
- Tag `v1.0.0` release
- Document full developer workflow

---

## 13. 📦 Deliverables

- Cross-platform `.app`, `.exe`, `.AppImage`
- Signed update manifests
- CI/CD build workflows
- Version sync enforcement

---

## 14. ✅ Summary

**Why Tauri**
- Secure, lightweight, and native.
- Perfect for audio/MIDI + AI-integrated local tools.

**Goal**
Deliver a maintainable, cross-platform desktop build that feels native, updates automatically, and maintains full access to local plug-ins, audio, and MIDI systems.

