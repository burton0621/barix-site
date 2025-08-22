// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f5f8fa",
          100: "#e6edf3",
          200: "#c1d5e4",
          300: "#9bbcd5",
          400: "#5f8bb7",
          500: "#31679b",
          600: "#194d7a",
          700: "#133a5d",
          800: "#0d2942",
          900: "#0a2540", // Stripe navy
          950: "#06182a",
          DEFAULT: "#0a2540"
        }
      }
    }
  },
  plugins: []
};
