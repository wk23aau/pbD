"""
Native CDP Client - Direct Chrome DevTools Protocol access
Provides: Console, Network, Page navigation, Element inspection
"""

import asyncio
import json
import websockets
import aiohttp


class CDPClient:
    """Direct CDP connection to Chrome debugger"""
    
    def __init__(self, host="localhost", port=9222):
        self.host = host
        self.port = port
        self.ws = None
        self.msg_id = 0
        self.callbacks = {}
        self.console_logs = []
        self.network_events = []
        
    async def connect(self):
        """Connect to Chrome CDP"""
        # Get WebSocket URL from Chrome
        async with aiohttp.ClientSession() as session:
            async with session.get(f"http://{self.host}:{self.port}/json") as resp:
                tabs = await resp.json()
                if not tabs:
                    raise Exception("No Chrome tabs found")
                ws_url = tabs[0].get("webSocketDebuggerUrl")
                if not ws_url:
                    raise Exception("No debugger URL - launch Chrome with --remote-debugging-port=9222")
        
        self.ws = await websockets.connect(ws_url)
        print(f"🔌 CDP connected: {ws_url[:50]}...")
        
        # Enable domains
        await self.send("Runtime.enable")
        await self.send("Console.enable")
        await self.send("Network.enable")
        await self.send("Page.enable")
        
        # Start listener
        asyncio.create_task(self._listen())
        
        return self
    
    async def _listen(self):
        """Listen for CDP events"""
        try:
            async for msg in self.ws:
                data = json.loads(msg)
                
                # Handle method responses
                if "id" in data:
                    future = self.callbacks.pop(data["id"], None)
                    if future and not future.done():
                        future.set_result(data.get("result"))
                
                # Handle events
                method = data.get("method", "")
                params = data.get("params", {})
                
                if method == "Console.messageAdded":
                    msg_data = params.get("message", {})
                    log = f"[{msg_data.get('level', 'log')}] {msg_data.get('text', '')}"
                    self.console_logs.append(log)
                    print(f"📺 Console: {log[:80]}")
                
                elif method == "Runtime.consoleAPICalled":
                    args = params.get("args", [])
                    text = " ".join(str(a.get("value", a.get("description", ""))) for a in args)
                    log = f"[{params.get('type', 'log')}] {text}"
                    self.console_logs.append(log)
                    print(f"📺 {log[:80]}")
                
                elif method == "Network.requestWillBeSent":
                    url = params.get("request", {}).get("url", "")
                    self.network_events.append({"type": "request", "url": url})
                    # Don't print all requests - too noisy
                
                elif method == "Network.responseReceived":
                    status = params.get("response", {}).get("status")
                    url = params.get("response", {}).get("url", "")[:40]
                    # Only print errors
                    if status and status >= 400:
                        print(f"🌐 Error: {status} {url}")
        except websockets.exceptions.ConnectionClosed:
            print("🔌 CDP connection closed")
    
    async def send(self, method, params=None):
        """Send CDP command"""
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method, "params": params or {}}
        await self.ws.send(json.dumps(msg))
        
        # Wait for response
        future = asyncio.get_event_loop().create_future()
        self.callbacks[self.msg_id] = future  # Store future, not set_result
        
        try:
            return await asyncio.wait_for(future, timeout=30)
        except asyncio.TimeoutError:
            return None
    
    # High-level methods
    async def navigate(self, url):
        """Navigate to URL"""
        result = await self.send("Page.navigate", {"url": url})
        print(f"📍 Navigated to: {url}")
        return result
    
    async def screenshot(self, path=None):
        """Capture screenshot"""
        result = await self.send("Page.captureScreenshot", {"format": "jpeg", "quality": 80})
        if result and path:
            import base64
            with open(path, 'wb') as f:
                f.write(base64.b64decode(result["data"]))
            print(f"📸 Screenshot: {path}")
        return result
    
    async def evaluate(self, expression):
        """Evaluate JavaScript"""
        result = await self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True
        })
        return result.get("result", {}).get("value") if result else None
    
    async def get_document(self):
        """Get page DOM"""
        result = await self.send("DOM.getDocument", {"depth": -1})
        return result
    
    async def query_selector(self, selector):
        """Query element"""
        doc = await self.send("DOM.getDocument")
        if not doc:
            return None
        root_id = doc["root"]["nodeId"]
        result = await self.send("DOM.querySelector", {
            "nodeId": root_id,
            "selector": selector
        })
        return result
    
    async def click(self, selector):
        """Click element by selector"""
        return await self.evaluate(f'document.querySelector("{selector}")?.click()')
    
    async def type_text(self, selector, text):
        """Type into element"""
        js = f'''
            const el = document.querySelector("{selector}");
            if (el) {{ el.value = "{text}"; el.dispatchEvent(new Event("input", {{bubbles:true}})); }}
        '''
        return await self.evaluate(js)
    
    async def get_console_logs(self):
        """Get captured console logs"""
        return self.console_logs.copy()
    
    async def get_network_events(self):
        """Get captured network events"""
        return self.network_events.copy()


async def main():
    """Interactive CDP mode"""
    print("🤖 Native CDP Client")
    print("Launch Chrome with: chrome --remote-debugging-port=9222")
    print()
    
    cdp = CDPClient()
    
    try:
        await cdp.connect()
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("Make sure Chrome is running with --remote-debugging-port=9222")
        return
    
    print("\nCommands: navigate <url>, eval <js>, screenshot, click <sel>, console, network, quit\n")
    
    while True:
        try:
            cmd = await asyncio.get_event_loop().run_in_executor(None, input, "> ")
            parts = cmd.strip().split(" ", 1)
            action = parts[0].lower()
            args = parts[1] if len(parts) > 1 else ""
            
            if action == "navigate":
                await cdp.navigate(args)
            elif action == "eval":
                result = await cdp.evaluate(args)
                print(f"Result: {result}")
            elif action == "screenshot":
                await cdp.screenshot("cdp_screenshot.jpg")
            elif action == "click":
                await cdp.click(args)
                print("Clicked")
            elif action == "console":
                for log in await cdp.get_console_logs():
                    print(log)
            elif action == "network":
                for evt in (await cdp.get_network_events())[-10:]:
                    print(evt)
            elif action == "quit":
                break
            else:
                print("Commands: navigate eval screenshot click console network quit")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
