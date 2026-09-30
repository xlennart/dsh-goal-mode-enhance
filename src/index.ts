/** Host registration for browser goal-mode preferences. */

import type { Context, Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
// Type-only: the ctx.settings Context merge; the settings service ships with
// the harness profile, so this package needs no runtime dependency on it.
import type {} from '@deepseek-ai/dsh-settings'
import {
  COMPOSER_ENTRY_FIELD,
  DEFAULT_COMPOSER_ENTRY_VISIBLE,
} from './settings-contract.ts'

export {
  COMPOSER_ENTRY_FIELD,
  DEFAULT_COMPOSER_ENTRY_VISIBLE,
  GOAL_MODE_SETTINGS_NAMESPACE,
  type GoalModeSettings,
} from './settings-contract.ts'

/** Runtime goal-mode preferences; the Loader resolves them for the `ui-goal-mode` profile entry. */
export interface Config {
  /** Whether the composer tool-row goal entry renders by default. */
  readonly composerEntryVisible: Volatile<boolean>
}

/** Live goal-mode preference schema; the profile exposes it as the `ui-goal-mode` settings form. */
export const Config = z.object({
  [COMPOSER_ENTRY_FIELD]: z.boolean().default(DEFAULT_COMPOSER_ENTRY_VISIBLE).volatile(),
})

/**
 * Keep the `ui-goal-mode` form out of the auto-generated settings pages: the
 * client half owns the General-settings row for this preference.
 * @param ctx - Host context whose optional settings service owns the page policy.
 */
export function apply(ctx: Context): void {
  ctx.inject(['settings'], (child) => { child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)) })
}
