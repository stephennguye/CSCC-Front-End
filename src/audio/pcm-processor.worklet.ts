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


const FRAME_SIZE = 320 // samples per 20 ms frame at 16kHz

class PcmProcessor extends AudioWorkletProcessor {
  private _buffer: Int16Array = new Int16Array(FRAME_SIZE)
  private _writePos: number = 0

  process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>,
  ): boolean {
    const input = inputs[0]
    if (!input || input.length === 0) return true

    // Use first (mono) channel
    const channel = input[0]
    if (!channel) return true

    for (let i = 0; i < channel.length; i++) {
      // Clamp float sample to [-1.0, 1.0] and convert to 16-bit signed integer
      const sample = Math.max(-1, Math.min(1, channel[i]))
      this._buffer[this._writePos++] = sample < 0
        ? sample * 0x8000
        : sample * 0x7fff

      if (this._writePos >= FRAME_SIZE) {
        // Post a copy (transfer ownership for zero-copy)
        const frame = this._buffer.slice(0)
        this.port.postMessage(frame, [frame.buffer])
        this._writePos = 0
      }
    }

    return true // keep processor alive
  }
}

registerProcessor('pcm-processor', PcmProcessor)
