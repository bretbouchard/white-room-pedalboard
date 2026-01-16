# Preset Converter

Universal preset format converter for White Room instruments and effects.

## Features

- **Convert between formats:** VST3, AU, and JSON
- **Batch conversion:** Convert entire directories at once
- **Universal support:** Works with all White Room instruments
- **Metadata preservation:** Maintains preset names, categories, and descriptions

## Supported Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| VST3 | `.vstpreset` | VST3 preset format (XML-based) |
| AU | `.aupreset` | Audio Unit preset format (Property List) |
| JSON | `.json` | Human-readable JSON format |

## Building

```bash
cd tools/preset_converter
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

## Usage

### Single File Conversion

Convert a single preset from one format to another:

```bash
./preset-converter convert preset.json preset.vstpreset
./preset-converter convert preset.vstpreset preset.aupreset
./preset-converter convert preset.aupreset preset.json
```

### Batch Conversion

Convert an entire directory of presets:

```bash
# Convert all presets to VST3 format
./preset-converter batch ./json_presets ./vst3_presets vst3

# Convert all presets to AU format
./preset-converter batch ./json_presets ./au_presets au

# Convert all presets to JSON format
./preset-converter batch ./vst3_presets ./json_presets json
```

## JSON Format

The JSON format is human-readable and version-control friendly:

```json
{
  "name": "Init Patch",
  "category": "Bass",
  "author": "White Room",
  "description": "Basic starting point",
  "parameters": {
    "osc1_freq": 440.0,
    "osc1_wave": 0.0,
    "filter_cutoff": 1000.0,
    "filter_resonance": 0.5,
    "env_attack": 0.01,
    "env_decay": 0.2,
    "env_sustain": 0.7,
    "env_release": 0.3
  }
}
```

## Integration with Instrument Repos

Each instrument repository can include presets in JSON format (version-controlled), then use the converter to generate VST3 and AU presets during the build process.

### Example: Add to CMakeLists.txt

```cmake
# Find preset-converter
find_program(PRESET_CONVERTER preset-converter)

if(PRESET_CONVERTER)
    # Convert JSON presets to VST3 format
    add_custom_command(
        OUTPUT ${CMAKE_BINARY_DIR}/presets_vst3
        COMMAND ${PRESET_CONVERTER} batch
            ${CMAKE_SOURCE_DIR}/presets/json
            ${CMAKE_BINARY_DIR}/presets_vst3
            vst3
    )

    # Convert JSON presets to AU format
    add_custom_command(
        OUTPUT ${CMAKE_BINARY_DIR}/presets_au
        COMMAND ${PRESET_CONVERTER} batch
            ${CMAKE_SOURCE_DIR}/presets/json
            ${CMAKE_BINARY_DIR}/presets_au
            au
    )
endif()
```

## Preset Best Practices

1. **Store source presets in JSON** - Version control friendly, human readable
2. **Convert during build** - Generate VST3/AU presets automatically
3. **Include metadata** - Always add name, category, and description
4. **Use categories** - Bass, Leads, Pads, FX, etc.
5. **Document parameters** - Maintain a parameter reference for each instrument

## Examples

### Example 1: Convert Kane Marco presets

```bash
# Convert Kane Marco JSON presets to VST3
./preset-converter batch \
    ../kane-marco-instrument/presets/KaneMarco \
    ./presets_vst3/KaneMarco \
    vst3
```

### Example 2: Generate AU presets for distribution

```bash
# Convert all JSON presets to AU format
./preset-converter batch \
    ../presets/json \
    ./distribution/au_presets \
    au
```

### Example 3: Extract presets from VST3

```bash
# Convert VST3 presets to JSON for editing
./preset-converter convert \
    factory_bass.vstpreset \
    factory_bass.json
```

## Technical Details

### VST3 Format

VST3 presets use an XML-based format defined by Steinberg. The converter handles:
- Parameter values
- Parameter metadata (names, labels)
- Preset metadata (name, category, author)

### AU Format

AU presets use Apple's Property List (plist) format. The converter handles:
- Parameter dictionaries
- Standard AU metadata
- Type and version information

### JSON Format

The JSON format is custom to White Room but follows these conventions:
- All parameter values as doubles
- Optional metadata fields
- Human-readable structure

## Troubleshooting

### "preset-converter: command not found"
Build the tool first: `cmake --build build`

### "Conversion failed"
Check that:
- Source file exists and is valid
- Destination directory is writable
- File extensions match expected formats

### "Parameters not loading"
Verify parameter IDs match between DSP and preset files

## License

Part of White Room audio development environment.
