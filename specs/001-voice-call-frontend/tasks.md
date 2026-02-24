# Tasks: Real-Time Voice Call Frontend

**Input**: Design documents from `/specs/001-voice-call-frontend/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not requested — test tasks are omitted from this list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Install dependencies, configure TypeScript, and bootstrap the project structure before any implementation begins.

- [X] T001 Install runtime dependencies: `zustand@^5.0.11 immer@^10 zod@^3 dompurify@^3` (quickstart.md §1)
- [X] T002 [P] Install dev dependencies: `@redux-devtools/extension @types/dompurify vitest @vitest/ui @testing-library/react @testing-library/user-event @testing-library/jest-dom axe-core @axe-core/react` (quickstart.md §1)
- [X] T003 [P] Verify/update `tsconfig.app.json` with `"strict": true`, `"target": "ES2022"`, `"lib": ["ES2022","DOM","DOM.Iterable"]`, `"moduleResolution": "bundler"` (quickstart.md §2)
- [X] T004 [P] Create `tsconfig.worklet.json` at repo root — extends `tsconfig.app.json`, overrides `lib: ["ESNext","WebWorker"]`, `noEmit: false`, `outDir: "dist/worklets"`, `include: ["src/audio/**/*.worklet.ts"]` (quickstart.md §2)
- [X] T005 [P] Create `.env.local` at repo root with `VITE_WS_BASE_URL=ws://localhost:8000` and `VITE_API_BASE_URL=http://localhost:8000` (quickstart.md §3)
- [X] T006 Create `src/app/` directory and scaffold empty `src/app/App.tsx` and `src/app/routes.tsx` files so imports resolve during Phase 2 slice development

**Checkpoint**: Dependencies installed, TypeScript configured, environment ready — Phase 2 can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, Zod schemas, all five Zustand slices, the combined store, shared utilities, and the AudioWorklet processor. **No user story work can begin until this phase is complete.**

**⚠️ CRITICAL**: Every service and component depends on these foundations. Complete Phase 2 before touching any feature file.

### Types & Schemas

- [X] T007 [P] Create `CallStatus` and `ConnectionStatus` union types in `src/shared/types/call-state.ts` — `CallStatus`: `idle | connecting | listening | thinking | speaking | ended | error` (note: `reconnecting` is NOT a `CallStatus` value; it is a `ConnectionStatus` value surfaced to the UI via `ConnectionSlice.wsStatus`); `ConnectionStatus`: `idle | connecting | connected | reconnecting | disconnected | failed` (data-model.md §CallStatus)
- [X] T008 [P] Create `CallSession`, `ConnectionLogEntry`, `TranscriptEntry`, `Claim`, `Reminder` interfaces and corresponding Zod schemas in `src/shared/types/call-session.ts`; include `PostCallResponseSchema` matching `GET /api/sessions/{sessionId}` response (data-model.md §Domain Entities; contracts/rest-auth.md §TypeScript Contract)
- [X] T009 [P] Create all inbound WebSocket message Zod schemas and `InboundMessageSchema` discriminated union in `src/shared/types/ws-messages.ts`: `CallStateMessageSchema`, `TranscriptTokenSchema`, `TranscriptCommitSchema`, `AudioStreamEndSchema`, `ClaimMessageSchema`, `ReminderMessageSchema`, `BargeInAckSchema`, `ErrorMessageSchema`; export `z.infer<>` types for each (contracts/websocket-messages.md §Zod Schema)
- [X] T010 [P] Create `CreateSessionResponseSchema` and `CreateSessionResponse` type in `src/shared/types/session.ts` (contracts/rest-auth.md §TypeScript Client Contract)

### Shared Utilities

