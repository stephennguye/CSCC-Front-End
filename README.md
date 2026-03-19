# Vietnamese AI Call Center — Frontend

A real-time voice call SPA for Vietnamese airline ticket booking conversations with an AI agent. Features a professional dark UI, live pipeline visualization, and real-time transcription. Built with React 19, TypeScript, Zustand, and Vite 7.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [State Management](#state-management)
- [WebSocket Protocol](#websocket-protocol)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)

---

## Overview

The frontend enables users to have real-time Vietnamese voice conversations with an AI booking agent:

- **Capture** microphone audio and stream to backend via WebSocket
- **Display** live transcription as the conversation progresses
- **Visualize** the TOD pipeline (NLU → DST → Policy → NLG) per turn
- **Play** AI-generated audio responses with barge-in support
- **Track** booking slot progress with a visual progress ring
- **Review** completed calls with claims extraction and data export

### Design

Dark glass-morphism theme inspired by Linear/Vercel. Inter font family, CSS custom properties throughout, WCAG 2.1 AA accessible.

```
┌──────────────────────────────────────────────────────────────┐
│  🎧 Vietnamese AI Call Center              ● Connected       │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│  PIPELINE    │         ◉ Listening...                       │
│              │                                               │
│  ▸ STT       │            02:34                              │
│  ▸ NLU       │                                               │
│  ▸ DST       │      [ 🔴 End Call ]                         │
│  ▸ Policy    │                                               │
│  ▸ NLG       │  ─────────────────────────────────────────── │
│              │                                               │
│  Slots: 4/10 │  👤 Tôi muốn đặt vé đi Đà Nẵng             │
│  [████░░░░]  │                                               │
│              │  🤖 Dạ, anh/chị muốn bay từ đâu ạ?          │
│              │                                               │
│              │  👤 Từ Hà Nội, ngày thứ sáu                  │
│              │                                               │
├──────────────┴───────────────────────────────────────────────┤
│                    ● Mic active                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                     BROWSER (React 19 SPA)                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    UI COMPONENTS                         │  │
│  │  CallScreen ─ CallStateIndicator ─ CallControls          │  │
│  │  TranscriptPanel ─ TranscriptEntry                       │  │
│  │  PipelineVisualizer (collapsible sidebar)                │  │
│  │  DashboardScreen ─ ClaimsSection ─ RemindersSection      │  │
│  └─────────────────▲────────────────────────────────────────┘  │
│                    │                                           │
│  ┌─────────────────┴─────────────┬─────────────────────────┐  │
│  │       ZUSTAND STORE           │   Service Singletons    │  │
│  │  (Single Source of Truth)     │                          │  │
│  │                               │                          │  │
│  │  call.slice                   │  WebSocketService        │  │
│  │  transcript.slice      ◄──────┤  WebRTCService           │  │
│  │  connection.slice             │  AudioManager            │  │
│  │  audio.slice                  │                          │  │
│  │  pipeline.slice  ◄────────────┤  (pipeline_state msgs)  │  │
│  │  dashboard.slice              │                          │  │
│  └───────────────────────────────┴─────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                  AUDIO PIPELINE                          │  │
│  │  Mic → AudioWorklet (PCM-16, 16kHz) → WebSocket → BE   │  │
│  │  BE → WebSocket → Decode → AudioContext → Speaker       │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                             │
                    WebSocket + REST
                             │
                    ┌────────▼────────┐
                    │  Backend (FastAPI)│
                    │  TOD Pipeline    │
                    └─────────────────┘
```

### Data Flow

```
User speaks → WebRTCService (mic capture)
           → AudioWorklet (PCM encode)
           → WebSocketService (send binary)
           → Backend (STT → NLU → DST → Policy → NLG → TTS)
           → WebSocketService (receive frames)
           → Zustand store (update state)
              ├─ transcript.slice (new entry)
              ├─ pipeline.slice (NLU/DST/Policy/NLG output)
              ├─ call.slice (status: thinking → speaking)
              └─ audio.slice (playback state)
           → UI re-renders via subscriptions
```

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI rendering with latest concurrent features |
| TypeScript | ~5.9.3 | Strict type safety (`strict: true`) |
| Vite | 7.3.1 | Build tool with instant HMR |
| Zustand | 5.0.11 | Lightweight state management (6 slices) |
| Zod | 3.25.76 | Runtime WebSocket message validation |
| Immer | 10.2.0 | Immutable state updates with mutable syntax |
| DOMPurify | 3.3.1 | XSS prevention on all rendered text |
| Vitest | 4.0.18 | Vite-native test runner |
| React Testing Library | 16.3.2 | Component behavior testing |
| axe-core | 4.11.1 | Automated WCAG 2.1 accessibility testing |

---

## Features

### Real-Time Voice Calls

- Start/end calls via large circular buttons (64px, green/red gradients)
- Microphone capture at 16kHz, 16-bit, mono via AudioWorklet
- Sub-100ms latency for round-trip audio streaming
- Call duration timer (MM:SS format)

### Live Pipeline Visualization

The collapsible left sidebar shows the TOD pipeline output per turn:

- **STT** — transcribed Vietnamese text
- **NLU** — detected intent with confidence bar, extracted slots
- **DST** — current belief state with slot chips
- **Policy** — decided action and target slot
- **NLG** — generated Vietnamese response
- **Progress ring** — visual slot completion (filled/total)

Each stage is a collapsible stepper with SVG icons.

### Animated Call State Indicator

A 120px circular indicator with per-state animations:

| State | Animation | Visual |
|---|---|---|
| Idle | Breathing pulse | Muted circle |
| Connecting | Rotating border | Spinner |
| Listening | Pulsing green ring + ripple | Mic icon |
| Thinking | Orbital dots | Brain icon |
| Speaking | Waveform bars | Sound waves |
| Ended | Success glow | Check mark |
| Error | Red pulse | Alert icon |

### Transcript Panel

- User messages: right-aligned, blue background (`#1e3a5f`)
- AI messages: left-aligned, surface background
- Streaming partial text: pulsing accent border
- Auto-scroll to latest entry

### Barge-In Support

When user speaks while AI is responding:
1. AudioManager stops AI playback immediately
2. WebSocket sends `barge_in` signal to backend
3. Pipeline resets for new user utterance

### Post-Call Dashboard

- Session metadata card (ID, duration, outcome)
- Full transcript review
- Claims extraction with confidence progress bars
- Reminders with due dates
- JSON export functionality

---

## Project Structure

```
src/
├── main.tsx                            # React entry point
├── App.tsx                             # Error boundary wrapper
├── index.css                           # Global styles, CSS custom properties, animations
│
├── app/
│   ├── App.tsx                         # Root layout + router
│   └── routes.tsx                      # Route definitions
│
├── features/
│   ├── call/
│   │   ├── CallScreen.tsx              # Main call UI (nav + sidebar + center + footer)
│   │   ├── CallStateIndicator.tsx      # 120px animated state circle
│   │   ├── CallControls.tsx            # 64px circular start/end buttons
│   │   ├── MicStatusIndicator.tsx      # 8px green dot with pulse
│   │   └── hooks/
│   │       └── useCallSession.ts       # Call lifecycle (WS + WebRTC + Audio)
│   │
│   ├── pipeline/
│   │   └── PipelineVisualizer.tsx      # Vertical stepper with collapsible stages
│   │
│   ├── transcript/
│   │   ├── TranscriptPanel.tsx         # Chat container with auto-scroll
│   │   ├── TranscriptEntry.tsx         # Single message bubble
│   │   └── hooks/
│   │       └── useTranscriptScroll.ts  # Scroll-to-bottom logic
│   │
│   ├── dashboard/
│   │   ├── DashboardScreen.tsx         # Post-call review
│   │   ├── TranscriptSection.tsx       # Transcript archive card
│   │   ├── ExportButton.tsx            # JSON download
│   │   └── hooks/
│   │       └── useDashboardData.ts     # Fetch session data
│   │
│   ├── claims/
│   │   └── ClaimsSection.tsx           # Extracted claims with confidence bars
│   │
│   └── reminders/
│       └── RemindersSection.tsx        # Reminders with due dates
│
├── shared/
│   ├── components/
│   │   ├── Button.tsx                  # 5 variants, 3 sizes, loading spinner
│   │   ├── Badge.tsx                   # 11 variants, semi-transparent dark
│   │   └── EmptyState.tsx              # SVG icon + muted text
│   │
│   ├── services/
│   │   ├── WebSocketService.ts         # Singleton: connect, send, dispatch, reconnect
│   │   ├── WebRTCService.ts            # Singleton: getUserMedia, mic capture
│   │   └── AudioManager.ts            # Singleton: PCM encode, playback, barge-in
│   │
│   ├── types/
│   │   ├── ws-messages.ts              # Zod schemas (incl. pipeline_state)
│   │   ├── call-session.ts             # Call session types
│   │   ├── call-state.ts               # Status enum
│   │   └── session.ts                  # Auth token types
│   │
│   ├── hooks/
│   │   └── useErrorBoundary.ts
│   │
│   └── utils/
│       ├── export.ts                   # JSON export helper
│       └── sanitise.ts                 # DOMPurify wrapper
│
├── audio/
│   └── pcm-processor.worklet.ts        # AudioWorklet: 16-bit PCM on audio thread
│
└── store/
    ├── store.ts                        # Zustand factory (immer + devtools)
    ├── store.types.ts                  # AppStore type (union of all slices)
    └── slices/
        ├── call.slice.ts               # status, startedAt, endedAt, error
        ├── transcript.slice.ts         # entries[], partialEntry
        ├── connection.slice.ts         # wsStatus, reconnectAttempt
        ├── audio.slice.ts              # micActive, aiSpeaking, vadActive
        ├── pipeline.slice.ts           # outputs[], latest (NLU/DST/Policy/NLG)
        └── dashboard.slice.ts          # transcript, claims, reminders
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Modern browser: Chrome 115+, Firefox 115+, Safari 17+
- HTTPS or localhost (required for `getUserMedia`)

### Installation

```bash
cd CSCC-Front-End

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Environment

Create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
```

---

## State Management

Six Zustand slices combined with `immer` + `subscribeWithSelector` + `devtools` middleware:

```typescript
AppStore = CallSlice & TranscriptSlice & ConnectionSlice
         & AudioSlice & PipelineSlice & DashboardSlice
```

### Pipeline Slice (New for TOD)

```typescript
interface PipelineSlice {
  pipeline: {
    outputs: PipelineOutput[]    // All turns
    latest: PipelineOutput | null // Current turn
  }
  pushPipelineOutput: (output: PipelineOutput) => void
  resetPipeline: () => void
}

interface PipelineOutput {
  nlu: { intent: string; confidence: number; slots: Record<string, string> }
  dialogueState: { slots: Record<string, string>; turnCount: number; confirmed: boolean }
  action: string
  targetSlot?: string
  responseText: string
}
```

### Call State Machine

```
idle → connecting → listening ⇄ thinking ⇄ speaking → ended
                                                        ↑
any state ──────────────────────────────────────→ error ─┘
```

---

## WebSocket Protocol

### Inbound Messages (Backend → Frontend)

All messages validated via Zod discriminated union before processing:

| Type | Payload | Store Action |
|---|---|---|
| `transcript` | `{ speaker, text }` | Append to transcript entries |
| `transcript_commit` | `{ entryId }` | Mark entry as committed |
| `call_status` | `{ status }` | Update call.status |
| `pipeline_state` | NLU + DST + Policy + NLG data | Push to pipeline.outputs |
| `audio` | Binary PCM/WAV | Forward to AudioManager |
| `call_ended` | `{ reason }` | Transition to ended |
| `error` | `{ message }` | Set error state |

### Outbound Messages (Frontend → Backend)

| Type | When |
|---|---|
| `call_start` | User clicks Start |
| `audio.chunk` | Mic PCM frames (binary) |
| `barge_in` | VAD active while AI speaking |
| `call_end` | User clicks End |

---

## Testing

```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run lint          # ESLint + TypeScript
```

### Testing Stack

- **Vitest** — Vite-native runner, Jest-compatible API
- **React Testing Library** — User-perspective component tests
- **axe-core** — Automated WCAG 2.1 AA violation detection

---

## Build & Deployment

```bash
# Production build
npm run build         # tsc + vite build → dist/

# Preview locally
npm run preview

# Deploy dist/ to any static host
```

### Build Output

```
dist/
├── index.html
└── assets/
    ├── index-{hash}.js          # Main bundle
    ├── index-{hash}.css         # Styles
    └── pcm-processor-{hash}.js  # AudioWorklet
```

### Performance Targets

| Metric | Target |
|---|---|
| Bundle size (gzipped) | < 200KB |
| Load time (4G) | < 3s |
| Audio round-trip latency | < 100ms |
| Transcript render lag | < 1s |
| Lighthouse score | > 90 |

---

## Design System

### CSS Custom Properties

The dark theme is defined via CSS custom properties in `index.css`:

| Property | Value | Usage |
|---|---|---|
| `--color-bg` | `#0f172a` | Page background |
| `--color-surface` | `#1e293b` | Cards, panels |
| `--color-accent` | `#3b82f6` | Interactive elements |
| `--color-success` | `#22c55e` | Connected, active mic |
| `--color-danger` | `#ef4444` | End call, errors |
| `--color-warning` | `#f59e0b` | Reconnecting |

### Animations

16 keyframe animations for professional feel:

- `pulseRing` / `breathe` — idle/listening states
- `rotateBorder` — connecting spinner
- `thinkingDot` / `orbit` — AI processing
- `waveformBar` / `waveformLarge` — AI speaking
- `successGlow` / `errorPulse` — terminal states
- `fadeIn` / `slideUp` / `shimmer` — content transitions

### Accessibility

- Full keyboard navigation
- Semantic HTML with ARIA labels
- Focus rings on interactive elements
- Color contrast WCAG 2.1 AA compliant
- Screen reader support for all state changes

---

## Audio Pipeline

### Voice Activity Detection (VAD)

The `pcm-processor.worklet.ts` AudioWorklet handles real-time VAD:

| Parameter | Value | Purpose |
|---|---|---|
| `VAD_ENERGY_THRESHOLD` | 0.015 RMS | Rejects background noise (AC, fans) |
| `VAD_SPEECH_MIN_FRAMES` | 10 (~200ms) | Prevents brief noise spikes from triggering |
| `VAD_SILENCE_TIMEOUT_FRAMES` | 80 (~1600ms) | Allows natural mid-sentence pauses |
| `VAD_COOLDOWN_FRAMES` | 75 (~1500ms) | Prevents rapid-fire vad_end events |

### Audio Flow

```
Microphone → AudioWorklet (16kHz mono PCM) → VAD detection
  → vad_start: begin streaming PCM frames to backend
  → vad_end: send audio_end → triggers STT→TOD pipeline
```

---

**Status**: MVP Complete
**Last Updated**: 2026-03-18
