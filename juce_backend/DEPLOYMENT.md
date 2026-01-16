# Deployment Guide

## Overview

This guide provides step-by-step deployment procedures for all White Room plugin formats across target platforms.

## Pre-Deployment Checklist

Before deploying any plugin format:

- [ ] All unit tests pass (`ctest`)
- [ ] Golden render tests pass
- [ ] No memory leaks (AddressSanitizer clean)
- [ ] Performance benchmarks within acceptable range
- [ ] Code coverage > 80%
- [ ] Documentation updated
- [ ] Version number bumped
- [ ] Git tag created for release
- [ ] Release notes written

---

## LV2 Deployment (Linux / Raspberry Pi)

### Building for Linux

**Prerequisites**:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y cmake ninja-build build-essential \
  liblv2-dev libnlohmann-json3-dev libgtest-dev
```

**Build Command**:
```bash
cd juce_backend
cmake -B build \
  -GNinja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX=/usr \
  -DBUILD_LV2_PLUGINS=ON

cmake --build build --target lv2_plugins -j$(nproc)
```

**Installation**:
```bash
# System-wide installation
sudo cmake --install build --strip

# User-local installation
cmake --install build --prefix ~/.local --strip

# Verify installation
lv2info /usr/lib/lv2/FilterGate.lv2/
```

### Building for Raspberry Pi

**Cross-Compilation from macOS/Linux**:

```bash
# Install ARM toolchain
sudo apt-get install -y gcc-arm-linux-gnueabihf g++-arm-linux-gnueabihf

# Configure for ARMv7 (Pi 3/4)
cmake -B build-pi \
  -DCMAKE_TOOLCHAIN_FILE=cmake/raspberrypi-toolchain.cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_LV2_PLUGINS=ON \
  -DPI_ARCH=armv7

# Configure for ARM64 (Pi 5)
cmake -B build-pi \
  -DCMAKE_TOOLCHAIN_FILE=cmake/raspberrypi-toolchain.cmake \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_LV2_PLUGINS=ON \
  -DPI_ARCH=arm64

cmake --build build-pi --target lv2_plugins -j$(nproc)
```

**Native Build on Pi**:
```bash
# SSH into Pi
ssh pi@raspberrypi

# Clone repository
git clone https://github.com/yourusername/white_room.git
cd white_room/juce_backend

# Build
cmake -B build \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_LV2_PLUGINS=ON
cmake --build build --target lv2_plugins -j4

# Install
sudo cmake --install build --strip
```

### Packaging

```bash
# Create LV2 bundle package
cd juce_backend
mkdir -p dist
tar -czvf dist/whiteroom-lv2-$(git describe --tags).tar.gz \
  -C /usr/lib/lv2 FilterGate.lv2

# Or create Debian package
cpack -G DEB -C build
```

### Distribution

**System Package Manager**:
```bash
# Add PPA (if available)
sudo add-apt-repository ppa:yourname/whiteroom
sudo apt-get update
sudo apt-get install whiteroom-lv2
```

**Manual Installation**:
```bash
# Download release
wget https://github.com/yourname/white_room/releases/download/v1.0.0/whiteroom-lv2-v1.0.0.tar.gz

# Extract and install
tar -xzf whiteroom-lv2-v1.0.0.tar.gz
sudo cp -r FilterGate.lv2 /usr/lib/lv2/
```

**Raspberry Pi Image**:
```bash
# Create plugin bundle for Pi
ssh pi@raspberrypi "tar -czvf - /usr/lib/lv2/FilterGate.lv2" > dist/whiteroom-lv2-pi.tar.gz

# Users can extract on Pi
tar -xzf whiteroom-lv2-pi.tar.gz -C /usr/lib/lv2/
```

### LV2 Host Compatibility

Tested hosts:
- Ardour 6.0+
- Reaper 6.0+
- Bitwig Studio 4.0+
- Carla 2.5+
- Patchage (for patching)

### Troubleshooting

**Issue**: Plugin not found by host
```bash
# Check LV2_PATH
echo $LV2_PATH

