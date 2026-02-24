// src/store/slices/transcript.slice.ts
// T015 – TranscriptSlice: entries, currentPartial, speakerLabels + named actions
// Source: data-model.md §TranscriptSlice State Shape

import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'
import type { TranscriptEntry } from '../../shared/types/call-session'

export interface TranscriptSlice {
  transcript: {
    /** Finalised turns (committed TranscriptEntry objects) */
    entries: TranscriptEntry[]
    /** In-progress AI token stream; not yet committed as an entry */
    currentPartial: string
    /** Index → display name mapping */
    speakerLabels: Record<'user' | 'ai', string>
  }
  /**
   * Append a streaming token to currentPartial.
   * Called on each `transcript_token` WebSocket message.
   */
  appendToken: (token: string) => void
  /**
   * Commit currentPartial (or the provided authoritative text) as a
   * TranscriptEntry and clear currentPartial.
   * Called on `transcript_commit` WebSocket message.
   */
  commitPartial: (entry: Omit<TranscriptEntry, 'index'>) => void
  /** Reset all transcript state (called on resetCall / new session). */
  clearTranscript: () => void
}

const initialTranscriptState: TranscriptSlice['transcript'] = {
  entries: [],
  currentPartial: '',
  speakerLabels: { user: 'You', ai: 'AI' },
}

export const createTranscriptSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  TranscriptSlice
> = (set) => ({
  transcript: { ...initialTranscriptState, entries: [], speakerLabels: { user: 'You', ai: 'AI' } },

  appendToken: (token) =>
    set(
      (state) => { state.transcript.currentPartial += token },
      false,
      'transcript/appendToken',
    ),

  commitPartial: (entry) =>
    set(
      (state) => {
        const index = state.transcript.entries.length
        state.transcript.entries.push({ ...entry, index })
        state.transcript.currentPartial = ''
      },
      false,
      'transcript/commitPartial',
    ),

  clearTranscript: () =>
    set(
      (state) => {
        state.transcript.entries = []
        state.transcript.currentPartial = ''
      },
      false,
      'transcript/clearTranscript',
    ),
})
