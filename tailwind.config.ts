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
        'border-strong': { DEFAULT: '#D8D2C4', dark: '#46443E' }, // emphasized hairline
        canvas: { DEFAULT: '#EFEAE0', dark: '#1C1B18' }, // venue plan floor
        cloth: { DEFAULT: '#FBFAF7', dark: '#26251F' }, // dressed-table fill
        linen: { DEFAULT: '#FDFCF9', dark: '#2A2926' }, // place-card fill
        'paper-noise': { DEFAULT: 'rgba(120, 113, 100, 0.05)', dark: 'rgba(240, 236, 226, 0.045)' },

        // Text (docs/09-design-system.md § 4)
        text: { DEFAULT: '#2F302B', dark: '#F2F0EB' }, // charcoal | ivory
        'text-muted': { DEFAULT: '#6B6A62', dark: '#A8A59B' }, // warm gray (AA on all light surfaces)
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
          hover: '#7A6234',
          soft: 'rgba(200, 169, 120, 0.14)',
        },

        // Status (docs/09-design-system.md § 4) — warm, muted but legible
        success: '#5E7A5E', // muted sage
        warning: '#7A6234', // dark gold: AA for text on light surfaces
        danger: '#A65D57', // warm brick
        info: '#5D6A78', // muted slate, darkened for AA body text

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
        // Generated documents (print sheet, plan cards) get a longer ink shadow.
        plan: '0 16px 40px -12px rgba(47, 48, 43, 0.16)',
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
