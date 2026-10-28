/**
 * TianJian brand color tokens for the workbench UI (aligned copies of the
 * tianjian design baseline, `design/redesign-2026-10/README.md` §3.1 —
 * 强调/数据 `--accent` 藏青 `#1e4f8f`，悬停 `#173f73`，弱底 `#e7edf6`).
 *
 * The generic client packages stay brand-neutral: they read `--tj-accent` with
 * an official-token fallback, so the official profile keeps its own accent and
 * only a TianJian build (`DSH_CLIENT_BUILD_PROFILE === 'tianjian'`) paints the
 * navy. The stylesheet is injected once by the client plugin (`index.ts`).
 *
 * Asset bytes are not here: the mark/name assets stay in `values.ts`, whose
 * contents are hash-checked by the tianjian repository's `pnpm check:brand`.
 */

/** `<style>` id for the one-time brand token injection. */
export const BRAND_TOKENS_STYLE_ID = 'tj-brand-tokens'

/** Accent tokens (navy) the workbench surfaces read through `--tj-*`. */
export const BRAND_TOKENS_CSS = `
:root {
  --tj-accent: #1e4f8f;
  --tj-accent-hover: #173f73;
  --tj-accent-soft: #e7edf6;
}
`.trim()
