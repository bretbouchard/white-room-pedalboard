#!/usr/bin/env python3
"""
Test plugin retrieval with proper message handling
"""

import asyncio
import websockets
import json

async def test_plugin_list():
    try:
        print("🔌 Connecting to Python server on ws://localhost:8085...")

        async with websockets.connect("ws://localhost:8085") as websocket:
            print("✅ Connected!")

            # Wait for initial connection status message
            initial_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"📋 Initial message: {initial_response}")

            # Test get_plugin_list
            print("\n📡 Requesting plugin list...")
            message = {
                "command": "get_plugin_list",
                "parameters": {}
            }
            await websocket.send(json.dumps(message))

            # Wait for the command response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)

            print(f"📋 Response type: {data.get('type')}")
            print(f"📋 Command: {data.get('command')}")

            if data.get('type') == 'command_response' and data.get('command') == 'get_plugin_list':
                plugins = data.get('plugins', [])
                total_plugins = data.get('total_plugins', 0)
                print(f"🎛️ Plugins found: {total_plugins}")

                if total_plugins > 3:  # More than fake plugins
                    print("🎉 SUCCESS: More than 3 plugins found!")

                    # Show first few plugins
                    for i, plugin in enumerate(plugins[:5]):
                        print(f"  {i+1}. {plugin.get('name', 'Unknown')} ({plugin.get('format', 'Unknown')})")
                        print(f"     Manufacturer: {plugin.get('manufacturer', 'Unknown')}")
                        print(f"     Category: {plugin.get('category', 'Unknown')}")
                        print(f"     Type: {plugin.get('type', 'Unknown')}")

                    if len(plugins) > 5:
                        print(f"  ... and {len(plugins) - 5} more plugins")

                    print(f"\n📊 TOTAL: {total_plugins} plugins discovered")
                    return True
                else:
                    print("❌ Still showing limited/fake plugin data")
                    return False

            elif data.get('type') == 'error':
                print(f"❌ Error: {data.get('message', 'Unknown error')}")
                return False

            else:
                print(f"⚠️ Unexpected response: {data}")
                return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_plugin_list())
    if success:
        print("\n✅ Plugin retrieval test PASSED!")
    else:
        print("\n❌ Plugin retrieval test FAILED!")