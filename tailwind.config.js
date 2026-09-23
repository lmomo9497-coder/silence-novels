/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // خطوط عربية أنيقة + خطوط لاتينية أدبية
        sans: ['"IBM Plex Sans Arabic"', '"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
        serif: ['"Amiri"', '"Noto Naskh Arabic"', 'Georgia', 'serif'],
        reading: ['"Amiri"', '"Noto Naskh Arabic"', 'Georgia', 'serif'],
        display: ['"Reem Kufi"', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // هوية "روايات صمت": حبر داكن + رقّ فاتح + ذهب هادئ + أخضر مريمي
        ink: {
          50: '#f5f6f8',
          100: '#e7e9ee',
          200: '#c9cdd8',
          300: '#a3aab9',
          400: '#767f94',
          500: '#565f75',
          600: '#414a5e',
          700: '#333a4b',
          800: '#232838',
          900: '#171b28',
          950: '#0e1119',
        },
        parchment: {
          50: '#fdfcf9',
          100: '#faf7f0',
          200: '#f3ecdd',
          300: '#e9dcc3',
          400: '#dcc7a1',
          500: '#cbab78',
          600: '#b78f56',
          700: '#9a7344',
          800: '#7d5c3b',
          900: '#674c34',
        },
        gold: {
          50: '#fbf8ef',
          100: '#f6efd8',
          200: '#ecdcae',
          300: '#e0c47d',
          400: '#d4a94f',
          500: '#c8912f',
          600: '#ab7224',
          700: '#8a561f',
          800: '#714520',
          900: '#5f3a1e',
        },
        sage: {
          50: '#f3f7f4',
          100: '#e3ede6',
          200: '#c7dbcd',
          300: '#9dbfa8',
          400: '#6f9d7e',
          500: '#4f7f60',
          600: '#3c654b',
          700: '#31513d',
          800: '#2a4133',
          900: '#24362c',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(23,27,40,0.04), 0 8px 24px -12px rgba(23,27,40,0.18)',
        card: '0 1px 3px rgba(23,27,40,0.06), 0 12px 32px -16px rgba(23,27,40,0.22)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      maxWidth: {
        reading: '46rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
}
