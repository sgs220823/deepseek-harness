/**
 * 天鉴会话控制器（#111/#112/#113，spec #108）：登录窗口生命周期 + 会话探活 +
 * 配置下发 + 登出。全部副作用经注入依赖，可在主进程单测里钉住状态迁移。
 *
 * 状态机：
 * - {@link start}（冷启动）：分区已有令牌 → `probe`：
 *   - `valid` → 重放配置（失败仅记录，不阻挡本地工作）→ 进工作台；
 *   - `invalid` → 清 cookie → 显示登录窗口；
 *   - `unreachable` → **不写配置**直接进工作台（离线可用）；
 *   无令牌 → 显示登录窗口。
 * - 登录窗口轮询该分区 cookie：出现令牌 → `probe`：
 *   - `valid` → 配置下发（三步全成功）→ 关登录窗口 → 进工作台；
 *   - 配置失败 → **留在登录窗口并重试**（下一轮轮询重跑，不进工作台）；
 *   - `invalid` → 清 cookie 继续等（登录页仍可重试）。
 * - {@link signOut}：清 cookie + 清令牌引用 → 隐藏工作台 → 显示登录窗口
 *   （不销毁实例、不改动已下发 providers）。
 * - 登录窗口被用户关闭：停止轮询，由壳层按既有平台语义处理（Windows 退出 /
 *   macOS 销毁主窗），控制器不再产生任何副作用。
 * @module @deepseek-ai/dsh-desktop/tianjian-session
 */

/** 会话探活结果（`unreachable` = 网关暂时连不上，不是凭据问题）。 */
export type SessionProbeResult = 'valid' | 'invalid' | 'unreachable'

/** 登录窗口的最小句柄（Electron BrowserWindow 的子集）。 */
export interface TianjianLoginWindow {
  isDestroyed(): boolean
  onClosed(listener: () => void): void
  close(): void
}

/** 会话控制器依赖（生产 = main.ts 接线；测试 = 假实现）。 */
export interface TianjianSessionDeps {
  /** 读取登录分区里的 `tj_session`。 */
  readCookie(): Promise<string | undefined>
  /** 清除登录分区里的 `tj_session`。 */
  clearCookie(): Promise<void>
  /** 用 Bearer 探活（`/api/auth/me` 语义）：200 / 401 / 网络不可达。 */
  probe(token: string): Promise<SessionProbeResult>
  /** 拉 desktop-config 并按下发顺序写入本机实例（三步全成功才返回）。 */
  prepare(token: string): Promise<void>
  /** 显示网关登录窗口（加载完成才返回；应用正在退出等无法显示时为 undefined）。 */
  showLogin(): Promise<TianjianLoginWindow | undefined>
  /** 关闭登录窗口。 */
  closeLogin(window: TianjianLoginWindow): void
  /** 登录窗口无法加载时的重试入口（原生提示）。 */
  showLoginFailure(error: unknown): Promise<'retry' | 'exit'>
  /** 进入工作台（显示主窗）。 */
  enterWorkspace(): Promise<void>
  /** 隐藏工作台（登出；不销毁实例）。 */
  leaveWorkspace(): Promise<void>
  /** 清除本机凭据引用（登出）。 */
  unsetCredential(): Promise<void>
  /** 退出应用（用户取消首次登录）。 */
  exit(): void
  /** 诊断日志（不含令牌）。 */
  log?(message: string): void
  /** 登录窗口轮询间隔（毫秒），缺省 500。 */
  pollIntervalMs?: number
}

/** 冷启动/登出后的落点。 */
export type SessionStartResult = 'workspace' | 'login' | 'exited'

/** 天鉴会话控制器。 */
export class TianjianSessionController {
  private readonly deps: TianjianSessionDeps
  private readonly pollIntervalMs: number
  private loginWindow: TianjianLoginWindow | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private windowClosed = false
  private disposed = false

  constructor(deps: TianjianSessionDeps) {
    this.deps = deps
    this.pollIntervalMs = deps.pollIntervalMs ?? 500
  }

