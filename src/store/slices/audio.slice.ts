// src/store/slices/audio.slice.ts
// T017 – AudioSlice: isMuted, vadActive, currentAmplitude, inputDeviceId + actions
// Source: research.md §Pattern C transient subscribe; data-model.md §AudioState

import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'

export interface AudioSlice {
  audio: {
    /** Whether the microphone track is muted */
    isMuted: boolean
    /** true when VAD detects active user speech (drives barge-in) */
    vadActive: boolean
    /**
     * Current RMS amplitude of the mic input, 0.0–1.0.
     * Written at ~50 Hz by WebRTCService; consumed via transient-subscribe
     * pattern (Pattern C) to avoid React re-renders.
     */
    currentAmplitude: number
    /** Selected media input device ID from MediaDevices.enumerateDevices() */
    inputDeviceId: string | null
  }
  setMuted: (muted: boolean) => void
  setVadActive: (active: boolean) => void
  setAmplitude: (amplitude: number) => void
  setInputDevice: (deviceId: string | null) => void
}

export const createAudioSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  AudioSlice
> = (set) => ({
  audio: {
    isMuted: false,
    vadActive: false,
    currentAmplitude: 0,
    inputDeviceId: null,
  },

  setMuted: (muted) =>
    set((state) => { state.audio.isMuted = muted }, false, 'audio/setMuted'),

  setVadActive: (active) =>
    set((state) => { state.audio.vadActive = active }, false, 'audio/setVadActive'),

  setAmplitude: (amplitude) =>
    set((state) => { state.audio.currentAmplitude = amplitude }, false, 'audio/setAmplitude'),

  setInputDevice: (deviceId) =>
    set((state) => { state.audio.inputDeviceId = deviceId }, false, 'audio/setInputDevice'),
})
