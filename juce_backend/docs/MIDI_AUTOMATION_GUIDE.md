# MIDI and Parameter Automation System Guide

This comprehensive guide covers the advanced MIDI and parameter automation system implemented in the Audio Agent backend, including MIDI CC mapping, automation curves, tempo-synced LFOs, step sequencers, and timeline-based automation.

## Table of Contents
- [Overview](#overview)
- [Core Components](#core-components)
- [MIDI Control](#midi-control)
- [Automation Lanes](#automation-lanes)
- [Advanced Interpolation](#advanced-interpolation)
- [Tempo-Synced LFOs](#tempo-synced-lfos)
- [Step Sequencers](#step-sequencers)
- [Recording Modes](#recording-modes)
- [Real-Time Processing](#real-time-processing)
- [API Reference](#api-reference)
- [WebSocket Integration](#websocket-integration)
- [Examples](#examples)

## Overview

The MIDI and Parameter Automation System provides a comprehensive solution for:

- **MIDI CC Mapping**: Map MIDI controllers to any plugin parameter
- **Advanced Automation**: Create sophisticated automation curves with multiple interpolation types
- **Tempo-Synced Modulation**: LFOs and sequencers that sync to project tempo
- **Real-Time Control**: Low-latency parameter updates with smoothing
- **Multi-Lane Automation**: Independent automation lanes for complex parameter control
- **MIDI Learn**: Intuitive MIDI learning for quick controller setup

## Core Components

### MIDIAutomationEngine

The main engine class that orchestrates all automation functionality:

```python
from src.audio_agent.core.midi_automation_engine import MIDIAutomationEngine

# Create engine with audio engine callback
engine = MIDIAutomationEngine(audio_engine_callback=my_callback)

# Start the engine
await engine.start()
```

### Key Features

- **Real-time Processing**: 100Hz update rate for smooth parameter changes
- **Parameter Smoothing**: Configurable smoothing to eliminate zipper noise
- **Transport Integration**: Syncs with project tempo and time signature
- **Data Persistence**: Export/import complete automation setups

## MIDI Control

### MIDI CC Assignments

Map MIDI CC messages to any parameter:

```python
# Create a MIDI assignment
assignment_id = engine.create_midi_assignment(
    midi_channel=0,          # MIDI channel 0-15
    cc_number=7,            # CC number 0-127 (CC 7 = Volume)
    parameter_path="track_1.volume",
    min_value=0.0,          # Parameter range
    max_value=1.0,
    is_inverted=False,        # Invert controller direction
    response_curve="linear"  # Response curve: linear, exponential, logarithmic
)
```

### MIDI Learn

Intuitive MIDI learning for quick setup:

```python
# Start MIDI learn for a parameter
learn_id = engine.start_midi_learn("track_1.filter_cutoff")

# User moves a MIDI controller
# System automatically creates assignment
assignment_id = await engine.process_midi_learn_message(midi_channel=0, cc_number=15)

# Learn is completed automatically
```

### MIDI Message Processing

Real-time MIDI message processing:

```python
# Process incoming MIDI CC
await engine.process_midi_cc(
    midi_channel=0,
    cc_number=7,
    value=64  # MIDI value 0-127
)

# Process MIDI learn messages
assignment_id = await engine.process_midi_learn_message(0, 15)
```

## Automation Lanes

### Creating Automation Lanes

Create automation lanes for any parameter:

```python
# Create an automation lane
lane_id = engine.create_automation_lane(
    parameter_id="volume",
    parameter_name="Volume",
    track_id="track_1",
    plugin_id="plugin_reverb"
)
```

### Adding Automation Points

Add points with different interpolation types:

```python
# Add points with different interpolation
from src.audio_agent.core.midi_automation_engine import InterpolationType

engine.add_automation_point(
    lane_id=lane_id,
    time=0.0,              # Time in seconds
    value=0.0,              # Normalized value 0-1
    interpolation=InterpolationType.LINEAR
)

engine.add_automation_point(
    lane_id=lane_id,
    time=2.0,
    value=1.0,
    interpolation=InterpolationType.EXPONENTIAL
)
```

### Automation Modes

Control how automation interacts with parameters:

```python
from src.audio_agent.core.midi_automation_engine import AutomationMode

# Set automation mode
lane = engine.automation_lanes[lane_id]
lane.mode = AutomationMode.READ    # Play automation
lane.mode = AutomationMode.WRITE   # Record new automation
lane.mode = AutomationMode.TOUCH   # Record only when touched
lane.mode = AutomationMode.LATCH   # Continue recording after release
lane.mode = AutomationMode.OFF     # Manual control only
```

## Advanced Interpolation

### Interpolation Types

The system supports 7 interpolation types:

1. **Linear**: Straight line between points
2. **Exponential**: Curved with exponential growth
3. **Logarithmic**: Curved with logarithmic growth
4. **Sine**: Smooth sine curve transitions
5. **Step**: Instant value changes
6. **Cubic**: Smooth cubic Hermite curves with tension
7. **Hold**: Maintain previous value until next point

### Example: Complex Automation

```python
# Create complex automation with multiple interpolation types
lane_id = engine.create_automation_lane("filter_cutoff", "Filter Cutoff")

# Smooth transition (sine)
engine.add_automation_point(lane_id, 0.0, 0.2, InterpolationType.SINE)
engine.add_automation_point(lane_id, 1.0, 0.8, InterpolationType.SINE)

# Sharp attack (step)
engine.add_automation_point(lane_id, 2.0, 0.8, InterpolationType.STEP)
engine.add_automation_point(lane_id, 2.1, 0.3, InterpolationType.STEP)

# Smooth decay (exponential)
engine.add_automation_point(lane_id, 4.0, 0.1, InterpolationType.EXPONENTIAL)
```

## Tempo-Synced LFOs

### Creating LFOs

Create tempo-synced LFOs for rhythmic modulation:

```python
from src.audio_agent.core.midi_automation_engine import LFOWaveform

# Create tempo-synced LFO
lfo_id = engine.create_lfo(
    name="Filter Modulation",
    target_parameter="track_1.filter_cutoff",
    waveform=LFOWaveform.SINE
)

# Configure LFO
lfo = engine.lfos[lfo_id]
lfo.is_tempo_synced = True
lfo.tempo_sync_rate = "1/4"    # Quarter notes
lfo.depth = 0.8              # Modulation depth (0-1)
lfo.phase = 0.0               # Phase offset
```

### Waveform Types

Available LFO waveforms:

```python
# Different waveforms for different effects
engine.create_lfo("Vibrato", "pitch", LFOWaveform.SINE)
engine.create_lfo("Tremolo", "volume", LFOWaveform.TRIANGLE)
engine.create_lfo("Rhythm", "filter", LFOWaveform.SQUARE)
engine.create_lfo("Noise", "texture", LFOWaveform.RANDOM)
engine.create_lfo("Grit", "drive", LFOWaveform.SAWTOOTH)
```

### Tempo Sync Rates

Musical time divisions for tempo sync:

- **1/64, 1/32**: Very fast rhythmic modulation
- **1/16T, 1/16**: Sixteenth note variations
- **1/8T, 1/8**: Eighth note variations
- **1/4T, 1/4**: Quarter note variations
- **1/2T, 1/2**: Half note variations
- **1/1**: Whole note modulation
- **2/1, 4/1**: Multi-measure modulation

## Step Sequencers

### Creating Sequencers

Create step sequencers for rhythmic automation:

```python
# Create 16-step sequencer
sequencer_id = engine.create_step_sequencer(
    name="Volume Pattern",
    target_parameter="track_1.volume",
    steps=16
)

# Configure sequencer
sequencer = engine.sequencers[sequencer_id]
sequencer.values = [0.0, 0.2, 0.5, 0.8, 1.0, 0.8, 0.5, 0.2,
                   0.0, 0.2, 0.5, 0.8, 1.0, 0.8, 0.5, 0.2]
sequencer.tempo = 120.0        # BPM
sequencer.rate = "1/16"        # Sixteenth notes
sequencer.shuffle = 0.3        # Shuffle amount (0-1)
sequencer.is_looping = True
```

### Step Sequencer Features

- **Configurable Steps**: 1-64 steps per sequencer
- **Tempo Sync**: Sequencer advances with project tempo
- **Shuffle**: Swing feel for groovy patterns
- **Loop Control**: Single-shot or looping playback
- **Real-time Updates**: Modify steps while playing

### Example: Rhythmic Pattern

```python
# Create interesting rhythmic pattern
sequencer_id = engine.create_step_sequencer("Rhythm", "track_1.pan", steps=8)

sequencer = engine.sequencers[sequencer_id]
sequencer.values = [0.0, 1.0, 0.5, 1.0, 0.0, 0.0, 0.5, 1.0]  # Pan pattern
sequencer.rate = "1/8"      # Eighth notes
sequencer.shuffle = 0.2
sequencer.is_looping = True
```

## Recording Modes

### Automation Recording

Record parameter movements in real-time:

```python
# Start recording for specific lanes
engine.start_recording([lane_id_1, lane_id_2])

# Record parameter changes (typically from user input)
engine.record_automation_point(lane_id_1, 0.3)  # Time: 0.3s, Value: 0.3
engine.record_automation_point(lane_id_1, 0.7)  # Time: 0.7s, Value: 0.7

# Stop recording
engine.stop_recording()
```

### Touch Mode

Touch mode records only while parameter is being controlled:

```python
# Touch mode setup
lane.mode = AutomationMode.TOUCH

# User starts controlling parameter
lane.is_touched = True
lane.touch_start_time = engine.current_time
lane.touch_start_value = current_parameter_value

# User releases parameter
lane.is_touched = False
# Recording automatically stops
```

### Latch Mode

Latch mode continues recording after parameter release:

```python
# Latch mode records from first touch until stopped
lane.mode = AutomationMode.LATCH

# User briefly touches parameter
# Recording continues until stop_recording() is called
```

## Real-Time Processing

### Update Loop

The main update loop processes all automation at 100Hz:

```python
# Engine automatically handles:
# - Parameter interpolation between automation points
# - LFO waveform generation and tempo syncing
# - Step sequencer advancement
# - Parameter smoothing for glitch-free changes
# - MIDI CC message processing
# - Recording automation points
```

### Parameter Smoothing

Smooth parameter changes to eliminate zipper noise:

```python
# Configure smoothing
engine.smoothing_factor = 0.1  # 0.0 = no smoothing, 1.0 = instant

# Parameter changes are automatically smoothed
await engine._set_parameter_value("track_1.volume", 0.8)
# Value will gradually approach 0.8 over time
```

### Performance Optimization

The engine includes several performance optimizations:

- **Efficient Interpolation**: Optimized algorithms for different curve types
- **Selective Updates**: Only processes active lanes and modulators
- **Batch Processing**: Groups parameter updates for efficiency
- **Memory Management**: Automatic cleanup of unused data

## API Reference

### Engine Management

```python
# Start/stop engine
await engine.start()
await engine.stop()

# Get status
status = {
    "is_running": engine._is_running,
    "lanes_count": len(engine.automation_lanes),
    "lfos_count": len(engine.lfos),
    "sequencers_count": len(engine.sequencers)
}
```

### Automation Lanes

```python
# Create lane
lane_id = engine.create_automation_lane(
    parameter_id="param",
    parameter_name="Parameter",
    track_id="track",
    plugin_id="plugin"
)

# Add points
point_id = engine.add_automation_point(
    lane_id, time=1.0, value=0.5,
    interpolation=InterpolationType.LINEAR
)

# Remove points
success = engine.remove_automation_point(lane_id, point_id)

# Delete lane
success = engine.delete_automation_lane(lane_id)
```

### MIDI Assignments

```python
# Create assignment
assignment_id = engine.create_midi_assignment(
    midi_channel=0, cc_number=7,
    parameter_path="track_1.volume"
)

# Delete assignment
success = engine.delete_midi_assignment(assignment_id)

# MIDI learn
learn_id = engine.start_midi_learn("track_1.volume")
assignment_id = await engine.process_midi_learn_message(0, 7)
engine.cancel_midi_learn("track_1.volume")
```

### LFOs

```python
# Create LFO
lfo_id = engine.create_lfo(
    name="Modulation", target_parameter="param",
    waveform=LFOWaveform.SINE
)

# Update LFO
lfo = engine.lfos[lfo_id]
lfo.frequency = 2.0
lfo.depth = 0.8
lfo.tempo_sync_rate = "1/8"

# Delete LFO
success = engine.delete_lfo(lfo_id)
```

### Step Sequencers

```python
# Create sequencer
sequencer_id = engine.create_step_sequencer(
    name="Pattern", target_parameter="param", steps=16
)

# Update sequencer
sequencer = engine.sequencers[sequencer_id]
sequencer.values = [0.0, 0.5, 1.0] * 5 + [0.0, 0.0] * 1
sequencer.rate = "1/16"
sequencer.shuffle = 0.3

# Update single step
sequencer.values[step_index] = new_value

# Delete sequencer
success = engine.delete_step_sequencer(sequencer_id)
```

### Transport Control

```python
# Transport control
engine.play()
engine.pause()
engine.stop()
engine.seek(10.0)  # Seek to 10 seconds

# Tempo and time signature
engine.set_tempo(140.0)  # BPM
engine.set_time_signature(3, 4)  # 3/4 time
```

## WebSocket Integration

The MIDI automation system integrates with the existing WebSocket infrastructure:

### Message Types

New message types for MIDI and automation control:

```typescript
// MIDI messages
"MIDI_CC"               // MIDI CC control
"MIDI_LEARN_START"      // Start MIDI learn
"MIDI_ASSIGNMENT_CREATE" // Create MIDI assignment

// Automation messages
"AUTOMATION_LANE_CREATE"  // Create automation lane
"AUTOMATION_POINT_ADD"   // Add automation point
"LFO_CREATE"             // Create LFO
"SEQUENCER_CREATE"       // Create sequencer
```

### WebSocket Messages

### MIDI CC Message

```typescript
{
  "id": "msg_001",
  "type": "MIDI_CC",
  "data": {
    "midi_channel": 0,
    "cc_number": 7,
    "value": 64
  },
  "user_id": "user_123",
  "session_id": "session_456"
}
```

### Create Automation Lane

```typescript
{
  "id": "msg_002",
  "type": "AUTOMATION_LANE_CREATE",
  "data": {
    "parameter_id": "volume",
    "parameter_name": "Volume",
    "track_id": "track_1",
    "plugin_id": "plugin_reverb"
  },
  "user_id": "user_123",
  "session_id": "session_456"
}
```

### Add Automation Point

```typescript
{
  "id": "msg_003",
  "type": "AUTOMATION_POINT_ADD",
  "data": {
    "lane_id": "lane_123",
    "time": 2.5,
    "value": 0.75,
    "interpolation_type": "exponential"
  },
  "user_id": "user_123",
  "session_id": "session_456"
}
```

### Create LFO

```typescript
{
  "id": "msg_004",
  "type": "LFO_CREATE",
  "data": {
    "name": "Filter Modulation",
    "target_parameter": "track_1.filter_cutoff",
    "waveform": "sine",
    "is_tempo_synced": true,
    "tempo_sync_rate": "1/4",
    "depth": 0.8
  },
  "user_id": "user_123",
  "session_id": "session_456"
}
```

## Examples

### Example 1: Basic MIDI Mapping

```python
import asyncio
from src.audio_agent.core.midi_automation_engine import MIDIAutomationEngine

async def basic_midi_mapping():
    """Example: Basic MIDI CC mapping"""

    # Create engine
    engine = MIDIAutomationEngine()
    await engine.start()

    # Map MIDI CC 7 (Volume) to track volume
    engine.create_midi_assignment(
        midi_channel=0,
        cc_number=7,
        parameter_path="track_1.volume",
        min_value=0.0,
        max_value=1.0
    )

    # Map MIDI CC 10 (Pan) to track pan
    engine.create_midi_assignment(
        midi_channel=0,
        cc_number=10,
        parameter_path="track_1.pan",
        min_value=-1.0,
        max_value=1.0
    )

    # Start playback
    engine.play()

    # Simulate MIDI CC messages
    await engine.process_midi_cc(0, 7, 90)   # Volume at 70%
    await engine.process_midi_cc(0, 10, 64)  # Pan at center

    await asyncio.sleep(2)
    engine.stop()
    await engine.stop()

# Run the example
asyncio.run(basic_midi_mapping())
```

### Example 2: Advanced Automation with Multiple Curves

```python
async def advanced_automation():
    """Example: Complex automation with multiple interpolation types"""

    from src.audio_agent.core.midi_automation_engine import (
        InterpolationType, AutomationMode
    )

    engine = MIDIAutomationEngine()
    await engine.start()

    # Create automation lane for filter cutoff
    lane_id = engine.create_automation_lane(
        parameter_id="filter_cutoff",
        parameter_name="Filter Cutoff",
        track_id="track_1"
    )

    # Create complex automation pattern
    # Smooth attack (sine)
    engine.add_automation_point(lane_id, 0.0, 0.2, InterpolationType.SINE)
    engine.add_automation_point(lane_id, 1.0, 0.8, InterpolationType.SINE)

    # Sharp cut (step)
    engine.add_automation_point(lane_id, 2.0, 0.8, InterpolationType.STEP)
    engine.add_automation_point(lane_id, 2.01, 0.3, InterpolationType.STEP)

    # Smooth decay (exponential)
    engine.add_automation_point(lane_id, 4.0, 0.1, InterpolationType.EXPONENTIAL)

    # Set to read mode
    lane = engine.automation_lanes[lane_id]
    lane.mode = AutomationMode.READ

    # Play automation
    engine.play()
    await asyncio.sleep(5)
    engine.stop()
    await engine.stop()

asyncio.run(advanced_automation())
```

### Example 3: Tempo-Synced LFO and Sequencer

```python
async def tempo_synced_modulation():
    """Example: Tempo-synced LFO and step sequencer"""

    from src.audio_agent.core.midi_automation_engine import LFOWaveform

    engine = MIDIAutomationEngine()
    await engine.start()

    # Set tempo
    engine.set_tempo(120.0)

    # Create LFO for filter modulation (1/4 notes)
    lfo_id = engine.create_lfo(
        name="Filter LFO",
        target_parameter="track_1.filter_cutoff",
        waveform=LFOWaveform.SINE
    )

    lfo = engine.lfos[lfo_id]
    lfo.is_tempo_synced = True
    lfo.tempo_sync_rate = "1/4"
    lfo.depth = 0.6

    # Create step sequencer for volume pattern (1/8 notes)
    sequencer_id = engine.create_step_sequencer(
        name="Volume Pattern",
        target_parameter="track_1.volume",
        steps=16
    )

    sequencer = engine.sequencers[sequencer_id]
    sequencer.values = [
        0.8, 0.6, 0.4, 0.2,  # Fading out
        0.1, 0.2, 0.4, 0.6,  # Fading in
        0.8, 0.9, 1.0, 0.9,  # Peak
        0.7, 0.5, 0.3, 0.1   # Fade out
    ]
    sequencer.rate = "1/8"
    sequencer.shuffle = 0.2

    # Play and observe modulation
    engine.play()
    await asyncio.sleep(8)
    engine.stop()
    await engine.stop()

asyncio.run(tempo_synced_modulation())
```

### Example 4: MIDI Learn and Touch Recording

```python
async def midi_learn_and_recording():
    """Example: MIDI learn with touch recording"""

    engine = MIDIAutomationEngine()
    await engine.start()

    # Create automation lane
    lane_id = engine.create_automation_lane(
        parameter_id="reverb_wet",
        parameter_name="Reverb Wet",
        track_id="track_1"
    )

    # Set touch mode
    lane = engine.automation_lanes[lane_id]
    lane.mode = AutomationMode.TOUCH

    # Start MIDI learn
    learn_id = engine.start_midi_learn("track_1.reverb_wet")

    print("Move a MIDI controller to learn mapping...")

    # Simulate user moving MIDI CC 15
    assignment_id = await engine.process_midi_learn_message(0, 15)

    if assignment_id:
        print(f"Learned CC 15 -> track_1.reverb_wet")

        # Start recording in touch mode
        engine.start_recording([lane_id])
        engine.play()

        # Simulate user controlling parameter
        print("Recording for 3 seconds...")

        # Simulate touch recording
        lane.is_touched = True
        lane.touch_start_time = engine.current_time

        await asyncio.sleep(1)
        engine.record_automation_point(lane_id, 0.3)

        await asyncio.sleep(1)
        lane.is_touched = False  # User releases control

        await asyncio.sleep(1)

        # Stop recording
        engine.stop_recording()
        engine.stop()

        print(f"Recorded {len(lane.points)} automation points")

    await engine.stop()

asyncio.run(midi_learn_and_recording())
```

### Example 5: Complete Integration

```python
async def complete_integration():
    """Example: Complete integration with all features"""

    engine = MIDIAutomationEngine()
    await engine.start()

    # Set up project
    engine.set_tempo(140.0)
    engine.set_time_signature(4, 4)

    # Create multiple automation lanes
    volume_lane = engine.create_automation_lane("volume", "Volume", "track_1")
    filter_lane = engine.create_automation_lane("filter_cutoff", "Filter", "track_1")
    reverb_lane = engine.create_automation_lane("reverb_wet", "Reverb Wet", "track_1")

    # Add automation points
    for lane_id in [volume_lane, filter_lane, reverb_lane]:
        engine.add_automation_point(lane_id, 0.0, 0.5)
        engine.add_automation_point(lane_id, 4.0, 0.8)

    # Create MIDI assignments
    engine.create_midi_assignment(0, 7, "track_1.volume")
    engine.create_midi_assignment(0, 74, "track_1.filter_cutoff")
    engine.create_midi_assignment(0, 71, "track_1.reverb_wet")

    # Create LFO
    lfo_id = engine.create_lfo("Vibrato", "track_1.pitch", LFOWaveform.SINE)
    lfo = engine.lfos[lfo_id]
    lfo.is_tempo_synced = True
    lfo.tempo_sync_rate = "1/4"
    lfo.depth = 0.2

    # Create sequencer
    seq_id = engine.create_step_sequencer("Rhythm", "track_1.pan", 8)
    sequencer = engine.sequencers[seq_id]
    sequencer.values = [0.0, 1.0, 0.5, 1.0, 0.0, -1.0, -0.5, -1.0]
    sequencer.rate = "1/8"
    sequencer.shuffle = 0.3

    # Set automation modes
    volume_lane = engine.automation_lanes[volume_lane]
    volume_lane.mode = AutomationMode.READ

    filter_lane = engine.automation_lanes[filter_lane]
    filter_lane.mode = AutomationMode.LATCH

    reverb_lane = engine.automation_lanes[reverb_lane]
    reverb_lane.mode = AutomationMode.TOUCH

    # Play the complete automation
    print("Playing complete automation system...")
    engine.play()

    # Simulate real-time MIDI control
    for i in range(20):
        await asyncio.sleep(0.1)
        # Simulate MIDI CC messages
        await engine.process_midi_cc(0, 7, 64 + (i * 3) % 64)
        await engine.process_midi_cc(0, 74, 64 + (i * 5) % 64)

    await asyncio.sleep(2)
    engine.stop()
    await engine.stop()

    # Export automation data
    data = engine.export_automation_data()
    print(f"Exported {len(data['automation_lanes']} lanes, "
          f"{len(data['midi_assignments')} assignments, "
          f"{len(data['lfos'])} LFOs, "
          f"{len(data['sequencers'])} sequencers")

asyncio.run(complete_integration())
```

## Best Practices

### Performance Optimization

1. **Use Parameter Smoothing**: Enable smoothing for MIDI CC to eliminate zipper noise
2. **Limit Active LFOs**: Too many LFOs can impact performance
3. **Optimize Automation Points**: Remove unnecessary points
4. **Use Batching**: Group related parameter updates

### Musical Considerations

1. **Tempo Syncing**: Always sync LFOs and sequencers to project tempo
2. **Musical Time Divisions**: Use standard musical divisions (1/4, 1/8, 1/16)
3. **Curve Selection**: Choose appropriate curves for musical expression
4. **Recording Modes**: Use TOUCH for expressive control, LATCH for sustained changes

### Workflow Tips

1. **Start with MIDI Learn**: Use MIDI learn for quick controller setup
2. **Build Complexity Gradually**: Start with simple automation, add complexity
3. **Test with Real Controllers**: Verify with actual MIDI hardware
4. **Save Presets**: Export automation setups for later use

## Troubleshooting

### Common Issues

**Parameter Updates Not Smooth**: Increase `smoothing_factor` value
**LFO Not Syncing**: Verify `is_tempo_synced` is True and check `tempo_sync_rate`
**MIDI Learn Not Working**: Check MIDI channel and CC number conflicts
**Automation Not Playing**: Verify lane mode is set to READ or appropriate mode

### Debug Tools

```python
# Check engine status
status = {
    "is_running": engine._is_running,
    "current_time": engine.current_time,
    "tempo": engine.tempo,
    "lanes": len(engine.automation_lanes),
    "assignments": len(engine.midi_assignments)
}

# Check specific lane
lane = engine.automation_lanes[lane_id]
print(f"Mode: {lane.mode}, Points: {len(lane.points)}, Enabled: {lane.is_enabled}")

# Check LFO state
lfo = engine.lfos[lfo_id]
print(f"Current phase: {lfo.current_phase}, Value: {lfo.get_value_at_time(engine.current_time, engine.tempo)}")
```

This comprehensive MIDI and Parameter Automation System provides powerful tools for creating sophisticated, musical automation with real-time MIDI control and tempo-synchronized modulation.