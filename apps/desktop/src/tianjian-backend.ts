/**
 * TianJian shell <-> local Host RPC facade (#111/#112, spec #108):
 *
 * - authenticates against the Host through the Web launch URL's process-token
 *   exchange (done by `authenticateWebHost`); reuses the same `send` (Electron
 *   `net.fetch`) to call `/api/<ns>/<method>` with the Host cookie;
 * - exposes only the desktop-side operations: read the locale preference, fetch
 *   `desktop-config` (Bearer session token), push the configuration in contract
 *   order (credentials -> settings replace -> settings update), unset on sign-out;
 * - credentials are write-only: once the token lands in the
 *   `DSH_TIANJIAN_GATEWAY_TOKEN` reference, no read API returns its value (and
 *   this module never caches the token).
 *
 * The push order (ADR-0018 §3) is fixed: the instance's `llm-pi-ai` must be able
 * to resolve the token via `apiKeyEnv` before the providers land, and the default
 * model comes last.
 * @module @deepseek-ai/dsh-desktop/tianjian-backend
 */

import { randomUUID } from 'node:crypto'
import { TIANJIAN_DESKTOP_CONFIG_PATH, TIANJIAN_GATEWAY_TOKEN_REF } from './tianjian-gateway.ts'

/** desktop-config response (same shape as the gateway's `desktop-config.ts`; only shell-consumed fields are validated). */
export interface TianjianDesktopConfig {
  readonly version: number
  readonly account: {
    readonly id: number
    readonly username: string
    readonly display_name: string | null
    readonly role: string
  }
  readonly gateway: { readonly origin: string }
  readonly llm: {
    readonly providers: Readonly<Record<string, unknown>>
    readonly defaultModel: { readonly route: string; readonly model: string }
    readonly warning?: string
  }
}

/** Host-side settings/credential/locale operations (local instance RPC). */
export interface TianjianBackend {
  /** @returns the saved UI language; null when unset. */
  readLocalePreference(): Promise<string | null>
  /** @returns the effective collection policy (read live from the Host). */
  analyticsEnabled(): Promise<boolean>
  /** @param event - a shell-owned product event (credentials never appear in events). */
  report(event: unknown): Promise<void>
  /**
   * Fetch the gateway `desktop-config` with the session token.
   * @param token - the `tj_session` value (Bearer).
   * @returns the validated desktop config.
   */
  fetchDesktopConfig(token: string): Promise<TianjianDesktopConfig>
  /**
   * Push the configuration in contract order (resolves only when every step succeeded).
   * @param token - session token (written into the credentials reference for the instance's LLM plugin).
   * @param config - the desktop-config response.
   */
  applyConfiguration(token: string, config: TianjianDesktopConfig): Promise<void>
  /** Remove the gateway token reference (sign-out; pushed providers stay untouched). */
  unsetGatewayToken(): Promise<void>
}

/** Plain JSON-object check (RPC envelope and response-shape validation). */
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The `value` inside an RPC envelope (`{ type:'server-response', rpcId, result:{ ok:true, value } }`). */
function rpcValue(envelope: unknown, rpcId: string): unknown {
  if (!record(envelope) || envelope.type !== 'server-response' || envelope.rpcId !== rpcId
    || !record(envelope.result) || envelope.result.ok !== true) {
    throw new Error('desktop tianjian: Web RPC failed')
  }
  return envelope.result.value
}

/** Locale preference read from the `settings/describe` `locale` namespace. */
function localePreference(namespaces: unknown[]): string | null {
  const locale: unknown = namespaces.find((item: unknown) => record(item) && item.ns === 'locale')
  if (!record(locale) || !record(locale.value)
    || (locale.value.preference !== undefined && typeof locale.value.preference !== 'string')) {
    throw new Error('desktop tianjian: invalid locale preference')
  }
  return locale.value.preference ?? null
}

