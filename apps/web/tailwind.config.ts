import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#0F1B2D',
        foreground: '#FFFFFF',
        accent: '#00C2FF',
        muted: 'rgba(255,255,255,0.6)',
        'muted-foreground': 'rgba(255,255,255,0.5)',
        border: 'rgba(255,255,255,0.1)',
        input: 'rgba(255,255,255,0.08)',
        primary: '#00C2FF',
        'primary-foreground': '#0F1B2D',
        secondary: 'rgba(0,194,255,0.15)',
        'secondary-foreground': '#FFFFFF',
        card: 'rgba(255,255,255,0.03)',
        'card-foreground': '#FFFFFF',
        popover: '#0F1B2D',
        'popover-foreground': '#FFFFFF',
        ring: '#00C2FF',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 194, 255, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 194, 255, 0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
