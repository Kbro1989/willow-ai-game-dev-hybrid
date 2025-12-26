/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Your custom colors/theme from the accessibility report
      colors: {
        'forge-dark': '#050a15',
      }
    },
  },
  plugins: [],
}
