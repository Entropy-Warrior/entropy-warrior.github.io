/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'var(--prose-body)',
            a: {
              color: 'var(--prose-links)',
              '&:hover': {
                color: 'var(--prose-links)',
                opacity: '0.8',
              },
            },
            'h1, h2, h3, h4, h5, h6': {
              color: 'var(--prose-headings)',
            },
            strong: {
              color: 'var(--prose-bold)',
            },
            code: {
              color: 'var(--prose-code)',
              backgroundColor: 'var(--prose-code-bg)',
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: 'var(--prose-pre-bg)',
              color: 'var(--prose-pre-code)',
            },
            blockquote: {
              color: 'var(--prose-quotes)',
              borderLeftColor: 'var(--prose-quote-borders)',
            },
            hr: {
              borderColor: 'var(--prose-hr)',
            },
          },
        },
      },
    },
  },
  plugins: [],
}