// src/shared/types/session.ts
// T010 – CreateSessionResponse schema and type
// Source: contracts/rest-auth.md §TypeScript Client Contract

import { z } from 'zod'

export const CreateSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
  wsUrl: z.string().url(),
})

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>
