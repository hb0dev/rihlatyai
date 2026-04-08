/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#0f1419',
          card: '#1e252d',
          'card-high': '#262e36',
          border: '#334155',
          surface: '#1a2027',
        },
        surface: {
          DEFAULT: '#f8fafb',
          dim: '#d8dcdd',
          container: '#eef1f2',
          'container-high': '#e6eaeb',
        }
      },
      boxShadow: {
        'elevation-1': '0 1px 3px 1px rgba(0,0,0,0.08), 0 1px 2px 0 rgba(0,0,0,0.04)',
        'elevation-2': '0 2px 6px 2px rgba(0,0,0,0.08), 0 1px 2px 0 rgba(0,0,0,0.04)',
        'elevation-3': '0 4px 8px 3px rgba(0,0,0,0.08), 0 1px 3px 0 rgba(0,0,0,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
