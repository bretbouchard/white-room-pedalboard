"""
Tests for Professional Mixing Console functionality.
"""

import os
import tempfile
from unittest.mock import patch

import numpy as np
import pytest

from src.audio_agent.engine.client import EngineClientStub

# For historical tests that patch DawDreamerEngine methods, alias the
# test-time DawDreamerEngine name to the EngineClientStub so existing
# patch.object(...) decorators continue to work without changing many tests.
DawDreamerEngine = EngineClientStub
from src.audio_agent.core.advanced_plugin_management import AdvancedPluginManager
from src.audio_agent.core.mixing_console import (
    AutomationPointType,
    ChannelError,
    ChannelType,
    MixingConsole,
)
from src.audio_agent.models.plugin import (
    PluginCategory,
    PluginFormat,
    PluginInstance,
    PluginMetadata,
    PluginParameter,
)


@pytest.fixture
def engine():
    """Create an EngineClient-compatible stub for testing."""
    return EngineClientStub()


@pytest.fixture
def plugin_manager(engine):
    """Create an AdvancedPluginManager for testing."""
    return AdvancedPluginManager(engine)


@pytest.fixture
def mixing_console(engine, plugin_manager):
    """Create a MixingConsole for testing."""
    return MixingConsole(engine, plugin_manager)


@pytest.fixture
def mock_plugin_metadata():
    """Create mock plugin metadata."""
    return PluginMetadata(
        name="Mock Plugin",
        manufacturer="Mock Manufacturer",
        version="1.0.0",
        unique_id="mock_plugin_123",
        category=PluginCategory.EQ,
        format=PluginFormat.VST3,
        input_channels=2,
        output_channels=2,
    )


class TestMixingConsoleInitialization:
    """Test mixing console initialization."""

    def test_default_channels(self, mixing_console):
        """Test that default channels are created."""
        # Check master channel
        master = mixing_console.get_channel("master")
        assert master is not None
        assert master.channel_id == "master"
        assert master.name == "Master"
        assert master.channel_type == ChannelType.MASTER

        # Check main bus
        main_bus = mixing_console.get_channel("main_bus")
        assert main_bus is not None
        assert main_bus.channel_id == "main_bus"
        assert main_bus.name == "Main Bus"
        assert main_bus.channel_type == ChannelType.BUS
        assert "master" in main_bus.output_channels


class TestChannelManagement:
    """Test channel management functionality."""

    def test_create_channel(self, mixing_console):
        """Test creating a channel."""
        # Create input channel
        channel = mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Verify channel
        assert channel.channel_id == "test_input"
        assert channel.name == "Test Input"
        assert channel.channel_type == ChannelType.INPUT
        assert channel.output_channels == ["main_bus"]

        # Verify channel is in console
        assert "test_input" in mixing_console._channels

        # Verify routing updated in main bus
        main_bus = mixing_console.get_channel("main_bus")
        assert "test_input" in main_bus.input_channels

    def test_create_channel_with_invalid_output(self, mixing_console):
        """Test creating a channel with invalid output."""
        # Attempt to create channel with invalid output
        with pytest.raises(ChannelError):
            mixing_console.create_channel(
                channel_id="test_input",
                name="Test Input",
                channel_type=ChannelType.INPUT,
                output_channels=["nonexistent"],
            )

    def test_update_channel(self, mixing_console):
        """Test updating a channel."""
        # Create channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Update channel
        updated_channel = mixing_console.update_channel(
            channel_id="test_input", name="Updated Input", gain=0.8, pan=0.5, mute=True
        )

        # Verify updates
        assert updated_channel.name == "Updated Input"
        assert updated_channel.gain == 0.8
        assert updated_channel.pan == 0.5
        assert updated_channel.mute is True

        # Verify channel in console is updated
        channel = mixing_console.get_channel("test_input")
        assert channel.name == "Updated Input"
        assert channel.gain == 0.8
        assert channel.pan == 0.5
        assert channel.mute is True

    def test_delete_channel(self, mixing_console):
        """Test deleting a channel."""
        # Create channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Delete channel
        result = mixing_console.delete_channel("test_input")

        # Verify result
        assert result is True
        assert "test_input" not in mixing_console._channels

        # Verify routing updated in main bus
        main_bus = mixing_console.get_channel("main_bus")
        assert "test_input" not in main_bus.input_channels

    def test_delete_master_channel(self, mixing_console):
        """Test that master channel cannot be deleted."""
        # Attempt to delete master channel
        with pytest.raises(ChannelError):
            mixing_console.delete_channel("master")