# Add to path
export LV2_PATH=/usr/lib/lv2:$LV2_PATH

# Verify bundle structure
ls -la /usr/lib/lv2/FilterGate.lv2/
# Should contain: manifest.ttl, FilterGate.so, etc.
```

**Issue**: Plugin fails to load
```bash
# Check dependencies
ldd /usr/lib/lv2/FilterGate.lv2/FilterGate.so

# Verify with lv2info
lv2info /usr/lib/lv2/FilterGate.lv2/

# Check host logs
tail -f ~/.config/REAPER/reaper-vstplugins64.log
```

---

## AUv3 Deployment (iOS)

### Building for iOS

**Prerequisites**:
- Xcode 14.0+
- iOS SDK 14.0+
- Developer Account (for App Store distribution)

**Build Commands**:
```bash
cd juce_backend/ios

# Build for device
xcodebuild -project WhiteRoomAUv3.xcodeproj \
  -scheme WhiteRoomAUv3 \
  -configuration Release \
  -sdk iphoneos \
  -archivePath build/WhiteRoomAUv3.xcarchive \
  archive

# Build for simulator (testing only)
xcodebuild -project WhiteRoomAUv3.xcodeproj \
  -scheme WhiteRoomAUv3 \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath build/DerivedData \
  build
```

### Code Signing

**Development Build**:
```bash
# Automatic signing (for testing)
# In Xcode: Project > Signing & Capabilities > Team

# Or via xcodebuild
xcodebuild -project WhiteRoomAUv3.xcodeproj \
  -scheme WhiteRoomAUv3 \
  -CODE_SIGN_IDENTITY="Apple Development" \
  -DEVELOPMENT_TEAM="${TEAM_ID}"
```

**App Store Build**:
```bash
# Manual signing with distribution certificate
xcodebuild -project WhiteRoomAUv3.xcodeproj \
  -scheme WhiteRoomAUv3 \
  -CODE_SIGN_IDENTITY="Apple Distribution: Your Name (TEAMID)" \
  -DEVELOPMENT_TEAM="${TEAM_ID}" \
  archive
```

### Export for TestFlight

```bash
# Export archive
xcodebuild -exportArchive \
  -archivePath build/WhiteRoomAUv3.xcarchive \
  -exportOptionsPlist export-options.plist \
  -exportPath build/TestFlight-Export
```

**export-options.plist**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>TEAMID</string>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
  <key>signingStyle</key>
  <string>manual</string>
  <key>signingCertificate</key>
  <string>Apple Distribution</string>
</dict>
</plist>
```

### Uploading to TestFlight

**Via Xcode**:
1. Open Xcode Organizer (Window > Organizer)
2. Select archive
3. Click "Distribute App"
4. Select "TestFlight & App Store"
5. Follow prompts

**Via Command Line**:
```bash
# Upload to App Store Connect
xcrun altool --upload-app \
  --type ios \
  --file build/TestFlight-Export/WhiteRoomAUv3.appex \
  --apiKey "${API_KEY_ID}" \
  --apiIssuer "${API_ISSUER_ID}"
```

**API Key Setup**:
```bash
# Create API key in App Store Connect
# Users > Keys > Create API Key

# Store credentials securely
export APP_STORE_CONNECT_API_KEY_ID="ABC123XYZ"
export APP_STORE_CONNECT_API_ISSUER_ID="12345678-1234-1234-1234-123456789012"
export APP_STORE_CONNECT_API_KEY_CONTENT=$(cat path/to/AuthKey_ABC123XYZ.p8)
```

### TestFlight Testing

**Internal Testing**:
1. Upload to TestFlight
2. Add internal testers (up to 30)
3. Send invitation email
4. Testers install TestFlight app
5. Testers install AUv3 plugin

**External Testing** (Beta):
1. Complete internal testing
2. Create beta group
3. Add external testers (up to 10,000)
4. Submit for review
5. Wait for Apple approval (usually 24-48 hours)

### App Store Submission

