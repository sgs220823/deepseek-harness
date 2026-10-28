/** Decorative shield mark for the running Chat status (replaces the upstream whale). */
import { SHIELD_OUTLINE_PATH } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ChatView.module.css'

/**
 * Render the running indicator's shield mark. The mark stays brand-neutral at
 * the source: it takes the surrounding ink (`currentColor`, the running-state
 * accent) and the platform's shared shield contour, so the official profile
 * and a TianJian build each read it as their own status glyph.
 * @returns the decorative shield element.
 */
export function RunningShieldMark() {
  return (
    <span className={css.runningIcon} aria-hidden="true">
      <svg className={css.runningShield} width="100%" height="100%" viewBox="0 0 16 16" fill="none">
        <path d={SHIELD_OUTLINE_PATH} stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </span>
  )
}
