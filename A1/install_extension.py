"""
Auto-install Chrome extension via native messaging host
This bypasses the need for manual developer mode setup
"""

import os
import sys
import json
import winreg
import shutil

EXTENSION_ID = "jarvis_browser_bridge"
EXTENSION_PATH = os.path.join(os.path.dirname(__file__), "extension")


def install_native_messaging_host():
    """Install native messaging host for Chrome extension communication"""
    
    # Native messaging host manifest
    host_manifest = {
        "name": "com.jarvis.browser",
        "description": "JARVIS Browser Bridge Native Host",
        "path": os.path.join(os.path.dirname(__file__), "native_host.bat"),
        "type": "stdio",
        "allowed_origins": [
            f"chrome-extension://{EXTENSION_ID}/"
        ]
    }
    
    # Save manifest
    manifest_path = os.path.join(os.path.dirname(__file__), "com.jarvis.browser.json")
    with open(manifest_path, 'w') as f:
        json.dump(host_manifest, f, indent=2)
    
    # Create batch file for native host
    batch_path = os.path.join(os.path.dirname(__file__), "native_host.bat")
    python_path = sys.executable
    host_script = os.path.join(os.path.dirname(__file__), "native_host.py")
    
    with open(batch_path, 'w') as f:
        f.write(f'@echo off\n"{python_path}" "{host_script}"\n')
    
    # Register in Windows registry
    try:
        key_path = r"SOFTWARE\Google\Chrome\NativeMessagingHosts\com.jarvis.browser"
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
        winreg.SetValueEx(key, "", 0, winreg.REG_SZ, manifest_path)
        winreg.CloseKey(key)
        print("✅ Native messaging host registered")
    except Exception as e:
        print(f"⚠️ Registry setup failed: {e}")
        print("  Run as administrator or use manual install")


def create_chrome_policy():
    """Create Chrome policy to force-install extension (requires admin)"""
    
    try:
        # Extension policy key
        key_path = r"SOFTWARE\Policies\Google\Chrome\ExtensionInstallAllowlist"
        key = winreg.CreateKey(winreg.HKEY_LOCAL_MACHINE, key_path)
        
        # Count existing entries
        i = 0
        try:
            while True:
                winreg.EnumValue(key, i)
                i += 1
        except:
            pass
        
        # Add our extension
        winreg.SetValueEx(key, str(i + 1), 0, winreg.REG_SZ, EXTENSION_ID)
        winreg.CloseKey(key)
        
        print("✅ Chrome policy created (extension allowed)")
    except PermissionError:
        print("⚠️ Admin rights required for Chrome policy")
    except Exception as e:
        print(f"⚠️ Policy setup failed: {e}")


def main():
    print("🤖 JARVIS Browser Extension Auto-Installer")
    print("=" * 50)
    
    # Check extension folder exists
    if not os.path.exists(EXTENSION_PATH):
        print(f"❌ Extension not found: {EXTENSION_PATH}")
        return
    
    print(f"📦 Extension: {EXTENSION_PATH}")
    
    # Install native messaging host
    install_native_messaging_host()
    
    # Try Chrome policy (needs admin)
    create_chrome_policy()
    
    print()
    print("✅ Installation complete!")
    print()
    print("Next steps:")
    print("1. Close all Chrome windows")
    print("2. Run: python A1/launch_chrome.py")
    print("3. Extension should auto-load!")


if __name__ == "__main__":
    main()
