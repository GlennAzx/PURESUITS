/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Channel form so opacity modifiers keep working (46 usages, e.g.
        // imperial-gold/30). The values live in src/index.css as --c-* so a
        // palette swaps every colour without touching a component.
        'ink-black': 'rgb(var(--c-ink-black) / <alpha-value>)',
        'ink-charcoal': 'rgb(var(--c-ink-charcoal) / <alpha-value>)',
        'imperial-gold': 'rgb(var(--c-imperial-gold) / <alpha-value>)',
        'imperial-gold-bright': 'rgb(var(--c-imperial-gold-bright) / <alpha-value>)',
        'jade-deep': 'rgb(var(--c-jade-deep) / <alpha-value>)',
        'jade-accent': 'rgb(var(--c-jade-accent) / <alpha-value>)',
        'cinnabar': 'rgb(var(--c-cinnabar) / <alpha-value>)',
        'ivory': 'rgb(var(--c-ivory) / <alpha-value>)',
        'ivory-shadow': 'rgb(var(--c-ivory-shadow) / <alpha-value>)',
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
