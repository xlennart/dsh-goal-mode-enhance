/** Settings page section for the goal mode: the current goal and guidance. */

import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { GoalProjection } from '@deepseek-ai/dsh-goal/client'
import type { GoalModeKey } from './locales.ts'

/** Injected root-level session list used to resolve the main-view session's goal. */
export interface GoalSettingsSectionInjected {
  hooks: { sessions: HostObservable<SessionListState> }
}

/** Full section props: runtime share + injected session list + locale seat. */
export type GoalSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & InjectFace<GoalSettingsSectionInjected>
  & PropsLocale<'goalMode'>

/** Strip label keys per visible phase. */
const PHASE_LABELS = {
  active: 'phase.active',
  paused: 'phase.paused',
  blocked: 'phase.blocked',
  complete: 'phase.complete',
} as const satisfies Record<string, GoalModeKey>

/** Keep the settings overview compact even when the Goal is a long specification. */
const OBJECTIVE_PREVIEW_LIMIT = 320

/**
 * The session the section reports on: the one currently retained by the
 * main view (the workspace browser derives the same selection this way).
 * @param sessions - the root-level session list snapshot.
 * @returns the main-view session summary, or undefined while none is retained.
 */
function mainViewSession(sessions: SessionListState): SessionSummary | undefined {
  return Object.values(sessions.byId).find(session => (session.retainedBy.mainView ?? 0) > 0)
}

/** Collapse paragraph breaks and repeated spacing for the overview card. */
function objectivePreview(objective: string): { text: string; hasMore: boolean } {
  const normalized = objective.replace(/\s+/gu, ' ').trim()
  if (normalized.length <= OBJECTIVE_PREVIEW_LIMIT) return { text: normalized, hasMore: normalized !== objective.trim() }
  return { text: `${normalized.slice(0, OBJECTIVE_PREVIEW_LIMIT).trimEnd()}…`, hasMore: true }
}

/** Rounds copy: with a cap show the fraction, otherwise the plain count. */
function roundsText(goal: { roundsStarted?: number; maxGoalRounds?: number }, t: PropsLocale<'goalMode'>['t']): string {
  const started = goal.roundsStarted ?? 0
  if (goal.maxGoalRounds === undefined || goal.maxGoalRounds <= 0) return t('rounds.text', { rounds: String(started) })
  return t('rounds.cap', { rounds: String(started), cap: String(goal.maxGoalRounds) })
}

/**
 * Render the goal-mode settings page: the main-view session's goal card plus guidance.
 * @param props - composed Settings slot props.
 * @returns the section body.
 */
export function GoalSettingsSection({ useSessions, t }: GoalSettingsSectionProps) {
  const sessions = useSessions(snapshot => snapshot)
  const summary = mainViewSession(sessions)
  const projection = summary === undefined
    ? undefined
    : summary.projectionValues?.goal as GoalProjection | null | undefined
  const goal = projection === undefined || projection === null ? null : projection.goal
  const roundsStarted = projection === undefined || projection === null ? 0 : projection.roundsStarted
  const preview = goal === null ? null : objectivePreview(goal.objective)
  return (
    <div className="dsh_gm_settings">
      <div className="dsh_gm_settingsTitle">{t('settings.section.current')}</div>
      {goal === null
        ? (
          <div className="dsh_gm_settingsCard dsh_gm_settingsPageCard">
            <div style={{ fontSize: 13, color: 'var(--dsw-alias-label-tertiary)', lineHeight: 20 }}>
              {t('settings.section.empty')}
            </div>
          </div>
        )
        : (
          <div className="dsh_gm_settingsCard dsh_gm_settingsPageCard">
            <div className="dsh_gm_settingsRow">
              <span
                className={`dsh_gm_chipDot ${goal.phase === 'active' ? 'dsh_gm_dotActive' : goal.phase === 'paused' ? 'dsh_gm_dotPaused' : goal.phase === 'blocked' ? 'dsh_gm_dotBlocked' : 'dsh_gm_dotComplete'}`}
                aria-hidden="true"
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' }}>
                {t(PHASE_LABELS[goal.phase])}
              </span>
              <span style={{ fontSize: 12, color: 'var(--dsw-alias-label-caption)', marginLeft: 'auto' }}>
                {roundsText({ ...goal, roundsStarted }, t)}
              </span>
            </div>
            <div className="dsh_gm_settingsObjective">
              {preview?.text}
            </div>
            {preview?.hasMore === true
              ? (
                <details className="dsh_gm_settingsDetails">
                  <summary>{t('settings.section.full')}</summary>
                  <div className="dsh_gm_settingsObjectiveFull">{goal.objective.trim()}</div>
                </details>
              )
              : null}
          </div>
        )}
      <div className="dsh_gm_settingsTitle">{t('settings.section.howto')}</div>
      <div className="dsh_gm_settingsCard dsh_gm_settingsPageCard dsh_gm_settingsHelpCard">
        <div className="dsh_gm_settingsHelp">
          {t('settings.section.howto.body')}
        </div>
      </div>
    </div>
  )
}
