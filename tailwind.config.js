/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#f5f5f4',
        'canvas-dark': '#0c0a09',
        surface: '#ffffff',
        'surface-dark': '#1c1917',
        ink: '#0c0a09',
        'ink-dark': '#ffffff',
        muted: '#78716c',
        'muted-dark': '#a8a29e',
        border: '#e7e5e4',
        'border-dark': '#292524',
        primary: '#15803d',
        'primary-dark': '#4ade80',
      },
    },
  },
  plugins: [],
};
