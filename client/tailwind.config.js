/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#6d23f0', dark: '#4a14b0', soft: '#8b4ff5' },
        tint: '#f1eaff',
        ink: '#23123f',
        page: '#f7f5fc',
        amber: { DEFAULT: '#f5a623', soft: '#fff3da' },
        teal: { DEFAULT: '#0e9f8e' },
        rose: { DEFAULT: '#e0457b' }
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        sans: ['Roboto', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
