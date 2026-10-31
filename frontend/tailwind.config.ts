import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Bilingual-First Minimal — warm cream surface, soft black ink,
        // restrained gold accent. Tokens keep their semantic role (bg =
        // surface, ink = text on surface) so component class names stay
        // stable.
        bg: '#faf7f2',          // page surface — warm cream, not pure white
        'bg-card': '#ffffff',   // product cards and elevated surfaces
        'bg-sand': '#f3ede2',   // section dividers, secondary panels
        ink: '#1a1a1a',         // primary text — soft black, not pure
        'ink-soft': '#5c5c5c',  // secondary text
        'ink-mute': '#8a857d',  // metadata, captions
        subtle: '#f3ede2',      // legacy alias → bg-sand
        border: '#e8e4dc',      // hairline dividers
        'border-strong': '#d4cec0', // stronger dividers
        muted: '#5c5c5c',       // legacy alias → ink-soft
        // DEDA brand gold — more saturated than Rozana's warm tan so it
        // pops against the black header + hero. Used sparingly for CTAs,
        // discount prices, and the limited-time chip.
        accent: '#c9a961',
        'accent-dark': '#9c7f42',  // hover state
        'accent-faint': '#f0e4c4', // soft gold badge background
        // Muted status colors — Gulf restraint, no bright reds/greens.
        red: '#c54a4a',
        green: '#5a8a5a',
      },
      fontFamily: {
        // Inter for both display + body in Latin context. Reem Kufi takes
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
