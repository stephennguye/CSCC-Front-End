// src/store/slices/call.slice.ts
// T014 – CallSlice: status, callId, startedAt, error + named actions
// Source: research.md §Code Skeleton; data-model.md §CallStatus transitions

import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'
import type { CallStatus } from '../../shared/types/call-state'

export interface CallSlice {
  call: {
    status: CallStatus
    callId: string | null
    startedAt: number | null
    error: string | null
  }
  setCallStatus: (status: CallStatus) => void
  setCallId: (callId: string | null) => void
  setError: (error: string | null) => void
  resetCall: () => void
}

const initialCallState: CallSlice['call'] = {
  status: 'idle',
  callId: null,
  startedAt: null,
  error: null,
}

export const createCallSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  CallSlice
> = (set) => ({
  call: { ...initialCallState },

  setCallStatus: (status) =>
    set(
      (state) => {
        state.call.status = status
        // Stamp startedAt when transitioning to listening (connection established)
        if (status === 'listening' && state.call.startedAt === null) {
          state.call.startedAt = Date.now()
        }
      },
      false,
      'call/setCallStatus',
    ),

  setCallId: (callId) =>
    set((state) => { state.call.callId = callId }, false, 'call/setCallId'),

  setError: (error) =>
    set((state) => { state.call.error = error }, false, 'call/setError'),

  resetCall: () =>
    set((state) => { state.call = { ...initialCallState } }, false, 'call/resetCall'),
})
