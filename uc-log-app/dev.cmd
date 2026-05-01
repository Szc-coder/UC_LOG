@echo off
SET PATH=D:\Code_job\UC_log\.node;D:\Code_job\UC_log\.npm-global;D:\Code_job\UC_log\.cargo\bin;%%PATH%%
SET RUSTUP_HOME=D:\Code_job\UC_log\.rustup
SET CARGO_HOME=D:\Code_job\UC_log\.cargo

echo Starting UC Log dev server...
D:\Code_job\UC_log\.npm-global\tauri.cmd dev