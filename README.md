# Private viewport dashboard

Clean Next.js rebuild for:

- 4chan read-only viewport with image filename buttons and permanent Neon-backed deletes
- DreamViews read-only forum/thread viewport with permanent Neon-backed deletes
- Local movie player that only works when the movie server is running on this PC
- YouTube text-only browser with no thumbnails/images
- Local PC LLM usable from Vercel/phone through a secure tunnel

## Install

```bat
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Required Vercel/local env vars

Copy `.env.example` to `.env.local` locally.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
YOUTUBE_API_KEY="your_youtube_data_api_key"
```

The delete buttons write rows to a `deleted_items` table in Neon. The app creates the table automatically. There is no unhide/clear route in the app. A database owner could still manually remove rows with SQL, so it is app-irreversible, not mathematically impossible.

## Local PC LLM from Vercel / phone

This is the important architecture:

```text
phone/browser -> Vercel website -> your public tunnel URL -> your PC bridge -> Ollama/local model
```

It is free for model usage because the model runs on your PC. It only works while your PC, Ollama, the bridge, and the tunnel are running.

### 1. Install and run Ollama

Pull a model once:

```bat
ollama pull llama3.1
```

Start the Ollama app or run Ollama in the background.

### 2. Start the local bridge on your PC

Use a long random secret. The same value must be in Vercel as `LOCAL_LLM_TOKEN`.

```bat
set LOCAL_LLM_MODEL=llama3.1
set LOCAL_LLM_TOKEN=change-this-long-random-secret
npm run local:llm
```

The bridge listens on:

```text
http://127.0.0.1:43111
```

### 3. Create a public HTTPS tunnel to the bridge

Example with Cloudflare Tunnel:

```bat
cloudflared tunnel --url http://127.0.0.1:43111
```

Copy the shown `https://...trycloudflare.com` URL.

### 4. Set Vercel env vars

```bat
npx vercel env add LOCAL_LLM_URL production
npx vercel env add LOCAL_LLM_TOKEN production
npx vercel env add LOCAL_LLM_MODEL production
npx vercel env add DASHBOARD_ACCESS_KEY production
npx vercel --prod
```

Use:

```text
LOCAL_LLM_URL=https://the-url-from-cloudflared
LOCAL_LLM_TOKEN=the-same-secret-from-your-PC
LOCAL_LLM_MODEL=llama3.1
DASHBOARD_ACCESS_KEY=optional-password-for-your-/llm-page
```

If you use a temporary `trycloudflare.com` URL, it changes when you restart the tunnel, so you must update `LOCAL_LLM_URL` in Vercel. For a stable URL, use a named tunnel/domain or another tunnel provider with a static domain.

## Local movie server

Only the movie server is local. Start it in a second CMD window:

```bat
set MOVIE_DIR=C:\Users\Jonas\Videos
npm run local:movies
```

Then open `/movies` in the dashboard. The local server supports range seeking and external `.vtt` / `.srt` subtitles that have the same basename as the video.

Example:

```text
Movie Name.mkv
Movie Name.en.srt
Movie Name.fi.vtt
```

Browser codec support still matters. MP4/H.264/AAC is the safest. Some MKV/AVI files may need conversion because Chrome cannot decode every codec/container.

## Deploy

```bat
npx vercel@latest
npx vercel@latest --prod
```

Make sure these are set in Vercel project environment variables:

```text
DATABASE_URL
YOUTUBE_API_KEY
LOCAL_LLM_URL
LOCAL_LLM_TOKEN
LOCAL_LLM_MODEL
```
