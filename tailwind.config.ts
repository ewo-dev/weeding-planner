import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces (docs/09-design-system.md § 4)
        bg: { DEFAULT: '#F8F6F1', dark: '#1C1B18' }, // warm ivory | dark charcoal
        surface: { DEFAULT: '#FFFFFF', dark: '#23221F' }, // white | raised dark
        'surface-raised': { DEFAULT: '#FDFCFA', dark: '#2A2926' }, // warm white | dark surface
        'surface-muted': { DEFAULT: '#F5F3EE', dark: '#32312E' }, // hover/soft backgrounds
        border: { DEFAULT: '#E5E1D8', dark: '#3D3C38' }, // warm border

        // Text (docs/09-design-system.md § 4)
        text: { DEFAULT: '#2F302B', dark: '#F2F0EB' }, // charcoal | ivory
        'text-muted': { DEFAULT: '#77776E', dark: '#A8A59B' }, // warm gray
        'text-inverse': { DEFAULT: '#FFFFFF', dark: '#1C1B18' }, // white | dark

        // Brand (docs/09-design-system.md § 4)
        brand: {
          DEFAULT: '#68745D', // sage green
          hover: '#56614D',
          soft: 'rgba(104, 116, 93, 0.10)',
          muted: 'rgba(104, 116, 93, 0.06)',
        },

        // Accent (champagne gold)
        accent: {
          DEFAULT: '#C8A978',
          hover: '#B89868',
          soft: 'rgba(200, 169, 120, 0.14)',
        },

        // Status (docs/09-design-system.md § 4) — warm, muted but legible
        success: '#5E7A5E', // muted sage
        warning: '#B89A6A', // muted gold
        danger: '#A65D57', // warm brick
        info: '#6F7D8D', // muted slate

        // Constraint accents (docs/09-design-system.md § 4)
        'constraint-must': '#5E7A5E',
        'constraint-pref': '#6F7D8D',
        'constraint-no': '#A65D57',
      },
      borderRadius: {
        // docs/09-design-system.md § 7
        DEFAULT: '8px', // rounded = 8px
        sm: '4px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        // docs/09-design-system.md § 8 — restrained, warm shadows
        sm: '0 1px 2px 0 rgba(47, 48, 43, 0.04)',
        DEFAULT: '0 2px 8px -2px rgba(47, 48, 43, 0.06)',
        lg: '0 8px 24px -4px rgba(47, 48, 43, 0.08)',
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
