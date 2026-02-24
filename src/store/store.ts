// src/store/store.ts
// T019 – Combined Zustand store with devtools + subscribeWithSelector + immer
// Source: research.md §Code Skeleton store.ts

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
// Import ensures Redux DevTools types are available in the global namespace
import type {} from '@redux-devtools/extension'

import { createCallSlice } from './slices/call.slice'
import { createTranscriptSlice } from './slices/transcript.slice'
import { createConnectionSlice } from './slices/connection.slice'
import { createAudioSlice } from './slices/audio.slice'
import { createDashboardSlice } from './slices/dashboard.slice'
import type { AppStore } from './store.types'

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      immer((...args) => ({
        ...createCallSlice(...args),
        ...createTranscriptSlice(...args),
        ...createConnectionSlice(...args),
        ...createAudioSlice(...args),
        ...createDashboardSlice(...args),
      })),
    ),
    { name: 'AppStore', enabled: import.meta.env.DEV },
  ),
)
