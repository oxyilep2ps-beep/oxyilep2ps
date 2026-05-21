import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff3ee',
          100: '#ffe4d8',
          200: '#ffc7ab',
          300: '#ffa274',
          400: '#ff814a',
          500: '#ff5a1f',
          600: '#eb470b',
          700: '#c53608',
          800: '#9d2d0b',
          900: '#7f2a10',
        },
      },
      boxShadow: {
        glow: '0 20px 60px rgba(255, 90, 31, 0.18)',
        glass: '0 20px 80px rgba(15, 23, 42, 0.12)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -14px, 0)' },
        },
        drift: {
          '0%': { transform: 'translate3d(-2%, -2%, 0) scale(1)' },
          '50%': { transform: 'translate3d(2%, 2%, 0) scale(1.08)' },
          '100%': { transform: 'translate3d(-2%, -2%, 0) scale(1)' },
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '25%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        pop: 'pop 0.55s ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;