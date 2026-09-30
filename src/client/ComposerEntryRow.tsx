/** General Settings row for the composer tool-row goal entry visibility. */

import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'

/** Registration-side preference face. */
export interface ComposerEntryRowInjected {
  hooks: {
    /** Persisted composer-entry visibility bound as useComposerEntryVisible. */
    composerEntryVisible: SnapshotStore<boolean>
  }
  /** Change whether the composer tool-row goal entry renders. */
  setComposerEntryVisible: (visible: boolean) => void
}

/** Full Settings-row props. */
export type ComposerEntryRowProps =
  PropsRuntime<'settings.general.item'>
  & PropsLocale<'goalMode'>
  & InjectFace<ComposerEntryRowInjected>

/**
 * Render the composer-entry visibility switch.
 * @param props - composed Settings slot props.
 * @returns the preference row.
 */
export function ComposerEntryRow({ useComposerEntryVisible, setComposerEntryVisible, t }: ComposerEntryRowProps) {
  const visible = useComposerEntryVisible(value => value)
  return (
    <div className="dsh_gm_settingsCard">
      <div className="dsh_gm_settingsRow">
        <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 14, lineHeight: 22, color: 'var(--dsw-alias-label-primary)' }}>
            {t('settings.composerEntry.title')}
          </div>
          <div style={{ fontSize: 12, lineHeight: 18, color: 'var(--dsw-alias-label-tertiary)' }}>
            {t('settings.composerEntry.description')}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          aria-label={t('settings.composerEntry.title')}
          className={'dsh_gm_switch' + (visible ? ' dsh_gm_switchOn' : '')}
          onClick={() => { setComposerEntryVisible(!visible) }}
        >
          <span className="dsh_gm_switchKnob" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
