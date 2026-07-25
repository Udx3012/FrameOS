import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Automatically detect WinGet installed FFmpeg location on Windows if not already on system PATH
if (process.platform === 'win32') {
  const localAppData = process.env.LOCALAPPDATA ?? 'C:\\Users\\Dell\\AppData\\Local';
  const wingetPkg = join(localAppData, 'Microsoft', 'WinGet', 'Packages');
  if (existsSync(wingetPkg)) {
    try {
      const dirs = readdirSync(wingetPkg).filter((d) => d.toLowerCase().includes('gyan.ffmpeg') || d.toLowerCase().includes('ffmpeg'));
      for (const d of dirs) {
        const base = join(wingetPkg, d);
        if (existsSync(join(base, 'bin', 'ffmpeg.exe'))) {
          process.env.PATH = `${join(base, 'bin')};${process.env.PATH}`;
          break;
        }
        const subdirs = readdirSync(base);
        for (const sub of subdirs) {
          const bin = join(base, sub, 'bin');
          if (existsSync(join(bin, 'ffmpeg.exe'))) {
            process.env.PATH = `${bin};${process.env.PATH}`;
            break;
          }
        }
      }
    } catch {}
  }
}

export function ffEscapePath(p: string): string {
  const norm = p.replace(/\\/g, '/');
  return process.platform === 'win32' ? norm.replace(/^([A-Za-z]):/, '$1\\\\:') : norm;
}

const FONT = process.platform === 'darwin'
  ? '/System/Library/Fonts/Supplemental/Arial.ttf'
  : process.platform === 'win32'
  ? 'C:/Windows/Fonts/arial.ttf'
  : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

let filterCache: Set<string> | null = null;
export async function hasFilter(name: string): Promise<boolean> {
  if (!filterCache) {
    filterCache = await new Promise<Set<string>>((res) => {
      const p = spawn('ffmpeg', ['-hide_banner', '-filters']);
      let out = ''; p.stdout.on('data', (d) => (out += d));
      p.on('close', () => {
        const set = new Set<string>();
        for (const line of out.split('\n')) { const m = line.trim().split(/\s+/); if (m[1]) set.add(m[1]); }
        res(set);
      });
      p.on('error', () => res(new Set()));
    });
  }
  return filterCache.has(name);
}
export function fontFile(): string { return ffEscapePath(FONT); }

// x264 defaults to preset=medium, which takes minutes on a small VPS; veryfast keeps renders in
// seconds. Skipped for full stream copies (-c copy) and ops that choose their own preset.
function withFastPreset(args: string[]): string[] {
  const fullCopy = args.some((a, i) => a === '-c' && args[i + 1] === 'copy');
  if (fullCopy || args.includes('-preset')) return args;
  return [...args.slice(0, -1), '-preset', 'veryfast', args[args.length - 1]];
}

export function ff(args: string[], signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...withFastPreset(args)]);
    const onAbort = () => { try { p.kill('SIGKILL'); } catch {} };
    signal?.addEventListener('abort', onAbort);
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e: any) => {
      if (e?.code === 'ENOENT') {
        reject(new Error('ffmpeg is not installed or not found on system PATH. Please install FFmpeg (e.g. winget install Gyan.FFmpeg or apt install ffmpeg).'));
      } else {
        reject(e);
      }
    });
    p.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}: ${err.slice(-200)}`));
    });
  });
}

export interface Probe { durationSec: number; width: number; height: number; hasAudio: boolean; hasVideo: boolean; }
export function ffprobe(path: string): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries',
      'format=duration:stream=codec_type,width,height', '-of', 'json', path]);
    let out = ''; p.stdout.on('data', (d) => (out += d));
    p.on('error', (e: any) => {
      if (e?.code === 'ENOENT') {
        reject(new Error('ffprobe is not installed or not found on system PATH. Please install FFmpeg.'));
      } else {
        reject(e);
      }
    });
    p.on('close', () => {
      try {
        const j = JSON.parse(out || '{}');
        const streams = j.streams ?? [];
        const v = streams.find((s: any) => s.codec_type === 'video');
        resolve({
          durationSec: Number(j.format?.duration ?? 0),
          width: v?.width ?? 0, height: v?.height ?? 0,
          hasAudio: streams.some((s: any) => s.codec_type === 'audio'),
          hasVideo: !!v,
        });
      } catch (e) { reject(e as Error); }
    });
  });
}
