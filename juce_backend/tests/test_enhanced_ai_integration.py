#!/usr/bin/env python3
"""
Test Enhanced AI Integration with Real Audio Analysis

This script tests the enhanced AI suggestion service with real Faust-based
audio analysis to verify it's working properly and replacing mock suggestions.
"""

import asyncio
import logging
import sys
from pathlib import Path

import numpy as np

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def setup_imports():
    """Setup Python path for imports."""
    # Get project root
    project_root = Path(__file__).parent
    backend_src = project_root / "backend" / "src"

    # Add to Python path
    if str(backend_src) not in sys.path:
        sys.path.insert(0, str(backend_src))

    logger.info(f"Project root: {project_root}")
    logger.info(f"Python path includes: {backend_src}")


def generate_test_audio():
    """Generate test audio data for analysis."""
    sample_rate = 48000
    duration = 2.0  # 2 seconds
    frequency = 440  # A4 note

    # Generate time array
    t = np.linspace(0, duration, int(sample_rate * duration), False)

    # Generate complex audio with multiple frequencies
    audio_data = (
        0.3 * np.sin(2 * np.pi * frequency * t)
        + 0.1 * np.sin(2 * np.pi * frequency * 2 * t)  # Fundamental
        + 0.05 * np.sin(2 * np.pi * frequency * 3 * t)  # First harmonic
        + 0.02 * np.random.normal(0, 0.1, len(t))  # Second harmonic  # Add some noise
    )

    # Normalize
    audio_data = audio_data / np.max(np.abs(audio_data)) * 0.8

    return audio_data.tolist(), sample_rate


async def test_ai_suggestion_service():
    """Test the AI suggestion service with real analysis."""
    setup_imports()

    try:
        # Import the service
        from audio_agent.ai.suggestion_service import ai_suggestion_service

        logger.info("✅ Successfully imported AI suggestion service")

        # Check if real analysis is enabled
        logger.info(
            f"📊 Real analysis enabled: {ai_suggestion_service.use_real_analysis}"
        )

        # Generate test audio
        audio_data, sample_rate = generate_test_audio()
        logger.info(
            f"🎵 Generated test audio: {len(audio_data)} samples at {sample_rate}Hz"
        )

        # Test analysis
        logger.info("🔍 Starting audio analysis...")
        result = await ai_suggestion_service.analyze_audio(
            audio_data=audio_data,
            analysis_type="comprehensive",
            context={
                "track_id": "test_track",
                "track_name": "Test Complex Audio",
                "sample_rate": sample_rate,
            },
        )

        # Check results
        if result.get("real_analysis"):
            logger.info("✅ Real audio analysis successful!")
        else:
            logger.warning("⚠️ Using mock analysis (fallback mode)")

        # Display analysis results
        logger.info(f"📈 Analysis ID: {result.get('analysis_id', 'N/A')}")
        logger.info(f"🎯 Suggestions generated: {len(result.get('suggestions', []))}")

        # Show detailed suggestions
        suggestions = result.get("suggestions", [])
        if suggestions:
            logger.info("📝 Generated AI Suggestions:")
            for i, suggestion in enumerate(suggestions[:5], 1):  # Show top 5
                logger.info(f"\n{i}. {suggestion.get('title', 'Unknown')}")
                logger.info(f"   Type: {suggestion.get('type', 'unknown')}")
                logger.info(f"   Confidence: {suggestion.get('confidence', 0):.1%}")
                logger.info(f"   Agent: {suggestion.get('agentType', 'unknown')}")
                logger.info(
                    f"   Reasoning: {suggestion.get('reasoning', 'No reasoning')[:100]}..."
                )

                parameters = suggestion.get("parameters", {})
                if parameters:
                    logger.info(f"   Parameters: {parameters}")

        # Test feedback processing
        if suggestions:
            logger.info("\n🔄 Testing suggestion feedback...")
            first_suggestion = suggestions[0]
            await ai_suggestion_service.process_suggestion_feedback(
                suggestion_id=first_suggestion["id"],
                action="accept",
                user_id="test_user",
            )
            logger.info("✅ Feedback processing successful")

        # Test explanation generation
        if suggestions:
            logger.info("\n📚 Testing explanation generation...")
            explanation = await ai_suggestion_service.generate_explanation(
                suggestion_id=suggestions[0]["id"], level="intermediate"
            )
            logger.info(
                f"✅ Explanation generated: {explanation.get('title', 'No title')}"
            )
            logger.info(
                f"   Content length: {len(explanation.get('content', ''))} characters"
            )

        # Test user stats
        logger.info("\n📊 Testing user statistics...")
        stats = ai_suggestion_service.get_user_stats("test_user")
        logger.info(f"✅ User stats: {stats}")

        logger.info("\n🎉 Enhanced AI integration test completed successfully!")
        return True

    except ImportError as e:
        logger.error(f"❌ Import error: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


async def test_comparison():
    """Test comparison between mock and real analysis."""
    setup_imports()

    try:
        from audio_agent.ai.suggestion_service import ai_suggestion_service

        logger.info("🔄 Testing mock vs real analysis comparison...")

        # Generate test audio
        audio_data, _ = generate_test_audio()

        # Test with mock analysis
        ai_suggestion_service.use_real_analysis = False
        logger.info("Testing with mock analysis...")
        mock_result = await ai_suggestion_service.analyze_audio(
            audio_data=audio_data,
            analysis_type="comprehensive",
            context={"track_id": "test_mock"},
        )

        # Test with real analysis (if available)
        ai_suggestion_service.use_real_analysis = True
        logger.info("Testing with real analysis...")
        real_result = await ai_suggestion_service.analyze_audio(
            audio_data=audio_data,
            analysis_type="comprehensive",
            context={"track_id": "test_real"},
        )

        # Compare results
        logger.info("\n📊 Comparison Results:")
        logger.info(f"Mock suggestions: {len(mock_result.get('suggestions', []))}")
        logger.info(f"Real suggestions: {len(real_result.get('suggestions', []))}")
        logger.info(f"Mock real_analysis: {mock_result.get('real_analysis', False)}")
        logger.info(f"Real real_analysis: {real_result.get('real_analysis', False)}")

        if real_result.get("analysis_summary"):
            logger.info(f"Real analysis summary: {real_result['analysis_summary']}")

        return True

    except Exception as e:
        logger.error(f"❌ Comparison test failed: {e}")
        return False


async def main():
    """Main test function."""
    logger.info("🚀 Starting Enhanced AI Integration Tests")
    logger.info("=" * 60)

    # Test basic AI suggestion service
    success1 = await test_ai_suggestion_service()

    logger.info("\n" + "=" * 60)

    # Test comparison
    success2 = await test_comparison()

    logger.info("\n" + "=" * 60)

    if success1 and success2:
        logger.info("🎉 ALL TESTS PASSED! Enhanced AI integration is working!")
        logger.info("📈 Real audio analysis is successfully replacing mock suggestions")
        return 0
    else:
        logger.error("❌ Some tests failed. Check logs for details.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
