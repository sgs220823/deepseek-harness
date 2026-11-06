/**
 * Desktop account bridge (ticket #115): the workbench account menu (#83) needs the
 * signed-in identity the shell already fetched with `desktop-config` (#112), and the
 * sign-out effect the application menu owns (#113). Both cross the renderer boundary
 * as one narrow preload API; the browser half of the shared `tianjian-web` plugin
 * detects it and uses it instead of the gateway's same-origin HTTP endpoints.
 * @module @deepseek-ai/dsh-desktop/tianjian-account
 */

/** Signed-in identity rendered by the workbench account menu. */
export interface TianjianAccountInfo {
  /** Gateway login name (fallback when no display name is set). */
  readonly username: string
  /** Gateway display name; null when unset. */
  readonly displayName: string | null
  /** Gateway role id (`super-admin` / `org-admin` / `user`). */
  readonly role: string
}

/** Bridge installed as `window.__DSH_TIANJIAN_ACCOUNT__` on the application document. */
export interface TianjianAccountBridge {
  /**
   * Read the identity from the last successful `desktop-config` push.
   * @returns the signed-in identity, or null before sign-in / after sign-out.
   */
  read(): Promise<TianjianAccountInfo | null>
  /**
   * Sign out with the application-menu effect: clear the session cookie, unset the
   * credential reference, hide the workspace, and show the gateway login window.
   * @returns resolves once the shell handed the session over to the login window.
   */
  signOut(): Promise<void>
}
