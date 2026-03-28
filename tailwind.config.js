/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
      },
      colors: {
        mp: {
          bg:     'rgb(var(--mp-bg) / <alpha-value>)',
          s1:     'rgb(var(--mp-s1) / <alpha-value>)',
          s2:     'rgb(var(--mp-s2) / <alpha-value>)',
          s3:     'rgb(var(--mp-s3) / <alpha-value>)',
          s4:     'rgb(var(--mp-s4) / <alpha-value>)',
          border: 'rgb(var(--mp-border) / <alpha-value>)',
          t0:     'rgb(var(--mp-t0) / <alpha-value>)',
          t1:     'rgb(var(--mp-t1) / <alpha-value>)',
          t2:     'rgb(var(--mp-t2) / <alpha-value>)',
          red:    'rgb(var(--mp-red) / <alpha-value>)',
          blue:   'rgb(var(--mp-blue) / <alpha-value>)',
          green:  'rgb(var(--mp-green) / <alpha-value>)',
          amber:  'rgb(var(--mp-amber) / <alpha-value>)',
          purple: 'rgb(var(--mp-purple) / <alpha-value>)',
          pink:   'rgb(var(--mp-pink) / <alpha-value>)',
        },
      },
      screens: { xs: '375px' },
      animation: {
        'pulse-slow':      'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-down':      'slideDown 0.3s ease-out',
        'fade-in':         'fadeIn 0.2s ease-out',
        'slide-in-left':   'slideInLeft 0.25s ease-out',
      },
      keyframes: {
        slideDown:    { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        slideInLeft:  { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
