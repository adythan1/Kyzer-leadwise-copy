/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme (default)
        primary: {
          DEFAULT: '#374151',
          dark: '#0D1821',
          light: '#F3F4F6'
        },
        text: {
          dark: '#111827',
          medium: '#374151',
          light: '#4B5563',
          muted: '#6B7280'
        },
        background: {
          white: '#FFFFFF',
          light: '#F9FAFB',
          medium: '#F3F4F6',
          dark: '#E5E7EB'
        },
        border: '#E5E7EB',
        success: {
          DEFAULT: '#059669',
          light: '#D1FAE5',
          dark: '#047857'
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          dark: '#B45309'
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#B91C1C'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      maxWidth: {
        '8xl': '100%', // 88rem - for wide content areas like course management
      },
      keyframes: {
        'home-fade-up': {
          from: {
            opacity: '0',
            transform: 'translateY(1rem)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'home-accent': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'home-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-0.65rem)' },
        },
      },
      animation: {
        'home-fade-up': 'home-fade-up 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'home-accent': 'home-accent 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'home-float': 'home-float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [
    function({ addUtilities, theme }) {
      // Add custom utility classes for the color system
      const newUtilities = {
        '.text-text-dark': { color: theme('colors.text.dark') },
        '.text-text-medium': { color: theme('colors.text.medium') },
        '.text-text-light': { color: theme('colors.text.light') },
        '.text-text-muted': { color: theme('colors.text.muted') },
        '.bg-background-white': { backgroundColor: theme('colors.background.white') },
        '.bg-background-light': { backgroundColor: theme('colors.background.light') },
        '.bg-background-medium': { backgroundColor: theme('colors.background.medium') },
        '.bg-background-dark': { backgroundColor: theme('colors.background.dark') },
        '.border-border': { borderColor: theme('colors.border') },
      };
      addUtilities(newUtilities);
    }
  ],
}
