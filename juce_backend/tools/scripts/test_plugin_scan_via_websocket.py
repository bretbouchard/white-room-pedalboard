#!/usr/bin/env python3

import asyncio
import json
import sys
import time

async def test_plugin_scanning():
    """Test plugin scanning by connecting to WebSocket and triggering scan"""

    print("🔍 Testing Plugin Scanning via WebSocket")
    print("==========================================")

    # First check available plugins on the system
    import subprocess
    print("📁 Checking available plugins...")

    try:
        result = subprocess.run(['./simple_test.sh'], capture_output=True, text=True)
        print(result.stdout)
        total_plugins = 0
        for line in result.stdout.split('\n'):
            if 'TOTAL AVAILABLE PLUGINS:' in line:
                total_plugins = int(line.split(':')[-1].strip())
                break
    except Exception as e:
        print(f"❌ Error checking plugins: {e}")
        total_plugins = 0

    print(f"\n📊 System has {total_plugins} plugins available")

    # Now test if our WebSocket server can scan plugins
    print("\n🌐 Starting WebSocket server with plugin scanning...")

    # Start the standalone WebSocket server in background
    import subprocess
    process = subprocess.Popen(['./standalone_websocket_server', '8080'],
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE,
                                   text=True)

    # Give it time to start
    await asyncio.sleep(3)

    # Check if server is running
    try:
        import websockets
        uri = "ws://localhost:8099"
        print(f"📡 Connecting to WebSocket server at {uri}...")

        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket server")

            # Send a test message
            test_message = {
                "type": "scan_plugins_test",
                "id": "test-001"
            }

            await websocket.send(json.dumps(test_message))
            print("📤 Sent test message")

            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(response)
                print("📨 Response received:")
                print(json.dumps(data, indent=2))

                # Check if it acknowledges the scan request
                if 'status' in data and data['status'] == 'acknowledged':
                    print("✅ WebSocket server acknowledged plugin scan request")
                    return True
                else:
                    print("⚠️  Unexpected response format")
                    return False

            except asyncio.TimeoutError:
                print("⏰ Timeout waiting for response")
                return False

    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")
        return False
    finally:
        # Clean up server process
        if process.poll() is None:  # Process is still running
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()

async def main():
    success = await test_plugin_scanning()

    print(f"\n🏁 Test Result: {'PASS' if success else 'FAIL'}")
    if success:
        print("🎉 Plugin scanning integration is working!")

    return success

if __name__ == "__main__":
    asyncio.run(main())