- [X] T011 [P] Implement `sanitise.ts` as a DOMPurify wrapper function in `src/shared/utils/sanitise.ts` — export `sanitise(raw: string): string` using `DOMPurify.sanitize()`; apply to all untrusted text before DOM insertion (plan.md §Principle VII)
- [X] T012 [P] Implement `export.ts` JSON export builder in `src/shared/utils/export.ts` — export `buildExportPayload(session, transcript, claims, reminders)` returning a `PostCallResponse`-shaped object ready for `JSON.stringify` and Blob download (spec.md FR-022)

### Zustand Store

- [X] T013 [P] Define `AppStore` type (union of all five slice types) in `src/store/store.types.ts` — import `CallSlice`, `TranscriptSlice`, `ConnectionSlice`, `AudioSlice`, `DashboardSlice` and export `AppStore` as their intersection (research.md §2; plan.md §store/)
- [X] T014 [P] Create `call.slice.ts` in `src/store/slices/call.slice.ts` — `CallSlice` with `status: CallStatus`, `callId: string | null`, `startedAt: number | null`, `error: string | null`; actions: `setCallStatus`, `setCallId`, `setError`, `resetCall`; use `StateCreator<AppStore, [['zustand/immer',never],['zustand/devtools',never]]>` (research.md §Code Skeleton; data-model.md §CallStatus transitions)
- [X] T015 [P] Create `transcript.slice.ts` in `src/store/slices/transcript.slice.ts` — `TranscriptSlice` with `entries: TranscriptEntry[]`, `currentPartial: string`, `speakerLabels: Record<'user'|'ai', string>`; actions: `appendToken`, `commitPartial`, `clearTranscript` (data-model.md §TranscriptSlice State Shape)
- [X] T016 [P] Create `connection.slice.ts` in `src/store/slices/connection.slice.ts` — `ConnectionSlice` with `wsStatus: ConnectionStatus`, `latencyMs: number`, `reconnectCount: number`, `connectionLog: ConnectionLogEntry[]`; actions: `setWsStatus`, `incrementReconnect`, `appendConnectionLog`, `resetConnection` (data-model.md §CallStatus; data-model.md §ConnectionLogEntry)
- [X] T017 [P] Create `audio.slice.ts` in `src/store/slices/audio.slice.ts` — `AudioSlice` with `isMuted: boolean`, `vadActive: boolean`, `currentAmplitude: number`, `inputDeviceId: string | null`; actions: `setMuted`, `setVadActive`, `setAmplitude`, `setInputDevice` (research.md §Pattern C transient subscribe)
- [X] T018 [P] Create `dashboard.slice.ts` in `src/store/slices/dashboard.slice.ts` — `DashboardSlice` with `claims: Claim[]`, `reminders: Reminder[]`, `sessionData: PostCallResponse | null`, `isLoading: boolean`, `error: string | null`; actions: `pushClaim`, `pushReminder`, `setSessionData`, `setLoading`, `setDashboardError`, `resetDashboard` (spec.md US4)
- [X] T019 Combine all slices into `src/store/store.ts` using `create<AppStore>()(devtools(subscribeWithSelector(immer(...))))` with `name: 'AppStore', enabled: import.meta.env.DEV`; export `useAppStore` (research.md §Code Skeleton store.ts — depends on T013–T018)

### Shared Components & AudioWorklet

- [X] T020 [P] Create shared `Button.tsx` in `src/shared/components/Button.tsx` — typed `variant`, `disabled`, `onClick`, keyboard-accessible; forward ref; WCAG AA contrast (plan.md §shared/components)
- [X] T021 [P] Create shared `Badge.tsx` in `src/shared/components/Badge.tsx` — labels for speaker attribution (User/AI) and call states; styled with sufficient contrast (plan.md §shared/components)
- [X] T022 [P] Create shared `EmptyState.tsx` in `src/shared/components/EmptyState.tsx` — accepts `title` and `description` props; used by dashboard sections when data is empty (spec.md US4 AC5)
- [X] T023 [P] Create `useErrorBoundary.ts` hook in `src/shared/hooks/useErrorBoundary.ts` (plan.md §shared/hooks)
- [X] T024 [P] Implement `pcm-processor.worklet.ts` AudioWorklet processor in `src/audio/pcm-processor.worklet.ts` — converts Float32 input to Int16 PCM, posts `Int16Array` buffer to main thread every 320 samples (20 ms frames at 16kHz); compiled under `tsconfig.worklet.json` (plan.md §audio/; quickstart.md §Key Source Files)

