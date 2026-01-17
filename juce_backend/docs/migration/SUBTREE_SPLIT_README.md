# Instrument Subtree Split Automation

This repository uses **git subtree split** to automatically maintain individual instrument repositories alongside the main monorepo.

## What This Does

Every time you commit changes to an instrument's folder (e.g., `instruments/localgal/`), those changes are automatically split and pushed to a separate repository:

- `instruments/localgal/` → https://github.com/bretbouchard/localgal-instrument
- `instruments/Sam_sampler/` → https://github.com/bretbouchard/sam-sampler-instrument
- `instruments/Nex_synth/` → https://github.com/bretbouchard/nex-synth-instrument
- `instruments/kane_marco/` → https://github.com/bretbouchard/kane-marco-instrument
- `instruments/giant_instruments/` → https://github.com/bretbouchard/giant-instruments
- `instruments/drummachine/` → https://github.com/bretbouchard/drum-machine-instrument

This preserves full commit history per instrument while maintaining a unified development workflow.

## Setup

### 1. Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "Subtree Split Automation"
4. Select scope: **repo** (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again)

### 2. Set Environment Variable

Add to your shell profile (`~/.zshrc` or `~/.bash_profile`):

```bash
export GH_TOKEN="your_token_here"
```

Or create a `.env` file in the project root:

```bash
echo "GH_TOKEN=your_token_here" > .env
chmod 600 .env
```

## Usage

### Automatic (After Setup)

Subtree splits run automatically **after every commit** that touches instrument files:

```bash
# Make changes to an instrument
vim instruments/localgal/src/dsp/LocalGalPureDSP.cpp

# Commit - subtree split runs automatically
git commit -am "Fix filter resonance bug"

# Output:
# 🔄 Running subtree split for changed instruments...
#   Splitting: LOCAL_GAL
# [INFO] Splitting LOCAL_GAL from instruments/localgal
# [INFO] Running subtree split (this may take a while)...
# [SUCCESS] LOCAL_GAL pushed successfully
# ✅ Subtree split complete
```

### Manual

Run subtree split manually at any time:

```bash
# Split all instruments
.github/scripts/split_instruments.sh

# Split specific instrument
.github/scripts/split_instruments.sh LOCAL_GAL
```

### Skip Split for One Commit

```bash
SKIP_SUBTREE_SPLIT=true git commit -am "WIP commit"
```

## GitHub Actions Automation

The `.github/workflows/instrument-subtree-split.yml` workflow also runs subtree splits on every push to `main` or `juce_backend_clean` branches.

**Required:** Add `GH_PAT_TOKEN` as a repository secret:
1. Go to: https://github.com/bretbouchard/audio_agent_juce/settings/secrets/actions
2. Click "New repository secret"
3. Name: `GH_PAT_TOKEN`, Value: your GitHub token
4. Click "Add secret"

## Benefits

### For Development
- **Unified workflow** - Work on all instruments in one place
- **Shared code** - Easy to refactor across instruments
- **Single build** - One CMake configuration for all plugins

### For Distribution
- **Per-instrument releases** - Users can clone just what they need
- **Independent versioning** - Each instrument has its own git history
- **Clean imports** - Subtree repos contain only instrument-specific code

### For Users
- **Smaller clones** - `git clone` only the instruments they want
- **Clear history** - Commit history is scoped to single instrument
- **Easy contributions** - PRs can target specific instrument repos

## How It Works

The `git subtree split` command:

1. Extracts commits for a specific subdirectory (`instruments/localgal/`)
2. Rewrites commit history to make that subdirectory the new root
3. Pushes the rewritten history to the instrument repository
4. Preserves all commit metadata (author, date, message)

**Important:** The split is **one-way** (monorepo → instrument repo). Never push changes directly to instrument repos - always work in the monorepo.

## Configuration

Edit `.github/scripts/instrument_repos.conf` to add/remove instruments:

```bash
INSTRUMENTS=(
    "NAME|PATH|REPO_URL|BRANCH"
    "LOCAL_GAL|instruments/localgal|https://github.com/bretbouchard/localgal-instrument.git|main"
    # Add more instruments here...
)
```

## Troubleshooting

### "GH_TOKEN not set - skipping subtree split"

Create a GitHub token and set it (see Setup above).

### "Failed to push to remote"

Check that:
- Token has `repo` scope
- Repository URL is correct in `instrument_repos.conf`
- You have push access to the repository

### "Subtree split takes too long"

First split is slow (rewrites entire history). Subsequent splits are fast because they only process new commits.

### Changes not appearing in instrument repo

Check git log to see if instrument files changed:
```bash
git diff HEAD~1 HEAD --name-only | grep '^instruments/'
```

No instrument changes = no split run.

## Files Created

### Scripts
- `.github/scripts/split_instruments.sh` - Main split script
- `.github/scripts/split_single_instrument.sh` - Single instrument wrapper
- `.github/scripts/create_instrument_repos.sh` - Repo creation script
- `.github/scripts/instrument_repos.conf` - Configuration

### Git Hooks
- `.github/scripts/post-commit` - Runs after each commit
- `.github/scripts/post-merge` - Runs after each merge

### Workflows
- `.github/workflows/instrument-subtree-split.yml` - GitHub Actions

## Repository URLs

All repositories are **private**:

| Instrument | Repository |
|-----------|------------|
| LOCAL_GAL | https://github.com/bretbouchard/localgal-instrument |
| Sam Sampler | https://github.com/bretbouchard/sam-sampler-instrument |
| Nex Synth | https://github.com/bretbouchard/nex-synth-instrument |
| Kane Marco | https://github.com/bretbouchard/kane-marco-instrument |
| Giant Instruments | https://github.com/bretbouchard/giant-instruments |
| Drum Machine | https://github.com/bretbouchard/drum-machine-instrument |

## Next Steps

1. **Set GH_TOKEN** - Follow Setup instructions above
2. **Initial split** - Run manual split to populate repos
3. **Test workflow** - Make a test commit and verify auto-split works
4. **CI/CD** - Add `GH_PAT_TOKEN` secret to GitHub Actions

## See Also

- [Git Subtree Split Documentation](https://github.com/git/git/blob/master/Documentation/git-subtree.txt)
- [GitHub Actions Workflow](.github/workflows/instrument-subtree-split.yml)
- [Instrument Configuration](.github/scripts/instrument_repos.conf)
