// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RunningShieldMark } from '../src/client/chat/RunningShieldMark.tsx'

afterEach(cleanup)

describe('RunningShieldMark', () => {
  it('renders a decorative shield seat without inline styles or SMIL animation', () => {
    const view = render(<RunningShieldMark />)
    const icon = view.container.firstElementChild!
    expect(icon.tagName).toBe('SPAN')
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.children).toHaveLength(1)
    const svg = icon.querySelector('svg')!
    expect(icon.lastElementChild).toBe(svg)
    expect(svg.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(svg.querySelectorAll('path')).toHaveLength(1)
    expect(svg.querySelector('path')?.getAttribute('d')).toMatch(/^M/)
    expect(svg.querySelector('path')?.getAttribute('stroke')).toBe('currentColor')
    expect(view.container.querySelector('animate')).toBeNull()
    expect(view.container.querySelector('[style]')).toBeNull()
    // The upstream whale APNG is retired: no mask/background asset or <img>.
    expect(view.container.querySelector('img')).toBeNull()
    expect(view.container.querySelector('span > span')).toBeNull()
  })
})
