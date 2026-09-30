/**
 * Enhanced goal strip docked above the composer (input dock) with its
 * composer tool-row entry (input.left). Unlike the shipped GoalBar it also
 * hosts goal creation, completion, and live round progress over the goal
 * projection. Viewing state (expanded/collapsed) lives in the shared
 * page-local store so the strip and the tool-row button toggle each other;
 * the strip collapses into a content-sized chip, and with no goal set
 * nothing renders above the composer unless the create form is explicitly
 * open. State arrives as the projected whole snapshot; verbs are the
 * injected face.
 */

import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import type { GoalPhase, GoalProjection, GoalSnapshot } from '@deepseek-ai/dsh-goal/client'
import type { PropsLocale, PropsRuntime, SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { GoalModeKey } from './locales.ts'
import type { GoalModeActionResult, GoalModeActions } from './slots.ts'
import type { GoalModeViewStore } from './store.ts'

/** Strip label keys per visible phase. */
const PHASE_LABELS = {
  active: 'phase.active',
  paused: 'phase.paused',
  blocked: 'phase.blocked',
  complete: 'phase.complete',
} as const satisfies Record<string, GoalModeKey>

/** Phase dot classes (semantic tokens, keyed by the durable phase union). */
const PHASE_DOT: Record<GoalPhase, string> = {
  active: 'dsh_gm_dotActive',
  paused: 'dsh_gm_dotPaused',
  blocked: 'dsh_gm_dotBlocked',
  complete: 'dsh_gm_dotComplete',
}

/** Rounds copy: with a cap show the fraction, otherwise the plain count. */
function roundsCopy(goal: GoalSnapshot, roundsStarted: number, t: PropsLocale<'goalMode'>['t']): string {
  return goal.maxGoalRounds > 0
    ? t('rounds.cap', { rounds: String(roundsStarted), cap: String(goal.maxGoalRounds) })
    : t('rounds.text', { rounds: String(roundsStarted) })
}

/** Feather-style line icons (16px viewBox), matching the shipped icon language. */
function icon(paths: ReadonlyArray<ReactNode>, size = 14): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}

/** The goal glyph: concentric circles. */
function GoalGlyph(size = 14): ReactElement {
  return icon([
    <circle key="a" cx="12" cy="12" r="10" />,
    <circle key="b" cx="12" cy="12" r="6" />,
    <circle key="c" cx="12" cy="12" r="2" />,
  ], size)
}

/** The completion check glyph. */
function CheckGlyph(size = 14): ReactElement {
  return icon([
    <path key="a" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />,
    <polyline key="b" points="22 4 12 14.01 9 11.01" />,
  ], size)
}

