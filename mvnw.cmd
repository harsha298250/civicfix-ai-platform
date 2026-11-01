@echo off
if exist "%~dp0backend\mvnw.cmd" (
  cd "%~dp0backend"
  call "%~dp0backend\mvnw.cmd" %*
) else (
  echo Error: backend\mvnw.cmd not found >&2
  exit /b 1
)
