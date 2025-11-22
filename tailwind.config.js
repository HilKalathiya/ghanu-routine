/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- THIS LINE IS CRITICAL FOR DARK MODE
  theme: {
    extend: {},
  },
  plugins: [],
}