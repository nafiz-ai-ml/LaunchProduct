import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          subtle: 'var(--color-primary-subtle)',
          focus: 'var(--color-primary-focus)',
        },
        brand: {
          primary: '#0653FD',
          electric: '#0653FD',
          hover: '#0543D6',
          active: '#0436B0',
          subtle: '#EFF4FF',
          navy: '#00214E',
        },
        bg: 'var(--color-bg)',
        canvas: 'var(--color-bg)', // Backward-compatible canvas alias
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          sunken: 'var(--color-surface-sunken)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverted: 'var(--color-text-inverted)',
        },
        foreground: 'var(--color-text-primary)', // Backward-compatible foreground alias
        muted: 'var(--color-text-muted)', // Backward-compatible muted alias
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
          hover: 'var(--color-border-hover)',
        },
        sponsored: {
          badge: 'var(--color-sponsored-badge)',
          bg: 'var(--color-sponsored-bg)',
          border: 'var(--color-sponsored-border)',
        },
        status: {
          success: 'var(--color-success)',
          'success-bg': 'var(--color-success-bg)',
          'success-border': 'var(--color-success-border)',
          warning: 'var(--color-warning)',
          'warning-bg': 'var(--color-warning-bg)',
          'warning-border': 'var(--color-warning-border)',
          error: 'var(--color-error)',
          'error-bg': 'var(--color-error-bg)',
          'error-border': 'var(--color-error-border)',
          info: 'var(--color-info)',
          'info-bg': 'var(--color-info-bg)',
          'info-border': 'var(--color-info-border)',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        hover: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        popover: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        'brand-glow': '0 0 20px -3px rgba(6, 83, 253, 0.35)',
        'amber-glow': '0 0 20px -3px rgba(245, 158, 11, 0.35)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
      },
      transitionTimingFunction: {
        'motion-fast': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'motion-base': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'motion-smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'motion-spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      transitionDuration: {
        '120': '120ms',
        '180': '180ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '350': '350ms',
      },
    },
  },
  plugins: [],
};

export default config;

