declare class AudioWorkletProcessor {
  readonly port: MessagePort
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean
}
declare function registerProcessor(
  name: string,
  processorCtor: { new(): AudioWorkletProcessor; prototype: AudioWorkletProcessor },
): void
declare const sampleRate: number // AudioContext.sampleRate, available in worklet scope


// ── Target format: 16 kHz mono PCM16 ───────────────────────────────────────
const TARGET_RATE = 16000
const FRAME_SIZE = 320 // 320 samples = 20 ms at 16 kHz

// ── VAD configuration ───────────────────────────────────────────────────────
const VAD_ENERGY_THRESHOLD = 0.015   // RMS threshold for "speech" (rejects AC/fan noise but allows normal voice)
const VAD_SPEECH_MIN_FRAMES = 10     // ~200ms of sustained speech to trigger start
const VAD_SILENCE_TIMEOUT_FRAMES = 80 // ~1600ms of silence to trigger end (allows natural pauses mid-sentence)
const VAD_COOLDOWN_FRAMES = 75        // ~1500ms cooldown after vad_end before next can fire

class PcmProcessor extends AudioWorkletProcessor {
  private _buffer: Int16Array = new Int16Array(FRAME_SIZE)
  private _writePos: number = 0

  // Resampling state — accumulate fractional samples
  private _resampleAccum: number = 0

  // VAD state
  private _speechFrames: number = 0
  private _silenceFrames: number = 0
  private _isSpeaking: boolean = false
  private _cooldownFrames: number = 0  // frames remaining in cooldown after vad_end

  // Amplitude throttle — only post every N calls (~100ms)
  private _ampCounter: number = 0

  process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>,
  ): boolean {
    const input = inputs[0]
    if (!input || input.length === 0) return true

    const channel = input[0]
    if (!channel) return true

    // ── Compute RMS energy for VAD ────────────────────────────────────────
    let sumSquares = 0
    for (let i = 0; i < channel.length; i++) {
      sumSquares += channel[i] * channel[i]
    }
    const rms = Math.sqrt(sumSquares / channel.length)

    // ── Post amplitude (throttled to ~20 Hz) ──────────────────────────────
    this._ampCounter++
    if (this._ampCounter >= 8) {
      this._ampCounter = 0
      this.port.postMessage({ type: 'amplitude', value: rms })
    }

    // ── VAD state machine ─────────────────────────────────────────────────
    if (this._cooldownFrames > 0) {
      this._cooldownFrames--
    }

    const isSpeechFrame = rms > VAD_ENERGY_THRESHOLD

    if (isSpeechFrame) {
      this._speechFrames++
      this._silenceFrames = 0

      if (!this._isSpeaking && this._speechFrames >= VAD_SPEECH_MIN_FRAMES && this._cooldownFrames <= 0) {
        this._isSpeaking = true
        this._resampleAccum = 0  // Reset resampler at speech boundary
        this._writePos = 0       // Reset PCM buffer
        this.port.postMessage({ type: 'vad_start' })
      }
    } else {
      this._speechFrames = 0

      if (this._isSpeaking) {
        this._silenceFrames++

        if (this._silenceFrames >= VAD_SILENCE_TIMEOUT_FRAMES) {
          this._isSpeaking = false
          this._silenceFrames = 0
          this._cooldownFrames = VAD_COOLDOWN_FRAMES
          this.port.postMessage({ type: 'vad_end' })
        }
      }
    }

    // ── Resample to 16 kHz and encode PCM16 ───────────────────────────────
    // The AudioContext may run at 44.1/48 kHz. We downsample by stepping
    // through the input at intervals of (nativeRate / targetRate).
    if (!this._isSpeaking) return true  // skip encoding when not speaking

    const ratio = sampleRate / TARGET_RATE // e.g. 48000/16000 = 3.0

    for (let i = 0; i < channel.length; i++) {
      this._resampleAccum += 1
      if (this._resampleAccum >= ratio) {
        this._resampleAccum -= ratio

        const sample = Math.max(-1, Math.min(1, channel[i]))
        this._buffer[this._writePos++] = sample < 0
          ? sample * 0x8000
          : sample * 0x7fff

        if (this._writePos >= FRAME_SIZE) {
          const frame = this._buffer.slice(0)
          this.port.postMessage({ type: 'pcm', data: frame }, [frame.buffer])
          this._writePos = 0
        }
      }
    }

    return true
  }
}

registerProcessor('pcm-processor', PcmProcessor)
