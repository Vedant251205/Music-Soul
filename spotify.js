/* ============================================
   TIMBRE - SPOTIFY INTEGRATION
   OAuth 2.0 PKCE Flow (no backend required)
   + Spotify Web API calls
   ============================================ */

// ──────────────────────────────────────────
// CONFIGURATION — Replace with your own values
// ──────────────────────────────────────────
const SPOTIFY_CONFIG = {
    CLIENT_ID: '27e477fd8283462184c927bd6bac66f4',          // ← Paste your Spotify Client ID
    // Auto-detects the current URL and normalizes "/index.html" → "/" so the
    // redirect URI is stable. NOTE: Spotify no longer allows "localhost" — open
    // the site via http://127.0.0.1:<port>/ and register that EXACT URI.
    REDIRECT_URI: window.location.origin + window.location.pathname.replace(/index\.html$/, ''),
    SCOPES: [
        'user-read-private',
        'user-read-email',
        'user-top-read',
        'user-read-recently-played',
        'user-library-read'
    ].join(' '),
    AUTH_URL: 'https://accounts.spotify.com/authorize',
    TOKEN_URL: 'https://accounts.spotify.com/api/token',
    API_BASE: 'https://api.spotify.com/v1'
};


// ──────────────────────────────────────────
// 1. PKCE HELPERS
//    Generate code verifier & challenge
//    (Proof Key for Code Exchange)
// ──────────────────────────────────────────

function generateRandomString(length) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(values, v => charset[v % charset.length]).join('');
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.subtle.digest('SHA-256', data);
}

function base64URLEncode(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    bytes.forEach(b => str += String.fromCharCode(b));
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
    const hashed = await sha256(verifier);
    return base64URLEncode(hashed);
}


// ──────────────────────────────────────────
// 2. AUTH FLOW
//    Login, token exchange, and session mgmt
// ──────────────────────────────────────────

