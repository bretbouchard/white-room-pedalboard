#!/usr/bin/env python3
"""
Comprehensive Pedal Feature Analyzer
Extracts complete feature matrix from all guitar pedals
"""

import re
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict, Any

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
    parameter_values: List[float]

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

def parse_enum_class(header_content: str, enum_name: str) -> List[str]:
    """Parse enum class to extract values"""
    pattern = rf'enum\s+class\s+{enum_name}\s*\{{([^}}]+)\}}'
    match = re.search(pattern, header_content, re.DOTALL)

    if not match:
        return []

    enum_body = match.group(1)
    # Extract enum values
    values = []
    for line in enum_body.split('\n'):
        line = line.strip()
        # Remove comments
        line = re.sub(r'//.*$', '', line)
        # Extract value name
        value_match = re.match(r'(\w+)', line)
        if value_match and value_match.group(1) not in ['NUM_MODES', 'NUM_PRESETS']:
            values.append(value_match.group(1))

    return values

def parse_parameters(header_content: str) -> List[ParameterInfo]:
    """Extract parameter information from header file"""
    parameters = []

    # Find ParameterIndex enum
    pattern = r'enum\s+ParameterIndex\s*\{([^}]+)\}'
    match = re.search(pattern, header_content, re.DOTALL)

    if not match:
        return parameters

    enum_body = match.group(1)

    # Extract parameter names and indices
    for idx, line in enumerate(enum_body.split(',')):
        line = line.strip()
        # Remove comments
        line = re.sub(r'//.*$', '', line)
        # Extract parameter name
        param_match = re.match(r'(\w+)', line)
        if param_match:
            param_name = param_match.group(1)
            if param_name == 'NUM_PARAMETERS':
                continue

            # Try to find parameter definition in header
            param_info = extract_parameter_details(header_content, param_name, idx)
            parameters.append(param_info)

    return parameters

def extract_parameter_details(header_content: str, param_name: str, index: int) -> ParameterInfo:
    """Extract detailed parameter information"""

    # Look for parameter struct or variable definition
    # Pattern: Parameter paramName = {min, max, default};
    pattern = rf'(?:Parameter\s+){param_name}\s*=\s*\{{([^}}]+)\}}'
    match = re.search(pattern, header_content)

    min_val = 0.0
    max_val = 1.0
    default_val = 0.5
    unit = ""
    description = ""

    if match:
        values_str = match.group(1)
        values = [v.strip() for v in values_str.split(',')]

        if len(values) >= 3:
            try:
                min_val = float(values[0])
                max_val = float(values[1])
                default_val = float(values[2])
            except ValueError:
                pass

    # Look for comments near parameter definition
    comment_pattern = rf'//.*{param_name}.*?([\w\s]+)'
    comment_match = re.search(comment_pattern, header_content)
    if comment_match:
        description = comment_match.group(1).strip()

    return ParameterInfo(
        name=param_name,
        index=index,
        min_value=min_val,
        max_value=max_val,
        default_value=default_val,
        unit=unit,
        description=description
    )

def parse_presets(header_content: str) -> List[PresetInfo]:
    """Extract preset information from header file"""
    presets = []

    # Find Presets enum
    pattern = r'enum\s+Presets\s*\{([^}]+)\}'
    match = re.search(pattern, header_content, re.DOTALL)

    if not match:
        return presets

    enum_body = match.group(1)

    # Extract preset names and indices
    for idx, line in enumerate(enum_body.split(',')):
        line = line.strip()
        # Remove comments
        line = re.sub(r'//.*$', '', line)
        # Extract preset name
        preset_match = re.match(r'(\w+)', line)
        if preset_match:
            preset_name = preset_match.group(1)
            if preset_name == 'NUM_PRESETS':
                continue

            presets.append(PresetInfo(
                name=preset_name,
                index=idx,
                parameter_values=[]  # Will be filled from implementation
            ))

    return presets

def parse_circuit_modes(header_content: str) -> List[CircuitMode]:
    """Extract circuit mode information"""
    modes = []

    # Look for circuit-related enum classes
    # Common patterns: CircuitMode, FilterMode, StereoMode, etc.

    # Try to find circuit mode enum class
    mode_enum_patterns = [
        r'enum\s+class\s+CircuitMode\s*\{([^}]+)\}',
        r'enum\s+class\s+FilterMode\s*\{([^}]+)\}',
        r'enum\s+class\s+StereoMode\s*\{([^}]+)\}',
        r'enum\s+class\s+OversamplingMode\s*\{([^}]+)\}',
    ]

    for pattern in mode_enum_patterns:
        match = re.search(pattern, header_content, re.DOTALL)
        if match:
            enum_body = match.group(1)
            for idx, line in enumerate(enum_body.split(',')):
                line = line.strip()
                line = re.sub(r'//.*$', '', line)
                mode_match = re.match(r'(\w+)', line)
                if mode_match:
                    mode_name = mode_match.group(1)
                    if mode_name not in ['NUM_MODES']:
                        modes.append(CircuitMode(
                            name=mode_name,
                            index=idx,
                            description=""
                        ))

    return modes

