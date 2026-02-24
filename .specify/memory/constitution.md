<!--
SYNC IMPACT REPORT
==================
Version change:       1.0.0 → 1.0.1 (PATCH — wording clarifications)
Modified principles:  III (shared components path), Technical Standards (React version)
Added sections:       N/A
Removed sections:     N/A

Changes:
  - Principle III: `src/components/` → `src/shared/components/` (path clarification
    to match the established feature-folder architecture where shared UI primitives
    reside alongside shared hooks, services, types, and utilities under `src/shared/`).
  - Technical Standards: "React 18+" → "React 19+" to accurately reflect the project's
    pinned React 19.2 dependency; React 19 is a superset of 18 with no breaking changes
    for this codebase.

Templates requiring updates:
  ✅ .specify/templates/plan-template.md  — Constitution Check gate already
     uses a dynamic placeholder; 7-principle check list is applied at plan
     authoring time. No structural change required.
  ✅ .specify/templates/spec-template.md  — Mandatory sections (Requirements,
     Success Criteria, User Scenarios) satisfy Principles I, II, VI. No change.
  ✅ .specify/templates/tasks-template.md — Phase categories (Setup, Foundation,
     User Story phases) naturally accommodate principle-driven task types:
     streaming/audio (I), TypeScript config (II), feature-folder scaffolding
     (III), reconnect/recovery tasks (IV), perf optimisation (V),
     a11y checks (VI), sanitisation/auth-scope tasks (VII). No change.

Follow-up TODOs:      None — all fields resolved.
-->

# CSCC Front-End Constitution

## Core Principles

### I. Real-Time UX First

The UI MUST always reflect live call state without blocking user interactions.
Visual indicators are REQUIRED for every async state: listening, thinking,
and speaking.
Streaming data MUST update the UI incrementally — buffering an entire response
before rendering is FORBIDDEN.
No modal or full-screen loading overlay MAY block call controls during an
active session.

**Rationale**: The primary value of a live voice-agent interface is immediacy.
Any lag or blocked state degrades operator trust and call quality.

### II. Strong Type Safety

TypeScript strict mode (`"strict": true`) MUST be enabled at all times.
Implicit `any` is FORBIDDEN — every value and API response MUST carry an
explicit, named type.
All API contracts (REST, WebSocket messages, WebRTC signalling events) MUST
be modelled as typed interfaces or discriminated unions before use in
components or services.

**Rationale**: Call centre software operates in high-stakes, real-time
environments. Runtime type errors are unacceptable; static guarantees are
the baseline, not a bonus.

### III. Component Architecture

Source code MUST follow a feature-based folder structure under `src/features/`.
UI primitives shared across features MUST live in `src/shared/components/`.
Business logic, API calls, and state management MUST NOT be co-located inside
React render functions — extract to custom hooks, service modules, or stores.
Each component MUST have a single, clearly named responsibility.

**Rationale**: Clear component boundaries make it safe to iterate on individual
call-flow screens without risking regressions in unrelated features.

### IV. Resilience

WebSocket connections MUST implement automatic reconnect with exponential
back-off (max 5 attempts, ceiling 30 s).
WebRTC failures (ICE failure, peer disconnect) MUST trigger a defined
recovery flow and surface actionable UI feedback within 2 s of detection.
Network drops MUST NOT silently corrupt call state — all state transitions
MUST be logged and recoverable from a known safe baseline.

**Rationale**: Call centre operations cannot afford silent failures. Every
network-layer fault MUST be handled explicitly with visible operator feedback.

### V. Performance

React re-renders MUST be minimised; `React.memo`, `useMemo`, and `useCallback`
MUST be applied only where profiling demonstrates measurable benefit — not
preemptively.
Audio processing (WebRTC, MediaStream) MUST run off the React render cycle
via the Web Audio API or AudioWorklet to prevent frame drops.
Streaming transcript updates MUST use append-only DOM operations rather than
full re-renders of prior content.

**Rationale**: Low-latency audio and real-time transcript rendering demand
that the main thread remain unblocked at all times.

### VI. Clean UX

The UI MUST be minimal and professional: no decorative chrome, no animation
used purely for aesthetics.
Every call control (mute, end call, hold, transfer) MUST be reachable within
one interaction from any active call screen.
All interactive elements MUST meet WCAG 2.1 AA contrast ratios and support
full keyboard navigation.

**Rationale**: Operators working under pressure need clarity, not visual
noise. Accessibility is non-negotiable for a professional operator tool.

### VII. Security

Client state MUST NOT be treated as authoritative — all security decisions
MUST be enforced server-side.
All content rendered from external sources (transcripts, agent names, caller
data) MUST be sanitised before insertion into the DOM.
Auth tokens and session credentials MUST NEVER be logged, stored in
`localStorage`, or held in component state beyond the minimum required scope.

**Rationale**: Call centre data is sensitive PII. A single XSS vulnerability
or token leak can compromise live customer conversations and violate
regulatory obligations.

## Technical Standards

- **Language / Runtime**: TypeScript 5.x, `"strict": true`
- **Framework**: React 19+ (concurrent features enabled)
- **Build Tool**: Vite
- **Real-Time Transport**: WebSocket (signalling), WebRTC (audio)
- **Styling**: CSS Modules or a utility-first CSS approach; inline styles in
  component JSX are FORBIDDEN except for purely dynamic values
- **Testing**: Vitest + React Testing Library; accessibility audits via
  axe-core
- **Linting**: ESLint with `@typescript-eslint/recommended-type-checked`

All third-party dependencies MUST serve a clear, non-duplicated purpose.
Dependencies that touch audio processing or WebRTC signalling MUST be
reviewed for bundle size and security posture before adoption.

## Governance

Amendments to this constitution MUST be proposed via a dedicated pull
request with a rationale comment referencing the affected principle(s).

Version increments follow semantic rules:
- **MAJOR** — a principle is removed or redefined in a backward-incompatible
  way.
- **MINOR** — a new principle or section is added, or an existing principle
  is materially expanded.
- **PATCH** — clarification, wording fix, or non-semantic refinement.

All feature plans (`plan.md`) MUST include a Constitution Check gate that
explicitly maps the feature design against all seven principles. A plan MUST
NOT advance to implementation until this gate passes.

All pull requests MUST be reviewed for compliance with Principles II (type
safety), IV (resilience), and VII (security) as a minimum; reviewers MUST
tick off each explicitly in the PR checklist.

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
