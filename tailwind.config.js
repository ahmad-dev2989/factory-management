/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2F80ED',
        appBg: '#F6F8FB',
        appBorder: '#E5E7EB',
        textPrimary: '#1F2937',
        textSecondary: '#6B7280',
        hoverBg: '#EEF5FF',
      },
      borderRadius: {
        'card': '10px',
      }
    },
  },
  plugins: [],
}
