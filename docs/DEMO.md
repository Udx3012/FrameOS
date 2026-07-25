# FrameOS - Demonstration Script

## Overview
Demonstrate FrameOS across its 3 core operating modes:
1. **Generate** — Topic to voiced, captioned vertical short.
2. **Edit** — Raw clip to transcribed, styled vertical short.
3. **Clip** — YouTube URL & timestamps to vertical short segment.

---

## 2-Minute Demo Flow

| Step | Action | Description |
|------|--------|-------------|
| 1. Intro | Show application headline | "Your video editor lives in chat." |
| 2. Generate Mode | Send topic prompt: *"make a reel on why UPI beat credit cards"* | AI scripts, generates voiceover, cuts b-roll, burns captions. |
| 3. Edit Mode | Upload raw video clip + *"caption it and make it vertical"* | Speech-to-text, 9:16 crop, subtitle styling. |
| 4. Clip Mode | Send YouTube link + timestamp range: *"clip https://youtu.be/... 1:00 to 1:30"* | Segment download, auto-captioning, vertical export. |

---

## CLI Demonstration Backup

```bash
cd backend
npm run frameos -- "why UPI beat credit cards in india"                    # Generate
npm run frameos -- "caption it and make it vertical" fixtures/sample.mp4    # Edit
npm run frameos -- "clip https://youtu.be/aqz-KE-bpKQ 0:02 to 0:06"        # Clip
```
