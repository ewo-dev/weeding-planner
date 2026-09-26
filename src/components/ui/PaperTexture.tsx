/**
 * Global paper-grain material (docs/09-design-system.md § 12 "Canvas floor").
 * One fixed, non-interactive overlay using an SVG feTurbulence noise data URI,
 * blended with `mix-blend-mode: multiply` on light surfaces. Color/tint is
 * driven from the `paper-noise` design token.
 *
 * Render once in the locale layout so every screen inherits the texture.
 * Hidden from print (docs § 16) and from screen readers (aria-hidden).
 */

const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(#n)' opacity='0.5'/></svg>`

const NOISE_URI = `url("data:image/svg+xml,${encodeURIComponent(NOISE_SVG)}")`

export function PaperTexture() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[5] opacity-100 print:hidden"
      style={{
        backgroundImage: NOISE_URI,
        mixBlendMode: 'multiply',
        opacity: 0.05,
      }}
    />
  )
}
