# Contract: WebSocket Message Schema

**Date**: 2026-02-24  
**Feature Branch**: `001-voice-call-frontend`  
**Requirement**: FR-017, SC-008 — 100% of real-time messages validated against this schema before processing.

---

## Overview

The frontend connects to the backend via a single persistent WebSocket at:

```
wss://<host>/ws/call/<session_id>?token=<short-lived-token>
```

The connection carries **two frame types**:

| Frame type | Direction | Content |
|---|---|---|
| Text (JSON) | server → client | Lifecycle events, transcript tokens, claims, reminders, control signals |
| Text (JSON) | client → server | Call lifecycle commands, barge-in signal |
| Binary (ArrayBuffer) | server → client | Raw PCM / WAV TTS audio chunks |
| Binary (ArrayBuffer) | client → server | Raw PCM Int16 16kHz mono microphone frames |

The frontend sets `ws.binaryType = 'arraybuffer'` immediately after construction.
All binary frames from the server are PCM/WAV audio. All JSON frames carry a
mandatory `type` discriminant field.

---

## Inbound Messages (Server → Client, JSON)

All JSON text frames must parse and validate via `InboundMessageSchema` in
`src/shared/types/ws-messages.ts` before any processing (SC-008).

---

### `call_state`

Emitted by the backend whenever the call state machine transitions.

```typescript
{
  type: "call_state";
  state: "listening" | "thinking" | "speaking" | "ended" | "error";
  /** Present only when state === "error" */
  error?: string;
  /**
   * Present only when state === "speaking".
   * Sample rate of the raw PCM Int16 audio stream that follows.
   * 22050 = Coqui TTS (primary adapter)
   * 24000 = edge-tts (fallback adapter)
   */
  sampleRate?: 22050 | 24000;
  /** UTC epoch milliseconds */
  timestamp: number;
}
```

**Frontend action**: Update `call.status` in Zustand `CallSlice`. If `state === "error"`,
surface the `error` string (sanitised) in the `CallStateIndicator`. If `state === "speaking"`,
read `sampleRate` and pass it to `AudioManager` so the correct `AudioContext` sample rate
is used when constructing `AudioBuffer` objects for raw PCM playback.

---

### `transcript_token`

Streaming AI response token. Arrives incrementally during AI generation.

```typescript
{
  type: "transcript_token";
  speaker: "user" | "ai";
  /** A single token or short chunk of text */
  token: string;
  /** UTC epoch milliseconds */
  timestamp: number;
}
```

**Frontend action**: Append `token` to `transcript.currentPartial` in Zustand
`TranscriptSlice`. When the AI turn is complete (signalled by `transcript_commit`
or a `call_state → listening`), commit `currentPartial` as a `TranscriptEntry`.

> **Open Question OQ-3**: Confirm the exact control message that signals end-of-turn
> for the AI transcript (see research.md §R3 OQ-3).

---

### `transcript_commit`

Signals that the current partial transcript is complete and should be committed.

```typescript
{
  type: "transcript_commit";
  speaker: "user" | "ai";
  /** The full, final text of the committed turn (authoritative over streamed tokens) */
  text: string;
  timestamp: number;
}
```

**Frontend action**: Replace `transcript.currentPartial` with `text`; push a
`TranscriptEntry` into `transcript.entries`; clear `currentPartial`.

---

### `audio_stream_end`

Signals that the current AI audio response has finished streaming.
The frontend uses this as the second gate of drain detection.

```typescript
{
  type: "audio_stream_end";
}
```

**Frontend action**: Set `AudioManager.streamComplete = true`. If `pendingCount`
is also 0, transition call state → `listening`.

---

### `claim`

A factual claim extracted during the call, pushed in real time.

```typescript
{
  type: "claim";
  text: string;
  speaker: "user" | "ai";
  /** 0.0–1.0 confidence score */
  confidence: number;
  timestamp: number;
}
```

**Frontend action**: Push to `dashboard.claims` in Zustand `DashboardSlice`.

---

### `reminder`

A reminder identified during the call.

```typescript
{
  type: "reminder";
  text: string;
  /** ISO 8601 datetime string, or absent if no specific time */
  dueAt?: string;
  timestamp: number;
}
```

**Frontend action**: Push to `dashboard.reminders` in Zustand `DashboardSlice`.

---

### `barge_in_ack`

Acknowledgement from the backend that a barge-in signal was received and the
AI generation stream has been halted server-side.

```typescript
{
  type: "barge_in_ack";
}
```

**Frontend action**: No state change required (frontend has already stopped audio
locally); optionally log for observability.

---

### `error`

A structured error from the backend that does not close the connection.

```typescript
{
  type: "error";
  code: string;         // e.g. "AUTH_EXPIRED", "STREAM_FAILURE"
  message: string;
}
```

**Frontend action**: Transition `call.status = 'error'`; surface `message`
(sanitised) to the user with a recovery suggestion.

---

## Outbound Messages (Client → Server, JSON)

---

### `call_start`

Sent immediately after WebSocket connection is established.

```typescript
{
  type: "call_start";
}
```

---

### `call_end`

Sent when the user clicks End Call.

```typescript
{
  type: "call_end";
}
```

---

### `barge_in`

Sent when the VAD detects user speech while AI audio is playing.

```typescript
{
  type: "barge_in";
}
```

---

## Binary Audio Frames

### Server → Client (AI TTS audio)

- **Format**: Raw PCM — **no RIFF/WAV header per chunk** (OQ-1 resolved)
  - Coqui TTS streaming mode yields float32 chunks; the backend converts to Int16 before
    sending. Wrapping each chunk in a WAV RIFF header is not possible in true streaming
    mode (the header requires the total byte length upfront), which is incompatible with
    the backend's no-buffering requirement (Constitution Principle VII).
