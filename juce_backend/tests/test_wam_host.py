"""Tests for WebAudio Module (WAM) Host implementation."""

import json
import tempfile
from pathlib import Path

import pytest

from src.audio_agent.core.wam_host import (
    WAMHost,
    WAMHostConfig,
    WAMLoadError,
    WAMParameterError,
)
from src.audio_agent.models.wam import (
    WAMDescriptor,
    WAMParameter,
    WAMParameterType,
    WAMState,
)


@pytest.fixture
def sample_wam_descriptor():
    """Create a sample WAM descriptor for testing."""
    return WAMDescriptor(
        name="Test Reverb",
        vendor="Test Audio",
        version="1.0.0",
        sdk_version="2.0.0",
        identifier="com.testaudio.reverb",
        website="https://testaudio.com",
        is_instrument=False,
        is_effect=True,
        audio_input=2,
        audio_output=2,
        midi_input=False,
        midi_output=False,
        parameters=[
            WAMParameter(
                id="room_size",
                label="Room Size",
                type=WAMParameterType.FLOAT,
                default_value=0.5,
                min_value=0.0,
                max_value=1.0,
                current_value=0.5,
                unit="%",
                description="Room size parameter",
            ),
            WAMParameter(
                id="damping",
                label="Damping",
                type=WAMParameterType.FLOAT,
                default_value=0.3,
                min_value=0.0,
                max_value=1.0,
                current_value=0.3,
                unit="%",
            ),
            WAMParameter(
                id="bypass",
                label="Bypass",
                type=WAMParameterType.BOOLEAN,
                default_value=False,
                current_value=False,
            ),
        ],
        description="High-quality reverb effect",
        keywords=["reverb", "effect", "spatial"],
    )


@pytest.fixture
def sample_instrument_descriptor():
    """Create a sample instrument WAM descriptor."""
    return WAMDescriptor(
        name="Test Synth",
        vendor="Test Instruments",
        version="2.1.0",
        sdk_version="2.0.0",
        identifier="com.testinstruments.synth",
        is_instrument=True,
        is_effect=False,
        audio_input=0,
        audio_output=2,
        midi_input=True,
        midi_output=False,
        parameters=[
            WAMParameter(
                id="cutoff",
                label="Filter Cutoff",
                type=WAMParameterType.AUDIO_PARAM,
                default_value=1000.0,
                min_value=20.0,
                max_value=20000.0,
                current_value=1000.0,
                unit="Hz",
                automation_rate="a-rate",
            ),
            WAMParameter(
                id="waveform",
                label="Waveform",
                type=WAMParameterType.CHOICE,
                default_value="sawtooth",
                current_value="sawtooth",
                choices=["sine", "square", "sawtooth", "triangle"],
            ),
        ],
        description="Virtual analog synthesizer",
        keywords=["synth", "instrument", "analog"],
    )


@pytest.fixture
def wam_host_config():
    """Create WAM host configuration for testing."""
    return WAMHostConfig(
        sample_rate=48000,
        buffer_size=128,
        auto_discover=False,  # Disable for testing
        max_instances=16,
        cpu_limit=0.8,
        state_save_interval=30,
    )


@pytest.fixture
async def wam_host(wam_host_config):
    """Create and initialize WAM host for testing."""
    host = WAMHost(config=wam_host_config)
    await host.initialize()
    yield host
    await host.shutdown()


class TestWAMHostConfig:
    """Test WAM Host configuration."""

    def test_default_config(self):
        """Test default configuration values."""
        config = WAMHostConfig()

        assert config.sample_rate == 48000
        assert config.buffer_size == 128
        assert config.auto_discover is True
        assert config.max_instances == 32
        assert config.cpu_limit == 0.8
        assert config.state_save_interval == 30

    def test_config_validation(self):
        """Test configuration validation."""
        # Valid config
        config = WAMHostConfig(
            sample_rate=44100, buffer_size=256, max_instances=8, cpu_limit=0.5
        )
        assert config.sample_rate == 44100

        # Invalid sample rate
        with pytest.raises(ValueError):
            WAMHostConfig(sample_rate=1000)  # Too low

        # Invalid buffer size
        with pytest.raises(ValueError):
            WAMHostConfig(buffer_size=32)  # Too small

        # Invalid CPU limit
        with pytest.raises(ValueError):
            WAMHostConfig(cpu_limit=1.5)  # Too high


