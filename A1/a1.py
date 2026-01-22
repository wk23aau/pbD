"""
A1 - Antigravity Agent Interface v2.0
With error handling, retry logic, and SQLite logging
"""

import time
import os
import hashlib
import sqlite3
import ctypes
import pyautogui
import pyperclip
import win32gui
import win32con
from pywinauto.findwindows import find_windows
from datetime import datetime

pyautogui.FAILSAFE = False

# Configuration
ARTIFACT_DIR = r"C:\Users\wk23aau\.gemini\antigravity\brain\71cf46f0-82ad-414c-aa2b-20eae562e97a"
PROMPT_FILE = os.path.join(ARTIFACT_DIR, "hello_world.md")
RESPONSE_FILE = os.path.join(ARTIFACT_DIR, "response.md")
DB_FILE = os.path.join(ARTIFACT_DIR, "jarvis.db")


def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS conversations
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  timestamp TEXT,
                  prompt TEXT,
                  response TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  timestamp TEXT,
                  level TEXT,
                  message TEXT)''')
    conn.commit()
    conn.close()
    print(f"📁 DB initialized: {DB_FILE}")


def log_to_db(level, message):
    """Log message to database"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)",
                  (datetime.now().isoformat(), level, message))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB log error: {e}")


def save_conversation(prompt, response):
    """Save conversation to database"""
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("INSERT INTO conversations (timestamp, prompt, response) VALUES (?, ?, ?)",
                  (datetime.now().isoformat(), prompt, response))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"DB save error: {e}")


def get_file_hash(filepath):
    """Get MD5 hash of file content"""
    if not os.path.exists(filepath):
        return None
    with open(filepath, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()


def focus_antigravity():
    """Find and focus the Antigravity window"""
    handles = find_windows(title_re=".*Antigravity.*", visible_only=True)
    if not handles:
        log_to_db("error", "No Antigravity window found")
        return None
    
    handle = handles[0]
    
    try:
        ctypes.windll.user32.AllowSetForegroundWindow(-1)
        
        if win32gui.IsIconic(handle):
            win32gui.ShowWindow(handle, win32con.SW_RESTORE)
            time.sleep(0.2)
        
        win32gui.ShowWindow(handle, win32con.SW_SHOW)
        win32gui.BringWindowToTop(handle)
        
        for _ in range(3):
            try:
                win32gui.SetForegroundWindow(handle)
                break
            except:
                time.sleep(0.1)
        
        time.sleep(0.3)
        
        rect = win32gui.GetWindowRect(handle)
        center_x = (rect[0] + rect[2]) // 2
        center_y = (rect[1] + rect[3]) // 2
        pyautogui.click(center_x, center_y)
        time.sleep(0.2)
        
        return handle
        
    except Exception as e:
        log_to_db("error", f"Focus error: {e}")
        try:
            rect = win32gui.GetWindowRect(handle)
            center_x = (rect[0] + rect[2]) // 2
            center_y = (rect[1] + rect[3]) // 2
            pyautogui.click(center_x, center_y)
            time.sleep(0.3)
            return handle
        except:
            return None


def detect_error_dialog():
    """Check if error dialog is visible by scanning for key text"""
    try:
        # Method 1: Try to find "Retry" button image if we have it
        try:
            retry_location = pyautogui.locateOnScreen('retry_button.png', confidence=0.8)
            if retry_location:
                return pyautogui.center(retry_location)
        except:
            pass
        
        # Method 2: Look for the error text on screen via OCR (requires pytesseract)
        # For now, we'll scan the Antigravity window area for the button
        handles = find_windows(title_re=".*Antigravity.*", visible_only=True)
        if handles:
            rect = win32gui.GetWindowRect(handles[0])
            # Error dialog typically appears at bottom of window
            # The Retry button is blue and on the right side
            # Approximate location based on typical dialog position
            retry_x = rect[2] - 100  # 100px from right edge
            retry_y = rect[3] - 50   # 50px from bottom
            
            # Check if we're in a reasonable window area
            if retry_x > rect[0] and retry_y > rect[1]:
                return (retry_x, retry_y)
    except Exception as e:
        log_to_db("debug", f"Error detection: {e}")
    return None


def click_retry(max_attempts=3):
    """Attempt to click retry button"""
    for attempt in range(max_attempts):
        log_to_db("info", f"Checking for error dialog, attempt {attempt + 1}")
        
        # First focus the Antigravity window
        handles = find_windows(title_re=".*Antigravity.*", visible_only=True)
        if not handles:
            continue
            
        handle = handles[0]
        try:
            win32gui.SetForegroundWindow(handle)
        except:
            pass
        time.sleep(0.3)
        
        # Try to click approximate Retry button location
        rect = win32gui.GetWindowRect(handle)
        
        # Error dialog Retry button is typically:
        # - In lower right area of the chat panel
        # - Blue button with "Retry" text
        retry_x = rect[2] - 80   # Near right edge
        retry_y = rect[3] - 60   # Near bottom
        
        log_to_db("debug", f"Clicking retry at ({retry_x}, {retry_y})")
        pyautogui.click(retry_x, retry_y)
        time.sleep(2)
        
    log_to_db("warning", f"Completed {max_attempts} retry attempts")
    return True  # Continue anyway


def send_trigger(max_retries=3):
    """Send '.' trigger to Antigravity chat with retry"""
    for attempt in range(max_retries):
        handle = focus_antigravity()
        if not handle:
            log_to_db("warning", f"Focus failed, attempt {attempt + 1}")
            time.sleep(1)
            continue
        
        # Focus chat input (Ctrl+L)
        pyautogui.hotkey('ctrl', 'l')
        time.sleep(0.3)
        
        # Send trigger
        pyperclip.copy('.')
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.1)
        pyautogui.press('enter')
        
        log_to_db("info", "Trigger sent successfully")
        print("✅ Trigger sent")
        return True
    
    log_to_db("error", "Failed to send trigger after retries")
    return False


def watch_and_trigger(poll_interval=0.5):
    """Watch prompt file and trigger AI on changes"""
    print("🤖 A1 JARVIS Interface v2.0")
    print("=" * 40)
    print(f"📁 Prompt: {PROMPT_FILE}")
    print(f"📁 Response: {RESPONSE_FILE}")
    print(f"📁 Database: {DB_FILE}")
    print("=" * 40)
    print("\nEdit hello_world.md to send messages")
    print("Press Ctrl+C to stop\n")
    
    init_db()
    log_to_db("info", "A1 started")
    
    last_hash = get_file_hash(PROMPT_FILE)
    last_response_hash = get_file_hash(RESPONSE_FILE)
    
    while True:
        try:
            time.sleep(poll_interval)
            
            # Check for prompt changes
            current_hash = get_file_hash(PROMPT_FILE)
            
            if current_hash != last_hash:
                timestamp = time.strftime("%H:%M:%S")
                print(f"[{timestamp}] 📝 Change detected!")
                
                with open(PROMPT_FILE, 'r', encoding='utf-8') as f:
                    prompt_content = f.read()
                
                log_to_db("info", f"Prompt changed: {prompt_content[:100]}...")
                
                if send_trigger():
                    print(f"[{timestamp}] ⚡ AI triggered!")
                else:
                    print(f"[{timestamp}] ⚠️ Trigger failed, will retry")
                    # Write error to response file
                    with open(RESPONSE_FILE, 'w', encoding='utf-8') as f:
                        f.write("# ⚠️ Error\n\nFailed to trigger AI. Please retry manually.\n")
                
                last_hash = current_hash
            
            # Check for response changes (for logging)
            current_response_hash = get_file_hash(RESPONSE_FILE)
            if current_response_hash != last_response_hash:
                with open(RESPONSE_FILE, 'r', encoding='utf-8') as f:
                    response_content = f.read()
                with open(PROMPT_FILE, 'r', encoding='utf-8') as f:
                    prompt_content = f.read()
                save_conversation(prompt_content, response_content)
                last_response_hash = current_response_hash
                
        except KeyboardInterrupt:
            log_to_db("info", "A1 shutdown")
            print("\n\n👋 A1 shutting down")
            break
        except Exception as e:
            log_to_db("error", str(e))
            print(f"❌ Error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--logs":
            # Show recent logs
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            for row in c.execute("SELECT * FROM logs ORDER BY id DESC LIMIT 20"):
                print(row)
            conn.close()
        else:
            # Quick prompt mode
            init_db()
            prompt = " ".join(sys.argv[1:])
            with open(PROMPT_FILE, 'w', encoding='utf-8') as f:
                f.write(f"# 📝 JARVIS Prompt\n\n{prompt}\n")
            log_to_db("info", f"Quick prompt: {prompt}")
            send_trigger()
    else:
        watch_and_trigger()
