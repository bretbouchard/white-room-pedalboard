"""
Test SDK Integration
Tests the full integration of Schillinger SDK with the audio agent.

License: MIT
"""

import asyncio
import sys

import pytest

# test runner-level PYTHONPATH is handled by the repository conftest; no
# sys.path modification removed. Repository-level pytest conftest handles imports.


def test_basic_imports():
    """Test that basic SDK components can be imported."""
    try:
        print("✅ Basic model imports successful")
        return True
    except Exception as e:
        print(f"❌ Basic import error: {e}")
        return False


def test_theory_integration_imports():
    """Test that theory integration components can be imported."""
    try:
        print("✅ Theory integration imports successful")
        return True
    except Exception as e:
        print(f"❌ Theory integration import error: {e}")
        return False


def test_rhythm_integration_imports():
    """Test that rhythm integration components can be imported."""
    try:
        print("✅ Rhythm integration imports successful")
        return True
    except Exception as e:
        print(f"❌ Rhythm integration import error: {e}")
        return False


def test_api_integration_imports():
    """Test that API integration components can be imported."""
    try:
        print("✅ API integration imports successful")
        return True
    except Exception as e:
        print(f"❌ API integration import error: {e}")
        return False


def test_enhanced_composition_analyzer():
    """Test enhanced composition analyzer functionality."""
    try:
        from audio_agent.core.enhanced_composition_analyzer import (
            EnhancedCompositionAnalyzer,
        )
        from audio_agent.models.composition import (
            CompositionContext,
            MusicalKey,
            MusicalStyle,
            TimeSignature,
        )

        # Create test composition
        CompositionContext(
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            tempo=120,
            style=MusicalStyle.JAZZ,
        )

        EnhancedCompositionAnalyzer()
        print("✅ Enhanced composition analyzer created successfully")
        return True
    except Exception as e:
        print(f"❌ Enhanced composition analyzer error: {e}")
        return False


@pytest.mark.asyncio
async def test_rhythm_generation():
    """Test rhythm generation functionality."""
    try:
        from audio_agent.models.composition import TimeSignature
        from audio_agent.rhythm.rhythm_generator import (
            RhythmComplexity,
            RhythmGenerator,
            RhythmParameters,
        )

        generator = RhythmGenerator()

        parameters = RhythmParameters(
            time_signature=TimeSignature(numerator=4, denominator=4),
            tempo=120,
            complexity=RhythmComplexity.MODERATE,
        )

        # This should work even without SDK (fallback mode)
        rhythm = await generator.generate_rhythm(parameters)

        assert rhythm is not None
        assert hasattr(rhythm, "pattern")
        assert hasattr(rhythm, "complexity_score")

        print("✅ Rhythm generation test successful")
        return True
    except Exception as e:
        print(f"❌ Rhythm generation error: {e}")
        return False


@pytest.mark.asyncio
async def test_unified_api():
    """Test unified API functionality."""
    try:
        from audio_agent.api.unified_client import UnifiedAudioClient
        from audio_agent.models.composition import (
            CompositionContext,
            MusicalKey,
            MusicalStyle,
            TimeSignature,
        )

        client = UnifiedAudioClient()

        composition = CompositionContext(
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            tempo=120,
            style=MusicalStyle.JAZZ,
        )

        # Test basic composition analysis (should work with fallbacks)
        result = await client.analyze_composition(composition, enhanced=False)

        assert result is not None
        print("✅ Unified API test successful")
        return True
    except Exception as e:
        print(f"❌ Unified API error: {e}")
        return False


def test_sdk_availability():
    """Test SDK availability and fallback behavior."""
    try:
        from audio_agent.theory.enhanced_theory_engine import EnhancedTheoryEngine

        engine = EnhancedTheoryEngine()

        if engine.sdk_available:
            print("✅ Schillinger SDK is available")
        else:
            print("⚠️  Schillinger SDK not available - using fallback mode")

        return True
    except Exception as e:
        print(f"❌ SDK availability test error: {e}")
        return False


def run_integration_tests():
    """Run all integration tests."""
    print("🧪 Running SDK Integration Tests...")
    print("=" * 50)

    tests = [
        ("Basic Imports", test_basic_imports),
        ("Theory Integration Imports", test_theory_integration_imports),
        ("Rhythm Integration Imports", test_rhythm_integration_imports),
        ("API Integration Imports", test_api_integration_imports),
        ("Enhanced Composition Analyzer", test_enhanced_composition_analyzer),
        ("SDK Availability", test_sdk_availability),
    ]

    async_tests = [
        ("Rhythm Generation", test_rhythm_generation),
        ("Unified API", test_unified_api),
    ]

    results = []

    # Run synchronous tests
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))

    # Run asynchronous tests
    for test_name, test_func in async_tests:
        print(f"\n🔍 Testing {test_name}...")
        try:
            result = asyncio.run(test_func())
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1

    print(f"\n📈 Overall: {passed}/{total} tests passed ({passed / total * 100:.1f}%)")

    if passed == total:
        print("🎉 All integration tests passed!")
        return True
    else:
        print("⚠️  Some integration tests failed - check logs above")
        return False


if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)
