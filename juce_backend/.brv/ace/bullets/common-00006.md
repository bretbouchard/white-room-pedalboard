<!--
WARNING: Do not rename this file manually!
File name: common-00006.md
This file is managed by ByteRover CLI. Only edit the content below.
Renaming this file will break the link to the playbook metadata.
-->

PatternPlayer.cpp line 188 uses PatternBank::MAX_PATTERNS but refactoring changed it to Pattern::MAX_PATTERNS. Causes compilation error. Fix: Change to Pattern::MAX_PATTERNS. Time: 5 minutes.