# Research: Real-Time Voice Call Frontend

**Date**: 2026-02-24  
**Feature Branch**: `001-voice-call-frontend`  
**Scope**: All technical unknowns for the real-time voice call SPA — WebRTC/AudioWorklet PCM capture, Zustand v5 state management, Web Audio API queue/barge-in, WebSocket binary+JSON frame handling.

---

> **Topic Index**
> 1. [Zustand Store Patterns](#1-zustand-state-management) (state management)
> 2. [WebRTC PCM Capture via AudioWorklet](#r2-webrtc-pcm-capture-via-audioworklet) (microphone → binary WS frames)
> 3. [Web Audio API Playback Queue & Barge-In](#r3-web-audio-api-playback-queue--barge-in) (TTS audio → gapless playback)
> 4. [WebSocket Service Design](#r4-websocket-service-design) (binary+JSON frames, reconnect, validation)

---

## R1 — Zustand State Management

---

## 1. Zustand Version & React 19 Compatibility

### Decision

Use **Zustand 5.0.11** (latest stable as of Feb 2026).

### Rationale

Zustand v5 (released late 2024) was built specifically to target React 18+ and React 19. Key v5 changes relevant here:

- Drops legacy `use-sync-external-store` shim overhead  uses React's native `useSyncExternalStore` directly, giving full React 19 concurrent-mode compatibility.
- `useShallow` is the v5 replacement for the v4 `shallow` equality import inside `useStore`.
- `ExtractState<Store>` type utility is now public (v5.0.3+), useful for deriving types from store references.
- No peer-dependency on any specific React minor version  `peerDependencies` is `"react": ">=18.0.0"`, so React 19 is explicitly supported.
- `immer` middleware typing with slices was fixed in v5.0.11 (#3371), which is directly relevant to this project.

### Alternatives Considered

| Option | Verdict |
|---|---|
| Zustand 4.x | `shallow` import path differs; no `useShallow`; missing v5 TS fixes for slices+immer. Reject. |
| Jotai | Atom-based; excellent for fine-grained reactivity but lacks "service class can subscribe" ergonomics. Considered but not chosen. |
| Redux Toolkit | Higher boilerplate; RTK Query overkill for WebSocket streams. Reject. |
| Valtio | Proxy-based mutations are intuitive but subscription from non-React services is less idiomatic. Reject. |

---

## 2. Multiple Slices vs. Separate Stores

### Decision

**Single combined store composed from typed slices**  one `useAppStore` hook, five slice files, combined at a single `store.ts` entry point.

### Rationale

The five domain areas  call state, transcript buffer, connection state, audio state, dashboard data  have cross-cutting dependencies at action time (e.g., starting a call must also clear the transcript buffer and reset connection state). With separate stores, these orchestrations require importing multiple stores in service classes and coordinating `setState` calls out-of-band, which creates ordering bugs.

The Zustand slices pattern (official best practice) addresses this: each slice is a factory function that receives the full-store `set`/`get`, enabling cross-slice reads and writes inside actions. All slices are combined into a single `create()` call.

**Store shape:**

```
AppStore
 call         CallSlice       (status, callId, participantId, startedAt, actions)
 transcript   TranscriptSlice (tokens[], currentPartial, speakerMap, actions)
 connection   ConnectionSlice (wsStatus, latencyMs, reconnectCount, actions)
 audio        AudioSlice      (isMuted, volume, inputDeviceId, vadActive, actions)
 dashboard    DashboardSlice  (activeCalls[], agentStatus, queueDepth, actions)
```

### Alternatives Considered

| Option | Verdict |
|---|---|
| Five `create()` calls, five hooks | Cannot atomically update across domains. Orchestration complexity in service layer. Rejected. |
| Single flat store (no slices) | Simple but unmaintainable >10 fields; no co-location of related actions. Reject. |
| Slices pattern (chosen) | Official Zustand recommendation; supports cross-slice access; single `getState()` for services. **Chosen.** |

### Code Skeleton

```ts
// store/slices/call.slice.ts
import type { StateCreator } from 'zustand'
import type { AppStore } from '../store.types'

export interface CallSlice {
  call: {
    status: 'idle' | 'connecting' | 'active' | 'ended' | 'error'
    callId: string | null
    startedAt: number | null
  }
  startCall: (callId: string) => void
  endCall: () => void
}

export const createCallSlice: StateCreator<
  AppStore,           // full store type  enables cross-slice access via get()
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  CallSlice
> = (set, get) => ({
  call: { status: 'idle', callId: null, startedAt: null },
  startCall: (callId) =>
    set((state) => {
      state.call.status = 'connecting'
      state.call.callId = callId
      // cross-slice: also reset transcript
      state.transcript.tokens = []
      state.transcript.currentPartial = ''
    }, false, 'call/startCall'),
  endCall: () =>
    set((state) => { state.call.status = 'ended' }, false, 'call/endCall'),
})
```

```ts
// store/store.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
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
      }))
    ),
    { name: 'AppStore', enabled: import.meta.env.DEV }
  )
)
```

---

## 3. High-Frequency Streaming Updates Without Re-render Storms

### Decision

Three-layer strategy based on update frequency:

1. **Transcript token appends** (50200ms cadence): write to Zustand via Immer; components subscribe with atomic scalar selectors or `useShallow` to derived strings, not raw token arrays. For sub-16ms cadence, use the **transient update** pattern  subscribe writes to a `ref`, component reads from ref on next animation frame.
2. **Audio chunk arrivals** (1020ms cadence): **do not store raw audio chunks in Zustand**. Store only derived scalars (VAD active flag, current amplitude float, buffer fill %). Service class uses `subscribe` to push amplitude to a canvas-rendered waveform directly, bypassing React re-renders entirely.
3. **Connection status / latency** (~1s cadence): normal Zustand reactive updates; fine to trigger re-renders.

### Rationale

React's `useSyncExternalStore` (Zustand v5) notifies all subscribers synchronously on every `setState`. At 50 Hz transcript token rates, without care, dozens of components can re-render per second. The patterns below prevent this:

#### Pattern A  Atomic scalar selectors (preferred for transcript display)

```ts
// Returns a primitive  strict equality check, no unnecessary re-renders
const transcriptText = useAppStore((s) => s.transcript.tokens.join(' '))
const callStatus = useAppStore((s) => s.call.status)
```

#### Pattern B  `useShallow` for multi-field object selects (v5 API)

```ts
import { useShallow } from 'zustand/react/shallow'

// Re-renders only when isMuted or volume identity changes
const { isMuted, volume } = useAppStore(
  useShallow((s) => ({ isMuted: s.audio.isMuted, volume: s.audio.volume }))
)
```

#### Pattern C  Transient update pattern (zero re-renders) for waveform

```ts
const amplitudeRef = useRef(0)

useEffect(() => {
  return useAppStore.subscribe(
    (s) => s.audio.currentAmplitude,
    (amp) => { amplitudeRef.current = amp }
    // subscribeWithSelector enables this selector-scoped subscription
  )
}, [])
// RAF loop reads amplitudeRef.current directly  no React involved
```

#### Pattern D  Immer for nested mutations (no manual spreading)

```ts
// Without immer  verbose manual copy:
set((s) => ({ transcript: { ...s.transcript, tokens: [...s.transcript.tokens, token] } }))

// With immer middleware  direct mutation, Immer handles immutability:
set((s) => { s.transcript.tokens.push(token) }, false, 'transcript/appendToken')
```

### Alternatives Considered

| Option | Verdict |
|---|---|
| Store raw audio buffers in Zustand | ~60 re-renders/sec on all audio subscribers. Definitively rejected. |
| `subscribeWithSelector` for service subscriptions | Preferred over raw `subscribe`  enables selector + `equalityFn`. Chosen. |
| RxJS / EventEmitter for streams | Valid but introduces second mental model. Rejected  Zustand's transient update patterns cover this use case. |
| `unstable_batchedUpdates` | React 18+ batches automatically. N/A. |

---

## 4. Strict TypeScript Typing (No Implicit `any`)

### Decision

Declare the full `AppStore` interface explicitly; pass it as the generic to every `StateCreator`; never rely on `create()` type inference when middlewares are composed.

### Rationale

Without explicit typing, stacked middleware (`devtools(subscribeWithSelector(immer(...)))`) causes TypeScript to lose track of the state shape and produce `any` for `set`/`get` parameters. The correct pattern:

1. Define each slice interface in its slice file.
2. Compose them into `AppStore` in `store.types.ts`.
3. Pass `AppStore` as the first generic to `StateCreator<AppStore, Mutators, [], SliceType>`.
4. The `Mutators` tuple must list all applied middleware in order  this is what tells TypeScript that Immer's `set((draft) => { draft.x = 1 })` callback form is valid.

```ts
// store/store.types.ts
import type { CallSlice } from './slices/call.slice'
import type { TranscriptSlice } from './slices/transcript.slice'
import type { ConnectionSlice } from './slices/connection.slice'
import type { AudioSlice } from './slices/audio.slice'
import type { DashboardSlice } from './slices/dashboard.slice'

export type AppStore =
  CallSlice &
  TranscriptSlice &
  ConnectionSlice &
  AudioSlice &
  DashboardSlice
```

```ts
// StateCreator generic for a slice (immer outer, devtools next out):
export const createTranscriptSlice: StateCreator<
  AppStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  TranscriptSlice
> = (set) => ({
  transcript: { tokens: [], currentPartial: '', speakerMap: {} },
  appendToken: (token: string) =>
    set((s) => { s.transcript.tokens.push(token) }, false, 'transcript/appendToken'),
  setPartial: (partial: string) =>
    set((s) => { s.transcript.currentPartial = partial }, false, 'transcript/setPartial'),
  clearTranscript: () =>
    set((s) => { s.transcript.tokens = []; s.transcript.currentPartial = '' }, false, 'transcript/clear'),
})
```

**Required dev dependency for devtools TypeScript types:**

```bash
npm install -D @redux-devtools/extension
```

```ts
// In store.ts  this import is a no-op at runtime, satisfies TS devtools generics:
import type {} from '@redux-devtools/extension'
```

**tsconfig.app.json requirements:**

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "target": "ES2022"
  }
}
```

### Alternatives Considered

| Option | Verdict |
|---|---|
| Infer types from `create()` | Breaks with stacked middleware; produces `any`. Rejected. |
| Per-slice `as unknown as SliceType` casts | Loses cross-slice type safety in action bodies. Rejected. |
| Explicit `AppStore` union type (chosen) | Full IDE autocomplete in all `set`/`get` calls; no `any` anywhere. **Chosen.** |

---

## 5. Slices vs. Separate Stores (Summary)

### Decision

**Slices in a single store.** Atomic cross-slice mutations are the deciding factor.

### Rationale

Inter-domain writes that must be atomic:
- `startCall`  clears transcript + resets connection state in one `set()`
- `onCallError`  updates call status + connection status + dashboard log atomically  
- Audio mute toggle  updates audio state + call metadata in one render cycle

With separate stores, each write is a separate `setState`, creating windows of partially-updated state that can cause UI glitches (e.g., transcript renders while call status is still `'idle'`). With slices, one `set(draft => { ... })` applies all mutations before any subscriber is notified.

**Source file layout:**

```
src/store/
 store.types.ts          # AppStore = intersection of all slice interfaces
 store.ts                # create() with middleware chain + slice composition
 slices/
     call.slice.ts
     transcript.slice.ts
     connection.slice.ts
     audio.slice.ts
     dashboard.slice.ts
```

---

## 6. Devtools Middleware Setup in TypeScript

### Decision

`devtools` is the outermost wrapper; enabled only in `DEV`; store named `'AppStore'`; every `set` call passes a named action string as the third argument.

### Rationale

Middleware wrapping order (outside  inside) is `devtools  subscribeWithSelector  immer`. This order matters for both TypeScript inference and runtime behavior.

```ts
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {} from '@redux-devtools/extension'

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      immer((...args) => ({
        ...createCallSlice(...args),
        // ...
      }))
    ),
    {
      name: 'AppStore',
      enabled: import.meta.env.DEV,
      anonymousActionType: 'unknown/setState',
    }
  )
)
```

**Action naming convention**  third `set()` argument per slice:

```ts
// Pattern: 'sliceName/actionCamelCase'
set((s) => { s.call.status = 'active' },         false, 'call/setActive')
set((s) => { s.connection.wsStatus = 'connected' }, false, 'connection/setConnected')
set((s) => { s.transcript.tokens.push(t) },      false, 'transcript/appendToken')
set((s) => { s.audio.isMuted = !s.audio.isMuted }, false, 'audio/toggleMute')
```

**Multiple stores in one DevTools tab** (future use):

```ts
devtools(..., { name: 'AppStore', store: 'main' })
// Each store with a unique `store` value appears as a separate item in DevTools
```

### Alternatives Considered

| Option | Verdict |
|---|---|
| Skip devtools in dev | Loses time-travel debugging for real-time state transitions. Rejected. |
| `devtools` inside `immer` | TypeScript errors; wrong wrapping order breaks mutator types. Rejected. |
| Anonymous action types only | DevTools useless for debugging streaming events. Rejected. |

---

## 7. Subscribing to Store State Outside React (Service Classes)

### Decision

Service classes call `useAppStore.subscribe(selector, callback)` (via `subscribeWithSelector`) for reactive subscriptions, and `useAppStore.getState().action(...)` for imperative updates. Export the store hook's static `.subscribe` / `.getState` / `.setState` for direct use.

### Rationale

`useAppStore` returned by `create()` is a React hook, but it also exposes static methods on its prototype:
- `useAppStore.getState()`  synchronous non-reactive read
- `useAppStore.setState(partial)`  external write (bypasses slices/middleware for raw use; prefer calling slice actions via `getState().actionName()`)
- `useAppStore.subscribe(selector, cb, opts?)`  reactive subscription, returns unsubscribe fn

Because `subscribeWithSelector` is included in the middleware stack, the selector form is available with an `equalityFn` option.

```ts
// services/WebSocketService.ts
import { useAppStore } from '../store/store'

