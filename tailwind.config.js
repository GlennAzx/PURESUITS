/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ink-black': '#0b0c10',
        'ink-charcoal': '#14181f',
        'imperial-gold': '#d4af37',
        'imperial-gold-bright': '#f9d976',
        'jade-deep': '#071a12',
        'jade-accent': '#2e7d32',
        'cinnabar': '#c23b22',
        'ivory': '#f5f0e8',
        'ivory-shadow': '#dfd7c8',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Cinzel"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      transitionTimingFunction: {
        'ease-out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'ease-in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)',
        'ease-drawer': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      transitionDuration: {
        '160': '160ms',
        '200': '200ms',
        '250': '250ms',
      },
    },
  },
  plugins: [],
};
