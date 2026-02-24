# Data Model: Real-Time Voice Call Frontend

**Date**: 2026-02-24  
**Feature Branch**: `001-voice-call-frontend`  
**Source**: Spec §Key Entities, §Requirements, §Assumptions

---

## Domain Entities (Backend-Mirrored)

These types mirror the backend's Pydantic response models. They are used in
the post-call dashboard and for the JSON export (FR-022).

---

### `CallSession`

Represents one complete interaction between the user and the AI agent.

```typescript
// src/shared/types/call-session.ts

export interface CallSession {
  /** UUID assigned by the backend at call start */
  id: string
  /** UTC epoch milliseconds — set when the WebSocket connection is established */
  startedAt: number
  /** UTC epoch milliseconds — set on call end; null while in progress */
  endedAt: number | null
  /** How the session concluded */
  outcome: 'normal_end' | 'error' | 'abandoned'
  /** WebSocket close code and reconnect count; used for observability */
  connectionLog: ConnectionLogEntry[]
}

export interface ConnectionLogEntry {
  event: 'connected' | 'disconnected' | 'reconnecting' | 'failed'
  timestamp: number
  wsCloseCode?: number
  attempt?: number
}
```

**Validation rules**:
- `id` — non-empty UUID string; validated server-side; frontend treats as opaque
- `startedAt` — positive integer; set from backend `call_state` → `listening` event timestamp
- `endedAt` — `null` while active; populated from backend `call_state` → `ended`/`error` event
- `outcome` — required on end; inferred from final `call_state` event

**State transitions**:
```
[no session] → CallSession { outcome: null, endedAt: null }  (on connect)
             → CallSession { outcome: 'normal_end', endedAt: <ts> }  (on user end)
             → CallSession { outcome: 'error', endedAt: <ts> }       (on unrecoverable WS error)
             → CallSession { outcome: 'abandoned', endedAt: <ts> }   (on tab close / navigate away)
```

---

### `TranscriptEntry`

A single conversational turn. Displayed in the live transcript panel (US-2)
and the post-call dashboard (US-4).

```typescript
export interface TranscriptEntry {
  /** Monotonically increasing position within the session */
  index: number
  /** Who produced this turn */
  speaker: 'user' | 'ai'
  /** Full text of the completed turn (distinct from in-progress streaming tokens) */
  text: string
  /** UTC epoch milliseconds when the turn was finalised */
  timestamp: number
}
```

**Streaming model**: During a call, the AI sends incremental `transcript_token`
WebSocket messages. The frontend accumulates them in `TranscriptSlice.currentPartial`.
When the AI turn completes (signalled by the backend's turn-end control message),
`currentPartial` is committed into the `entries` array as a full `TranscriptEntry`,
and `currentPartial` is cleared.

**Validation rules**:
- `speaker` — must be `'user'` or `'ai'`; any other value is rejected by Zod
- `text` — must be sanitised with `sanitise.ts` (DOMPurify) before DOM insertion (Principle VII)
- `timestamp` — positive integer; used for display ordering

---

### `Claim`

A factual statement extracted from the call by the backend AI pipeline.

```typescript
export interface Claim {
  /** Position within the session's claim list */
  index: number
  /** The extracted factual statement */
  text: string
  /** Speaker whose utterance the claim was drawn from */
  speaker: 'user' | 'ai'
  /** Probability score, 0.0–1.0 */
  confidence: number
}
```

**Validation rules**:
- `confidence` — must be clamped to `[0, 1]` before display; `z.number().min(0).max(1)`
- `text` — sanitised before DOM insertion
- Displayed in Claims section of the post-call dashboard (FR-020)

---

### `Reminder`

A follow-up task or note identified during the call.

```typescript
export interface Reminder {
  index: number
  /** Human-readable reminder text */
  text: string
  /** ISO 8601 datetime string, or null if no specific time was identified */
  dueAt: string | null
}
```

**Validation rules**:
- `dueAt` — either `null` or a valid ISO 8601 datetime string; `z.string().datetime().nullable()`
- `text` — sanitised before DOM insertion
- Displayed in Reminders section of the post-call dashboard (FR-021)

---

## Frontend State Entities (No Backend Mirror)

These types exist only on the client to drive UI state machines.

---

### `CallStatus`

The call screen's primary state machine. Drives `CallStateIndicator` (US-3).

```typescript
// src/shared/types/call-state.ts

export type CallStatus =
  | 'idle'          // no call active; initial state
  | 'connecting'    // WebSocket upgrade in progress; token fetch started
  | 'listening'     // connection established; mic active; awaiting user speech
  | 'thinking'      // user speech detected and sent; awaiting AI response
  | 'speaking'      // AI audio chunks arriving and playing
  | 'ended'         // call terminated normally
  | 'error'         // unrecoverable error; surface recovery action to user

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'failed'        // exhausted all reconnect attempts
```

**Transitions** (enforced in `call.slice.ts` actions):
```
idle        → connecting   (user clicks Start Call)
connecting  → listening    (WebSocket onopen + backend sends 'listening' state)
connecting  → error        (WebSocket onclose before open, or token fetch fails)
listening   → thinking     (backend sends 'thinking' call_state message)
thinking    → speaking     (first AI audio chunk arrives; SC-003 ≤500 ms)
speaking    → listening    (audio drain complete + backend sends 'listening')
speaking    → ended        (user clicks End Call during AI speech)
listening   → ended        (user clicks End Call)
any         → error        (unrecoverable WebSocket failure after max retries)
error       → connecting   (user retries)
ended       → idle         (navigate back to start screen)
```

---

### `TranscriptSlice` State Shape

```typescript
export interface TranscriptState {
  /** Finalised turns (committed TranscriptEntry objects) */
  entries: TranscriptEntry[]
  /** In-progress AI token stream; not yet committed as an entry */
  currentPartial: string
  /** Index → display name mapping (future extensibility for multi-agent) */
  speakerLabels: Record<TranscriptEntry['speaker'], string>
}
```

---

### `AudioState` Shape

```typescript
export interface AudioState {
  /** Whether the microphone is muted (WebRTC track enabled=false) */
  isMuted: boolean
  /** 0.0–1.0: current RMS amplitude of the mic input (for waveform visualiser) */
  currentAmplitude: number
  /** true when the VAD detects active speech (drives barge-in) */
  vadActive: boolean
  /** Selected input device ID from MediaDevices.enumerateDevices() */
  inputDeviceId: string | null
}
```

**Note**: `currentAmplitude` is written at up to 50 Hz by `WebRTCService`. It is
consumed via Zustand's `subscribe` transient pattern (no React re-renders) for
the canvas waveform visualiser. It is **not** displayed via a React component.

---

## Relationships

```
CallSession 1 ──── * TranscriptEntry
CallSession 1 ──── * Claim
CallSession 1 ──── * Reminder
```

All child entities carry an implicit `sessionId` reference that is included
in the JSON export file (FR-022).

---

## Export Schema

The post-call JSON export file mirrors the backend's response shape (FR-022).
Full Zod schema is defined in `contracts/rest-auth.md` (REST GET /sessions/{id})
and in `src/shared/utils/export.ts`.

```typescript
export interface PostCallExport {
  session: CallSession
  transcript: TranscriptEntry[]
  claims: Claim[]
  reminders: Reminder[]
  exportedAt: string  // ISO 8601
}
```
