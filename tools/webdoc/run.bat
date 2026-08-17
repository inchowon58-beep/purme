@echo off
chcp 65001 >nul
cd /d "%~dp0"
REM 개발용: Python으로 직접 실행 (exe 없이)
python -m pip install -q -r requirements.txt >=nul 2>&1
python app.py
pause