export class WebSocketService {
  private unsub: (() => void) | null = null

  init() {
    // Read current callId synchronously
    const callId = useAppStore.getState().call.callId
    if (!callId) return

    // React to connection status changes  fires only when wsStatus changes
    this.unsub = useAppStore.subscribe(
      (s) => s.connection.wsStatus,
      (status, prevStatus) => {
        if (prevStatus === 'connected' && status === 'disconnected') {
          this.scheduleReconnect()
        }
      }
    )
  }

  destroy() {
    this.unsub?.()
    this.unsub = null
  }

  private onMessage(raw: string) {
    // Call slice action directly  goes through immer + devtools
    useAppStore.getState().appendToken(JSON.parse(raw).token)
  }
}
```

**`subscribeWithSelector` subscription signature:**

```ts
useAppStore.subscribe(
  selector: (state: AppStore) => T,
  callback: (current: T, previous: T) => void,
  options?: {
    equalityFn?: (a: T, b: T) => boolean
    fireImmediately?: boolean
  }
): () => void
```

**Audio visualizer  zero-React canvas render:**

```ts
// services/AudioVisualizerService.ts
export class AudioVisualizerService {
  private raf = 0

  mount(canvas: HTMLCanvasElement): () => void {
    let amplitude = 0
    const unsub = useAppStore.subscribe(
      (s) => s.audio.currentAmplitude,
      (amp) => { amplitude = amp }
    )
    const draw = () => {
      this.drawFrame(canvas, amplitude)
      this.raf = requestAnimationFrame(draw)
    }
    this.raf = requestAnimationFrame(draw)
    return () => { unsub(); cancelAnimationFrame(this.raf) }
  }
}
```

### Alternatives Considered

| Option | Verdict |
|---|---|
| Raw `subscribe(fullStateCallback)` | Fires on every state mutation regardless of relevance; must manually diff. Rejected. |
| Custom event bus / EventEmitter | Adds second sync layer; not type-safe without extra effort. Rejected. |
| Vanilla `createStore` + `useStore` in components | Cleaner for SSR / multi-instance scenarios; overkill for this SPA. Not needed. |
| `useAppStore.setState` directly in services | Bypasses devtools action naming; prefer calling slice action methods via `getState()`. Avoid. |

---

## Summary Decision Table

| Topic | Decision |
|---|---|
| Zustand version | **5.0.11** |
| React 19 compat | Full native (`useSyncExternalStore`) |
| Store structure | Single `create()`, **5 slices** |
| High-freq transcript | Immer push + atomic scalar selector |
| High-freq audio | Store only derived scalars; canvas via `subscribe` transient pattern |
| Cross-slice actions | Slice `set()` receives `AppStore` as first generic; full cross-slice write |
| TypeScript | Explicit `AppStore` type, `StateCreator` with `Mutators` tuple, `strict: true` |
| Middleware order (outer→inner) | `devtools` → `subscribeWithSelector` → `immer` |
| Service class access | `useAppStore.subscribe(selector, cb)` + `useAppStore.getState().action()` |
| Devtools | `DEV` only; named actions `'slice/action'` |

---

## Packages to Install

```bash
npm install zustand@^5.0.11 immer@^10
npm install -D @redux-devtools/extension
```

> `immer` is a runtime dependency (not devDependency) because `zustand/middleware/immer` requires it at runtime.

---

## R2 — WebRTC PCM Capture via AudioWorklet

**Scope**: `getUserMedia` microphone capture → PCM Int16 16kHz mono → binary WebSocket frames

---

### 1. `getUserMedia` Constraints

**Decision**: Pass `{ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } }`. Do **not** set `sampleRate: 16000` in the constraint — browser support is unreliable. Set it on `AudioContext` instead.

**Rationale**: `new AudioContext({ sampleRate: 16000 })` engages the browser's built-in resampler before samples reach JS. This is more reliable than post-capture resampling and avoids the Safari `sampleRate` constraint bug.

**Alternatives Considered**:
| Option | Verdict |
|---|---|
| `sampleRate: 16000` in `getUserMedia` | Ignored on most browsers; non-standard. Rejected. |
| Manual post-capture resampling on main thread | Adds CPU cost on main thread. Rejected. |
| `AudioContext({ sampleRate: 16000 })` (chosen) | Native browser resample; zero JS cost. **Chosen.** |

---

### 2. PCM Encoding — AudioWorklet vs ScriptProcessorNode

**Decision**: `AudioWorkletNode` with a processor file `src/audio/pcm-processor.worklet.ts`. Post `Int16Array` chunks via `MessagePort` transfer (zero-copy) every 320 samples (20 ms frames).

**Rationale**: `ScriptProcessorNode` is removed from the spec, runs on the main thread, and has timing jitter. `AudioWorkletNode` runs on the dedicated audio rendering thread, providing reliable 20 ms frames.

**Worklet pattern**:
```typescript
// src/audio/pcm-processor.worklet.ts
class PCMProcessor extends AudioWorkletProcessor {
  private buffer: Int16Array = new Int16Array(320)
  private offset = 0

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0]
    if (!input) return true
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.offset++] = Math.max(-1, Math.min(1, input[i])) * 0x7fff
      if (this.offset === 320) {
        this.port.postMessage(this.buffer.buffer, [this.buffer.buffer])
        this.buffer = new Int16Array(320)
        this.offset = 0
      }
    }
    return true
  }
}
registerProcessor('pcm-processor', PCMProcessor)
```

**Alternatives Considered**:
| Option | Verdict |
|---|---|
| `ScriptProcessorNode` | Spec-deprecated, main-thread, jitter-prone. Rejected. |
| `libsamplerate-js` WASM | +200 KB, only needed for sinc-quality resampling. Rejected unless quality issues arise. |

---

### 3. Binary WebSocket Send

**Decision**: `socket.send(int16Chunk.buffer)` — always send the `.buffer` (ArrayBuffer), not the typed array view. If the view is a slice, send `buffer.slice(byteOffset, byteOffset + byteLength)` to avoid transmitting the entire backing buffer.

---

### 4. AudioWorklet TypeScript Configuration

**Decision**: Separate `tsconfig.worklet.json` with `"lib": ["ESNext", "WebWorker"]`. This provides `AudioWorkletProcessor`, `registerProcessor`, `currentTime`, `sampleRate` globals without leaking `window`/`document` into the worklet scope.

```json
// tsconfig.worklet.json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "lib": ["ESNext", "WebWorker"],
    "outDir": "dist/worklets"
  },
  "include": ["src/audio/**/*.worklet.ts"]
}
```

---

### 5. Vite Module Loading Pattern

**Decision**: Use a string-literal `new URL(...)` pattern — Vite statically rewrites this at build time:

```typescript
await audioContext.audioWorklet.addModule(
  new URL('./audio/pcm-processor.worklet.ts', import.meta.url).href,
  { type: 'module' }
)
```

The first argument **must** be a string literal, not a variable. The worklet file must be under `src/` so Vite's TS pipeline processes it.

---

### 6. Cleanup Order

**Decision**: `port.close()` → `workletNode.disconnect()` → `source.disconnect()` → `track.stop()` (releases mic indicator in browser UI) → `audioContext.close()`. Use a `cancelled` ref guard in `useEffect` to handle React 19 Strict Mode double-mount.

---

### 7. Echo Cancellation

**Decision**: Route AI audio through the same `AudioContext.destination` (system audio output) used by `AudioManager`. Use a **single `AudioContext`** for both mic capture graph and AI playback — two separate contexts can desynchronise the AEC reference signal that the browser's OS-level echo canceller uses.

---

## R3 — Web Audio API Playback Queue & Barge-In

**Scope**: Incoming binary PCM/WAV chunks → gapless sequential playback → barge-in interruption → drain detection

---

### 1. Decoding Incoming Chunks

**Decision**: Use `AudioContext.decodeAudioData(arrayBuffer)` for WAV-framed chunks (both Coqui TTS and edge-tts emit RIFF/WAV headers). For raw headerless PCM: manually create an `AudioBuffer` via `Int16Array` → `Float32Array` (scale by `1/32768`).

**Alternatives Considered**:
| Option | Verdict |
|---|---|
| `MediaSource` | Wrong abstraction for chunked frames; designed for MP4/WebM containers. Rejected. |
| Web Codecs `AudioDecoder` | Correct but complex; PCM needs no codec, and WAV needs a trivial wrapper. Overkill. Rejected. |
| `decodeAudioData` (chosen) | Native, async, simple. **Chosen.** |

---

### 2. Gapless Playback via `nextPlayTime` Accumulator

**Decision**: Maintain a `nextPlayTime: number` in `AudioManager`. For each decoded chunk:

```typescript
const startAt = Math.max(this.audioCtx.currentTime + 0.04, this.nextPlayTime)
const node = this.audioCtx.createBufferSource()
node.buffer = decoded
node.connect(this.audioCtx.destination)
node.start(startAt)
this.nextPlayTime = startAt + decoded.duration
this.activeNodes.add(node)
node.onended = () => { node.disconnect(); this.activeNodes.delete(node); this.onNodeEnded() }
```

The `+ 0.04` offset (40 ms look-ahead) prevents scheduling into the past when `decodeAudioData` is slow. The `Math.max` guard handles network underruns.

**Alternatives Considered**:
| Option | Verdict |
|---|---|
| Start each chunk in `onended` callback of previous | ~20 ms audible gap per chunk transition. Rejected. |
| `nextPlayTime` accumulator (chosen) | Pre-schedules nodes; no gaps. **Chosen.** |

---

### 3. Barge-In Implementation

**Decision**: On VAD detection of new user speech while AI audio is playing:

```typescript
bargeIn(): void {
  const snapshot = [...this.activeNodes]
  snapshot.forEach(node => {
    try { node.stop() } catch { /* already stopped */ }
    node.disconnect()
  })
  this.activeNodes.clear()
  this.pendingCount = 0
  this.nextPlayTime = 0
  this.streamComplete = false
  // notify backend
  webSocketService.send({ type: 'barge_in' })
}
```

**VAD approach**: RMS energy threshold as first pass; `@ricky0123/vad-web` (Silero ONNX) for production-quality speech/noise discrimination.

---

### 4. Drain Detection (Transition to "Listening")

**Decision**: Two-gate approach — `pendingCount === 0` **AND** `streamComplete = true` (set when backend sends `audio_stream_end` control message). Either condition alone is insufficient; `pendingCount` can briefly reach zero between in-flight network chunks.

---

### 5. Memory Leak Prevention

**Decision**:
- `node.disconnect()` inside every `onended` handler (releases DSP graph edge)
- `activeNodes.delete(node)` drops the last JS reference to the node
- Never accumulate decoded `AudioBuffer` objects outside the queue
- Single `AudioContext` per call session; call `audioContext.close()` at end-of-call

---

### 6. Autoplay Policy

**Decision**: Create `AudioContext` synchronously inside the Start Call click handler (user gesture). Call `ctx.resume()` before the first enqueue if `ctx.state === 'suspended'`. Safari requires `resume()` synchronously within the gesture handler — async is not reliable on Safari.

---

### 7. Open Questions for Backend (Record for Contract Review)

| # | Question | Impact |
|---|----------|--------|
| OQ-1 | Is each TTS chunk a self-contained WAV (RIFF header) or raw PCM binary? | Determines decode path |
| OQ-2 | What sample rate does the TTS output? (Coqui = 22050 Hz, edge-tts = 24000 Hz) | `AudioContext` sample rate setting |
| OQ-3 | What is the exact `type` value of the "stream complete" control message? | Drain detection gate |
| OQ-4 | What is the typical chunk size / duration (ms) per chunk? | Look-ahead buffer tuning |

---

## R4 — WebSocket Service Design

**Scope**: Binary+JSON mixed frames, typed discriminated union, exponential backoff reconnect, session token handshake, pub/sub, Zod validation

---

### 1. Binary vs Text Frame Detection

**Decision**: `ws.binaryType = 'arraybuffer'` immediately after construction. Branch on `event.data instanceof ArrayBuffer` (PCM audio) vs `typeof event.data === 'string'` (JSON). No content sniffing inside frames.

**Rationale**: `arraybuffer` vs `blob`: `Blob` requires an async `.arrayBuffer()` call. `ArrayBuffer` is synchronously available, which is required for the SC-003 ≤500 ms AI-speaking indicator.

---

### 2. Discriminated Union for All JSON Message Types

**Decision**: All JSON frames share a mandatory `type` string-literal field. Define `z.discriminatedUnion('type', [...])` in Zod. TypeScript `switch (msg.type)` with `never` assignment in the `default` branch enforces exhaustiveness at compile time.

```typescript
// src/shared/types/ws-messages.ts
import { z } from 'zod'

