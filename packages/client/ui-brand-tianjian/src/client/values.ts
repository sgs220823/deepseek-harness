/**
 * TianJian brand values — the fork-side aligned copy of the single-source
 * brand tokens owned by the tianjian repository
 * (`plugins/shared/src/brand.ts`, ticket R11 / spec #58).
 *
 * The fork never imports the tianjian repo (ADR-0011 shell model), so brand
 * values live here as an aligned copy: `scripts/check-brand-sync.mjs`
 * (`pnpm check:brand` in the tianjian repo, plus its CI `brand-sync` job)
 * fails when these values drift from the tianjian tokens. Renaming or
 * rebranding changes the tianjian token first, then this copy (plus
 * `apps/web/public/manifest.webmanifest` and `favicon.svg`), keeping the
 * check green.
 */

/** Brand values consumed by the sidebar mark and name occupants. */
export const TIANJIAN_BRAND_VALUES = {
  /** Platform name shown in the sidebar brand row (token `name`). */
  name: '天鉴智能体平台',
  /** Mark background — the platform primary color (token `primaryColor`). */
  primaryColor: '#1f4e8c',
  /** Mark glyph — the seal character (token `markGlyph`). */
  markGlyph: '鉴',
  /** Mark foreground — the glyph color (token `markForeground`). */
  markForeground: '#ffffff',
} as const
