/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0e0f14',
          card: '#13141c',
          elevated: '#1a1b26',
          border: '#252637',
        },
        accent: {
          DEFAULT: '#6ee7b7',
          dim: '#34d399',
          muted: '#1a4035',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
