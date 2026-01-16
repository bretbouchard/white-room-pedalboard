#!/usr/bin/env python3
"""
Simple WebSocket connection test
"""

import asyncio
import websockets
import json

async def test_connection():
    try:
        print("🔌 Connecting to Python server on ws://localhost:8085...")

        async with websockets.connect("ws://localhost:8085") as websocket:
            print("✅ Connected to JUCE server!")

            # Test simple heartbeat
            print("📡 Sending heartbeat...")
            await websocket.send(json.dumps({"type": "heartbeat"}))

            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)

            print(f"📋 Response: {data}")

            if data.get('type') == 'heartbeat':
                print("✅ WebSocket connection is working!")
            else:
                print(f"⚠️ Unexpected response: {data}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())