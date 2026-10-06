@echo off
cd /d "%~dp0"
py -3 DougDrive.py
if errorlevel 1 python DougDrive.py
