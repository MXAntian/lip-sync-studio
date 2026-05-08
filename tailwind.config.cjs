/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e1a',
        card: '#111627',
        accent: '#4f6ef7',
        'accent-hover': '#3d5ce5',
        muted: '#6b7280',
        border: '#1e2740',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      }
    }
  },
  plugins: []
}
