import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Mooove palette
        mooove: {
          navy: '#052139',
          cyan: '#2AC2DE',
          amber: '#F6923E',
          electric: '#3C5EAB',
          ice: '#EFF9FE',
          sky: '#C7EAFB'
        },
        // Papyrus palette
        papyrus: {
          bg: '#F7F0DC',
          surface: '#FFFDF5',
          border: '#D4B896',
          muted: '#8B7355',
          ink: '#2A1F0E'
        },
        // Semantic tokens (driven by CSS variables in globals.css)
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)'
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)'
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          cta: 'var(--accent-cta)',
          warm: 'var(--accent-warm)',
          bold: 'var(--accent-bold)'
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)'
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-body)',
        serif: 'var(--font-serif)',
        mono: 'var(--font-mono)'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 280ms cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
};

export default config;