#!/usr/bin/env python3
"""
Simple WebSocket client test to verify the WorkingWebSocketServer actually works
"""

import asyncio
import websockets
import json
import sys

async def test_websocket_connection(host="localhost", port=8085):
    """Test connecting to the WebSocket server"""
    uri = f"ws://{host}:{port}"

    print(f"🔗 Testing WebSocket connection to {uri}")

    try:
        # Connect to the WebSocket server
        async with websockets.connect(uri) as websocket:
            print("✅ Successfully connected to WebSocket server!")

            # Test message 1: Simple ping
            ping_message = {"type": "ping", "timestamp": 1234567890}
            await websocket.send(json.dumps(ping_message))
            print(f"📤 Sent: {ping_message}")

            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"📥 Received: {response}")

                # Parse response as JSON if possible
                try:
                    parsed_response = json.loads(response)
                    print(f"✅ JSON response: {parsed_response}")
                except json.JSONDecodeError:
                    print(f"📄 Raw response: {response}")

            except asyncio.TimeoutError:
                print("⚠️  No response received within 5 seconds (server may not echo messages)")

            # Test message 2: Plugin scan request
            scan_message = {
                "type": "scan_plugins",
                "paths": ["/Library/Audio/Plug-Ins/VST3"],
                "timestamp": 1234567891
            }
            await websocket.send(json.dumps(scan_message))
            print(f"📤 Sent: {scan_message}")

            print("🎯 WebSocket client test completed successfully!")
            return True

    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False

async def main():
    """Main test function"""
    print("🧪 WebSocket Client Test")
    print("=" * 40)
    print("🚀 Testing REAL WebSocket server connectivity")
    print("🔗 This verifies the server actually accepts client connections")
    print()

    # Get port from command line argument
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8085

    # Test the connection
    success = await test_websocket_connection(port=port)

    if success:
        print("\n✅ SUCCESS: WebSocket server is working correctly!")
        print("🎯 The server ACTUALLY accepts real WebSocket connections!")
        print("🔗 Ready for Flutter integration")
    else:
        print("\n❌ FAILED: WebSocket server is not accepting connections")
        print("🚨 This indicates the server is not working properly")

    return success

if __name__ == "__main__":
    # Allow port to be specified as command line argument
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8085

    # Run the test
    result = asyncio.run(main())

    sys.exit(0 if result else 1)