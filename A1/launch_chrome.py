"""
Launch Chrome with JARVIS extension pre-loaded
"""

import subprocess
import os
import sys

# Extension path
EXTENSION_PATH = os.path.join(os.path.dirname(__file__), "extension")

# Chrome executable paths to try
CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
]


def find_chrome():
    """Find Chrome executable"""
    for path in CHROME_PATHS:
        if os.path.exists(path):
            return path
    return None


def launch_chrome_with_extension(url="https://google.com"):
    """Launch Chrome with extension loaded"""
    chrome = find_chrome()
    
    if not chrome:
        print("❌ Chrome not found!")
        print("Install from: https://www.google.com/chrome/")
        return False
    
    # Persistent profile directory
    profile_dir = os.path.join(os.path.dirname(__file__), "chrome_profile")
    os.makedirs(profile_dir, exist_ok=True)
    
    # Chrome args to load extension with persistent profile
    args = [
        chrome,
        f"--user-data-dir={profile_dir}",
        f"--load-extension={EXTENSION_PATH}",
        "--no-first-run",
        "--no-default-browser-check",
        url
    ]
    
    print(f"🚀 Launching Chrome with JARVIS extension...")
    print(f"📦 Extension: {EXTENSION_PATH}")
    print(f"👤 Profile: {profile_dir}")
    
    subprocess.Popen(args)
    
    print("✅ Chrome launched!")
    print("🔌 Extension should be active - start extension_server.py to connect")
    
    return True


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "https://google.com"
    launch_chrome_with_extension(url)
