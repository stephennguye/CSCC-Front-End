// src/store/slices/pipeline.slice.ts
// Pipeline visualization slice: stores TOD pipeline state for real-time display

import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'

export interface PipelineOutput {
  sttText: string | null
  nlu: {
    intent: string
    confidence: number
    slots: Record<string, string>
  }
  state: {
    slots: Record<string, string | null>
    confirmed: boolean
    turnCount: number
  }
  action: string
  targetSlot: string | null
  nlgResponse: string
  timestamp: number
}

export interface PipelineSlice {
  pipeline: {
    outputs: PipelineOutput[]
    latest: PipelineOutput | null
  }
  pushPipelineOutput: (output: PipelineOutput) => void
  resetPipeline: () => void
}

const initialPipelineState: PipelineSlice['pipeline'] = {
  outputs: [],
  latest: null,
}

export const createPipelineSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  PipelineSlice
> = (set) => ({
  pipeline: { ...initialPipelineState },

  pushPipelineOutput: (output) =>
    set(
      (state) => {
        state.pipeline.outputs.push(output)
        state.pipeline.latest = output
      },
      false,
      'pipeline/pushPipelineOutput',
    ),

  resetPipeline: () =>
    set(
      (state) => {
        state.pipeline.outputs = []
        state.pipeline.latest = null
      },
      false,
      'pipeline/resetPipeline',
    ),
})
