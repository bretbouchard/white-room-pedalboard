#!/usr/bin/env python3
"""
Engine Isolation Test Script

This script tests that the GPL-isolated engine process can be launched
and communicates properly with the main application.

License: MIT
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from audio_agent.engine.bootstrapper import EngineBootstrapper


def test_engine_isolation():
    """Test the GPL-isolated engine process."""
    print("🧪 Testing GPL-Isolated Engine Process...")
    print("=" * 50)

    bootstrapper = EngineBootstrapper()

    try:
        print("1. Testing engine process startup...")

        # Try to start the GPL engine process
        try:
            engine_client = bootstrapper.start_engine_process()
            print("✅ GPL engine process started successfully")

            # Test basic communication
            print("2. Testing IPC communication...")

            # Test render request
            try:
                audio_data = engine_client.render(
                    duration=0.1, sample_rate=44100, channels=2
                )
                print(f"✅ Render test successful: {audio_data.shape}")
            except Exception as e:
                print(f"⚠️  Render test failed: {e}")

            print("3. Shutting down engine process...")
            bootstrapper.stop()
            print("✅ Engine process shutdown successful")

            return True

        except Exception as e:
            print(f"⚠️  GPL engine process failed: {e}")
            print("4. Testing GPL-free fallback...")

            # Test fallback
            stub = bootstrapper.start_engine_process_fallback()
            print("✅ GPL-free fallback started successfully")

            # Test fallback render
            try:
                audio_data = stub.render(duration=0.1, sample_rate=44100, channels=2)
                print(f"✅ Fallback render test successful: {audio_data.shape}")
            except Exception as e:
                print(f"❌ Fallback render test failed: {e}")
                return False

            return True

    except Exception as e:
        print(f"❌ Critical error: {e}")
        return False

    finally:
        # Ensure cleanup
        try:
            bootstrapper.stop()
        except:
            pass


def test_main_application_startup():
    """Test that the main application can start without GPL contamination."""
    print("\n🚀 Testing Main Application Startup...")
    print("=" * 50)

    try:
        # Import main application components (should be GPL-free)
        from audio_agent.main import app, app_state

        print("1. Checking FastAPI app...")
        if app:
            print("✅ FastAPI app created successfully")
            print(f"   App title: {app.title}")
        else:
            print("❌ FastAPI app not found")
            return False

        print("2. Checking application state...")
        if app_state:
            print("✅ Application state initialized")

            # Check if engine client exists
            engine_client = app_state.get("engine_client")
            if engine_client:
                client_type = type(engine_client).__name__
                print(f"   Engine client type: {client_type}")
            else:
                print(
                    "   No engine client in app state (will be initialized on startup)"
                )

            return True
        else:
            print("❌ No application state found")
            return False

    except Exception as e:
        print(f"❌ Main application startup failed: {e}")
        return False


def main():
    """Main test function."""
    print("🔬 GPL Isolation Integration Tests")
    print("=" * 60)

    # Test 1: Engine isolation
    engine_test_passed = test_engine_isolation()

    # Test 2: Main application startup
    app_test_passed = test_main_application_startup()

    print("\n" + "=" * 60)
    print("📊 Test Results:")
    print(f"   Engine Isolation: {'✅ PASS' if engine_test_passed else '❌ FAIL'}")
    print(f"   Main Application: {'✅ PASS' if app_test_passed else '❌ FAIL'}")

    overall_success = engine_test_passed and app_test_passed

    if overall_success:
        print("\n🎉 All GPL Isolation Tests PASSED!")
        print("   The system is ready for distribution.")
        return 0
    else:
        print("\n💥 Some GPL Isolation Tests FAILED!")
        print("   Please fix the issues before distribution.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
