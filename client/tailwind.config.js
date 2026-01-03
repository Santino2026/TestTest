/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand
        primary: {
          DEFAULT: '#1a56db',
          hover: '#1e40af',
          light: '#dbeafe',
        },
        // Backgrounds (white theme)
        surface: '#f8fafc',
        elevated: '#f1f5f9',
        muted: '#e2e8f0',
        // Badge tiers
        gold: '#ca8a04',
        silver: '#71717a',
        bronze: '#a16207',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
