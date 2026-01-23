"""
Enterprise Grade CDP Client
Direct Chrome DevTools Protocol with proper async handling
No room for errors - production quality
"""

import asyncio
import json
import os
import base64
from typing import Optional, Dict, Any, Callable

try:
    import websockets
    import aiohttp
except ImportError:
    print("Install: pip install websockets aiohttp")
    exit(1)


class CDPClient:
    """Enterprise-grade CDP connection with proper async handling"""
    
    def __init__(self, host: str = "localhost", port: int = 9222):
        self.host = host
        self.port = port
        self.ws = None
        self.msg_id = 0
        self.pending: Dict[int, asyncio.Future] = {}
        self.listeners: Dict[str, list] = {}
        self.console_logs: list = []
        self.network_events: list = []
        self._listener_task = None
        self._connected = False
    
    async def connect(self) -> "CDPClient":
        """Connect to Chrome CDP with proper error handling"""
        try:
            # Get WebSocket URL from Chrome debugger
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                url = f"http://{self.host}:{self.port}/json"
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise Exception(f"Chrome debugger not responding: {resp.status}")
                    tabs = await resp.json()
            
            if not tabs:
                raise Exception("No Chrome tabs found")
            
            # Find a valid tab
            ws_url = None
            for tab in tabs:
                if tab.get("type") == "page" and tab.get("webSocketDebuggerUrl"):
                    ws_url = tab["webSocketDebuggerUrl"]
                    break
            
            if not ws_url:
                ws_url = tabs[0].get("webSocketDebuggerUrl")
            
            if not ws_url:
                raise Exception("No debugger URL - launch Chrome with --remote-debugging-port=9222")
            
            # Connect WebSocket
            self.ws = await asyncio.wait_for(
                websockets.connect(ws_url, max_size=100_000_000),
                timeout=10
            )
            self._connected = True
            print(f"🔌 CDP connected: {ws_url[:60]}...")
            
            # Start listener in background
            self._listener_task = asyncio.create_task(self._listen())
            
            # Enable domains with retry
            await self._enable_domains()
            
            return self
            
        except asyncio.TimeoutError:
            raise Exception("Connection timeout - is Chrome running with --remote-debugging-port=9222?")
        except aiohttp.ClientError as e:
            raise Exception(f"Connection failed: {e}")
    
    async def _enable_domains(self):
        """Enable CDP domains"""
        domains = ["Runtime", "Page", "Network", "Console", "DOM"]
        for domain in domains:
            try:
                await self.send(f"{domain}.enable", timeout=5)
            except Exception as e:
                print(f"⚠️ Failed to enable {domain}: {e}")
    
    async def _listen(self):
        """Listen for CDP messages - runs in background"""
        try:
            async for msg in self.ws:
                try:
                    data = json.loads(msg)
                    await self._handle_message(data)
                except json.JSONDecodeError:
                    print(f"⚠️ Invalid JSON: {msg[:100]}")
        except websockets.exceptions.ConnectionClosed:
            print("🔌 CDP connection closed")
            self._connected = False
        except Exception as e:
            print(f"❌ Listener error: {e}")
            self._connected = False
    
    async def _handle_message(self, data: dict):
        """Handle incoming CDP message"""
        # Handle command responses
        if "id" in data:
            msg_id = data["id"]
            if msg_id in self.pending:
                future = self.pending.pop(msg_id)
                if not future.done():
                    if "error" in data:
                        future.set_exception(Exception(data["error"].get("message", "Unknown error")))
                    else:
                        future.set_result(data.get("result"))
        
        # Handle events
        method = data.get("method", "")
        params = data.get("params", {})
        
        if method == "Console.messageAdded":
            msg = params.get("message", {})
            log = f"[{msg.get('level', 'log')}] {msg.get('text', '')}"
            self.console_logs.append(log)
        
        elif method == "Runtime.consoleAPICalled":
            args = params.get("args", [])
            text = " ".join(str(a.get("value", a.get("description", ""))) for a in args)
            log = f"[{params.get('type', 'log')}] {text}"
            self.console_logs.append(log)
        
        elif method == "Network.requestWillBeSent":
            url = params.get("request", {}).get("url", "")
            self.network_events.append({"type": "request", "url": url})
        
        elif method == "Network.responseReceived":
            resp = params.get("response", {})
            self.network_events.append({
                "type": "response",
                "status": resp.get("status"),
                "url": resp.get("url", "")[:100]
            })
        
        # Notify listeners
        if method in self.listeners:
            for callback in self.listeners[method]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(params)
                    else:
                        callback(params)
                except Exception as e:
                    print(f"⚠️ Listener error for {method}: {e}")
    
    async def send(self, method: str, params: dict = None, timeout: float = 30) -> Any:
        """Send CDP command and wait for response"""
        if not self._connected or not self.ws:
            raise Exception("Not connected to CDP")
        
        self.msg_id += 1
        msg_id = self.msg_id
        
        # Create future for response
        future = asyncio.get_event_loop().create_future()
        self.pending[msg_id] = future
        
        # Send command
        cmd = {"id": msg_id, "method": method, "params": params or {}}
        try:
            await self.ws.send(json.dumps(cmd))
        except Exception as e:
            self.pending.pop(msg_id, None)
            raise Exception(f"Failed to send command: {e}")
        
        # Wait for response with timeout
        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            self.pending.pop(msg_id, None)
            raise Exception(f"Command timeout after {timeout}s: {method}")
    
    def on(self, event: str, callback: Callable):
        """Register event listener"""
        if event not in self.listeners:
            self.listeners[event] = []
        self.listeners[event].append(callback)
    
    async def close(self):
        """Clean shutdown"""
        self._connected = False
        if self._listener_task:
            self._listener_task.cancel()
        if self.ws:
            await self.ws.close()
    
    # ============ HIGH-LEVEL METHODS ============
    
    async def navigate(self, url: str, wait_for_load: bool = True) -> dict:
        """Navigate to URL and optionally wait for load"""
        result = await self.send("Page.navigate", {"url": url})
        if wait_for_load:
            await asyncio.sleep(2)  # Simple wait for page
        print(f"📍 Navigated: {url}")
        return result
    
    async def screenshot(self, path: str = None, quality: int = 80) -> bytes:
        """Capture screenshot as JPEG"""
        result = await self.send("Page.captureScreenshot", {
            "format": "jpeg",
            "quality": quality
        })
        img_bytes = base64.b64decode(result["data"])
        
        if path:
            with open(path, 'wb') as f:
                f.write(img_bytes)
            print(f"📸 Screenshot: {path}")
        
        return img_bytes
    
    async def evaluate(self, expression: str) -> Any:
        """Execute JavaScript and return result"""
        result = await self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True
        })
        if "exceptionDetails" in result:
            raise Exception(result["exceptionDetails"].get("text", "JS Error"))
        return result.get("result", {}).get("value")
    
    async def click(self, selector: str) -> bool:
        """Click element by CSS selector using bounding box (like subagent)"""
        try:
            # First enable DOM domain if not enabled
            await self.send("DOM.enable")
            
            # Get document
            doc = await self.send("DOM.getDocument")
            if not doc:
                return False
            
            # Query selector
            node = await self.send("DOM.querySelector", {
                "nodeId": doc["root"]["nodeId"],
                "selector": selector
            })
            
            if not node or node.get("nodeId") == 0:
                # Fallback to JS click
                result = await self.evaluate(f'''
                    (() => {{
                        const el = document.querySelector("{selector}");
                        if (el) {{ el.click(); return true; }}
                        return false;
                    }})()
                ''')
                return result
            
            # Get bounding box
            box = await self.send("DOM.getBoxModel", {"nodeId": node["nodeId"]})
            if not box or "model" not in box:
                return False
            
            # Get content quad (4 corners)
            content = box["model"]["content"]
            # Calculate center
            x = (content[0] + content[2] + content[4] + content[6]) / 4
            y = (content[1] + content[3] + content[5] + content[7]) / 4
            
            # Click at center using Input.dispatchMouseEvent
            await self.click_pixel(int(x), int(y))
            return True
            
        except Exception as e:
            print(f"⚠️ Smart click failed: {e}, trying JS click")
            result = await self.evaluate(f'''
                (() => {{
                    const el = document.querySelector("{selector}");
                    if (el) {{ el.click(); return true; }}
                    return false;
                }})()
            ''')
            return result
    
    async def type_text(self, selector: str, text: str, delay: float = 0.05) -> bool:
        """Type text into element using CDP Input (like subagent)"""
        try:
            # First click to focus the element
            clicked = await self.click(selector)
            if not clicked:
                print(f"⚠️ Could not focus {selector}")
                return False
            
            await asyncio.sleep(0.1)  # Wait for focus
            
            # Clear existing content
            await self.send("Input.dispatchKeyEvent", {
                "type": "keyDown",
                "key": "a",
                "modifiers": 2  # Ctrl
            })
            await self.send("Input.dispatchKeyEvent", {
                "type": "keyUp",
                "key": "a",
                "modifiers": 2
            })
            await self.send("Input.dispatchKeyEvent", {
                "type": "keyDown",
                "key": "Backspace"
            })
            await self.send("Input.dispatchKeyEvent", {
                "type": "keyUp",
                "key": "Backspace"
            })
            
            # Type each character using Input.insertText (triggers React)
            await self.send("Input.insertText", {"text": text})
            
            print(f"⌨️ Typed: {text[:20]}{'...' if len(text) > 20 else ''}")
            return True
            
        except Exception as e:
            print(f"⚠️ Type failed: {e}, falling back to JS")
            # Fallback to JS
            escaped = text.replace("\\", "\\\\").replace('"', '\\"')
            result = await self.evaluate(f'''
                (() => {{
                    const el = document.querySelector("{selector}");
                    if (el) {{
                        el.focus();
                        el.value = "{escaped}";
                        el.dispatchEvent(new Event("input", {{bubbles: true}}));
                        el.dispatchEvent(new Event("change", {{bubbles: true}}));
                        return true;
                    }}
                    return false;
                }})()
            ''')
            return result
    
    async def wait(self, ms: int = 500):
        """Smart wait between actions"""
        await asyncio.sleep(ms / 1000)
        print(f"⏳ Waited: {ms}ms")
    
    async def get_dom(self) -> str:
        """Get page HTML"""
        return await self.evaluate("document.documentElement.outerHTML")
    
    async def get_title(self) -> str:
        """Get page title"""
        return await self.evaluate("document.title")
    
    async def wait_for_selector(self, selector: str, timeout: float = 10) -> bool:
        """Wait for element to appear"""
        start = asyncio.get_event_loop().time()
        while asyncio.get_event_loop().time() - start < timeout:
            found = await self.evaluate(f'!!document.querySelector("{selector}")')
            if found:
                return True
            await asyncio.sleep(0.5)
        return False
    
    async def click_pixel(self, x: int, y: int) -> bool:
        """Click at pixel coordinates - fallback for when selector fails"""
        try:
            # Mouse down
            await self.send("Input.dispatchMouseEvent", {
                "type": "mousePressed",
                "x": x,
                "y": y,
                "button": "left",
                "clickCount": 1
            })
            # Mouse up
            await self.send("Input.dispatchMouseEvent", {
                "type": "mouseReleased",
                "x": x,
                "y": y,
                "button": "left",
                "clickCount": 1
            })
            print(f"🖱️ Clicked: ({x}, {y})")
            return True
        except Exception as e:
            print(f"❌ Pixel click failed: {e}")
            return False
    
    async def scroll(self, x: int = 0, y: int = 500):
        """Scroll page by pixels"""
        await self.evaluate(f"window.scrollBy({x}, {y})")
        print(f"📜 Scrolled: ({x}, {y})")
    
    async def set_viewport(self, width: int = 1280, height: int = 720):
        """Set fixed viewport size for consistent coordinates"""
        await self.send("Emulation.setDeviceMetricsOverride", {
            "width": width,
            "height": height,
            "deviceScaleFactor": 1,
            "mobile": False
        })
        print(f"📐 Viewport: {width}x{height}")
    
    async def dismiss_popups(self) -> int:
        """Dismiss common popups (cookies, notifications, dialogs)"""
        dismissed = 0
        
        # Common popup dismiss patterns
        popup_selectors = [
            # Cookie popups
            '[data-cookiebanner="accept_button"]',
            'button[data-testid="cookie-policy-manage-dialog-accept-button"]',
            '[aria-label="Allow all cookies"]',
            'button:contains("Accept")',
            # Notification popups
            'button[title="Block"]',
            '[aria-label="Block"]',
            # Dialogs
            'button:contains("Not now")',
            '[aria-label="Close"]',
            'button[aria-label="Dismiss"]',
        ]
        
        for selector in popup_selectors:
            try:
                result = await self.evaluate(f'''
                    (() => {{
                        const el = document.querySelector('{selector}');
                        if (el) {{ el.click(); return true; }}
                        return false;
                    }})()
                ''')
                if result:
                    dismissed += 1
                    await asyncio.sleep(0.3)
            except:
                pass
        
        if dismissed:
            print(f"🚫 Dismissed {dismissed} popup(s)")
        return dismissed
    
    async def analyze_page(self) -> dict:
        """Analyze current page state - call first before any action"""
        # Take screenshot
        screenshot = await self.screenshot("cdp_screenshot.jpg")
        
        # Get page info
        title = await self.get_title()
        url = await self.evaluate("window.location.href")
        
        # Check for popups
        has_overlay = await self.evaluate('''
            (() => {
                const modals = document.querySelectorAll('[role="dialog"], [role="alertdialog"], .modal, .popup, [class*="overlay"]');
                return modals.length > 0;
            })()
        ''')
        
        # Get viewport size
        viewport = await self.evaluate('''
            JSON.stringify({width: window.innerWidth, height: window.innerHeight})
        ''')
        
        analysis = {
            "title": title,
            "url": url,
            "has_overlay": has_overlay,
            "viewport": json.loads(viewport) if viewport else {},
            "screenshot": "cdp_screenshot.jpg"
        }
        
        print(f"📊 Page: {title[:40]}...")
        print(f"   URL: {url[:50]}...")
        print(f"   Overlays: {'Yes' if has_overlay else 'No'}")
        
        return analysis


