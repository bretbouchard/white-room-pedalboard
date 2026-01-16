#!/usr/bin/env python3

import asyncio
import websockets
import json
import sys

async def test_plugin_scanning():
    """Test the JUCE backend plugin scanning via WebSocket"""

    uri = "ws://localhost:8080"

    try:
        print("🔍 Connecting to JUCE backend WebSocket...")
        async with websockets.connect(uri) as websocket:
            print("✅ Connected to WebSocket server")

            # Send plugin scan request
            request = {
                "type": "scan_plugins",
                "id": "test-scan"
            }

            print("📡 Sending plugin scan request...")
            await websocket.send(json.dumps(request))

            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                data = json.loads(response)

                print("\n📊 PLUGIN SCAN RESULTS:")
                print(f"   Response type: {data.get('type', 'unknown')}")
                print(f"   Request ID: {data.get('id', 'unknown')}")

                if 'plugins' in data:
                    plugins = data['plugins']
                    print(f"   Total plugins found: {len(plugins)}")

                    print("\n🎵 FIRST 10 PLUGINS:")
                    for i, plugin in enumerate(plugins[:10]):
                        print(f"   {i+1}. {plugin.get('name', 'Unknown')} ({plugin.get('format', 'Unknown')})")

                    if len(plugins) > 10:
                        print(f"   ... and {len(plugins) - 10} more plugins")

                    # Check if we found the expected plugins
                    expected_plugins = ["Airwindows Consolidated", "AmpliTube 5", "Choral", "Dexed"]
                    found_plugins = [p.get('name') for p in plugins]

                    print(f"\n🎯 EXPECTED PLUGIN CHECK:")
                    for expected in expected_plugins:
                        if expected in found_plugins:
                            print(f"   ✅ {expected}")
                        else:
                            print(f"   ❌ {expected} - NOT FOUND")

                    # Success determination
                    if len(plugins) >= 4:
                        print(f"\n🎉 SUCCESS: Found {len(plugins)} plugins! Plugin scanning is working.")
                        return True
                    else:
                        print(f"\n⚠️  PARTIAL: Only {len(plugins)} plugins found (expected 4+)")
                        return False

                elif 'error' in data:
                    print(f"❌ Error from server: {data['error']}")
                    return False

                else:
                    print(f"⚠️  Unexpected response format: {data}")
                    return False

            except asyncio.TimeoutError:
                print("❌ Timeout waiting for plugin scan response")
                return False

    except websockets.ConnectionClosed:
        print("❌ Connection to WebSocket server closed")
        return False
    except websockets.InvalidURI:
        print("❌ Invalid WebSocket URI")
        return False
    except websockets.InvalidHandshake:
        print("❌ WebSocket handshake failed - server may not be running")
        return False
    except ConnectionRefusedError:
        print("❌ Connection refused - WebSocket server may not be running")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

async def main():
    print("🔍 JUCE Backend Plugin Scanning Test")
    print("=====================================")

    success = await test_plugin_scanning()

    print(f"\n🏁 TEST RESULT: {'PASS' if success else 'FAIL'}")
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())