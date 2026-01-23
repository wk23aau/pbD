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

:: Generate restore_chat.bat inside the zip
echo Generating restore script...
(
echo @echo off
echo setlocal enabledelayedexpansion
echo.
echo echo ============================================
echo echo   Antigravity Chat RESTORE
echo echo   Conversation ID: %CONV_ID%
echo echo ============================================
echo echo.
echo.
echo set "GEMINI_DIR=%%USERPROFILE%%\.gemini\antigravity"
echo set "SCRIPT_DIR=%%~dp0"
echo.
echo echo Target directory: %%GEMINI_DIR%%
echo echo.
echo.
echo :: Create directories
echo echo Creating directories...
echo if not exist "%%GEMINI_DIR%%\conversations" mkdir "%%GEMINI_DIR%%\conversations"
echo if not exist "%%GEMINI_DIR%%\annotations" mkdir "%%GEMINI_DIR%%\annotations"
echo if not exist "%%GEMINI_DIR%%\brain\%CONV_ID%" mkdir "%%GEMINI_DIR%%\brain\%CONV_ID%"
echo.
echo :: Copy conversation
echo echo Restoring conversation...
echo copy /Y "%%SCRIPT_DIR%%conversations\%CONV_ID%.pb" "%%GEMINI_DIR%%\conversations\" ^>nul
echo.
echo :: Copy annotations
echo echo Restoring annotations...
echo copy /Y "%%SCRIPT_DIR%%annotations\%CONV_ID%.pbtxt" "%%GEMINI_DIR%%\annotations\" ^>nul 2^>nul
echo.
echo :: Copy brain artifacts
echo echo Restoring brain artifacts...
echo if exist "%%SCRIPT_DIR%%brain\%CONV_ID%" (
echo     xcopy /E /Y /Q "%%SCRIPT_DIR%%brain\%CONV_ID%\*" "%%GEMINI_DIR%%\brain\%CONV_ID%\" ^>nul 2^>nul
echo ^)
echo.
echo echo.
echo echo ============================================
echo echo   RESTORE COMPLETE!
echo echo ============================================
echo echo.
echo echo Restart Antigravity to see the restored conversation.
echo echo.
echo pause
) > "%TEMP_DIR%\restore_chat.bat"

:: Create zip
echo Creating zip...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"

:: Cleanup
rmdir /S /Q "%TEMP_DIR%" 2>nul

echo.
echo ============================================
echo   SAVED: %ZIP_FILE%
echo ============================================
echo.
echo The zip includes restore_chat.bat - just extract
echo and run it on any PC to restore the conversation!
echo.
pause
