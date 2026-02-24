// src/store/slices/connection.slice.ts
// T016 – ConnectionSlice: wsStatus, latencyMs, reconnectCount, connectionLog + actions
// Source: data-model.md §CallStatus; data-model.md §ConnectionLogEntry

import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'
import type { ConnectionStatus } from '../../shared/types/call-state'
import type { ConnectionLogEntry } from '../../shared/types/call-session'

export interface ConnectionSlice {
  connection: {
    /** WebSocket health state; drives reconnecting display in CallStateIndicator */
    wsStatus: ConnectionStatus
    /** Last measured round-trip latency in milliseconds */
    latencyMs: number
    /** Number of reconnection attempts in the current session */
    reconnectCount: number
    /** Ordered log of connection events for observability */
    connectionLog: ConnectionLogEntry[]
  }
  setWsStatus: (status: ConnectionStatus) => void
  incrementReconnect: () => void
  appendConnectionLog: (entry: ConnectionLogEntry) => void
  resetConnection: () => void
}

const initialConnectionState: ConnectionSlice['connection'] = {
  wsStatus: 'idle',
  latencyMs: 0,
  reconnectCount: 0,
  connectionLog: [],
}

export const createConnectionSlice: StateCreator<
  AppStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  ConnectionSlice
> = (set) => ({
  connection: { ...initialConnectionState, connectionLog: [] },

  setWsStatus: (status) =>
    set(
      (state) => { state.connection.wsStatus = status },
      false,
      'connection/setWsStatus',
    ),

  incrementReconnect: () =>
    set(
      (state) => { state.connection.reconnectCount += 1 },
      false,
      'connection/incrementReconnect',
    ),

  appendConnectionLog: (entry) =>
    set(
      (state) => { state.connection.connectionLog.push(entry) },
      false,
      'connection/appendConnectionLog',
    ),

  resetConnection: () =>
    set(
      (state) => { state.connection = { ...initialConnectionState, connectionLog: [] } },
      false,
      'connection/resetConnection',
    ),
})
