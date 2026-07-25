// B4 — content (the Hermes content-generation surface). Brainstorm viral angles, write a
// 14-20s script, and format caption text. Uses an OpenAI-compatible LLM when LLM_API_KEY is set;
// falls back to deterministic templates so the tool works (lower quality) and tests run offline.
import type { Content, Angle, Word } from '../types.js';

const SYSTEM =
  'You are a short-form video strategist. Reply ONLY with compact JSON. Be specific, punchy, no fluff.';

function cleanTopic(t: string): string {
  return t.replace(/^(make|create|generate|produce|build)\s+(a\s+)?(reel|short|video|clip|tiktok|video|post)\s+(on|about|for|of)?\s*/i, '').trim() || t;
}

async function llm(prompt: string): Promise<string | null> {
  const key = process.env.LLM_API_KEY;
  if (!key) return null;
  const base = process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
  const defaultModel = base.includes('generativelanguage.googleapis.com') ? 'gemini-2.5-flash' : 'gpt-4o-mini';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? defaultModel,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
      temperature: 0.8,
    }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? null;
}

function safeJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s.replace(/^```json?|```$/g, '').trim()); } catch { return fallback; }
}

export const content: Content = {
  async brainstorm(rawTopic: string, facts: string[] = []): Promise<Angle[]> {
    const topic = cleanTopic(rawTopic);
    const grounding = facts.length ? `\nUse these current facts (cite-worthy, keep them accurate):\n- ${facts.join('\n- ')}` : '';
    const out = await llm(`Give 3 viral short-form angles for the topic: "${topic}".${grounding}\nJSON array of {hook, premise, whyViral}.`);
    const fallback: Angle[] = [
      { hook: `The real reason ${topic} is taking over`, premise: `3 key reasons why ${topic} is winning`, whyViral: 'contrarian + specific' },
      { hook: `${topic}, explained in 15 seconds`, premise: `fast facts with a twist ending`, whyViral: 'saves + shares as a quick explainer' },
      { hook: `What nobody tells you about ${topic}`, premise: `one surprising insight + a takeaway`, whyViral: 'curiosity gap' },
    ];
    const parsed = safeJson<Angle[]>(out, fallback);
    return Array.isArray(parsed) && parsed.length ? parsed.slice(0, 3) : fallback;
  },

  async script(angle: Angle, facts: string[] = []): Promise<{ script: string; captions: string }> {
    const grounding = facts.length ? ` Ground it in: ${facts.slice(0, 3).join(' ')}` : '';
    const out = await llm(`Write a 45-55 word voiceover script for this angle. Hook first line.${grounding} JSON {script, captions}. Angle: ${JSON.stringify(angle)}`);
    const fb = (() => {
      const fact = facts[0] ? ` ${facts[0]}` : '';
      const script = `${angle.hook}.${fact} Here is what actually matters and why most people miss it. Remember this next time.`;
      return { script, captions: script };
    })();
    const parsed = safeJson<{ script: string; captions: string }>(out, fb);
    return parsed.script ? parsed : fb;
  },

  async captionText(words: Word[], style: 'karaoke' | 'meme' | 'clean'): Promise<string> {
    const text = words.map((w) => w.text).join(' ').trim();
    if (style === 'meme') return text.toUpperCase();
    return text;
  },
};

// word count -> rough spoken seconds (≈2.5 words/sec). Used to keep reels in the 14-20s band.
export function spokenSeconds(script: string): number { return script.trim().split(/\s+/).length / 2.5; }
