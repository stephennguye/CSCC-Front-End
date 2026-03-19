// src/shared/services/AudioManager.ts
// T027 – AI TTS playback queue, barge-in, drain detection
// Source: plan.md §AudioManager; contracts/websocket-messages.md §Binary Audio Frames;
//         quickstart.md §Risk: Memory leaks (OQ-1–OQ-4 resolved)

import { useAppStore } from '../../store/store'
import { registerAudioManager } from './WebSocketService'

// ---------------------------------------------------------------------------
// AudioManager singleton
// ---------------------------------------------------------------------------

export class AudioManager {
  private ctx: AudioContext | null = null
  /** Current sample rate — defaults to 16 kHz to match backend PCM output */
  private sampleRate: number = 16000
  /** Active AudioBufferSourceNodes for gapless scheduling */
  private activeNodes: Set<AudioBufferSourceNode> = new Set()
  /** Next scheduled playback time in AudioContext.currentTime seconds */
  private nextStartTime = 0
  /**
   * Number of enqueued buffers whose onended callback hasn't fired yet.
   * Drain detection: when pendingCount hits 0 AND streamComplete is true → listening.
   */
  private pendingCount = 0
  /**
   * Set to true on audio_stream_end message (WebSocketService calls onStreamEnd).
   * Reset to false at the start of each speaking turn.
   */
  private streamComplete = false

  constructor() {
    // Register with WebSocketService so binary frames are forwarded here
    registerAudioManager(this)
  }

  // -------------------------------------------------------------------------
  // AudioContext management
  // -------------------------------------------------------------------------

  /**
   * Lazily create or return the shared AudioContext.
   * WebRTCService calls this to share the same context for AEC.
   */
  getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
    }
    return this.ctx
  }

  // -------------------------------------------------------------------------
  // Playback
  // -------------------------------------------------------------------------

  /** Update the sample rate for the current speaking turn. */
  setSampleRate(rate: number): void {
    this.sampleRate = rate
    // Reset drain state at the start of each new speaking turn
    this.streamComplete = false
  }

  /**
   * Enqueue a raw PCM Int16 ArrayBuffer for gapless scheduled playback.
   * Interprets the bytes as Int16 mono at `this.sampleRate` — no RIFF header (OQ-1).
   */
  enqueue(buffer: ArrayBuffer): void {
    if (buffer.byteLength === 0) return

    const ctx = this.getAudioContext()

    // Ensure context is running — resume and schedule playback
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.debug('[AudioManager] AudioContext resumed, state:', ctx.state)
      }).catch(console.error)
    }

    const int16 = new Int16Array(buffer)
    if (int16.length === 0) return

    const float32 = new Float32Array(int16.length)
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, this.sampleRate)
    audioBuffer.copyToChannel(float32, 0)

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)

    // Gapless scheduling: queue immediately after the last scheduled chunk
    const now = ctx.currentTime
    const startTime = Math.max(now + 0.01, this.nextStartTime)
    this.nextStartTime = startTime + audioBuffer.duration

    this.pendingCount++

    source.onended = () => {
      this.activeNodes.delete(source)
      this.pendingCount--
      this.checkDrain()
    }

    this.activeNodes.add(source)
    source.start(startTime)

    // Log first frame for debugging
    if (this.pendingCount === 1) {
      console.debug(
        '[AudioManager] First audio frame enqueued:',
        `${int16.length} samples, sampleRate=${this.sampleRate}, ctx.state=${ctx.state}`,
      )
    }
  }

  /**
   * Called by WebSocketService dispatch on `audio_stream_end`.
   * Second gate of drain detection.
   */
  onStreamEnd(): void {
    this.streamComplete = true
    this.checkDrain()
  }

  /**
   * Drain detection: both gates closed → transition to listening.
   */
  private checkDrain(): void {
    if (this.pendingCount === 0 && this.streamComplete) {
      this.streamComplete = false
      this.nextStartTime = 0
      const { setCallStatus } = useAppStore.getState()
      setCallStatus('listening')
    }
  }

  // -------------------------------------------------------------------------
  // Barge-in
  // -------------------------------------------------------------------------

  /**
   * Atomically stop all active playback nodes.
   * Called by useCallSession when VAD detects user speech during AI audio.
   */
  bargeIn(): void {
    for (const node of this.activeNodes) {
      try {
        node.stop()
      } catch {
        // Already stopped — ignore
      }
    }
    this.activeNodes.clear()
    this.pendingCount = 0
    this.streamComplete = false
    this.nextStartTime = 0
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Close the AudioContext. Called when the call ends. */
  stop(): void {
    this.bargeIn()
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(console.error)
      this.ctx = null
    }
  }
}

// Export singleton — created once for the application lifetime
export const audioManager = new AudioManager()
