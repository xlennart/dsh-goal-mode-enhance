/**
 * Cross-entry goal-mode viewing state: whether the dock strip is expanded or
 * collapsed into its chip. Shared by the input.dock strip and the
 * input.left composer button so either can toggle the other. This is a
 * page-local browser store (plain subscribe/getSnapshot pair), not a durable
 * preference.
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'

/** Viewing state of the goal-mode surface. */
export interface GoalModeViewState {
  /** Whether the create/edit form or full strip is open. */
  expanded: boolean
  /** Whether the strip is collapsed into its chip (goal present only). */
  collapsed: boolean
}

/** Live viewing store; the plugin body owns the single instance. */
export type GoalModeViewStore = SnapshotStore<GoalModeViewState>

/**
 * The goal-mode viewing store handle: the shared source plus the baked
 * mutation callbacks the dock and composer entry both use. Opening the
 * expanded surface un-collapses; toggling expanded also un-collapses.
 */
export interface GoalModeViewHandle {
  readonly store: GoalModeViewStore
  setExpanded: (value: boolean) => void
  toggleExpanded: () => void
  setCollapsed: (value: boolean) => void
}

/**
 * Create the goal-mode viewing store and its action set.
 * @returns the shared handle for the dock and composer entry.
 */
export function createGoalModeViewStore(): GoalModeViewHandle {
  const store = createSnapshotStore<GoalModeViewState>({ expanded: false, collapsed: false })
  return {
    store,
    setExpanded: (value) => { store.update(draft => { draft.expanded = value; if (value) draft.collapsed = false }) },
    toggleExpanded: () => { store.update(draft => { draft.expanded = !draft.expanded; draft.collapsed = false }) },
    setCollapsed: (value) => { store.update(draft => { draft.collapsed = value }) },
  }
}