/** Create form shown above the composer when no goal is set and expanded. */
export function GoalCreateForm({ onCreate, onCancel, pending, t }: {
  onCreate: (objective: string, maxGoalRounds?: number) => Promise<GoalModeActionResult>
  onCancel: () => void
  pending: boolean
  t: PropsLocale<'goalMode'>['t']
}) {
  const [draft, setDraft] = useState('')
  const [draftRounds, setDraftRounds] = useState('')
  const [error, setError] = useState<string | null>(null)

  const roundsValue = (): number | undefined => {
    if (draftRounds.trim() === '') return undefined
    const n = Number(draftRounds)
    return Number.isSafeInteger(n) && n > 0 ? n : undefined
  }

  const handleCreate = useCallback(async () => {
    const trimmed = draft.trim()
    if (trimmed === '') return
    const result = await onCreate(trimmed, roundsValue())
    if (!result.ok) setError(`${result.error.message} (${result.error.code})`)
  }, [draft, draftRounds, onCreate])

  return (
    <div className="dsh_gm_form" data-goal-bar>
      <textarea
        className="dsh_gm_textarea"
        aria-label={t('objective.aria')}
        placeholder={t('create.placeholder')}
        value={draft}
        onChange={(e) => { setDraft(e.target.value) }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void handleCreate()
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
        rows={3}
      />
      <div className="dsh_gm_formRow">
        <input
          className="dsh_gm_roundsInput"
          type="number"
          min={1}
          placeholder={t('edit.rounds')}
          value={draftRounds}
          onChange={(e) => { setDraftRounds(e.target.value) }}
          aria-label={t('edit.rounds')}
        />
        <button type="button" className="dsh_gm_btnPrimary" onClick={() => { void handleCreate() }} disabled={pending || draft.trim() === ''}>
          {t('create.submit')}
        </button>
        <button type="button" className="dsh_gm_btn" onClick={onCancel} disabled={pending}>
          {t('create.cancel')}
        </button>
      </div>
      {error !== null && <span className="dsh_gm_error" role="alert">{error}</span>}
    </div>
  )
}

/** The full goal strip: status row, edit/create forms, and completion banner. */
export function GoalBar({ goal, roundsStarted, onCreate, onEdit, onPause, onResume, onComplete, onClear, onCollapse, t }: {
  goal: GoalSnapshot
  roundsStarted: number
  onCreate: (objective: string, maxGoalRounds?: number) => Promise<GoalModeActionResult>
  onEdit: (objective: string, maxGoalRounds?: number) => Promise<GoalModeActionResult>
  onPause: () => Promise<GoalModeActionResult>
  onResume: () => Promise<GoalModeActionResult>
  onComplete: () => Promise<GoalModeActionResult>
  onClear: () => Promise<GoalModeActionResult>
  onCollapse: () => void
} & PropsLocale<'goalMode'>) {
  const [mode, setMode] = useState<'edit' | 'create' | null>(null)
  const [draft, setDraft] = useState('')
  const [draftRounds, setDraftRounds] = useState('')
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const pendingRef = useRef(false)

  // A new goal identity (cleared/completed/replaced externally) invalidates the
  // local edit state: without the reset a surviving draft's submit would write
  // over the NEW goal.
  const goalId = goal.id
  useEffect(() => {
    setMode(null)
    setActionError(null)
  }, [goalId])

  // React state disables the controls on the next render; the ref closes the
  // same-render window so rapid clicks cannot submit the same CAS twice.
  const runAction = useCallback(async (action: () => Promise<GoalModeActionResult>): Promise<GoalModeActionResult | undefined> => {
    if (pendingRef.current) return undefined
    pendingRef.current = true
    setPending(true)
    setActionError(null)
    const result = await action()
    pendingRef.current = false
    setPending(false)
    if (!result.ok) setActionError(`${result.error.message} (${result.error.code})`)
    return result
  }, [])

  const roundsValue = (): number | undefined => {
    if (draftRounds.trim() === '') return undefined
    const n = Number(draftRounds)
    return Number.isSafeInteger(n) && n > 0 ? n : undefined
  }

  const handleEdit = useCallback(async () => {
    const trimmed = draft.trim()
    if (trimmed === '') return
    const result = await runAction(() => onEdit(trimmed, roundsValue()))
    if (result?.ok) {
      setMode(null)
      setDraft('')
      setDraftRounds('')
    }
  }, [draft, draftRounds, onEdit, runAction])

  const startEdit = useCallback(() => {
    setDraft(goal.objective)
    setDraftRounds(goal.maxGoalRounds > 0 ? String(goal.maxGoalRounds) : '')
    setMode('edit')
  }, [goal])

  const errorBlock = actionError !== null
    ? <span className="dsh_gm_error" role="alert">{actionError}</span>
    : null

  if (mode === 'edit') {
    return (
      <div className="dsh_gm_form" data-goal-bar>
        <textarea
          className="dsh_gm_textarea"
          aria-label={t('objective.aria')}
          placeholder={t('edit.placeholder')}
          value={draft}
          onChange={(e) => { setDraft(e.target.value) }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void handleEdit()
            if (e.key === 'Escape') setMode(null)
          }}
          autoFocus
          rows={3}
        />
        <div className="dsh_gm_formRow">
          <input
            className="dsh_gm_roundsInput"
            type="number"
            min={1}
            placeholder={t('edit.rounds')}
            value={draftRounds}
            onChange={(e) => { setDraftRounds(e.target.value) }}
            aria-label={t('edit.rounds')}
          />
          <button type="button" className="dsh_gm_btnPrimary" onClick={() => { void handleEdit() }} disabled={pending || draft.trim() === ''}>
            {t('edit.save')}
          </button>
          <button type="button" className="dsh_gm_btn" onClick={() => { setMode(null) }} disabled={pending}>
            {t('edit.cancel')}
          </button>
        </div>
        {errorBlock}
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <GoalCreateForm
        onCreate={async (objective, maxGoalRounds) => {
          const result = await runAction(() => onCreate(objective, maxGoalRounds))
          if (result?.ok) setMode(null)
          return result ?? { ok: false, error: { code: 'busy', message: 'previous operation still running' } }
        }}
        onCancel={() => { setMode(null) }}
        pending={pending}
        t={t}
      />
    )
  }

  if (goal.phase === 'complete') {
    return (
      <div className="dsh_gm_dock" data-goal-bar>
        <div className="dsh_gm_bar">
          {CheckGlyph()}
          <span className="dsh_gm_label">{t('phase.complete')}</span>
          <span className="dsh_gm_objective" title={goal.objective}>{goal.objective}</span>
          <span className="dsh_gm_rounds">{roundsCopy(goal, roundsStarted, t)}</span>
          <button type="button" className="dsh_gm_btnPrimary" onClick={() => { setMode('create') }} disabled={pending}>
            {t('empty.create')}
          </button>
          <button
            type="button"
            className="dsh_gm_iconBtn"
            onClick={() => { void runAction(onClear) }}
            disabled={pending}
            aria-label={t('action.clear')}
            title={t('action.clear')}
          >
            {icon([<polyline key="a" points="3 6 5 6 21 6" />, <path key="b" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />])}
          </button>
          <button
            type="button"
            className="dsh_gm_iconBtn"
            onClick={onCollapse}
            disabled={pending}
            aria-label={t('collapse')}
            title={t('collapse')}
          >
            {icon([<polyline key="a" points="15 18 9 12 15 6" />])}
          </button>
        </div>
        {errorBlock}
      </div>
    )
  }

  const capHit = goal.phase === 'active' && goal.maxGoalRounds > 0 && roundsStarted >= goal.maxGoalRounds
  const progress = goal.maxGoalRounds > 0
    ? Math.min(100, Math.round((roundsStarted / goal.maxGoalRounds) * 100))
    : 0

  return (
    <div className="dsh_gm_dock" data-goal-bar>
      <div className="dsh_gm_bar">
        {GoalGlyph()}
        <span className="dsh_gm_label">{t(PHASE_LABELS[goal.phase])}</span>
        <span className="dsh_gm_objective" title={goal.objective}>{goal.objective}</span>
        {goal.maxGoalRounds > 0 && (
          <span className="dsh_gm_progress" aria-hidden="true">
            <span className="dsh_gm_progressFill" style={{ width: `${progress}%` }} />
          </span>
        )}
        <span className="dsh_gm_rounds">{roundsCopy(goal, roundsStarted, t)}</span>
        {capHit && <span className="dsh_gm_badgeCap">{t('badge.cap')}</span>}
        {goal.phase === 'active'
          ? (
            <button
              type="button"
              className="dsh_gm_iconBtn"
              onClick={() => { void runAction(onPause) }}
              disabled={pending}
              aria-label={t('action.pause')}
              title={t('action.pause')}
            >
              {icon([<line key="a" x1="6" y1="4" x2="6" y2="20" />, <line key="b" x1="18" y1="4" x2="18" y2="20" />])}
            </button>
          )
          : (
            <button
              type="button"
              className="dsh_gm_iconBtn"
              onClick={() => { void runAction(onResume) }}
              disabled={pending}
              aria-label={t('action.resume')}
              title={t('action.resume')}
            >
              {icon([<polygon key="a" points="5 3 19 12 5 21 5 3" />])}
            </button>
          )}
        <button
          type="button"
          className="dsh_gm_iconBtn"
          onClick={startEdit}
          disabled={pending}
          aria-label={t('action.edit')}
          title={t('action.edit')}
        >
          {icon([<path key="a" d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />])}
        </button>
        <button
          type="button"
          className="dsh_gm_iconBtn"
          onClick={() => { void runAction(onComplete) }}
          disabled={pending}
          aria-label={t('action.complete')}
          title={t('action.complete')}
        >
          {icon([<polyline key="a" points="20 6 9 17 4 12" />])}
        </button>
        <button
          type="button"
          className="dsh_gm_iconBtn"
          onClick={() => { void runAction(onClear) }}
          disabled={pending}
          aria-label={t('action.clear')}
          title={t('action.clear')}
        >
          {icon([<polyline key="a" points="3 6 5 6 21 6" />, <path key="b" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />])}
        </button>
        <button
          type="button"
          className="dsh_gm_iconBtn"
          onClick={onCollapse}
          disabled={pending}
          aria-label={t('collapse')}
          title={t('collapse')}
        >
          {icon([<polyline key="a" points="15 18 9 12 15 6" />])}
        </button>
      </div>
      {capHit && <div className="dsh_gm_hint">{t('cap.hint')}</div>}
      {errorBlock}
    </div>
  )
}

