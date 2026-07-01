@echo off
cd /d %~dp0\..
echo Starting local movie server and local LLM bridge.
echo Movie folder is controlled by MOVIE_DIR. Edit .env.example into .env.local style commands if needed.
start "movie-server" cmd /k "node local\movie-server.mjs"
start "llm-bridge" cmd /k "node local\llm-bridge.mjs"
