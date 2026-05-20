/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        mentor: {
          primary:  '#0d9488',
          hover:    '#0f766e',
          light:    '#ccfbf1',
          lighter:  '#f0fdfa',
          accent:   '#14b8a6',
        },
        ops: {
          primary:  '#7c3aed',
          hover:    '#6d28d9',
          light:    '#ede9fe',
          lighter:  '#f5f3ff',
          accent:   '#8b5cf6',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          "'Inter'",
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        'card':           '0 1px 4px rgba(0,0,0,0.06)',
        'panel':          '0 1px 4px rgba(0,0,0,0.05)',
        'dropdown':       '0 8px 24px rgba(0,0,0,0.12)',
        'notif':          '0 8px 28px rgba(0,0,0,0.13)',
        'banner-mentor':  '0 8px 24px rgba(13,148,136,0.25)',
        'banner-ops':     '0 8px 24px rgba(124,58,237,0.25)',
        'login':          '0 20px 60px rgba(0,0,0,0.1)',
      },
      transitionProperty: {
        'width': 'width',
      },
    },
  },
  plugins: [],
}
