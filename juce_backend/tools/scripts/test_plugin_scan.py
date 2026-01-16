#!/usr/bin/env python3
"""
Test script to verify the real WebSocket server responds to plugin scan requests
"""

import asyncio
import websockets
import json
import sys

async def test_plugin_scan(host="localhost", port=8087):
    """Test plugin scanning functionality"""
    uri = f"ws://{host}:{port}"

    print(f"🧪 Testing Plugin Scan with REAL WebSocket Server")
    print("=" * 50)
    print(f"🔗 Connecting to: {uri}")

    try:
        # Connect to the WebSocket server
        async with websockets.connect(uri) as websocket:
            print("✅ Successfully connected to WebSocket server!")

            # Send plugin scan request
            scan_request = {
                "type": "scan_plugins",
                "paths": [
                    "/Library/Audio/Plug-Ins/VST3",
                    f"{sys.path.expanduser('~')}/Library/Audio/Plug-Ins/VST3"
                ],
                "timestamp": 1234567890
            }

            print(f"📤 Sending plugin scan request...")
            await websocket.send(json.dumps(scan_request))
            print(f"📤 Request sent: {json.dumps(scan_request, indent=2)}")

            # Wait for response (with timeout)
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                print(f"📥 Received response: {response}")

                # Parse response
                try:
                    response_data = json.loads(response)
                    print(f"✅ JSON response parsed successfully:")
                    print(f"   Type: {response_data.get('type', 'unknown')}")
                    print(f"   Total plugins found: {response_data.get('total_found', 0)}")

                    if 'plugins' in response_data and response_data['plugins']:
                        plugins = response_data['plugins']
                        print(f"   Plugin count in array: {len(plugins)}")

                        if len(plugins) > 0:
                            print("   First few plugins:")
                            for i, plugin in enumerate(plugins[:3]):  # Show first 3 plugins
                                print(f"     {i+1}. {plugin.get('name', 'Unknown')} ({plugin.get('type', 'Unknown')})")

                        print("✅ SUCCESS: Real plugin scanning functionality working!")
                        return True
                    else:
                        print("⚠️  No plugins array in response")
                        return False

                except json.JSONDecodeError:
                    print(f"⚠️  Response is not valid JSON: {response}")
                    return False

            except asyncio.TimeoutError:
                print("⚠️  No response received within 10 seconds")
                return False

    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False

async def main():
    """Main test function"""
    print("🎯 Testing REAL WebSocket Server Plugin Scanning")
    print("=" * 50)
    print("🔗 This verifies the server provides actual plugin scanning functionality")
    print()

    # Get port from command line argument
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8087

    # Test plugin scanning
    success = await test_plugin_scan(port=port)

    if success:
        print("\n✅ SUCCESS: Real WebSocket server with plugin scanning is working!")
        print("🎯 This proves the server can replace the stubbed JUCE backend!")
        print("🔗 Ready for Flutter integration with actual plugin discovery!")
    else:
        print("\n❌ FAILED: WebSocket server plugin scanning is not working")
        print("🚨 This indicates the server needs more work")

    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)