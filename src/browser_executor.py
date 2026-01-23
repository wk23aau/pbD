"""
Browser Executor v1.0
Playwright-based browser automation for JARVIS

Protocol:
- Writes browser_state.json (current state)
- Reads actions.json (AI decisions)
- Executes actions
- Loops until "done"
"""

import json
import os
import time
import asyncio
import random
import math
from datetime import datetime


def bezier_point(t, p0, p1, p2, p3):
    """Calculate point on cubic bezier curve"""
    return (
        (1-t)**3 * p0 +
        3 * (1-t)**2 * t * p1 +
        3 * (1-t) * t**2 * p2 +
        t**3 * p3
    )


# Check for Playwright
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("⚠️  Playwright not installed. Run: pip install playwright && playwright install")

# Configuration
ARTIFACT_DIR = r"C:\Users\wk23aau\.gemini\antigravity\brain\71cf46f0-82ad-414c-aa2b-20eae562e97a"
STATE_FILE = os.path.join(ARTIFACT_DIR, "browser_state.json")
ACTIONS_FILE = os.path.join(ARTIFACT_DIR, "actions.json")
SCREENSHOTS_DIR = os.path.join(ARTIFACT_DIR, "screenshots")


class BrowserExecutor:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.cdp_session = None
        self.iteration = 0
        
    async def start(self, headless=False):
        """Start browser"""
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright not installed")
        
        os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
        
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=headless)
        self.context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 720}
        )
        self.page = await self.context.new_page()
        
        # Initialize CDP session for direct protocol access
        self.cdp_session = await self.context.new_cdp_session(self.page)
        print("🌐 Browser started (CDP enabled)")
        
    async def stop(self):
        """Stop browser"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        print("🌐 Browser stopped")
        
    async def capture_state(self, task=""):
        """Capture current browser state and save to JSON"""
        self.iteration += 1
        
        # Take screenshot
        screenshot_path = os.path.join(SCREENSHOTS_DIR, f"{self.iteration:03d}.png")
        await self.page.screenshot(path=screenshot_path)
        
        # Get page info
        url = self.page.url
        title = await self.page.title()
        
        # Extract key elements (simplified DOM)
        elements = await self._extract_elements()
        
        state = {
            "iteration": self.iteration,
            "timestamp": datetime.now().isoformat(),
            "task": task,
            "url": url,
            "title": title,
            "screenshot": screenshot_path,
            "elements": elements
        }
        
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2)
        
        print(f"📸 State captured: {url}")
        return state
    
    async def _extract_elements(self):
        """Extract interactive elements from page - expanded"""
        elements = {
            "buttons": [],
            "links": [],
            "inputs": [],
            "selects": [],
            "headings": [],
            "images": []
        }
        
        # Buttons (all)
        buttons = await self.page.query_selector_all('button, [role="button"], input[type="submit"]')
        for i, btn in enumerate(buttons):
            text = await btn.text_content() or ""
            try:
                elements["buttons"].append({
                    "index": i,
                    "text": text.strip()[:50],
                    "selector": f'button:nth-of-type({i+1})'
                })
            except:
                pass
                
        # Links (all)
        links = await self.page.query_selector_all('a[href]')
        for i, link in enumerate(links):
            text = await link.text_content() or ""
            href = await link.get_attribute('href') or ""
            try:
                elements["links"].append({
                    "index": i,
                    "text": text.strip()[:50],
                    "href": href[:100]
                })
            except:
                pass
                
        # Inputs (all)
        inputs = await self.page.query_selector_all('input:not([type="hidden"]), textarea')
        for i, inp in enumerate(inputs):
            placeholder = await inp.get_attribute('placeholder') or ""
            inp_type = await inp.get_attribute('type') or "text"
            name = await inp.get_attribute('name') or ""
            try:
                elements["inputs"].append({
                    "index": i,
                    "type": inp_type,
                    "name": name,
                    "placeholder": placeholder[:50]
                })
            except:
                pass
                
        # Selects (all)
        selects = await self.page.query_selector_all('select')
        for i, sel in enumerate(selects):
            name = await sel.get_attribute('name') or ""
            elements["selects"].append({
                "index": i,
                "name": name
            })
        
        # Headings (all)
        headings = await self.page.query_selector_all('h1, h2, h3, h4')
        for i, h in enumerate(headings):
            text = await h.text_content() or ""
            tag = await h.evaluate('el => el.tagName.toLowerCase()')
            try:
                elements["headings"].append({
                    "index": i,
                    "tag": tag,
                    "text": text.strip()[:100]
                })
            except:
                pass
        
        # Images (all)
        images = await self.page.query_selector_all('img[src]')
        for i, img in enumerate(images):
            alt = await img.get_attribute('alt') or ""
            src = await img.get_attribute('src') or ""
            try:
                elements["images"].append({
                    "index": i,
                    "alt": alt[:50],
                    "src": src[:100]
                })
            except:
                pass
            
        return elements
    
    async def _dismiss_cookie_banner(self):
        """Try to dismiss common cookie consent banners"""
        cookie_selectors = [
            'button:has-text("Accept all")',
            'button:has-text("Reject all")',
            'button:has-text("Accept")',
            'button:has-text("I agree")',
            '[id*="accept"]',
        ]
        
        for selector in cookie_selectors:
            try:
                btn = self.page.locator(selector).first
                if await btn.is_visible(timeout=1000):
                    await btn.click()
                    print("🍪 Cookie banner dismissed")
                    return True
            except:
                continue
        return False
    
    async def _human_type(self, selector, text):
        """Type text into element"""
        await self.page.click(selector)
        await self.page.keyboard.type(text)
    
    async def execute_action(self, action):
        """Execute a single action"""
        action_type = action.get("type", "")
        
        try:
            if action_type == "navigate":
                url = action.get("url", "")
                await self.page.goto(url, wait_until="domcontentloaded")
                # Auto-dismiss cookie banners after navigation
                await self._dismiss_cookie_banner()
                return {"status": "success", "message": f"Navigated to {url}"}
            
            elif action_type == "dismiss_cookies":
                await self._dismiss_cookie_banner()
                return {"status": "success", "message": "Attempted cookie banner dismissal"}
                
            elif action_type == "click":
                selector = action.get("selector", "")
                text = action.get("text", "")
                if text:
                    await self.page.get_by_text(text, exact=False).first.click()
                elif selector:
                    await self.page.click(selector)
                return {"status": "success", "message": f"Clicked {selector or text}"}
                
            elif action_type == "type":
                selector = action.get("selector", "")
                text = action.get("text", "")
                await self.page.fill(selector, text)
                return {"status": "success", "message": f"Typed '{text[:20]}...'"}
            
            elif action_type == "human_type":
                selector = action.get("selector", "")
                text = action.get("text", "")
                await self._human_type(selector, text)
                return {"status": "success", "message": f"Human-typed '{text[:20]}...'"}
                
            elif action_type == "press":
                key = action.get("key", "Enter")
                await self.page.keyboard.press(key)
                return {"status": "success", "message": f"Pressed {key}"}
            
            # Rich locators (subagent-style)
            elif action_type == "click_role":
                role = action.get("role", "button")
                name = action.get("name", "")
                await self.page.get_by_role(role, name=name).first.click()
                return {"status": "success", "message": f"Clicked role={role} name={name}"}
            
            elif action_type == "click_placeholder":
                placeholder = action.get("placeholder", "")
                await self.page.get_by_placeholder(placeholder).first.click()
                return {"status": "success", "message": f"Clicked placeholder={placeholder}"}
            
            elif action_type == "fill_placeholder":
                placeholder = action.get("placeholder", "")
                text = action.get("text", "")
                await self.page.get_by_placeholder(placeholder).first.fill(text)
                return {"status": "success", "message": f"Filled placeholder={placeholder}"}
            
            elif action_type == "wait_for_text":
                text = action.get("text", "")
                timeout = action.get("timeout", 10000)
                await self.page.get_by_text(text).first.wait_for(timeout=timeout)
                return {"status": "success", "message": f"Found text: {text}"}
            
            elif action_type == "scroll_to_text":
                text = action.get("text", "")
                element = self.page.get_by_text(text).first
                await element.scroll_into_view_if_needed()
                return {"status": "success", "message": f"Scrolled to: {text}"}
                
            elif action_type == "scroll":
                direction = action.get("direction", "down")
                amount = action.get("amount", 300)
                if direction == "down":
                    await self.page.mouse.wheel(0, amount)
                else:
                    await self.page.mouse.wheel(0, -amount)
                return {"status": "success", "message": f"Scrolled {direction}"}
                
            elif action_type == "wait":
                # No-op: delays removed
                return {"status": "success", "message": "Wait skipped (no delays)"}
                
            elif action_type == "screenshot":
                name = action.get("name", f"manual_{self.iteration}")
                path = os.path.join(SCREENSHOTS_DIR, f"{name}.png")
                await self.page.screenshot(path=path)
                return {"status": "success", "message": f"Screenshot: {path}"}
            
            # Subagent-style features
            elif action_type == "execute_js":
                js_code = action.get("code", "")
                result = await self.page.evaluate(js_code)
                return {"status": "success", "message": f"JS result: {str(result)[:100]}"}
            
            elif action_type == "get_dom":
                html = await self.page.content()
                # Save to file for analysis
                dom_path = os.path.join(ARTIFACT_DIR, "page_dom.html")
                with open(dom_path, 'w', encoding='utf-8') as f:
                    f.write(html)
                return {"status": "success", "message": f"DOM saved: {dom_path} ({len(html)} chars)"}
            
            elif action_type == "get_page_text":
                text = await self.page.inner_text('body')
                text_path = os.path.join(ARTIFACT_DIR, "page_text.txt")
                with open(text_path, 'w', encoding='utf-8') as f:
                    f.write(text)
                return {"status": "success", "message": f"Text saved: {len(text)} chars"}
            
            # Navigation
            elif action_type == "go_back":
                await self.page.go_back()
                return {"status": "success", "message": "Went back"}
            
            elif action_type == "go_forward":
                await self.page.go_forward()
                return {"status": "success", "message": "Went forward"}
            
            elif action_type == "reload":
                await self.page.reload()
                return {"status": "success", "message": "Page reloaded"}
            
            # Mouse
            elif action_type == "mouse_move":
                x = action.get("x", 0)
                y = action.get("y", 0)
                await self.page.mouse.move(x, y)
                return {"status": "success", "message": f"Mouse moved to ({x}, {y})"}
            
            elif action_type == "mouse_click":
                x = action.get("x", 0)
                y = action.get("y", 0)
                await self.page.mouse.click(x, y)
                return {"status": "success", "message": f"Mouse clicked at ({x}, {y})"}
            
            elif action_type == "mouse_drag":
                x1 = action.get("x1", 0)
                y1 = action.get("y1", 0)
                x2 = action.get("x2", 0)
                y2 = action.get("y2", 0)
                await self.page.mouse.move(x1, y1)
                await self.page.mouse.down()
                await self.page.mouse.move(x2, y2)
                await self.page.mouse.up()
                return {"status": "success", "message": f"Dragged ({x1},{y1}) to ({x2},{y2})"}
            
            # Wait functions
            elif action_type == "wait_for_selector":
                selector = action.get("selector", "")
                timeout = action.get("timeout", 10000)
                await self.page.wait_for_selector(selector, timeout=timeout)
                return {"status": "success", "message": f"Found selector: {selector}"}
            
            elif action_type == "wait_for_navigation":
                await self.page.wait_for_load_state("networkidle")
                return {"status": "success", "message": "Navigation complete"}
            
            # Select
            elif action_type == "select_option":
                selector = action.get("selector", "")
                value = action.get("value", "")
                await self.page.select_option(selector, value)
                return {"status": "success", "message": f"Selected {value}"}
            
            # Viewport
            elif action_type == "set_viewport":
                width = action.get("width", 1280)
                height = action.get("height", 720)
                await self.page.set_viewport_size({"width": width, "height": height})
                return {"status": "success", "message": f"Viewport set to {width}x{height}"}
            
            # PDF
            elif action_type == "save_pdf":
                name = action.get("name", "page")
                path = os.path.join(ARTIFACT_DIR, f"{name}.pdf")
                await self.page.pdf(path=path)
                return {"status": "success", "message": f"PDF saved: {path}"}
            
            # Focus/Hover
            elif action_type == "hover":
                selector = action.get("selector", "")
                await self.page.hover(selector)
                return {"status": "success", "message": f"Hovered: {selector}"}
            
            elif action_type == "focus":
                selector = action.get("selector", "")
                await self.page.focus(selector)
                return {"status": "success", "message": f"Focused: {selector}"}
            
            # CDP Direct Access
            elif action_type == "cdp_send":
                method = action.get("method", "")
                params = action.get("params", {})
                result = await self.cdp_session.send(method, params)
                return {"status": "success", "message": f"CDP {method}: {str(result)[:100]}"}
            
            # Inject script into page (runs immediately)
            elif action_type == "inject_script":
                script = action.get("script", "")
                await self.page.add_script_tag(content=script)
                return {"status": "success", "message": "Script injected"}
            
            # Run script and return result
            elif action_type == "run_analysis":
                script = action.get("script", "")
                result = await self.page.evaluate(script)
                # Save result to file
                result_path = os.path.join(ARTIFACT_DIR, "analysis_result.json")
                with open(result_path, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, default=str)
                return {"status": "success", "message": f"Analysis saved: {result_path}"}
                
            elif action_type == "done":
                return {"status": "done", "message": "Task complete"}
                
            else:
                return {"status": "error", "message": f"Unknown action: {action_type}"}
                
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def wait_for_actions(self, timeout=120):
        """Wait for actions.json to be written by AI"""
        start = time.time()
        last_mtime = 0
        
        if os.path.exists(ACTIONS_FILE):
            last_mtime = os.path.getmtime(ACTIONS_FILE)
        
        print("⏳ Waiting for AI to write actions.json...")
        
        while time.time() - start < timeout:
            if os.path.exists(ACTIONS_FILE):
                current_mtime = os.path.getmtime(ACTIONS_FILE)
                if current_mtime > last_mtime:
                    try:
                        with open(ACTIONS_FILE, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        return data
                    except:
                        continue
        
        return None
    
    async def run_task(self, task, max_iterations=10):
        """Run a browser task with AI decision loop"""
        print(f"\n🎯 Task: {task}")
        print("=" * 50)
        
        for i in range(max_iterations):
            print(f"\n--- Iteration {i+1}/{max_iterations} ---")
            
            # Capture state
            await self.capture_state(task)
            
            # Wait for AI actions
            actions_data = await self.wait_for_actions()
            
            if not actions_data:
                print("⏰ Timeout waiting for actions")
                break
            
            # Execute actions
            actions = actions_data.get("actions", [])
            thinking = actions_data.get("thinking", "")
            
            if thinking:
                print(f"💭 AI thinking: {thinking[:100]}...")
            
            done = False
            for action in actions:
                result = await self.execute_action(action)
                print(f"  → {action.get('type')}: {result['message']}")
                
                if result["status"] == "done":
                    done = True
                    break
                elif result["status"] == "error":
                    print(f"  ⚠️ Error: {result['message']}")
            
            if done:
                print("\n✅ Task completed!")
                break
        
        # Final state capture
        await self.capture_state(task)
        print("\n🏁 Browser task finished")


async def main():
    import sys
    
    if not PLAYWRIGHT_AVAILABLE:
        print("Please install Playwright: pip install playwright && playwright install")
        return
    
    task = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "Navigate to example.com"
    
    executor = BrowserExecutor()
    
    try:
        await executor.start(headless=False)
        await executor.run_task(task)
    finally:
        await executor.stop()


if __name__ == "__main__":
    asyncio.run(main())
