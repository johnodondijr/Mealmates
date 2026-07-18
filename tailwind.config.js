/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Clean, modern, grown-up. Headings differ from body by weight, not face.
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightish: '-0.01em',
      },
      colors: {
        // Warm, appetizing palette — no cold corporate blue.
        cream: '#FFF8F0',
        paprika: {
          50: '#FFF1EC',
          100: '#FFE0D4',
          200: '#FFC0A8',
          300: '#FF9D78',
          400: '#FF7A4D',
          500: '#F45A28',
          600: '#DB4417',
          700: '#B53410',
          800: '#8F2A12',
          900: '#732513',
        },
        mango: {
          50: '#FFF8E6',
          100: '#FFEDBF',
          200: '#FFD980',
          300: '#FFC44D',
          400: '#FFB01F',
          500: '#F59300',
          600: '#CC7700',
          700: '#A35C00',
        },
        avocado: {
          50: '#F2F7E9',
          100: '#E0EDC8',
          200: '#C3DD93',
          300: '#A3C95E',
          400: '#86B23A',
          500: '#6B942A',
          600: '#537322',
        },
        charcoal: {
          50: '#F6F5F4',
          100: '#E7E4E1',
          800: '#2B2622',
          900: '#1C1815',
          950: '#120F0D',
        },
      },
      boxShadow: {
        // Layered, restrained elevation — a tight contact shadow plus a soft
        // ambient one, rather than one big blur.
        pop: '0 1px 2px rgba(180, 52, 16, 0.20), 0 10px 24px -10px rgba(244, 90, 40, 0.45)',
        card: '0 1px 2px rgba(28, 24, 21, 0.05), 0 12px 28px -18px rgba(28, 24, 21, 0.22)',
        sheet: '0 -8px 40px -12px rgba(28, 24, 21, 0.28)',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
}