**Checkpoint**: Foundation complete — all five slices, combined store, types, utilities, primitives, and AudioWorklet are in place. User story phases can now begin.

---

## Phase 3: User Story 1 — Live Voice Call (Priority: P1) 🎯 MVP

**Goal**: A user can navigate to the call screen, start a voice call, speak and hear the AI respond in audio, and end the call — delivering the core conversational AI experience.

**Independent Test**: Start a call → speak a phrase → hear AI audio response → click End Call → verify call transitions to Ended state. Verifies FR-001, FR-002, FR-006, FR-007, FR-008, FR-009, FR-010, FR-027.

### Services

- [X] T025 [US1] Implement `WebSocketService` singleton in `src/shared/services/WebSocketService.ts` — `fetchSessionToken()` calls `POST /api/sessions`, validates via `CreateSessionResponseSchema`; `connect()` opens `WebSocket(wsUrl?token=...)`, sets `binaryType = 'arraybuffer'`; `handleTextFrame()` runs `InboundMessageSchema.safeParse` and dispatches to Zustand actions (SC-008); `handleBinaryFrame()` forwards `ArrayBuffer` to `AudioManager`; `send()` accepts `string | ArrayBuffer`; token scoped to `connect()` frame only (contracts/rest-auth.md; contracts/websocket-messages.md §Message Processing Rule; plan.md §Principle VII)
- [X] T055 [US1] Extend `WebSocketService.connect()` in `src/shared/services/WebSocketService.ts` to handle session-token rejection — if the WebSocket upgrade returns HTTP 401 or 403, dispatch `setCallStatus('error')` with message "Authentication failed. Please retry to start a new call." and `setWsStatus('failed')`; do NOT enter the exponential backoff reconnect loop (plan.md §Constraints); surface a retry CTA via `CallStateIndicator` error state (FR-028)
- [X] T026 [US1] Implement `WebRTCService` singleton in `src/shared/services/WebRTCService.ts` — `requestMic()` calls `navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } })`; registers `pcm-processor.worklet.ts` via `AudioWorklet.addModule(new URL(..., import.meta.url))`; on worklet `message` event, forwards `Int16Array` buffer to `WebSocketService.send()`; `stop()` disconnects all nodes and closes the `MediaStream`; handles `NotAllowedError` by dispatching `setCallStatus('error')` with actionable message (plan.md §WebRTCService; quickstart.md §Risk: WebRTC permission failure)
- [X] T027 [US1] Implement `AudioManager` singleton in `src/shared/services/AudioManager.ts` — single `AudioContext` shared with `WebRTCService` mic graph; `enqueue(buffer: ArrayBuffer, sampleRate: 22050 | 24000)` interprets bytes as raw PCM Int16 (no RIFF header), creates `AudioBuffer` manually via `AudioContext.createBuffer(1, samples.length, sampleRate)` and copies `Int16Array` converted to float32 into the buffer channel, then schedules an `AudioBufferSourceNode` for gapless playback; `bargeIn()` stops all active nodes atomically; drain detection: `pendingCount` counter + `streamComplete` flag (set on `audio_stream_end` message) triggers transition to `listening`; `stop()` closes `AudioContext`; dispatches `setVadActive` and `setCallStatus` to Zustand; `sampleRate` is read from `call_state.sampleRate` delivered with the `speaking` transition (contracts/websocket-messages.md §Binary Audio Frames; plan.md §AudioManager; quickstart.md §Risk: Memory leaks)

### Hook & Screen

