import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Render the TianJian mark: the 鉴 glyph on the platform's deep-blue rounded
 * square, the same visual identity as the platform favicon.
 * @param props - Host-supplied mark presentation.
 * @returns the TianJian seal mark.
 */
export function TianJianBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#1f4e8c" />
      <text x="32" y="44" fontSize="30" textAnchor="middle" fill="#ffffff" fontFamily="system-ui">鉴</text>
    </svg>
  )
}

/**
 * Render the TianJian name artwork without its independently slotted mark.
 * @returns the TianJian name text.
 */
export function TianJianBrandName() {
  return <span>天鉴智能体</span>
}
