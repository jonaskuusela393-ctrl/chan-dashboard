@echo off
REM Start Ollama first in another window, or let the Ollama app run in the background.
REM Pull a model once with: ollama pull llama3.1

set LOCAL_LLM_MODEL=llama3.1
set LOCAL_LLM_TOKEN=change-this-long-random-secret
set LOCAL_LLM_BRIDGE_PORT=43111
set OLLAMA_URL=http://127.0.0.1:11434

node local\llm-bridge.mjs
pause
