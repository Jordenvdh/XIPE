import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1a1a1a',
        'dark-surface': '#2d2d2d',
        'light-text': '#e5e5e5',
        'brand-blue': '#3b82f6',
        'brand-orange': '#f97316',
        'table-input': '#fef3c7',
        'table-input-hover': '#fde68a',
      },
      backgroundColor: {
        'dark-bg': '#1a1a1a',
        'dark-surface': '#2d2d2d',
      },
      textColor: {
        'light-text': '#e5e5e5',
      },
    },
  },
  plugins: [],
};

export default config;

