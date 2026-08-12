/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#1A2F3D',
          soft: '#2E4A5A',
          muted: '#5B7A8A',
        },
        se: {
          // Teal / Turquesa do logo
          teal: '#2B8B94',
          'teal-light': '#3DA5AE',
          'teal-dark': '#1E6B72',
          // Violeta / Roxo do logo
          violet: '#7B5EA7',
          'violet-dark': '#5C3D8F',
          'violet-light': '#9B7BC7',
          // Azul do logo (texto SYNAPT)
          blue: '#1E4D5C',
          'blue-dark': '#14374B',
          // Verde/Teal suave
          green: '#2B8B94',
          'green-soft': '#E4F5F6',
          // Fundos e superfícies
          lavender: '#F0EBF9',
          sky: '#EAF6F8',
          mist: '#F7F9FB',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(26, 47, 61, 0.06)',
        lift: '0 12px 40px rgba(123, 94, 167, 0.12)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-dot': 'pulseDot 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.9' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 50%' },
          '50%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
}
