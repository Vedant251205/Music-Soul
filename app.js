/* ============================================
   TIMBRE - MAIN APPLICATION LOGIC
   Button handlers, UI state, results rendering
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {

    // ──────────────────────────────────────────
    // 1. ELEMENTS
    // ──────────────────────────────────────────
    const loginBtn = document.getElementById('login-btn');
    const spotifyLoginBtn = document.getElementById('spotify-login-btn');
    const demoBtn = document.getElementById('demo-btn');
    const ctaLoginBtn = document.getElementById('cta-login-btn');
    const ctaDemoBtn = document.getElementById('cta-demo-btn');
    const resultsSection = document.getElementById('results-section');
    const loadingOverlay = document.getElementById('loading-overlay');
    // All landing sections = every <section> in <main> except the results section
    const landingSections = Array.from(document.querySelectorAll('main > section'))
        .filter(s => s.id !== 'results-section');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis = null; // smooth-scroll instance (set up below)


    // ──────────────────────────────────────────
    // 2. CHECK AUTH ON PAGE LOAD
    //    Handle Spotify callback or restore session
    // ──────────────────────────────────────────
    const isAuthenticated = await handleAuthCallback();

    if (isAuthenticated) {
        showLoading('Analyzing your music...');
        try {
            const data = await analyzePersonality();
            // Hybrid: ask the LLM to craft the persona (charts stay client-side).
            // If it's unavailable, we keep the heuristic archetype.
            showLoading('Crafting your persona...');
            try {
                const persona = await generatePersona(buildPersonaSummary(data));
                if (persona) applyPersona(data, persona);
            } catch (e) {
                console.warn('persona enrichment skipped:', e);
            }
            launchReveal(data);
        } catch (err) {
            console.error(err);
            hideLoading();
            alert(`Something went wrong analyzing your music.\n\nError details: ${err.message || err}\n\n👉 If it says "User not registered...", you MUST go to your Spotify Developer Dashboard and add your Spotify email address under the "Users and Access" section!`);
        }
    }


    // ──────────────────────────────────────────
    // 3. BUTTON HANDLERS
    // ──────────────────────────────────────────

    // Shared: start the Spotify OAuth login (with setup guard)
    function startSpotifyLogin() {
        if (SPOTIFY_CONFIG.CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
            alert('⚠️ Setup Required!\n\n1. Go to https://developer.spotify.com/dashboard\n2. Create an app\n3. Copy your Client ID\n4. Paste it in spotify.js → SPOTIFY_CONFIG.CLIENT_ID\n5. Add this redirect URI to your Spotify app:\n   ' + SPOTIFY_CONFIG.REDIRECT_URI);
            return;
        }
        loginWithSpotify();
    }

    // Shared: run the demo analysis
    function runDemo() {
        showLoading('Generating demo analysis...');
        setTimeout(() => {
            const data = getDemoData();
            launchReveal(data);
        }, 1200);
    }

    // "Login with Spotify" — hero + final CTA
    if (spotifyLoginBtn) spotifyLoginBtn.addEventListener('click', startSpotifyLogin);
    if (ctaLoginBtn) ctaLoginBtn.addEventListener('click', startSpotifyLogin);

    // "View Demo" — hero + final CTA
    if (demoBtn) demoBtn.addEventListener('click', runDemo);
    if (ctaDemoBtn) ctaDemoBtn.addEventListener('click', runDemo);

    // "Login" — nav button (login or logout)
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (isAuthenticated) {
                logout();
            } else {
                startSpotifyLogin();
            }
        });
    }


    // ──────────────────────────────────────────
    // 4. DYNAMIC VISUALIZER BARS
    // ──────────────────────────────────────────
    const visualizerContainer = document.getElementById('visualizer');
    if (visualizerContainer) {
        const barCount = 12;
        const baseHeights = [40, 70, 100, 50, 80, 30, 90, 60, 45, 75, 95, 55];
        for (let i = 0; i < barCount; i++) {
            const bar = document.createElement('div');
            bar.className = 'viz-bar w-2 bg-accent';
            bar.style.height = baseHeights[i % baseHeights.length] + '%';
            const duration = 1.0 + Math.random() * 0.8;
            const delay = Math.random() * 2;
            bar.style.animation = `barPulse ${duration}s ${delay}s ease-in-out infinite`;
            visualizerContainer.appendChild(bar);
        }
    }


    // ──────────────────────────────────────────
    // 4b. AMBIENT FLOATING MUSIC ICONS
    // ──────────────────────────────────────────
    const ambientBg = document.getElementById('ambient-bg');
    if (ambientBg) {
        const glyphs = ['fa-play', 'fa-pause', 'fa-music', 'fa-headphones-simple', 'fa-compact-disc', 'fa-guitar', 'fa-microphone'];
        const floats = ['amFloat1', 'amFloat2', 'amFloat3'];
        const count = 16;
        for (let i = 0; i < count; i++) {
            const icon = document.createElement('i');
            icon.className = `fa-solid ${glyphs[i % glyphs.length]} ambient-icon`;
            icon.style.fontSize = (14 + Math.random() * 34) + 'px';
            icon.style.left = (Math.random() * 96) + '%';
            icon.style.top = (Math.random() * 96) + '%';
            if (!reducedMotion) {
                const dur = 12 + Math.random() * 16;
                const delay = -Math.random() * 20;
                const anim = floats[Math.floor(Math.random() * floats.length)];
                icon.style.animation = `${anim} ${dur}s ${delay}s ease-in-out infinite`;
            }
            ambientBg.appendChild(icon);
        }
    }


    // ──────────────────────────────────────────
    // 5. THEME TOGGLE (light / dark)
    // ──────────────────────────────────────────
    const themeToggle = document.getElementById('theme-toggle');

    function isDark() {
        return document.documentElement.classList.contains('dark');
    }

    function updateThemeIcon() {
        if (!themeToggle) return;
        themeToggle.innerHTML = isDark()
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        themeToggle.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
    }

    updateThemeIcon();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            try { localStorage.setItem('theme', isDark() ? 'dark' : 'light'); } catch (e) {}
            updateThemeIcon();
            if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        });
    }

    // Mobile nav menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        const closeMenu = () => {
            mobileMenu.classList.add('hidden');
            mobileMenuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
        };
        mobileMenuBtn.addEventListener('click', () => {
            const nowOpen = mobileMenu.classList.toggle('hidden') === false;
            mobileMenuBtn.innerHTML = nowOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
            mobileMenuBtn.setAttribute('aria-expanded', String(nowOpen));
        });
        mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    }


    // ──────────────────────────────────────────
    // 5b. SMOOTH SCROLL + SCROLL REVEALS
    // ──────────────────────────────────────────
    const hasGsap = typeof gsap !== 'undefined';
    const hasScrollTrigger = typeof ScrollTrigger !== 'undefined';

    if (typeof Lenis !== 'undefined' && !reducedMotion) {
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });

        if (hasGsap && hasScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }

        // Route in-page anchor links through Lenis
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', (e) => {
                const id = a.getAttribute('href');
                if (id && id.length > 1) {
                    const target = document.querySelector(id);
                    if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -70 }); }
                }
            });
        });
    }

    // Fade/slide sections in as they enter the viewport
    if (hasGsap && hasScrollTrigger && !reducedMotion) {
        gsap.utils.toArray('[data-reveal]').forEach(el => {
            gsap.from(el, {
                opacity: 0,
                y: 32,
                duration: 0.7,
                ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 88%' }
            });
        });
    }


    // ──────────────────────────────────────────
    // 5c. ARCHETYPES — CURVED 3D CAROUSEL
    // ──────────────────────────────────────────
    const carouselRoot = document.getElementById('archetype-carousel');
    if (carouselRoot) initArchetypeCarousel(carouselRoot);

    function initArchetypeCarousel(root) {
        const stage = root.querySelector('.carousel-stage');
        const cards = Array.from(root.querySelectorAll('.carousel-card'));
        const dotsWrap = root.querySelector('.carousel-dots');
        const prevBtn = root.querySelector('.carousel-prev');
        const nextBtn = root.querySelector('.carousel-next');
        const n = cards.length;
        if (!stage || n === 0) return;

        const step = 360 / n;
        const state = { a: 0 };   // current rotation (deg)
        let radius = 360;
        let index = 0;
        const canTween = hasGsap && !reducedMotion;

        function computeRadius() {
            const w = cards[0].offsetWidth || 288;
            radius = Math.round((w / 2) / Math.tan(Math.PI / n) + 44);
        }

        function apply() {
            stage.style.transform = `translateZ(${-radius}px) rotateY(${-state.a}deg)`;
            cards.forEach((c, i) => {
                let e = ((i * step - state.a) % 360 + 540) % 360 - 180; // -180..180
                const ae = Math.abs(e);
                c.style.opacity = Math.max(0.15, Math.cos(e * Math.PI / 180)).toFixed(3);
                c.style.filter = ae > 62 ? 'blur(3px)' : 'none';
                const active = ae < step / 2;
                c.classList.toggle('is-active', active);
                c.style.pointerEvents = active ? 'auto' : 'none';
                c.style.zIndex = String(Math.round(100 - ae));
            });
            if (dotsWrap) {
                const cur = ((index % n) + n) % n;
                Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === cur));
            }
        }

        function layout() {
            computeRadius();
            cards.forEach((c, i) => {
                c.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`;
            });
            apply();
        }

        function go(to) {
            index = to;
            const target = index * step;
            if (canTween) {
                gsap.to(state, { a: target, duration: 0.7, ease: 'power3.out', onUpdate: apply });
            } else {
                state.a = target;
                apply();
            }
        }

        const next = () => go(index + 1);
        const prev = () => go(index - 1);

        if (nextBtn) nextBtn.addEventListener('click', next);
        if (prevBtn) prevBtn.addEventListener('click', prev);

        if (dotsWrap) {
            cards.forEach((_, i) => {
                const dot = document.createElement('button');
                dot.className = 'carousel-dot';
                dot.setAttribute('aria-label', `Go to archetype ${i + 1}`);
                dot.addEventListener('click', () => go(i));
                dotsWrap.appendChild(dot);
            });
        }

        // Drag / swipe
        let dragging = false, startX = 0, startA = 0;
        function onDown(x) {
            dragging = true;
            startX = x;
            startA = state.a;
            if (hasGsap) gsap.killTweensOf(state);
        }
        function onMove(x) {
            if (!dragging) return;
            state.a = startA - (x - startX) * 0.25;
            apply();
        }
        function onUp() {
            if (!dragging) return;
            dragging = false;
            go(Math.round(state.a / step));
        }

        root.addEventListener('pointerdown', (e) => { onDown(e.clientX); });
        window.addEventListener('pointermove', (e) => onMove(e.clientX));
        window.addEventListener('pointerup', onUp);

        root.setAttribute('tabindex', '0');
        root.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') next();
            else if (e.key === 'ArrowLeft') prev();
        });

        window.addEventListener('resize', layout);
        layout();

        if (hasGsap && hasScrollTrigger && !reducedMotion) {
            gsap.from(root, {
                opacity: 0,
                y: 40,
                duration: 0.8,
                ease: 'power2.out',
                scrollTrigger: { trigger: root, start: 'top 80%' }
            });
        }
    }


    // ──────────────────────────────────────────
    // 6. UI STATE MANAGEMENT
    // ──────────────────────────────────────────

    function showLoading(message) {
        if (loadingOverlay) {
            loadingOverlay.querySelector('.loading-text').textContent = message || 'Loading...';
            loadingOverlay.classList.remove('hidden');
        }
    }

    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }

    function showResults() {
        hideLoading();
        landingSections.forEach(s => s.classList.add('hidden'));
        if (resultsSection) resultsSection.classList.remove('hidden');

        // Update nav login button
        if (loginBtn) {
            loginBtn.innerHTML = isAuthenticated
                ? '<i class="fa-solid fa-right-from-bracket"></i> Logout'
                : '<i class="fa-solid fa-arrow-left"></i> Back';
            loginBtn.onclick = () => {
                if (isAuthenticated) { logout(); }
                else { showLanding(); }
            };
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showLanding() {
        landingSections.forEach(s => s.classList.remove('hidden'));
        if (resultsSection) resultsSection.classList.add('hidden');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fa-brands fa-spotify"></i> Login';
            loginBtn.onclick = () => startSpotifyLogin();
        }
    }


    // Merge the LLM persona into the data object (charts are untouched).
    function applyPersona(data, p) {
        if (p.archetype && p.archetype.name) {
            data.archetype = {
                name: p.archetype.name,
                description: p.archetype.description || data.archetype.description,
                tagline: p.archetype.tagline || '',
                traits: (Array.isArray(p.traits) && p.traits.length) ? p.traits.slice(0, 3) : data.archetype.traits
            };
        }
        data.genreNarrative = p.genreNarrative || null;
        data.moodNarrative = p.moodNarrative || null;
        data.insights = Array.isArray(p.insights) ? p.insights.slice(0, 3) : null;
        data.llmGenerated = true;
    }


    // ──────────────────────────────────────────
    // 7. RESULTS RENDERING
    //    Builds the entire results UI from data
    // ──────────────────────────────────────────

    function renderResults(data) {
        if (!resultsSection) return;

        const { profile, archetype, topArtists, topTracks, topGenres, avgFeatures, moodBreakdown, featuresEstimated, insights } = data;
        const maxGenreCount = topGenres[0]?.count || 1;

        resultsSection.innerHTML = `
            <!-- Profile Header -->
            <div class="text-center mb-12">
                <p class="text-sm font-semibold uppercase tracking-wider text-accent-text">Your sonic blueprint</p>
                <h2 class="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
                    ${profile.display_name || 'Music Lover'}
                </h2>
            </div>

            <!-- Archetype Card (Hero) -->
            <div class="card bg-surface-2 border border-line rounded-2xl p-10 mb-12 text-center">
                <span class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 text-accent-text text-2xl mx-auto">
                    <i class="fa-solid fa-compact-disc"></i>
                </span>
                <p class="mt-5 text-xs font-semibold uppercase tracking-wider text-faint">Your archetype</p>
                <h3 class="mt-2 text-3xl font-extrabold tracking-tight text-fg">${archetype.name}</h3>
                ${archetype.tagline ? `<p class="mt-1 text-sm font-medium text-accent-text">${archetype.tagline}</p>` : ''}
                <p class="mt-4 text-muted max-w-2xl mx-auto leading-relaxed">
                    ${archetype.description}
                </p>
                <div class="mt-6 flex justify-center gap-2 flex-wrap">
                    ${archetype.traits.map(t => `
                        <span class="px-4 py-1.5 rounded-full bg-surface border border-line text-sm font-medium text-fg">${t}</span>
                    `).join('')}
                </div>
                ${insights && insights.length ? `
                    <ul class="mt-7 max-w-xl mx-auto space-y-2 text-left">
                        ${insights.map(t => `
                            <li class="flex items-start gap-2 text-sm text-muted">
                                <i class="fa-solid fa-wand-magic-sparkles text-accent-text mt-0.5 shrink-0"></i>
                                <span>${t}</span>
                            </li>
                        `).join('')}
                    </ul>` : ''}
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                <!-- Genre DNA -->
                <div class="card bg-surface border border-line rounded-2xl p-6 lg:col-span-2">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fa-solid fa-dna text-accent-text"></i>
                        <h4 class="text-lg font-semibold text-fg">Genre DNA</h4>
                    </div>
                    ${data.genreNarrative ? `<p class="mb-5 text-sm text-muted leading-relaxed">${data.genreNarrative}</p>` : `<div class="mb-4"></div>`}
                    <div class="space-y-4">
                        ${topGenres.map(g => `
                            <div>
                                <div class="flex justify-between text-sm mb-1">
                                    <span class="text-fg capitalize">${g.genre}</span>
                                    <span class="text-faint">${Math.round(g.count / maxGenreCount * 100)}%</span>
                                </div>
                                <div class="h-2 bg-track rounded-full overflow-hidden">
                                    <div class="h-full bg-accent rounded-full transition-all duration-1000" style="width: ${Math.round(g.count / maxGenreCount * 100)}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Mood Breakdown -->
                <div class="card bg-surface border border-line rounded-2xl p-6">
                    <div class="flex items-center gap-2 mb-2">
                        <i class="fa-solid fa-brain text-accent-text"></i>
                        <h4 class="text-lg font-semibold text-fg">Mood Breakdown</h4>
                    </div>
                    ${data.moodNarrative ? `<p class="mb-5 text-sm text-muted leading-relaxed">${data.moodNarrative}</p>` : `<div class="mb-4"></div>`}
                    <div class="space-y-4">
                        ${Object.entries(moodBreakdown).map(([mood, val]) => `
                            <div>
                                <div class="flex justify-between text-sm mb-1">
                                    <span class="capitalize text-fg">${mood}</span>
                                    <span class="text-accent-text font-medium">${val}%</span>
                                </div>
                                <div class="h-2 bg-track rounded-full overflow-hidden">
                                    <div class="h-full bg-accent rounded-full" style="width: ${val}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Top Artists & Tracks Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                <!-- Top Artists -->
                <div class="card bg-surface border border-line rounded-2xl p-6">
                    <div class="flex items-center gap-2 mb-6">
                        <i class="fa-solid fa-users text-accent-text"></i>
                        <h4 class="text-lg font-semibold text-fg">Top Artists</h4>
                    </div>
                    <div class="space-y-2">
                        ${topArtists.map((a, i) => `
                            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors">
                                <span class="text-sm text-faint w-5 text-right">${i + 1}</span>
                                <div class="w-10 h-10 rounded-full bg-track flex items-center justify-center overflow-hidden shrink-0">
                                    ${a.images?.[0]?.url
                                        ? `<img src="${a.images[0].url}" alt="${a.name}" class="w-full h-full object-cover" />`
                                        : `<i class="fa-solid fa-user text-faint text-sm"></i>`
                                    }
                                </div>
                                <div class="min-w-0">
                                    <p class="text-sm font-medium text-fg truncate">${a.name}</p>
                                    <p class="text-xs text-muted capitalize truncate">${(a.genres || []).slice(0, 2).join(', ') || 'Artist'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Top Tracks -->
                <div class="card bg-surface border border-line rounded-2xl p-6">
                    <div class="flex items-center gap-2 mb-6">
                        <i class="fa-solid fa-music text-accent-text"></i>
                        <h4 class="text-lg font-semibold text-fg">Top Tracks</h4>
                    </div>
                    <div class="space-y-2">
                        ${topTracks.map((t, i) => `
                            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-2 transition-colors">
                                <span class="text-sm text-faint w-5 text-right">${i + 1}</span>
                                <div class="w-10 h-10 rounded-lg bg-track flex items-center justify-center shrink-0">
                                    <i class="fa-solid fa-play text-accent-text text-xs"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-sm font-medium text-fg truncate">${t.name}</p>
                                    <p class="text-xs text-muted truncate">${t.artists.map(a => a.name).join(', ')}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Audio Signature -->
            <div class="card bg-surface border border-line rounded-2xl p-6 mb-10">
                <div class="flex items-center gap-2 mb-2">
                    <i class="fa-solid fa-sliders text-accent-text"></i>
                    <h4 class="text-lg font-semibold text-fg">Audio Signature</h4>
                </div>
                ${featuresEstimated
                    ? `<p class="text-xs text-faint mb-6"><i class="fa-solid fa-circle-info mr-1"></i>Estimated from your genres — Spotify's detailed audio analysis wasn't available for your account.</p>`
                    : `<div class="mb-6"></div>`}
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    ${[
                        { label: 'Danceability', value: avgFeatures.danceability, icon: 'fa-person-running' },
                        { label: 'Energy', value: avgFeatures.energy, icon: 'fa-bolt' },
                        { label: 'Happiness', value: avgFeatures.valence, icon: 'fa-face-smile' },
                        { label: 'Acousticness', value: avgFeatures.acousticness, icon: 'fa-guitar' },
                        { label: 'Tempo', value: Math.min(avgFeatures.tempo / 200, 1), icon: 'fa-gauge-high', raw: Math.round(avgFeatures.tempo) + ' BPM' },
                        { label: 'Instrumentalness', value: avgFeatures.instrumentalness, icon: 'fa-music' },
                        { label: 'Liveness', value: avgFeatures.liveness, icon: 'fa-microphone' },
                        { label: 'Speechiness', value: avgFeatures.speechiness, icon: 'fa-comment' }
                    ].map(f => `
                        <div class="text-center p-3 rounded-lg hover:bg-surface-2 transition-colors">
                            <div class="relative w-20 h-20 mx-auto text-accent">
                                <svg class="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                                    <circle class="ring-track" cx="36" cy="36" r="30" fill="none" stroke-width="5"/>
                                    <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" stroke-width="5"
                                        stroke-dasharray="${Math.round(f.value * 188.5)} 188.5" stroke-linecap="round"/>
                                </svg>
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <i class="fa-solid ${f.icon} text-accent-text"></i>
                                </div>
                            </div>
                            <p class="mt-3 text-base font-semibold text-fg">${f.raw || Math.round(f.value * 100) + '%'}</p>
                            <p class="text-xs text-muted">${f.label}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Back Button -->
            <div class="flex justify-center">
                <button onclick="window.location.reload()" class="inline-flex items-center gap-2 border border-line text-fg font-semibold px-6 py-3 rounded-full hover:bg-surface-2 transition-colors active:scale-95">
                    <i class="fa-solid fa-arrow-left"></i>
                    Back to Home
                </button>
            </div>
        `;
    }


    // ──────────────────────────────────────────
    // 8. STORY REVEAL EXPERIENCE
    //    Tap-to-advance cards that reveal the
    //    persona one insight at a time.
    // ──────────────────────────────────────────

    function cap(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    }

    function getArchetypeIcon(name) {
        const map = {
            'The Architect': 'fa-compass-drafting',
            'The Midnight Dreamer': 'fa-moon',
            'The Synthesizer': 'fa-wand-magic-sparkles',
            'The Chaotic Motivator': 'fa-bolt',
            'The Storyteller': 'fa-book-open',
            'The Groove Master': 'fa-record-vinyl'
        };
        return map[name] || 'fa-compact-disc';
    }

    // Count a number up from 0 → target with easing
    function countUp(el, target, suffix, duration, delay) {
        el.textContent = '0' + suffix;
        setTimeout(() => {
            const start = performance.now();
            requestAnimationFrame(function step(now) {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                el.textContent = Math.round(eased * target) + suffix;
                if (t < 1) requestAnimationFrame(step);
            });
        }, delay);
    }

    // Trigger the count-ups, bar fills, and ring sweeps inside a card
    function animateCard(cardEl) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        cardEl.querySelectorAll('[data-count]').forEach(el => {
            const target = parseFloat(el.dataset.count);
            const suffix = el.dataset.suffix || '';
            const delay = parseInt(el.dataset.delay || '0', 10);
            if (reduced) { el.textContent = target + suffix; return; }
            countUp(el, target, suffix, 900, delay);
        });

        cardEl.querySelectorAll('[data-bar]').forEach(el => {
            const w = el.dataset.bar + '%';
            const delay = parseInt(el.dataset.delay || '0', 10);
            if (reduced) { el.style.width = w; return; }
            setTimeout(() => { el.style.width = w; }, delay);
        });

        cardEl.querySelectorAll('[data-ring]').forEach(el => {
            const dash = el.dataset.ring + ' 188.5';
            const delay = parseInt(el.dataset.delay || '0', 10);
            if (reduced) { el.setAttribute('stroke-dasharray', dash); return; }
            setTimeout(() => { el.setAttribute('stroke-dasharray', dash); }, delay);
        });
    }

    // Share the result (Web Share API → clipboard → alert fallback)
    function shareResult(data) {
        const text = `I'm "${data.archetype.name}" on Timbre 🎧 — ${data.archetype.traits.join(', ')}. Discover your music personality!`;
        if (navigator.share) {
            navigator.share({ title: 'Timbre', text }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => alert('Copied your result to the clipboard!'))
                .catch(() => alert(text));
        } else {
            alert(text);
        }
    }

    // Build the ordered list of story cards from the data
    function buildRevealCards(data) {
        const { profile, archetype, topArtists, topGenres, avgFeatures, moodBreakdown, featuresEstimated, genreNarrative, moodNarrative, insights } = data;
        const name = profile.display_name || 'there';
        const icon = getArchetypeIcon(archetype.name);
        const maxGenre = topGenres[0]?.count || 1;
        const f = avgFeatures;

        // Plain-language headlines
        const moodWord = f.valence > 0.6 ? 'bright and upbeat' : f.valence < 0.35 ? 'moody and introspective' : 'emotionally balanced';
        const energyWord = f.energy > 0.66 ? 'high-energy' : f.energy < 0.4 ? 'low-energy' : 'mid-tempo';
        const moodHeadline = `You lean ${moodWord}, ${energyWord}.`;
        const audioHeadline = `${f.acousticness > 0.5 ? 'Acoustic-leaning' : 'Produced and electric'}, moving at ${Math.round(f.tempo)} BPM.`;

        const cards = [];

        // Card 1 — Intro
        cards.push({
            html: `
                <div class="text-center">
                    <div class="reveal-item" style="animation-delay:0ms">
                        <span class="inline-block w-3 h-3 rounded-full bg-accent animate-pulse"></span>
                    </div>
                    <h2 class="reveal-item mt-8 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg" style="animation-delay:120ms">Your sound is decoded.</h2>
                    <p class="reveal-item mt-3 text-xl text-muted" style="animation-delay:240ms">Ready, ${name}?</p>
                    <p class="reveal-item mt-10 text-sm text-faint inline-flex items-center gap-1.5" style="animation-delay:400ms">tap to begin <i class="fa-solid fa-arrow-right"></i></p>
                </div>`
        });

        // Card 2 — Genre DNA
        cards.push({
            html: `
                <div>
                    <p class="reveal-item text-sm font-semibold uppercase tracking-wider text-accent-text" style="animation-delay:0ms">Your roots</p>
                    <h2 class="reveal-item mt-2 text-3xl font-bold tracking-tight text-fg" style="animation-delay:100ms">${genreNarrative || `You're built on ${cap(topGenres[0].genre)}.`}</h2>
                    <div class="mt-8 space-y-4">
                        ${topGenres.slice(0, 5).map((g, i) => {
                            const pct = Math.round(g.count / maxGenre * 100);
                            const d = 250 + i * 140;
                            return `
                                <div class="reveal-item" style="animation-delay:${d}ms">
                                    <div class="flex justify-between text-sm mb-1.5">
                                        <span class="text-fg capitalize">${g.genre}</span>
                                        <span class="text-faint"><span data-count="${pct}" data-suffix="%" data-delay="${d}">0%</span></span>
                                    </div>
                                    <div class="h-2.5 bg-track rounded-full overflow-hidden">
                                        <div class="reveal-bar-fill h-full bg-accent rounded-full" data-bar="${pct}" data-delay="${d}"></div>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>`
        });

        // Card 3 — Mood
        const moods = [
            { label: 'Energy', val: Math.round(f.energy * 100) },
            { label: 'Happiness', val: Math.round(f.valence * 100) },
            { label: 'Danceability', val: Math.round(f.danceability * 100) }
        ];
        cards.push({
            html: `
                <div>
                    <p class="reveal-item text-sm font-semibold uppercase tracking-wider text-accent-text" style="animation-delay:0ms">How it feels</p>
                    <h2 class="reveal-item mt-2 text-3xl font-bold tracking-tight text-fg" style="animation-delay:100ms">${moodNarrative || moodHeadline}</h2>
                    <div class="mt-8 space-y-5">
                        ${moods.map((m, i) => {
                            const d = 250 + i * 160;
                            return `
                                <div class="reveal-item" style="animation-delay:${d}ms">
                                    <div class="flex justify-between text-sm mb-1.5">
                                        <span class="text-fg">${m.label}</span>
                                        <span class="text-accent-text font-medium"><span data-count="${m.val}" data-suffix="%" data-delay="${d}">0%</span></span>
                                    </div>
                                    <div class="h-2.5 bg-track rounded-full overflow-hidden">
                                        <div class="reveal-bar-fill h-full bg-accent rounded-full" data-bar="${m.val}" data-delay="${d}"></div>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>`
        });

        // Card 4 — Audio signature (ring gauges)
        const rings = [
            { label: 'Tempo', norm: Math.min(f.tempo / 200, 1), display: Math.round(f.tempo), suffix: '', unit: 'BPM' },
            { label: 'Acousticness', norm: f.acousticness, display: Math.round(f.acousticness * 100), suffix: '%', unit: '' },
            { label: 'Instrumentalness', norm: f.instrumentalness, display: Math.round(f.instrumentalness * 100), suffix: '%', unit: '' },
            { label: 'Liveness', norm: f.liveness, display: Math.round(f.liveness * 100), suffix: '%', unit: '' }
        ];
        cards.push({
            html: `
                <div>
                    <p class="reveal-item text-sm font-semibold uppercase tracking-wider text-accent-text" style="animation-delay:0ms">Your fingerprint</p>
                    <h2 class="reveal-item mt-2 text-3xl font-bold tracking-tight text-fg" style="animation-delay:100ms">${audioHeadline}</h2>
                    ${featuresEstimated ? `<p class="reveal-item mt-3 text-xs text-faint" style="animation-delay:150ms"><i class="fa-solid fa-circle-info mr-1"></i>Estimated from your genres</p>` : ''}
                    <div class="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
                        ${rings.map((r, i) => {
                            const dash = (r.norm * 188.5).toFixed(1);
                            const d = 250 + i * 160;
                            return `
                                <div class="reveal-item text-center" style="animation-delay:${d}ms">
                                    <div class="relative w-24 h-24 mx-auto text-accent">
                                        <svg class="w-24 h-24 -rotate-90" viewBox="0 0 72 72">
                                            <circle class="ring-track" cx="36" cy="36" r="30" fill="none" stroke-width="5"/>
                                            <circle class="reveal-ring-fill" cx="36" cy="36" r="30" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-dasharray="0 188.5" data-ring="${dash}" data-delay="${d}"/>
                                        </svg>
                                        <div class="absolute inset-0 flex flex-col items-center justify-center leading-none">
                                            <span class="text-base font-bold text-fg"><span data-count="${r.display}" data-suffix="${r.suffix}" data-delay="${d}">0${r.suffix}</span></span>
                                            ${r.unit ? `<span class="mt-0.5 text-[10px] text-faint">${r.unit}</span>` : ''}
                                        </div>
                                    </div>
                                    <p class="mt-2 text-xs text-muted">${r.label}</p>
                                </div>`;
                        }).join('')}
                    </div>
                </div>`
        });

        // Card 5 — Top names
        cards.push({
            html: `
                <div>
                    <p class="reveal-item text-sm font-semibold uppercase tracking-wider text-accent-text" style="animation-delay:0ms">The names behind it</p>
                    <h2 class="reveal-item mt-2 text-3xl font-bold tracking-tight text-fg" style="animation-delay:100ms">${topArtists[0].name} shaped your sound most.</h2>
                    <div class="mt-6 divide-y divide-line">
                        ${topArtists.slice(0, 5).map((a, i) => {
                            const d = 250 + i * 130;
                            return `
                                <div class="reveal-item flex items-center gap-3 py-3" style="animation-delay:${d}ms">
                                    <span class="text-sm text-faint w-5 text-right">${i + 1}</span>
                                    <div class="w-10 h-10 rounded-full bg-track flex items-center justify-center overflow-hidden shrink-0">
                                        ${a.images?.[0]?.url
                                            ? `<img src="${a.images[0].url}" alt="${a.name}" class="w-full h-full object-cover" />`
                                            : `<i class="fa-solid fa-user text-faint text-sm"></i>`}
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-sm font-medium text-fg truncate">${a.name}</p>
                                        <p class="text-xs text-muted capitalize truncate">${(a.genres || []).slice(0, 2).join(', ') || 'Artist'}</p>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>`
        });

        // Card 6 — Archetype reveal (the payoff)
        cards.push({
            html: `
                <div class="rounded-3xl bg-accent/5 border border-accent/10 p-8 sm:p-12 text-center">
                    <div class="reveal-item" style="animation-delay:200ms">
                        <span class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 text-accent-text text-4xl"><i class="fa-solid ${icon}"></i></span>
                    </div>
                    <p class="reveal-item mt-6 text-sm font-semibold uppercase tracking-wider text-faint" style="animation-delay:450ms">You are</p>
                    <h2 class="reveal-item mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight text-fg" style="animation-delay:600ms">${archetype.name}</h2>
                    ${archetype.tagline ? `<p class="reveal-item mt-3 text-base font-medium text-accent-text" style="animation-delay:700ms">${archetype.tagline}</p>` : ''}
                    <p class="reveal-item mt-5 text-muted max-w-lg mx-auto leading-relaxed" style="animation-delay:800ms">${archetype.description}</p>
                    <div class="mt-7 flex justify-center gap-2 flex-wrap">
                        ${archetype.traits.map((t, i) => `<span class="reveal-item px-4 py-1.5 rounded-full bg-surface border border-line text-sm font-medium text-fg" style="animation-delay:${1000 + i * 150}ms">${t}</span>`).join('')}
                    </div>
                    ${insights && insights.length ? `
                        <ul class="reveal-item mt-7 max-w-md mx-auto space-y-2 text-left" style="animation-delay:${1000 + archetype.traits.length * 150}ms">
                            ${insights.map(t => `<li class="flex items-start gap-2 text-sm text-muted"><i class="fa-solid fa-wand-magic-sparkles text-accent-text mt-0.5 shrink-0"></i><span>${t}</span></li>`).join('')}
                        </ul>` : ''}
                </div>`
        });

        // Card 7 — Share / actions (persona card + end)
        cards.push({
            html: `
                <div class="text-center">
                    <div class="reveal-item mx-auto max-w-xs bg-fg text-bg rounded-2xl p-6 text-left shadow-xl border border-fg/10" style="animation-delay:0ms">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold uppercase tracking-wider text-bg/50">Timbre</span>
                            <i class="fa-solid ${icon} text-accent"></i>
                        </div>
                        <h3 class="mt-3 text-2xl font-bold">${archetype.name}</h3>
                        <p class="mt-1 text-sm text-bg/60">${archetype.traits.join(' · ')}</p>
                        <div class="mt-5 flex items-end gap-1 h-12">
                            ${[50, 30, 75, 100, 66, 40, 85, 55, 70, 45].map(h => `<div class="flex-1 bg-accent rounded-t" style="height:${h}%"></div>`).join('')}
                        </div>
                        <div class="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-bg/60">
                            <span>Top genre</span><span class="text-right text-bg capitalize">${topGenres[0].genre}</span>
                            <span>Energy</span><span class="text-right text-bg">${moodBreakdown.energetic}%</span>
                            <span>Happiness</span><span class="text-right text-bg">${moodBreakdown.happy}%</span>
                        </div>
                        <p class="mt-5 text-[10px] text-bg/40">timbre.app</p>
                    </div>

                    <div class="reveal-item mt-8" style="animation-delay:150ms">
                        <button data-action="share" class="inline-flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3 rounded-full hover:bg-accent-dark transition-colors active:scale-95">
                            <i class="fa-solid fa-share-nodes"></i> Share
                        </button>
                    </div>
                    <div class="reveal-item mt-5 flex justify-center items-center gap-4 text-sm text-muted" style="animation-delay:250ms">
                        <button data-action="dashboard" class="hover:text-fg transition-colors">See full breakdown</button>
                        <span class="text-faint">·</span>
                        <button data-action="restart" class="hover:text-fg transition-colors">Start over</button>
                    </div>
                </div>`
        });

        return cards;
    }

    // Launch the reveal overlay and manage navigation state
    function launchReveal(data) {
        hideLoading();

        // Build the full dashboard behind the scenes (used by "See full breakdown" / Skip)
        renderResults(data);

        // Clear any previous overlay
        const existingOverlay = document.getElementById('reveal-overlay');
        if (existingOverlay) existingOverlay.remove();

        const cards = buildRevealCards(data);
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let index = 0;

        const overlay = document.createElement('div');
        overlay.id = 'reveal-overlay';
        overlay.className = 'fixed inset-0 z-[70] bg-bg flex flex-col';
        if (reduced) overlay.classList.add('reveal-no-motion');

        overlay.innerHTML = `
            <div class="relative z-30 px-4 pt-4">
                <div class="flex gap-1.5 max-w-lg mx-auto">
                    ${cards.map((_, i) => `<button class="reveal-progress-seg" data-seg="${i}" aria-label="Go to card ${i + 1}"><span></span></button>`).join('')}
                </div>
                <div class="flex justify-end max-w-lg mx-auto mt-3">
                    <button id="reveal-skip" class="text-sm text-faint hover:text-fg transition-colors inline-flex items-center gap-1.5">Skip <i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>

            <div class="reveal-stage relative z-10 flex-1 flex items-center justify-center px-6 pb-8 overflow-y-auto">
                <div class="reveal-card"></div>
            </div>

            <button id="reveal-tap-left" class="reveal-tap absolute left-0 top-24 bottom-16 w-1/3 z-20" aria-label="Previous card"></button>
            <button id="reveal-tap-right" class="reveal-tap absolute right-0 top-24 bottom-16 w-2/3 z-20" aria-label="Next card"></button>

            <div class="relative z-30 pb-5 px-6 w-full max-w-lg mx-auto flex justify-between text-sm text-faint">
                <button id="reveal-back" class="inline-flex items-center gap-1.5 hover:text-fg transition-colors"><i class="fa-solid fa-arrow-left"></i> Back</button>
                <span id="reveal-hint" class="inline-flex items-center gap-1.5">Tap to continue <i class="fa-solid fa-arrow-right"></i></span>
            </div>`;

        document.body.appendChild(overlay);
        if (lenis) lenis.stop(); // freeze page scroll behind the overlay

        const cardEl = overlay.querySelector('.reveal-card');
        const stage = overlay.querySelector('.reveal-stage');
        const segs = Array.from(overlay.querySelectorAll('.reveal-progress-seg'));
        const backBtn = overlay.querySelector('#reveal-back');
        const hint = overlay.querySelector('#reveal-hint');
        const tapLeft = overlay.querySelector('#reveal-tap-left');
        const tapRight = overlay.querySelector('#reveal-tap-right');

        function render() {
            const card = cards[index];
            const isFinal = index === cards.length - 1;

            segs.forEach((s, i) => s.classList.toggle('filled', i <= index));

            // On the final card, disable tap zones so the buttons are clickable
            tapLeft.style.pointerEvents = isFinal ? 'none' : 'auto';
            tapRight.style.pointerEvents = isFinal ? 'none' : 'auto';
            backBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
            hint.style.visibility = isFinal ? 'hidden' : 'visible';

            cardEl.classList.remove('is-active');
            cardEl.innerHTML = card.html;
            void cardEl.offsetWidth; // force reflow so the animation restarts
            cardEl.classList.add('is-active');
            animateCard(cardEl);

            if (stage) stage.scrollTop = 0;
        }

        function next() { if (index < cards.length - 1) { index++; render(); } }
        function prev() { if (index > 0) { index--; render(); } }
        function goto(i) { if (i >= 0 && i < cards.length) { index = i; render(); } }

        function exitToDashboard() {
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            if (lenis) lenis.start();
            showResults();
        }

        function onKey(e) {
            if (e.key === 'ArrowRight') next();
            else if (e.key === 'ArrowLeft') prev();
            else if (e.key === 'Escape') exitToDashboard();
        }

        tapRight.addEventListener('click', next);
        tapLeft.addEventListener('click', prev);
        backBtn.addEventListener('click', prev);
        segs.forEach(s => s.addEventListener('click', () => goto(parseInt(s.dataset.seg, 10))));
        overlay.querySelector('#reveal-skip').addEventListener('click', exitToDashboard);
        document.addEventListener('keydown', onKey);

        // Delegated handlers for the final card's action buttons
        overlay.addEventListener('click', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.dataset.action;
            if (action === 'dashboard') exitToDashboard();
            else if (action === 'restart') window.location.reload();
            else if (action === 'share') shareResult(data);
        });

        // Swipe support (horizontal)
        let touchX = 0, touchY = 0;
        overlay.addEventListener('touchstart', (e) => {
            touchX = e.changedTouches[0].clientX;
            touchY = e.changedTouches[0].clientY;
        }, { passive: true });
        overlay.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchX;
            const dy = e.changedTouches[0].clientY - touchY;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) next(); else prev();
            }
        }, { passive: true });

        render();
    }
});