- [X] T028 [US1] Implement `useCallSession` hook in `src/features/call/hooks/useCallSession.ts` — calls `WebSocketService.connect()` on start, triggers `WebRTCService.requestMic()` after connection, wires `AudioManager.bargeIn()` on VAD flag change, calls `WebSocketService.send({ type:'call_start' })` on connect and `{ type:'call_end' }` on end; cleans up all three services on unmount returning a `cleanup()` function guard for React 19 Strict Mode double-mount protection (plan.md §useCallSession; plan.md §Principle IV React 19)
- [X] T029 [US1] Create `CallControls.tsx` in `src/features/call/CallControls.tsx` — Start Call and End Call `<Button>` components; Start disabled when `status !== 'idle'`; End disabled when `status === 'idle' | 'ended'`; both keyboard-accessible (`role="button"`, `onKeyDown` Enter/Space); labelled with `aria-label` (spec.md FR-001, FR-002, FR-023)
- [X] T030 [US1] Create `MicStatusIndicator.tsx` in `src/features/call/MicStatusIndicator.tsx` — subscribes to `useAppStore(s => s.audio.vadActive)`; renders active/inactive mic indicator with `aria-live="polite"` (spec.md FR-004)
- [X] T031 [US1] Create `CallStateIndicator.tsx` in `src/features/call/CallStateIndicator.tsx` — subscribes to `useAppStore(s => s.call.status)`; renders text label per `CallStatus` value; for `'error'` state shows sanitised error message from `useAppStore(s => s.call.error)` with a recovery action description; styled with WCAG AA contrast; annotated with `aria-live="assertive"` (spec.md FR-003, FR-026; data-model.md §CallStatus transitions)
- [X] T032 [US1] Assemble `CallScreen.tsx` in `src/features/call/CallScreen.tsx` — composes `CallStateIndicator`, `CallControls`, `MicStatusIndicator`; wires `useCallSession`; uses `useAppStore` scalar selectors for `status` only (no array selectors); placeholder slot for `TranscriptPanel` (added in Phase 4) (plan.md §call/)
- [X] T033 [US1] Create `src/app/routes.tsx` — define React Router v7 routes: `/` → `CallScreen`, `/dashboard/:sessionId` → `DashboardScreen` (stub); export router instance (plan.md §app/routes.tsx)
- [X] T034 [US1] Update `src/app/App.tsx` as the router root/layout shell — wraps `<RouterProvider>`; no business logic in render function (plan.md §app/App.tsx; Constitution Principle III)

**Checkpoint**: User Story 1 fully functional. Starting a call, speaking, hearing AI audio, and ending the call all work end-to-end.

---

## Phase 4: User Story 2 — Live Transcript During Call (Priority: P2)

**Goal**: While a call is active, a running, speaker-attributed, auto-scrolling transcript updates in real time as speech is recognised.

**Independent Test**: During an active call, speak a phrase → verify the user's words appear in the transcript panel within 1 second; have the AI respond → verify AI tokens appear progressively; verify the panel auto-scrolls to the latest entry. Verifies FR-011, FR-012, FR-013, SC-002.

- [X] T035 [P] [US2] Create `TranscriptEntry.tsx` in `src/features/transcript/TranscriptEntry.tsx` — renders a single `TranscriptEntry`; speaker label via `Badge` component; timestamp formatted to locale time string; text rendered via `sanitise()` before insertion (data-model.md §TranscriptEntry; plan.md §Principle VII)
- [X] T036 [P] [US2] Create `useTranscriptScroll.ts` hook in `src/features/transcript/hooks/useTranscriptScroll.ts` — returns a `containerRef`; uses `useEffect` with `entries.length` dependency to scroll the container to `scrollHeight` whenever a new entry is committed (spec.md FR-013 AC3)
- [X] T037 [US2] Create `TranscriptPanel.tsx` in `src/features/transcript/TranscriptPanel.tsx` — subscribes to `useAppStore(s => s.transcript.entries)` and `useAppStore(s => s.transcript.currentPartial)`; renders committed `entries` as `<TranscriptEntry>` list plus a streaming partial row for the in-progress AI turn; applies `useTranscriptScroll`; user and AI entries visually distinguished via `Badge` colour; WCAG AA body font size; `aria-live="polite"` region (spec.md US2 ACs; data-model.md §TranscriptSlice; plan.md §Principle V append-only)
- [X] T038 [US2] Integrate `TranscriptPanel` into `CallScreen.tsx` — add `<TranscriptPanel />` in the placeholder slot added in T032; no new state subscriptions in `CallScreen` (spec.md FR-011)

