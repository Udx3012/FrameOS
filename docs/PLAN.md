# FrameOS - Development Plan

This document details the architectural plan and component breakdown for **FrameOS**.

---

## 1. Vision & Architecture

**FrameOS** is a chat-native content creation suite.
Users send text prompts, video clips, or video links through Telegram or the web interface and receive finished, captioned vertical shorts.

### Core Modes:
1. **Generate** — Topic → script generation → ElevenLabs voiceover → stock b-roll → 9:16 vertical short.
2. **Edit** — Video clip → Whisper transcription → subtitle overlay → 9:16 crop & formatting.
3. **Clip** — YouTube URL + timestamps → segment download via `yt-dlp` → 9:16 vertical export with captions.

---

## 2. Shared Contracts (`src/types.ts`)

```ts
export type Op =
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

export interface JobSpec {
  id: string; userId: string;
  platform: 'telegram' | 'whatsapp' | 'discord' | 'cli';
  mode: 'generate' | 'edit' | 'clip';
  source: { kind: 'upload' | 'youtube' | 'none'; path?: string; url?: string; sections?: string };
  ops: Op[];
  isPro: boolean;
  limits: { maxBytes: number; maxDurationSec: number; timeoutSec: number };
}
```

---

## 3. Core Modules

- `src/media/` — FFmpeg operational library for media transformations.
- `src/ingest/` — Segment downloads via `yt-dlp` & media probing.
- `src/transcribe/` — Whisper speech-to-text integration.
- `src/content/` — LLM-driven brainstorming and script generation.
- `src/router/` — Natural language parser converting user requests into structured `JobSpec` objects.
- `src/queue/` — Concurrency-controlled execution queue.
- `src/gateway/` — Telegram bot event handling and status updates.
