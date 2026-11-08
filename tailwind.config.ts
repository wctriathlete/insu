import type { Config } from 'tailwindcss'

// Sereno design tokens. Every color resolves to a CSS variable defined in
// app/globals.css, so light/dark is a variable swap (data-theme on <html> or
// any subtree), never a per-class `dark:` override.
//
// Radius names differ from the handoff's s/l on purpose: Tailwind already uses
// `rounded-s` / `rounded-l` for logical/side corners, so those would collide.
//   handoff s  (10px) → rounded-badge
//   handoff m  (14px) → rounded-m
//   handoff l  (20px) → rounded-card
//   handoff xl (24px) → rounded-xl
//   handoff 2xl(32px) → rounded-2xl
const config: Config = {
  darkMode: ['variant', ['&:is([data-theme="dark"] *)']],
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        mist: 'var(--mist)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        track: 'var(--track)',
        ink: 'var(--ink)',
        'ink-secondary': 'var(--ink-secondary)',
        'ink-muted': 'var(--ink-muted)',
        sky: 'var(--sky)',
        'sky-deep': 'var(--sky-deep)',
        'on-sky': 'var(--on-sky)',
        sun: 'var(--sun)',
        'on-sun': 'var(--on-sun)',
        'caution-bg': 'var(--caution-bg)',
        'caution-ink': 'var(--caution-ink)',
        pay: 'var(--pay)',
        'pay-bg': 'var(--pay-bg)',
        'pay-ink': 'var(--pay-ink)',
        danger: 'var(--danger)',
        'danger-bg': 'var(--danger-bg)',
        panel: 'var(--panel)',
        'on-panel': 'var(--on-panel)',
        'on-panel-muted': 'var(--on-panel-muted)',
      },
      fontFamily: {
        display: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        badge: '10px',
        m: '14px',
        card: '20px',
        xl: '24px',
        '2xl': '32px',
      },
      fontSize: {
        'display-xl': ['76px', { lineHeight: '0.98' }],
        'display-l': ['44px', { lineHeight: '1' }],
        'display-m': ['38px', { lineHeight: '1.02' }],
        'display-s': ['26px', { lineHeight: '1.1' }],
        'amount-xl': ['88px', { lineHeight: '1' }],
        amount: ['34px', { lineHeight: '1.1' }],
        title: ['17px', { lineHeight: '24px', fontWeight: '800' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '500' }],
        'body-s': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        label: ['14px', { lineHeight: '20px', fontWeight: '700' }],
        button: ['16px', { lineHeight: '20px', fontWeight: '800' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '600' }],
        eyebrow: ['12px', { lineHeight: '16px', letterSpacing: '1.5px', fontWeight: '700' }],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}

export default config