# ============ INTERACTIVE MODE ============

async def interactive():
    """Interactive CDP testing mode"""
    print("🤖 Enterprise CDP Client")
    print("─" * 40)
    
    cdp = CDPClient()
    
    try:
        await cdp.connect()
    except Exception as e:
        print(f"❌ {e}")
        print("\nLaunch Chrome with: chrome --remote-debugging-port=9222")
        return
    
    print("\nCommands:")
    print("  navigate <url>    - Go to URL")
    print("  screenshot        - Capture page")
    print("  eval <js>         - Run JavaScript")
    print("  title             - Get page title")
    print("  click <selector>  - Click element")
    print("  type <sel> <text> - Type into element")
    print("  console           - Show console logs")
    print("  network           - Show network events")
    print("  quit              - Exit")
    print()
    
    while True:
        try:
            cmd = await asyncio.get_event_loop().run_in_executor(None, input, "> ")
            parts = cmd.strip().split(" ", 1)
            action = parts[0].lower()
            args = parts[1] if len(parts) > 1 else ""
            
            if action == "navigate":
                await cdp.navigate(args)
            
            elif action == "screenshot":
                await cdp.screenshot("cdp_screenshot.jpg")
            
            elif action == "eval":
                result = await cdp.evaluate(args)
                print(f"Result: {result}")
            
            elif action == "title":
                title = await cdp.get_title()
                print(f"Title: {title}")
            
            elif action == "click":
                success = await cdp.click(args)
                print(f"Click: {'success' if success else 'not found'}")
            
            elif action == "type":
                sel, text = args.split(" ", 1)
                success = await cdp.type_text(sel, text)
                print(f"Type: {'success' if success else 'not found'}")
            
            elif action == "console":
                for log in cdp.console_logs[-20:]:
                    print(log)
            
            elif action == "network":
                for evt in cdp.network_events[-10:]:
                    print(evt)
            
            elif action == "pixelclick":
                x, y = map(int, args.split())
                await cdp.click_pixel(x, y)
            
            elif action == "scroll":
                y = int(args) if args else 500
                await cdp.scroll(0, y)
            
            elif action == "viewport":
                await cdp.set_viewport()
            
            elif action == "popups":
                await cdp.dismiss_popups()
            
            elif action == "analyze":
                await cdp.analyze_page()
            
            elif action == "quit":
                break
            
            else:
                print("Commands: navigate, screenshot, analyze, viewport, popups, click, pixelclick, type, scroll, quit")
        
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")
    
    await cdp.close()
    print("👋 Disconnected")


if __name__ == "__main__":
    asyncio.run(interactive())
