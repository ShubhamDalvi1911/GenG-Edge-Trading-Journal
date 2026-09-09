/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#0b1220',
        accent: '#3b82f6',
        profit: '#22c55e',
        loss: '#ef4444',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
};
