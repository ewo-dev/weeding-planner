import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces (docs/09-design-system.md § 4)
        bg: { DEFAULT: '#ffffff', dark: '#020617' }, // white | slate-950
        surface: { DEFAULT: '#f8fafc', dark: '#0f172a' }, // slate-50 | slate-900
        'surface-raised': { DEFAULT: '#ffffff', dark: '#1e293b' }, // white | slate-800
        border: { DEFAULT: '#e2e8f0', dark: '#1e293b' }, // slate-200 | slate-800

        // Text (docs/09-design-system.md § 4)
        text: { DEFAULT: '#0f172a', dark: '#f1f5f9' }, // slate-900 | slate-100
        'text-muted': { DEFAULT: '#64748b', dark: '#94a3b8' }, // slate-500 | slate-400
        'text-inverse': { DEFAULT: '#ffffff', dark: '#020617' }, // white | slate-950

        // Brand (docs/09-design-system.md § 4)
        brand: { DEFAULT: '#4f46e5', hover: '#4338ca', soft: '#eef2ff' }, // indigo-600 / 700 / 50

        // Status (docs/09-design-system.md § 4)
        success: '#059669', // emerald-600
        warning: '#f59e0b', // amber-500
        danger: '#e11d48', // rose-600
        info: '#0284c7', // sky-600

        // Constraint accents (docs/09-design-system.md § 4)
        'constraint-must': '#059669', // emerald-600
        'constraint-pref': '#0284c7', // sky-600
        'constraint-no': '#e11d48', // rose-600
      },
      borderRadius: {
        // docs/09-design-system.md § 7
        DEFAULT: '8px', // rounded = 8px
        lg: '12px', // rounded-lg = 12px
      },
      fontFamily: {
        // docs/09-design-system.md § 3
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
    },
  },
  plugins: [],
}

export default config