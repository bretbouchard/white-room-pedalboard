"""Repo-wide MagicMock -> AsyncMock replacer.

Caveats:
- Aggressively replaces `AsyncMock(` -> `AsyncMock(` and updates `from unittest.mock import ...` lines
- Creates a .bak copy for each modified file under the same path with .bak extension
- Run tests after to validate; some changes may break sync expectations
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

pattern_inst = re.compile(r"\bMagicMock\s*\(")
# also match standalone token occurrences like "MagicMock"
pattern_token = re.compile(r"\bMagicMock\b")
pattern_import = re.compile(r"from\s+unittest\.mock\s+import\s+(.*)")

files_changed = []

# Paths we should never touch (virtualenvs, site-packages, VCS, build dirs)
SKIP_SUBSTRS = [
    "/.venv/",
    "/venv/",
    "/site-packages/",
    "/.direnv/",
    "/.pytest_cache/",
    "/.git/",
    "/node_modules/",
    "/build/",
    "/dist/",
]


def should_skip(path: Path) -> bool:
    s = str(path).lower()
    for sub in SKIP_SUBSTRS:
        if sub in s:
            return True
    return False


for p in ROOT.rglob("*.py"):
    try:
        if not p.is_file():
            continue
        if should_skip(p):
            # avoid touching virtualenvs and third-party packages
            continue
        try:
            text = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, PermissionError):
            # skip unreadable files
            continue
        if "MagicMock" not in text:
            continue
        orig = text
        changed = False

        # Replace instantiations MagicMock( -> AsyncMock(
        new_text = pattern_inst.sub("AsyncMock(", text)
        if new_text != text:
            text = new_text
            changed = True

        # Replace bare 'MagicMock' tokens with 'AsyncMock' (assignments/type hints/etc.)
        new_text = pattern_token.sub("AsyncMock", text)
        if new_text != text:
            text = new_text
            changed = True

        # Replace imports from unittest.mock
        def import_repl(m: re.Match):
            rest = m.group(1)
            parts = [x.strip() for x in rest.split(",") if x.strip()]
            # Replace MagicMock with AsyncMock
            parts = ["AsyncMock" if x == "MagicMock" else x for x in parts]
            # Deduplicate while preserving order
            seen = set()
            parts2 = []
            for x in parts:
                if x not in seen:
                    seen.add(x)
                    parts2.append(x)
            return "from unittest.mock import " + ", ".join(parts2)

        new_text = pattern_import.sub(import_repl, text)
        if new_text != text:
            text = new_text
            changed = True

        if changed:
            bak = p.with_suffix(p.suffix + ".bak")
            try:
                # write a backup copy, then overwrite the file
                bak.write_text(orig, encoding="utf-8")
                p.write_text(text, encoding="utf-8")
                files_changed.append(str(p.relative_to(ROOT)))
            except Exception as e:
                print(f"Failed to update {p}: {e}")
    except Exception as e:
        print(f"Unexpected error scanning {p}: {e}")

print(f"Files changed: {len(files_changed)}")
for f in files_changed:
    print(f" - {f}")