class TestWAMHost:
    """Test WAM Host functionality."""

    @pytest.mark.asyncio
    async def test_initialization(self, wam_host_config):
        """Test WAM host initialization."""
        host = WAMHost(config=wam_host_config)

        assert not host.is_initialized
        assert host.audio_context_id is None

        success = await host.initialize()

        assert success
        assert host.is_initialized
        assert host.audio_context_id is not None
        assert host.audio_context_id.startswith("audio_context_")

        await host.shutdown()

    @pytest.mark.asyncio
    async def test_shutdown(self, wam_host):
        """Test WAM host shutdown."""
        assert wam_host.is_initialized

        await wam_host.shutdown()

        assert not wam_host.is_initialized
        assert wam_host.audio_context_id is None
        assert len(wam_host.registry.active_instances) == 0

    @pytest.mark.asyncio
    async def test_register_wam(self, wam_host, sample_wam_descriptor):
        """Test WAM registration."""
        initial_count = wam_host.registry.total_wams

        success = wam_host.registry.register_wam(sample_wam_descriptor)

        assert success
        assert wam_host.registry.total_wams == initial_count + 1
        assert sample_wam_descriptor.identifier in wam_host.registry.available_wams

    @pytest.mark.asyncio
    async def test_load_wam(self, wam_host, sample_wam_descriptor):
        """Test WAM loading."""
        # Register WAM first
        wam_host.registry.register_wam(sample_wam_descriptor)

        # Load WAM instance
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        assert instance is not None
        assert instance.descriptor.identifier == sample_wam_descriptor.identifier
        assert instance.state == WAMState.LOADED
        assert instance.audio_context_id == wam_host.audio_context_id
        assert instance.instance_id in wam_host.registry.active_instances

    @pytest.mark.asyncio
    async def test_load_wam_with_custom_id(self, wam_host, sample_wam_descriptor):
        """Test WAM loading with custom instance ID."""
        wam_host.registry.register_wam(sample_wam_descriptor)

        custom_id = "my_reverb_instance"
        instance = await wam_host.load_wam(
            sample_wam_descriptor.identifier, instance_id=custom_id
        )

        assert instance.instance_id == custom_id
        assert custom_id in wam_host.registry.active_instances

    @pytest.mark.asyncio
    async def test_load_nonexistent_wam(self, wam_host):
        """Test loading non-existent WAM."""
        with pytest.raises(WAMLoadError, match="WAM not found"):
            await wam_host.load_wam("nonexistent.wam")

    @pytest.mark.asyncio
    async def test_load_wam_duplicate_instance_id(
        self, wam_host, sample_wam_descriptor
    ):
        """Test loading WAM with duplicate instance ID."""
        wam_host.registry.register_wam(sample_wam_descriptor)

        instance_id = "duplicate_id"
        await wam_host.load_wam(sample_wam_descriptor.identifier, instance_id)

        # Try to load with same instance ID
        with pytest.raises(WAMLoadError, match="Instance ID already exists"):
            await wam_host.load_wam(sample_wam_descriptor.identifier, instance_id)

    @pytest.mark.asyncio
    async def test_unload_wam(self, wam_host, sample_wam_descriptor):
        """Test WAM unloading."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        instance_id = instance.instance_id
        assert instance_id in wam_host.registry.active_instances

        success = await wam_host.unload_wam(instance_id)

        assert success
        assert instance_id not in wam_host.registry.active_instances

    @pytest.mark.asyncio
    async def test_unload_nonexistent_instance(self, wam_host):
        """Test unloading non-existent instance."""
        success = await wam_host.unload_wam("nonexistent_instance")
        assert not success

    @pytest.mark.asyncio
    async def test_activate_instance(self, wam_host, sample_wam_descriptor):
        """Test instance activation."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        assert instance.state == WAMState.LOADED

        success = await wam_host.activate_instance(instance.instance_id)

        assert success
        assert instance.state == WAMState.ACTIVE

    @pytest.mark.asyncio
    async def test_suspend_instance(self, wam_host, sample_wam_descriptor):
        """Test instance suspension."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        # Activate first
        await wam_host.activate_instance(instance.instance_id)
        assert instance.state == WAMState.ACTIVE

        # Then suspend
        success = await wam_host.suspend_instance(instance.instance_id)

        assert success
        assert instance.state == WAMState.SUSPENDED

    @pytest.mark.asyncio
    async def test_set_parameter(self, wam_host, sample_wam_descriptor):
        """Test parameter setting."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        # Set float parameter
        success = await wam_host.set_parameter(instance.instance_id, "room_size", 0.8)

        assert success
        assert instance.get_parameter_value("room_size") == 0.8

        # Set boolean parameter
        success = await wam_host.set_parameter(instance.instance_id, "bypass", True)

        assert success
        assert instance.get_parameter_value("bypass") is True

    @pytest.mark.asyncio
    async def test_set_invalid_parameter(self, wam_host, sample_wam_descriptor):
        """Test setting invalid parameter."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        # Invalid parameter ID
        with pytest.raises(WAMParameterError):
            await wam_host.set_parameter(instance.instance_id, "nonexistent_param", 0.5)

        # Invalid parameter value (out of range)
        with pytest.raises(WAMParameterError):
            await wam_host.set_parameter(
                instance.instance_id,
                "room_size",
                2.0,  # Max is 1.0
            )

    @pytest.mark.asyncio
    async def test_get_parameter(self, wam_host, sample_wam_descriptor):
        """Test parameter getting."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        # Get default value
        value = await wam_host.get_parameter(instance.instance_id, "room_size")
        assert value == 0.5  # Default value

        # Set and get new value
        await wam_host.set_parameter(instance.instance_id, "room_size", 0.7)
        value = await wam_host.get_parameter(instance.instance_id, "room_size")
        assert value == 0.7

        # Get from non-existent instance
        value = await wam_host.get_parameter("nonexistent", "room_size")
        assert value is None

    @pytest.mark.asyncio
    async def test_save_and_load_preset(self, wam_host, sample_wam_descriptor):
        """Test preset saving and loading."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        # Set some parameter values
        await wam_host.set_parameter(instance.instance_id, "room_size", 0.8)
        await wam_host.set_parameter(instance.instance_id, "damping", 0.6)
        await wam_host.set_parameter(instance.instance_id, "bypass", True)

        # Save preset
        success = await wam_host.save_preset(
            instance.instance_id,
            "My Preset",
            description="Test preset",
            tags=["test", "reverb"],
        )

        assert success

        # Reset parameters
        await wam_host.set_parameter(instance.instance_id, "room_size", 0.1)
        await wam_host.set_parameter(instance.instance_id, "damping", 0.1)
        await wam_host.set_parameter(instance.instance_id, "bypass", False)

        # Load preset
        success = await wam_host.load_preset(instance.instance_id, "My Preset")

        assert success
        assert instance.get_parameter_value("room_size") == 0.8
        assert instance.get_parameter_value("damping") == 0.6
        assert instance.get_parameter_value("bypass") is True

    @pytest.mark.asyncio
    async def test_search_wams(
        self, wam_host, sample_wam_descriptor, sample_instrument_descriptor
    ):
        """Test WAM searching."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        wam_host.registry.register_wam(sample_instrument_descriptor)

        # Search by name
        results = wam_host.search_wams("reverb")
        assert len(results) == 1
        assert results[0].name == "Test Reverb"

        # Search by vendor
        results = wam_host.search_wams("Test Audio")
        assert len(results) == 1
        assert results[0].vendor == "Test Audio"

        # Search by keyword
        results = wam_host.search_wams("analog")
        assert len(results) == 1
        assert results[0].name == "Test Synth"

        # Search with no results
        results = wam_host.search_wams("nonexistent")
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_get_wams_by_type(
        self, wam_host, sample_wam_descriptor, sample_instrument_descriptor
    ):
        """Test filtering WAMs by type."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        wam_host.registry.register_wam(sample_instrument_descriptor)

        # Get effects
        effects = wam_host.get_wams_by_type(is_instrument=False)
        assert len(effects) == 1
        assert effects[0].name == "Test Reverb"

        # Get instruments
        instruments = wam_host.get_wams_by_type(is_instrument=True)
        assert len(instruments) == 1
        assert instruments[0].name == "Test Synth"

    @pytest.mark.asyncio
    async def test_performance_stats(self, wam_host, sample_wam_descriptor):
        """Test performance statistics."""
        wam_host.registry.register_wam(sample_wam_descriptor)

        stats = await wam_host.get_performance_stats()

        assert "total_wams" in stats
        assert "active_instances" in stats
        assert "instruments" in stats
        assert "effects" in stats
        assert "total_cpu_usage" in stats
        assert "total_memory_mb" in stats
        assert "cpu_limit" in stats
        assert "max_instances" in stats
        assert "last_check" in stats

        assert stats["total_wams"] == 1
        assert stats["active_instances"] == 0
        assert stats["effects"] == 1
        assert stats["instruments"] == 0

    @pytest.mark.asyncio
    async def test_event_system(self, wam_host, sample_wam_descriptor):
        """Test event system."""
        events_received = []

        def event_handler(event_type, data):
            events_received.append((event_type, data))

        # Add event listeners
        wam_host.add_event_listener("wam_loaded", event_handler)
        wam_host.add_event_listener("parameter_changed", event_handler)
        wam_host.add_event_listener("state_changed", event_handler)

        # Register and load WAM
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        # Set parameter
        await wam_host.set_parameter(instance.instance_id, "room_size", 0.9)

        # Check events
        assert (
            len(events_received) >= 3
        )  # state_changed (loading), wam_loaded, state_changed (loaded), parameter_changed

        # Check for specific events
        event_types = [event[0] for event in events_received]
        assert "wam_loaded" in event_types
        assert "parameter_changed" in event_types
        assert "state_changed" in event_types

    @pytest.mark.asyncio
    async def test_max_instances_limit(self, wam_host_config, sample_wam_descriptor):
        """Test maximum instances limit."""
        # Set low limit for testing
        wam_host_config.max_instances = 2

        host = WAMHost(config=wam_host_config)
        await host.initialize()

        try:
            host.registry.register_wam(sample_wam_descriptor)

            # Load up to limit
            instance1 = await host.load_wam(sample_wam_descriptor.identifier)
            instance2 = await host.load_wam(sample_wam_descriptor.identifier)

            assert instance1 is not None
            assert instance2 is not None

            # Try to exceed limit
            with pytest.raises(WAMLoadError, match="Maximum instances reached"):
                await host.load_wam(sample_wam_descriptor.identifier)

        finally:
            await host.shutdown()


class TestWAMHostWithFiles:
    """Test WAM Host with file operations."""

    @pytest.mark.asyncio
    async def test_wam_discovery(self, wam_host_config, sample_wam_descriptor):
        """Test WAM discovery from files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create WAM descriptor file
            wam_file = Path(temp_dir) / "test_reverb.wam.json"

            # Convert descriptor to dict with proper serialization
            descriptor_data = sample_wam_descriptor.model_dump()

            # Convert enum values to strings for JSON serialization
            for param in descriptor_data.get("parameters", []):
                if "type" in param:
                    param["type"] = param["type"]  # Already a string from model_dump

            with open(wam_file, "w") as f:
                json.dump(descriptor_data, f, default=str)

            # Configure host to discover from temp directory
            wam_host_config.wam_directories = [temp_dir]
            wam_host_config.auto_discover = True

            host = WAMHost(config=wam_host_config)
            await host.initialize()

            try:
                # Check if WAM was discovered
                assert host.registry.total_wams == 1
                assert sample_wam_descriptor.identifier in host.registry.available_wams

            finally:
                await host.shutdown()

    @pytest.mark.asyncio
    async def test_preset_persistence(self, wam_host_config, sample_wam_descriptor):
        """Test preset saving and loading from files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            wam_host_config.preset_directory = temp_dir

            host = WAMHost(config=wam_host_config)
            await host.initialize()

            try:
                host.registry.register_wam(sample_wam_descriptor)
                instance = await host.load_wam(sample_wam_descriptor.identifier)

                # Set parameters and save preset
                await host.set_parameter(instance.instance_id, "room_size", 0.9)
                await host.save_preset(instance.instance_id, "Test Preset")

                # Save presets to disk
                await host._save_presets()

                # Create new host and load presets
                host2 = WAMHost(config=wam_host_config)
                await host2.initialize()

                try:
                    host2.registry.register_wam(sample_wam_descriptor)

                    # Check if preset was loaded
                    presets = host2.registry.get_presets(
                        sample_wam_descriptor.identifier
                    )
                    assert len(presets) == 1
                    assert presets[0].name == "Test Preset"
                    assert presets[0].parameter_values["room_size"] == 0.9

                finally:
                    await host2.shutdown()

            finally:
                await host.shutdown()


class TestWAMHostErrorHandling:
    """Test WAM Host error handling."""

    @pytest.mark.asyncio
    async def test_uninitialized_host_operations(self, wam_host_config):
        """Test operations on uninitialized host."""
        host = WAMHost(config=wam_host_config)

        # Should raise error when not initialized
        with pytest.raises(WAMLoadError, match="WAM Host not initialized"):
            await host.load_wam("test.wam")

    @pytest.mark.asyncio
    async def test_parameter_operations_on_wrong_state(
        self, wam_host, sample_wam_descriptor
    ):
        """Test parameter operations on instances in wrong state."""
        wam_host.registry.register_wam(sample_wam_descriptor)
        instance = await wam_host.load_wam(sample_wam_descriptor.identifier)

        # Set instance to error state
        instance.state = WAMState.ERROR

        # Should raise error
        with pytest.raises(WAMParameterError, match="Instance not ready"):
            await wam_host.set_parameter(instance.instance_id, "room_size", 0.5)

    @pytest.mark.asyncio
    async def test_invalid_wam_descriptor_file(self, wam_host_config):
        """Test handling of invalid WAM descriptor files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create invalid JSON file
            invalid_file = Path(temp_dir) / "invalid.wam.json"
            with open(invalid_file, "w") as f:
                f.write("invalid json content")

            wam_host_config.wam_directories = [temp_dir]
            wam_host_config.auto_discover = True

            host = WAMHost(config=wam_host_config)

            # Should not crash, just log warning
            await host.initialize()

            try:
                # Should have no WAMs discovered
                assert host.registry.total_wams == 0

            finally:
                await host.shutdown()


if __name__ == "__main__":
    pytest.main([__file__])
