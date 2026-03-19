// src/shared/services/WebSocketService.ts
// T025 + T055 – WebSocket singleton: token fetch, connect, message dispatch, auth-rejection guard
// Source: contracts/rest-auth.md; contracts/websocket-messages.md §Message Processing Rule; plan.md §Principle VII

import { CreateSessionResponseSchema } from '../types/session'
import { InboundMessageSchema } from '../types/ws-messages'
import { useAppStore } from '../../store/store'
import type { AudioManager } from './AudioManager'

// ---------------------------------------------------------------------------
// Module-level singleton (created once; replaced on each connect() call)
// ---------------------------------------------------------------------------

let _audioManager: AudioManager | null = null

/**
 * Register the AudioManager with the WebSocketService so binary frames
 * can be forwarded. Called by AudioManager on construction.
 */
export function registerAudioManager(am: AudioManager): void {
  _audioManager = am
}

// ---------------------------------------------------------------------------
// WebSocketService singleton class
// ---------------------------------------------------------------------------

class WebSocketService {
  private ws: WebSocket | null = null
  /** True when disconnect() was called intentionally — suppresses close handler */
  private intentionalClose = false
  /** Number of reconnect attempts made since last successful connection (T048). */
  private attemptCount = 0
  /** Pending reconnect timer handle (T048). */
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  // -------------------------------------------------------------------------
  // Reconnect (T048) — full-jitter exponential backoff
  // -------------------------------------------------------------------------

