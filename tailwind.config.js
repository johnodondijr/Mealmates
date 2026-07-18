/** @type {import('tailwindcss').Config} */

// Palette adapted from the reference design language:
//   canvas  = warm greige background        (token: `cream`)
//   ink/grey= near-black headings + grey     (token: `charcoal`)
//   accent  = one fresh leaf green           (tokens: `paprika` + `avocado`)
//   gold    = highlight / badges             (token: `mango`)
// Token *names* are kept stable so the whole app recolours from here; their
// meaning is the mapping above (an intentional, documented remap).
const green = {
  50: '#EEF6E3',
  100: '#DBECC4',
  200: '#C0DD98',
  300: '#A1CC6A',
  400: '#86BA46',
  500: '#6EA630',
  600: '#578A24',
  700: '#42691C',
  800: '#33531A',
  900: '#2A4417',
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Warm greige canvas
        cream: '#EBE7E0',
        // Leaf-green accent (primary accent across chrome)
        paprika: green,
        avocado: green,
        // Gold highlight
        mango: {
          50: '#FEF7E2',
          100: '#FDECBC',
          200: '#FBD97D',
          300: '#F9C63F',
          400: '#F5B10A',
          500: '#D8990A',
          600: '#AE7A08',
          700: '#835B06',
        },
        // Warm ink + greys for text and dark surfaces
        charcoal: {
          50: '#F5F3EF',
          100: '#E6E2DB',
          200: '#D3CEC5',
          800: '#3A382F',
          900: '#22201B',
          950: '#161410',
        },
      },
      boxShadow: {
        // Soft, neutral, restrained — like the reference cards.
        pop: '0 1px 2px rgba(28, 24, 21, 0.08), 0 12px 26px -14px rgba(28, 24, 21, 0.30)',
        card: '0 1px 2px rgba(28, 24, 21, 0.04), 0 14px 32px -20px rgba(28, 24, 21, 0.22)',
        sheet: '0 -8px 44px -14px rgba(28, 24, 21, 0.30)',
      },
      letterSpacing: {
        tightish: '-0.01em',
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
