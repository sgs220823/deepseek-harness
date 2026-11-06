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
import { pathToFileURL } from 'node:url'

/** Rows the desktop profile disables on first creation. */
export const TIANJIAN_DISABLED_PROFILE_ROWS = [
  'llm-deepseek',
  'llm-deepseek-account',
  'ui-settings-account',
] as const

/** Shared workbench plugin id (ticket #115; same id the TianJian gateway inserts). */
export const TIANJIAN_WEB_PLUGIN_ID = 'tianjian-web'

/** Installed location of the shared plugin package inside the application resources. */
export const TIANJIAN_WEB_PLUGIN_RESOURCE_DIR = join('tianjian-plugins', TIANJIAN_WEB_PLUGIN_ID)

/** File name of a profile's own patch layer (Host constant `PROFILE_PATCH_FILENAME`). */
export const PROFILE_PATCH_FILE = 'cordis.patch.yml'

/**
 * Resolve the shared plugin's Loader entry (its node half; the browser half comes
 * from the package's `dsh.client` metadata).
 *
 * The packaged application carries the platform repository's `tianjian-web`
 * package (ticket #115) so web and desktop load the same account-menu plugin.
 * Unpackaged development resolves `DSH_TIANJIAN_WEB_PLUGIN_DIR` (the platform
 * checkout's `web` directory); unset means the workspace runs without the plugin.
 * @param packaged - whether the application runs from a packaged build.
 * @param resourcesPath - packaged resources directory (`process.resourcesPath`).
 * @param devPluginDir - development override (platform checkout's `web` directory).
 * @returns absolute node-half path, or undefined when no plugin is available.
 */
export function resolveTianjianWebPluginEntry(
  packaged: boolean,
  resourcesPath: string,
  devPluginDir: string | undefined,
): string | undefined {
  const root = packaged ? join(resourcesPath, TIANJIAN_WEB_PLUGIN_RESOURCE_DIR) : devPluginDir?.trim()
  if (root === undefined || root === '') return undefined
  return join(root, 'src', 'host.ts')
}

/**
 * Build the seeding patch text.
 * @param pluginEntry - shared `tianjian-web` node-half path (inserted when present).
 * @returns YAML patch list disabling the official LLM rows and account surface,
 *   plus the shared account-menu plugin insert.
 */
export function tianjianProfilePatchYaml(pluginEntry?: string): string {
  return [
    '# TianJian desktop profile: the platform gateway is the only LLM provider and',
    '# the official account surface is not part of this product (spec #108).',
    '# Seeded once; later edits in this file are owner-controlled.',
    ...TIANJIAN_DISABLED_PROFILE_ROWS.flatMap(row => [`- id: ${row}`, '  disabled: true']),
    // Ticket #115: the same `tianjian-web` plugin the web instances load provides
    // the workbench account menu; its browser half reads the shell bridge.
    ...pluginEntry === undefined ? [] : [
      '# 天鉴桌面：工作台账号菜单（与 web 共用 tianjian-web 插件）',
      '- insert:',
      `    - id: ${TIANJIAN_WEB_PLUGIN_ID}`,
      `      name: '${pathToFileURL(pluginEntry).href}'`,
    ],
    '',
  ].join('\n')
}

/**
 * Seed the desktop profile patch when it does not exist yet.
 * @param profileDir - Desktop profile directory (`DSH_HOME/profiles/desktop`).
 * @param pluginEntry - shared `tianjian-web` node-half path (ticket #115).
 * @returns true when this call created the patch; false when a file already existed.
 */
export function seedTianjianProfilePatch(profileDir: string, pluginEntry?: string): boolean {
  const path = join(profileDir, PROFILE_PATCH_FILE)
  try {
    writeFileSync(path, tianjianProfilePatchYaml(pluginEntry), { flag: 'wx', mode: 0o600 })
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      mkdirSync(profileDir, { recursive: true })
      writeFileSync(path, tianjianProfilePatchYaml(pluginEntry), { flag: 'wx', mode: 0o600 })
      return true
    }
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
    throw error
  }
}
