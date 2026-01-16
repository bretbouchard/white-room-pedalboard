<!--
WARNING: Do not rename this file manually!
File name: strategies-00016.md
This file is managed by ByteRover CLI. Only edit the content below.
Renaming this file will break the link to the playbook metadata.
-->

FM synthesis implementation for Kane Marco: Phase modulation approach where carrier phase = base_phase + (modulator_output * fm_depth). Linear FM: frequency deviation = constant * modulator. Exponential FM: frequency deviation = exp(modulator_output). Carrier/modulator swap reverses roles. Use simple sine waves for both operators initially. Implement with custom phase accumulation (not juce::dsp::Oscillator). Source: KANE_MARCO_RESEARCH.md lines 390-410