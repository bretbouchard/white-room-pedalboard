#!/usr/bin/env python3
"""
Quick test to verify real plugin scanning is working on JUCE server
"""

import asyncio
import websockets
import json
import time

async def test_plugin_scanning():
    try:
        print("🔌 Connecting to JUCE server on ws://localhost:8082...")

        async with websockets.connect("ws://localhost:8082") as websocket:
            print("✅ Connected to JUCE server!")

            # Test 1: Scan plugins
            print("\n📡 Testing plugin scanning...")
            scan_message = {
                "type": "scan_plugins",
                "request_id": int(time.time())
            }
            await websocket.send(json.dumps(scan_message))

            response = await asyncio.wait_for(websocket.recv(), timeout=30.0)
            data = json.loads(response)

            print(f"📋 Response type: {data.get('type')}")
            print(f"📊 Total plugins found: {data.get('total_plugins', 0)}")

            if data.get('type') == 'plugin_scan_complete':
                plugins = data.get('plugins', [])
                print(f"🎛️ Real plugins discovered: {len(plugins)}")

                if len(plugins) > 3:  # More than fake plugins
                    print("🎉 SUCCESS: Real plugin scanning is working!")

                    # Show first few plugins
                    for i, plugin in enumerate(plugins[:5]):
                        print(f"  {i+1}. {plugin.get('name', 'Unknown')} ({plugin.get('format', 'Unknown')})")
                        print(f"     Manufacturer: {plugin.get('manufacturer', 'Unknown')}")
                        print(f"     Category: {plugin.get('category', 'Unknown')}")

                    if len(plugins) > 5:
                        print(f"  ... and {len(plugins) - 5} more plugins")
                else:
                    print("❌ Still showing fake plugin data")

            elif data.get('type') == 'error':
                print(f"❌ Error: {data.get('message', 'Unknown error')}")

            else:
                print(f"⚠️ Unexpected response: {data}")

    except websockets.exceptions.ConnectionRefused:
        print("❌ Connection refused - make sure JUCE server is running on port 8082")
    except asyncio.TimeoutError:
        print("❌ Timeout - server may not be responding properly")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_plugin_scanning())