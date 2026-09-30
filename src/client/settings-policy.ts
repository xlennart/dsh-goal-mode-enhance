/**
 * Goal-mode preferences policy. It owns the live composer-entry visibility
 * preference and mirrors the durable `ui-goal-mode` configuration form; the
 * Settings row and the composer entry share this one instance.
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  COMPOSER_ENTRY_FIELD,
  DEFAULT_COMPOSER_ENTRY_VISIBLE,
  type GoalModeSettings,
} from '../settings-contract.ts'

/**
 * Composer-entry visibility policy used by both the Settings row and the
 * composer tool-row entry. Changes publish to the live store before the
 * durable write starts, so the entry hides immediately.
 */
export class GoalModeSettingsPolicy {
  /** Reactive visibility source for the Settings row and the composer entry. */
  readonly composerEntryVisible: SnapshotStore<boolean> = createSnapshotStore(DEFAULT_COMPOSER_ENTRY_VISIBLE)
  private readonly host: ConfigForm<GoalModeSettings> | undefined

  /**
   * @param host - durable configuration form owned by the providing plugin;
   * absent compositions stay process-local. The adoption subscription shares
   * the form's plugin lifetime — a disposed form never publishes again, so
   * the policy needs no release hook.
   */
  constructor(host?: ConfigForm<GoalModeSettings>) {
    this.host = host
    if (host !== undefined) {
      const adopt = (): void => {
        const section = host.getSnapshot().value
        if (section === undefined || this.composerEntryVisible.getSnapshot() === section.composerEntryVisible) return
        this.composerEntryVisible.set(section.composerEntryVisible)
      }
      host.subscribe(adopt)
      adopt()
    }
  }

  /**
   * Change whether the composer tool-row entry renders; the live value
   * publishes before the durable write starts.
   * @param visible - the new visibility.
   */
  setComposerEntryVisible(visible: boolean): void {
    if (this.composerEntryVisible.getSnapshot() === visible) return
    this.composerEntryVisible.set(visible)
    void this.host?.set(COMPOSER_ENTRY_FIELD, visible)
  }
}
