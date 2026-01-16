<!--
WARNING: Do not rename this file manually!
File name: common-00007.md
This file is managed by ByteRover CLI. Only edit the content below.
Renaming this file will break the link to the playbook metadata.
-->

SLC VIOLATION: SynthEngine::setMasterLevel() is a stub - only calls juce::ignoreUnused(level). Must implement proper gain application in processAudio(). Add masterLevel member, store value, apply gain with buffer.applyGain(masterLevel). Time: 2 hours.