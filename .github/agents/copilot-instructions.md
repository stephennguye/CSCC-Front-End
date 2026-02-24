# CSCC-Front-End Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-24

## Active Technologies

**Feature 001-voice-call-frontend**
- **Language**: TypeScript 5.x, `"strict": true` — no implicit `any` anywhere
- **Framework**: React 19.2 (concurrent features; React 19 Strict Mode active)
- **Build**: Vite 7
- **State**: Zustand 5.0.11 — single store, 5 slices, middleware order: `devtools → subscribeWithSelector → immer`
- **Immutable updates**: Immer 10 (runtime dependency)
- **Schema validation**: Zod 3 — all WebSocket JSON frames validated via `safeParse` before use
- **DOM sanitisation**: DOMPurify 3 — all external text (transcripts, claims, agent names) sanitised before DOM insertion
- **Audio**: Web Audio API + AudioWorklet (`src/audio/pcm-processor.worklet.ts`) — PCM Int16 16kHz mono
- **Real-time transport**: WebSocket (JSON events + binary PCM/WAV frames), WebRTC (`getUserMedia`)
- **Testing**: Vitest + React Testing Library + axe-core
- **Linting**: ESLint with `@typescript-eslint/recommended-type-checked`

## Project Structure

```text
src/
  app/          # Router + layout shell
  features/     # call/, transcript/, dashboard/, claims/, reminders/
  shared/       # components/, hooks/, services/, types/, utils/
  store/        # store.ts + slices/
  audio/        # pcm-processor.worklet.ts (AudioWorklet, WebWorker lib)

specs/
  001-voice-call-frontend/
    plan.md, research.md, data-model.md, quickstart.md, contracts/

tests/
  unit/, integration/, a11y/
```

## Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm test          # Vitest
```

## Key Conventions (from Constitution)

1. **No `any`** — every value, API response, and WS message carries an explicit named type
2. **WS messages** — always validated via `InboundMessageSchema.safeParse()` in `WebSocketService` before dispatch; never process unvalidated frames
3. **Audio off main thread** — PCM capture in `pcm-processor.worklet.ts`; audio amplitude via Zustand transient-subscribe (no React re-renders)
4. **Session tokens** — scoped to `WebSocketService.connect()` call frame only; never in `localStorage`, `sessionStorage`, or component state
5. **Sanitise all external text** — use `src/shared/utils/sanitise.ts` (DOMPurify) before any DOM insertion
6. **WS reconnect** — full-jitter exponential backoff, max 5 attempts, ceiling 30 s
7. **Zustand slice actions** — named third arg to `set()` e.g. `'call/startCall'`; middleware order: devtools → subscribeWithSelector → immer

## Recent Changes

- 001-voice-call-frontend: Full feature plan — WebSocket + WebRTC voice call SPA with Zustand 5, Zod 3, AudioWorklet, DOMPurify

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
