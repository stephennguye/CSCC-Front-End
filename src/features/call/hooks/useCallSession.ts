import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../../../store/store'
import { webSocketService } from '../../../shared/services/WebSocketService'
import { webRTCService } from '../../../shared/services/WebRTCService'
import { audioManager } from '../../../shared/services/AudioManager'

export interface UseCallSessionReturn {
  startCall: () => Promise<void>
  endCall: () => void
}

/**
 * Orchestrates the three service singletons for a voice call session.
 *
 * Design notes:
 * - `startCall` is idempotent — ignored if a call is already active.
 * - `endCall` sends call_end, disconnects WS, and tears down audio.
 * - React 19 Strict Mode double-mount: cleanup() guard via `cleanedUpRef`.
 */
export function useCallSession(): UseCallSessionReturn {
  const vadActive = useAppStore((s) => s.audio.vadActive)
  const callStatus = useAppStore((s) => s.call.status)

  // Track whether the component has been unmounted so async operations
  // don't dispatch against a dead component (React 19 Strict Mode safety)
  const cleanedUpRef = useRef(false)
  const activeRef = useRef(false)

  // Wire WebRTCService ↔ AudioManager once on mount so they share an AudioContext
  useEffect(() => {
    webRTCService.setAudioManager(audioManager)
  }, [])

  // Barge-in: when VAD becomes active while AI is speaking, interrupt audio
  useEffect(() => {
    if (vadActive && callStatus === 'speaking') {
      audioManager.bargeIn()
      webSocketService.sendJson({ type: 'barge_in' })
    }
  }, [vadActive, callStatus])

  // Cleanup on unmount
  useEffect(() => {
    cleanedUpRef.current = false
    return () => {
      cleanedUpRef.current = true
      activeRef.current = false
    }
  }, [])

  const startCall = useCallback(async () => {
    const { call } = useAppStore.getState()
    if (call.status !== 'idle' && call.status !== 'ended' && call.status !== 'error') {
      return
    }

    activeRef.current = true
    cleanedUpRef.current = false

    try {
      await webSocketService.connect()

      if (cleanedUpRef.current) return

      // Notify backend that the call has started
      webSocketService.sendJson({ type: 'call_start' })

      // Start microphone capture after WS is open
      await webRTCService.requestMic()
    } catch (err) {
      if (!cleanedUpRef.current) {
        const { setCallStatus, setError } = useAppStore.getState()
        setCallStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    }
  }, [])

  const endCall = useCallback(() => {
    activeRef.current = false

    // Send call_end before closing the socket
    if (webSocketService.isConnected) {
      webSocketService.sendJson({ type: 'call_end' })
    }

    // Tear down services
    webRTCService.stop()
    audioManager.stop()
    webSocketService.disconnect()

    const { setCallStatus, resetPipeline, setVadActive, clearTranscript, resetConnection } = useAppStore.getState()
    // Reset VAD state so it doesn't leak into the next call
    setVadActive(false)
    // Reset pipeline visualization state
    resetPipeline()
    // Reset transcript and connection state
    clearTranscript()
    resetConnection()
    // Only transition to ended if we were in an active call state
    const currentStatus = useAppStore.getState().call.status
    if (
      currentStatus !== 'idle' &&
      currentStatus !== 'ended' &&
      currentStatus !== 'error'
    ) {
      setCallStatus('ended')
    }
  }, [])

  return { startCall, endCall }
}
