/**
 * TianJian session controller (#111/#112/#113, spec #108).
 *
 * Behavior under test: cold start (valid/invalid/unreachable/missing session),
 * login-window polling (success, config failure keeps the login window and retries),
 * window-close semantics, and sign-out. Electron is fully injected; fake timers
 * drive the poll loop.
 * @module @deepseek-ai/dsh-desktop/tests/tianjian-session
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TianjianSessionController, type TianjianLoginWindow, type TianjianSessionDeps } from '../src/tianjian-session.ts'

interface FakeLoginWindow extends TianjianLoginWindow {
  isDestroyed(): boolean
  onClosed(listener: () => void): void
  close(): void
  /** Invoke the registered closed listener (as the real window would). */
  emitClosed(): void
}

function makeWindow(): FakeLoginWindow {
  let closedListener: (() => void) | undefined
  return {
    isDestroyed: vi.fn(() => false),
    onClosed: vi.fn((listener: () => void) => { closedListener = listener }),
    close: vi.fn(() => { closedListener?.() }),
    emitClosed(): void { closedListener?.() },
  }
}

interface FakeDeps extends TianjianSessionDeps {
  windows: FakeLoginWindow[]
  calls: string[]
}

function makeDeps(): FakeDeps {
  const windows: FakeLoginWindow[] = []
  const calls: string[] = []
  return {
    windows,
    calls,
    readCookie: vi.fn(async () => undefined),
    clearCookie: vi.fn(async () => { calls.push('clearCookie') }),
    probe: vi.fn(async () => 'valid' as const),
    prepare: vi.fn(async () => { calls.push('poll:prepare') }),
    showLogin: vi.fn(async () => {
      calls.push('showLogin')
      const window = makeWindow()
      windows.push(window)
      return window
    }),
    closeLogin: vi.fn((window: FakeLoginWindow) => {
      calls.push('closeLogin')
      window.close()
    }),
    showLoginFailure: vi.fn(async () => 'exit' as const),
    enterWorkspace: vi.fn(async () => { calls.push('enterWorkspace') }),
    leaveWorkspace: vi.fn(async () => { calls.push('leaveWorkspace') }),
    unsetCredential: vi.fn(async () => { calls.push('unsetCredential') }),
    exit: vi.fn(() => { calls.push('exit') }),
    log: vi.fn(),
    pollIntervalMs: 10,
  }
}

let deps: FakeDeps
let controller: TianjianSessionController

beforeEach(() => {
  vi.useFakeTimers()
  deps = makeDeps()
  controller = new TianjianSessionController(deps)
})

afterEach(() => {
  controller.dispose()
  vi.useRealTimers()
})

describe('cold start', () => {
  it('no cookie → opens the login window (and starts polling)', async () => {
    const outcome = await controller.start()
    expect(outcome).toBe('login')
    expect(deps.calls).toEqual(['showLogin'])
    expect(deps.windows).toHaveLength(1)
    expect(deps.enterWorkspace).not.toHaveBeenCalled()
  })

  it('valid cookie → replays the configuration before entering the workspace', async () => {
    deps.readCookie = vi.fn(async () => 'token-a')
    const outcome = await controller.start()
    expect(outcome).toBe('workspace')
    expect(deps.calls).toEqual(['poll:prepare', 'enterWorkspace'])
    expect(deps.showLogin).not.toHaveBeenCalled()
  })

  it('invalid cookie (401) → clears the cookie and opens the login window', async () => {
    deps.readCookie = vi.fn(async () => 'expired')
    deps.probe = vi.fn(async () => 'invalid' as const)
    const outcome = await controller.start()
    expect(outcome).toBe('login')
    expect(deps.calls).toEqual(['clearCookie', 'showLogin'])
  })

  it('unreachable gateway → enters the workspace without writing any configuration', async () => {
    deps.readCookie = vi.fn(async () => 'token-b')
    deps.probe = vi.fn(async () => 'unreachable' as const)
    const outcome = await controller.start()
    expect(outcome).toBe('workspace')
    expect(deps.calls).toEqual(['enterWorkspace'])
    expect(deps.prepare).not.toHaveBeenCalled()
  })

  it('startup replay failure → logs and still enters the workspace', async () => {
    deps.readCookie = vi.fn(async () => 'token-c')
    deps.prepare = vi.fn(async () => { throw new Error('host RPC failed') })
    const outcome = await controller.start()
    expect(outcome).toBe('workspace')
    expect(deps.enterWorkspace).toHaveBeenCalledOnce()
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining('startup config push failed'))
  })
})

