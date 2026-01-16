#!/usr/bin/env python3
"""
Test client for standalone WebSocket server
"""
import asyncio
import websockets
import json

async def test_standalone_server():
    uri = "ws://localhost:8092"

    try:
        print(f"🔗 Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("✅ Connected successfully!")

            # Send test message
            test_message = {"type": "test", "message": "Hello from Python client!"}
            await websocket.send(json.dumps(test_message))
            print(f"📤 Sent: {test_message}")

            # Receive response
            response = await websocket.recv()
            print(f"📥 Received: {response}")

            # Send plugin scan request
            scan_request = {"type": "plugin_scan", "path": "/Applications"}
            await websocket.send(json.dumps(scan_request))
            print(f"📤 Sent: {scan_request}")

            # Receive scan response
            scan_response = await websocket.recv()
            print(f"📥 Received: {scan_response}")

    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

    print("✅ Test completed successfully!")
    return True

if __name__ == "__main__":
    asyncio.run(test_standalone_server())