#!/usr/bin/env python3
"""
Comprehensive Pedal Feature Analyzer v2
Extracts complete feature matrix from all guitar pedals
"""

import re
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Optional

@dataclass
class ParameterInfo:
    """Complete parameter information"""
    name: str
    index: int
    min_value: float
    max_value: float
    default_value: float
    unit: str = ""
    description: str = ""

@dataclass
class PresetInfo:
    """Complete preset information"""
    name: str
    index: int
    parameter_values: List[float] = field(default_factory=list)

@dataclass
class CircuitMode:
    """Circuit mode information"""
    name: str
    index: int
    description: str = ""

@dataclass
class PedalFeatures:
    """Complete feature set for a pedal"""
    name: str
    parameters: List[ParameterInfo] = field(default_factory=list)
    presets: List[PresetInfo] = field(default_factory=list)
    circuit_modes: List[CircuitMode] = field(default_factory=list)
    enum_classes: Dict[str, List[str]] = field(default_factory=dict)

def extract_parameter_array(cpp_content: str, pedal_class: str) -> List[dict]:
    """Extract parameter definitions from static constexpr Parameter array in .cpp file"""

    # Pattern to match the static constexpr Parameter array
    pattern = rf'static\s+constexpr\s+Parameter\s+\w+\[NUM_PARAMETERS\]\s*=\s*\{{([^}}]+)\}};'
    match = re.search(pattern, cpp_content, re.DOTALL)

    if not match:
        return []

    params_array = match.group(1)
    parameters = []

    # Extract individual Parameter structs
    # Pattern: {"name", "label", "unit", min, max, default, automatable, step}
    param_pattern = rf'\{{([^}}]+)\}}'

    for param_match in re.finditer(param_pattern, params_array):
        param_str = param_match.group(1)
        # Split by comma and extract values
        parts = [p.strip().strip('"') for p in param_str.split(',')]

        if len(parts) >= 7:
            try:
                param_info = {
                    'name': parts[0],
                    'label': parts[1],
                    'unit': parts[2],
                    'min': float(parts[3]),
                    'max': float(parts[4]),
                    'default': float(parts[5]),
                    'automatable': parts[6].lower() == 'true' if len(parts) > 6 else True,
                    'step': float(parts[7]) if len(parts) > 7 else 0.01
                }
                parameters.append(param_info)
            except (ValueError, IndexError):
                continue

    return parameters

def parse_parameters_from_header(header_content: str) -> List[str]:
    """Extract parameter names from Parameters enum in header file"""
    param_names = []

    # Find Parameters enum (handle both "Parameters" and "ParameterIndex")
    # Pattern: enum Parameters { ... NUM_PARAMETERS };
    # Handle multi-line declarations
    lines = header_content.split('\n')
    in_parameters_enum = False
    enum_name = None
    found_opening_brace = False

    for i, line in enumerate(lines):
        # Check if this line starts the Parameters enum
        if not in_parameters_enum:
            match = re.search(r'enum\s+(Parameters|ParameterIndex)', line)
            if match:
                in_parameters_enum = True
                enum_name = match.group(1)
                # Check if the opening brace is on the same line
                if '{' in line:
                    found_opening_brace = True
                continue
            elif found_opening_brace and in_parameters_enum:
                # We found the enum on previous lines, now looking for opening brace
                if '{' in line:
                    found_opening_brace = True
                continue
        else:
            # We're inside the Parameters enum (after finding opening brace)
            if not found_opening_brace:
                # Still looking for opening brace
                if '{' in line:
                    found_opening_brace = True
                continue

            # Extract parameter names until we hit NUM_PARAMETERS
            line_stripped = line.strip()

            # Check if this line ends the enum
            if '};' in line_stripped or ('}' in line_stripped and 'NUM_PARAMETERS' in line_stripped):
                break

            # Remove comments
            line_stripped = re.sub(r'//.*$', '', line_stripped)

            # Skip empty lines or lines with just braces
            if not line_stripped or line_stripped in ['{', '}', ',']:
                continue

            # Extract parameter name (before comma or comment)
            # Pattern: "ParamName," or "ParamName = value," or "ParamName // comment"
            param_match = re.match(r'\s*(\w+)', line_stripped)
            if param_match:
                param_name = param_match.group(1)
                if param_name not in ['NUM_PARAMETERS', enum_name]:
                    param_names.append(param_name)

    return param_names

