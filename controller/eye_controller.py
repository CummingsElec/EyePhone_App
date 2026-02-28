#!/usr/bin/env python3
"""
Robot Eyes WebSocket Controller
Run this on the Jetson Orin Nano (or any machine on the same network).

Usage:
    python3 eye_controller.py

Dependencies:
    pip install websockets

The Android phone connects TO this server.
Set the phone's WebSocket host to this machine's IP.
"""

import asyncio
import websockets
import json
import time

CLIENTS = set()

async def handler(websocket):
    CLIENTS.add(websocket)
    print(f"Client connected ({len(CLIENTS)} total)")
    try:
        async for message in websocket:
            print(f"Received from client: {message}")
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        CLIENTS.discard(websocket)
        print(f"Client disconnected ({len(CLIENTS)} total)")

async def broadcast(message):
    if CLIENTS:
        await asyncio.gather(*[c.send(message) for c in CLIENTS])

async def demo_sequence():
    """Demo that cycles through expressions and gaze positions."""
    await asyncio.sleep(3)
    print("\n--- Starting demo sequence ---")
    print("Waiting for client connection...")

    while not CLIENTS:
        await asyncio.sleep(1)

    print(f"Client connected! Running demo...\n")

    emotions = ["joy", "surprise", "anger", "confusion", "love", "sleepy", "excitement", "sadness", "fear", "disgust"]

    for emotion in emotions:
        print(f"  Expression: {emotion}")
        await broadcast(f"emotion {emotion}")
        await asyncio.sleep(3)

    print("\n  Gaze: looking left")
    await broadcast("eye 0.2 0.5")
    await asyncio.sleep(2)

    print("  Gaze: looking right")
    await broadcast("eye 0.8 0.5")
    await asyncio.sleep(2)

    print("  Gaze: looking up")
    await broadcast("eye 0.5 0.2")
    await asyncio.sleep(2)

    print("  Gaze: looking down")
    await broadcast("eye 0.5 0.8")
    await asyncio.sleep(2)

    print("  Gaze: center")
    await broadcast("eye 0.5 0.5")
    await asyncio.sleep(2)

    print("\n--- Demo complete ---")
    print("Server still running. Send commands manually or Ctrl+C to exit.\n")

async def interactive_mode():
    """Read commands from stdin and broadcast them."""
    await asyncio.sleep(1)
    print("\nRobot Eyes Controller")
    print("=" * 40)
    print("Commands:")
    print("  emotion <type>        - joy, sadness, surprise, anger, fear,")
    print("                          disgust, confusion, love, sleepy, excitement")
    print("  eye <x> <y>           - normalized gaze (0-1)")
    print("  eye target <x> <y> <z> <focal> - 3D target")
    print("  demo                  - run demo sequence")
    print("  quit                  - exit")
    print("=" * 40)

    loop = asyncio.get_event_loop()
    while True:
        cmd = await loop.run_in_executor(None, lambda: input("\n> ").strip())
        if cmd == "quit":
            break
        elif cmd == "demo":
            asyncio.create_task(demo_sequence())
        elif cmd:
            await broadcast(cmd)
            print(f"  Sent: {cmd}")

async def main():
    port = 8765
    print(f"Starting WebSocket server on ws://0.0.0.0:{port}")
    print(f"Set the Android phone's WebSocket host to this machine's IP address.\n")

    async with websockets.serve(handler, "0.0.0.0", port):
        await interactive_mode()

if __name__ == "__main__":
    asyncio.run(main())