**Checkpoint**: User Stories 1 and 2 both functional. Live transcript updates during a call.

---

## Phase 5: User Story 3 — Call State Visibility (Priority: P3)

**Goal**: Every state transition is surfaced with a distinct, visually polished indicator: Idle, Connecting, Listening, AI Thinking, AI Speaking, Reconnecting, Call Ended, and Error — each with an associated visual cue.

**Independent Test**: Trigger each `CallStatus` value in isolation (e.g., dispatch `setCallStatus` directly in browser devtools or a dev fixture) and verify the indicator label and visual cue updates within 300 ms. Verifies FR-003, FR-024, SC-004, SC-007 (US3 ACs 1–7).

- [X] T039 [US3] Enhance `CallStateIndicator.tsx` in `src/features/call/CallStateIndicator.tsx` — expand from basic labels to full per-state visual design: `connecting` → spinner, `listening` → pulsing mic icon, `thinking` → animated ellipsis, `speaking` → animated waveform icon (canvas-free; CSS animation), `reconnecting` → spinner with attempt count, `ended` → checkmark, `error` → warning icon + sanitised message + retry CTA; all states meet WCAG 2.1 AA colour contrast; each state has a unique `aria-label` on the indicator root element (spec.md US3 ACs; plan.md §CallStateIndicator; SC-004 ≤300 ms)
- [X] T040 [US3] Verify `ConnectionSlice` tracks reconnect attempt count and logs to `connectionLog` — confirm `setWsStatus('reconnecting')` and `incrementReconnect()` are called correctly in `WebSocketService` state transitions; if missing, add calls in `src/shared/services/WebSocketService.ts` and `src/store/slices/connection.slice.ts` (data-model.md §ConnectionLogEntry; spec.md US3 AC2 Connecting indicator)

**Checkpoint**: All seven call states render with distinct visuals and correct labels independently of audio or transcript logic.

---

## Phase 6: User Story 4 — Post-Call Review Dashboard (Priority: P4)

**Goal**: After a call ends, the user can review the full transcript, all extracted claims, all reminders, and export everything as a JSON file.

**Independent Test**: Navigate to `/dashboard/<sessionId>` after a call ends → verify transcript, claims, and reminders are all visible; click Export → verify a `.json` file downloads containing all three sections; navigate to a session with no entries → verify empty states appear (not errors). Verifies FR-019, FR-020, FR-021, FR-022, SC-006.

