export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        radar: {
          bg: '#05070A',
          card: '#0B0F14',
          card2: '#111822',
          border: 'rgba(255,255,255,0.08)',
          accent: '#1D9BF0',
          green: '#2ED47A',
          red: '#FF5C7A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
