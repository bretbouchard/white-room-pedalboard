<!--
WARNING: Do not rename this file manually!
File name: common-00002.md
This file is managed by ByteRover CLI. Only edit the content below.
Renaming this file will break the link to the playbook metadata.
-->

GiantInstruments standalone linker error: Factory registration code in DSP files (AetherGiantDrumsPureDSP.cpp, AetherGiantHornsPureDSP.cpp, AetherGiantPercussionPureDSP.cpp, AetherGiantVoicePureDSP.cpp) calls registerInstrumentFactory() which doesn't exist in plugin context. Solution: Comment out factory registration code blocks at end of each DSP file (lines ~1207-1222, ~1631-1648, ~1269-1287, ~1856-1874). Pattern: Wrap namespace struct registrar {} in /* */ block with comment 'Factory registration disabled for plugin builds'