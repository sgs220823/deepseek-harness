/**
 * TianJian gateway contract (ADR-0018): gateway-origin resolution + desktop-side
 * contract constants.
 *
 * The gateway origin is **fixed at build time** (spec #108, 2026-11-04 decision):
 * - the packaging environment must provide `DSH_TIANJIAN_GATEWAY_URL` (validated by
 *   the packaging scripts; missing/invalid fails the build);
 * - `tsdown` inlines `process.env.DSH_TIANJIAN_GATEWAY_URL` as a literal into the
 *   main bundle (same mechanism as `DSH_CLIENT_VERSION`), so the packaged app does
 *   **not** read the runtime environment — the gateway cannot be redirected at
 *   runtime by environment variables;
 * - development (unpackaged, unset) falls back to the local dev gateway.
 *
 * Constants mirror `plugins/shared/src/desktop-contract.ts` in the TianJian repo;
 * both sides keep one literal each with ADR-0018 as the single semantic source
 * (cross-repo drift risk and mitigation are registered in ADR-0018 / spec #108).
 * @module @deepseek-ai/dsh-desktop/tianjian-gateway
 */

/** Credential reference name (the `llm-pi-ai` `apiKeyEnv`; value = session token). */
export const TIANJIAN_GATEWAY_TOKEN_REF = 'DSH_TIANJIAN_GATEWAY_TOKEN'

/** Desktop config endpoint (gateway `GET /api/auth/desktop-config`). */
export const TIANJIAN_DESKTOP_CONFIG_PATH = '/api/auth/desktop-config'

/** Gateway login page path (the login window loads `${origin}${path}`). */
export const TIANJIAN_LOGIN_PATH = '/login'

/** TianJian session cookie name (same session as the web client). */
export const TIANJIAN_SESSION_COOKIE = 'tj_session'

/** Dedicated persistent session partition for the login window's cookie jar. */
export const TIANJIAN_SESSION_PARTITION = 'persist:tianjian-gateway'

/** Development gateway default (unpackaged and no injected build value). */
export const DEV_TIANJIAN_GATEWAY_ORIGIN = 'http://127.0.0.1:8080'

/**
 * Resolve and validate the gateway origin.
 *
 * The packaging scripts keep a parallel validator
 * (`apps/desktop/scripts/desktop-package-environment.mjs`,
 * `resolveTianjianGatewayUrl`) because `.mjs` cannot import the bundled TS source;
 * keep the two in lockstep.
 * @param raw - build-time injected value (`DSH_TIANJIAN_GATEWAY_URL`; a literal in
 *   the packaged bundle).
 * @param packaged - whether the app runs packaged (missing origin must fail; dev
 *   falls back to the local default).
 * @returns the normalized origin (no trailing slash, no path).
 * @throws {Error} packaged build without the origin, or a non-origin URL.
 */
export function resolveTianjianGatewayOrigin(raw: string | undefined, packaged: boolean): string {
  const value = raw?.trim()
  if (value === undefined || value === '') {
    if (packaged) {
      throw new Error('desktop build has no built-in gateway origin: set DSH_TIANJIAN_GATEWAY_URL and repackage')
    }
    return DEV_TIANJIAN_GATEWAY_ORIGIN
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`DSH_TIANJIAN_GATEWAY_URL is not a valid URL: ${value}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`DSH_TIANJIAN_GATEWAY_URL only supports http/https: ${value}`)
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '' || url.username !== '' || url.password !== '') {
    throw new Error(`DSH_TIANJIAN_GATEWAY_URL must be a bare gateway origin (protocol + host + port): ${value}`)
  }
  return url.origin
}
