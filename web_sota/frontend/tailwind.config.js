/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        depot: {
          50: "#f0f5ff",
          100: "#e0ebff",
          200: "#b8d4fe",
          300: "#7eb4fc",
          400: "#3d8ef7",
          500: "#1a6de8",
          600: "#0d53c5",
          700: "#0e40a0",
          800: "#0f3784",
          900: "#0f306d",
          950: "#0a1f48",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
