// src/shared/types/call-state.ts
// T007 – CallStatus and ConnectionStatus union types

/**
 * Primary state machine for the voice call screen.
 * Drives CallStateIndicator (US-3).
 *
 * NOTE: 'reconnecting' is NOT a CallStatus value.
 * It is a ConnectionStatus value surfaced to the UI via
 * ConnectionSlice.wsStatus – see data-model.md §CallStatus.
 */
export type CallStatus =
  | 'idle'        // no call active; initial state
  | 'connecting'  // WebSocket upgrade in progress; token fetch started
  | 'listening'   // connection established; mic active; awaiting user speech
  | 'thinking'    // user speech detected and sent; awaiting AI response
  | 'speaking'    // AI audio chunks arriving and playing
  | 'ended'       // call terminated normally
  | 'error'       // unrecoverable error; surface recovery action to user

/**
 * WebSocket connection health state.
 * 'reconnecting' is the value shown to the UI during automatic reconnection
 * attempts, while call.status remains unchanged (unless reconnection
 * ultimately fails, which transitions call.status → 'error').
 */
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed'        // exhausted all reconnect attempts
