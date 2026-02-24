# Implementation Plan: Real-Time Voice Call Frontend

**Branch**: `001-voice-call-frontend` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-voice-call-frontend/spec.md`

## Summary

Build a real-time voice-call SPA (React 19 + TypeScript + Vite) that streams
microphone audio (raw PCM 16-bit/16kHz/mono) to a Python FastAPI/Starlette
backend over a WebSocket connection, plays back TTS audio chunks received over
the same connection, and maintains a live transcript plus a post-call dashboard.
All real-time transport is implemented as a module-level singleton
`WebSocketService` and `WebRTCService`; audio queuing and barge-in are handled
by a separate `AudioManager` service. State is managed by a single Zustand 5
store composed from five slices. The UI follows a feature-folder architecture
enforced by the frontend constitution.

---

## Technical Context

**Language/Version**: TypeScript 5.x, `"strict": true`  
**Primary Dependencies**: React 19.2, Vite 7, Zustand 5.0.11 + Immer 10,
Zod 3, Web Audio API, WebRTC (`getUserMedia` + `AudioWorklet`)  
**Storage**: N/A — no client-side persistence; session tokens held in-memory
only (runtime scope); post-call data fetched from backend REST endpoint after
call ends  
**Testing**: Vitest + React Testing Library + axe-core  
**Target Platform**: Modern browser (Chrome 115+, Firefox 115+, Safari 17+);
requires HTTPS or localhost for `getUserMedia` + secure WebSocket upgrade  
**Project Type**: Web SPA  
**Performance Goals**:
- ≤5 s to Listening state from Start Call click (SC-001)
- ≤1 s transcript entry latency (SC-002)
- ≤500 ms AI Speaking indicator activation (SC-003)
- ≤300 ms call-state UI update (SC-004)
- ≤10 s WebSocket reconnection (SC-005)
- ≤3 s post-call dashboard load (SC-006)

**Constraints**:
- Audio processing (PCM capture, playback decoding) MUST run off the React
  render cycle via AudioWorklet / Web Audio API (Constitution Principle V)
- Session token MUST NOT be stored in `localStorage` or component state beyond
  the WebSocket upgrade call frame (Constitution Principle VII)
- All incoming WebSocket JSON frames MUST be validated via Zod `safeParse`
  before any processing (FR-017, SC-008)
- WebSocket reconnection: full-jitter exponential back-off, max 5 attempts,
  ceiling 30 s (Constitution Principle IV)
- Reconnecting display state: `reconnecting` is a `ConnectionStatus` value only
  (not a `CallStatus` value); `CallStateIndicator` derives the Reconnecting
  visual by reading `ConnectionSlice.wsStatus === 'reconnecting'` alongside
  `CallSlice.status` — the `call.status` slice is NOT mutated during reconnection
  unless the connection fails outright (which transitions it to `'error'`)
- Session token rejection: a 4xx HTTP response on the WebSocket upgrade (FR-028)
  MUST NOT trigger the exponential backoff loop; it is treated as a terminal
  error requiring user-initiated retry
- Echo cancellation: single `AudioContext` for both mic capture graph and AI
  playback so the browser's native AEC has a valid reference signal

**Scale/Scope**: Single-user single-AI-agent per call session; SPA (~5 screens)
with no server-side rendering

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design below.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Real-Time UX First | ✅ PASS | Incremental transcript/audio streaming required; no modal blocks call controls; streaming token render via Zustand append-only Immer push |
| II | Strong Type Safety | ✅ PASS | `"strict": true`; all WS messages modelled as Zod-validated discriminated unions; `z.infer<>` drives TS types; no implicit `any` |
| III | Component Architecture | ✅ PASS | Feature-folder under `src/features/`; shared primitives in `src/shared/components/`; business logic in services/hooks/stores only |
| IV | Resilience | ✅ PASS | WS full-jitter exponential back-off (max 5 attempts, ceiling 30 s); WebRTC Permission-Denied shows actionable UI within 2 s; state transitions logged |
| V | Performance | ✅ PASS | PCM capture in `pcm-processor.worklet.ts` (audio thread); canvas waveform via Zustand transient-subscribe (zero React re-renders); append-only transcript DOM |
| VI | Clean UX | ✅ PASS | WCAG 2.1 AA required (FR-024); full keyboard operation (FR-023, SC-007); minimal design; state indicators for every async state |
| VII | Security | ✅ PASS | All transcript/claims/agent-name content through `sanitise.ts` (DOMPurify) before DOM insertion; token in runtime memory only; Zod rejects malformed frames |

**PRE-DESIGN GATE: PASS — all 7 principles satisfied. Advancing to Phase 0.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-voice-call-frontend/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── websocket-messages.md
│   └── rest-auth.md
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── App.tsx                        # root router / layout shell
│   └── routes.tsx                     # React Router v7 route definitions
│
├── features/
│   ├── call/                          # US-1, US-3: voice call + state indicators
│   │   ├── CallScreen.tsx
│   │   ├── CallControls.tsx           # Start / End buttons (keyboard accessible)
│   │   ├── CallStateIndicator.tsx     # Idle/Connecting/Listening/Thinking/Speaking/Ended/Error
│   │   ├── MicStatusIndicator.tsx
│   │   └── hooks/
│   │       └── useCallSession.ts      # orchestrates WS + WebRTC + AudioManager
│   │
│   ├── transcript/                    # US-2: live transcript panel
│   │   ├── TranscriptPanel.tsx
│   │   ├── TranscriptEntry.tsx
│   │   └── hooks/
│   │       └── useTranscriptScroll.ts
│   │
│   ├── dashboard/                     # US-4: post-call review + export
│   │   ├── DashboardScreen.tsx
│   │   ├── TranscriptSection.tsx
│   │   ├── ExportButton.tsx
│   │   └── hooks/
│   │       └── useDashboardData.ts
│   │
│   ├── claims/                        # US-4 sub-feature: claims list
│   │   └── ClaimsSection.tsx
│   │
│   └── reminders/                     # US-4 sub-feature: reminders list
│       └── RemindersSection.tsx
│
├── shared/
│   ├── components/                    # UI primitives shared across features
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── hooks/
│   │   └── useErrorBoundary.ts
│   │
│   ├── services/
│   │   ├── WebSocketService.ts        # singleton; binary+JSON; reconnect backoff
│   │   ├── WebRTCService.ts           # getUserMedia; AudioWorklet PCM capture
│   │   └── AudioManager.ts           # playback queue; barge-in; drain detection
│   │
│   ├── types/
│   │   ├── ws-messages.ts             # Zod schemas + z.infer WS discriminated union
│   │   ├── call-session.ts            # CallSession, TranscriptEntry, Claim, Reminder
│   │   └── call-state.ts             # CallStatus union type
│   │
│   └── utils/
│       ├── sanitise.ts               # DOMPurify wrapper (Principle VII)
│       └── export.ts                  # post-call JSON export builder
│
├── store/
│   ├── store.types.ts                 # AppStore = CallSlice & Transcript & Connection & Audio & Dashboard
│   ├── store.ts                       # create() with devtools + subscribeWithSelector + immer
│   └── slices/
│       ├── call.slice.ts
│       ├── transcript.slice.ts
│       ├── connection.slice.ts
│       ├── audio.slice.ts
│       └── dashboard.slice.ts
│
└── audio/
    └── pcm-processor.worklet.ts      # AudioWorkletProcessor (tsconfig.worklet.json)

tests/
├── unit/
│   ├── services/
│   └── store/
├── integration/
│   └── ws-reconnect.test.ts
└── a11y/
    └── call-screen.a11y.test.ts
```

