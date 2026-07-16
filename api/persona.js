/* ============================================
   TIMBRE - PERSONA GENERATOR (Vercel function)
   Turns a Spotify listening summary into a
   creative persona via an LLM. The API key stays
   server-side; the browser never sees it.

   Env vars (set in Vercel → Project → Settings → Environment Variables):
     LLM_PROVIDER      "openai" (default) or "anthropic"
     OPENAI_API_KEY    required if provider = openai
     ANTHROPIC_API_KEY required if provider = anthropic
     OPENAI_MODEL      optional, default "gpt-4o-mini"
     ANTHROPIC_MODEL   optional, default "claude-3-5-haiku-latest"
   ============================================ */

// Best-effort in-memory rate limit (per warm instance only — for real
// protection use a durable store like Upstash. This just blunts abuse.)
const HITS = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;

function rateLimited(ip) {
    const now = Date.now();
    const rec = HITS.get(ip) || { count: 0, start: now };
    if (now - rec.start > WINDOW_MS) {
        rec.count = 0;
        rec.start = now;
    }
    rec.count += 1;
    HITS.set(ip, rec);
    return rec.count > MAX_PER_WINDOW;
}

const SYSTEM_PROMPT = `You are a music personality analyst for an app called Timbre.
Given a JSON summary of someone's Spotify listening, invent a vivid, original musical ARCHETYPE that captures their taste.

Respond with ONLY a JSON object (no markdown, no commentary) with EXACTLY this shape:
{
  "archetype": { "name": string, "tagline": string, "description": string },
  "traits": [string, string, string],
  "genreNarrative": string,
  "moodNarrative": string,
  "insights": [string, string, string]
}

Rules:
- name: 2-4 words, evocative, Title Case. Be original — do NOT reuse a fixed list.
- tagline: 8 words or fewer.
- description: 1-2 sentences, 45 words max, written in second person ("You ...").
- traits: exactly 3 short adjectives.
- genreNarrative: one sentence about their genre mix.
- moodNarrative: one sentence about their energy/emotional profile.
- insights: 2-3 short, specific, playful observations that reference their actual artists or genres.
- Tone: warm, clever, never cheesy.
- Never infer or mention race, religion, politics, health, gender, or age.
- Output valid JSON only.`;

function safeParseJson(text) {
    if (!text) return null;
    let t = String(text).trim();
    // Strip code fences if the model added them
    t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try {
        return JSON.parse(t);
    } catch (e) {
        const first = t.indexOf('{');
        const last = t.lastIndexOf('}');
        if (first !== -1 && last > first) {
            try { return JSON.parse(t.slice(first, last + 1)); } catch (e2) { return null; }
        }
        return null;
    }
}

function shapePersona(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const a = raw.archetype || {};
    if (!a.name) return null;

    const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const arr = (v, n) => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()).slice(0, n) : []);

    const traits = arr(raw.traits, 3);
    return {
        archetype: {
            name: str(a.name, 60),
            tagline: str(a.tagline, 80),
            description: str(a.description, 400)
        },
        traits: traits.length ? traits : ['Eclectic', 'Curious', 'Expressive'],
        genreNarrative: str(raw.genreNarrative, 240),
        moodNarrative: str(raw.moodNarrative, 240),
        insights: arr(raw.insights, 3)
    };
}

async function callOpenAI(summary) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model,
            temperature: 0.8,
            max_tokens: 600,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: JSON.stringify(summary) }
            ]
        })
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(summary) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 700,
            temperature: 0.8,
            system: SYSTEM_PROMPT,
            messages: [
                { role: 'user', content: JSON.stringify(summary) + '\n\nRespond with only the JSON object.' }
            ]
        })
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || '';
}

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (rateLimited(ip)) { res.status(429).json({ error: 'Too many requests' }); return; }

    try {
        const summary = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        if (!summary || (!summary.topGenres && !summary.topArtists)) {
            res.status(400).json({ error: 'Invalid summary' });
            return;
        }

        const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
        const rawText = provider === 'anthropic'
            ? await callAnthropic(summary)
            : await callOpenAI(summary);

        const persona = shapePersona(safeParseJson(rawText));
        if (!persona) {
            res.status(502).json({ error: 'Could not generate persona' });
            return;
        }

        res.status(200).json(persona);
    } catch (err) {
        console.error('persona error:', err.message);
        res.status(502).json({ error: 'Persona generation failed' });
    }
};