async function loginWithSpotify() {
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store verifier for the callback
    localStorage.setItem('spotify_code_verifier', codeVerifier);

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CONFIG.CLIENT_ID,
        scope: SPOTIFY_CONFIG.SCOPES,
        redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge
    });

    // Redirect to Spotify login page
    window.location.href = `${SPOTIFY_CONFIG.AUTH_URL}?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
    const codeVerifier = localStorage.getItem('spotify_code_verifier');

    const response = await fetch(SPOTIFY_CONFIG.TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: SPOTIFY_CONFIG.REDIRECT_URI,
            client_id: SPOTIFY_CONFIG.CLIENT_ID,
            code_verifier: codeVerifier
        })
    });

    const data = await response.json();

    if (data.access_token) {
        localStorage.setItem('spotify_access_token', data.access_token);
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
        localStorage.setItem('spotify_token_expires', Date.now() + (data.expires_in * 1000));
        localStorage.removeItem('spotify_code_verifier');
        return data.access_token;
    } else {
        console.error('Token exchange failed:', data);
        return null;
    }
}

function getAccessToken() {
    const token = localStorage.getItem('spotify_access_token');
    const expires = localStorage.getItem('spotify_token_expires');

    if (token && expires && Date.now() < parseInt(expires)) {
        return token;
    }
    return null;
}

function isLoggedIn() {
    return getAccessToken() !== null;
}

function logout() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires');
    localStorage.removeItem('spotify_code_verifier');
    window.location.href = SPOTIFY_CONFIG.REDIRECT_URI;
}


// ──────────────────────────────────────────
// 3. SPOTIFY API CALLS
//    Fetch user data, top tracks, artists, etc.
// ──────────────────────────────────────────

async function spotifyFetch(endpoint) {
    const token = getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${SPOTIFY_CONFIG.API_BASE}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401) {
        logout();
        throw new Error('Token expired');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error?.message || `HTTP error ${response.status}`;
        throw new Error(msg);
    }

    return response.json();
}

async function getUserProfile() {
    return spotifyFetch('/me');
}

async function getTopArtists(timeRange = 'medium_term', limit = 20) {
    return spotifyFetch(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
}

async function getTopTracks(timeRange = 'medium_term', limit = 20) {
    return spotifyFetch(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
}

async function getAudioFeatures(trackIds) {
    return spotifyFetch(`/audio-features?ids=${trackIds.join(',')}`);
}

async function getRecentlyPlayed(limit = 50) {
    return spotifyFetch(`/me/player/recently-played?limit=${limit}`);
}


// ──────────────────────────────────────────
// 4. MUSIC PERSONALITY ANALYSIS ENGINE
//    Processes Spotify data to generate a
//    personality archetype and stats
// ──────────────────────────────────────────

const ARCHETYPES = [
    {
        name: 'The Architect',
        description: 'Methodical and precise. You gravitate toward structured compositions, complex arrangements, and technical mastery.',
        traits: ['Analytical', 'Detail-oriented', 'Structured'],
        match: (f) => f.instrumentalness > 0.3 && f.acousticness < 0.4
    },
    {
        name: 'The Midnight Dreamer',
        description: 'Introspective and atmospheric. Your library is a late-night journey through ambient soundscapes and melancholic melodies.',
        traits: ['Reflective', 'Emotional', 'Nocturnal'],
        match: (f) => f.valence < 0.35 && f.energy < 0.5
    },
    {
        name: 'The Synthesizer',
        description: 'Genre-fluid and eclectic. You blend worlds, pulling from electronic, indie, and experimental with fearless curiosity.',
        traits: ['Adventurous', 'Creative', 'Eclectic'],
        match: (f) => f.danceability > 0.5 && f.instrumentalness > 0.15
    },
    {
        name: 'The Chaotic Motivator',
        description: 'High-octane and relentless. Your playlists are rocket fuel — fast tempos, heavy drops, and maximum energy.',
        traits: ['Energetic', 'Bold', 'Unstoppable'],
        match: (f) => f.energy > 0.7 && f.tempo > 120
    },
    {
        name: 'The Storyteller',
        description: 'Lyric-driven and soulful. You connect with songs that tell stories, from folk ballads to hip-hop narratives.',
        traits: ['Empathetic', 'Lyrical', 'Warm'],
        match: (f) => f.speechiness > 0.08 && f.acousticness > 0.3
    },
    {
        name: 'The Groove Master',
        description: 'Rhythm is your religion. Funk, R&B, dance, disco — if it makes you move, it\'s on your playlist.',
        traits: ['Rhythmic', 'Social', 'Joyful'],
        match: (f) => f.danceability > 0.65 && f.valence > 0.5
    }
];

async function analyzePersonality() {
    try {
        // Fetch all data in parallel
        const [profile, topArtistsData, topTracksData] = await Promise.all([
            getUserProfile(),
            getTopArtists('medium_term', 50),
            getTopTracks('medium_term', 50)
        ]);

        const items = topTracksData.items || [];
        const artistItems = topArtistsData.items || [];

        // Get audio features for top tracks.
        // NOTE: Spotify restricted /audio-features for many newer apps, so if the
        // call fails (or returns nothing) we estimate the profile from genres +
        // track popularity instead of erroring out.
        const trackIds = items.map(t => t.id).filter(Boolean);
        let features = [];
        let featuresEstimated = false;

        try {
            if (trackIds.length > 0) {
                const audioData = await getAudioFeatures(trackIds);
                features = (audioData.audio_features || []).filter(Boolean);
            }
            if (features.length === 0) featuresEstimated = true;
        } catch (e) {
            console.warn('audio-features unavailable — estimating from genres:', e.message);
            featuresEstimated = true;
        }

        const avgFeatures = featuresEstimated
            ? estimateFeatures(artistItems, items)
            : {
                danceability: avg(features, 'danceability'),
                energy: avg(features, 'energy'),
                valence: avg(features, 'valence'),
                acousticness: avg(features, 'acousticness'),
                instrumentalness: avg(features, 'instrumentalness'),
                speechiness: avg(features, 'speechiness'),
                tempo: avg(features, 'tempo'),
                liveness: avg(features, 'liveness')
            };

        // Determine archetype
        let archetype = ARCHETYPES.find(a => a.match(avgFeatures));
        if (!archetype) archetype = ARCHETYPES[2]; // Default: The Synthesizer

        // Extract top genres
        const genreCounts = {};
        artistItems.forEach(artist => {
            (artist.genres || []).forEach(genre => {
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });
        });
        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([genre, count]) => ({ genre, count }));

        if (topGenres.length === 0) {
            topGenres.push({ genre: 'eclectic', count: 1 });
        }

        // Mood breakdown
        const moodBreakdown = {
            happy: Math.round(avgFeatures.valence * 100),
            energetic: Math.round(avgFeatures.energy * 100),
            danceable: Math.round(avgFeatures.danceability * 100),
            acoustic: Math.round(avgFeatures.acousticness * 100),
            vocal: Math.round((1 - avgFeatures.instrumentalness) * 100),
            live: Math.round(avgFeatures.liveness * 100)
        };

        return {
            profile,
            archetype,
            topArtists: artistItems.slice(0, 5),
            topTracks: items.slice(0, 5),
            topGenres,
            avgFeatures,
            moodBreakdown,
            featuresEstimated
        };
    } catch (error) {
        console.error('Analysis failed:', error);
        throw error;
    }
}

function avg(arr, key) {
    return arr.reduce((sum, item) => sum + (item[key] || 0), 0) / arr.length;
}

// Estimate audio features from genres + track popularity when Spotify's
// /audio-features endpoint is unavailable. Produces a plausible, varied
// profile so the archetype, mood, and signature still render.
function estimateFeatures(artists, tracks) {
    const f = {
        danceability: 0.55,
        energy: 0.55,
        valence: 0.5,
        acousticness: 0.3,
        instrumentalness: 0.12,
        speechiness: 0.07,
        tempo: 118,
        liveness: 0.17
    };

    const genres = (artists || []).flatMap(a => a.genres || []).join(' ').toLowerCase();
    const has = (kw) => genres.includes(kw);
    const bump = (key, d) => { f[key] = Math.min(1, Math.max(0, f[key] + d)); };

    // Energetic / fast
    if (has('metal') || has('punk') || has('hardcore') || has('edm') || has('techno') || has('dubstep') || has('drum and bass')) {
        bump('energy', 0.25); f.tempo += 20; bump('valence', 0.05);
    }
    if (has('rock') || has('house') || has('dance') || has('trance')) { bump('energy', 0.15); f.tempo += 10; }

    // Calm / acoustic
    if (has('ambient') || has('classical') || has('acoustic') || has('folk') || has('singer-songwriter') || has('lo-fi') || has('sleep')) {
        bump('energy', -0.25); bump('acousticness', 0.35); f.tempo -= 15; bump('valence', -0.05);
    }
    if (has('jazz') || has('soul') || has('blues')) { bump('acousticness', 0.15); bump('valence', -0.03); }

    // Happy / danceable
    if (has('pop') || has('disco') || has('funk') || has('afrobeat') || has('reggaeton') || has('latin')) {
        bump('danceability', 0.2); bump('valence', 0.2);
    }
    if (has('house') || has('hip hop') || has('rap') || has('r&b')) bump('danceability', 0.15);

    // Sad / dark
    if (has('emo') || has('sad') || has('doom') || has('shoegaze') || has('darkwave')) { bump('valence', -0.2); bump('energy', -0.05); }

    // Instrumental
    if (has('instrumental') || has('post-rock') || has('score') || has('soundtrack')) bump('instrumentalness', 0.25);

    // Lyric-forward
    if (has('hip hop') || has('rap') || has('spoken')) bump('speechiness', 0.1);

    // Nudge by average track popularity (mainstream ≈ slightly more upbeat)
    const pops = (tracks || []).map(t => t.popularity).filter(p => typeof p === 'number');
    if (pops.length) {
        const meanPop = pops.reduce((s, p) => s + p, 0) / pops.length / 100;
        bump('valence', (meanPop - 0.5) * 0.1);
        bump('energy', (meanPop - 0.5) * 0.08);
    }

    f.tempo = Math.max(70, Math.min(180, f.tempo));
    return f;
}


// ──────────────────────────────────────────
// 5. CALLBACK HANDLER
//    Runs on page load to handle the OAuth
//    redirect back from Spotify
// ──────────────────────────────────────────

async function handleAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
        console.error('Auth error:', error);
        return false;
    }

    if (code) {
        const token = await exchangeCodeForToken(code);
        // Clean the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return !!token;
    }

    return isLoggedIn();
}


// ──────────────────────────────────────────
// 6. DEMO MODE
//    Fake data for "View Demo" button so
//    users can preview without logging in
// ──────────────────────────────────────────

function getDemoData() {
    return {
        profile: {
            display_name: 'Demo User',
            images: [{ url: '' }]
        },
        archetype: ARCHETYPES[1], // The Midnight Dreamer
        topArtists: [
            { name: 'Radiohead', images: [{ url: '' }], genres: ['art rock', 'alternative'] },
            { name: 'Tame Impala', images: [{ url: '' }], genres: ['psychedelic pop', 'indie'] },
            { name: 'Frank Ocean', images: [{ url: '' }], genres: ['r&b', 'neo-soul'] },
            { name: 'Bon Iver', images: [{ url: '' }], genres: ['indie folk', 'art pop'] },
            { name: 'Daft Punk', images: [{ url: '' }], genres: ['electro', 'french house'] }
        ],
        topTracks: [
            { name: 'Everything In Its Right Place', artists: [{ name: 'Radiohead' }] },
            { name: 'Let It Happen', artists: [{ name: 'Tame Impala' }] },
            { name: 'Nights', artists: [{ name: 'Frank Ocean' }] },
            { name: 'Skinny Love', artists: [{ name: 'Bon Iver' }] },
            { name: 'Something About Us', artists: [{ name: 'Daft Punk' }] }
        ],
        topGenres: [
            { genre: 'art rock', count: 12 },
            { genre: 'indie', count: 10 },
            { genre: 'psychedelic pop', count: 8 },
            { genre: 'r&b', count: 7 },
            { genre: 'electronic', count: 6 },
            { genre: 'neo-soul', count: 5 },
            { genre: 'folk', count: 4 },
            { genre: 'ambient', count: 3 }
        ],
        avgFeatures: {
            danceability: 0.52,
            energy: 0.41,
            valence: 0.28,
            acousticness: 0.38,
            instrumentalness: 0.22,
            speechiness: 0.05,
            tempo: 112,
            liveness: 0.15
        },
        moodBreakdown: {
            happy: 28,
            energetic: 41,
            danceable: 52,
            acoustic: 38,
            vocal: 78,
            live: 15
        }
    };
}


// ──────────────────────────────────────────
// 7. LLM PERSONA (hybrid)
//    Sends a compact, anonymous summary to the
//    serverless /api/persona endpoint. Numbers
//    stay client-side; the LLM writes the persona.
// ──────────────────────────────────────────

// Build a small, non-identifying summary (no name/email/ids).
function buildPersonaSummary(data) {
    const r2 = (n) => Math.round((n || 0) * 100) / 100;
    const f = data.avgFeatures || {};
    return {
        topArtists: (data.topArtists || []).slice(0, 8).map(a => ({
            name: a.name,
            genres: (a.genres || []).slice(0, 3)
        })),
        topTracks: (data.topTracks || []).slice(0, 8).map(t => ({
            name: t.name,
            artist: (t.artists || []).map(x => x.name).join(', ')
        })),
        topGenres: (data.topGenres || []).slice(0, 8),
        features: {
            danceability: r2(f.danceability),
            energy: r2(f.energy),
            valence: r2(f.valence),
            acousticness: r2(f.acousticness),
            instrumentalness: r2(f.instrumentalness),
            speechiness: r2(f.speechiness),
            tempo: Math.round(f.tempo || 0),
            liveness: r2(f.liveness)
        },
        featuresEstimated: !!data.featuresEstimated
    };
}

function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h).toString(36);
}

// POST the summary to the serverless proxy. Returns the persona object
// or null on any failure (caller falls back to the heuristic archetype).
async function generatePersona(summary) {
    const cacheKey = 'timbre_persona_' + hashString(JSON.stringify(summary));
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
    } catch (e) {}

    try {
        const res = await fetch('/api/persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summary)
        });
        if (!res.ok) throw new Error('persona api ' + res.status);
        const persona = await res.json();
        if (!persona || !persona.archetype || !persona.archetype.name) {
            throw new Error('malformed persona');
        }
        try { localStorage.setItem(cacheKey, JSON.stringify(persona)); } catch (e) {}
        return persona;
    } catch (e) {
        console.warn('LLM persona unavailable — using heuristic archetype:', e.message);
        return null;
    }
}
