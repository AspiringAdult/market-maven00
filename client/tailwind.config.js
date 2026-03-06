/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['"Syne"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        void:    '#060a10',
        ink:     '#0b1120',
        card:    '#111827',
        cardHi:  '#1a2436',
        border:  '#1f2f45',
        borderHi:'#2a3f5a',
        muted:   '#4a6080',
        dim:     '#7a94b0',
        text:    '#c8d8ea',
        bright:  '#e8f2ff',
        up:      '#10b981',
        upDim:   '#064e35',
        down:    '#f43f5e',
        downDim: '#4c0a1a',
        gold:    '#f59e0b',
        blue:    '#3b82f6',
        violet:  '#8b5cf6',
        cyan:    '#06b6d4',
      },
      boxShadow: {
        card:   '0 0 0 1px rgba(31,47,69,0.8), 0 4px 24px rgba(0,0,0,0.4)',
        glow:   '0 0 20px rgba(16,185,129,0.15)',
        red:    '0 0 20px rgba(244,63,94,0.15)',
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(31,47,69,0.3) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(31,47,69,0.3) 1px, transparent 1px)`,
        'scan-lines':   'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      },
    },
  },
  plugins: [],
};