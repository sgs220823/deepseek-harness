/**
 * TianJian login window (#111, spec #108): a sandboxed, preload-free window over
 * the gateway origin with a dedicated persistent partition.
 *
 * Behavior under test: window options, load URL, destroy on load failure, the
 * same-origin navigation guard, and the partition cookie helpers.
 * @module @deepseek-ai/dsh-desktop/tests/tianjian-login-window
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const electron = vi.hoisted(() => ({
  create: vi.fn<(options: unknown) => unknown>(),
  loadURL: vi.fn<(url: string) => Promise<void>>(),
  partitionSession: { cookies: { get: vi.fn(), remove: vi.fn() } },
}))

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(function BrowserWindowCtor(options: unknown) {
    return electron.create(options)
  }),
  session: { fromPartition: vi.fn(() => electron.partitionSession) },
}))

const { openTianjianLoginWindow, readTianjianSessionToken, clearTianjianSessionToken, tianjianLoginWindowOptions } = await import('../src/tianjian-login-window.ts')

interface FakeWindow {
  webContents: {
    setWindowOpenHandler: ReturnType<typeof vi.fn>
    on: ReturnType<typeof vi.fn>
  }
  loadURL: (url: string) => Promise<void>
  isDestroyed: ReturnType<typeof vi.fn>
  show: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

function createWindow(): FakeWindow {
  return {
    webContents: {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
    },
    loadURL: electron.loadURL as unknown as (url: string) => Promise<void>,
    isDestroyed: vi.fn(() => false),
    show: vi.fn(),
    destroy: vi.fn(),
  }
}

let window: FakeWindow

beforeEach(() => {
  electron.create.mockReset()
  electron.loadURL.mockReset().mockResolvedValue(undefined)
  electron.partitionSession.cookies.get.mockReset().mockResolvedValue([])
  electron.partitionSession.cookies.remove.mockReset().mockResolvedValue(undefined)
  window = createWindow()
  electron.create.mockReturnValue(window)
})

const LOCALE = { messages: { welcomeTitle: '天鉴智能体平台' } } as never
const ORIGIN = 'http://gateway.internal.test:8080'

describe('tianjianLoginWindowOptions', () => {
  it('uses the dedicated persistent partition with no preload and full sandboxing', () => {
    const options = tianjianLoginWindowOptions(ORIGIN, LOCALE, 'win32')
    expect(options).toMatchObject({
      width: 600,
      height: 700,
      show: false,
      title: '天鉴智能体平台',
      webPreferences: {
        partition: 'persist:tianjian-gateway',
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    })
    expect(options.webPreferences?.preload).toBeUndefined()
  })

  it('keeps the welcome-window platform chrome (transparent title bar)', () => {
    expect(tianjianLoginWindowOptions(ORIGIN, LOCALE, 'win32').titleBarOverlay).toMatchObject({ height: 42 })
    expect(tianjianLoginWindowOptions(ORIGIN, LOCALE, 'darwin').vibrancy).toBe('menu')
    expect(tianjianLoginWindowOptions(ORIGIN, LOCALE, 'linux').backgroundColor).toBe('#FFFFFF')
  })
})

describe('openTianjianLoginWindow', () => {
  it('loads the gateway login page and shows the window', async () => {
    const opened = await openTianjianLoginWindow(ORIGIN, LOCALE)
    expect(opened).toBe(window)
    expect(electron.loadURL).toHaveBeenCalledWith(`${ORIGIN}/login`)
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.webContents.setWindowOpenHandler.mock.calls[0]![0]()).toEqual({ action: 'deny' })
  })

  it('destroys the window when the login page fails to load', async () => {
    electron.loadURL.mockRejectedValue(new Error('ERR_CONNECTION_REFUSED'))
    await expect(openTianjianLoginWindow(ORIGIN, LOCALE)).rejects.toThrow('ERR_CONNECTION_REFUSED')
    expect(window.destroy).toHaveBeenCalledOnce()
    expect(window.show).not.toHaveBeenCalled()
  })

  it('blocks navigation away from the gateway origin', async () => {
    await openTianjianLoginWindow(ORIGIN, LOCALE)
    const registration = window.webContents.on.mock.calls.find(([name]) => name === 'will-navigate')
    expect(registration).toBeDefined()
    const handler = registration![1] as unknown as (event: { preventDefault: ReturnType<typeof vi.fn> }, url: string) => void
    const internal = { preventDefault: vi.fn() }
    handler(internal, `${ORIGIN}/portal`)
    expect(internal.preventDefault).not.toHaveBeenCalled()
    const external = { preventDefault: vi.fn() }
    handler(external, 'https://evil.example/login')
    expect(external.preventDefault).toHaveBeenCalledOnce()
  })
})

describe('session-token cookie helpers', () => {
  it('reads and clears the tj_session cookie in the login partition', async () => {
    electron.partitionSession.cookies.get.mockResolvedValue([{ value: ' token-1 ' }])
    await expect(readTianjianSessionToken(electron.partitionSession as never, ORIGIN)).resolves.toBe('token-1')
    expect(electron.partitionSession.cookies.get).toHaveBeenCalledWith({ url: ORIGIN, name: 'tj_session' })
    await readTianjianSessionToken(undefined, ORIGIN)
    expect(electron.partitionSession.cookies.get).toHaveBeenCalledTimes(2)
    await clearTianjianSessionToken(electron.partitionSession as never, ORIGIN)
    expect(electron.partitionSession.cookies.remove).toHaveBeenCalledWith(ORIGIN, 'tj_session')
  })

  it('treats a missing or empty cookie as no session', async () => {
    electron.partitionSession.cookies.get.mockResolvedValue([])
    await expect(readTianjianSessionToken(electron.partitionSession as never, ORIGIN)).resolves.toBeUndefined()
  })
})
