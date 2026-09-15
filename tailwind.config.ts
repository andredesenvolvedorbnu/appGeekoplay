import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        geek: {
          bg: '#101319',
          panel: '#181c24',
          soft: '#222834',
          orange: '#ff7a16',
          line: '#2d3441'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
