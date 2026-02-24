# Quickstart: Real-Time Voice Call Frontend

**Date**: 2026-02-24  
**Feature Branch**: `001-voice-call-frontend`

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20 LTS or 22 LTS | Required by Vite 7 |
| npm | 10+ | Ships with Node 20+ |
| HTTPS or localhost | — | Required by browser for `getUserMedia` + WSS |
| Backend running | — | See `backend-spec.md`; default `ws://localhost:8000` |

---

## 1. Install Dependencies

```bash
# From repo root
npm install

# Additional packages introduced by this feature
npm install zustand@^5.0.11 immer@^10 zod@^3 dompurify@^3

npm install -D \
  @redux-devtools/extension \
  @types/dompurify \
  vitest \
  @vitest/ui \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  axe-core \
  @axe-core/react
```

---

## 2. TypeScript Configuration

### `tsconfig.app.json` — Verify strict mode

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

### `tsconfig.worklet.json` — AudioWorklet (create at repo root)

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "lib": ["ESNext", "WebWorker"],
    "noEmit": false,
    "outDir": "dist/worklets"
  },
  "include": ["src/audio/**/*.worklet.ts"]
}
```

---

## 3. Environment Variables

Create `.env.local` at the repo root (not committed):

```bash
VITE_WS_BASE_URL=ws://localhost:8000
VITE_API_BASE_URL=http://localhost:8000
```

Access in TypeScript:
```typescript
const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL as string
```

---

## 4. Start Development Server

```bash
npm run dev
```

Navigate to `http://localhost:5173`. The browser will request microphone
permission on the first Start Call click.

> **Note**: `getUserMedia` requires a secure context. For local development,
> `http://localhost` is treated as secure by all major browsers. For network
> access (e.g., testing on a phone), use `https://` via a tunnelling tool
> such as `ngrok` or `mkcert` + Vite's `https` option.

---

## 5. Key Source Files — Where to Start

| File | Purpose |
|---|---|
| `src/features/call/CallScreen.tsx` | Main call UI — rendered on `/` |
| `src/features/call/hooks/useCallSession.ts` | Orchestrates WS + WebRTC + AudioManager |
| `src/shared/services/WebSocketService.ts` | Singleton; binary+JSON; reconnect logic |
| `src/shared/services/WebRTCService.ts` | Microphone capture via AudioWorklet |
| `src/shared/services/AudioManager.ts` | TTS playback queue + barge-in |
| `src/store/store.ts` | Zustand store entry point |
| `src/store/slices/call.slice.ts` | Call status state machine |
| `src/audio/pcm-processor.worklet.ts` | AudioWorklet: float32 → Int16 PCM |
| `src/shared/types/ws-messages.ts` | Zod schemas + TypeScript types for all WS messages |

---

## 6. Run Tests

```bash
# Unit + integration tests
npm run test

# With Vitest UI
npm run test -- --ui

# Accessibility tests (axe-core)
npm run test -- --reporter=verbose src/tests/a11y/
```

---

## 7. Build for Production

```bash
npm run build
```

Output in `dist/`. The worklet file is automatically bundled by Vite's
`new URL('./...', import.meta.url)` static analysis.

---

## 8. Engineering Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Audio echo from AI speakers feeding mic | Single `AudioContext` for mic graph + playback; browser native AEC with `echoCancellation: true` |
| WebRTC permission failure | `WebRTCService` catches `NotAllowedError`; transitions `call.status → error`; shows actionable UI within 2 s |
| WebSocket desync after reconnect | `WebSocketService` resets `attemptCount`; re-fetches session token; re-attaches all Zustand state via `useAppStore.getState()` |
| Memory leaks from audio buffers | `AudioManager` disconnects and dereferences every `AudioBufferSourceNode` in `onended`; single `AudioContext` per session closed on end |
| React re-render storms from streaming | Audio amplitude via Zustand transient-subscribe (zero React re-renders); transcript via scalar selector (`tokens.join(' ')`); Immer diff minimizes reconciler work |

---

## 9. Backend Contract Checklist (Pre-Implementation)

All open questions resolved by cross-referencing `backend-plan.md` and `backend-spec.md`.
`WebSocketService` + `AudioManager` can be implemented immediately.

- [x] **OQ-1**: Raw PCM Int16, no RIFF/WAV header per chunk. (Streaming-no-buffer mandate precludes per-chunk RIFF headers.)
- [x] **OQ-2**: 22050 Hz (Coqui TTS primary) / 24000 Hz (edge-tts fallback). Signalled in `call_state.sampleRate` when `state === "speaking"`.
- [x] **OQ-3**: `transcript_commit` — already defined in the contract and confirmed.
- [x] **OQ-4**: ~1024 samples (~46 ms at 22050 Hz). Validate exact value during integration testing.

See `contracts/websocket-messages.md §Open Questions` for full rationale.
