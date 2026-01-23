@echo off
echo ========================================
echo  pbD Browser Automation - Setup
echo ========================================
echo.

echo [1/3] Installing Python dependencies...
pip install -r requirements.txt

echo.
echo [2/3] Installing Playwright browsers...
playwright install chromium

echo.
echo [3/3] Setup complete!
echo.
echo To use:
echo   python src\launch_chrome.py      - Launch Chrome with extension
echo   python src\cdp_client.py         - Interactive CDP control
echo   python src\extension_server.py   - Start WebSocket bridge
echo.
pause
