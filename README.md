# pbD - Browser Automation Framework

AI-powered browser automation using Chrome DevTools Protocol (CDP) and Chrome Extension.

## Structure

```
pbD/
├── src/                    # Python source files
│   ├── cdp_client.py       # Enterprise CDP client (direct Chrome control)
│   ├── browser_executor.py # Playwright-based AI decision loop
│   ├── browser_interactive.py # Interactive terminal control
│   ├── extension_server.py # WebSocket bridge (port 9333)
│   ├── launch_chrome.py    # Chrome launcher with extension
│   ├── install_extension.py # Extension installer
│   └── a1.py               # File-based AI trigger system
├── extension/              # Chrome extension (Manifest v3)
│   ├── manifest.json
│   ├── background.js       # Service worker
│   └── content.js          # DOM injection/stealth
└── .agent/                 # Agent skills & workflows
```

## Quick Start

```bash
# 1. Launch Chrome with extension + CDP
python src/launch_chrome.py

# 2. Start WebSocket bridge
python src/extension_server.py

# 3. Interactive CDP control
python src/cdp_client.py
```

## Features

- **CDP Direct Control**: Navigate, click, type, screenshot via Chrome DevTools Protocol
- **Extension Bridge**: Real-time DOM streaming, stealth mode, screenshot streaming
- **Human-like Actions**: Bezier curve mouse movements, realistic typing delays
- **Anti-Bot Evasion**: Overrides `navigator.webdriver`, fakes plugins/languages
