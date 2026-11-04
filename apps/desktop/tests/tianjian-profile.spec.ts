/**
 * TianJian profile seeding (#112, spec #108): the desktop profile's own patch
 * layer disables the official LLM/account rows exactly once.
 *
 * Behavior under test: create-once semantics (exclusive create), the seeded row
 * list, and that an existing patch file is never touched.
 * @module @deepseek-ai/dsh-desktop/tests/tianjian-profile
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROFILE_PATCH_FILE, seedTianjianProfilePatch, tianjianProfilePatchYaml } from '../src/tianjian-profile.ts'

describe('tianjianProfilePatchYaml', () => {
  it('lists the official LLM/account rows as disabled', () => {
    expect(tianjianProfilePatchYaml()).toBe([
      '# TianJian desktop profile: the platform gateway is the only LLM provider and',
      '# the official account surface is not part of this product (spec #108).',
      '# Seeded once; later edits in this file are owner-controlled.',
      '- id: llm-deepseek',
      '  disabled: true',
      '- id: llm-deepseek-account',
      '  disabled: true',
      '- id: ui-settings-account',
      '  disabled: true',
      '',
    ].join('\n'))
  })
})

describe('seedTianjianProfilePatch', () => {
  it('creates the profile patch once and never touches an existing file', () => {
    const profileDir = mkdtempSync(join(tmpdir(), 'tianjian-profile-'))
    try {
      expect(seedTianjianProfilePatch(profileDir)).toBe(true)
      expect(readFileSync(join(profileDir, PROFILE_PATCH_FILE), 'utf8')).toBe(tianjianProfilePatchYaml())
      writeFileSync(join(profileDir, PROFILE_PATCH_FILE), '- id: custom-row\n', { flag: 'w' })
      expect(seedTianjianProfilePatch(profileDir)).toBe(false)
      expect(readFileSync(join(profileDir, PROFILE_PATCH_FILE), 'utf8')).toBe('- id: custom-row\n')
    } finally {
      rmSync(profileDir, { recursive: true, force: true })
    }
  })

  it('creates the profile directory when it does not exist yet', () => {
    const parent = mkdtempSync(join(tmpdir(), 'tianjian-profile-parent-'))
    const profileDir = join(parent, 'profiles', 'desktop')
    try {
      expect(seedTianjianProfilePatch(profileDir)).toBe(true)
      expect(readFileSync(join(profileDir, PROFILE_PATCH_FILE), 'utf8')).toBe(tianjianProfilePatchYaml())
    } finally {
      rmSync(parent, { recursive: true, force: true })
    }
  })
})
