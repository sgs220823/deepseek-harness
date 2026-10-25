// @vitest-environment jsdom
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { apply, inject } from '../src/client/index.ts'
import { BRAND_SWITCH_STYLE_ID, TianJianBrandMark, TianJianBrandName, sized } from '../src/client/Brand.tsx'
import { apply as hostApply } from '../src/index.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  document.getElementById(BRAND_SWITCH_STYLE_ID)?.remove()
})

const HOLES = [
  'sidebar.brand.mark',
  'sidebar.brand.name',
] as const

const HERO_HOLE = 'conversation.hero.brand.mark'

async function bench(declare = true) {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const slots = ctx.get('slots') as SlotRegistry
  const declareHoles = () => slots.register({
    name: 'root',
    children: Object.fromEntries([...HOLES, HERO_HOLE].map(name => [name, { kind: 'single', scope: 'root' }])),
  } as never, () => null)
  const disposeHoles = declare ? declareHoles() : undefined
  return { ctx, slots, declareHoles, disposeHoles }
}

describe('TianJian browser-brand plugin', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares only the slot service it uses', () => {
    expect(inject).toEqual(['slots'])
  })

  it('leaves every slot empty outside the tianjian build profile', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'official')
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    for (const hole of HOLES) expect(subject.slots.entries(hole)).toHaveLength(0)
  })

  it('fills declarations before or after apply and removes every occupant on teardown', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'tianjian')
    const before = await bench()
    const fiber = before.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(1)
    // Mark light/dark switch CSS is injected once at apply time (not per mark).
    expect(document.getElementById(BRAND_SWITCH_STYLE_ID)).not.toBeNull()

    before.disposeHoles?.()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(0)
    before.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(1)

    await fiber.dispose()
    for (const hole of HOLES) expect(before.slots.entries(hole)).toHaveLength(0)

    const after = await bench(false)
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    for (const hole of HOLES) expect(after.slots.entries(hole)).toHaveLength(0)
    after.declareHoles()
    await Promise.resolve()
    for (const hole of HOLES) expect(after.slots.entries(hole)).toHaveLength(1)
  })

  it('leaves the conversation hero on its declaring fallback even in tianjian builds', async () => {
    vi.stubEnv('DSH_CLIENT_BUILD_PROFILE', 'tianjian')
    const subject = await bench()
    await subject.ctx.plugin({ inject: [...inject], apply }).await()
    expect(subject.slots.entries(HERO_HOLE)).toHaveLength(0)
  })

  it('renders the tianjian name and mark at the requested size', () => {
    const name = render(<TianJianBrandName />)
    // Platform name aligned with the tianjian brand tokens (R11 single source:
    // tianjian plugins/shared/src/brand.ts; values.ts copy + cross-repo CI check).
    expect(name.container.textContent).toBe('天鉴智能体平台')
    name.unmount()

    const mark = render(<TianJianBrandMark size={34} />)
    expect(mark.container.querySelector('svg')?.getAttribute('width')).toBe('34')
    // FE8 mapping: >=32px uses the 07 line asset (viewBox 2.5 4 155 155).
    expect(mark.container.querySelector('svg')?.getAttribute('viewBox')).toBe('2.5 4 155 155')
    mark.rerender(<TianJianBrandMark size={24} />)
    expect(mark.container.querySelector('svg')?.getAttribute('width')).toBe('24')
    // 16–24px uses the 08 solid asset (viewBox 0 0 160 160).
    expect(mark.container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 160 160')
  })

  it('sized: 160px 画布 → 请求尺寸；画布缺失 → undefined（纯函数契约）', () => {
    const sizedSvg = sized('<svg width="160" height="160" role="img"></svg>', 24)
    expect(sizedSvg).toContain('width="24" height="24"')
    expect(sizedSvg).toContain('aria-hidden="true"')
    expect(sized('<svg width="120" height="120"></svg>', 24)).toBeUndefined()
  })

  it('资产画布漂移时渲染短名文本且不抛错，告警只发一次（render 级降级契约）', async () => {
    const DRIFTED_SVG = '<svg viewBox="0 0 120 120"></svg>'
    vi.resetModules()
    vi.doMock('../src/client/values.ts', () => ({
      TIANJIAN_BRAND_VALUES: { name: '天鉴智能体平台', shortName: '天鉴' },
      TIANJIAN_BRAND_MARK_SVG: DRIFTED_SVG,
      TIANJIAN_BRAND_MARK_INVERSE_SVG: DRIFTED_SVG,
      TIANJIAN_BRAND_MARK_SMALL_SVG: DRIFTED_SVG,
      TIANJIAN_BRAND_MARK_SMALL_INVERSE_SVG: DRIFTED_SVG,
    }))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { TianJianBrandMark: DriftedMark } = await import('../src/client/Brand.tsx')
      const first = render(<DriftedMark size={34} />)
      expect(first.container.querySelector('svg')).toBeNull()
      expect(first.container.textContent).toBe('天鉴')
      expect(warn).toHaveBeenCalledTimes(1)
      // 告警是一次性的（模块级 flag）：第二个实例降级但不再刷屏。
      const second = render(<DriftedMark size={24} />)
      expect(second.container.querySelector('svg')).toBeNull()
      expect(second.container.textContent).toBe('天鉴')
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      warn.mockRestore()
      vi.doUnmock('../src/client/values.ts')
      vi.resetModules()
    }
  })
})
