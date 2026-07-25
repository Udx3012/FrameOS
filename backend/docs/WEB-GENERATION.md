# Web generation - dashboard → agent → result

How the web dashboard (`/create`) gets a reel made by the FrameOS engine.

## Flow

```
Browser (/create)
  │  requestGeneration({ mode, prompt })        convex/generate.ts (public mutation)
  │    - Clerk identity required
  │    - spends a credit: free quota (FREE_LIMIT) then paid credits (NO_CREDITS)
  │    - inserts a genJobs row { status: "queued" }
  ▼
Convex `genJobs` queue  ──────────────────────────────────────────────┐
  ▲                                                                    │
  │  claimNextJob()  (internalMutation)  ── oldest queued → "processing"│
webPoller on the host (backend/src/webPoller.ts) ◄─────────────────────┘
  │    - runs the FrameOS pipeline (createFrameOS().handle) → mp4
  │    - uploads mp4 to GCS bucket + mints a V4 signed URL
  │    - completeJob({ jobId, resultUrl })  →  status "done" + resultUrl
  │      (failJob({ jobId, error }) on any error  →  status "failed")
  ▼
Browser polls myJobs()  → shows the result (signed URL) or the failure
```

Buckets are private, so the engine returns a signed URL rather than a public object URL.

## Convex functions (`convex/generate.ts`)

| Function            | Kind             | Purpose                                             |
| ------------------- | ---------------- | --------------------------------------------------- |
| `requestGeneration` | mutation         | Web: spend a credit + enqueue a job.                |
| `myJobs`            | query            | Web: caller's 20 most recent jobs, newest first.    |
| `claimNextJob`      | internalMutation | Agent: claim + lock the oldest queued job.          |
| `completeJob`       | internalMutation | Agent: mark done + attach the signed result URL.    |
| `failJob`           | internalMutation | Agent: mark failed with an error message.           |

## Environment

| Var                                       | Purpose                                                              |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `CONVEX_URL`                              | Convex deployment URL to poll. |
| `CONVEX_DEPLOY_KEY`                       | Auth for calling the internal mutations. |
| `GCS_BUCKET`                              | Output storage bucket. |
| `WEB_POLL_MS`                             | Poll interval (default 5000ms). |
| `SIGNED_URL_TTL_MS`                       | Signed-URL lifetime (default 7 days). |

## Run the poller

```bash
cd backend
npm i convex @google-cloud/storage
node --import tsx src/webPoller.ts
```

Keep it alive with systemd or pm2:

```bash
pm2 start "node --import tsx src/webPoller.ts" --name frameos-webpoller
```
