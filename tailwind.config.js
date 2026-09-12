/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B2447',
          800: '#12305e',
          700: '#1c3f77',
        },
        brand: {
          DEFAULT: '#2563EB',
          600: '#2563EB',
          700: '#1d4ed8',
          50: '#eff6ff',
        },
        accent: {
          DEFAULT: '#4f46e5',
          600: '#4f46e5',
          700: '#4338ca',
          100: '#e0e7ff',
          50: '#eef2ff',
        },
        strong: '#0d9488',
        moderate: '#d97706',
        gap: '#e11d48',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11,36,71,0.08), 0 8px 24px rgba(11,36,71,0.06)',
      },
      borderRadius: {
        xl: '12px',
      },
    },
  },
  plugins: [],
}
