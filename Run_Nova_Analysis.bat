@echo off
title Nova Factory Analysis Engine
color 0A
echo ========================================================
echo   NOVA FACTORY ANALYSIS ENGINE 🦅
echo   Model: llama3:latest | GPU: RTX 5080
echo ========================================================
echo.

:: 1. Check/Start Ollama
echo [CHECK] Verifying Ollama Engine...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Ollama is already running.
) else (
    echo [INFO] Starting Ollama Server...
    start "Ollama Server" /min ollama serve
    echo [WAIT] Waiting 5 seconds for Ollama to spin up...
    timeout /t 5 /nobreak > NUL
)

:: 2. Run Phase 1: Analyzer
echo.
echo --------------------------------------------------------
echo [PHASE 1] Running Overnight Analyzer (Indexing Files)...
echo --------------------------------------------------------
python "C:\AI Fusion Labs\Tavus\API\tavus-app\tools\nova_overnight_analyzer.py"

:: 3. Run Phase 2: Synthesizer
echo.
echo --------------------------------------------------------
echo [PHASE 2] Running Strategic Synthesizer (30K View)...
echo --------------------------------------------------------
python "C:\AI Fusion Labs\Tavus\API\tavus-app\tools\nova_meta_synthesizer.py"

echo.
echo ========================================================
echo   ✅ MISSION COMPLETE
echo   Report: C:\AI Fusion Labs\Nova_Training_Corpus\00_Analysis_Results\30K_ALTITUDE_SYNTHESIS.md
echo ========================================================
echo.
pause
