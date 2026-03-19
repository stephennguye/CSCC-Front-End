// src/shared/services/WebRTCService.ts
// T026 – Microphone capture via AudioWorklet, PCM forwarding to WebSocketService
// + VAD-driven audio.end signaling for STT pipeline trigger

import { useAppStore } from '../../store/store'
import { webSocketService } from './WebSocketService'
import type { AudioManager } from './AudioManager'

class WebRTCService {
  private stream: MediaStream | null = null
  private workletNode: AudioWorkletNode | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private audioManager: AudioManager | null = null

  setAudioManager(am: AudioManager): void {
    this.audioManager = am
  }

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

    // Handle messages from the AudioWorklet (PCM frames + VAD events)
    this.workletNode.port.onmessage = (event: MessageEvent) => {
      const msg = event.data

      if (msg?.type === 'pcm') {
        // Send raw PCM audio bytes to backend via WebSocket binary frame
        const int16: Int16Array = msg.data
        webSocketService.send(int16.buffer as ArrayBuffer)
        return
      }

      if (msg?.type === 'vad_start') {
        // User started speaking — update store and notify backend
        console.debug('[VAD] Speech started')
        useAppStore.getState().setVadActive(true)
        return
      }

      if (msg?.type === 'vad_end') {
        // User stopped speaking — send audio_end to trigger STT pipeline
        console.debug('[VAD] Speech ended — sending audio_end')
        useAppStore.getState().setVadActive(false)
        webSocketService.sendJson({ type: 'audio_end' })
        return
      }

      if (msg?.type === 'amplitude') {
        useAppStore.getState().setAmplitude(msg.value)
        return
      }

      // Legacy: plain Int16Array (backward compat if worklet doesn't use typed messages)
      if (msg instanceof Int16Array) {
        webSocketService.send(msg.buffer as ArrayBuffer)
      }
    }

    this.sourceNode!.connect(this.workletNode)
  }

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
