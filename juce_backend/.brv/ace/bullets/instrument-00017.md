<!--
WARNING: Do not rename this file manually!
File name: instrument-00017.md
This file is managed by ByteRover CLI. Only edit the content below.
Renaming this file will break the link to the playbook metadata.
-->

Kane Marco Aether String uses Hybrid Waveguide + Modal Body approach (Approach B). Waveguide string with fractional delay lines, stiffness allpass filter, and damping lowpass filter couples to bridge, which drives modal body resonator (8-16 modes). Bridge coupling uses std::tanh() for stability with coupling coefficient 0-1. Articulation FSM with 6 states (BOW, PICK, SCRAPE, HARMONIC, TREMOLO, NORMAL) using equal-power crossfade (sin/cos gains) for smooth transitions.