**Structure Decision**: Single web-application SPA under `src/`. Feature-folder
satisfies Constitution Principle III. Service singletons in
`src/shared/services/` keep business logic outside render functions (Principle III).
AudioWorklet in `src/audio/` with dedicated `tsconfig.worklet.json` satisfies
Principle V (off-main-thread audio). Store under `src/store/` with five typed
slices satisfies Principles II and V.

---

## Complexity Tracking

No constitution violations identified. No justification table required.

---

## Constitution Check (Post-Design Re-evaluation)

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Real-Time UX First | ✅ PASS | `TranscriptPanel` Immer-push append-only; `AudioManager` starts playback on first chunk arrival; `CallStateIndicator` reacts to every slice transition |
| II | Strong Type Safety | ✅ PASS | Explicit `AppStore` union type; `StateCreator` generics carry mutator tuples; Zod `z.infer` is sole WS message type source; no `any` in any service |
| III | Component Architecture | ✅ PASS | No business logic in render functions; `useCallSession` hook orchestrates; stores mutated only via named slice actions |
| IV | Resilience | ✅ PASS | `WebSocketService` full-jitter backoff; `WebRTCService` cleanup guard prevents React 19 Strict Mode double-mount leak; barge-in hard-stops all audio nodes atomically |
| V | Performance | ✅ PASS | `pcm-processor.worklet.ts` on audio thread; canvas via transient Zustand subscribe (zero React re-renders); transcript uses `tokens.push` not replace |
| VI | Clean UX | ✅ PASS | `CallControls` fully keyboard navigable; `CallStateIndicator` WCAG AA contrast; no full-page modals during active call |
| VII | Security | ✅ PASS | `sanitise.ts` (DOMPurify) applied to all external text before DOM insertion; token scoped to `WebSocketService.connect()` frame; Zod `safeParse` rejects unknown schemas silently |

**POST-DESIGN GATE: PASS**