**Prerequisites**:
- Privacy policy URL
- App privacy details (data collection)
- Screenshots (required for AUv3 hosts)
- App preview (optional)
- Description, keywords, promotional text

**Submission Process**:
1. Create app listing in App Store Connect
2. Fill in all required metadata
3. Upload build from TestFlight
4. Submit for review
5. Wait for approval (usually 1-3 days)

### Host Compatibility

Tested AUv3 hosts:
- GarageBand (iOS)
- Logic Pro (iOS & macOS)
- AUM (Audio Unit Manager)
- Cubasis
- NanoStudio
- Auria Pro

### Troubleshooting

**Issue**: Code signing error
```bash
# Verify certificate
security find-identity -v -p codesigning

# Check provisioning profile
ls ~/Library/MobileDevice/Provisioning\ Profiles/

# Re-sign manually
codesign --force --deep --sign "Apple Development" WhiteRoomAUv3.appex
```

**Issue**: Plugin not visible in host
```bash
# Verify on device
# Settings > General > Profiles & Device Management

# Check crash logs
# Xcode > Window > Devices and Simulators > View Device Logs

# Reinstall plugin
# Delete app, reinstall from TestFlight
```

---

## Standalone Deployment (Desktop)

### macOS Deployment

**Build**:
```bash
cd juce_backend
cmake -B build \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=10.15
cmake --build build --target SchillingerEcosystemWorkingDAW -j$(sysctl -n hw.ncpu)
```

**Create DMG**:
```bash
# Create app bundle
mkdir -p dmg/Distribution
cp -R build/SchillingerEcosystemWorkingDAW.app dmg/Distribution/

# Create DMG
hdiutil create -volname "White Room" \
  -srcfolder dmg/Distribution \
  -ov -format UDZO \
  WhiteRoom-1.0.0.dmg
```

**Code Signing**:
```bash
# Sign with Developer ID
codesign --force --deep \
  --sign "Developer ID Application: Your Name (TEAMID)" \
  build/SchillingerEcosystemWorkingDAW.app

# Verify signature
codesign --verify --verbose build/SchillingerEcosystemWorkingDAW.app
```

**Notarization**:
```bash
# Upload for notarization
xcrun notarytool submit WhiteRoom-1.0.0.dmg \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAMID" \
  --wait

# Staple notarization ticket
xcrun stapler staple WhiteRoom-1.0.0.dmg
```

**Distribution**:
- Host on website (direct download)
- GitHub Releases
- Homebrew Cask (optional)

**Homebrew Cask**:
```ruby
# Casks/whiteroom.rb
cask "whiteroom" do
  version "1.0.0"
  sha256 "abc123..."

  url "https://github.com/yourname/white_room/releases/download/v#{version}/WhiteRoom-#{version}.dmg"
  name "White Room"
  desc "Audio plugin ecosystem"
  homepage "https://whiteroom.audio"

  app "SchillingerEcosystemWorkingDAW.app"
end
```

### Windows Deployment

**Build**:
```bash
cd juce_backend
cmake -B build \
  -G "Visual Studio 17 2022" \
  -A x64 \
  -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

**Create Installer** (using Inno Setup):

```iss
; setup.iss
[Setup]
AppName=White Room
AppVersion=1.0.0
DefaultDirName={pf}\WhiteRoom
DefaultGroupName=White Room
OutputDir=dist
OutputBaseFilename=WhiteRoom-Setup
Compression=lzma2
SolidCompression=yes

[Files]
Source: "build\Release\SchillingerEcosystemWorkingDAW.exe"; DestDir: "{app}"
Source: "VCRedist\*.dll"; DestDir: "{app}"

[Icons]
Name: "{group}\White Room"; Filename: "{app}\SchillingerEcosystemWorkingDAW.exe"
```

```bash
# Build installer
iscc setup.iss
```

**Code Signing**:
```bash
# Sign executable
signtool sign /f certificate.pfx /p PASSWORD \
  /fd SHA256 /tr http://timestamp.digicert.com \
  build\Release\SchillingerEcosystemWorkingDAW.exe