- [X] T041 [P] [US4] Create `TranscriptSection.tsx` in `src/features/dashboard/TranscriptSection.tsx` — renders the full `transcript` array from `PostCallResponse`; each entry as `<TranscriptEntry>`; empty state via `<EmptyState>` if array is empty (spec.md US4 AC1, AC5)
- [X] T042 [P] [US4] Create `ClaimsSection.tsx` in `src/features/claims/ClaimsSection.tsx` — renders `claims` array; each row shows `text` (sanitised), `speaker` badge, `confidence` as a percentage; empty state via `<EmptyState>` (spec.md US4 AC2, AC5)
- [X] T043 [P] [US4] Create `RemindersSection.tsx` in `src/features/reminders/RemindersSection.tsx` — renders `reminders` array; each row shows `text` (sanitised), optional `dueAt` formatted to locale date-time string; empty state via `<EmptyState>` (spec.md US4 AC3, AC5)
- [X] T044 [P] [US4] Create `ExportButton.tsx` in `src/features/dashboard/ExportButton.tsx` — on click calls `buildExportPayload(...)` from `export.ts`, creates a `Blob` with `application/json`, triggers download via temporary `<a>` element; disabled while `isLoading` is true (spec.md US4 AC4; FR-022)
- [X] T045 [US4] Implement `useDashboardData` hook in `src/features/dashboard/hooks/useDashboardData.ts` — on mount fetches `GET /api/sessions/{sessionId}` (sessionId from route params), validates response via `PostCallResponseSchema.safeParse`, dispatches `setSessionData` to `DashboardSlice`; handles loading and error states; `sessionId` sourced from React Router `useParams()` (contracts/rest-auth.md §Get Post-Call Session Data; SC-006 ≤3 s)
- [X] T046 [US4] Assemble `DashboardScreen.tsx` in `src/features/dashboard/DashboardScreen.tsx` — calls `useDashboardData`; renders `TranscriptSection`, `ClaimsSection`, `RemindersSection`, `ExportButton`; shows loading skeleton while `isLoading` is true; shows error message if fetch fails; passes `PostCallResponse` data to child sections (spec.md US4 ACs; plan.md §dashboard/)
- [X] T047 [US4] Update `src/app/routes.tsx` to activate `/dashboard/:sessionId` route pointing to `DashboardScreen`; add navigation from `CallScreen` to `/dashboard/:sessionId` on call end (in `useCallSession` cleanup or via `CallStateIndicator` CTA when `status === 'ended'`)

**Checkpoint**: Post-call dashboard fully functional. All sections render, empty states work, and JSON export produces a downloadable file.

---

## Phase 7: User Story 5 — Connection Recovery (Priority: P5)

**Goal**: When the WebSocket drops during a call, the system automatically reconnects using full-jitter exponential backoff (max 5 attempts, ceiling 30 s), shows a Reconnecting state, and resumes call state. After exhausting retries, a clear error with a "start new call" action is shown.

**Independent Test**: Simulate a network drop during an active call → verify indicator shows Reconnecting → restore network → verify the system reconnects and resumes Listening state within 10 seconds without user action. Force 5 consecutive failures → verify Error state with new-call CTA. Verifies FR-018, SC-005, spec.md US5 ACs 1–3.

- [X] T048 [US5] Add full-jitter exponential backoff reconnect loop to `WebSocketService` in `src/shared/services/WebSocketService.ts` — on `ws.onclose`: if `attemptCount < 5`, compute `delay = random(0, min(30000, base * 2^attempt))`, dispatch `setWsStatus('reconnecting')` + `incrementReconnect()`, schedule `connect()` after delay; on 5th failure dispatch `setWsStatus('failed')` + `setCallStatus('error')` with message "Connection lost. Please start a new call."; re-fetch session token on each reconnect attempt (Constitution Principle IV; spec.md SC-005; FR-018)
- [X] T049 [US5] Update `CallStateIndicator.tsx` in `src/features/call/CallStateIndicator.tsx` — add `reconnecting` visual state (spinner + "Reconnecting\u2026 attempt N/5") triggered when `useAppStore(s => s.connection.wsStatus) === 'reconnecting'` (NOT from `call.status`; `CallStatus` is unchanged during reconnection); read attempt count via `useAppStore(s => s.connection.reconnectCount)`; update `failed`/`error` state to include a "Start New Call" button that dispatches `resetCall()` and navigates to `/` (spec.md US5 AC1, AC3; FR-028 retry CTA for auth failure)

**Checkpoint**: Connection recovery fully operational. Network drops handled automatically; users informed throughout and offered recovery on failure.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility hardening, DOMPurify application audit, keyboard operability verification, and final quickstart validation across all user stories.

