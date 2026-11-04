/**
 * TianJian session controller (#111/#112/#113, spec #108): login-window lifecycle
 * + session probing + configuration push + sign-out. All side effects go through
 * injected dependencies, so main-process unit tests can pin the state machine.
 *
 * State machine:
 * - {@link start} (cold start): existing partition token -> `probe`:
 *   - `valid` -> replay the configuration (failure is logged only, local work is
 *     not blocked) -> enter the workspace;
 *   - `invalid` -> clear the cookie -> show the login window;
 *   - `unreachable` -> **no config writes**, enter the workspace (offline usable);
 *   no token -> show the login window.
 * - login-window polling: token appears -> `probe`:
 *   - `valid` -> push the configuration (all three steps) -> close the login
 *     window -> enter the workspace;
 *   - push failure -> **stay on the login window and retry** (the next poll reruns
 *     the whole handoff; no workspace);
 *   - `invalid` -> clear the cookie and keep waiting (the login page can retry).
 * - {@link signOut}: clear cookie + unset the token reference -> hide the
 *   workspace -> show the login window (instance stays alive, pushed providers
 *   stay untouched).
 * - the user closes the login window: polling stops and the shell applies its
 *   existing platform semantics (Windows quits, macOS drops the main window); the
 *   controller produces no further side effects.
 * @module @deepseek-ai/dsh-desktop/tianjian-session
 */

/** Session probe outcome (`unreachable` = the gateway is temporarily down, not a credential problem). */
export type SessionProbeResult = 'valid' | 'invalid' | 'unreachable'

/** Minimal login-window handle (subset of Electron's BrowserWindow). */
export interface TianjianLoginWindow {
  isDestroyed(): boolean
  onClosed(listener: () => void): void
  close(): void
}

/** Controller dependencies (production = main.ts wiring; tests = fakes). */
export interface TianjianSessionDeps {
  /** Read the `tj_session` cookie from the login partition. */
  readCookie(): Promise<string | undefined>
  /** Clear the `tj_session` cookie from the login partition. */
  clearCookie(): Promise<void>
  /** Probe the session (Bearer `/api/auth/me` semantics): 200 / 401 / unreachable. */
  probe(token: string): Promise<SessionProbeResult>
  /** Fetch desktop-config and push it in contract order (resolves only when all steps succeeded). */
  prepare(token: string): Promise<void>
  /** Show the gateway login window (resolves when loaded; undefined when it cannot be shown, e.g. quitting). */
  showLogin(): Promise<TianjianLoginWindow | undefined>
  /** Close the login window. */
  closeLogin(window: TianjianLoginWindow): void
  /** Retry entry when the login window cannot load (native prompt). */
  showLoginFailure(error: unknown): Promise<'retry' | 'exit'>
  /** Enter the workspace (show the main window). */
  enterWorkspace(): Promise<void>
  /** Hide the workspace (sign-out; the instance is not stopped). */
  leaveWorkspace(): Promise<void>
  /** Unset the local credential reference (sign-out). */
  unsetCredential(): Promise<void>
  /** Quit the application (user cancels the first login). */
  exit(): void
  /** Diagnostic log (never contains the token). */
  log?(message: string): void
  /** Login-window poll interval (ms), default 500. */
  pollIntervalMs?: number
}

/** Where a cold start / sign-out lands. */
export type SessionStartResult = 'workspace' | 'login' | 'exited'

/** TianJian session controller. */
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
   * Cold-start entry: existing token -> probe/replay then workspace; otherwise show the login window.
   * @returns the landing spot (workspace / login window / exited).
   */
  async start(): Promise<SessionStartResult> {
    const token = await this.deps.readCookie().catch((error: unknown) => {
      this.deps.log?.(`reading the session cookie failed: ${messageOf(error)}`)
      return undefined
    })
    if (token === undefined) return await this.openLogin()
    const probe = await this.deps.probe(token)
    if (probe === 'unreachable') {
      // The gateway is temporarily down: no config writes, straight to the workspace (offline work).
      await this.deps.enterWorkspace()
      return 'workspace'
    }
    if (probe === 'invalid') {
      // The session is already unusable; a failed clear must not block re-login.
      await this.deps.clearCookie().catch(() => undefined)
      return await this.openLogin()
    }
    try {
      await this.deps.prepare(token)
    } catch (error) {
      // A startup replay failure must not block local work; the next start replays again.
      this.deps.log?.(`startup config push failed: ${messageOf(error)}`)
    }
    await this.deps.enterWorkspace()
    return 'workspace'
  }

  /**
   * Sign out: clear cookie + unset the credential reference -> hide the workspace -> show the login window.
   * The local instance is not stopped and pushed providers are not changed (the next sign-in overwrites them).
   * @returns the landing spot (login window / exited).
   */
  async signOut(): Promise<SessionStartResult> {
    await this.deps.clearCookie().catch((error: unknown) => {
      this.deps.log?.(`clearing the session cookie failed: ${messageOf(error)}`)
    })
    await this.deps.unsetCredential().catch((error: unknown) => {
      this.deps.log?.(`unsetting the credential reference failed: ${messageOf(error)}`)
    })
    await this.deps.leaveWorkspace()
    return await this.openLogin()
  }

  /** Show the login window proactively (e.g. a cancelled quit returns to the login page). */
  async showLogin(): Promise<SessionStartResult> {
    return await this.openLogin()
  }

  /** Stop polling (host teardown / window destruction; idempotent). */
  dispose(): void {
    this.disposed = true
    this.stopPolling()
  }

  /** Open the login window and start polling. */
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

  /** Schedule the next cookie poll (nothing is scheduled once the window closed or the controller is disposed). */
  private schedulePoll(delayMs: number): void {
    if (this.disposed || this.windowClosed) return
    this.timer = setTimeout(() => { void this.poll() }, delayMs)
  }

  /** Stop polling (the login window itself is owned by the shell). */
  private stopPolling(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = undefined
  }

  /** One poll: token appears -> probe -> push config -> enter the workspace. */
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
          // Push failure: stay on the login window and retry (the next poll reruns the whole handoff).
          this.deps.log?.(`config push failed, staying on the login window: ${messageOf(error)}`)
          this.schedulePoll(this.pollIntervalMs)
          return
        }
        this.stopPolling()
        this.loginWindow = undefined
        // Closing fires the window's own 'closed' listener, which sets `windowClosed`
        // and clears `loginWindow`; nothing else here flips the flags by hand.
        this.deps.closeLogin(window)
        await this.deps.enterWorkspace()
        return
      }
      if (probe === 'invalid') await this.deps.clearCookie().catch(() => undefined) // Stale session; keep waiting for a fresh login.
    }
    this.schedulePoll(this.pollIntervalMs)
  }
}

/** Error message (logs never contain the token; callers pass the error object only). */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
