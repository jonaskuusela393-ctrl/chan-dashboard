@echo off
REM Requires cloudflared installed.
REM This creates a temporary public HTTPS URL. Copy the https://...trycloudflare.com URL into Vercel as LOCAL_LLM_URL.
cloudflared tunnel --url http://127.0.0.1:43111
pause
