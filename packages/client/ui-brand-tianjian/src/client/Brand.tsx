import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { TIANJIAN_BRAND_VALUES } from './values.ts'

/**
 * Render the TianJian mark: the brand glyph on the platform's primary-color
 * rounded square, the same visual identity as the platform favicon. Values
 * come from the aligned brand copy (`values.ts`, single-sourced in the
 * tianjian repo — R11 brand-token single source with cross-repo CI check).
 * @param props - Host-supplied mark presentation.
 * @returns the TianJian seal mark.
 */
export function TianJianBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill={TIANJIAN_BRAND_VALUES.primaryColor} />
      <text x="32" y="44" fontSize="30" textAnchor="middle" fill={TIANJIAN_BRAND_VALUES.markForeground} fontFamily="system-ui">{TIANJIAN_BRAND_VALUES.markGlyph}</text>
    </svg>
  )
}

/**
 * Render the TianJian name artwork without its independently slotted mark.
 * @returns the TianJian name text.
 */
export function TianJianBrandName() {
  return <span>{TIANJIAN_BRAND_VALUES.name}</span>
}
