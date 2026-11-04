/**
 * TianJian gateway-origin resolution (#111, spec #108 / ADR-0018).
 *
 * Behavior under test: the build-time origin is the only source (packaged builds
 * fail without it, dev falls back to the local dev gateway), and the value must be
 * a bare http(s) origin.
 * @module @deepseek-ai/dsh-desktop/tests/tianjian-gateway
 */

import { describe, expect, it } from 'vitest'
import { DEV_TIANJIAN_GATEWAY_ORIGIN, resolveTianjianGatewayOrigin } from '../src/tianjian-gateway.ts'

describe('resolveTianjianGatewayOrigin', () => {
  it('falls back to the development gateway when unpackaged and unset', () => {
    expect(resolveTianjianGatewayOrigin(undefined, false)).toBe(DEV_TIANJIAN_GATEWAY_ORIGIN)
    expect(resolveTianjianGatewayOrigin('   ', false)).toBe(DEV_TIANJIAN_GATEWAY_ORIGIN)
  })

  it('fails a packaged build without the build-time origin', () => {
    expect(() => resolveTianjianGatewayOrigin(undefined, true)).toThrow('DSH_TIANJIAN_GATEWAY_URL')
    expect(() => resolveTianjianGatewayOrigin('  ', true)).toThrow('DSH_TIANJIAN_GATEWAY_URL')
  })

  it('normalizes to a bare origin and rejects non-origin values', () => {
    expect(resolveTianjianGatewayOrigin('http://gateway.internal:8080/', true)).toBe('http://gateway.internal:8080')
    expect(resolveTianjianGatewayOrigin(' HTTP://Gateway.Internal:8080 ', true)).toBe('http://gateway.internal:8080')
    expect(() => resolveTianjianGatewayOrigin('ftp://gateway.internal:8080', true)).toThrow(/http\/https/u)
    expect(() => resolveTianjianGatewayOrigin('http://gateway.internal:8080/login', true)).toThrow(/网关基址/u)
    expect(() => resolveTianjianGatewayOrigin('http://user:pw@gateway.internal:8080', true)).toThrow(/网关基址/u)
    expect(() => resolveTianjianGatewayOrigin('not a url', true)).toThrow(/合法 URL/u)
  })
})
