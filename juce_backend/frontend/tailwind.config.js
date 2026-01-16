/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // DAW-specific design tokens
      colors: {
        // Dark theme colors for professional audio interface
        'daw-bg': {
          primary: '#1a1a1a',
          secondary: '#2a2a2a',
          tertiary: '#3a3a3a',
        },
        'daw-surface': {
          primary: '#2d2d2d',
          secondary: '#3d3d3d',
          tertiary: '#4d4d4d',
        },
        'daw-accent': {
          primary: '#00ff88',
          secondary: '#ff6b35',
          tertiary: '#4ecdc4',
        },
        'daw-text': {
          primary: '#ffffff',
          secondary: '#cccccc',
          tertiary: '#999999',
        },
        // Audio-specific colors
        'audio-level': {
          green: '#00ff00',
          yellow: '#ffff00',
          orange: '#ff8800',
          red: '#ff0000',
        },
      },
      spacing: {
        // Audio control spacing
        'knob': '3rem',
        'fader': '1.5rem',
        'channel': '4rem',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      screens: {
        'mobile': '320px',
        'tablet': '768px',
        'desktop': '1024px',
        'studio': '1440px',
        'ultrawide': '2560px',
      },
      animation: {
        'level-meter': 'level-meter 0.1s ease-in-out',
        'spectrum': 'spectrum 0.05s linear',
      },
      keyframes: {
        'level-meter': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'spectrum': {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}