  /**
   * Schedule a reconnect attempt using full-jitter exponential backoff.
   * delay = random(0, min(30 000 ms, 1000 ms × 2^attempt))
   * After 5 failed attempts the call enters terminal error state.
   */
  private scheduleReconnect(): void {
    const MAX_ATTEMPTS = 5
    const BASE_MS = 1_000
    const CEILING_MS = 30_000

    const { setWsStatus, setCallStatus, setError, incrementReconnect, appendConnectionLog } =
      useAppStore.getState()

    if (this.attemptCount >= MAX_ATTEMPTS) {
      setWsStatus('failed')
      setCallStatus('error')
      setError('Connection lost. Please start a new call.')
      appendConnectionLog({ event: 'failed', timestamp: Date.now() })
      return
    }

    // Full-jitter: random(0, min(ceiling, base * 2^attempt))
    const cap = Math.min(CEILING_MS, BASE_MS * Math.pow(2, this.attemptCount))
    const delay = Math.random() * cap

    this.attemptCount++
    setWsStatus('reconnecting')
    incrementReconnect()
    appendConnectionLog({ event: 'reconnecting', timestamp: Date.now() })

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, delay)
  }

  // -------------------------------------------------------------------------
  // Token fetch
  // -------------------------------------------------------------------------

  /**
   * Fetch a short-lived session token from the backend.
   * The returned token MUST only live in the local scope of `connect()`.
   * Never stored in a class field, Zustand, or localStorage.
   */
  private async fetchSessionToken() {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
    const res = await fetch(`${apiBase}/api/v1/sessions`, { method: 'POST' })
    if (!res.ok) {
      throw new Error(`Session token request failed: ${res.status}`)
    }
    const raw: unknown = await res.json()
    // Throws ZodError on invalid shape — propagated to connect() caller
    return CreateSessionResponseSchema.parse(raw)
  }

  // -------------------------------------------------------------------------
  // connect()
  // -------------------------------------------------------------------------

  /**
   * Obtain a fresh session token then open the WebSocket.
   * T055: if the WebSocket upgrade is rejected with a 4xx HTTP status (401/403)
   * we treat it as a terminal auth failure — no backoff loop.
   */
  async connect(): Promise<void> {
    const { setCallStatus, setError, setWsStatus, appendConnectionLog } = useAppStore.getState()

    setCallStatus('connecting')
    setWsStatus('connecting')

    let session: Awaited<ReturnType<typeof this.fetchSessionToken>>

    try {
      session = await this.fetchSessionToken()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCallStatus('error')
      setError(`Failed to start session: ${msg}`)
      setWsStatus('failed')
      return
    }

    // Persist sessionId so the dashboard route knows which session to load (T047)
    useAppStore.getState().setCallId(session.sessionId)

    // Token lives only in this call frame — never assigned to a class field (Principle VII)
    const wsUrl = `${session.wsUrl}?token=${session.token}`

    this.intentionalClose = false
    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    ws.onopen = () => {
      this.attemptCount = 0 // reset backoff counter on successful connection
      setWsStatus('connected')
      appendConnectionLog({ event: 'connected', timestamp: Date.now() })
      // call_start is sent by useCallSession after connect() resolves
    }

    ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryFrame(event.data)
      } else if (typeof event.data === 'string') {
        this.handleTextFrame(event.data)
      }
    }

    ws.onerror = () => {
      // T055: detect HTTP-level 401/403 on upgrade — WebSocket onerror fires before onclose
      // We cannot read the HTTP status code here; we handle it in onclose via wasClean
    }

    ws.onclose = (event: CloseEvent) => {
      if (this.intentionalClose) return

      // T055: CloseEvent code 4401 / 4403 used by convention for auth rejections
      // RFC 6455 close codes 3000-4999 are application-defined
      if (event.code === 4401 || event.code === 4403 || event.code === 1008) {
        setCallStatus('error')
        setError('Authentication failed. Please retry to start a new call.')
        setWsStatus('failed')
        appendConnectionLog({ event: 'failed', timestamp: Date.now(), wsCloseCode: event.code })
        return
      }

      // Unexpected close — trigger full-jitter exponential backoff reconnect (T048).
      appendConnectionLog({ event: 'disconnected', timestamp: Date.now(), wsCloseCode: event.code })
      this.scheduleReconnect()
    }

    // Return a promise that resolves/rejects when the socket opens or errors
    return new Promise<void>((resolve, reject) => {
      const originalOnOpen = ws.onopen
      ws.onopen = (ev) => {
        if (originalOnOpen) (originalOnOpen as (ev: Event) => void).call(ws, ev)
        resolve()
      }
      const originalOnClose = ws.onclose
      ws.onclose = (ev: CloseEvent) => {
        if (originalOnClose) (originalOnClose as (ev: CloseEvent) => void).call(ws, ev)
        reject(new Error(`WebSocket closed before open: code=${ev.code}`))
      }
      ws.onerror = () => {
        reject(new Error('WebSocket connection error'))
      }
    })
  }

  // -------------------------------------------------------------------------
  // Message handling
  // -------------------------------------------------------------------------

  /** Process a JSON text frame. Validates via Zod before any processing (SC-008). */
  private handleTextFrame(raw: string): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.warn('[WS] Received non-JSON text frame — discarded')
      return
    }

    const result = InboundMessageSchema.safeParse(parsed)
    if (!result.success) {
      console.warn('[WS] Unrecognised message — discarded', result.error.flatten())
      return
    }

    this.dispatch(result.data)
  }

  /** Forward a binary (PCM audio) frame to AudioManager. */
  private handleBinaryFrame(buffer: ArrayBuffer): void {
    if (!_audioManager) {
      console.warn('[WS] Binary frame received but no AudioManager registered')
      return
    }
    _audioManager.enqueue(buffer)
  }

  /** Dispatch a validated inbound message to the appropriate Zustand actions. */
  private dispatch(msg: ReturnType<typeof InboundMessageSchema.parse>): void {
    const store = useAppStore.getState()

    switch (msg.type) {
      case 'call_state': {
        // Map backend state to CallStatus
        store.setCallStatus(msg.state)
        if (msg.state === 'error') {
          store.setError(msg.error ?? 'An unknown error occurred.')
        }
        if (msg.state === 'speaking' && msg.sampleRate != null) {
          _audioManager?.setSampleRate(msg.sampleRate)
        }
        break
      }

      case 'transcript_token': {
        store.appendToken(msg.token)
        break
      }

      case 'transcript_commit': {
        store.commitPartial({
          speaker: msg.speaker,
          text: msg.text,
          timestamp: msg.timestamp,
        })
        break
      }

      case 'audio_stream_end': {
        _audioManager?.onStreamEnd()
        break
      }

      case 'claim': {
        store.pushClaim({
          index: store.dashboard.claims.length,
          text: msg.text,
          speaker: msg.speaker,
          confidence: msg.confidence,
          timestamp: msg.timestamp,
        })
        break
      }

      case 'reminder': {
        store.pushReminder({
          index: store.dashboard.reminders.length,
          text: msg.text,
          dueAt: msg.dueAt ?? null,
        })
        break
      }

      case 'barge_in_ack': {
        // Optional observability log; no state change required
        console.debug('[WS] barge_in_ack received')
        break
      }

      case 'error': {
        store.setCallStatus('error')
        store.setError(msg.message)
        break
      }

      case 'pipeline_state': {
        store.pushPipelineOutput({
          sttText: msg.stt_text ?? null,
          nlu: {
            intent: msg.nlu.intent,
            confidence: msg.nlu.confidence,
            slots: msg.nlu.slots,
          },
          state: {
            slots: msg.state.slots,
            confirmed: msg.state.confirmed,
            turnCount: msg.state.turn_count,
          },
          action: msg.action,
          targetSlot: msg.target_slot ?? null,
          nlgResponse: msg.nlg_response,
          timestamp: Date.now(),
        })
        break
      }

      default:
        break
    }
  }

  // -------------------------------------------------------------------------
  // Outbound send
  // -------------------------------------------------------------------------

  /** Send a JSON message or raw binary frame to the backend. */
  send(data: string | ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    } else {
      console.warn('[WS] send() called but WebSocket is not open')
    }
  }

  /** Send a typed JSON message. */
  sendJson(msg: { type: string; [key: string]: unknown }): void {
    this.send(JSON.stringify(msg))
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Gracefully close the WebSocket without triggering the reconnect path. */
  disconnect(): void {
    this.intentionalClose = true
    // Cancel any pending reconnect timer (T048)
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.attemptCount = 0
    if (this.ws) {
      this.ws.close(1000, 'user_ended_call')
      this.ws = null
    }
    const { setWsStatus, appendConnectionLog } = useAppStore.getState()
    setWsStatus('disconnected')
    appendConnectionLog({ event: 'disconnected', timestamp: Date.now() })
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService()