const TranscriptTokenSchema = z.object({ type: z.literal('transcript_token'), speaker: z.enum(['user', 'ai']), token: z.string(), timestamp: z.number() })
const AudioStreamEndSchema  = z.object({ type: z.literal('audio_stream_end') })
const CallStateSchema       = z.object({ type: z.literal('call_state'), state: z.enum(['listening','thinking','speaking','ended','error']), error: z.string().optional() })
const ClaimSchema           = z.object({ type: z.literal('claim'), text: z.string(), speaker: z.enum(['user','ai']), confidence: z.number() })
const ReminderSchema        = z.object({ type: z.literal('reminder'), text: z.string(), dueAt: z.string().datetime().optional() })
const ControlSchema         = z.object({ type: z.literal('barge_in_ack') })

export const InboundMessageSchema = z.discriminatedUnion('type', [
  TranscriptTokenSchema, AudioStreamEndSchema, CallStateSchema,
  ClaimSchema, ReminderSchema, ControlSchema,
])
export type InboundMessage = z.infer<typeof InboundMessageSchema>
// Binary audio is handled separately as AudioFrame = { kind: 'audio'; buffer: ArrayBuffer }
```

---

### 3. Exponential Backoff Reconnection

**Decision**: Full-jitter exponential backoff. Max 5 attempts. Ceiling 30 s.

```typescript
private reconnect(attempt: number): void {
  if (attempt >= 5) { /* emit 'give_up'; show error UI */ return }
  const delay = Math.random() * Math.min(1000 * Math.pow(2, attempt), 30_000)
  setTimeout(() => this.connect(), delay)
}
```

Reset `attempt = 0` on successful `onopen`. Skip reconnect on clean close codes 1000/1001. Expected total wait before giving up: ~15 s (satisfies SC-005 ≤10 s per-attempt and FR-018).

---

### 4. Session Token on Upgrade Handshake

**Decision**: Query parameter — `wss://host/ws/call/{sessionId}?token=<short-lived>`. The browser `WebSocket` constructor does not allow custom request headers; the `Sec-WebSocket-Protocol` trick requires the backend to echo a fake protocol name. Query param is the idiomatic FastAPI/Starlette pattern.