def parse_presets(header_content: str) -> List[PresetInfo]:
    """Extract preset information from header file"""
    presets = []

    # Find Presets enum - use same multi-line logic as parameters
    lines = header_content.split('\n')
    in_presets_enum = False
    found_opening_brace = False

    for i, line in enumerate(lines):
        # Check if this line starts the Presets enum
        if not in_presets_enum:
            match = re.search(r'enum\s+Presets', line)
            if match:
                in_presets_enum = True
                # Check if the opening brace is on the same line
                if '{' in line:
                    found_opening_brace = True
                continue
        else:
            # We're inside the Presets enum (after finding opening brace)
            if not found_opening_brace:
                # Still looking for opening brace
                if '{' in line:
                    found_opening_brace = True
                continue

            # Extract preset names until we hit NUM_PRESETS
            line_stripped = line.strip()

            # Check if this line ends the enum
            if '};' in line_stripped or ('}' in line_stripped and 'NUM_PRESETS' in line_stripped):
                break

            # Remove comments
            line_stripped = re.sub(r'//.*$', '', line_stripped)

            # Skip empty lines or lines with just braces
            if not line_stripped or line_stripped in ['{', '}', ',']:
                continue

            # Extract preset name (before comma or comment)
            preset_match = re.match(r'\s*(\w+)', line_stripped)
            if preset_match:
                preset_name = preset_match.group(1)
                if preset_name != 'NUM_PRESETS':
                    presets.append(PresetInfo(
                        name=preset_name,
                        index=len(presets),
                        parameter_values=[]
                    ))

    return presets

def parse_enum_classes(header_content: str) -> Dict[str, List[str]]:
    """Extract all enum class definitions"""
    enum_classes = {}

    # Pattern to match enum class definitions
    pattern = r'enum\s+class\s+(\w+)\s*\{([^}]+)\}'

    for match in re.finditer(pattern, header_content):
        enum_name = match.group(1)
        enum_body = match.group(2)

        enum_values = []
        for line in enum_body.split(','):
            line = line.strip()
            # Remove comments
            line = re.sub(r'//.*$', '', line)
            # Extract value name
            value_match = re.match(r'(\w+)', line)
            if value_match:
                value_name = value_match.group(1)
                if value_name not in ['NUM_MODES', 'NUM_PRESETS']:
                    enum_values.append(value_name)

        if enum_values:
            enum_classes[enum_name] = enum_values

    return enum_classes

def analyze_pedal(header_path: Path, cpp_path: Optional[Path] = None) -> PedalFeatures:
    """Complete feature analysis of a pedal"""

    pedal_name = header_path.stem.replace('PedalPureDSP', '')
    header_content = header_path.read_text()

    # Read cpp file if available
    cpp_content = ""
    if cpp_path and cpp_path.exists():
        cpp_content = cpp_path.read_text()

    features = PedalFeatures(name=pedal_name)

    # Parse parameter names from header
    param_names = parse_parameters_from_header(header_content)

    # Extract parameter details from cpp file
    param_details = extract_parameter_array(cpp_content, pedal_name) if cpp_content else []

    # Combine parameter names with details
    for idx, param_name in enumerate(param_names):
        if idx < len(param_details):
            details = param_details[idx]
            param_info = ParameterInfo(
                name=param_name,
                index=idx,
                min_value=details['min'],
                max_value=details['max'],
                default_value=details['default'],
                unit=details['unit'],
                description=details['label']
            )
        else:
            # Default values if not found in cpp
            param_info = ParameterInfo(
                name=param_name,
                index=idx,
                min_value=0.0,
                max_value=1.0,
                default_value=0.5,
                unit="",
                description=param_name
            )
        features.parameters.append(param_info)

    # Parse presets
    features.presets = parse_presets(header_content)

    # Parse enum classes
    features.enum_classes = parse_enum_classes(header_content)

    return features

