---
name: Sonic Depth
colors:
  surface: '#0e150e'
  surface-dim: '#0e150e'
  surface-bright: '#333b33'
  surface-container-lowest: '#091009'
  surface-container-low: '#161d16'
  surface-container: '#1a211a'
  surface-container-high: '#242c24'
  surface-container-highest: '#2f372e'
  on-surface: '#dde5d9'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#dde5d9'
  inverse-on-surface: '#2b322a'
  outline: '#869585'
  outline-variant: '#3d4a3d'
  surface-tint: '#53e076'
  primary: '#53e076'
  on-primary: '#003914'
  primary-container: '#1db954'
  on-primary-container: '#004118'
  inverse-primary: '#006e2d'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#c8c6c6'
  on-tertiary: '#303030'
  tertiary-container: '#a2a1a1'
  on-tertiary-container: '#383838'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#72fe8f'
  primary-fixed-dim: '#53e076'
  on-primary-fixed: '#002108'
  on-primary-fixed-variant: '#005320'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e2'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#0e150e'
  on-background: '#dde5d9'
  surface-variant: '#2f372e'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

The brand personality is immersive, rhythmic, and high-fidelity. It is designed for music enthusiasts, creators, and audiophiles who seek a cinematic experience while browsing media. The UI should feel like a premium hi-fi interface—dark, focused, and alive with subtle movement.

The design style is **Glassmorphism** integrated with **High-Contrast Modernism**. This system utilizes translucent layers and backdrop blurs to create a sense of physical depth, while "Spotify Green" provides an energetic neon focal point against a deep, voids-like charcoal background. The emotional response should be one of "flow"—unobtrusive yet visually arresting.

## Colors

This design system utilizes a "Deep Dark" palette optimized for OLED screens and low-light environments. 

- **Primary:** The vibrant green (#1DB954) is reserved for high-action items, progress indicators, and active states. It should appear to "glow" against the dark background.
- **Background:** A pure deep charcoal (#121212) serves as the foundation to maximize contrast.
- **Surface:** Surfaces use a translucent dark gray with a `20px` backdrop-blur to create the glassmorphic effect. 
- **Functional Colors:** Use pure white (#FFFFFF) for primary text and a medium gray (#B3B3B3) for secondary metadata to maintain clear information hierarchy.

## Typography

The typography strategy balances high-impact editorial style with technical precision. 

- **Headlines:** Use **Hanken Grotesk** for its sharp, contemporary geometric forms. Bold weights are preferred to ensure they command attention even against vibrant backgrounds.
- **Body:** **Inter** provides maximum legibility for track listings, descriptions, and settings.
- **Labels:** **Geist** is used for technical metadata (timestamps, bitrates, UI labels) to provide a clean, "monospaced-adjacent" feel that suggests precision.

For mobile devices, `display-lg` should scale down to `32px` to ensure text does not wrap awkwardly on small screens.

## Layout & Spacing

This design system follows a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

The layout philosophy emphasizes generous negative space around hero content (like album art) while maintaining a tight, efficient grid for list-based data (like tracklists). 

- **Safe Zones:** Always maintain a minimum `24px` margin on mobile to prevent content from hitting the screen edge.
- **Rhythm:** All spacing must be a multiple of the `4px` base unit. Use `16px` (md) for standard component padding and `40px` (xl) for section vertical spacing.

## Elevation & Depth

Depth is achieved through **Tonal Stacking** and **Optical Blurs** rather than traditional drop shadows.

- **Level 0 (Background):** Pure #121212.
- **Level 1 (Cards/Sidebar):** Surface Glass (70% opacity) with a 20px backdrop-blur and a subtle `1px` inner border (stroke) of `white @ 10%` to define the edge.
- **Level 2 (Modals/Popovers):** Higher opacity surface (85%) with a soft, expansive `40px` blur shadow tinted with the primary green (#1DB954) at very low opacity (10%).

Floating action buttons and active play controls should utilize a "Neon Glow"—a drop shadow with 0 spread, 12px blur, using the Primary color at 50% opacity.

## Shapes

The shape language is highly organic and approachable. 

- **Standard Elements:** Use `0.5rem` (rounded) for input fields and small UI elements.
- **Containers:** Large cards and glassmorphic panels must use `rounded-2xl` (1.5rem) to emphasize the soft, premium aesthetic.
- **Interactive:** Buttons and Chips should be fully **Pill-shaped** to differentiate them from static content containers.

## Components

- **Buttons:** Primary buttons are pill-shaped, #1DB954 background, with black text. On hover, apply a `0px 0px 20px rgba(29, 185,  green, 0.6)` glow. Secondary buttons use a ghost style with a white border.
- **Glass Cards:** Must feature `backdrop-filter: blur(20px)` and a thin `1px` border at the top and left edges to simulate light hitting glass.
- **Progress Bars:** Background track is `rgba(255,255,255,0.1)`. The active fill is the Primary Green. The "thumb" or handle only appears on hover.
- **Chips:** Small, pill-shaped labels with a `rgba(255,255,255,0.05)` background and `12px` Geist typography.
- **Inputs:** Darker than the background (#080808) with a bottom-only primary green border on focus to mimic high-end audio hardware displays.
- **Music Visualizers:** Use thin vertical bars with varying heights, utilizing a gradient transition from Primary Green to a secondary teal.