/** Validate the desktop-config response (version/account fields/default-model pair). */
function parseDesktopConfig(body: unknown): TianjianDesktopConfig {
  if (!record(body) || body.version !== 1 || !record(body.account) || !record(body.gateway)
    || typeof body.gateway.origin !== 'string' || !record(body.llm) || !record(body.llm.providers)
    || !record(body.llm.defaultModel)
    || typeof body.llm.defaultModel.route !== 'string' || body.llm.defaultModel.route === ''
    || typeof body.llm.defaultModel.model !== 'string' || body.llm.defaultModel.model === '') {
    throw new Error('desktop tianjian: invalid desktop-config response')
  }
  const account = body.account
  if (typeof account.id !== 'number' || typeof account.username !== 'string'
    || (account.display_name !== null && typeof account.display_name !== 'string')
    || typeof account.role !== 'string') {
    throw new Error('desktop tianjian: invalid desktop-config account')
  }
  const llm = body.llm
  return {
    version: body.version,
    account: {
      id: account.id,
      username: account.username,
      display_name: account.display_name as string | null,
      role: account.role,
    },
    gateway: { origin: body.gateway.origin },
    llm: {
      providers: llm.providers,
      defaultModel: { route: llm.defaultModel.route, model: llm.defaultModel.model },
      ...(typeof llm.warning === 'string' ? { warning: llm.warning } : {}),
    },
  }
}

/**
 * Authenticate the local Host over its Web launch URL and return the desktop operations.
 * @param authenticatedUrl - Host launch URL (`authenticateWebHost` already exchanged the process token).
 * @param send - Electron `net.fetch` (keeps the Host cookie).
 * @param gatewayOrigin - build-time gateway origin (config requests go only there).
 * @returns locale/config/sign-out operations.
 */
export async function connectTianjianBackend(
  authenticatedUrl: string,
  send: (input: string, init?: RequestInit) => Promise<Response>,
  gatewayOrigin: string,
): Promise<TianjianBackend> {
  const origin = new URL(authenticatedUrl).origin
  const authenticated = await send(authenticatedUrl, { credentials: 'include' })
  await authenticated.body?.cancel()
  if (!authenticated.ok) throw new Error('desktop tianjian: Web authentication failed')

  const invoke = async (
    namespace: string,
    method: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    const rpcId = randomUUID()
    const call = `${namespace}/${method}`
    const response = await send(new URL(`/api/${call}`, origin).href, {
      method: 'POST', credentials: 'include', redirect: 'error', ...(signal === undefined ? {} : { signal }),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId, method: call, payload: { args } }),
    })
    if (!response.ok) throw new Error('desktop tianjian: Web request failed')
    return rpcValue(await response.json(), rpcId)
  }

  return {
    async readLocalePreference() {
      const settings = await invoke('settings', 'describe', {})
      if (!record(settings) || !Array.isArray(settings.namespaces)) {
        throw new Error('desktop tianjian: missing settings namespaces')
      }
      return localePreference(settings.namespaces)
    },
    async analyticsEnabled() {
      const enabled = await invoke('productAnalytics', 'enabled', {}, AbortSignal.timeout(1000))
      if (typeof enabled !== 'boolean') throw new Error('desktop tianjian: invalid collection policy')
      return enabled
    },
    async report(event) {
      await invoke('productAnalytics', 'report', { event }, AbortSignal.timeout(1000))
    },
    async fetchDesktopConfig(token) {
      const response = await send(`${gatewayOrigin}${TIANJIAN_DESKTOP_CONFIG_PATH}`, {
        method: 'GET',
        redirect: 'error',
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`desktop tianjian: desktop-config HTTP ${response.status}`)
      return parseDesktopConfig(await response.json())
    },
    async applyConfiguration(token, config) {
      // 1) The token lands in the fixed reference (the instance's llm-pi-ai resolves it via apiKeyEnv).
      await invoke('credentials', 'set', { ref: TIANJIAN_GATEWAY_TOKEN_REF, value: token })
      // 2) Replace the whole providers section (enabled routes only; no revision = unconditional write).
      await invoke('settings', 'replace', { ns: 'llm-pi-ai', section: { providers: config.llm.providers } })
      // 3) Point the default model at the admin-configured route/model.
      await invoke('settings', 'update', {
        ns: 'agent-default-model',
        patch: { provider: config.llm.defaultModel.route, model: config.llm.defaultModel.model },
      })
    },
    async unsetGatewayToken() {
      await invoke('credentials', 'unset', { ref: TIANJIAN_GATEWAY_TOKEN_REF })
    },
  }
}