  /**
   * 冷启动入口：已有令牌 → 探活/重放后进工作台；否则显示登录窗口。
   * @returns 落点（工作台 / 登录窗口 / 已退出）。
   */
  async start(): Promise<SessionStartResult> {
    const token = await this.deps.readCookie().catch((error: unknown) => {
      this.deps.log?.(`读取会话失败：${messageOf(error)}`)
      return undefined
    })
    if (token === undefined) return await this.openLogin()
    const probe = await this.deps.probe(token)
    if (probe === 'unreachable') {
      // 网关暂时连不上：不写任何配置，直接进工作台（离线办公可用）。
      await this.deps.enterWorkspace()
      return 'workspace'
    }
    if (probe === 'invalid') {
      await this.deps.clearCookie().catch(() => undefined)
      return await this.openLogin()
    }
    try {
      await this.deps.prepare(token)
    } catch (error) {
      // 启动重放失败不阻挡本地工作；下次启动会再重放（配置可能已变）。
      this.deps.log?.(`启动配置下发失败：${messageOf(error)}`)
    }
    await this.deps.enterWorkspace()
    return 'workspace'
  }

  /**
   * 登出：清 cookie + 清凭据引用 → 隐藏工作台 → 显示登录窗口。
   * 不销毁本机实例、不改动已下发的 providers（下次登录覆盖）。
   * @returns 落点（登录窗口 / 已退出）。
   */
  async signOut(): Promise<SessionStartResult> {
    await this.deps.clearCookie().catch((error: unknown) => {
      this.deps.log?.(`清除会话失败：${messageOf(error)}`)
    })
    await this.deps.unsetCredential().catch((error: unknown) => {
      this.deps.log?.(`清除凭据引用失败：${messageOf(error)}`)
    })
    await this.deps.leaveWorkspace()
    return await this.openLogin()
  }

  /** 主动显示登录窗口（退出确认被取消后回到登录页等场景）。 */
  async showLogin(): Promise<SessionStartResult> {
    return await this.openLogin()
  }

  /** 停止轮询（宿主退出/窗口销毁；幂等）。 */
  dispose(): void {
    this.disposed = true
    this.stopPolling()
  }

  /** 打开登录窗口并开始轮询。 */
  private async openLogin(): Promise<SessionStartResult> {
    if (this.disposed) return 'login'
    let window: TianjianLoginWindow | undefined
    try {
      window = await this.deps.showLogin()
    } catch (error) {
      const action = await this.deps.showLoginFailure(error)
      if (action === 'retry') return await this.openLogin()
      this.deps.exit()
      return 'exited'
    }
    if (window === undefined || this.disposed) return 'login'
    this.loginWindow = window
    this.windowClosed = false
    window.onClosed(() => {
      this.windowClosed = true
      this.stopPolling()
      if (this.loginWindow === window) this.loginWindow = undefined
    })
    this.schedulePoll(0)
    return 'login'
  }

  /** 安排下一轮 cookie 轮询（窗口关闭/控制器销毁后不再排）。 */
  private schedulePoll(delayMs: number): void {
    if (this.disposed || this.windowClosed) return
    this.timer = setTimeout(() => { void this.poll() }, delayMs)
  }

  /** 停止轮询（不清登录窗口；窗口生命周期由壳层管理）。 */
  private stopPolling(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = undefined
  }

  /** 轮询一次：令牌出现 → 探活 → 配置下发 → 进工作台。 */
  private async poll(): Promise<void> {
    this.timer = undefined
    if (this.disposed || this.windowClosed) return
    const window = this.loginWindow
    if (window === undefined || window.isDestroyed()) {
      this.stopPolling()
      return
    }
    const token = await this.deps.readCookie().catch(() => undefined)
    if (token !== undefined) {
      const probe = await this.deps.probe(token)
      if (probe === 'valid') {
        try {
          await this.deps.prepare(token)
        } catch (error) {
          // 配置下发失败：留在登录窗口，重试（下一轮轮询重跑整套下发）。
          this.deps.log?.(`配置下发失败，保持登录窗口重试：${messageOf(error)}`)
          this.schedulePoll(this.pollIntervalMs)
          return
        }
        this.stopPolling()
        this.loginWindow = undefined
        this.windowClosed = true
        this.deps.closeLogin(window)
        await this.deps.enterWorkspace()
        return
      }
      if (probe === 'invalid') await this.deps.clearCookie().catch(() => undefined)
    }
    this.schedulePoll(this.pollIntervalMs)
  }
}

/** 错误消息（日志不含令牌——调用方只传异常）。 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