# Verify signature
signtool verify /pa build\Release\SchillingerEcosystemWorkingDAW.exe
```

**Distribution**:
- Host on website
- GitHub Releases
- Chocolatey (optional)

**Chocolatey Package**:
```xml
<!-- tools/chocolateyinstall.ps1 -->
$packageArgs = @{
  packageName    = 'whiteroom'
  fileType       = 'exe'
  url            = 'https://github.com/yourname/white_room/releases/download/v1.0.0/WhiteRoom-Setup.exe'
  checksum       = 'abc123...'
  checksumType   = 'sha256'
  silentArgs     = '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART'
}

Install-ChocolateyPackage @packageArgs
```

### Linux Deployment

**Build**:
```bash
cd juce_backend
cmake -B build \
  -DCMAKE_BUILD_TYPE=Release
cmake --build build --target SchillingerEcosystemWorkingDAW -j$(nproc)
```

**Create AppImage**:
```bash
# Download linuxdeploy
wget -c "https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage"
wget -c "https://github.com/linuxdeploy/linuxdeploy-plugin-qt/releases/download/continuous/linuxdeploy-plugin-qt-x86_64.AppImage"
chmod +x linuxdeploy*.AppImage

# Create AppDir
mkdir -p AppDir/usr/bin
cp build/SchillingerEcosystemWorkingDAW AppDir/usr/bin/

# Create AppImage
./linuxdeploy-x86_64.AppImage \
  --appdir AppDir \
  --output appimage

# Output: WhiteRoom-1.0.0-x86_64.AppImage
```

**Create Debian Package**:
```bash
# Use CPack
cpack -G DEB -C build

# Or manually
mkdir -p debian/DEBIAN
cat > debian/DEBIAN/control << EOF
Package: whiteroom
Version: 1.0.0
Architecture: amd64
Maintainer: Your Name <your@email.com>
Description: Audio plugin ecosystem
 White Room is a next-generation audio plugin development environment.
Depends: libc6 (>= 2.27), libasound2 (>= 1.1.3)
EOF

dpkg-deb --build debian whiteroom_1.0.0_amd64.deb
```

**Distribution**:
- Host on website
- GitHub Releases
- Launchpad PPA (optional)

**Launchpad PPA**:
```bash
# Setup PPA
# https://launchpad.net/

# Upload package
dput ppa:yourname/whiteroom whiteroom_1.0.0_source.changes

# Users install via
sudo add-apt-repository ppa:yourname/whiteroom
sudo apt-get update
sudo apt-get install whiteroom
```

### Auto-Update

**Sparkle Framework** (macOS):
```xml
<!-- appcast.xml -->
<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>White Room Updates</title>
    <item>
      <title>Version 1.0.0</title>
      <sparkle:version>1.0.0</sparkle:version>
      <pubDate>Sat, 15 Jan 2026 12:00:00 +0000</pubDate>
      <enclosure url="https://whiteroom.audio/downloads/WhiteRoom-1.0.0.dmg"
                 sparkle:version="1.0.0"
                 sparkle:edSignature="abc123..."
                 length="123456789"
                 type="application/octet-stream" />
    </item>
  </channel>
</rss>
```

**WinSparkle** (Windows):
```cpp
// Add to main.cpp
#include <winsparkle.h>

// Check for updates on startup
win_sparkle_set_appcast_url("https://whiteroom.audio/win/appcast.xml");
win_sparkle_init();
```

---

## Version Management

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Examples:
- `1.0.0` → Initial release
- `1.1.0` → New instrument added
- `1.1.1` → Bug fix for parameter smoothing
- `2.0.0` → Breaking API changes

### Release Workflow

1. **Development Branch** (`develop`)
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Create Release Branch**
   ```bash
   git checkout -b release/1.0.0
   ```

3. **Update Version Numbers**
   ```bash
   # CMakeLists.txt
   project(SchillingerEcosystemWorkingDAW VERSION 1.0.0)

   # Commit changes
   git commit -am "Bump version to 1.0.0"
   ```

4. **Tag Release**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

5. **Merge to Main**
   ```bash
   git checkout main
   git merge release/1.0.0
   git push origin main
   ```

6. **Create GitHub Release**
   - Go to repository > Releases
   - "Draft a new release"
   - Tag: `v1.0.0`
   - Title: `White Room 1.0.0`
   - Upload artifacts
   - Publish release

---

## Monitoring and Analytics

### Crash Reporting

**Crashlytics** (iOS/macOS):
```bash
# Add Firebase Crashlytics
# In Xcode: File > Add Package Dependencies
# https://github.com/firebase/firebase-ios-sdk

