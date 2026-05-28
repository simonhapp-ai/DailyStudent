/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'SF Pro Display'",
          "'SF Pro Text'",
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-hover': 'rgb(var(--color-surface-hover) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-soft': 'var(--color-accent-soft)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        pill: '999px',
        sheet: '24px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.05), 0 2px 10px rgba(0,0,0,0.04)',
        'card-md': '0 2px 8px rgba(0,0,0,0.07), 0 4px 20px rgba(0,0,0,0.05)',
        float: '0 4px 20px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)',
        modal: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        ios: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
