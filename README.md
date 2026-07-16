# Timbre

A music personality app that connects to Spotify and translates listening habits into a visual archetype, Genre DNA breakdown, mood profile, audio signature, and a shareable persona card.

---

## Features

- **AI-powered persona** — an LLM crafts a unique archetype name, tagline, description, traits, and playful insights based on your taste. Falls back to a built-in heuristic if the AI is unavailable.
- **Story reveal experience** — tap-to-advance cards that present your profile one insight at a time with staggered animations, count-up numbers, and a final shareable persona card.
- **3D archetype carousel** — a curved, draggable 3D carousel showcasing six base archetypes, built with CSS 3D transforms and GSAP.
- **Light and dark theme** — full semantic color-token system with a one-click toggle. Respects the OS preference and persists the choice.
- **Ambient animated background** — softly drifting accent-green glow blooms and floating music icons behind all content, theme-aware.
- **Smooth scroll and scroll reveals** — powered by Lenis and GSAP ScrollTrigger.
- **Mobile responsive** — hamburger nav, touch/swipe support on the carousel and reveal, and accessible tap zones.
- **Graceful audio-features fallback** — estimates the audio profile from genres and track popularity when Spotify's restricted endpoint is unavailable.
- **Demo mode** — a full sample profile viewable without any Spotify login.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla JS, Tailwind CSS (Play CDN), Font Awesome 6, GSAP + ScrollTrigger, Lenis |
| Backend | Vercel Serverless Function (`api/persona.js`) |
| Auth | Spotify OAuth 2.0 PKCE (client-side, no backend needed) |
| AI | OpenAI (`gpt-4o-mini`) or Anthropic (`claude-3-5-haiku`) via env config |

---

## Project structure

```
├── index.html            Landing page (hero, features, carousel, FAQ, CTA)
├── styles.css            Theme variables, ambient/carousel/reveal CSS
├── tailwind-config.js    Semantic token mapping (CSS vars → Tailwind utilities)
├── app.js                UI logic, reveal controller, carousel, theme toggle
├── spotify.js            PKCE auth, Spotify API, analysis engine, LLM client
├── api/
│   └── persona.js        Vercel serverless function (LLM proxy)
├── favicon.svg           Brand mark (equalizer bars)
├── og-image.svg          Open Graph share card
├── .env.example          Environment variable template
└── README.md
```

---

## Environment variables

Set these in Vercel (Project → Settings → Environment Variables) or in a local `.env.local` file for `vercel dev`.

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_PROVIDER` | No | `openai` (default) or `anthropic` |
| `OPENAI_API_KEY` | Yes (if openai) | OpenAI API key |
| `ANTHROPIC_API_KEY` | Yes (if anthropic) | Anthropic API key |
| `OPENAI_MODEL` | No | Override model, default `gpt-4o-mini` |
| `ANTHROPIC_MODEL` | No | Override model, default `claude-3-5-haiku-latest` |

---

## Deployment (Vercel)

1. Import the repository into Vercel — it auto-detects the static site and the `/api` serverless function.
2. Add the environment variables listed above.
3. In your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), add your Vercel URL as a redirect URI (e.g. `https://timbre.vercel.app/`).
4. Open the deployed URL and click **Login with Spotify**.

---

## Local development

Run locally with the AI persona endpoint available:

```
cp .env.example .env.local   # fill in your LLM API key
npx vercel dev               # starts the dev server with /api support
```

Without `vercel dev` (e.g. `python -m http.server`), the `/api` endpoint won't exist and the app falls back to the heuristic archetype — everything else still works.

---

## Privacy

- Spotify login uses the PKCE OAuth flow; the app never sees or stores your Spotify password.
- Only an anonymized taste summary (top genres, artists, tracks, and audio features) is sent to the AI. Your name, email, and account ID are never included.
- Raw Spotify data is not stored server-side.

---

## License

MIT
