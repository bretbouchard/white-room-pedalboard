/**
 * Audio Worklet Processor for Real-time Audio Processing
 * Handles low-latency audio processing and analysis
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.bufferSize = options.processorOptions.bufferSize || 512;
    this.inputChannels = options.processorOptions.inputChannels || 2;
    this.outputChannels = options.processorOptions.outputChannels || 2;

    // Analysis state
    this.analysisData = {
      peak: 0,
      rms: 0,
      lufs: -60,
      spectrum: new Float32Array(1024),
    };

    // Processing state
    this.isPlaying = false;
    this.currentTime = 0;

    console.log('AudioProcessor initialized:', {
      bufferSize: this.bufferSize,
      inputChannels: this.inputChannels,
      outputChannels: this.outputChannels,
    });
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !output) {
      return true; // Continue processing
    }

    // Process each channel
    for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      if (inputChannel && outputChannel) {
        // Process audio samples
        for (let i = 0; i < inputChannel.length; i++) {
          // Pass through audio with optional processing
          outputChannel[i] = this.processSample(inputChannel[i], channel, i);
        }
      }
    }

    // Update time
    this.currentTime += this.bufferSize / sampleRate;

    // Perform analysis periodically
    if (this.currentTime % (this.bufferSize * 10) < this.bufferSize) {
      this.performAnalysis(input);
    }

    return true; // Continue processing
  }

  processSample(sample, channel, sampleIndex) {
    // Basic processing - pass through
    // In a real implementation, this would apply effects, processing, etc.
    return sample;
  }

  performAnalysis(input) {
    if (!input || !input[0]) return;

    const channel = input[0];
    let sum = 0;
    let peak = 0;
    let squaredSum = 0;

    // Calculate RMS and peak
    for (let i = 0; i < channel.length; i++) {
      const sample = Math.abs(channel[i]);
      sum += sample;
      squaredSum += channel[i] * channel[i];
      peak = Math.max(peak, sample);
    }

    const rms = Math.sqrt(squaredSum / channel.length);

    // Calculate LUFS (simplified)
    let lufs = -60;
    if (rms > 0) {
      lufs = -0.691 + 10 * Math.log10(rms * rms);
    }

    // Update analysis data
    this.analysisData = {
      peak: peak,
      rms: rms,
      lufs: lufs,
      spectrum: this.analysisData.spectrum, // Would be calculated with FFT
    };

    // Send analysis data to main thread
    this.port.postMessage({
      type: 'analysis',
      data: {
        ...this.analysisData,
        currentTime: this.currentTime,
      },
    });
  }

  // Handle messages from main thread
  handleMessage(event) {
    switch (event.data.type) {
      case 'play':
        this.isPlaying = true;
        break;
      case 'stop':
        this.isPlaying = false;
        this.currentTime = 0;
        break;
      case 'pause':
        this.isPlaying = false;
        break;
      case 'seek':
        this.currentTime = event.data.time;
        break;
      case 'setParameter':
        // Handle parameter changes
        this.handleParameterChange(event.data.nodeId, event.data.parameter, event.data.value);
        break;
      default:
        console.log('Unknown message:', event.data);
    }
  }

  handleParameterChange(nodeId, parameter, value) {
    // Handle parameter changes for audio processing
    // This would affect the processing in processSample()
    console.log(`Parameter change: ${nodeId}.${parameter} = ${value}`);
  }
}

registerProcessor('audio-processor', AudioProcessor);