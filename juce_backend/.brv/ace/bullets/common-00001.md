<!--
WARNING: Do not rename this file manually!
File name: common-00001.md
This file is managed by ByteRover CLI. Only edit the content below.
Renaming this file will break the link to the playbook metadata.
-->

FilterGate CLAP build error: kAudioUnitType_MIDIProcessor macro redefinition. Fixed by conditional compilation in CMakeLists.txt line 12: if(APPLE) add_definitions(-DkAudioUnitType_MIDIProcessor='umid') endif(). Prevents AU-specific macro conflicts with CLAP builds. Source: juce_backend/filtergate_plugin_build/CMakeLists.txt