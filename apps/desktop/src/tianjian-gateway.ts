/**
 * 天鉴网关契约（ADR-0018）：网关地址解析 + 桌面端固定常量。
 *
 * 网关地址**构建时固定内置**（2026-11-04 拍板，spec #108）：
 * - 打包环境必须在 `.env.windows`/`.env.macos` 提供 `DSH_TIANJIAN_GATEWAY_URL`
 *   （打包脚本校验；缺失/非法直接失败）；
 * - `tsdown` 在主进程 bundle 里把 `process.env.DSH_TIANJIAN_GATEWAY_URL` 内联成
 *   字面量（同 `DSH_CLIENT_VERSION` 的既有做法），因此打包产物**不读运行期
 *   env**，民警无法用环境变量改网关；
 * - 开发态（未打包且未注入）回落本机网关缺省，便于联调。
 *
 * 常量与天鉴仓 `plugins/shared/src/desktop-contract.ts` 同义（跨仓各留一份，
 * 语义以 ADR-0018 为准）：凭据引用名 `DSH_TIANJIAN_GATEWAY_TOKEN`、
 * desktop-config 路径、登录页路径、会话 cookie 与持久化分区。
 * @module @deepseek-ai/dsh-desktop/tianjian-gateway
 */

/** 凭据引用名（`llm-pi-ai` 的 `apiKeyEnv`；值 = 会话令牌）。 */
export const TIANJIAN_GATEWAY_TOKEN_REF = 'DSH_TIANJIAN_GATEWAY_TOKEN'

/** 桌面端配置下发端点（网关 `GET /api/auth/desktop-config`）。 */
export const TIANJIAN_DESKTOP_CONFIG_PATH = '/api/auth/desktop-config'

/** 网关登录页路径（登录窗口加载 `${origin}${path}`）。 */
export const TIANJIAN_LOGIN_PATH = '/login'

/** 天鉴会话 cookie 名（与网页端同源）。 */
export const TIANJIAN_SESSION_COOKIE = 'tj_session'

/** 登录窗口专用持久化会话分区（cookie 罐；不进 defaultSession）。 */
export const TIANJIAN_SESSION_PARTITION = 'persist:tianjian-gateway'

/** 开发态网关缺省（未打包且未注入构建值；仅本机联调）。 */
export const DEV_TIANJIAN_GATEWAY_ORIGIN = 'http://127.0.0.1:8080'

/**
 * 解析并校验网关基址。
 * @param raw - 构建时注入值（`DSH_TIANJIAN_GATEWAY_URL`）；打包产物里已是字面量。
 * @param packaged - 是否打包运行（缺地址时打包必须失败，开发态回落本机缺省）。
 * @returns 归一化 origin（无尾斜杠、无路径）。
 * @throws {Error} 打包运行缺地址，或值不是 http(s) URL。
 */
export function resolveTianjianGatewayOrigin(raw: string | undefined, packaged: boolean): string {
  const value = raw?.trim()
  if (value === undefined || value === '') {
    if (packaged) {
      throw new Error('桌面端构建未内置网关地址：设置 DSH_TIANJIAN_GATEWAY_URL 后重新打包')
    }
    return DEV_TIANJIAN_GATEWAY_ORIGIN
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`DSH_TIANJIAN_GATEWAY_URL 不是合法 URL：${value}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`DSH_TIANJIAN_GATEWAY_URL 只支持 http/https：${value}`)
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '' || url.username !== '' || url.password !== '') {
    throw new Error(`DSH_TIANJIAN_GATEWAY_URL 只能是网关基址（协议 + 主机 + 端口）：${value}`)
  }
  return url.origin
}
