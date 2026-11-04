/**
 * 天鉴登录窗口（#111，spec #108）：独立 BrowserWindow 加载网关登录页。
 *
 * 安全边界：
 * - 专用**持久化会话分区**（`persist:tianjian-gateway`）持有 `tj_session`
 *   cookie——与工作台的 defaultSession 隔离，主进程可读（HttpOnly 不清除外，
 *   渲染者始终是网关登录页，令牌不暴露给本机渲染进程）；
 * - **无 preload**、`nodeIntegration=false`、`contextIsolation=true`、
 *   `sandbox=true`、`webSecurity=true`；
 * - 只允许导航到网关同源（登录页 → `/portal` 等）；外部链接/新窗口一律拒绝；
 * - 窗口标题/尺寸沿用原欢迎窗口的品牌化设定（600×700、透明标题栏）。
 *
 * 登录成功判定由会话控制器做（轮询该分区 cookie），本模块只提供窗口与
 * cookie 读写缝（Electron `session` API 可注入，便于单测）。
 * @module @deepseek-ai/dsh-desktop/tianjian-login-window
 */

import { BrowserWindow, session, type BrowserWindowConstructorOptions, type Session } from 'electron'
import type { DesktopLocale } from './locale.ts'
import {
  TIANJIAN_LOGIN_PATH,
  TIANJIAN_SESSION_COOKIE,
  TIANJIAN_SESSION_PARTITION,
} from './tianjian-gateway.ts'

/** 登录窗口的固定尺寸（沿用原欢迎窗口的版式）。 */
export const TIANJIAN_LOGIN_WINDOW_SIZE = { width: 600, height: 700 } as const

/**
 * 登录窗口构造选项。
 * @param gatewayOrigin - 已归一化的网关基址（由 `resolveTianjianGatewayOrigin` 产出）。
 * @param locale - 壳层本地化文案（标题）。
 * @param platform - 运行平台（标题栏材质分流）。
 * @returns 无 preload 的沙箱窗口选项（专用持久化分区）。
 */
export function tianjianLoginWindowOptions(
  gatewayOrigin: string,
  locale: DesktopLocale,
  platform: NodeJS.Platform,
): BrowserWindowConstructorOptions {
  void gatewayOrigin
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
 * 打开登录窗口并等待登录页加载完成。
 * @param gatewayOrigin - 网关基址。
 * @param locale - 壳层文案。
 * @returns 已显示的窗口；加载失败时销毁并抛错（调用方提供重试入口）。
 */
export async function openTianjianLoginWindow(
  gatewayOrigin: string,
  locale: DesktopLocale,
): Promise<BrowserWindow> {
  const window = new BrowserWindow(tianjianLoginWindowOptions(gatewayOrigin, locale, process.platform))
  // 外部站点/新窗口一律拒绝：登录只发生在网关同源页面（PKI 上线后同源）。
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
  // 延迟到加载期间被替换/销毁的窗口不再显示（同原欢迎窗口语义）。
  if (!window.isDestroyed()) window.show()
  return window
}

/** 登录窗口分区（`persist:` 前缀 = cookie 跨重启持久化）。 */
export function tianjianLoginSession(): Session {
  return session.fromPartition(TIANJIAN_SESSION_PARTITION)
}

/**
 * 读取该分区里的天鉴会话令牌。
 * @param loginSession - 登录窗口分区（缺省 = 本机持久化分区）。
 * @param gatewayOrigin - cookie 所属网关基址。
 * @returns 令牌；无/空 → undefined。
 */
export async function readTianjianSessionToken(
  loginSession: Session = tianjianLoginSession(),
  gatewayOrigin: string,
): Promise<string | undefined> {
  const cookies = await loginSession.cookies.get({ url: gatewayOrigin, name: TIANJIAN_SESSION_COOKIE })
  const value = cookies[0]?.value?.trim()
  return value === undefined || value === '' ? undefined : value
}

/**
 * 清除该分区里的天鉴会话 cookie（登出 / 会话失效）。
 * @param loginSession - 登录窗口分区。
 * @param gatewayOrigin - cookie 所属网关基址。
 */
export async function clearTianjianSessionToken(
  loginSession: Session = tianjianLoginSession(),
  gatewayOrigin: string,
): Promise<void> {
  await loginSession.cookies.remove(gatewayOrigin, TIANJIAN_SESSION_COOKIE)
}
