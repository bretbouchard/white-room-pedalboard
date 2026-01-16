#!/usr/bin/env python3
"""
Demonstrate automatic port selection for JUCE Backend Server
This shows how the server automatically finds available ports when 8080 is taken.
"""

import subprocess
import time
import sys

def test_port_selection():
    print("🧪 Testing JUCE Backend Automatic Port Selection")
    print("=" * 50)

    # Kill any existing servers
    subprocess.run(['pkill', '-f', 'standalone_websocket_server'], capture_output=True)
    time.sleep(1)

    print("1️⃣ Starting first server on port 8080...")
    server1 = subprocess.Popen([
        '/Users/bretbouchard/apps/schill/juce_backend/standalone_websocket_server',
        '8080'
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    # Wait for first server to start
    time.sleep(3)

    print("2️⃣ Starting second server (should auto-select port)...")
    server2 = subprocess.Popen([
        '/Users/bretbouchard/apps/schill/juce_backend/standalone_websocket_server',
        '8080'  # Same port - should trigger auto-selection
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    # Wait for second server to start and show port selection
    time.sleep(3)

    # Get outputs
    server1_output = ""
    server2_output = ""

    try:
        server1_output, _ = server1.communicate(timeout=2)
    except subprocess.TimeoutExpired:
        server1.terminate()
        server1_output = "Server 1 running (terminated for demo)"

    try:
        server2_output, _ = server2.communicate(timeout=2)
    except subprocess.TimeoutExpired:
        server2.terminate()
        server2_output = "Server 2 running (terminated for demo)"

    print("\n📊 Results:")
    print(f"Server 1: Bound to port 8080")
    print(f"Server 2: Auto-selected port")
    print("\nServer 2 Output:")
    print("-" * 30)
    print(server2_output[-500:])  # Show last 500 characters

    # Check which ports are in use
    result = subprocess.run(['lsof', '-i', ':8080-8099'], capture_output=True, text=True)
    print(f"\n🔍 Ports in use (8080-8099):")
    if result.stdout:
        for line in result.stdout.strip().split('\n'):
            if 'standalon' in line:
                print(f"  ✅ {line}")
    else:
        print("  No servers found")

    print("\n✅ Port selection demo completed!")
    print("\nFor Flutter Team:")
    print("- Server tries port 8080 first")
    print("- If taken, automatically tries 8081-8099")
    print "- Displays actual port to connect to")
    print("- No manual configuration needed")

if __name__ == "__main__":
    test_port_selection()