/** Dock adapter props: the framework slot share (runtime + locale), the viewing hook, and the toggle verbs. */
export interface GoalDockProps {
  useProjection: PropsRuntime<'conversation.input.dock'>['useProjection']
  useView: SnapshotSelectorHook<{ expanded: boolean; collapsed: boolean }>
  setExpanded: (value: boolean) => void
  toggleExpanded: () => void
  setCollapsed: (value: boolean) => void
  t: PropsLocale<'goalMode'>['t']
}

/** Dock adapter: projection + viewing store decide create form, chip, or full strip. */
export function GoalDock({ useProjection, useView, setExpanded, toggleExpanded, setCollapsed, onCreate, onEdit, onPause, onResume, onComplete, onClear, t }: GoalDockProps & GoalModeActions & PropsLocale<'goalMode'>) {
  const projection = useProjection('goal') as GoalProjection | null | undefined
  const goal = projection === undefined || projection === null ? projection : projection.goal
  const roundsStarted = projection === undefined || projection === null ? 0 : projection.roundsStarted
  const expanded = useView(s => s.expanded)
  const collapsed = useView(s => s.collapsed)

  // Loading: nothing to show yet.
  if (goal === undefined) return null

  // No goal set: only the explicitly-opened create form renders above the
  // composer; otherwise the area stays empty (no idle clutter).
  if (goal === null) {
    if (!expanded) return null
    return (
      <GoalCreateForm
        onCreate={async (objective, maxGoalRounds) => {
          const result = await onCreate(objective, maxGoalRounds)
          if (result.ok) setExpanded(false)
          return result
        }}
        onCancel={() => setExpanded(false)}
        pending={false}
        t={t}
      />
    )
  }

  // Collapsed: a content-sized chip that re-expands on click.
  if (collapsed) {
    return (
      <div className="dsh_gm_dock">
        <button
          type="button"
          className="dsh_gm_chip"
          onClick={() => setCollapsed(false)}
          aria-label={t('expand')}
          title={t('expand')}
        >
          {GoalGlyph()}
          <span className={`dsh_gm_chipDot ${PHASE_DOT[goal.phase]}`} aria-hidden="true" />
          <span className="dsh_gm_chipRounds">{roundsCopy(goal, roundsStarted, t)}</span>
          {icon([<polyline key="a" points="9 18 15 12 9 6" />])}
        </button>
      </div>
    )
  }

  return (
    <GoalBar
      goal={goal}
      roundsStarted={roundsStarted}
      onCreate={onCreate}
      onEdit={onEdit}
      onPause={onPause}
      onResume={onResume}
      onComplete={onComplete}
      onClear={onClear}
      onCollapse={() => setCollapsed(true)}
      t={t}
    />
  )
}

