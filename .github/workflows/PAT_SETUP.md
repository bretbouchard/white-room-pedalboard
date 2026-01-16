# GitHub Actions CI Setup - Personal Access Token Required

## Why a Personal Access Token (PAT) is Needed

The GitHub Actions workflow uses Git submodules from separate private repositories:
- `bretbouchard/audio_agent_juce`
- `bretbouchard/schillinger-sdk`
- `bretbouchard/swift_frontend`

The default `GITHUB_TOKEN` only has access to the repository where the workflow runs (`white_room_box`), not other repositories even if you own them.

## Solution: Create a Personal Access Token

### Step 1: Create a PAT

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** (classic)
3. Configure the token:
   - **Note**: `white_room_box CI`
   - **Expiration**: 90 days (or your preference)
   - **Select scopes**: Check the box next to **`repo`** (this gives full repository access)
4. Click **"Generate token"**
5. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

### Step 2: Add the PAT to Your Repository Secrets

1. Go to your repository: https://github.com/bretbouchard/white_room_box/settings/secrets/actions
2. Click **"New repository secret"**
3. Name: `PAT_TOKEN`
4. Value: Paste the token you created in Step 1
5. Click **"Add secret"**

### Step 3: Verify CI Works

Once the secret is added, the next workflow run should successfully:
- ✅ Checkout the main repository
- ✅ Clone all submodules
- ✅ Setup Swift 5.9.2
- ✅ Run from the `swift_frontend/` directory
- ✅ Resolve dependencies
- ⚠️ Build will have errors (170 Swift 5.9.2 vs 6.x issues) but won't block CI

## Security Notes

- The PAT is stored as a GitHub secret and never exposed in logs
- Only give the token the minimum required scopes (`repo`)
- Tokens expire - you'll need to create a new one when it expires
- You can revoke the token at any time from: https://github.com/settings/tokens

## Troubleshooting

**Q: CI still fails with "Repository not found"**
- Verify the secret name is exactly `PAT_TOKEN` (all caps)
- Verify the token has the `repo` scope
- Make sure the token wasn't revoked or expired

**Q: I don't see the "New repository secret" option**
- You need admin permissions on the repository
- The URL must be exactly: `https://github.com/bretbouchard/white_room_box/settings/secrets/actions`

**Q: Can I use a different token name?**
- No, the workflow expects `PAT_TOKEN`. You'd need to update the workflow file to use a different name.
# CI Test


