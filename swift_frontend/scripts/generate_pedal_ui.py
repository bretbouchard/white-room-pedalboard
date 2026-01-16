#!/usr/bin/env python3
"""
White Room Pedal UI Generator
Generates WebView UI HTML for all pedals from templates.
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Pedal configurations
PEDAL_CONFIGS = {
    "Boost": {
        "template": "single_knob.html",
        "primary_color": "FF6B35",
        "secondary_color": "FFD23F",
        "bypass_color": "00FF00",
        "led_color": "00FF00",
        "knob_size": 100,
        "category": "Boost",
        "knobs": [
            {"name": "Level", "param_index": 0, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"}
        ]
    },

    "Fuzz": {
        "template": "dual_knob.html",
        "primary_color": "E63946",
        "secondary_color": "F1FAEE",
        "bypass_color": "FF0000",
        "led_color": "FF0000",
        "knob_size": 90,
        "category": "Distortion",
        "knobs": [
            {"name": "Volume", "param_index": 0, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Tone", "param_index": 1, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"}
        ]
    },

    "Overdrive": {
        "template": "quad_knob.html",
        "primary_color": "F4A261",
        "secondary_color": "E9C46A",
        "bypass_color": "FFA500",
        "led_color": "FFA500",
        "knob_size": 80,
        "category": "Overdrive",
        "knobs": [
            {"name": "Drive", "param_index": 0, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Tone", "param_index": 1, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Level", "param_index": 2, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Brightness", "param_index": 3, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"}
        ]
    },

    "Compressor": {
        "template": "compressor.html",
        "primary_color": "2A9D8F",
        "secondary_color": "264653",
        "bypass_color": "00BCD4",
        "led_color": "00BCD4",
        "knob_size": 70,
        "category": "Dynamics",
        "knobs": [
            {"name": "Threshold", "param_index": 0, "min": -60.0, "max": 0.0, "default": -20.0, "unit": "dB"},
            {"name": "Ratio", "param_index": 1, "min": 1.0, "max": 20.0, "default": 4.0, "unit": ":1"},
            {"name": "Attack", "param_index": 2, "min": 0.1, "max": 100.0, "default": 10.0, "unit": "ms"},
            {"name": "Release", "param_index": 3, "min": 10.0, "max": 1000.0, "default": 100.0, "unit": "ms"},
            {"name": "Gain", "param_index": 4, "min": 0.0, "max": 30.0, "default": 0.0, "unit": "dB"},
            {"name": "Blend", "param_index": 5, "min": 0.0, "max": 1.0, "default": 1.0, "unit": "%"}
        ]
    },

    "EQ": {
        "template": "eq.html",
        "primary_color": "457B9D",
        "secondary_color": "A8DADC",
        "bypass_color": "00B4D8",
        "led_color": "00B4D8",
        "knob_size": 70,
        "category": "EQ",
        "knobs": [
            {"name": "Bass", "param_index": 0, "min": -12.0, "max": 12.0, "default": 0.0, "unit": "dB"},
            {"name": "Mid", "param_index": 1, "min": -12.0, "max": 12.0, "default": 0.0, "unit": "dB"},
            {"name": "Treble", "param_index": 2, "min": -12.0, "max": 12.0, "default": 0.0, "unit": "dB"},
            {"name": "MidFreq", "param_index": 3, "min": 250.0, "max": 4000.0, "default": 1000.0, "unit": "Hz"},
            {"name": "Q", "param_index": 4, "min": 0.5, "max": 3.0, "default": 1.0, "unit": ""},
            {"name": "Level", "param_index": 5, "min": -12.0, "max": 12.0, "default": 0.0, "unit": "dB"}
        ]
    },

    "Chorus": {
        "template": "modulation.html",
        "primary_color": "9B5DE5",
        "secondary_color": "F15BB5",
        "bypass_color": "E0AAFF",
        "led_color": "E0AAFF",
        "knob_size": 75,
        "category": "Modulation",
        "knobs": [
            {"name": "Rate", "param_index": 0, "min": 0.1, "max": 10.0, "default": 1.0, "unit": "Hz"},
            {"name": "Depth", "param_index": 1, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Mix", "param_index": 2, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Tone", "param_index": 3, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"}
        ]
    },

    "Delay": {
        "template": "modulation.html",
        "primary_color": "00BBF9",
        "secondary_color": "FEE440",
        "bypass_color": "00F5D4",
        "led_color": "00F5D4",
        "knob_size": 75,
        "category": "Delay",
        "knobs": [
            {"name": "Time", "param_index": 0, "min": 10.0, "max": 2000.0, "default": 500.0, "unit": "ms"},
            {"name": "Feedback", "param_index": 1, "min": 0.0, "max": 0.95, "default": 0.5, "unit": "%"},
            {"name": "Mix", "param_index": 2, "min": 0.0, "max": 1.0, "default": 0.3, "unit": "%"},
            {"name": "Modulation", "param_index": 3, "min": 0.0, "max": 1.0, "default": 0.0, "unit": "%"}
        ]
    },

    "Reverb": {
        "template": "multi_knob.html",
        "primary_color": "00B4D8",
        "secondary_color": "90E0EF",
        "bypass_color": "CAF0F8",
        "led_color": "CAF0F8",
        "knob_size": 65,
        "category": "Reverb",
        "knobs": [
            {"name": "Decay", "param_index": 0, "min": 0.1, "max": 10.0, "default": 2.0, "unit": "s"},
            {"name": "PreDelay", "param_index": 1, "min": 0.0, "max": 200.0, "default": 20.0, "unit": "ms"},
            {"name": "Diffusion", "param_index": 2, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Tone", "param_index": 3, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Mix", "param_index": 4, "min": 0.0, "max": 1.0, "default": 0.3, "unit": "%"}
        ]
    },

    "Phaser": {
        "template": "modulation.html",
        "primary_color": "F72585",
        "secondary_color": "7209B7",
        "bypass_color": "B5179E",
        "led_color": "B5179E",
        "knob_size": 75,
        "category": "Modulation",
        "knobs": [
            {"name": "Rate", "param_index": 0, "min": 0.1, "max": 10.0, "default": 0.5, "unit": "Hz"},
            {"name": "Depth", "param_index": 1, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"},
            {"name": "Feedback", "param_index": 2, "min": -0.95, "max": 0.95, "default": 0.5, "unit": "%"},
            {"name": "Manual", "param_index": 3, "min": 0.0, "max": 1.0, "default": 0.5, "unit": "%"}
        ]
    },

    "NoiseGate": {
        "template": "dual_knob.html",
        "primary_color": "6C757D",
        "secondary_color": "ADB5BD",
        "bypass_color": "FFC107",
        "led_color": "FFC107",
        "knob_size": 90,
        "category": "Dynamics",
        "knobs": [
            {"name": "Threshold", "param_index": 0, "min": -80.0, "max": 0.0, "default": -50.0, "unit": "dB"},
            {"name": "Release", "param_index": 1, "min": 10.0, "max": 1000.0, "default": 100.0, "unit": "ms"}
        ]
    }
}


def extract_presets_from_header(pedal_name: str) -> List[Dict]:
    """Extract preset definitions from pedal DSP header file."""
    header_path = project_root / f"juce_backend/effects/pedals/include/dsp/{pedal_name}PedalPureDSP.h"

    if not header_path.exists():
        print(f"⚠️  Header file not found: {header_path}")
        return []

    presets = []

    try:
        with open(header_path, 'r') as f:
            content = f.read()

        # Find preset array
        preset_pattern = r'Preset\s+(\w+)\[NUM_PRESETS\]\s*=\s*\{([^}]+)\}'
        match = re.search(preset_pattern, content, re.DOTALL)

        if match:
            preset_data = match.group(2)

            # Extract individual presets
            individual_presets = re.findall(r'\{\s*"([^"]+)"\s*,\s*new\s+float\[[^\]]+\]\{([^}]+)\}\s*,\s*\d+\s*\}', preset_data)

            for name, params in individual_presets:
                presets.append({
                    "name": name,
                    "parameters": [float(p.strip()) for p in params.split(',')]
                })

    except Exception as e:
        print(f"⚠️  Error extracting presets from {pedal_name}: {e}")

    return presets


def generate_knobs_html(knobs: List[Dict], knob_size: int) -> str:
    """Generate HTML for all knobs."""
    knobs_html = ""

    for i, knob in enumerate(knobs):
        knobs_html += f"""
        <div class="knob-container">
            <div class="knob" id="knob-{i}" data-param="{knob['param_index']}" style="width: {knob_size}px; height: {knob_size}px;">
                <div class="knob-indicator"></div>
            </div>
            <div class="knob-label">{knob['name']}</div>
            <div class="knob-value" id="value-{i}">{format_value(knob['default'], knob)}</div>
        </div>
        """

    return knobs_html


def generate_knobs_init(knobs: List[Dict]) -> str:
    """Generate JavaScript initialization code for all knobs."""
    knobs_init = ""

    for i, knob in enumerate(knobs):
        knobs_init += f"""
        const knob{i} = new Knob('knob-{i}', {{
            min: {knob['min']},
            max: {knob['max']},
            defaultValue: {knob['default']},
            onChange: (value) => {{
                document.getElementById('value-{i}').textContent = formatValue(value, {knob['min']}, {knob['max']}, '{knob['unit']}');
                sendMessage({{
                    type: 'parameter',
                    index: {knob['param_index']},
                    value: value
                }});
            }}
        }});
        """

    return knobs_init


def format_value(value: float, knob: Dict) -> str:
    """Format a parameter value for display."""
    if knob['unit'] == 'Hz':
        return f"{value/1000:.1f}k" if value >= 1000 else f"{value:.0f}"
    elif knob['unit'] == 'dB':
        return f"{value:.1f}"
    elif knob['unit'] == '%':
        return f"{value*100:.0f}%"
    elif knob['unit'] == 'ms':
        return f"{value:.0f}"
    elif knob['unit'] == 's':
        return f"{value:.1f}"
    elif knob['unit'] == ':1':
        return f"{value:.1f}:1"
    else:
        return f"{value:.2f}"


def generate_preset_buttons(presets: List[Dict]) -> str:
    """Generate HTML preset buttons."""
    buttons = ""

    for i, preset in enumerate(presets):
        buttons += f'<button class="preset-btn" data-preset="{i}">{preset["name"]}</button>\n            '

    return buttons


def generate_preset_management(presets: List[Dict]) -> str:
    """Generate JavaScript preset management code."""
    presets_json = json.dumps(presets)

    return f"""
        const presets = {presets_json};

        document.querySelectorAll('.preset-btn').forEach(btn => {{
            btn.addEventListener('click', () => {{
                const index = parseInt(btn.dataset.preset);
                loadPreset(index);
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }});
        }});

        function loadPreset(index) {{
            const preset = presets[index];
            if (!preset) return;

            preset.parameters.forEach((param, i) => {{
                const knob = document.getElementById(`knob-${{i}}`);
                if (knob) {{
                    knob.setValue(param);
                }}
            }});

            sendMessage({{
                type: 'preset',
                index: index
            }});
        }}
    """


def generate_ui(pedal_name: str, config: Dict) -> None:
    """Generate UI HTML for a pedal from template."""
    template_path = project_root / f"swift_frontend/Resources/UI_Templates/{config['template']}"
    output_path = project_root / f"swift_frontend/Resources/Pedals/{pedal_name}.html"

    # Read template
    if not template_path.exists():
        print(f"❌ Template not found: {template_path}")
        return

    with open(template_path, 'r') as f:
        template = f.read()

    # Extract presets
    presets = extract_presets_from_header(pedal_name)

    if not presets:
        print(f"⚠️  No presets found for {pedal_name}, using defaults")
        presets = [{"name": "Default", "parameters": [knob['default'] for knob in config['knobs']]}]

    # Generate UI components
    knobs_html = generate_knobs_html(config['knobs'], config['knob_size'])
    knobs_init = generate_knobs_init(config['knobs'])
    preset_buttons = generate_preset_buttons(presets)
    preset_mgmt = generate_preset_management(presets)

    # Replace template variables
    html = template.replace('{{PEDAL_NAME}}', pedal_name) \
                   .replace('{{PEDAL_CATEGORY}}', config['category']) \
                   .replace('{{PRIMARY_COLOR}}', config['primary_color']) \
                   .replace('{{SECONDARY_COLOR}}', config['secondary_color']) \
                   .replace('{{BYPASS_COLOR}}', config['bypass_color']) \
                   .replace('{{LED_COLOR}}', config['led_color']) \
                   .replace('{{KNOB_SIZE}}', str(config['knob_size'])) \
                   .replace('{{KNOBS_HTML}}', knobs_html) \
                   .replace('{{KNOBS_INITIALIZATION}}', knobs_init) \
                   .replace('{{PRESET_BUTTONS}}', preset_buttons) \
                   .replace('{{PRESET_MANAGEMENT}}', preset_mgmt)

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(html)

    print(f"✅ Generated UI for {pedal_name} ({len(presets)} presets)")


def main():
    """Generate UI for all pedals."""
    print("🎸 White Room Pedal UI Generator")
    print("=" * 50)

    for pedal_name, config in PEDAL_CONFIGS.items():
        generate_ui(pedal_name, config)

    print("\n✅ UI generation complete!")
    print(f"📁 Generated {len(PEDAL_CONFIGS)} pedal UIs")
    print(f"📂 Output: swift_frontend/Resources/Pedals/")


if __name__ == '__main__':
    main()
