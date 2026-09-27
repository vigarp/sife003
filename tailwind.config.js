/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#1d4ed8",
        "primary-dark": "#1e3a8a",
        "primary-navy": "#0f172a",
        "primary-subtle": "#dbeafe",
        secondary: "#d97706",
        "accent-gold": "#f59e0b",
        "gold-light": "#fef3c7",
        "gold-border": "#fcd34d",
        surface: "#f8fafc",
        "surface-card": "#ffffff",
        "surface-alt": "#f1f5f9",
        "border-ui": "#e2e8f0",
        "text-main": "#0f172a",
        "text-muted": "#475569",
        "text-subtle": "#64748b",
      },
      spacing: {
        "space-xs": "0.25rem",
        "space-sm": "0.5rem",
        "space-md": "1rem",
        "space-lg": "1.5rem",
        "space-xl": "2rem",
        "margin-mobile": "1rem",
        margin: "2rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
