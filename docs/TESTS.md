# FrameOS - Testing Suite

**Automated test suite using Vitest.**

## Test Layers

| Layer | Coverage |
|---|---|
| **Unit** | Router, caption generation, Whisper response parsing, credits & queue logic |
| **Module** | FFmpeg operation chain, yt-dlp arguments, ffprobe verification |
| **Integration** | End-to-end pipeline execution from natural language input to rendered short |
| **Adversarial & Edge** | Corrupt files, missing audio streams, SSRF protocol isolation, concurrency limits |

## Running Tests

```bash
cd backend
npm test                          # Run all tests
npx vitest run src/edge.test.ts   # Edge tests
npx vitest                        # Watch mode
```
