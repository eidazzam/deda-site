import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark palette — black-first surface, gold ink, brighter gold
        // for CTAs. Tokens keep their semantic role (bg = surface, ink =
        // text on surface) so component class names stay stable; the
        // values just flipped light→dark and black→gold.
        bg: '#0d0d0d',          // page surface — near-pure black
        'bg-card': '#1a1a1a',   // product cards + elevated surfaces
        'bg-sand': '#262626',   // section dividers, secondary panels
        ink: '#c9a961',         // primary text — brand gold
        'ink-soft': '#9c7f42',  // secondary text — dimmer gold
        'ink-mute': '#6f5a30',  // metadata, captions — even dimmer
        subtle: '#262626',      // legacy alias → bg-sand
        border: '#3a2f1a',      // hairline dividers — very dim gold
        'border-strong': '#5a4a2a', // stronger dividers
        muted: '#9c7f42',       // legacy alias → ink-soft
        // Brighter gold reserved for CTAs + badges so they outshine the
        // body text (which is also gold). `accent-dark` is the body gold,
        // so hover states tone CTAs down toward the text colour.
        accent: '#e8c678',
        'accent-dark': '#c9a961',  // hover state
        'accent-faint': '#26200f', // soft gold-tinted dark badge bg
        // Status colors stay muted against the dark surface.
        red: '#e07a7a',
        green: '#7fb069',
      },
      fontFamily: {
        // Inter for both display + body in Latin context. El Messiri takes
        // over for Arabic display via the RTL override in globals.css.
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        ar: ['var(--font-ar)', 'system-ui', 'sans-serif'],
        'ar-display': ['var(--font-ar-display)', 'var(--font-ar)', 'sans-serif'],
      },
      fontSize: {
        // Gulf minimal scale — generous on display, restrained on body.
        'display-2xl': ['5rem', { lineHeight: '0.95', letterSpacing: '-0.01em' }],
        'display-xl':  ['4rem', { lineHeight: '0.98', letterSpacing: '-0.01em' }],
        'display-lg':  ['3rem', { lineHeight: '1.05', letterSpacing: '-0.005em' }],
        'display-md':  ['2.25rem', { lineHeight: '1.1' }],
        label:         ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.18em' }],
      },
      maxWidth: {
        page: '1280px',
      },
      letterSpacing: {
        widest: '0.3em',
      },
      spacing: {
        section: '6.25rem',      // 100px — generous Gulf rhythm
        'section-md': '4rem',    // 64px — mobile rhythm
        component: '3rem',       // 48px between components
      },
      borderRadius: {
        // Flat aesthetic — sharp edges feel luxury here.
        none: '0',
        sm: '2px',
        md: '4px',
      },
      animation: {
        'fade-up': 'fadeUp 400ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 300ms ease-out both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
