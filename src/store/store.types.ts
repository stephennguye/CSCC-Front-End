// src/store/store.types.ts
// T013 – AppStore type (union of all five slice types)
// Source: research.md §2; plan.md §store/

import type { CallSlice } from './slices/call.slice'
import type { TranscriptSlice } from './slices/transcript.slice'
import type { ConnectionSlice } from './slices/connection.slice'
import type { AudioSlice } from './slices/audio.slice'
import type { DashboardSlice } from './slices/dashboard.slice'

/**
 * The combined shape of the Zustand store.
 * All slice StateCreators use this as their first type parameter so they
 * can read/write across slice boundaries inside actions.
 */
export type AppStore = CallSlice & TranscriptSlice & ConnectionSlice & AudioSlice & DashboardSlice
