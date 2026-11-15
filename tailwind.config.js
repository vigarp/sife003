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
        primary: "#2563eb",
        "primary-dark": "#1d4ed8",
        "primary-navy": "#0f172a",
        "primary-subtle": "#eff6ff",
        secondary: "#d97706",
        "accent-gold": "#f59e0b",
        "gold-light": "#fef3c7",
        "gold-border": "#fcd34d",
        surface: "#f5f7fa",
        "surface-card": "#ffffff",
        "surface-alt": "#f1f5f9",
        "border-ui": "#e2e8f0",
        "text-main": "#0f172a",
        "text-muted": "#64748b",
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
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
