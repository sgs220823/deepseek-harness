/**
 * TianJian brand values — the fork-side aligned copy of the single-source
 * brand tokens owned by the tianjian repository
 * (`plugins/shared/src/brand.ts`, ticket R11 / spec #58; FE8 #80 asset model).
 *
 * The fork never imports the tianjian repo (ADR-0011 shell model), so the
 * brand values and the exact SVG asset contents live here as aligned copies:
 * `scripts/check-brand-sync.mjs` (`pnpm check:brand` in the tianjian repo,
 * plus its CI `brand-sync` job) hashes these strings against
 * `design/logo/versions/*.svg` and `design/logo/exports/11-yen-solid-halo-favicon.svg`
 * and fails when any byte drifts. Renaming or rebranding changes the tianjian
 * token and assets first, then this copy (plus
 * `apps/web/public/favicon.svg`), keeping the check green.
 */

/** Brand values consumed by the sidebar mark and name occupants. */
export const TIANJIAN_BRAND_VALUES = {
  /** Platform name shown in the sidebar brand row (token `name`). */
  name: '天鉴智能体平台',
  /** Short name (token `shortName`). */
  shortName: '天鉴',
  /** Main mark asset (token `mark`; >=32px). */
  mark: '07-yen-line-pierce',
  /** Main mark inverse asset (token `markInverse`). */
  markInverse: '07-yen-line-pierce-inverse',
  /** Small mark asset (token `markSmall`; 16–24px). */
  markSmall: '11-yen-solid-halo',
  /** Small mark inverse asset (token `markSmallInverse`). */
  markSmallInverse: '11-yen-solid-halo-inverse',
  /** Favicon asset (token `favicon`; 16px). */
  favicon: '11-yen-solid-halo',
} as const

