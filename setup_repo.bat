@echo off
echo ==========================================
echo   Morgan v18.6 - Repository Setup Script
echo ==========================================

:: 1. Check if Git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please download and install Git for Windows: https://git-scm.com/download/win
    echo After installing, restart your terminal or computer and run this script again.
    pause
    exit /b
)

echo [OK] Git is installed.

:: 2. Initialize Repository
if not exist ".git" (
    echo [INFO] Initializing new Git repository...
    git init
) else (
    echo [INFO] Git repository already initialized.
)

:: 3. Configure Git Identity (Local to this repo)
echo [INFO] Configuring Git identity...
git config user.email "aifusionlabs@gmail.com"
git config user.name "AI Fusion Labs"

:: 4. FIX: Remove Secret File from Git Index (if it exists)
echo [INFO] Ensuring secrets are not tracked...
git rm --cached wide-world-454314-d1-49e10dbd8fb4.json 2>nul

:: 5. Add all files (updates .gitignore)
echo [INFO] Adding files to staging...
git add .

:: 6. Commit (Amend to scrub history OR standard commit)
echo [INFO] Committing files...
git commit -m "UI: Add AI disclaimer to landing page and video overlay" --allow-empty

:: 7. Add Remote (Ignore if exists)
echo [INFO] Configuring remote origin...
git remote add origin https://github.com/aifusionlabs25/tavus-app.git 2>nul

:: 8. Push
echo [INFO] Pushing to GitHub (main branch)...
git branch -M main
git push -u origin main

:: 9. Create Checkpoint Tag
echo [INFO] Creating Checkpoint Tag: Morganv18.6-demo-TavusTTS-v1-Dev-stable
git tag -f Morganv18.6-demo-TavusTTS-v1-Dev-stable
git push --force origin Morganv18.6-demo-TavusTTS-v1-Dev-stable

echo ==========================================
if %errorlevel% equ 0 (
    echo [SUCCESS] Code pushed to GitHub successfully! 🚀
) else (
    echo [ERROR] Push failed. Please check your internet connection or GitHub credentials.
)
echo ==========================================
pause
