"""
Browser Interactive - Stdin/Stdout CDP Version
Real-time browser control via terminal

Usage: python browser_interactive.py
Then type commands:
  nav https://example.com
  click selector
  type selector text
  js console.log('hello')
  screenshot
  dom
  quit
"""

import asyncio
import sys
import json
from datetime import datetime

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_OK = True
except ImportError:
    PLAYWRIGHT_OK = False
    print("ERROR: pip install playwright && playwright install")
    sys.exit(1)


class InteractiveBrowser:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.page = None
        self.cdp = None
        self.cursor_x = 0
        self.cursor_y = 0
        
    async def start(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=False)
        context = await self.browser.new_context(viewport={'width': 1280, 'height': 720})
        self.page = await context.new_page()
        self.cdp = await context.new_cdp_session(self.page)
        
        # Inject visual cursor styles
        await self._inject_cursor()
        print("READY", flush=True)
    
    async def _inject_cursor(self):
        """Inject visual cursor and glow effects"""
        await self.page.add_style_tag(content='''
            #_jarvis_cursor {
                position: fixed;
                width: 20px; height: 20px;
                background: radial-gradient(circle, #ff6b6b 0%, #ee5a5a 50%, transparent 70%);
                border-radius: 50%;
                pointer-events: none;
                z-index: 999999;
                transform: translate(-50%, -50%);
                transition: left 0.1s ease-out, top 0.1s ease-out;
                box-shadow: 0 0 15px #ff6b6b, 0 0 30px #ff6b6b55;
            }
            ._jarvis_highlight {
                outline: 3px solid #4ecdc4 !important;
                box-shadow: 0 0 10px #4ecdc4, 0 0 20px #4ecdc455, inset 0 0 10px #4ecdc433 !important;
                animation: _jarvis_glow 1s ease-in-out infinite alternate;
            }
            @keyframes _jarvis_glow {
                from { box-shadow: 0 0 10px #4ecdc4, 0 0 20px #4ecdc455; }
                to { box-shadow: 0 0 20px #4ecdc4, 0 0 40px #4ecdc4aa; }
            }
        ''')
        await self.page.evaluate('''
            const cursor = document.createElement('div');
            cursor.id = '_jarvis_cursor';
            cursor.style.left = '0px';
            cursor.style.top = '0px';
            document.body.appendChild(cursor);
            window._moveCursor = (x, y) => {
                cursor.style.left = x + 'px';
                cursor.style.top = y + 'px';
            };
            window._highlight = (el) => { el.classList.add('_jarvis_highlight'); };
            window._unhighlight = (el) => { el.classList.remove('_jarvis_highlight'); };
        ''')
    
    async def _smooth_move(self, to_x, to_y, steps=20):
        """Bezier curve mouse movement"""
        from_x, from_y = self.cursor_x, self.cursor_y
        
        # Control points for bezier curve
        cp1_x = from_x + (to_x - from_x) * 0.3 + (to_y - from_y) * 0.1
        cp1_y = from_y + (to_y - from_y) * 0.1 - (to_x - from_x) * 0.1
        cp2_x = from_x + (to_x - from_x) * 0.7 - (to_y - from_y) * 0.1
        cp2_y = from_y + (to_y - from_y) * 0.9 + (to_x - from_x) * 0.1
        
        for i in range(steps + 1):
            t = i / steps
            # Cubic bezier
            x = (1-t)**3 * from_x + 3*(1-t)**2*t * cp1_x + 3*(1-t)*t**2 * cp2_x + t**3 * to_x
            y = (1-t)**3 * from_y + 3*(1-t)**2*t * cp1_y + 3*(1-t)*t**2 * cp2_y + t**3 * to_y
            
            await self.page.mouse.move(x, y)
            await self.page.evaluate(f"window._moveCursor && window._moveCursor({x}, {y})")
            await asyncio.sleep(0.02)
        
        self.cursor_x, self.cursor_y = to_x, to_y
        
    async def stop(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        print("STOPPED", flush=True)

    async def execute(self, cmd):
        """Execute a command and return result"""
        parts = cmd.strip().split(" ", 1)
        action = parts[0].lower()
        args = parts[1] if len(parts) > 1 else ""
        
        try:
            if action == "nav" or action == "navigate":
                await self.page.goto(args, wait_until="domcontentloaded")
                return f"OK navigated {self.page.url}"
            
            elif action == "click":
                await self.page.click(args)
                return f"OK clicked {args}"
            
            elif action == "type":
                selector, text = args.split(" ", 1)
                await self.page.fill(selector, text)
                return f"OK typed in {selector}"
            
            elif action == "js" or action == "eval":
                result = await self.page.evaluate(args)
                return f"OK {json.dumps(result, default=str)[:500]}"
            
            elif action == "cdp":
                method, params = args.split(" ", 1) if " " in args else (args, "{}")
                result = await self.cdp.send(method, json.loads(params))
                return f"OK {json.dumps(result, default=str)[:500]}"
            
            elif action == "screenshot":
                path = f"screenshot_{int(datetime.now().timestamp())}.png"
                await self.page.screenshot(path=path)
                return f"OK {path}"
            
            elif action == "dom":
                html = await self.page.content()
                return f"OK {len(html)} chars"
            
            elif action == "text":
                text = await self.page.inner_text("body")
                return f"OK {text[:500]}"
            
            elif action == "url":
                return f"OK {self.page.url}"
            
            elif action == "title":
                title = await self.page.title()
                return f"OK {title}"
            
            elif action == "scroll":
                await self.page.mouse.wheel(0, int(args) if args else 500)
                return "OK scrolled"
            
            elif action == "back":
                await self.page.go_back()
                return "OK back"
            
            elif action == "forward":
                await self.page.go_forward()
                return "OK forward"
            
            elif action == "reload":
                await self.page.reload()
                return "OK reloaded"
            
            elif action == "wait":
                await asyncio.sleep(float(args) if args else 1)
                return f"OK waited {args}s"
            
            # Cookie management
            elif action == "cookies":
                cookies = await self.page.context.cookies()
                return f"OK {json.dumps(cookies)[:500]}"
            
            elif action == "setcookie":
                cookie = json.loads(args)
                await self.page.context.add_cookies([cookie])
                return "OK cookie set"
            
            elif action == "clearcookies":
                await self.page.context.clear_cookies()
                return "OK cookies cleared"
            
            # Storage
            elif action == "localstorage":
                result = await self.page.evaluate("JSON.stringify(localStorage)")
                return f"OK {result[:500]}"
            
            elif action == "setlocal":
                key, val = args.split(" ", 1)
                await self.page.evaluate(f"localStorage.setItem('{key}', '{val}')")
                return f"OK set {key}"
            
            # Console capture
            elif action == "consoleon":
                self.page.on("console", lambda msg: print(f"CONSOLE: {msg.text}", flush=True))
                return "OK console capture on"
            
            # Dialog handling
            elif action == "dialogaccept":
                self.page.on("dialog", lambda d: asyncio.create_task(d.accept()))
                return "OK will accept dialogs"
            
            elif action == "dialogdismiss":
                self.page.on("dialog", lambda d: asyncio.create_task(d.dismiss()))
                return "OK will dismiss dialogs"
            
            # File upload
            elif action == "upload":
                selector, filepath = args.split(" ", 1)
                await self.page.set_input_files(selector, filepath)
                return f"OK uploaded {filepath}"
            
            # Download
            elif action == "download":
                async with self.page.expect_download() as dl:
                    await self.page.click(args)
                download = await dl.value
                path = await download.path()
                return f"OK downloaded {path}"
            
            # PDF
            elif action == "pdf":
                path = args if args else f"page_{int(datetime.now().timestamp())}.pdf"
                await self.page.pdf(path=path)
                return f"OK {path}"
            
            # Viewport/Device
            elif action == "viewport":
                w, h = args.split("x")
                await self.page.set_viewport_size({"width": int(w), "height": int(h)})
                return f"OK viewport {w}x{h}"
            
            elif action == "mobile":
                await self.page.set_viewport_size({"width": 375, "height": 812})
                return "OK mobile viewport"
            
            # Mouse with visual cursor
            elif action == "hover":
                box = await self.page.locator(args).first.bounding_box()
                if box:
                    await self._smooth_move(box['x'] + box['width']/2, box['y'] + box['height']/2)
                await self.page.hover(args)
                return f"OK hovered {args}"
            
            elif action == "moveto":
                x, y = args.split(",")
                await self._smooth_move(float(x), float(y))
                return f"OK moved to ({x},{y})"
            
            elif action == "highlight":
                await self.page.evaluate(f"window._highlight(document.querySelector('{args}'))")
                return f"OK highlighted {args}"
            
            elif action == "unhighlight":
                await self.page.evaluate(f"window._unhighlight(document.querySelector('{args}'))")
                return f"OK unhighlighted {args}"
            
            elif action == "dblclick":
                await self.page.dblclick(args)
                return f"OK double-clicked {args}"
            
            # Keyboard
            elif action == "press":
                await self.page.keyboard.press(args)
                return f"OK pressed {args}"
            
            # iFrame
            elif action == "frame":
                frame = self.page.frame(name=args) or self.page.frame(url=lambda u: args in u)
                if frame:
                    return f"OK frame found"
                return "ERROR frame not found"
            
            # Network
            elif action == "blockrequests":
                await self.page.route("**/*", lambda route: route.abort() if args in route.request.url else route.continue_())
                return f"OK blocking {args}"
            
            # Geolocation
            elif action == "geo":
                lat, lon = args.split(",")
                await self.page.context.set_geolocation({"latitude": float(lat), "longitude": float(lon)})
                return f"OK geo {lat},{lon}"
            
            # Clipboard
            elif action == "clipboard":
                result = await self.page.evaluate("navigator.clipboard.readText()")
                return f"OK {result}"
            
            # Help
            elif action == "help":
                return "OK nav click type js cdp screenshot dom text url title scroll back forward reload wait cookies setcookie clearcookies localstorage setlocal consoleon dialogaccept dialogdismiss upload download pdf viewport mobile hover dblclick press frame blockrequests geo clipboard quit"
            
            elif action == "quit" or action == "exit":
                return "QUIT"
            
            else:
                return f"ERROR unknown command: {action}"
                
        except Exception as e:
            return f"ERROR {str(e)}"


async def main():
    browser = InteractiveBrowser()
    await browser.start()
    
    while True:
        try:
            # Read from stdin
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            if not line:
                break
                
            cmd = line.strip()
            if not cmd:
                continue
            
            # Execute and print result
            result = await browser.execute(cmd)
            print(result, flush=True)
            
            if result == "QUIT":
                break
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"ERROR {e}", flush=True)
    
    await browser.stop()


if __name__ == "__main__":
    asyncio.run(main())
