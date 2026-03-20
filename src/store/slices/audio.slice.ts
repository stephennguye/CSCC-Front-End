// src/store/slices/audio.slice.ts
// T017 – AudioSlice: vadActive + actions
// Note: currentAmplitude moved to WebRTCService class property to avoid 20Hz Zustand re-renders

import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'

export interface AudioSlice {
  audio: {
    /** true when VAD detects active user speech (drives barge-in) */
    vadActive: boolean
  }
  setVadActive: (active: boolean) => void
}

export const createAudioSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  AudioSlice
> = (set) => ({
  audio: {
    vadActive: false,
  },

  setVadActive: (active) =>
    set((state) => { state.audio.vadActive = active }, false, 'audio/setVadActive'),
})
