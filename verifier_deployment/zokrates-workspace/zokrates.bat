@echo off
echo Running ZoKrates commands on Windows...
set WORKSPACE=%~dp0
docker run --rm -v "%WORKSPACE%:/home/zokrates/workspace" zokrates/zokrates:latest /home/zokrates/.zokrates/bin/zokrates %*
