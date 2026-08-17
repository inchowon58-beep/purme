@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "EXE=%~dp0dist\푸르메정원웹문서생성기\푸르메정원웹문서생성기.exe"

if exist "%EXE%" (
  echo 푸르메정원 웹문서생성기 실행 중...
  start "" "%EXE%"
  exit /b 0
)

echo [안내] 실행파일이 없습니다. 지금 빌드합니다. (수 분 소요)
call "%~dp0build_exe.bat"
if errorlevel 1 (
  echo 빌드 실패. Python 과 pip 가 설치돼 있는지 확인하세요.
  pause
  exit /b 1
)

if exist "%EXE%" (
  start "" "%EXE%"
) else (
  echo 빌드는 됐지만 exe 경로를 찾지 못했습니다.
  echo 폴더: %~dp0dist\푸르메정원웹문서생성기\
  pause
)
exit /b 0
