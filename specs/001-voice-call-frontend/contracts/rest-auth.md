# Contract: REST Control-Plane API

**Date**: 2026-02-24  
**Feature Branch**: `001-voice-call-frontend`  
**Requirements**: FR-027, spec §Assumptions (session token via REST pre-call)

---

## Overview

Before opening a WebSocket connection the frontend MUST obtain a short-lived
session token via a REST endpoint. This token is passed as a query parameter
on the WebSocket upgrade request (see `contracts/websocket-messages.md`).

The token MUST be fetched fresh before every connection attempt, including
automatic reconnects (Constitution Principle VII: tokens MUST NOT be cached
in localStorage or held in component state beyond the upgrade handshake call frame).

---

## Endpoint: Create Session Token

```
POST /api/sessions
```

### Request

No request body required for this feature scope. If the backend evolves to
require authentication credentials, those MUST be passed via `Authorization`
header, not in the body.

```http
POST /api/sessions HTTP/1.1
Content-Type: application/json
```

### Response — 201 Created

```json
{
  "sessionId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "token": "<short-lived-opaque-token>",
  "expiresAt": "2026-02-24T12:05:00Z",
  "wsUrl": "wss://host/ws/call/3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sessionId` | `string` (UUID) | Unique identifier for this call session |
| `token` | `string` | Short-lived opaque bearer token; pass as `?token=` on WS upgrade |
| `expiresAt` | `string` (ISO 8601) | When the token expires; frontend should connect before this time |
| `wsUrl` | `string` | Full WebSocket URL including `sessionId`; frontend uses this directly |

### Response — 401 Unauthorized

Returned if the caller is not authenticated (future scope — no auth required
in current feature scope per spec §Assumptions).

```json
{
  "detail": "Unauthorized"
}
```

### Response — 429 Too Many Requests

Rate limiting by IP or session origin.

```json
{
  "detail": "Rate limit exceeded",
  "retryAfter": 30
}
```

### Response — 503 Service Unavailable

Backend is starting up or unavailable.

---

## TypeScript Client Contract

```typescript
// src/shared/types/session.ts
import { z } from 'zod'

export const CreateSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
  wsUrl: z.string().url(),
})

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>
```

### Usage Pattern in `WebSocketService`

```typescript
// src/shared/services/WebSocketService.ts (simplified)

private async fetchSessionToken(): Promise<CreateSessionResponse> {
  const res = await fetch('/api/sessions', { method: 'POST' })
  if (!res.ok) throw new Error(`Session token request failed: ${res.status}`)
  const raw = await res.json()
  return CreateSessionResponseSchema.parse(raw)  // throws on invalid shape
}

async connect(): Promise<void> {
  const session = await this.fetchSessionToken()
  // token is scoped to this function call — never stored outside
  this.ws = new WebSocket(`${session.wsUrl}?token=${session.token}`)
  this.ws.binaryType = 'arraybuffer'
  // ... attach handlers
}
```

**Security note**: The `token` value exists only in the local scope of
`connect()`. It is never assigned to a class property, stored in Zustand,
`localStorage`, or `sessionStorage`.

---

## Endpoint: Get Post-Call Session Data

```
GET /api/sessions/{sessionId}
```

Called after call ends to populate the post-call dashboard (US-4, FR-019–FR-022).

### Response — 200 OK

```json
{
  "session": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "startedAt": 1740398400000,
    "endedAt": 1740398520000,
    "outcome": "normal_end"
  },
  "transcript": [
    { "index": 0, "speaker": "user", "text": "Hello, what is the return policy?", "timestamp": 1740398401000 },
    { "index": 1, "speaker": "ai",   "text": "Our return policy is 30 days.",      "timestamp": 1740398403500 }
  ],
  "claims": [
    { "index": 0, "text": "Return policy is 30 days", "speaker": "ai", "confidence": 0.92, "timestamp": 1740398403500 }
  ],
  "reminders": []
}
```

### TypeScript Contract

```typescript
// src/shared/types/call-session.ts
import { z } from 'zod'

const TranscriptEntrySchema = z.object({
  index: z.number().int().nonnegative(),
  speaker: z.enum(['user','ai']),
  text: z.string(),
  timestamp: z.number(),
})

const ClaimSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string(),
  speaker: z.enum(['user','ai']),
  confidence: z.number().min(0).max(1),
  timestamp: z.number(),
})

const ReminderSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string(),
  dueAt: z.string().datetime().nullable().optional(),
})

const SessionSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  outcome: z.enum(['normal_end','error','abandoned']),
})

export const PostCallResponseSchema = z.object({
  session: SessionSchema,
  transcript: z.array(TranscriptEntrySchema),
  claims: z.array(ClaimSchema),
  reminders: z.array(ReminderSchema),
})

export type PostCallResponse = z.infer<typeof PostCallResponseSchema>
export type TranscriptEntry = z.infer<typeof TranscriptEntrySchema>
export type Claim = z.infer<typeof ClaimSchema>
export type Reminder = z.infer<typeof ReminderSchema>
export type CallSession = z.infer<typeof SessionSchema>
```

---

## Error Handling

All REST calls MUST handle the following cases explicitly before attempting
a WebSocket connection:

| HTTP Status | Frontend Action |
|---|---|
| 200/201 | Proceed normally |
| 401 | Show "Authentication required" error (future scope) |
| 429 | Show "Too many requests — retry in N seconds" with `retryAfter` |
| 4xx other | Show generic error; offer retry |
| 5xx | Show "Service unavailable"; offer retry after 5 s |
| Network error | Show "No connection"; enter reconnect flow same as WS drop |
