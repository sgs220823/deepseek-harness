/** TianJian brand occupants for the generic browser-brand slots (ADR-0011). */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { BRAND_SWITCH_STYLE_ID, MARK_SWITCH_CSS, TianJianBrandMark, TianJianBrandName } from './Brand.tsx'

/** Required service: the UI slot registry. */
export const inject = ['slots']

/** Inject the mark light/dark switch CSS once (idempotent, module-level scope). */
function injectMarkSwitchCss(): void {
  if (typeof document === 'undefined' || document.getElementById(BRAND_SWITCH_STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = BRAND_SWITCH_STYLE_ID
  style.textContent = MARK_SWITCH_CSS
  document.head.appendChild(style)
}

/**
 * Fill the sidebar brand slots as one declaration-aware registration set. The
 * conversation hero stays on its declaring package's fallback, so the TianJian
 * build registers nothing there.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  if (process.env.DSH_CLIENT_BUILD_PROFILE !== 'tianjian') return
  injectMarkSwitchCss()
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark' }, TianJianBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name' }, TianJianBrandName)
    }))
}