class TestSendReturnSystem:
    """Test send/return system functionality."""

    def test_create_send(self, mixing_console):
        """Test creating a send channel."""
        # Create send channel
        send = mixing_console.create_send(
            send_id="reverb_send", name="Reverb Send", return_channel="main_bus"
        )

        # Verify send channel
        assert send.channel_id == "reverb_send"
        assert send.name == "Reverb Send"
        assert send.channel_type == ChannelType.SEND
        assert send.output_channels == ["main_bus"]

        # Verify send is in console
        assert "reverb_send" in mixing_console._channels

    def test_add_send_to_channel(self, mixing_console):
        """Test adding a send to a channel."""
        # Create input channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Create send channel
        mixing_console.create_send(
            send_id="reverb_send", name="Reverb Send", return_channel="main_bus"
        )

        # Add send to channel
        result = mixing_console.add_send_to_channel(
            channel_id="test_input", send_id="reverb_send", level=0.5
        )

        # Verify result
        assert result is True

        # Verify send added to channel
        channel = mixing_console.get_channel("test_input")
        assert "reverb_send" in channel.sends
        assert channel.sends["reverb_send"] == 0.5

    def test_update_send_level(self, mixing_console):
        """Test updating a send level."""
        # Create input channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Create send channel
        mixing_console.create_send(
            send_id="reverb_send", name="Reverb Send", return_channel="main_bus"
        )

        # Add send to channel
        mixing_console.add_send_to_channel(
            channel_id="test_input", send_id="reverb_send", level=0.5
        )

        # Update send level
        result = mixing_console.update_send_level(
            channel_id="test_input", send_id="reverb_send", level=0.8
        )

        # Verify result
        assert result is True

        # Verify send level updated
        channel = mixing_console.get_channel("test_input")
        assert channel.sends["reverb_send"] == 0.8

    def test_remove_send_from_channel(self, mixing_console):
        """Test removing a send from a channel."""
        # Create input channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Create send channel
        mixing_console.create_send(
            send_id="reverb_send", name="Reverb Send", return_channel="main_bus"
        )

        # Add send to channel
        mixing_console.add_send_to_channel(
            channel_id="test_input", send_id="reverb_send", level=0.5
        )

        # Remove send
        result = mixing_console.remove_send_from_channel(
            channel_id="test_input", send_id="reverb_send"
        )

        # Verify result
        assert result is True

        # Verify send removed
        channel = mixing_console.get_channel("test_input")
        assert "reverb_send" not in channel.sends


class TestAutomation:
    """Test automation functionality."""

    @patch.object(AdvancedPluginManager, "_plugin_instances")
    def test_create_automation_lane(
        self, mock_plugin_instances, mixing_console, mock_plugin_metadata
    ):
        """Test creating an automation lane."""
        # Setup mock plugin instance
        plugin_instance = PluginInstance(
            instance_id="test_plugin",
            plugin_metadata=mock_plugin_metadata,
            parameters={
                "gain": PluginParameter(
                    name="gain",
                    display_name="Gain",
                    value=0.0,
                    min_value=-80.0,
                    max_value=24.0,
                    default_value=0.0,
                    unit="dB",
                )
            },
        )
        mock_plugin_instances.__getitem__.return_value = plugin_instance
        mock_plugin_instances.__contains__.return_value = True

        # Create input channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Create automation lane
        lane = mixing_console.create_automation_lane(
            parameter_id="gain",
            plugin_instance_id="test_plugin",
            channel_id="test_input",
        )

        # Verify lane
        assert lane.parameter_id == "gain"
        assert lane.plugin_instance_id == "test_plugin"
        assert lane.channel_id == "test_input"
        assert lane.enabled is True
        assert len(lane.points) == 0

        # Verify lane is in console
        lane_id = "test_input:test_plugin:gain"
        assert lane_id in mixing_console._automation_lanes

    @patch.object(AdvancedPluginManager, "_plugin_instances")
    def test_add_automation_point(
        self, mock_plugin_instances, mixing_console, mock_plugin_metadata
    ):
        """Test adding an automation point."""
        # Setup mock plugin instance
        plugin_instance = PluginInstance(
            instance_id="test_plugin",
            plugin_metadata=mock_plugin_metadata,
            parameters={
                "gain": PluginParameter(
                    name="gain",
                    display_name="Gain",
                    value=0.0,
                    min_value=-80.0,
                    max_value=24.0,
                    default_value=0.0,
                    unit="dB",
                )
            },
        )
        mock_plugin_instances.__getitem__.return_value = plugin_instance
        mock_plugin_instances.__contains__.return_value = True

        # Create input channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Create automation lane
        mixing_console.create_automation_lane(
            parameter_id="gain",
            plugin_instance_id="test_plugin",
            channel_id="test_input",
        )

        # Add automation point
        lane_id = "test_input:test_plugin:gain"
        point = mixing_console.add_automation_point(
            lane_id=lane_id,
            time_position=1.0,
            value=6.0,
            point_type=AutomationPointType.LINEAR,
        )

        # Verify point
        assert point.time_position == 1.0
        assert point.value == 6.0
        assert point.point_type == AutomationPointType.LINEAR

        # Verify point added to lane
        assert len(mixing_console._automation_lanes[lane_id].points) == 1
        assert mixing_console._automation_lanes[lane_id].points[0].time_position == 1.0
        assert mixing_console._automation_lanes[lane_id].points[0].value == 6.0

    @patch.object(AdvancedPluginManager, "_plugin_instances")
    def test_remove_automation_point(
        self, mock_plugin_instances, mixing_console, mock_plugin_metadata
    ):
        """Test removing an automation point."""
        # Setup mock plugin instance
        plugin_instance = PluginInstance(
            instance_id="test_plugin",
            plugin_metadata=mock_plugin_metadata,
            parameters={
                "gain": PluginParameter(
                    name="gain",
                    display_name="Gain",
                    value=0.0,
                    min_value=-80.0,
                    max_value=24.0,
                    default_value=0.0,
                    unit="dB",
                )
            },
        )
        mock_plugin_instances.__getitem__.return_value = plugin_instance
        mock_plugin_instances.__contains__.return_value = True

        # Create input channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Create automation lane
        mixing_console.create_automation_lane(
            parameter_id="gain",
            plugin_instance_id="test_plugin",
            channel_id="test_input",
        )

        # Add automation point
        lane_id = "test_input:test_plugin:gain"
        mixing_console.add_automation_point(
            lane_id=lane_id, time_position=1.0, value=6.0
        )

        # Remove automation point
        result = mixing_console.remove_automation_point(
            lane_id=lane_id, time_position=1.0
        )

        # Verify result
        assert result is True

        # Verify point removed
        assert len(mixing_console._automation_lanes[lane_id].points) == 0