describe('login-window polling', () => {
  it('cookie appears → probe valid → prepare → close login → workspace', async () => {
    let reads = 0
    deps.readCookie = vi.fn(async () => {
      reads += 1
      return reads === 1 ? undefined : 'token-d'
    })
    await controller.start()
    await vi.advanceTimersByTimeAsync(20)
    expect(deps.calls).toEqual(['showLogin', 'poll:prepare', 'closeLogin', 'enterWorkspace'])
    expect(deps.probe).toHaveBeenCalledWith('token-d')
    expect(deps.windows[0]!.close).toHaveBeenCalledOnce()
  })

  it('cookie appears but the gateway session is invalid → clears the cookie and keeps waiting', async () => {
    let reads = 0
    deps.readCookie = vi.fn(async () => {
      reads += 1
      return reads === 2 ? 'stale' : undefined
    })
    deps.probe = vi.fn(async () => 'invalid' as const)
    await controller.start()
    await vi.advanceTimersByTimeAsync(20)
    expect(deps.calls).toEqual(['showLogin', 'clearCookie'])
    expect(deps.enterWorkspace).not.toHaveBeenCalled()
  })

  it('prepare fails → stays on the login window and retries the whole handoff', async () => {
    let reads = 0
    deps.readCookie = vi.fn(async () => {
      reads += 1
      return reads === 1 ? undefined : 'token-e'
    })
    let failures = 0
    deps.prepare = vi.fn(async () => {
      deps.calls.push('poll:prepare')
      failures += 1
      if (failures < 2) throw new Error('RPC failed')
    })
    await controller.start()
    // First poll: the handoff fails → the login window stays and a retry is scheduled.
    await vi.advanceTimersByTimeAsync(5)
    expect(deps.calls).toEqual(['showLogin', 'poll:prepare'])
    expect(deps.enterWorkspace).not.toHaveBeenCalled()
    expect(deps.log).toHaveBeenCalledWith(expect.stringContaining('config push failed'))
    // Second poll (next interval): the handoff succeeds → workspace.
    await vi.advanceTimersByTimeAsync(10)
    expect(deps.calls).toEqual(['showLogin', 'poll:prepare', 'poll:prepare', 'closeLogin', 'enterWorkspace'])
    expect(deps.enterWorkspace).toHaveBeenCalledOnce()
  })

  it('user closes the login window → polling stops and no side effects run', async () => {
    await controller.start()
    const window = deps.windows[0]!
    window.emitClosed()
    deps.readCookie = vi.fn(async () => 'token-f')
    await vi.advanceTimersByTimeAsync(50)
    expect(deps.calls).toEqual(['showLogin'])
    expect(deps.enterWorkspace).not.toHaveBeenCalled()
  })

  it('login window cannot load → failure prompt decides retry or exit', async () => {
    // First failure: the user picks Retry, and the retry attempt succeeds because
    // the (injected) showLogin succeeds from the second call on.
    const throwing = vi.fn(async () => { throw new Error('ERR_NAME_NOT_RESOLVED') })
    deps.showLogin = throwing
    deps.showLoginFailure = vi.fn(async () => {
      if (deps.showLogin === throwing) {
        deps.showLogin = vi.fn(async () => {
          const window = makeWindow()
          deps.windows.push(window)
          return window
        })
      }
      return 'retry' as const
    })
    const first = await controller.start()
    expect(first).toBe('login')
    expect(deps.showLoginFailure).toHaveBeenCalledOnce()
    expect(deps.windows).toHaveLength(1)
    // A continuing failure lets the user choose exit, which the shell turns into quit.
    deps.showLogin = vi.fn(async () => { throw new Error('ERR_NETWORK') })
    deps.showLoginFailure = vi.fn(async () => 'exit' as const)
    await controller.showLogin()
    expect(deps.exit).toHaveBeenCalledOnce()
  })
})

describe('sign out', () => {
  it('clears cookie + credential, hides the workspace, shows the login window', async () => {
    const outcome = await controller.signOut()
    expect(outcome).toBe('login')
    expect(deps.calls).toEqual(['clearCookie', 'unsetCredential', 'leaveWorkspace', 'showLogin'])
    expect(deps.enterWorkspace).not.toHaveBeenCalled()
  })
})