**Security**: Fetch the token fresh before every connection attempt (including reconnects). Store only in the calling function scope — never in `localStorage`, `sessionStorage`, or component state (Constitution Principle VII).

---

### 5. Pub/Sub Event System

**Decision**: Typed `Map<MessageType, Set<Listener>>` with `on(type, listener): () => void` cleanup pattern. A `MessageTypeMap` interface maps event names to payload types for compile-time type narrowing.

```typescript
type MessageTypeMap = {
  transcript_token: TranscriptTokenMessage
  audio_stream_end: AudioStreamEndMessage
  call_state: CallStateMessage
  claim: ClaimMessage
  reminder: ReminderMessage
  audio: { buffer: ArrayBuffer }
}

on<K extends keyof MessageTypeMap>(
  event: K,
  listener: (msg: MessageTypeMap[K]) => void
): () => void
```

The returned cleanup function is what `useEffect` returns — no extra boilerplate.

---

### 6. Singleton vs React Context

**Decision**: Module-level singleton `WebSocketService`; wrapped in a thin `WebSocketContext` for DI/testing. React 19 Strict Mode double-invokes effects — a socket created in `useEffect` will open and immediately close. The singleton avoids this entirely. Consumers call `use(WebSocketContext)` (React 19 API).

---

### 7. Runtime Validation (FR-017 / SC-008)

