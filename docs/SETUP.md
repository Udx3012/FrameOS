# FrameOS - Setup Guide

## Local Quickstart

```bash
npm install
npm run build        # tsc build
npm test             # run tests

# Run FrameOS CLI harness:
npm run frameos -- "make it vertical with a watermark" fixtures/sample.mp4   # EDIT
npm run frameos -- "why UPI beat credit cards in india"                     # GENERATE
npm run frameos -- "clip https://youtu.be/aqz-KE-bpKQ 0:02 to 0:06"         # CLIP (yt-dlp)
```

Each command outputs a real 1080×1920 `.mp4` vertical short.

---

## Environment Variables

Copy `.env.example` to `.env.local` (root) and `backend/.env.example` to `backend/.env`.

| Key | Description | Fallback Behavior |
|---|---|---|
| `LLM_API_KEY` | OpenAI API key for script generation & routing | Template script fallback |
| `WHISPER_API_KEY` | Speech-to-Text transcription key | Audio waveform overlay fallback |
| `ELEVENLABS_API_KEY` | Voiceover TTS generation | Fallback audio engine |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather | Terminal CLI runner |
| `CONVEX_URL` | Convex database deployment URL | In-memory store |
| `GCS_BUCKET` | Google Cloud Storage bucket for exports | Local filesystem output |

---

## Running the Telegram Bot Gateway

1. Get a token from Telegram **@BotFather**.
2. Set `TELEGRAM_BOT_TOKEN=...` in `backend/.env`.
3. Start the gateway listener:
   ```bash
   cd backend
   npm run gateway
   ```

---

## Deployment Prerequisites

- **Frontend:** Vercel or Cloudflare Pages.
- **Backend Service & Poller:** Node.js server, Docker container, or GCP Cloud Run.
- **Convex:** Deployment initialized via `npx convex dev` / `npx convex deploy`.
