"""Tests for Unified Plugin Registry."""

from unittest.mock import AsyncMock, patch

import pytest

from src.audio_agent.core.plugin_database import PluginDatabase
from src.audio_agent.core.unified_plugin_registry import (
    PluginSearchFilter,
    PluginType,
    UnifiedPluginInfo,
    UnifiedPluginRegistry,
)
from src.audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata
from src.audio_agent.models.wam import (
    WAMDescriptor,
    WAMParameter,
    WAMParameterType,
    WAMRegistry,
)


@pytest.fixture
def sample_native_plugin():
    """Create sample native plugin metadata."""
    return PluginMetadata(
        name="Native Reverb",
        manufacturer="Audio Corp",
        version="2.1.0",
        unique_id="audio_corp_reverb_v2",
        category=PluginCategory.REVERB,
        format=PluginFormat.VST3,
        input_channels=2,
        output_channels=2,
        latency_samples=128,
        cpu_usage_estimate=0.3,
        quality_rating=0.8,
        tags=["reverb", "spatial", "hall"],
    )


@pytest.fixture
def sample_wam_descriptor():
    """Create sample WAM descriptor."""
    return WAMDescriptor(
        name="Web Delay",
        vendor="WebAudio Inc",
        version="1.5.0",
        sdk_version="2.0.0",
        identifier="com.webaudio.delay",
        is_instrument=False,
        is_effect=True,
        audio_input=2,
        audio_output=2,
        midi_input=False,
        midi_output=False,
        parameters=[
            WAMParameter(
                id="delay_time",
                label="Delay Time",
                type=WAMParameterType.FLOAT,
                default_value=0.25,
                min_value=0.0,
                max_value=2.0,
                current_value=0.25,
                unit="s",
            )
        ],
        description="High-quality digital delay",
        keywords=["delay", "echo", "feedback"],
    )


@pytest.fixture
async def mock_plugin_database():
    """Create mock plugin database."""
    db = AsyncMock(spec=PluginDatabase)
    db.get_all_plugins = AsyncMock(return_value=[])
    return db


@pytest.fixture
def mock_wam_registry():
    """Create mock WAM registry."""
    registry = AsyncMock(spec=WAMRegistry)
    registry.available_wams = {}
    return registry


@pytest.fixture
async def unified_registry(mock_plugin_database, mock_wam_registry):
    """Create unified plugin registry for testing."""
    with patch("asyncio.create_task"):  # Prevent automatic sync during init
        registry = UnifiedPluginRegistry(
            plugin_database=mock_plugin_database, wam_registry=mock_wam_registry
        )
    return registry


class TestUnifiedPluginInfo:
    """Test unified plugin information model."""

    def test_plugin_info_creation(self):
        """Test creating unified plugin info."""
        info = UnifiedPluginInfo(
            plugin_id="test_plugin",
            name="Test Plugin",
            vendor="Test Vendor",
            version="1.0.0",
            plugin_type=PluginType.NATIVE,
            format=PluginFormat.VST3,
            category=PluginCategory.EQ,
            input_channels=2,
            output_channels=2,
        )

        assert info.plugin_id == "test_plugin"
        assert info.name == "Test Plugin"
        assert info.plugin_type == PluginType.NATIVE
        assert info.format == PluginFormat.VST3
        assert info.compatibility_score > 0.0

    def test_plugin_info_validation(self):
        """Test plugin info validation."""
        # Valid native plugin
        info = UnifiedPluginInfo(
            plugin_id="native_test",
            name="Native Test",
            vendor="Test",
            version="1.0",
            plugin_type=PluginType.NATIVE,
            format=PluginFormat.VST3,
            category=PluginCategory.EQ,
            input_channels=2,
            output_channels=2,
        )
        assert info.plugin_type == PluginType.NATIVE

        # Invalid: Native plugin with WAM format
        with pytest.raises(ValueError, match="Native plugin cannot have WAM format"):
            UnifiedPluginInfo(
                plugin_id="invalid_test",
                name="Invalid Test",
                vendor="Test",
                version="1.0",
                plugin_type=PluginType.NATIVE,
                format=PluginFormat.WAM,
                category=PluginCategory.EQ,
                input_channels=2,
                output_channels=2,
            )

        # Invalid: WAM plugin with non-WAM format
        with pytest.raises(ValueError, match="WAM plugin must have WAM format"):
            UnifiedPluginInfo(
                plugin_id="invalid_wam",
                name="Invalid WAM",
                vendor="Test",
                version="1.0",
                plugin_type=PluginType.WAM,
                format=PluginFormat.VST3,
                category=PluginCategory.EQ,
                input_channels=2,
                output_channels=2,
            )

    def test_compatibility_score_calculation(self):
        """Test compatibility score calculation."""
        # High quality, low CPU usage
        high_quality = UnifiedPluginInfo(
            plugin_id="high_quality",
            name="High Quality",
            vendor="Test",
            version="1.0",
            plugin_type=PluginType.NATIVE,
            format=PluginFormat.VST3,
            category=PluginCategory.EQ,
            input_channels=2,
            output_channels=2,
            quality_rating=0.9,
            cpu_usage_estimate=0.1,
        )

        # Low quality, high CPU usage
        low_quality = UnifiedPluginInfo(
            plugin_id="low_quality",
            name="Low Quality",
            vendor="Test",
            version="1.0",
            plugin_type=PluginType.NATIVE,
            format=PluginFormat.VST3,
            category=PluginCategory.EQ,
            input_channels=2,
            output_channels=2,
            quality_rating=0.2,
            cpu_usage_estimate=0.8,
        )

        assert high_quality.compatibility_score > low_quality.compatibility_score