# Initialize in code
import Firebase
FirebaseApp.configure()
```

**Breakpad** (Windows/Linux):
```cpp
// Add to main.cpp
#include "client/linux/handler/exception_handler.h"

bool callback(const google_breakpad::MinidumpDescriptor& descriptor,
              void* context,
              bool succeeded) {
  // Upload minidump to server
  uploadMinidump(descriptor.path());
  return succeeded;
}

google_breakpad::MinidumpDescriptor descriptor("/tmp");
google_breakpad::ExceptionHandler eh(descriptor, NULL, callback, NULL, true, -1);
```

### Usage Analytics

**Privacy-First Analytics** (optional):
```cpp
// Track instrument usage (no personal data)
analytics.logEvent("instrument_loaded", {
  {"instrument", "LocalGal"},
  {"version", "1.0.0"},
  {"platform", "macOS"}
});
```

---

## Rollback Procedures

### LV2 Rollback
```bash
# Uninstall current version
sudo rm -rf /usr/lib/lv2/FilterGate.lv2

# Install previous version
sudo dpkg -i whiteroom-lv2_0.9.0_amd64.deb
```

### AUv3 Rollback
1. Go to TestFlight
2. Select previous build
3. Click "Add to Testing"
4. Users reinstall from TestFlight

### Standalone Rollback
```bash
# macOS
# Users download previous DMG from website

# Windows
# Users download previous installer from website

# Linux
sudo apt-get install whiteroom=0.9.0
```

---

## Support and Documentation

### User Documentation

- **Getting Started Guide**: Installation and first use
- **User Manual**: All features and instruments
- **Tutorials**: Video tutorials for common workflows
- **FAQ**: Common questions and issues

### Developer Documentation

- **API Reference**: Plugin API documentation
- **Architecture Docs**: System design and algorithms
- **Contributing Guide**: How to contribute code
- **Build Instructions**: Building from source

### Issue Tracking

- **GitHub Issues**: Bug reports and feature requests
- **Discord Community**: Real-time support
- **Mailing List**: Announcements and discussions

---

## Security Considerations

### Code Signing

All binaries must be code signed:
- macOS: Developer ID or Apple Distribution
- Windows: Authenticode certificate
- iOS: Apple Distribution certificate

### Vulnerability Scanning

```bash
# Scan dependencies
npm audit  # For JavaScript tooling
safety check  # For Python dependencies

# Scan binaries
strings SchillingerEcosystemWorkingDAW.app/Contents/MacOS/SchillingerEcosystemWorkingDAW | grep -i "password"
```

### Supply Chain Security

- **Verify Git Commits**: Require signed commits
- **Dependency Pinning**: Lock dependency versions
- **SBOM**: Generate Software Bill of Materials
  ```bash
  cyclonedx-bom --output bom.json
  ```

---

## Legal and Compliance

### Licensing

- **White Room**: Proprietary license (TBD)
- **JUCE**: GPLv3 v3 (or commercial license)
- **Dependencies**: Check each dependency's license

### Privacy Policy

Required for App Store distribution:
- No user data collection
- No third-party analytics
- No network communication (except for updates)

### Export Compliance

Check for export restrictions:
- **Encryption**: May require EAR filing
- **Download Controls**: May require CCATS
- **Trade Sanctions**: Screen restricted countries

---

## Conclusion

This deployment guide covers all aspects of releasing White Room plugins across multiple platforms. Follow the checklists and procedures to ensure smooth, reliable deployments.

For questions or issues, contact the development team or open a GitHub issue.
