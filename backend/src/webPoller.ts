// Web-generation poller — runs on the cloud backend host.
//
// Loop: claim the oldest queued genJobs row from Convex -> run the FrameOS pipeline
// to produce an mp4 -> upload it to GCS bucket + mint a V4 signed URL
// -> completeJob with that URL. On any failure, failJob so the dashboard stops spinning.
//
import { createServer } from 'http';

// Bind HTTP server so Render health checks pass
const PORT = process.env.PORT || 8080;
createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('FrameOS Worker Live\n');
}).listen(PORT, () => {
  console.log(`[webPoller] HTTP healthcheck listening on port ${PORT}`);
});

import 'dotenv/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { createFrameOS } from './app.js';
import type { Incoming } from './gateway/index.js';

const run = promisify(execFile);

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
  once(event: string, listener: () => void): void;
};

// ---- config ----
const CONVEX_URL = process.env.CONVEX_URL ?? process.env.VITE_CONVEX_URL;
// Deploy key (or an admin key) lets this backend call internalMutations.
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY ?? process.env.CONVEX_ADMIN_KEY;
const GCS_BUCKET = process.env.GCS_BUCKET ?? 'frameos-media-videos';
const POLL_MS = Number(process.env.WEB_POLL_MS ?? 5000);
const SIGNED_URL_TTL_MS = Number(process.env.SIGNED_URL_TTL_MS ?? 7 * 24 * 60 * 60 * 1000);

if (!CONVEX_URL) {
  console.error('set CONVEX_URL (or VITE_CONVEX_URL) — the Convex deployment to poll');
  process.exit(1);
}
if (!CONVEX_DEPLOY_KEY) {
  console.error('set CONVEX_DEPLOY_KEY (or CONVEX_ADMIN_KEY) — needed to call internal mutations');
  process.exit(1);
}

// ---- Convex client ----
const convex = new ConvexHttpClient(CONVEX_URL);
(convex as any).setAdminAuth(CONVEX_DEPLOY_KEY);

// Internal functions referenced by string path (no generated api in this package).
const claimNextJob = makeFunctionReference<'mutation'>('generate:claimNextJob');
const completeJob = makeFunctionReference<'mutation'>('generate:completeJob');
const failJob = makeFunctionReference<'mutation'>('generate:failJob');

interface ClaimedJob {
  jobId: string;
  userId: string;
  mode: string;
  prompt: string;
  sourceUrl: string | null; // set for edit jobs: the reel being edited
}

const frameOS = createFrameOS();

// Run the FrameOS pipeline for a claimed job and return the produced mp4 path.
async function runPipeline(job: ClaimedJob): Promise<string> {
  let attachmentPath: string | undefined;
  if (job.sourceUrl) {
    const res = await fetch(job.sourceUrl);
    if (!res.ok) throw new Error(`could not fetch source reel (${res.status})`);
    attachmentPath = join(tmpdir(), `frameos-src-${job.jobId}.mp4`);
    await writeFile(attachmentPath, Buffer.from(await res.arrayBuffer()));
  }
  const inc: Incoming = {
    userId: `web:${job.userId}`,
    platform: 'cli',
    text: job.prompt,
    isPro: true,
    confirmedOwnership: true,
    attachmentPath,
  };
  const replies = await frameOS.handle(inc);
  const file = replies.find((r) => r.kind === 'file');
  if (!file || file.kind !== 'file') {
    const note = replies.find((r) => r.kind === 'text');
    throw new Error(note && note.kind === 'text' ? note.text : 'pipeline produced no output file');
  }
  return file.filePath;
}

// Upload an mp4 to GCS and return a V4 signed URL
async function uploadAndSign(localPath: string, jobId: string): Promise<string> {
  const sa = process.env.GCS_SIGN_SA;
  if (!GCS_BUCKET) throw new Error('GCS_BUCKET not set');
  if (!sa) throw new Error('GCS_SIGN_SA not set — needed to mint a signed URL');
  const dest = `${GCS_BUCKET}/web/${jobId}-${Date.now()}.mp4`;
  await run('gcloud', ['storage', 'cp', localPath, dest]);
  const durationSec = Math.min(Math.floor(SIGNED_URL_TTL_MS / 1000), 12 * 60 * 60);
  const { stdout } = await run('gcloud', [
    'storage', 'sign-url', dest,
    `--duration=${durationSec}s`,
    `--impersonate-service-account=${sa}`,
    '--format=value(signed_url)',
  ]);
  const url = stdout.trim();
  if (!url) throw new Error('gcloud sign-url returned no URL');
  return url;
}

// Process a single claimed job end-to-end.
async function processJob(job: ClaimedJob): Promise<void> {
  console.log(`[job ${job.jobId}] processing (${job.mode}): ${job.prompt.slice(0, 80)}`);
  try {
    const mp4 = await runPipeline(job);
    const resultUrl = await uploadAndSign(mp4, job.jobId);
    await convex.mutation(completeJob, { jobId: job.jobId, resultUrl });
    console.log(`[job ${job.jobId}] done -> ${resultUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[job ${job.jobId}] failed: ${message}`);
    await convex.mutation(failJob, { jobId: job.jobId, error: message }).catch((e: unknown) => {
      console.error(`[job ${job.jobId}] could not record failure:`, e);
    });
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  console.log(`webPoller up — polling ${CONVEX_URL} every ${POLL_MS}ms, bucket gs://${GCS_BUCKET}`);
  
  // Also start Telegram bot if TELEGRAM_BOT_TOKEN is set
  if (process.env.TELEGRAM_BOT_TOKEN) {
    import('./gateway/run.js').catch((e) => console.error('[gateway] startup error:', e));
  }

  let running = true;
  const stop = () => {
    running = false;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  while (running) {
    let job: ClaimedJob | null = null;
    try {
      job = (await convex.mutation(claimNextJob, {})) as ClaimedJob | null;
    } catch (err) {
      console.error('claimNextJob failed (will retry):', err);
      await sleep(POLL_MS);
    }
    if (job) {
      await processJob(job);
      continue;
    }
    await sleep(POLL_MS);
  }
  console.log('webPoller stopped');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
