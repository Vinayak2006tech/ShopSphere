/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: '#FAF7F2',
          surface: '#FFFFFF',
          primary: '#1F1B16',
          muted: '#6B6459',
          border: '#E8E1D6',
        },
        terracotta: {
          DEFAULT: '#C1440E',
          hover: '#A3380B',
          light: '#FBF0EB',
        },
        forest: {
          DEFAULT: '#3D6B4C',
          light: '#EBF3ED',
        },
        brick: {
          DEFAULT: '#A33A2E',
          light: '#FDF0ED',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'Manrope', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(31, 27, 22, 0.06)',
        card: '0 4px 20px rgba(31, 27, 22, 0.08)',
        elevated: '0 12px 32px rgba(31, 27, 22, 0.12)',
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '8px',
      },
      aspectRatio: {
        '4/5': '4 / 5',
      },
    },
  },
  plugins: [],
};
