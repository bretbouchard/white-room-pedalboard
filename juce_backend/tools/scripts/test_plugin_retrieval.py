#!/usr/bin/env python3
"""
Test plugin retrieval from Python server
"""

import asyncio
import websockets
import json

async def test_plugin_retrieval():
    try:
        print("🔌 Connecting to Python server on ws://localhost:8085...")

        async with websockets.connect("ws://localhost:8085") as websocket:
            print("✅ Connected!")

            # Test get_plugin_list
            print("\n📡 Requesting plugin list...")
            message = {
                "command": "get_plugin_list",
                "parameters": {}
            }
            await websocket.send(json.dumps(message))

            response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            data = json.loads(response)

            print(f"📋 Response type: {data.get('type')}")

            if data.get('type') == 'command_response' and data.get('command') == 'get_plugin_list':
                plugins = data.get('plugins', [])
                print(f"🎛️ Plugins found: {len(plugins)}")

                if len(plugins) > 3:  # More than fake plugins
                    print("🎉 SUCCESS: More than fake plugins found!")

                    # Show first few plugins
                    for i, plugin in enumerate(plugins[:5]):
                        print(f"  {i+1}. {plugin.get('name', 'Unknown')}")
                        print(f"     Manufacturer: {plugin.get('manufacturer', 'Unknown')}")
                        print(f"     Category: {plugin.get('category', 'Unknown')}")
                        print(f"     Format: {plugin.get('format', 'Unknown')}")

                    if len(plugins) > 5:
                        print(f"  ... and {len(plugins) - 5} more plugins")

                    print(f"\n📊 TOTAL: {len(plugins)} plugins discovered")
                else:
                    print("❌ Still showing limited/fake plugin data")
                    print("Plugins received:")
                    for plugin in plugins:
                        print(f"  - {plugin}")

            elif data.get('type') == 'error':
                print(f"❌ Error: {data.get('message', 'Unknown error')}")

            else:
                print(f"⚠️ Unexpected response: {data}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_plugin_retrieval())