/** Composer tool-row entry (input.left): toggles the strip, shows the phase dot. */
export function GoalComposerButton({ useProjection, useView, setExpanded, toggleExpanded, setCollapsed, useComposerEntryVisible, t }: {
  useProjection: PropsRuntime<'conversation.input.left'>['useProjection']
  useView: SnapshotSelectorHook<{ expanded: boolean; collapsed: boolean }>
  setExpanded: (value: boolean) => void
  toggleExpanded: () => void
  setCollapsed: (value: boolean) => void
  useComposerEntryVisible: SnapshotSelectorHook<boolean>
  t: PropsLocale<'goalMode'>['t']
}) {
  // All hooks run unconditionally (hooks-order rule), then the visibility
  // preference may hide the whole entry; the dock strip and its verbs remain
  // reachable through the goal itself.
  const visible = useComposerEntryVisible(value => value)
  const projection = useProjection('goal') as GoalProjection | null | undefined
  const goal = projection === undefined || projection === null ? null : projection.goal
  const expanded = useView(s => s.expanded)
  const collapsed = useView(s => s.collapsed)
  if (!visible) return null
  // A real goal toggles the strip/chip; the no-goal state toggles the create form.
  const active = goal === null ? expanded : !collapsed
  return (
    <button
      type="button"
      className={'dsh_gm_composerBtn' + (active ? ' dsh_gm_composerBtnActive' : '')}
      onClick={() => {
        if (goal === null) toggleExpanded()
        else setCollapsed(!collapsed)
      }}
      aria-label={t('composer.aria')}
      title={t('composer.aria')}
    >
      {GoalGlyph(15)}
      {goal !== null && <span className={`dsh_gm_composerDot ${PHASE_DOT[goal.phase]}`} aria-hidden="true" />}
    </button>
  )
}
