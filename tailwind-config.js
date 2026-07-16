/* ============================================
   TIMBRE - TAILWIND CSS CONFIGURATION
   Theme: Minimal / Professional (light + dark)
   Semantic tokens backed by CSS variables so
   the whole palette can flip with a .dark class.
   ============================================ */

tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Semantic tokens (values live in styles.css :root / .dark)
                bg:            "rgb(var(--bg) / <alpha-value>)",
                surface:       "rgb(var(--surface) / <alpha-value>)",
                "surface-2":   "rgb(var(--surface-2) / <alpha-value>)",
                line:          "rgb(var(--line) / <alpha-value>)",
                track:         "rgb(var(--track) / <alpha-value>)",
                fg:            "rgb(var(--fg) / <alpha-value>)",
                muted:         "rgb(var(--muted) / <alpha-value>)",
                faint:         "rgb(var(--faint) / <alpha-value>)",
                "accent-text": "rgb(var(--accent-text) / <alpha-value>)",

                // Fixed brand green (same in both themes)
                accent:        "#1db954",
                "accent-dark": "#158f41"
            },

            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"]
            }
        }
    }
};
