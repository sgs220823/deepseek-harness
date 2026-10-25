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
 * the mono mark keeps its exact geometry in both themes. Injected once by the
 * client plugin (`index.ts`) instead of once per mark instance.
 */
export const MARK_SWITCH_CSS = `
.tj-brand-mark-light { display: inline-flex; }
.tj-brand-mark-dark { display: none; }
body[data-ds-dark-theme] .tj-brand-mark-light { display: none; }
body[data-ds-dark-theme] .tj-brand-mark-dark { display: inline-flex; }
.tj-brand-mark-light svg, .tj-brand-mark-dark svg { display: block; }
`.trim()

/** `<style>` id for the one-time mark-switch CSS injection. */
export const BRAND_SWITCH_STYLE_ID = 'tj-brand-switch'

/** Apply the host-requested size to the source SVG's fixed 160px canvas.
 *  Returns undefined when the asset drifted (no fixed canvas) — render path
 *  must degrade to the plain short name, never throw: asset drift is already
 *  gated by `pnpm check:brand` before release, and a render-time throw would
 *  take down the whole sidebar brand slot (no error boundary above it). */
function sized(svg: string, size: number): string | undefined {
  const SIZE_ATTR = 'width="160" height="160"'
  if (!svg.includes(SIZE_ATTR)) return undefined
  return svg
    .replace(SIZE_ATTR, `width="${size}" height="${size}"`)
    .replace('role="img"', 'aria-hidden="true" focusable="false"')
}

/** 资产格式漂移的一次性告警（不阻断渲染；门禁侧由 check:brand 拦发布）。 */
let warnedAssetDrift = false

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
  const lightSized = sized(light, size)
  const darkSized = sized(dark, size)
  if (lightSized === undefined || darkSized === undefined) {
    if (!warnedAssetDrift) {
      warnedAssetDrift = true
      console.warn('[tianjian-brand] 品牌 SVG 缺少 160px 画布尺寸属性，已降级为短名文本（资产格式变化）')
    }
    return (
      <span
        className="tj-brand-mark"
        role="img"
        aria-label="天鉴标识"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}
      >
        <span>{TIANJIAN_BRAND_VALUES.shortName}</span>
      </span>
    )
  }
  return (
    <span
      className="tj-brand-mark"
      role="img"
      aria-label="天鉴标识"
      style={{ display: 'inline-flex', width: size, height: size }}
    >
      <span className="tj-brand-mark-light" dangerouslySetInnerHTML={{ __html: lightSized }} />
      <span className="tj-brand-mark-dark" dangerouslySetInnerHTML={{ __html: darkSized }} />
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
