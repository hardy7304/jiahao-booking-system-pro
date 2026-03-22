@echo off
REM 確保 Cursor 啟動 MCP 時能找到 gcloud
set "GCLOUD_BIN=%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin"
if not exist "%GCLOUD_BIN%\gcloud.cmd" set "GCLOUD_BIN=%LOCALAPPDATA%\Google\Cloud SDK\bin"
if not exist "%GCLOUD_BIN%\gcloud.cmd" set "GCLOUD_BIN=C:\Users\張嘉豪\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"
if not exist "%GCLOUD_BIN%\gcloud.cmd" set "GCLOUD_BIN=C:\Users\張嘉豪\AppData\Local\Google\Cloud SDK\bin"
set "PATH=%GCLOUD_BIN%;%PATH%"
npx -y stitch-mcp
