# AGENTS.md - FrameOS project context

> Developer guidelines and architectural overview for **FrameOS**.

## What this is
**FrameOS** — "your video editor lives in chat." Monorepo structure:
- **root** = Vite / React / Tailwind marketing site + waitlist + dashboard app.
- **`backend/`** = the core AI media engine (Node.js / TypeScript, FFmpeg, yt-dlp) supporting 3 modes (generate / edit / clip). Deploys to cloud hosts or runs standalone.

## Infrastructure & Configuration
- **Domain:** Configured via `VITE_SITE_URL` (default: `https://frameos.app`).
- **Convex Database & Queue:**
  - `convex/` directory contains table schemas and mutations (`waitlist`, `users`, `credits`, `generate`, `email`, `payments`).
  - Web poller (`backend/src/webPoller.ts`) polls Convex `genJobs` queue, processes media via FFmpeg/yt-dlp/Whisper, and uploads outputs to Google Cloud Storage.
- **Authentication:** Clerk Google auth integration.
- **Email:** Resend integration (`sendWelcome`).
- **Telegram Bot:** Telegram gateway (`backend/src/gateway/run.ts`) configured via `TELEGRAM_BOT_TOKEN`.

## Convex Functions (`convex/`)
- `waitlist.ts` — `join` (dedupe, position tracking, schedules welcome email), `count`.
- `users.ts` — `currentUser`, `ensureUser` (called on Clerk sign-in).
- `credits.ts` — `getPacks`, `consumeGeneration` (free quota then credits, throws NO_CREDITS), internal `addCredits`.
- `generate.ts` — `requestGeneration`, `myJobs`, `getJob`, `requestEdit`, `claimNextJob`, `completeJob`.
- `payments.ts` — `createCheckout` (Dodo payments integration), `simulatePurchase`.
- `email.ts` — `sendWelcome` (Resend; uses `public/waitlist-welcome.png`).

## Gotchas & Guidelines
- Vercel/Vite builds bake `VITE_*` environment variables at build time.
- All media pipelines use safe validated execution schemas — user inputs are never passed directly to shell execution.