- [X] T050 [P] Audit all feature components for missing `sanitise()` calls — verify every external string rendered in the DOM (transcript token text, claim text, reminder text, error messages from WS `error` frames, agent-generated content) passes through `sanitise.ts` before insertion; fix any gaps found in `src/features/` and `src/shared/services/` (plan.md §Principle VII; spec.md FR-026)
- [X] T051 [P] Keyboard operability audit of `CallControls.tsx` in `src/features/call/CallControls.tsx` — manually verify Start Call and End Call are reachable and activatable via Tab + Enter/Space without pointer device; confirm `aria-label`, `role`, and `disabled` states are correct per FR-023, SC-007
- [X] T052 [P] Accessibility review of `CallStateIndicator.tsx` in `src/features/call/CallStateIndicator.tsx` — run contrast checks on all state colours against WCAG 2.1 AA 4.5:1 ratio; confirm `aria-live="assertive"` is present; confirm each state label is meaningful to a screen reader (FR-024)
- [X] T053 [P] Verify `TranscriptPanel.tsx` in `src/features/transcript/TranscriptPanel.tsx` — confirm text uses `rem`-based sizing and scales correctly at 200% browser zoom; confirm `aria-live="polite"` is present; verify panel is readable at standard body font size (FR-025)
- [X] T054 Run quickstart.md end-to-end validation: `npm install` → `npm run dev` → verify dev server starts at `localhost:5173` → confirm call screen loads → confirm `.env.local` variables are applied; fix any broken imports or missing exports surfaced during this check (quickstart.md §4)

**Checkpoint**: All user stories polished, accessible, and validated against quickstart.md. Feature ready for integration testing with the backend.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Depends on Phase 2 — first user story to implement (MVP)
- **Phase 4 (US2)**: Depends on Phase 2 (and reuses T032 `CallScreen` placeholder from Phase 3)
- **Phase 5 (US3)**: Depends on Phase 3 (enhances `CallStateIndicator` created in T031)
- **Phase 6 (US4)**: Depends on Phase 2 (and `DashboardSlice` from T018)
- **Phase 7 (US5)**: Depends on Phase 3 (enhances `WebSocketService` created in T025)
- **Phase 8 (Polish)**: Depends on all story phases being complete

### User Story Dependencies

| Story | Depends on | Can start after |
|-------|-----------|----------------|
| US1 (P1) | Foundation only | Phase 2 complete |
| US2 (P2) | Foundation + US1 placeholder in CallScreen (T032) | Phase 3 T032 complete |
| US3 (P3) | US1 `CallStateIndicator` base (T031) | Phase 3 T031 complete |
| US4 (P4) | Foundation only (DashboardSlice from T018) | Phase 2 complete |
| US5 (P5) | US1 `WebSocketService` (T025) + US3 `CallStateIndicator` (T039) | Phase 5 complete |

### Within Each User Story

- Models/types → services → hooks → components → screen assembly
- Services (T025–T027) before hook (T028) before components (T029–T031) before screen (T032)
- All `[P]`-marked tasks within a phase can run in parallel

---

## Parallel Execution Examples

### Phase 2 — Foundational (run all in parallel)

```
T007  Create call-state.ts types
T008  Create call-session.ts types + schemas
T009  Create ws-messages.ts Zod schemas
T010  Create session.ts schema
T011  Create sanitise.ts
T012  Create export.ts
T013  Create store.types.ts
T014  Create call.slice.ts
T015  Create transcript.slice.ts
T016  Create connection.slice.ts
T017  Create audio.slice.ts
T018  Create dashboard.slice.ts
T020  Create Button.tsx
T021  Create Badge.tsx
T022  Create EmptyState.tsx
T023  Create useErrorBoundary.ts
T024  Create pcm-processor.worklet.ts

→ T019  Create store.ts  (depends on T013–T018)
```

