/**
 * Desktop-profile seeding (spec #108): turn off the official DeepSeek LLM rows and
 * the official account settings surface on the very first profile creation.
 *
 * The profile patch is `$DSH_HOME/profiles/desktop/cordis.patch.yml` (same file the
 * Host's `initProfile` creates). Seeding only happens when the file does not exist
 * yet: `writeFileSync` uses the exclusive flag, so a user's later edits (including
 * re-enabling a row) are never overwritten.
 * @module @deepseek-ai/dsh-desktop/tianjian-profile
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Rows the desktop profile disables on first creation. */
export const TIANJIAN_DISABLED_PROFILE_ROWS = [
  'llm-deepseek',
  'llm-deepseek-account',
  'ui-settings-account',
] as const

/** File name of a profile's own patch layer (Host constant `PROFILE_PATCH_FILENAME`). */
export const PROFILE_PATCH_FILE = 'cordis.patch.yml'

/**
 * Build the seeding patch text.
 * @returns YAML patch list disabling the official LLM rows and account surface.
 */
export function tianjianProfilePatchYaml(): string {
  return [
    '# TianJian desktop profile: the platform gateway is the only LLM provider and',
    '# the official account surface is not part of this product (spec #108).',
    '# Seeded once; later edits in this file are owner-controlled.',
    ...TIANJIAN_DISABLED_PROFILE_ROWS.flatMap(row => [`- id: ${row}`, '  disabled: true']),
    '',
  ].join('\n')
}

/**
 * Seed the desktop profile patch when it does not exist yet.
 * @param profileDir - Desktop profile directory (`DSH_HOME/profiles/desktop`).
 * @returns true when this call created the patch; false when a file already existed.
 */
export function seedTianjianProfilePatch(profileDir: string): boolean {
  const path = join(profileDir, PROFILE_PATCH_FILE)
  try {
    writeFileSync(path, tianjianProfilePatchYaml(), { flag: 'wx', mode: 0o600 })
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      mkdirSync(profileDir, { recursive: true })
      writeFileSync(path, tianjianProfilePatchYaml(), { flag: 'wx', mode: 0o600 })
      return true
    }
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
    throw error
  }
}
