// src/store/slices/audio.slice.ts
// T017 – AudioSlice: vadActive, currentAmplitude + actions
// Source: research.md §Pattern C transient subscribe; data-model.md §AudioState

import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'

export interface AudioSlice {
  audio: {
    /** true when VAD detects active user speech (drives barge-in) */
    vadActive: boolean
    /**
     * Current RMS amplitude of the mic input, 0.0–1.0.
     * Written at ~50 Hz by WebRTCService; consumed via transient-subscribe
     * pattern (Pattern C) to avoid React re-renders.
     */
    currentAmplitude: number
  }
  setVadActive: (active: boolean) => void
  setAmplitude: (amplitude: number) => void
}

export const createAudioSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  AudioSlice
> = (set) => ({
  audio: {
    vadActive: false,
    currentAmplitude: 0,
  },

  setVadActive: (active) =>
    set((state) => { state.audio.vadActive = active }, false, 'audio/setVadActive'),

  setAmplitude: (amplitude) =>
    set((state) => { state.audio.currentAmplitude = amplitude }, false, 'audio/setAmplitude'),
})
