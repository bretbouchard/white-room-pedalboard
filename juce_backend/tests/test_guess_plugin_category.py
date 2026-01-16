from src.audio_agent.core import plugin_database as pdb_mod
from src.audio_agent.models.plugin import PluginCategory

# Tests call a protected helper on purpose to validate guessing heuristics.
# pylint: disable=protected-access


def test_guess_category_manufacturer_specialization():
    cfg = pdb_mod.PluginDatabaseConfig(database_path=":memory:")
    pdb = pdb_mod.PluginDatabase(cfg)

    # Manufacturer should steer the category
    cat = pdb._guess_plugin_category("Pro-Q 3", manufacturer="FabFilter")
    assert cat == PluginCategory.EQ


def test_guess_category_keyword_based():
    cfg = pdb_mod.PluginDatabaseConfig(database_path=":memory:")
    pdb = pdb_mod.PluginDatabase(cfg)

    cat = pdb._guess_plugin_category("Vintage Tape Saturator")
    assert cat == PluginCategory.SATURATION


def test_guess_category_default_to_utility():
    cfg = pdb_mod.PluginDatabaseConfig(database_path=":memory:")
    pdb = pdb_mod.PluginDatabase(cfg)

    cat = pdb._guess_plugin_category("Some Unknown Thing")
    assert cat == PluginCategory.UTILITY
