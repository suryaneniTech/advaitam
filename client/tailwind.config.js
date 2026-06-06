/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/hostel/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        muted: { foreground: 'rgb(100 116 139)' },
      },
    },
  },
  plugins: [],
};