def analyze_pedal(header_path: Path) -> PedalFeatures:
    """Complete feature analysis of a pedal"""

    pedal_name = header_path.stem.replace('PedalPureDSP', '')
    header_content = header_path.read_text()

    features = PedalFeatures(name=pedal_name)

    # Parse parameters
    features.parameters = parse_parameters(header_content)

    # Parse presets
    features.presets = parse_presets(header_content)

    # Parse circuit modes
    features.circuit_modes = parse_circuit_modes(header_content)

    # Extract all enum classes
    enum_pattern = r'enum\s+class\s+(\w+)\s*\{([^}]+)\}'
    for match in re.finditer(enum_pattern, header_content):
        enum_name = match.group(1)
        enum_values = []
        enum_body = match.group(2)

        for line in enum_body.split(','):
            line = line.strip()
            line = re.sub(r'//.*$', '', line)
            value_match = re.match(r'(\w+)', line)
            if value_match:
                value_name = value_match.group(1)
                if value_name not in ['NUM_MODES', 'NUM_PRESETS']:
                    enum_values.append(value_name)

        if enum_values:
            features.enum_classes[enum_name] = enum_values

    return features

def main():
    """Main analysis function"""

    headers_dir = Path('juce_backend/effects/pedals/include/dsp')

    all_pedals = []

    for header_file in sorted(headers_dir.glob('*PedalPureDSP.h')):
        if 'GuitarPedalPureDSP.h' in header_file.name:
            continue  # Skip base class

        print(f"\n{'='*60}")
        print(f"Analyzing: {header_file.name}")
        print(f"{'='*60}")

        features = analyze_pedal(header_file)
        all_pedals.append(features)

        # Print summary
        print(f"\n📊 {features.name} Pedal Feature Summary:")
        print(f"  Parameters: {len(features.parameters)}")
        print(f"  Presets: {len(features.presets)}")
        print(f"  Circuit Modes: {len(features.circuit_modes)}")
        print(f"  Enum Classes: {len(features.enum_classes)}")

        # Print parameters
        if features.parameters:
            print(f"\n  🔧 Parameters:")
            for param in features.parameters:
                print(f"    {param.index:2d}. {param.name:20s} [{param.min_value:.2f}, {param.max_value:.2f}] (default: {param.default_value:.2f})")

        # Print presets
        if features.presets:
            print(f"\n  📁 Presets:")
            for preset in features.presets:
                print(f"    {preset.index:2d}. {preset.name}")

        # Print circuit modes
        if features.circuit_modes:
            print(f"\n  🔀 Circuit Modes:")
            for mode in features.circuit_modes:
                print(f"    {mode.index:2d}. {mode.name}")

        # Print enum classes
        if features.enum_classes:
            print(f"\n  🏷️  Enum Classes:")
            for enum_name, enum_values in features.enum_classes.items():
                print(f"    {enum_name}: {', '.join(enum_values[:5])}" + ("..." if len(enum_values) > 5 else ""))

    # Generate comprehensive test plan
    print(f"\n\n{'='*60}")
    print("COMPREHENSIVE TEST PLAN")
    print(f"{'='*60}")

    total_tests = 0
    for pedal in all_pedals:
        # Basic signal tests (3)
        total_tests += 3

        # Parameter sweep tests (min, mid, max for each parameter)
        total_tests += len(pedal.parameters) * 3

        # Preset tests
        total_tests += len(pedal.presets)

        # Circuit mode tests
        total_tests += len(pedal.circuit_modes)

        # Parameter smoothing tests (one per parameter)
        total_tests += len(pedal.parameters)

    print(f"\n📈 Estimated Total Tests: {total_tests}")
    print(f"  - Basic signal tests: {len(all_pedals) * 3}")
    print(f"  - Parameter sweep tests: {sum(len(p.parameters) * 3 for p in all_pedals)}")
    print(f"  - Preset tests: {sum(len(p.presets) for p in all_pedals)}")
    print(f"  - Circuit mode tests: {sum(len(p.circuit_modes) for p in all_pedals)}")
    print(f"  - Parameter smoothing tests: {sum(len(p.parameters) for p in all_pedals)}")

    # Save feature matrix to JSON
    output_path = Path('juce_backend/dsp_test_harness/PEDAL_FEATURE_MATRIX.json')
    output_path.parent.mkdir(parents=True, exist_ok=True)

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
                    'default': p.default_value
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
            'circuit_modes': [
                {
                    'name': m.name,
                    'index': m.index
                }
                for m in pedal.circuit_modes
            ],
            'enum_classes': pedal.enum_classes
        }
        feature_matrix.append(pedal_dict)

    output_path.write_text(json.dumps(feature_matrix, indent=2))
    print(f"\n✅ Feature matrix saved to: {output_path}")

if __name__ == '__main__':
    main()
