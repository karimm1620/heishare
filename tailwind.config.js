/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Utility-first, "calm tool" palette (see 04-ui-ux.md §1).
        // Semantic tokens map to CSS vars in src/global.css so light/dark
        // themes are single-sourced and NativeWind can resolve them at
        // both build time (className) and runtime (dynamic style).
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        'card-foreground': 'rgb(var(--color-card-foreground) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--color-muted-foreground) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-foreground': 'rgb(var(--color-accent-foreground) / <alpha-value>)',
        destructive: 'rgb(var(--color-destructive) / <alpha-value>)',
        'destructive-foreground': 'rgb(var(--color-destructive-foreground) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        'success-foreground': 'rgb(var(--color-success-foreground) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        ring: 'rgb(var(--color-ring) / <alpha-value>)',
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
    },
  },
  plugins: [],
};
