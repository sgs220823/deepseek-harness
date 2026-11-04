/**
 * 天鉴壳 ↔ 本机 Host 的 RPC 缝（#111/#112，spec #108）：
 *
 * - 以登录窗口分区之外的方式认证 Host：走 Web 启动 URL 的 process-token 交换
 *   （`authenticateWebHost` 已完成），本模块复用同一 `send`（Electron `net.fetch`）
 *   携带 Host cookie 访问 `/api/<ns>/<method>`；
 * - 只暴露桌面端需要的操作：读语言偏好、拉 `desktop-config`（Bearer 会话令牌）、
 *   按契约顺序下发配置（credentials→settings replace→settings update）、登出清凭据；
 * - **只写不读凭据**：令牌写进 `DSH_TIANJIAN_GATEWAY_TOKEN` 引用后，任何读接口都
 *   不返回其值（本模块也不缓存令牌）。
 *
 * 配置下发顺序（ADR-0018 §3）不可换：先让实例侧 `llm-pi-ai` 能按 `apiKeyEnv`
 * 解析令牌，再替换 providers，最后改缺省模型。
 * @module @deepseek-ai/dsh-desktop/tianjian-backend
 */

import { randomUUID } from 'node:crypto'
import { TIANJIAN_DESKTOP_CONFIG_PATH, TIANJIAN_GATEWAY_TOKEN_REF } from './tianjian-gateway.ts'

/** desktop-config 响应（与网关 `desktop-config.ts` 同形；只校验壳层消费的字段）。 */
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

/** Host 侧设置/凭据/语言操作（本机实例 RPC）。 */
export interface TianjianBackend {
  /** @returns 保存的 UI 语言；未设置 = null。 */
  readLocalePreference(): Promise<string | null>
  /** @returns 当前生效的采集策略（Host 配置实时读取）。 */
  analyticsEnabled(): Promise<boolean>
  /** @param event - 桌面壳自有的产品事件（凭据不出现在事件里）。 */
  report(event: unknown): Promise<void>
  /**
   * 以会话令牌调网关 `desktop-config`。
   * @param token - `tj_session` 值（Bearer）。
   * @returns 已校验形状的桌面配置。
   */
  fetchDesktopConfig(token: string): Promise<TianjianDesktopConfig>
  /**
   * 按契约顺序下发配置（全部成功才返回）。
   * @param token - 会话令牌（写进 credentials 引用，供实例 LLM 插件使用）。
   * @param config - desktop-config 响应。
   */
  applyConfiguration(token: string, config: TianjianDesktopConfig): Promise<void>
  /** 清掉网关令牌引用（登出；不改动已下发的 providers）。 */
  unsetGatewayToken(): Promise<void>
}

/** JSON 纯对象判定（RPC 信封与响应体形状校验）。 */
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** RPC 信封结果里的 `value`（`{ type:'server-response', rpcId, result:{ ok:true, value } }`）。 */
function rpcValue(envelope: unknown, rpcId: string): unknown {
  if (!record(envelope) || envelope.type !== 'server-response' || envelope.rpcId !== rpcId
    || !record(envelope.result) || envelope.result.ok !== true) {
    throw new Error('desktop tianjian: Web RPC failed')
  }
  return envelope.result.value
}

/** 语言偏好从 `settings/describe` 的 locale 命名空间读取。 */
function localePreference(namespaces: unknown[]): string | null {
  const locale: unknown = namespaces.find((item: unknown) => record(item) && item.ns === 'locale')
  if (!record(locale) || !record(locale.value)
    || (locale.value.preference !== undefined && typeof locale.value.preference !== 'string')) {
    throw new Error('desktop tianjian: invalid locale preference')
  }
  return locale.value.preference ?? null
}

/** 校验 desktop-config 响应（版本/账号/凭据字段/缺省模型二元组）。 */
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
  return body as unknown as TianjianDesktopConfig
}

/**
 * 连接本机 Host 的 Web 认证并返回桌面端操作面。
 * @param authenticatedUrl - Host 启动 URL（`authenticateWebHost` 已交换 process-token）。
 * @param send - Electron `net.fetch`（保留 Host cookie）。
 * @param gatewayOrigin - 构建时内置的网关基址（配置请求只打它）。
 * @returns 语言/配置/登出操作。
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
      // 1) 令牌写进固定引用（实例 llm-pi-ai 按 apiKeyEnv 解析）。
      await invoke('credentials', 'set', { ref: TIANJIAN_GATEWAY_TOKEN_REF, value: token })
      // 2) providers 整份替换（只含启用路由；不带 revision = 无条件写）。
      await invoke('settings', 'replace', { ns: 'llm-pi-ai', section: { providers: config.llm.providers } })
      // 3) 缺省模型指向管理后台的缺省路由/模型。
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
