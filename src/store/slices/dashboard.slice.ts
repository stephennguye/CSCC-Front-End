// src/store/slices/dashboard.slice.ts
// T018 – DashboardSlice: claims, reminders, sessionData, isLoading, error + actions
// Source: spec.md US4

import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'
import type { Claim, Reminder, PostCallResponse } from '../../shared/types/call-session'

export interface DashboardSlice {
  dashboard: {
    /** Real-time claims pushed during the call */
    claims: Claim[]
    /** Real-time reminders pushed during the call */
    reminders: Reminder[]
    /** Full post-call response fetched after call ends; null while loading */
    sessionData: PostCallResponse | null
    /** True while fetching post-call session data */
    isLoading: boolean
    /** Error message if the session data fetch failed */
    error: string | null
  }
  pushClaim: (claim: Claim) => void
  pushReminder: (reminder: Reminder) => void
  setSessionData: (data: PostCallResponse | null) => void
  setLoading: (loading: boolean) => void
  setDashboardError: (error: string | null) => void
  resetDashboard: () => void
}

const initialDashboardState: DashboardSlice['dashboard'] = {
  claims: [],
  reminders: [],
  sessionData: null,
  isLoading: false,
  error: null,
}

export const createDashboardSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  DashboardSlice
> = (set) => ({
  dashboard: { ...initialDashboardState, claims: [], reminders: [] },

  pushClaim: (claim) =>
    set((state) => { state.dashboard.claims.push(claim) }, false, 'dashboard/pushClaim'),

  pushReminder: (reminder) =>
    set((state) => { state.dashboard.reminders.push(reminder) }, false, 'dashboard/pushReminder'),

  setSessionData: (data) =>
    set((state) => { state.dashboard.sessionData = data }, false, 'dashboard/setSessionData'),

  setLoading: (loading) =>
    set((state) => { state.dashboard.isLoading = loading }, false, 'dashboard/setLoading'),

  setDashboardError: (error) =>
    set((state) => { state.dashboard.error = error }, false, 'dashboard/setDashboardError'),

  resetDashboard: () =>
    set(
      (state) => { state.dashboard = { ...initialDashboardState, claims: [], reminders: [] } },
      false,
      'dashboard/resetDashboard',
    ),
})