/** Main mark SVG (byte-identical to design/logo/versions/07-yen-line-pierce.svg). */
export const TIANJIAN_BRAND_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2.5 4 155 155" width="160" height="160" role="img">
  <title>天鉴标识 · ¥ 居中穿框</title>
  <desc>盾内 ¥ 符号居中，右下方放大镜镜片压住盾框，镜内指纹，手柄伸出盾外。</desc>
  <defs>
    <clipPath id="c7"><circle cx="112" cy="114" r="14.4"/></clipPath>
    <mask id="m7" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
      <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>
      <circle cx="112" cy="114" r="25" fill="#000"/>
      <path d="M 125.44 127.44 L 135.33 137.33" fill="none" stroke="#000" stroke-width="16" stroke-linecap="round"/>
    </mask>
    <mask id="h7" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
      <rect x="0" y="0" width="160" height="160" fill="#fff"/>
      <circle cx="112" cy="114" r="21.5" fill="#000"/>
    </mask>
  </defs>
  <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="none" stroke="#000" stroke-width="10" stroke-linejoin="round" mask="url(#m7)"/>
  <g transform="translate(80 66)" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="14">
      <path d="M -17 -28 L 0 -2"/>
      <path d="M 17 -28 L 0 -2"/>
      <path d="M 0 -2 L 0 32"/>
      <path d="M -15 5 L 15 5"/>
      <path d="M -15 21 L 15 21"/>
    </g>
  <circle cx="112" cy="114" r="19" fill="none" stroke="#000" stroke-width="5"/>
  <path d="M 125.44 127.44 L 135.33 137.33" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" mask="url(#h7)"/>
  <g clip-path="url(#c7)"><g transform="translate(112 114) scale(1.55) translate(-12 -12)" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
      <path d="M 8.4 11.4 a 3.6 3.6 0 0 1 7.2 0 v 1.1 a 9.4 9.4 0 0 0 1.5 5.6"/>
      <path d="M 12 11.8 v 2.4 a 12.6 12.6 0 0 0 2 6.9"/>
      <path d="M 19.6 7.4 a 7.2 7.2 0 0 1 1 4.4 v 1.2 a 6 6 0 0 0 0.7 2.6"/>
      <path d="M 7.8 15.2 a 15.5 15.5 0 0 0 1.3 5.6"/>
      <path d="M 4.8 19.2 a 21 21 0 0 1 -0.8 -6 v -1.2 a 8.2 8.2 0 0 1 12.6 -7.2"/>
    </g></g>
</svg>
`

/** Main mark inverse SVG (byte-identical to design/logo/versions/07-yen-line-pierce-inverse.svg). */
export const TIANJIAN_BRAND_MARK_INVERSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2.5 4 155 155" width="160" height="160" role="img">
  <title>天鉴标识 · ¥ 居中穿框</title>
  <desc>盾内 ¥ 符号居中，右下方放大镜镜片压住盾框，镜内指纹，手柄伸出盾外。</desc>
  <defs>
    <clipPath id="c7i"><circle cx="112" cy="114" r="14.4"/></clipPath>
    <mask id="m7i" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
      <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>
      <circle cx="112" cy="114" r="25" fill="#000"/>
      <path d="M 125.44 127.44 L 135.33 137.33" fill="none" stroke="#000" stroke-width="16" stroke-linecap="round"/>
    </mask>
    <mask id="h7i" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
      <rect x="0" y="0" width="160" height="160" fill="#fff"/>
      <circle cx="112" cy="114" r="21.5" fill="#000"/>
    </mask>
  </defs>
  <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round" mask="url(#m7i)"/>
  <g transform="translate(80 66)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="14">
      <path d="M -17 -28 L 0 -2"/>
      <path d="M 17 -28 L 0 -2"/>
      <path d="M 0 -2 L 0 32"/>
      <path d="M -15 5 L 15 5"/>
      <path d="M -15 21 L 15 21"/>
    </g>
  <circle cx="112" cy="114" r="19" fill="none" stroke="#fff" stroke-width="5"/>
  <path d="M 125.44 127.44 L 135.33 137.33" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" mask="url(#h7i)"/>
  <g clip-path="url(#c7i)"><g transform="translate(112 114) scale(1.55) translate(-12 -12)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
      <path d="M 8.4 11.4 a 3.6 3.6 0 0 1 7.2 0 v 1.1 a 9.4 9.4 0 0 0 1.5 5.6"/>
      <path d="M 12 11.8 v 2.4 a 12.6 12.6 0 0 0 2 6.9"/>
      <path d="M 19.6 7.4 a 7.2 7.2 0 0 1 1 4.4 v 1.2 a 6 6 0 0 0 0.7 2.6"/>
      <path d="M 7.8 15.2 a 15.5 15.5 0 0 0 1.3 5.6"/>
      <path d="M 4.8 19.2 a 21 21 0 0 1 -0.8 -6 v -1.2 a 8.2 8.2 0 0 1 12.6 -7.2"/>
    </g></g>
</svg>
`

/** Small mark SVG (byte-identical to design/logo/versions/11-yen-solid-halo.svg). */
export const TIANJIAN_BRAND_MARK_SMALL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2.5 4 155 155" width="160" height="160" role="img">
  <title>天鉴标识 · 07 衍生 实心完整放大镜</title>
  <desc>实心盾 + ¥ 挖空；放大镜完整保留：镜片与手柄两侧在盾上翻白一圈，镜环、指纹、手柄以实心线压在翻白底上。</desc>
  <defs>
    <clipPath id="cs11"><circle cx="112" cy="114" r="13"/></clipPath>
    <mask id="ms11" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
      <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="#fff"/>
      <g transform="translate(80 66)" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="18">
      <path d="M -17 -28 L 0 -2"/>
      <path d="M 17 -28 L 0 -2"/>
      <path d="M 0 -2 L 0 34.5"/>
      <path d="M -15 0.5 L 15 0.5"/>
      <path d="M -15 25.5 L 15 25.5"/>
    </g>
      <circle cx="112" cy="114" r="28.5" fill="#000"/>
      <path d="M 125.44 127.44 L 138.16 140.16" fill="none" stroke="#000" stroke-width="21" stroke-linecap="round"/>
    </mask>
  </defs>
  <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="#000" mask="url(#ms11)"/>
  <circle cx="112" cy="114" r="19" fill="none" stroke="#000" stroke-width="9"/>
  <g clip-path="url(#cs11)"><g transform="translate(112 114) scale(1.38) translate(-12 -12)" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.2">
      <path d="M 8.4 11.4 a 3.6 3.6 0 0 1 7.2 0 v 1.1 a 9.4 9.4 0 0 0 1.5 5.6"/>
      <path d="M 12 11.8 v 2.4 a 12.6 12.6 0 0 0 2 6.9"/>
      <path d="M 19.6 7.4 a 7.2 7.2 0 0 1 1 4.4 v 1.2 a 6 6 0 0 0 0.7 2.6"/>
      <path d="M 7.8 15.2 a 15.5 15.5 0 0 0 1.3 5.6"/>
      <path d="M 4.8 19.2 a 21 21 0 0 1 -0.8 -6 v -1.2 a 8.2 8.2 0 0 1 12.6 -7.2"/>
    </g></g>
  <path d="M 125.44 127.44 L 138.16 140.16" fill="none" stroke="#000" stroke-width="11" stroke-linecap="round"/>
</svg>
`

/** Small mark inverse SVG (byte-identical to design/logo/versions/11-yen-solid-halo-inverse.svg). */
export const TIANJIAN_BRAND_MARK_SMALL_INVERSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2.5 4 155 155" width="160" height="160" role="img">
  <title>天鉴标识 · 07 衍生 实心完整放大镜</title>
  <desc>实心盾 + ¥ 挖空；放大镜完整保留：镜片与手柄两侧在盾上翻白一圈，镜环、指纹、手柄以实心线压在翻白底上。</desc>
  <defs>
    <clipPath id="cs11i"><circle cx="112" cy="114" r="13"/></clipPath>
    <mask id="ms11i" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
      <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="#fff"/>
      <g transform="translate(80 66)" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="18">
      <path d="M -17 -28 L 0 -2"/>
      <path d="M 17 -28 L 0 -2"/>
      <path d="M 0 -2 L 0 34.5"/>
      <path d="M -15 0.5 L 15 0.5"/>
      <path d="M -15 25.5 L 15 25.5"/>
    </g>
      <circle cx="112" cy="114" r="28.5" fill="#000"/>
      <path d="M 125.44 127.44 L 138.16 140.16" fill="none" stroke="#000" stroke-width="21" stroke-linecap="round"/>
    </mask>
  </defs>
  <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="#fff" mask="url(#ms11i)"/>
  <circle cx="112" cy="114" r="19" fill="none" stroke="#fff" stroke-width="9"/>
  <g clip-path="url(#cs11i)"><g transform="translate(112 114) scale(1.38) translate(-12 -12)" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.2">
      <path d="M 8.4 11.4 a 3.6 3.6 0 0 1 7.2 0 v 1.1 a 9.4 9.4 0 0 0 1.5 5.6"/>
      <path d="M 12 11.8 v 2.4 a 12.6 12.6 0 0 0 2 6.9"/>
      <path d="M 19.6 7.4 a 7.2 7.2 0 0 1 1 4.4 v 1.2 a 6 6 0 0 0 0.7 2.6"/>
      <path d="M 7.8 15.2 a 15.5 15.5 0 0 0 1.3 5.6"/>
      <path d="M 4.8 19.2 a 21 21 0 0 1 -0.8 -6 v -1.2 a 8.2 8.2 0 0 1 12.6 -7.2"/>
    </g></g>
  <path d="M 125.44 127.44 L 138.16 140.16" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/>
</svg>
`

/** Favicon SVG (byte-identical to design/logo/exports/11-yen-solid-halo-favicon.svg). */
export const TIANJIAN_BRAND_FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2.5 4 155 155" width="160" height="160" role="img">
  <title>天鉴标识 · 07 衍生 实心完整放大镜</title>
  <desc>实心盾 + ¥ 挖空；放大镜完整保留：镜片与手柄两侧在盾上翻白一圈，镜环、指纹、手柄以实心线压在翻白底上。</desc>
  <defs>
    <clipPath id="cs11"><circle cx="112" cy="114" r="13"/></clipPath>
    <mask id="ms11" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
      <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="#fff"/>
      <g transform="translate(80 66)" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="18">
      <path d="M -17 -28 L 0 -2"/>
      <path d="M 17 -28 L 0 -2"/>
      <path d="M 0 -2 L 0 34.5"/>
      <path d="M -15 0.5 L 15 0.5"/>
      <path d="M -15 25.5 L 15 25.5"/>
    </g>
      <circle cx="112" cy="114" r="28.5" fill="#000"/>
      <path d="M 125.44 127.44 L 138.16 140.16" fill="none" stroke="#000" stroke-width="21" stroke-linecap="round"/>
    </mask>
  </defs>
  <path d="M 31 17 L 129 17 Q 138 17 138 26 L 138 78 C 138 110 122.92 124 80 146 C 37.08 124 22 110 22 78 L 22 26 Q 22 17 31 17 Z" fill="#000" mask="url(#ms11)"/>
  <circle cx="112" cy="114" r="19" fill="none" stroke="#000" stroke-width="9"/>
  <g clip-path="url(#cs11)"><g transform="translate(112 114) scale(1.38) translate(-12 -12)" fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.2">
      <path d="M 8.4 11.4 a 3.6 3.6 0 0 1 7.2 0 v 1.1 a 9.4 9.4 0 0 0 1.5 5.6"/>
      <path d="M 12 11.8 v 2.4 a 12.6 12.6 0 0 0 2 6.9"/>
      <path d="M 19.6 7.4 a 7.2 7.2 0 0 1 1 4.4 v 1.2 a 6 6 0 0 0 0.7 2.6"/>
      <path d="M 7.8 15.2 a 15.5 15.5 0 0 0 1.3 5.6"/>
      <path d="M 4.8 19.2 a 21 21 0 0 1 -0.8 -6 v -1.2 a 8.2 8.2 0 0 1 12.6 -7.2"/>
    </g></g>
  <path d="M 125.44 127.44 L 138.16 140.16" fill="none" stroke="#000" stroke-width="11" stroke-linecap="round"/>
  <style>
    @media (prefers-color-scheme: dark) { path { fill: #fff; } }
  </style>
</svg>
`