### Phase 3 — User Story 1 (sequential core, parallel leaf tasks)

```
T025  WebSocketService
T026  WebRTCService        (parallel with T025 — different file)
T027  AudioManager         (parallel with T025, T026 — different file)

→ T028  useCallSession     (depends on T025, T026, T027)

T029  CallControls.tsx     (parallel with T030, T031 — different files)
T030  MicStatusIndicator   (parallel with T029, T031)
T031  CallStateIndicator   (parallel with T029, T030)

→ T032  CallScreen.tsx     (depends on T028, T029, T030, T031)
T033  routes.tsx           (parallel with T032)

→ T034  App.tsx            (depends on T032, T033)
```

### Phase 6 — User Story 4 (parallel sections)

```
T041  TranscriptSection    (parallel)
T042  ClaimsSection        (parallel)
T043  RemindersSection     (parallel)
T044  ExportButton         (parallel)

→ T045  useDashboardData   (depends on store slices from Phase 2)
→ T046  DashboardScreen    (depends on T041–T045)
→ T047  routes.tsx update  (depends on T046)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational — **must finish before US1**
3. Complete Phase 3: User Story 1 (T025–T034)
4. **STOP and VALIDATE**: Start call → speak → hear AI response → end call
5. Demo the core conversational loop before building further

### Incremental Delivery

1. **Phase 1 + Phase 2** → Foundation ready
2. **Phase 3** → US1 (Voice Call) → **MVP demo**
3. **Phase 4** → US2 (Live Transcript) → Users can read what they and the AI say
4. **Phase 5** → US3 (State Visibility) → Full state polish and animations
5. **Phase 6** → US4 (Dashboard) → Post-call review and export
6. **Phase 7** → US5 (Recovery) → Production-grade connection resilience
7. **Phase 8** → Polish → A11y and security hardening

### Parallel Team Strategy (if staffed)

After Phase 2 completes:
- **Dev A**: Phase 3 (US1) — critical path, blocks US2, US3, US5
- **Dev B**: Phase 6 (US4) — independent from US1; only needs Foundation
- **Dev C**: Phase 4 (US2) — unblock after Dev A completes T032 (CallScreen stub)

---

## Task Summary

| Phase | Tasks | [P] Tasks | Story |
|-------|-------|-----------|-------|
| Phase 1: Setup | T001–T006 | T002–T005 (4) | — |
| Phase 2: Foundational | T007–T024 | T007–T023 (17) | — |
| Phase 3: US1 Live Voice Call | T025–T034, T055 | T026, T029, T030 (3) | US1 |
| Phase 4: US2 Live Transcript | T035–T038 | T035, T036 (2) | US2 |
| Phase 5: US3 Call State Visibility | T039–T040 | — | US3 |
| Phase 6: US4 Post-Call Dashboard | T041–T047 | T041–T044 (4) | US4 |
| Phase 7: US5 Connection Recovery | T048–T049 | — | US5 |
| Phase 8: Polish | T050–T054 | T050–T053 (4) | — |
| **Total** | **55** | **34** | |

---

## Notes

- `[P]` tasks operate on different files with no dependency on incomplete tasks in the same batch
- `[USn]` label maps each implementation task to its user story for traceability
- Tests are omitted — add them if TDD is adopted or if the spec is updated to require them
- All four open questions (OQ-1–OQ-4) are now resolved in `contracts/websocket-messages.md` — `AudioManager` (T027) can be implemented without backend team input:
  - **OQ-1**: Raw PCM Int16, no RIFF/WAV header per chunk
  - **OQ-2**: 22050 Hz (Coqui TTS primary) / 24000 Hz (edge-tts fallback); signalled via `call_state.sampleRate`
  - **OQ-3**: `transcript_commit` confirmed
  - **OQ-4**: ~1024 samples / ~46 ms per frame at 22050 Hz
- Commit after each task or logical group; stop at each **Checkpoint** to validate independently
