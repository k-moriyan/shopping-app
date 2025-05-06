/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        rounded: ['"M PLUS Rounded 1c"', 'sans-serif'],
      },
      colors: {
        lightblue: {
          100: '#E0F7FA',
          200: '#B2EBF2',
          300: '#80DEEA',
        },
      },
    },
  },
  plugins: [],
}
