/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warmBg: "#0A0A0B",
        surface: "#141416",
        surfaceRaised: "#1A1A1E",
        charcoal: "#F0F0F0",
        secondaryText: "#8B8B8B",
        electricBlue: "#3B82F6",
        accentGlow: "rgba(59,130,246,0.15)",
        acidGreen: "#84CC16",
        softOrange: "#F97316",
        borderDark: "rgba(255,255,255,0.06)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["General Sans", "Space Grotesk", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
