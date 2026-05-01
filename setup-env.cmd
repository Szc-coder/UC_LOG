@echo off
REM UC Log 开发环境配置脚本

SET UC_ROOT=%~dp0
SET PATH=%UC_ROOT%.node;%UC_ROOT%.npm-global;%UC_ROOT%.cargo\bin;%PATH%
SET RUSTUP_HOME=%UC_ROOT%.rustup
SET CARGO_HOME=%UC_ROOT%.cargo

echo ========================================
echo   UC Log 开发环境已配置
echo ========================================
echo.
echo Node.js:  %UC_ROOT%.node\node.exe
echo npm:      %UC_ROOT%.node\npm.cmd
echo Rust:     %UC_ROOT%.cargo\bin\rustc.exe
echo Cargo:    %UC_ROOT%.cargo\bin\cargo.exe
echo Tauri:    %UC_ROOT%.npm-global\tauri.cmd
echo.
echo 使用方法:
echo   node --version
echo   npm --version
echo   rustc --version
echo   cargo --version
echo   tauri --version
echo ========================================