class TestStateManagement:
    """Test state management functionality."""

    def test_save_load_state(self, mixing_console):
        """Test saving and loading console state."""
        # Create input channel
        mixing_console.create_channel(
            channel_id="test_input",
            name="Test Input",
            channel_type=ChannelType.INPUT,
            output_channels=["main_bus"],
        )

        # Create send channel
        mixing_console.create_send(
            send_id="reverb_send", name="Reverb Send", return_channel="main_bus"
        )

        # Add send to channel
        mixing_console.add_send_to_channel(
            channel_id="test_input", send_id="reverb_send", level=0.5
        )

        # Create temp file for state
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as temp_file:
            state_path = temp_file.name

        try:
            # Save state
            save_result = mixing_console.save_state(state_path)
            assert save_result is True

            # Verify file exists
            assert os.path.exists(state_path)

            # Create new console
            new_engine = DawDreamerEngine()
            new_plugin_manager = AdvancedPluginManager(new_engine)
            new_console = MixingConsole(new_engine, new_plugin_manager)

            # Load state
            load_result = new_console.load_state(state_path)
            assert load_result is True

            # Verify channels loaded
            assert "test_input" in new_console._channels
            assert "reverb_send" in new_console._channels
            assert "main_bus" in new_console._channels
            assert "master" in new_console._channels

            # Verify send loaded
            test_input = new_console.get_channel("test_input")
            assert "reverb_send" in test_input.sends
            assert test_input.sends["reverb_send"] == 0.5

        finally:
            # Clean up
            if os.path.exists(state_path):
                os.unlink(state_path)


class TestPlaybackAndRendering:
    """Test playback and rendering functionality."""

    @patch.object(DawDreamerEngine, "start_real_time_processing")
    def test_start_playback(self, mock_start, mixing_console):
        """Test starting playback."""
        # Start playback
        result = mixing_console.start_playback()

        # Verify result
        assert result is True
        assert mixing_console._playback_active is True

        # Verify engine method called
        mock_start.assert_called_once()

    @patch.object(DawDreamerEngine, "stop_real_time_processing")
    def test_stop_playback(self, mock_stop, mixing_console):
        """Test stopping playback."""
        # Set playback active
        mixing_console._playback_active = True

        # Stop playback
        result = mixing_console.stop_playback()

        # Verify result
        assert result is True
        assert mixing_console._playback_active is False

        # Verify engine method called
        mock_stop.assert_called_once()

    @patch.object(DawDreamerEngine, "render_audio")
    def test_render_audio(self, mock_render, mixing_console):
        """Test rendering audio."""
        # Setup mock
        mock_audio = np.zeros((2, 44100))
        mock_render.return_value = mock_audio

        # Render audio
        result = mixing_console.render_audio(duration=1.0)

        # Verify result
        assert result is not None
        assert result is mock_audio

        # Verify engine method called
        mock_render.assert_called_once_with(duration=1.0)

    @patch.object(MixingConsole, "render_audio")
    def test_export_audio(self, mock_render, mixing_console):
        """Test exporting audio."""
        # Setup mock
        mock_audio = np.zeros((2, 44100))
        mock_render.return_value = mock_audio

        # Create temp file for audio
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            audio_path = temp_file.name

        try:
            # Export audio
            result = mixing_console.export_audio(
                file_path=audio_path, duration=1.0, sample_rate=44100
            )

            # Verify result
            assert result is True

            # Verify render method called
            mock_render.assert_called_once_with(duration=1.0)

        finally:
            # Clean up
            if os.path.exists(audio_path):
                os.unlink(audio_path)