- **Sample rate**: Signalled per speaking turn via `call_state.sampleRate` (OQ-2 resolved)
  - `22050` Hz — Coqui TTS primary adapter
  - `24000` Hz — edge-tts fallback adapter
  - `AudioManager` MUST read `sampleRate` from the `call_state: speaking` event and
    configure `AudioBuffer` construction accordingly.
- **Channels**: Mono
- **Bit depth**: 16-bit signed (`Int16Array`)
- **Typical chunk size**: ~1024 samples (~46 ms at 22050 Hz, ~43 ms at 24000 Hz) (OQ-4 resolved)
  - Tuned for <1.5 s first-token latency (SC-001). Treat as approximate; actual chunk
    boundaries are determined by Coqui TTS forward-pass granularity and should be measured
    during integration testing.

Received as `ArrayBuffer` in `ws.onmessage` where `event.data instanceof ArrayBuffer`.

### Client → Server (microphone PCM)

- **Format**: Raw PCM, no header
- **Sample rate**: 16kHz
- **Channels**: Mono
- **Bit depth**: 16-bit signed (`Int16Array`)
- **Frame size**: 320 samples (20 ms)

Sent via `ws.send(int16Array.buffer)`.

---

## Zod Schema (TypeScript Implementation Reference)

```typescript
// src/shared/types/ws-messages.ts
import { z } from 'zod'

export const CallStateMessageSchema = z.object({
  type: z.literal('call_state'),
  state: z.enum(['listening','thinking','speaking','ended','error']),
  error: z.string().optional(),
  /** Present only when state === 'speaking'; raw PCM sample rate of the audio stream */
  sampleRate: z.union([z.literal(22050), z.literal(24000)]).optional(),
  timestamp: z.number(),
})

export const TranscriptTokenSchema = z.object({
  type: z.literal('transcript_token'),
  speaker: z.enum(['user','ai']),
  token: z.string(),
  timestamp: z.number(),
})

export const TranscriptCommitSchema = z.object({
  type: z.literal('transcript_commit'),
  speaker: z.enum(['user','ai']),
  text: z.string(),
  timestamp: z.number(),
})

export const AudioStreamEndSchema = z.object({
  type: z.literal('audio_stream_end'),
})

export const ClaimMessageSchema = z.object({
  type: z.literal('claim'),
  text: z.string(),
  speaker: z.enum(['user','ai']),
  confidence: z.number().min(0).max(1),
  timestamp: z.number(),
})

export const ReminderMessageSchema = z.object({
  type: z.literal('reminder'),
  text: z.string(),
  dueAt: z.string().datetime().optional(),
  timestamp: z.number(),
})

export const BargeInAckSchema = z.object({
  type: z.literal('barge_in_ack'),
})

export const ErrorMessageSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
})

export const InboundMessageSchema = z.discriminatedUnion('type', [
  CallStateMessageSchema,
  TranscriptTokenSchema,
  TranscriptCommitSchema,
  AudioStreamEndSchema,
  ClaimMessageSchema,
  ReminderMessageSchema,
  BargeInAckSchema,
  ErrorMessageSchema,
])

export type InboundMessage      = z.infer<typeof InboundMessageSchema>
export type CallStateMessage    = z.infer<typeof CallStateMessageSchema>
export type TranscriptToken     = z.infer<typeof TranscriptTokenSchema>
export type TranscriptCommit    = z.infer<typeof TranscriptCommitSchema>
export type ClaimMessage        = z.infer<typeof ClaimMessageSchema>
export type ReminderMessage     = z.infer<typeof ReminderMessageSchema>
```

---

## Message Processing Rule (SC-008)

```typescript
// WebSocketService.ts — onmessage handler (simplified)
private handleTextFrame(raw: string): void {
  const result = InboundMessageSchema.safeParse(JSON.parse(raw))
  if (!result.success) {
    console.warn('[WS] Unrecognised message — discarded', result.error.flatten())
    return  // NEVER process an unvalidated frame
  }
  this.dispatch(result.data)
}
```

Zero ad-hoc message parsing is permitted in any other module. All processing
flows through `WebSocketService.dispatch()` after `safeParse` validation.

---

## Open Questions

> All open questions resolved by cross-referencing `backend-plan.md` and `backend-spec.md`.

| ID | Question | Resolution | Source |
|----|----------|-----------|--------|
| OQ-1 | WAV (RIFF header per chunk) or raw PCM? | **Raw PCM Int16, no header.** Coqui TTS streaming yields float32 chunks; backend converts to Int16. Per-chunk RIFF headers require total byte length upfront, incompatible with the backend's streaming-no-buffer mandate (Constitution Principle VII). | backend-spec.md Principle VII; backend-plan.md TTS adapters |
| OQ-2 | Sample rate for Coqui TTS and edge-tts? | **22050 Hz** (Coqui TTS primary); **24000 Hz** (edge-tts fallback). Rate communicated per speaking turn via the new `call_state.sampleRate` field added to this contract. | backend-plan.md TTS stack; standard library defaults |
| OQ-3 | Exact `type` value of AI turn-end / transcript-commit message? | **`transcript_commit`** — already defined in this contract. Confirmed by the backend's `interface/dtos/ws_messages.py` mirroring the agreed contract shape. | contracts/websocket-messages.md; backend-plan.md dtos/ |
| OQ-4 | Typical chunk size / duration per binary audio frame? | **~1024 samples (~46 ms at 22050 Hz, ~43 ms at 24000 Hz).** Sized for <1.5 s first-token latency (SC-001). Exact boundaries are Coqui TTS forward-pass-dependent; validate during integration testing. | backend-spec.md SC-001; Coqui TTS streaming defaults |
