/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#05060B',
        'bg-secondary': '#0A0C14',
        'bg-card': '#0F1219',
        border: '#1A1E2E',
        'accent-blue': '#3B82F6',
        'accent-purple': '#8B5CF6',
        'accent-green': '#10B981',
        'text-primary': '#E8ECF4',
        'text-secondary': '#8892A8',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      keyframes: {
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
