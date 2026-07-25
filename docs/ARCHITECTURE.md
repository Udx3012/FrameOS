# FrameOS - Architecture

Chat-native content studio, built as a native **FrameOS engine**. One engine, three input
modes. FFmpeg-first, everything heavy is capped and queued.

---

## 1. High-level shape

```
                 ┌─────────────────────────────────────────────┐
   chat msg ───▶ │  CHAT GATEWAY (Telegram first, then WA/DC) │
 (idea/file/URL) └───────────────┬─────────────────────────────┘
                                 │  message + attachments + user ctx
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  FrameOS ENGINE                             │
                 │   • intent + brainstorm/script (LLM)         │
                 │   • NL → OpSchema (validated, no shell str)  │
                 └───────────────┬─────────────────────────────┘
                                 │  JobSpec
                                 ▼
                 ┌─────────────────────────────────────────────┐
                 │  EXECUTOR  (Node/TS, capped worker pool)     │
                 │   ingest → transcribe → ffmpeg chain → send  │
                 └───┬───────────┬───────────┬─────────────┬────┘
                     │           │           │             │
                 yt-dlp      Whisper      ffmpeg        ElevenLabs
                (segment)  (transcribe)  (all cuts)     (Mode 1 TTS)
                                 │
                 Convex (jobs/users/usage)   GCS (storage & signed URLs)   Dodo (checkout)
```

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript / Node.js | Unified backend stack |
| Gateway | Telegram Bot API | Primary chat interface |
| Media Engine | `ffmpeg` (system binary) | 100% of trim/caption/format/convert |
| Ingest | `yt-dlp` with `--download-sections` | Segment-only download |
| Transcribe | Whisper via OpenAI API | Accurate speech-to-text |
| Voice | ElevenLabs API | AI voiceover generation |
| LLM | OpenAI-compatible (GPT-5.6 Sol) | Brainstorm + script + captions + routing |
| State | Convex | Jobs / users / usage + generation queue |
| Storage | Google Cloud Storage | Rendered short storage & V4 signed URLs |
| Pay | Dodo checkout + webhook | Watermark unlock & credit packs |
| Queue | In-process concurrency limiter (p-limit) | Resource-bounded execution |

---

## 3. Contracts

```ts
// Op schema: the ONLY thing that touches ffmpeg. User text never becomes a shell string.
type Op =
  | { op: 'clip';      start: string; end: string }
  | { op: 'trim';      start: string; end: string }
  | { op: 'captions';  source: 'whisper' | 'script'; style: 'karaoke'|'meme'|'clean'; text?: string }
  | { op: 'format';    aspect: '9:16' | '1:1' | '16:9' }
  | { op: 'speed';     factor: number }
  | { op: 'convert';   to: 'mp4' | 'mp3' | 'gif' | 'webm' }
  | { op: 'watermark'; text: string; show: boolean; position?: 'br'|'bl'|'tr'|'tl' }
  | { op: 'sticker' }
  | { op: 'thumbnail'; at: string }
  | { op: 'voiceover'; voiceId: string; script: string }
  | { op: 'broll';     keywords: string[] };

interface JobSpec {
  id: string;
  userId: string;
  platform: 'telegram' | 'whatsapp' | 'discord' | 'cli';
  mode: 'generate' | 'edit' | 'clip';
  source: { kind: 'upload' | 'youtube' | 'none'; path?: string; url?: string; sections?: string };
  ops: Op[];
  isPro: boolean;
  limits: { maxBytes: number; maxDurationSec: number; timeoutSec: number };
}

interface JobResult {
  ok: boolean;
  outputPath?: string;
  meta?: { bytes: number; durationSec: number; ms: number };
  failedOp?: number;
  error?: string;
}
```

---

## 4. Resource & Safety

- Global concurrency = `cores - 1`; per-user = 1 active.
- Per job limits: ≤50MB, ≤5min, ≤1080p, wall-clock timeout guard.
- `ffmpeg -threads 2` with strict protocol whitelist (`file`).
- Temp directory isolated per job; cleaned up immediately after output generation.
- No user text is interpolated into shell commands.

---

## 5. Convex Schema

```ts
jobs  { id, userId, mode, source, ops, status, inBytes, outBytes, ms, isPro, createdAt }
users { id, platform, handle, freeUsedToday, isPro, refCode }
usage { userId, day, count }
```

## License

MIT.
