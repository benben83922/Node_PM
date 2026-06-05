/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        health: {
          normal:   '#22c55e',
          warning:  '#f59e0b',
          critical: '#ef4444',
        },
        status: {
          todo:    '#6b7280',
          doing:   '#3b82f6',
          done:    '#22c55e',
          blocked: '#ef4444',
        },
      },
    },
  },
  plugins: [],
}
