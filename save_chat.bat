@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Antigravity Chat SAVE (to ZIP)
echo ============================================
echo.

set "GEMINI_DIR=%USERPROFILE%\.gemini\antigravity"
set "SCRIPT_DIR=%~dp0"

:: Auto-detect most recent conversation
echo Detecting active conversation...
set "CONV_ID="
for /f "delims=" %%F in ('dir /b /o-d "%GEMINI_DIR%\conversations\*.pb" 2^>nul') do (
    if not defined CONV_ID set "CONV_ID=%%~nF"
)

if "%CONV_ID%"=="" (
    echo No conversations found!
    pause
    exit /b 1
)

set "TEMP_DIR=%TEMP%\antigravity_backup_%CONV_ID%"
set "ZIP_FILE=%SCRIPT_DIR%chat_%CONV_ID%.zip"

echo.
echo Found Conversation ID: %CONV_ID%
echo.

:: Create temp directory
rmdir /S /Q "%TEMP_DIR%" 2>nul
mkdir "%TEMP_DIR%"
mkdir "%TEMP_DIR%\conversations" 2>nul
mkdir "%TEMP_DIR%\annotations" 2>nul
mkdir "%TEMP_DIR%\brain" 2>nul

:: Copy conversation
echo Copying conversation...
copy /Y "%GEMINI_DIR%\conversations\%CONV_ID%.pb" "%TEMP_DIR%\conversations\" >nul 2>nul

:: Copy annotations
echo Copying annotations...
copy /Y "%GEMINI_DIR%\annotations\%CONV_ID%.pbtxt" "%TEMP_DIR%\annotations\" >nul 2>nul

:: Copy brain artifacts
echo Copying brain artifacts...
if exist "%GEMINI_DIR%\brain\%CONV_ID%" (
    xcopy /E /Y /Q "%GEMINI_DIR%\brain\%CONV_ID%\*" "%TEMP_DIR%\brain\%CONV_ID%\" >nul 2>nul
)

:: Save conversation ID
echo %CONV_ID%> "%TEMP_DIR%\conversation_id.txt"

:: Create zip
echo Creating zip...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

:: Cleanup
rmdir /S /Q "%TEMP_DIR%" 2>nul

echo.
echo ============================================
echo   SAVED: %ZIP_FILE%
echo ============================================
pause
