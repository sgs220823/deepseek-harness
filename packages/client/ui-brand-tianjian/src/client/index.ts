/** TianJian brand occupants for the generic browser-brand slots (ADR-0011). */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { BRAND_SWITCH_STYLE_ID, MARK_SWITCH_CSS, TianJianBrandMark, TianJianBrandName } from './Brand.tsx'
import { BRAND_TOKENS_CSS, BRAND_TOKENS_STYLE_ID } from './tokens.ts'

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

/** Inject the brand color tokens once (`--tj-accent` and friends). */
function injectBrandTokensCss(): void {
  if (typeof document === 'undefined' || document.getElementById(BRAND_TOKENS_STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = BRAND_TOKENS_STYLE_ID
  style.textContent = BRAND_TOKENS_CSS
  document.head.appendChild(style)
}

/**
 * Fill the sidebar brand slots and the conversation hero brand mark as one
 * declaration-aware registration set. The hero seat replaces its declaring
 * package's animated fallback with the TianJian shield mark, so the workbench
 * welcome screen never shows the upstream brand asset.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  if (process.env.DSH_CLIENT_BUILD_PROFILE !== 'tianjian') return
  injectMarkSwitchCss()
  injectBrandTokensCss()
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark' }, TianJianBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name' }, TianJianBrandName)
    }))
  ctx.slots.inject('conversation.hero.brand.mark', () =>
    ctx.slots.register({ name: 'conversation.hero.brand.mark' }, TianJianBrandMark))
}
