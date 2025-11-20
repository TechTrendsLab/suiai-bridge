/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a', // dark blue background similar to wormhole
        surface: '#1e293b',
        primary: '#6366f1',
      }
    },
  },
  plugins: [],
}