**Decision**: Zod v3 `safeParse` on every incoming JSON frame:

```typescript
const result = InboundMessageSchema.safeParse(JSON.parse(event.data))
if (!result.success) {
  console.warn('[WS] Unrecognised message shape', result.error.flatten())
  return // discard — never process unvalidated frames (SC-008)
}
this.dispatch(result.data)
```

**Alternatives Considered**:
| Option | Verdict |
|---|---|
| Manual type guards | Higher maintenance cost; easy to forget a field. Rejected. |
| Valibot | ~3 KB vs Zod's ~14 KB gzip; valid alternative if bundle size is a concern. Deferred. |
| `JSON.parse` + cast | `as InboundMessage` violates Principle II. Forbidden. |

---

### Summary Decision Table

| Topic | Decision |
|---|---|
| Frame type detection | `binaryType = 'arraybuffer'`; `instanceof ArrayBuffer` branch |
| WS message schema | Zod `discriminatedUnion` + `safeParse`; `z.infer` for TS types |
| Reconnect policy | Full-jitter exponential backoff; max 5; ceiling 30 s |
| Token handshake | Query param `?token=`; fetched fresh per connect; memory-only |
| Pub/sub | Typed `Map<event, Set<listener>>`; cleanup fn returned from `on()` |
| Singleton vs context | Module singleton + thin `WebSocketContext` for DI |
| Validation | Zod `safeParse`; discard unknown frames with warning log |

---

## Packages to Install (Complete List)

```bash
# Runtime
npm install zustand@^5.0.11 immer@^10 zod@^3 dompurify@^3

# Dev
npm install -D @redux-devtools/extension @types/dompurify vitest @testing-library/react @testing-library/user-event axe-core
```
