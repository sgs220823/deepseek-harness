/**
 * TianJian login window (#111, spec #108): an independent BrowserWindow over the
 * gateway login page.
 *
 * Security boundaries:
 * - a dedicated **persistent session partition** (`persist:tianjian-gateway`) holds
 *   the `tj_session` cookie - isolated from the workspace's defaultSession; the main
 *   process can read it (HttpOnly does not block the main process), while the only
 *   renderer is the gateway login page, so the token never reaches a local renderer;
 * - **no preload**, `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`,
 *   `webSecurity=true`;
 * - navigation is restricted to the gateway origin (login page -> `/portal`); external
 *   sites and new windows are always denied. Window title/size follow the deleted
 *   welcome window's branding (600x700, transparent title bar).
 *
 * Login success is decided by the session controller (cookie polling); this module
 * only provides the window and the cookie read/clear seam (the Electron `session`
 * API is injectable for unit tests).
 * @module @deepseek-ai/dsh-desktop/tianjian-login-window
 */

import { BrowserWindow, session, type BrowserWindowConstructorOptions, type Session } from 'electron'
import type { DesktopLocale } from './locale.ts'
import {
  TIANJIAN_LOGIN_PATH,
  TIANJIAN_SESSION_COOKIE,
  TIANJIAN_SESSION_PARTITION,
} from './tianjian-gateway.ts'

/** Fixed login-window size (the deleted welcome window's layout). */
export const TIANJIAN_LOGIN_WINDOW_SIZE = { width: 600, height: 700 } as const

/**
 * Login-window constructor options.
 * @param locale - shell locale copy (window title).
 * @param platform - running platform (title-bar material split).
 * @returns sandboxed window options without a preload (dedicated persistent partition).
 */
export function tianjianLoginWindowOptions(locale: DesktopLocale, platform: NodeJS.Platform): BrowserWindowConstructorOptions {
  return {
    ...TIANJIAN_LOGIN_WINDOW_SIZE,
    useContentSize: true,
    center: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: locale.messages.welcomeTitle,
    backgroundColor: platform === 'darwin' || platform === 'win32' ? '#00000000' : '#FFFFFF',
    ...(platform === 'darwin' ? {
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 21, y: 21 },
      vibrancy: 'menu',
      visualEffectState: 'active',
    } as const : {}),
    ...(platform === 'win32' ? {
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#00000000', symbolColor: '#0F1115', height: 42 },
      backgroundMaterial: 'acrylic',
    } as const : {}),
    webPreferences: {
      partition: TIANJIAN_SESSION_PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  }
}

/**
 * Open the login window and wait for the login page to load.
 * @param gatewayOrigin - the gateway origin.
 * @param locale - shell copy.
 * @returns the shown window; a load failure destroys it and throws (the caller owns retry UX).
 */
export async function openTianjianLoginWindow(
  gatewayOrigin: string,
  locale: DesktopLocale,
): Promise<BrowserWindow> {
  const window = new BrowserWindow(tianjianLoginWindowOptions(locale, process.platform))
  // External sites and new windows are always denied: signing in happens on the
  // gateway origin only (the PKI entry point later lives on the same origin).
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin !== gatewayOrigin) event.preventDefault()
    } catch {
      event.preventDefault()
    }
  })
  try {
    await window.loadURL(`${gatewayOrigin}${TIANJIAN_LOGIN_PATH}`)
  } catch (error) {
    if (!window.isDestroyed()) window.destroy()
    throw error
  }
  // A window destroyed/superseded during load is never shown (same as the deleted welcome window).
  if (!window.isDestroyed()) window.show()
  return window
}

/** The login-window partition (`persist:` = cookies survive restarts). */
export function tianjianLoginSession(): Session {
  return session.fromPartition(TIANJIAN_SESSION_PARTITION)
}

/**
 * Read the TianJian session token from the partition.
 * @param gatewayOrigin - gateway origin the cookie belongs to.
 * @param loginSession - login-window partition (default = the persistent partition).
 * @returns the token; undefined when missing/empty.
 */
export async function readTianjianSessionToken(
  gatewayOrigin: string,
  loginSession: Session = tianjianLoginSession(),
): Promise<string | undefined> {
  const cookies = await loginSession.cookies.get({ url: gatewayOrigin, name: TIANJIAN_SESSION_COOKIE })
  const value = cookies[0]?.value?.trim()
  return value === undefined || value === '' ? undefined : value
}

/**
 * Clear the TianJian session cookie from the partition (sign-out / session expired).
 * @param gatewayOrigin - gateway origin the cookie belongs to.
 * @param loginSession - login-window partition (default = the persistent partition).
 */
export async function clearTianjianSessionToken(
  gatewayOrigin: string,
  loginSession: Session = tianjianLoginSession(),
): Promise<void> {
  await loginSession.cookies.remove(gatewayOrigin, TIANJIAN_SESSION_COOKIE)
}
