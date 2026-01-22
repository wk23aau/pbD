"""
JARVIS WebSocket Server
Bridges Chrome extension with AI controller
"""

import asyncio
import json
import websockets
from datetime import datetime

# Connected clients
clients = set()
pending_requests = {}
request_id = 0
latest_screenshot = None  # For vision-in-the-loop


async def handle_client(websocket):
    """Handle WebSocket client (Chrome extension)"""
    clients.add(websocket)
    print(f"🔌 Extension connected: {websocket.remote_address}")
    
    try:
        async for message in websocket:
            data = json.loads(message)
            
            if data.get("type") == "dom_stream":
                # Real-time DOM update
                print(f"📡 DOM stream: {data.get('changes', [])[:3]}")
            elif data.get("type") == "screenshot_stream":
                # Live screenshot preview (metadata)
                ss = data.get("data", {})
                print(f"📸 [{ss.get('title', 'Unknown')[:30]}] scroll:{ss.get('scroll', {}).get('y', 0)}")
            elif data.get("type") == "screenshot":
                # Real screenshot image!
                import base64
                import os
                global latest_screenshot
                img_data = data.get("data", "")
                if img_data.startswith("data:image"):
                    # Extract base64 data
                    b64 = img_data.split(",")[1]
                    img_bytes = base64.b64decode(b64)
                    # Save to file
                    screenshot_dir = os.path.join(os.path.dirname(__file__), "screenshots")
                    os.makedirs(screenshot_dir, exist_ok=True)
                    path = os.path.join(screenshot_dir, f"live_{data.get('timestamp', 'unknown')}.jpg")
                    with open(path, 'wb') as f:
                        f.write(img_bytes)
                    # Track latest for vision-in-the-loop
                    latest_screenshot = path
                    # Also save as "latest.jpg" for easy access
                    latest_path = os.path.join(screenshot_dir, "latest.jpg")
                    with open(latest_path, 'wb') as f:
                        f.write(img_bytes)
                    print(f"📸 Screenshot saved: {path}")
            elif data.get("id"):
                # Response to command
                rid = data["id"]
                if rid in pending_requests:
                    pending_requests[rid].set_result(data.get("result"))
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        clients.discard(websocket)
        print(f"🔌 Extension disconnected")


async def send_command(action, params=None, timeout=30):
    """Send command to extension and wait for response"""
    global request_id
    
    if not clients:
        return {"error": "No extension connected"}
    
    request_id += 1
    rid = request_id
    
    msg = json.dumps({
        "id": rid,
        "action": action,
        "params": params or {}
    })
    
    # Create future for response
    future = asyncio.get_event_loop().create_future()
    pending_requests[rid] = future
    
    # Send to first connected client
    client = next(iter(clients))
    await client.send(msg)
    
    # Wait for response
    try:
        result = await asyncio.wait_for(future, timeout=timeout)
        return result
    except asyncio.TimeoutError:
        return {"error": "timeout"}
    finally:
        pending_requests.pop(rid, None)


class ExtensionBrowser:
    """Browser control via Chrome extension"""
    
    async def get_dom(self):
        return await send_command("getDOM")
    
    async def query(self, selector):
        return await send_command("querySelector", {"selector": selector})
    
    async def query_all(self, selector, limit=100):
        return await send_command("querySelectorAll", {"selector": selector, "limit": limit})
    
    async def click(self, selector):
        return await send_command("click", {"selector": selector})
    
    async def type(self, selector, text):
        return await send_command("type", {"selector": selector, "text": text})
    
    async def scroll(self, amount=500):
        return await send_command("scroll", {"amount": amount})
    
    async def eval(self, code):
        return await send_command("eval", {"code": code})
    
    async def highlight(self, selector):
        return await send_command("highlight", {"selector": selector})
    
    async def start_streaming(self):
        return await send_command("startStreaming")
    
    async def stop_streaming(self):
        return await send_command("stopStreaming")
    
    async def start_screenshots(self, interval=3000, quality=0.2):
        return await send_command("startScreenshots", {"interval": interval, "quality": quality})
    
    async def stop_screenshots(self):
        return await send_command("stopScreenshots")


async def interactive_mode():
    """Interactive command mode"""
    browser = ExtensionBrowser()
    
    print("\n🤖 JARVIS Extension Controller")
    print("Commands: dom, query <sel>, click <sel>, type <sel> <text>, eval <code>, stream, quit\n")
    
    while True:
        try:
            cmd = await asyncio.get_event_loop().run_in_executor(None, input, "> ")
            parts = cmd.strip().split(" ", 1)
            action = parts[0].lower()
            args = parts[1] if len(parts) > 1 else ""
            
            if action == "dom":
                result = await browser.get_dom()
                print(f"DOM: {len(result) if isinstance(result, str) else result} chars")
            
            elif action == "query":
                result = await browser.query(args)
                print(f"Result: {result}")
            
            elif action == "queryall":
                result = await browser.query_all(args)
                print(f"Found: {len(result) if isinstance(result, list) else result}")
            
            elif action == "click":
                result = await browser.click(args)
                print(f"Click: {result}")
            
            elif action == "type":
                sel, text = args.split(" ", 1)
                result = await browser.type(sel, text)
                print(f"Type: {result}")
            
            elif action == "eval":
                result = await browser.eval(args)
                print(f"Eval: {result}")
            
            elif action == "highlight":
                result = await browser.highlight(args)
                print(f"Highlight: {result}")
            
            elif action == "stream":
                result = await browser.start_streaming()
                print(f"Streaming: {result}")
            
            elif action == "live":
                result = await browser.start_screenshots(3000, 0.2)
                print(f"Live preview: {result}")
            
            elif action == "stoplive":
                result = await browser.stop_screenshots()
                print(f"Stopped: {result}")
            
            elif action == "quit":
                break
            
            else:
                print("Commands: dom query queryall click type eval highlight stream live stoplive quit")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")


async def main():
    # Start WebSocket server
    server = await websockets.serve(handle_client, "localhost", 9333)
    print("🌐 WebSocket server started on ws://localhost:9333")
    print("📦 Load extension from: A1/extension/")
    
    # Run interactive mode
    await interactive_mode()
    
    server.close()
    await server.wait_closed()


if __name__ == "__main__":
    asyncio.run(main())
