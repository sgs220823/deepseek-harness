/**
 * TianJian Host RPC facade (#112, spec #108 / ADR-0018).
 *
 * Behavior under test: exact RPC payloads and order (credentials → settings
 * replace → settings update), the Bearer gateway call for desktop-config,
 * response-shape validation, locale read, and credential unset on sign-out.
 * @module @deepseek-ai/dsh-desktop/tests/tianjian-backend
 */

import { describe, expect, it, vi } from 'vitest'
import { connectTianjianBackend, type TianjianDesktopConfig } from '../src/tianjian-backend.ts'
import { TIANJIAN_GATEWAY_TOKEN_REF } from '../src/tianjian-gateway.ts'

const CONFIG: TianjianDesktopConfig = {
  version: 1,
  account: { id: 7, username: 'minjing001', display_name: null, role: 'user' },
  gateway: { origin: 'http://gateway.internal.test:8080' },
  llm: {
    providers: {
      tianjian: {
        displayName: '天鉴模型网关',
        baseURL: 'http://gateway.internal.test:8080/api/desktop/llm/tianjian',
        apiKeyEnv: TIANJIAN_GATEWAY_TOKEN_REF,
      },
    },
    defaultModel: { route: 'tianjian', model: 'deepseek-v4-flash' },
  },
}

function rpcResponse(rpcId: string, value: unknown): Response {
  return Response.json({ type: 'server-response', rpcId, result: { ok: true, value } })
}

/** Record every `send` with URL + parsed request body for exact payload/order assertions. */
function recorder(respond: (url: string, request: { rpcId: string; args?: Record<string, unknown> }) => Response) {
  const calls: Array<{ url: string; init: RequestInit | undefined; body: unknown }> = []
  const send = vi.fn(async (input: string, init?: RequestInit) => {
    const url = String(input)
    const parsed = init?.body === undefined ? undefined : JSON.parse(String(init.body)) as {
      rpcId?: string
      payload?: { args?: Record<string, unknown> }
    }
    const body = parsed
    calls.push({ url, init, body })
    const rpcId = body?.rpcId ?? ''
    const args = body?.payload?.args
    return respond(url, args === undefined ? { rpcId } : { rpcId, args })
  })
  return { calls, send }
}

/** Standard reply table: 204 for the launch URL, RPC envelope for the rest. */
const okReply = (url: string, request: { rpcId: string }): Response => url.endsWith('/?token=x')
  ? new Response(null, { status: 204 })
  : rpcResponse(request.rpcId, {})

/** Backend over a recorder that answers 204 for the launch URL and ok for every RPC. */
async function connect(send: ReturnType<typeof recorder>['send']) {
  return await connectTianjianBackend('http://127.0.0.1:1/?token=x', send, 'http://gateway.test')
}

describe('connectTianjianBackend', () => {
  it('refuses an unauthenticated Web launch', async () => {
    const { send } = recorder(() => new Response(null, { status: 401 }))
    await expect(connectTianjianBackend('http://127.0.0.1:1/?token=x', send, 'http://gateway.test'))
      .rejects.toThrow('Web authentication failed')
  })

  it('orders the three handoff RPCs and sends their exact payloads', async () => {
    const { calls, send } = recorder((url, request) => okReply(url, request))
    const backend = await connect(send)
    await backend.applyConfiguration('session-token', CONFIG)
    expect(calls.map(call => call.url)).toEqual([
      'http://127.0.0.1:1/?token=x',
      'http://127.0.0.1:1/api/credentials/set',
      'http://127.0.0.1:1/api/settings/replace',
      'http://127.0.0.1:1/api/settings/update',
    ])
    expect(calls[1]!.body).toEqual({
      type: 'client-request', rpcId: expect.any(String), method: 'credentials/set',
      payload: { args: { ref: 'DSH_TIANJIAN_GATEWAY_TOKEN', value: 'session-token' } },
    })
    expect(calls[2]!.body).toEqual({
      type: 'client-request', rpcId: expect.any(String), method: 'settings/replace',
      payload: { args: { ns: 'llm-pi-ai', section: { providers: CONFIG.llm.providers } } },
    })
    expect(calls[3]!.body).toEqual({
      type: 'client-request', rpcId: expect.any(String), method: 'settings/update',
      payload: { args: { ns: 'agent-default-model', patch: { provider: 'tianjian', model: 'deepseek-v4-flash' } } },
    })
  })

  it('fetches desktop-config with the Bearer session token and validates the shape', async () => {
    const { calls, send } = recorder((url) => {
      if (url.includes('desktop-config')) return Response.json(CONFIG)
      return okReply(url, { rpcId: '' })
    })
    const backend = await connect(send)
    const config = await backend.fetchDesktopConfig('session-token')
    const gatewayCall = calls.find(call => call.url.includes('desktop-config'))!
    expect(gatewayCall.init?.headers).toEqual({ authorization: 'Bearer session-token' })
    expect(config.version).toBe(1)
    expect(config.llm.defaultModel).toEqual({ route: 'tianjian', model: 'deepseek-v4-flash' })
  })

  it('rejects a malformed desktop-config response', async () => {
    const { send } = recorder((url) => {
      if (url.includes('desktop-config')) return Response.json({ version: 2 })
      return okReply(url, { rpcId: '' })
    })
    const backend = await connect(send)
    await expect(backend.fetchDesktopConfig('t')).rejects.toThrow('invalid desktop-config')
  })

  it('rejects a failed gateway call for desktop-config', async () => {
    const { send } = recorder((url) => {
      if (url.includes('desktop-config')) return new Response(null, { status: 401 })
      return okReply(url, { rpcId: '' })
    })
    const backend = await connect(send)
    await expect(backend.fetchDesktopConfig('t')).rejects.toThrow('desktop-config HTTP 401')
  })

  it('reads the locale preference from the settings document', async () => {
    const { send } = recorder((url, request) => {
      if (url.endsWith('/api/settings/describe')) {
        return rpcResponse(request.rpcId, { namespaces: [{ ns: 'locale', value: { preference: 'zh-CN' } }, { ns: 'other', value: {} }] })
      }
      return okReply(url, request)
    })
    const backend = await connect(send)
    await expect(backend.readLocalePreference()).resolves.toBe('zh-CN')
  })

  it('unsets the gateway token reference on sign-out', async () => {
    const { calls, send } = recorder((url, request) => okReply(url, request))
    const backend = await connect(send)
    await backend.unsetGatewayToken()
    const unset = calls.find(call => call.url.endsWith('/api/credentials/unset'))!
    expect(unset.body).toEqual({
      type: 'client-request', rpcId: expect.any(String), method: 'credentials/unset',
      payload: { args: { ref: 'DSH_TIANJIAN_GATEWAY_TOKEN' } },
    })
  })
})
