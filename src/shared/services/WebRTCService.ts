// src/shared/services/WebRTCService.ts
// T026 – Microphone capture via AudioWorklet, PCM forwarding to WebSocketService
// Source: plan.md §WebRTCService; quickstart.md §Risk: WebRTC permission failure

import { useAppStore } from '../../store/store'
import { webSocketService } from './WebSocketService'
import type { AudioManager } from './AudioManager'

class WebRTCService {
  private stream: MediaStream | null = null
  private workletNode: AudioWorkletNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  /** Reference to AudioManager so we share a single AudioContext */
  private audioManager: AudioManager | null = null

  /**
   * Register the shared AudioManager. Must be called before requestMic()
   * so the mic capture graph and AI playback graph share one AudioContext.
   */
  setAudioManager(am: AudioManager): void {
    this.audioManager = am
  }

  /**
   * Request microphone access, register the PCM worklet, and start sending
   * 320-sample (20 ms) Int16 frames over the WebSocket.
   *
   * On NotAllowedError: dispatches setCallStatus('error') with an actionable
   * user-facing message.
   */
  async requestMic(): Promise<void> {
    const { setCallStatus, setError } = useAppStore.getState()

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setCallStatus('error')
        setError('Microphone access was denied. Please allow microphone access in your browser settings and try again.')
      } else {
        setCallStatus('error')
        setError('Could not access microphone. Please check your device settings.')
      }
      return
    }

    // Use the shared AudioContext from AudioManager if available,
    // otherwise create a new one. Sharing is required for browser AEC.
    const ctx = this.audioManager?.getAudioContext() ?? new AudioContext({ sampleRate: 16000 })

    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    try {
      await ctx.audioWorklet.addModule(
        new URL('../../audio/pcm-processor.worklet.ts', import.meta.url),
      )
    } catch (err) {
      console.error('[WebRTC] Failed to load AudioWorklet:', err)
      setCallStatus('error')
      setError('Audio processor failed to load. Please refresh and try again.')
      this.stop()
      return
    }

    this.workletNode = new AudioWorkletNode(ctx, 'pcm-processor')
    this.sourceNode = ctx.createMediaStreamSource(this.stream)

    // Forward Int16Array buffers from the worklet to WebSocketService
    this.workletNode.port.onmessage = (event: MessageEvent<Int16Array>) => {
      const int16 = event.data
      // AudioWorklet always transfers a plain ArrayBuffer (not SharedArrayBuffer)
      webSocketService.send(int16.buffer as ArrayBuffer)
    }

    this.sourceNode!.connect(this.workletNode)
    // Do not connect workletNode to ctx.destination — we only capture, not play mic audio
  }

  /**
   * Disconnect all audio graph nodes and stop the media stream.
   * Leaves the AudioContext open (owned by AudioManager).
   */
  stop(): void {
    this.workletNode?.disconnect()
    this.sourceNode?.disconnect()
    this.workletNode = null
    this.sourceNode = null

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
  }

  get isActive(): boolean {
    return this.stream !== null && this.stream.getTracks().some((t) => t.readyState === 'live')
  }
}

export const webRTCService = new WebRTCService()