def main():
    """Main analysis function"""

    # Use absolute paths
    script_dir = Path(__file__).parent.absolute()
    headers_dir = script_dir.parent / 'effects' / 'pedals' / 'include' / 'dsp'
    cpp_dir = script_dir.parent / 'effects' / 'pedals' / 'src' / 'dsp'

    print(f"Script dir: {script_dir}")
    print(f"Headers dir: {headers_dir}")
    print(f"Headers exist: {headers_dir.exists()}")
    print(f"CPP dir: {cpp_dir}")
    print(f"CPP exist: {cpp_dir.exists()}")

    all_pedals = []

    for header_file in sorted(headers_dir.glob('*PedalPureDSP.h')):
        if 'GuitarPedalPureDSP.h' in header_file.name:
            continue  # Skip base class

        print(f"\n{'='*60}")
        print(f"Analyzing: {header_file.name}")
        print(f"{'='*60}")

        # Find corresponding cpp file
        cpp_file = cpp_dir / header_file.name.replace('.h', '.cpp')

        print(f"Header: {header_file}")
        print(f"CPP: {cpp_file} (exists: {cpp_file.exists()})")

        features = analyze_pedal(header_file, cpp_file)

        print(f"Features extracted: {len(features.parameters)} params, {len(features.presets)} presets")

        all_pedals.append(features)

        # Print summary
        print(f"\n📊 {features.name} Pedal Feature Summary:")
        print(f"  Parameters: {len(features.parameters)}")
        print(f"  Presets: {len(features.presets)}")
        print(f"  Enum Classes: {len(features.enum_classes)}")

        # Print parameters
        if features.parameters:
            print(f"\n  🔧 Parameters:")
            for param in features.parameters:
                print(f"    {param.index:2d}. {param.name:20s} [{param.min_value:7.2f}, {param.max_value:7.2f}] (default: {param.default_value:7.2f}) {param.unit}")

        # Print presets
        if features.presets:
            print(f"\n  📁 Presets:")
            for preset in features.presets:
                print(f"    {preset.index:2d}. {preset.name}")

        # Print enum classes
        if features.enum_classes:
            print(f"\n  🏷️  Enum Classes:")
            for enum_name, enum_values in features.enum_classes.items():
                print(f"    {enum_name}: {len(enum_values)} modes")
                for val in enum_values[:5]:
                    print(f"      - {val}")
                if len(enum_values) > 5:
                    print(f"      ... and {len(enum_values) - 5} more")

    # Generate comprehensive test plan
    print(f"\n\n{'='*60}")
    print("COMPREHENSIVE TEST PLAN")
    print(f"{'='*60}")

    total_tests = 0
    test_breakdown = {
        'Basic signal tests': 0,
        'Parameter sweep tests': 0,
        'Preset tests': 0,
        'Circuit mode tests': 0,
        'Parameter smoothing tests': 0
    }

    for pedal in all_pedals:
        # Basic signal tests (3)
        test_breakdown['Basic signal tests'] += 3

        # Parameter sweep tests (min, mid, max for each parameter)
        test_breakdown['Parameter sweep tests'] += len(pedal.parameters) * 3

        # Preset tests
        test_breakdown['Preset tests'] += len(pedal.presets)

        # Circuit mode tests (estimate from enum classes)
        mode_count = sum(len(values) for values in pedal.enum_classes.values())
        test_breakdown['Circuit mode tests'] += mode_count

        # Parameter smoothing tests (one per parameter)
        test_breakdown['Parameter smoothing tests'] += len(pedal.parameters)

    total_tests = sum(test_breakdown.values())

    print(f"\n📈 Estimated Total Tests: {total_tests}")
    for test_type, count in test_breakdown.items():
        print(f"  - {test_type}: {count}")

    # Save feature matrix to JSON
    output_path = Path('PEDAL_FEATURE_MATRIX.json')

    feature_matrix = []
    for pedal in all_pedals:
        pedal_dict = {
            'name': pedal.name,
            'parameters': [
                {
                    'name': p.name,
                    'index': p.index,
                    'min': p.min_value,
                    'max': p.max_value,
                    'default': p.default_value,
                    'unit': p.unit,
                    'label': p.description
                }
                for p in pedal.parameters
            ],
            'presets': [
                {
                    'name': pr.name,
                    'index': pr.index
                }
                for pr in pedal.presets
            ],
            'enum_classes': pedal.enum_classes
        }
        feature_matrix.append(pedal_dict)

    output_path.write_text(json.dumps(feature_matrix, indent=2))
    print(f"\n✅ Feature matrix saved to: {output_path}")

    # Generate comprehensive test plan document
    test_plan_path = Path('COMPREHENSIVE_TEST_PLAN.md')
    generate_test_plan(test_plan_path, all_pedals, total_tests, test_breakdown)
    print(f"✅ Test plan saved to: {test_plan_path}")

def generate_test_plan(output_path: Path, pedals: list, total_tests: int, test_breakdown: dict):
    """Generate comprehensive test plan document"""

    lines = [
        "# Comprehensive Pedal Test Plan",
        "",
        "## Overview",
        "",
        f"This document outlines the comprehensive test suite for all {len(pedals)} guitar pedals.",
        f"Total estimated tests: **{total_tests}**",
        "",
        "## Test Categories",
        "",
    ]

    for test_type, count in test_breakdown.items():
        lines.append(f"- **{test_type}**: {count} tests")

    lines.extend([
        "",
        "## Pedal Breakdown",
        ""
    ])

    for pedal in pedals:
        lines.extend([
            f"### {pedal.name}",
            "",
            f"- **Parameters**: {len(pedal.parameters)}",
            f"- **Presets**: {len(pedal.presets)}",
            f"- **Test Count**:",
            f"  - Basic signal tests: 3",
            f"  - Parameter sweep tests: {len(pedal.parameters) * 3}",
            f"  - Preset tests: {len(pedal.presets)}",
            f"  - Parameter smoothing tests: {len(pedal.parameters)}",
            f"  - **Subtotal**: {3 + len(pedal.parameters) * 3 + len(pedal.presets) + len(pedal.parameters)} tests",
            ""
        ])

        if pedal.parameters:
            lines.append("#### Parameters")
            lines.append("")
            lines.append("| Index | Name | Min | Max | Default | Unit |")
            lines.append("|-------|------|-----|-----|---------|------|")
            for param in pedal.parameters:
                lines.append(f"| {param.index} | {param.name} | {param.min_value} | {param.max_value} | {param.default_value} | {param.unit} |")
            lines.append("")

        if pedal.presets:
            lines.append("#### Presets")
            lines.append("")
            for preset in pedal.presets:
                lines.append(f"{preset.index + 1}. {preset.name}")
            lines.append("")

    output_path.write_text('\n'.join(lines))

if __name__ == '__main__':
    main()
