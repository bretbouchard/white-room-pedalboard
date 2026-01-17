#!/bin/bash

cd juce_backend/instruments/localgal

git add ios-auv3/
git commit -m "feat: Add iOS AUv3 plugin for LocalGal

Recreated the iOS AUv3 plugin structure that was lost during reorganization.

Components:
- LocalGalPluginApp: Minimal host app
- LocalGalPluginExtension: AUv3 extension with Feel Vector controls
- SharedDSP: C++ static library wrapper for LocalGal DSP

Features:
- iOS 15.0+ support
- AUv3 instrument extension
- Feel Vector 5D control system
- SwiftUI interface
- MIDI support
- Preset management

This restores the iOS plugin functionality that was in:
instruments/localgal/ios-auv3/

Now located at: juce_backend/instruments/localgal/ios-auv3/"

git push origin main

cd ../..
