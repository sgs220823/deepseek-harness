import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import {
  TIANJIAN_BRAND_MARK_INVERSE_SVG,
  TIANJIAN_BRAND_MARK_SMALL_INVERSE_SVG,
  TIANJIAN_BRAND_MARK_SMALL_SVG,
  TIANJIAN_BRAND_MARK_SVG,
  TIANJIAN_BRAND_VALUES,
} from './values.ts'

/**
 * Light/dark mark switching (the host toggles `body[data-ds-dark-theme]`).
 * The two SVG variants are byte-identical copies of the tianjian assets, so
 * the mono mark keeps its exact geometry in both themes.
 */
const MARK_SWITCH_CSS = `
.tj-brand-mark-light { display: inline-flex; }
.tj-brand-mark-dark { display: none; }
body[data-ds-dark-theme] .tj-brand-mark-light { display: none; }
body[data-ds-dark-theme] .tj-brand-mark-dark { display: inline-flex; }
.tj-brand-mark-light svg, .tj-brand-mark-dark svg { display: block; }
`.trim()

/** Apply the host-requested size to the source SVG's fixed 160px canvas. */
function sized(svg: string, size: number): string {
  return svg
    .replace('width="160" height="160"', `width="${size}" height="${size}"`)
    .replace('role="img"', 'aria-hidden="true" focusable="false"')
}

/**
 * Render the TianJian mark from the aligned asset copies: 07 line mark for
 * >=32px, 08 solid mark for 16–24px (FE8 #80 mapping). Values and SVG bytes
 * come from `values.ts` (single-sourced in the tianjian repo — R11
 * brand-token single source with cross-repo hash check).
 * @param props - Host-supplied mark presentation.
 * @returns the TianJian mark.
 */
export function TianJianBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  const small = size < 32
  const light = small ? TIANJIAN_BRAND_MARK_SMALL_SVG : TIANJIAN_BRAND_MARK_SVG
  const dark = small ? TIANJIAN_BRAND_MARK_SMALL_INVERSE_SVG : TIANJIAN_BRAND_MARK_INVERSE_SVG
  return (
    <span
      className="tj-brand-mark"
      role="img"
      aria-label="天鉴标识"
      style={{ display: 'inline-flex', width: size, height: size }}
    >
      <style>{MARK_SWITCH_CSS}</style>
      <span className="tj-brand-mark-light" dangerouslySetInnerHTML={{ __html: sized(light, size) }} />
      <span className="tj-brand-mark-dark" dangerouslySetInnerHTML={{ __html: sized(dark, size) }} />
    </span>
  )
}

/**
 * Render the TianJian name artwork without its independently slotted mark.
 * @returns the TianJian name text.
 */
export function TianJianBrandName() {
  return <span>{TIANJIAN_BRAND_VALUES.name}</span>
}