class TestPluginSearchFilter:
    """Test plugin search filter model."""

    def test_empty_filter(self):
        """Test empty search filter."""
        filter_obj = PluginSearchFilter()

        assert filter_obj.query is None
        assert filter_obj.plugin_types is None
        assert filter_obj.categories is None

    def test_filter_with_criteria(self):
        """Test search filter with criteria."""
        filter_obj = PluginSearchFilter(
            query="reverb",
            plugin_types=[PluginType.NATIVE],
            categories=[PluginCategory.REVERB, PluginCategory.DELAY],
            instruments_only=False,
            min_quality_rating=0.7,
        )

        assert filter_obj.query == "reverb"
        assert PluginType.NATIVE in filter_obj.plugin_types
        assert PluginCategory.REVERB in filter_obj.categories
        assert filter_obj.min_quality_rating == 0.7


class TestUnifiedPluginRegistry:
    """Test unified plugin registry functionality."""

    @pytest.mark.asyncio
    async def test_registry_initialization(self, unified_registry):
        """Test registry initialization."""
        assert unified_registry.plugin_database is not None
        assert unified_registry.wam_registry is not None
        assert len(unified_registry.unified_plugins) == 0
        assert not unified_registry.sync_in_progress

    @pytest.mark.asyncio
    async def test_sync_native_plugins(self, unified_registry, sample_native_plugin):
        """Test synchronizing native plugins."""
        # Mock plugin database to return sample plugin
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]

        # Sync native plugins
        await unified_registry._sync_native_plugins()

        # Check that plugin was added
        assert len(unified_registry.unified_plugins) == 1

        # Check plugin conversion
        plugin_id = f"native_{sample_native_plugin.unique_id}"
        assert plugin_id in unified_registry.unified_plugins

        unified_info = unified_registry.unified_plugins[plugin_id]
        assert unified_info.name == sample_native_plugin.name
        assert unified_info.plugin_type == PluginType.NATIVE
        assert unified_info.format == sample_native_plugin.format
        assert unified_info.native_metadata == sample_native_plugin

    @pytest.mark.asyncio
    async def test_sync_wam_plugins(self, unified_registry, sample_wam_descriptor):
        """Test synchronizing WAM plugins."""
        # Mock WAM registry to return sample descriptor
        unified_registry.wam_registry.available_wams = {
            sample_wam_descriptor.identifier: sample_wam_descriptor
        }

        # Sync WAM plugins
        await unified_registry._sync_wam_plugins()

        # Check that plugin was added
        assert len(unified_registry.unified_plugins) == 1

        # Check plugin conversion
        plugin_id = f"wam_{sample_wam_descriptor.identifier}"
        assert plugin_id in unified_registry.unified_plugins

        unified_info = unified_registry.unified_plugins[plugin_id]
        assert unified_info.name == sample_wam_descriptor.name
        assert unified_info.plugin_type == PluginType.WAM
        assert unified_info.format == PluginFormat.WAM
        assert unified_info.wam_descriptor == sample_wam_descriptor

    @pytest.mark.asyncio
    async def test_full_sync(
        self, unified_registry, sample_native_plugin, sample_wam_descriptor
    ):
        """Test full registry synchronization."""
        # Setup mock data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        unified_registry.wam_registry.available_wams = {
            sample_wam_descriptor.identifier: sample_wam_descriptor
        }

        # Perform full sync
        success = await unified_registry.sync_registries()

        assert success
        assert len(unified_registry.unified_plugins) == 2
        assert not unified_registry.sync_in_progress

        # Check both plugins are present
        native_id = f"native_{sample_native_plugin.unique_id}"
        wam_id = f"wam_{sample_wam_descriptor.identifier}"

        assert native_id in unified_registry.unified_plugins
        assert wam_id in unified_registry.unified_plugins

    @pytest.mark.asyncio
    async def test_search_indices_building(
        self, unified_registry, sample_native_plugin
    ):
        """Test search indices building."""
        # Add sample plugin
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        # Check category index
        assert PluginCategory.REVERB in unified_registry.category_index
        reverb_plugins = unified_registry.category_index[PluginCategory.REVERB]
        assert len(reverb_plugins) == 1

        # Check vendor index
        vendor_key = sample_native_plugin.manufacturer.lower()
        assert vendor_key in unified_registry.vendor_index

        # Check keyword index
        assert "reverb" in unified_registry.keyword_index
        assert "spatial" in unified_registry.keyword_index

    @pytest.mark.asyncio
    async def test_search_plugins_no_filter(
        self, unified_registry, sample_native_plugin
    ):
        """Test searching plugins without filter."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        # Search without filter
        results = unified_registry.search_plugins()

        assert len(results) == 1
        assert results[0].name == sample_native_plugin.name

    @pytest.mark.asyncio
    async def test_search_plugins_with_text_query(
        self, unified_registry, sample_native_plugin
    ):
        """Test searching plugins with text query."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        # Search with matching query
        filter_obj = PluginSearchFilter(query="reverb")
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 1
        assert results[0].name == sample_native_plugin.name

        # Search with non-matching query
        filter_obj = PluginSearchFilter(query="synthesizer")
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_search_plugins_with_category_filter(
        self, unified_registry, sample_native_plugin
    ):
        """Test searching plugins with category filter."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        # Search with matching category
        filter_obj = PluginSearchFilter(categories=[PluginCategory.REVERB])
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 1

        # Search with non-matching category
        filter_obj = PluginSearchFilter(categories=[PluginCategory.COMPRESSOR])
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_search_plugins_with_type_filter(
        self, unified_registry, sample_native_plugin, sample_wam_descriptor
    ):
        """Test searching plugins with type filter."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        unified_registry.wam_registry.available_wams = {
            sample_wam_descriptor.identifier: sample_wam_descriptor
        }
        await unified_registry.sync_registries()

        # Search for native plugins only
        filter_obj = PluginSearchFilter(plugin_types=[PluginType.NATIVE])
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 1
        assert results[0].plugin_type == PluginType.NATIVE

        # Search for WAM plugins only
        filter_obj = PluginSearchFilter(plugin_types=[PluginType.WAM])
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 1
        assert results[0].plugin_type == PluginType.WAM

    @pytest.mark.asyncio
    async def test_search_plugins_with_quality_filter(
        self, unified_registry, sample_native_plugin
    ):
        """Test searching plugins with quality filter."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        # Search with quality filter that should match
        filter_obj = PluginSearchFilter(min_quality_rating=0.5)
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 1

        # Search with quality filter that should not match
        filter_obj = PluginSearchFilter(min_quality_rating=0.9)
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_get_plugin_by_id(self, unified_registry, sample_native_plugin):
        """Test getting plugin by ID."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        plugin_id = f"native_{sample_native_plugin.unique_id}"

        # Get existing plugin
        plugin = unified_registry.get_plugin_by_id(plugin_id)
        assert plugin is not None
        assert plugin.name == sample_native_plugin.name

        # Get non-existing plugin
        plugin = unified_registry.get_plugin_by_id("nonexistent")
        assert plugin is None

    @pytest.mark.asyncio
    async def test_get_plugins_by_category(
        self, unified_registry, sample_native_plugin
    ):
        """Test getting plugins by category."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        # Get plugins in existing category
        plugins = unified_registry.get_plugins_by_category(PluginCategory.REVERB)
        assert len(plugins) == 1
        assert plugins[0].name == sample_native_plugin.name

        # Get plugins in non-existing category
        plugins = unified_registry.get_plugins_by_category(PluginCategory.COMPRESSOR)
        assert len(plugins) == 0

    @pytest.mark.asyncio
    async def test_get_plugins_by_vendor(self, unified_registry, sample_native_plugin):
        """Test getting plugins by vendor."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        # Get plugins from existing vendor
        plugins = unified_registry.get_plugins_by_vendor(
            sample_native_plugin.manufacturer
        )
        assert len(plugins) == 1
        assert plugins[0].name == sample_native_plugin.name

        # Get plugins from non-existing vendor
        plugins = unified_registry.get_plugins_by_vendor("Nonexistent Vendor")
        assert len(plugins) == 0

    @pytest.mark.asyncio
    async def test_check_plugin_compatibility(
        self, unified_registry, sample_native_plugin
    ):
        """Test plugin compatibility checking."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        await unified_registry.sync_registries()

        plugin_id = f"native_{sample_native_plugin.unique_id}"

        # Check compatibility with matching requirements
        compatibility = unified_registry.check_plugin_compatibility(
            plugin_id,
            target_channels=(2, 2),
            max_cpu_usage=0.5,
            required_format=PluginFormat.VST3,
        )

        assert compatibility.is_compatible
        assert compatibility.format_compatible
        assert compatibility.channel_compatible
        assert compatibility.performance_acceptable
        assert compatibility.compatibility_score > 0.5

        # Check compatibility with mismatched requirements
        compatibility = unified_registry.check_plugin_compatibility(
            plugin_id,
            target_channels=(1, 1),  # Plugin needs 2 channels
            max_cpu_usage=0.1,  # Plugin uses 0.3
            required_format=PluginFormat.AU,  # Plugin is VST3
        )

        assert not compatibility.is_compatible
        assert not compatibility.format_compatible
        assert not compatibility.channel_compatible
        assert not compatibility.performance_acceptable
        assert len(compatibility.issues) > 0

    @pytest.mark.asyncio
    async def test_check_nonexistent_plugin_compatibility(self, unified_registry):
        """Test compatibility check for nonexistent plugin."""
        compatibility = unified_registry.check_plugin_compatibility("nonexistent")

        assert not compatibility.is_compatible
        assert compatibility.compatibility_score == 0.0
        assert "Plugin not found" in compatibility.issues

    @pytest.mark.asyncio
    async def test_get_registry_stats(
        self, unified_registry, sample_native_plugin, sample_wam_descriptor
    ):
        """Test getting registry statistics."""
        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            sample_native_plugin
        ]
        unified_registry.wam_registry.available_wams = {
            sample_wam_descriptor.identifier: sample_wam_descriptor
        }
        await unified_registry.sync_registries()

        stats = unified_registry.get_registry_stats()

        assert stats["total_plugins"] == 2
        assert stats["native_plugins"] == 1
        assert stats["wam_plugins"] == 1
        assert stats["effects"] >= 1  # Both are effects
        assert "categories" in stats
        assert "formats" in stats
        assert "last_sync" in stats

    @pytest.mark.asyncio
    async def test_wam_category_inference(self, unified_registry):
        """Test WAM category inference from name."""
        # Create WAM descriptors with different names
        reverb_wam = WAMDescriptor(
            name="Amazing Reverb",
            vendor="Test",
            version="1.0",
            sdk_version="2.0",
            identifier="test.reverb",
            is_instrument=False,
            is_effect=True,
            audio_input=2,
            audio_output=2,
        )

        delay_wam = WAMDescriptor(
            name="Digital Delay",
            vendor="Test",
            version="1.0",
            sdk_version="2.0",
            identifier="test.delay",
            is_instrument=False,
            is_effect=True,
            audio_input=2,
            audio_output=2,
        )

        # Convert to unified format
        reverb_info = unified_registry._convert_wam_to_unified(reverb_wam)
        delay_info = unified_registry._convert_wam_to_unified(delay_wam)

        # Check category inference
        assert reverb_info.category == PluginCategory.REVERB
        assert delay_info.category == PluginCategory.DELAY

    @pytest.mark.asyncio
    async def test_search_ranking(self, unified_registry):
        """Test search result ranking."""
        # Create plugins with different relevance to query
        exact_match = PluginMetadata(
            name="Reverb",  # Exact match
            manufacturer="Test",
            version="1.0",
            unique_id="exact_reverb",
            category=PluginCategory.REVERB,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            quality_rating=0.5,
        )

        partial_match = PluginMetadata(
            name="Hall Reverb Pro",  # Partial match
            manufacturer="Test",
            version="1.0",
            unique_id="hall_reverb",
            category=PluginCategory.REVERB,
            format=PluginFormat.VST3,
            input_channels=2,
            output_channels=2,
            quality_rating=0.8,
        )

        # Setup data
        unified_registry.plugin_database.get_all_plugins.return_value = [
            exact_match,
            partial_match,
        ]
        await unified_registry.sync_registries()

        # Search with query
        filter_obj = PluginSearchFilter(query="reverb")
        results = unified_registry.search_plugins(filter_obj)

        assert len(results) == 2
        # Exact match should rank higher despite lower quality
        assert results[0].name == "Reverb"
        assert results[1].name == "Hall Reverb Pro"


if __name__ == "__main__":
    pytest.main([__file__])
