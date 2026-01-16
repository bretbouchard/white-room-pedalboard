/**
 * WebAudioIntegration Usage Examples
 *
 * This file demonstrates how to use the WebAudioIntegration service
 * with real Web Audio API implementation to replace mock/placeholder logic.
 */

import WebAudioIntegration, {
  type AudioNodeConfig,
  type AudioEffectConfig,
  type MicrophoneConfig,
  type AudioExportConfig
} from './WebAudioIntegration';

// Example 1: Basic Audio Synthesis
export async function basicAudioSynthesis() {
  console.log('🎵 Starting Basic Audio Synthesis Example');

  const webAudio = new WebAudioIntegration();

  if (!webAudio.isAudioSupported()) {
    console.error('Web Audio API not supported');
    return;
  }

  try {
    // Resume audio context (user interaction required)
    await webAudio.resumeContext();

    // Create a simple sine wave oscillator
    const oscillatorConfig: AudioNodeConfig = {
      type: 'sine',
      frequency: 440, // A4 note
      gain: 0.5,
    };

      webAudio.createOscillator('melody1', oscillatorConfig);

    // Start the oscillator
    await webAudio.startOscillator('melody1');

    // Play for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Frequency modulation (vibrato effect)
    let time = 0;
    const vibratoInterval = setInterval(() => {
      time += 0.1;
      const vibrato = Math.sin(time) * 10; // ±10 Hz vibrato
      webAudio.updateOscillatorFrequency('melody1', 440 + vibrato);
    }, 100);

    // Play with vibrato for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear vibrato and stop
    clearInterval(vibratoInterval);
    await webAudio.stopOscillator('melody1');

    console.log('✅ Basic audio synthesis completed successfully');

  } catch (error) {
    console.error('❌ Error in basic audio synthesis:', error);
  } finally {
    webAudio.dispose();
  }
}

// Example 2: Real-time Audio Analysis
export async function realTimeAudioAnalysis() {
  console.log('📊 Starting Real-time Audio Analysis Example');

  const webAudio = new WebAudioIntegration({
    sampleRate: 48000,
    latencyHint: 'interactive',
  });

  try {
    await webAudio.resumeContext();

    // Create multiple oscillators for complex sound
    const oscillators: { id: string; config: AudioNodeConfig }[] = [
      {
        id: 'fundamental',
        config: { type: 'sine', frequency: 220, gain: 0.6 }
      },
      {
        id: 'harmonic2',
        config: { type: 'sine', frequency: 440, gain: 0.3 }
      },
      {
        id: 'harmonic3',
        config: { type: 'sine', frequency: 660, gain: 0.2 }
      }
    ];

    // Create and start all oscillators
    oscillators.forEach(({ id, config }) => {
      webAudio.createOscillator(id, config);
      webAudio.startOscillator(id);
    });

    // Set up real-time analysis
    let analysisCount = 0;
    const analysisInterval = setInterval(() => {
      const analysisData = webAudio.getAnalysisData();

      console.log(`📈 Analysis Frame ${++analysisCount}:`, {
        rms: analysisData.rms.toFixed(4),
        peak: analysisData.peak.toFixed(4),
        spectralCentroid: analysisData.spectralCentroid.toFixed(2),
        zeroCrossingRate: analysisData.zeroCrossingRate.toFixed(4),
        dominantFrequency: getDominantFrequency(analysisData.frequency),
      });

      // Stop after 10 frames
      if (analysisCount >= 10) {
        clearInterval(analysisInterval);
        oscillators.forEach(({ id }) => webAudio.stopOscillator(id));
      }
    }, 500);

    console.log('✅ Real-time audio analysis completed');

  } catch (error) {
    console.error('❌ Error in real-time analysis:', error);
  } finally {
    webAudio.dispose();
  }
}

// Helper function to find dominant frequency
function getDominantFrequency(frequencyData: Uint8Array): number {
  let maxValue = 0;
  let maxIndex = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxValue) {
      maxValue = frequencyData[i];
      maxIndex = i;
    }
  }

  // Convert index to frequency (assuming 44.1kHz sample rate and default FFT size)
  const nyquist = 44100 / 2;
  return (maxIndex / frequencyData.length) * nyquist;
}

// Example 3: Audio Effects Chain
export async function audioEffectsChain() {
  console.log('🎸 Starting Audio Effects Chain Example');

  const webAudio = new WebAudioIntegration();

  try {
    await webAudio.resumeContext();

    // Create base oscillator
    webAudio.createOscillator('guitar', {
      type: 'sawtooth',
      frequency: 82.41, // Low E string
      gain: 0.7,
    });

    // Create effects chain
    const effects: { id: string; config: AudioEffectConfig }[] = [
      {
        id: 'distortion',
        config: {
          type: 'distortion',
          parameters: { amount: 30, oversample: 4 }
        }
      },
      {
        id: 'filter',
        config: {
          type: 'filter',
          parameters: { type: 0, frequency: 2000, Q: 2 }
        }
      },
      {
        id: 'delay',
        config: {
          type: 'delay',
          parameters: { time: 0.2, feedback: 0.3 }
        }
      },
      {
        id: 'reverb',
        config: {
          type: 'reverb',
          parameters: { duration: 1.5, decay: 2.0 }
        }
      }
    ];

    // Create effects
    effects.forEach(({ id, config }) => {
      webAudio.createEffect(id, config);
      console.log(`🎛️ Created ${id} effect`);
    });

    // Start playing
    await webAudio.startOscillator('guitar');

    // Modulate filter cutoff for wah-wah effect
    let filterTime = 0;
    const filterInterval = setInterval(() => {
      filterTime += 0.15;
      const cutoff = 800 + Math.sin(filterTime) * 600; // 200Hz to 1400Hz
      // Note: In real implementation, you'd update the filter node directly
      console.log(`🎛️ Filter cutoff: ${cutoff.toFixed(0)}Hz`);
    }, 150);

    // Play for 4 seconds
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Clean up
    clearInterval(filterInterval);
    await webAudio.stopOscillator('guitar');

    console.log('✅ Audio effects chain completed');

  } catch (error) {
    console.error('❌ Error in audio effects chain:', error);
  } finally {
    webAudio.dispose();
  }
}

// Example 4: Microphone Input and Processing
export async function microphoneInputProcessing() {
  console.log('🎤 Starting Microphone Input Processing Example');

  const webAudio = new WebAudioIntegration();

  try {
    await webAudio.resumeContext();

    // Initialize microphone
    const micConfig: MicrophoneConfig = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: false, // Disable for manual control
      sampleRate: 44100,
    };

    await webAudio.initializeMicrophone(micConfig);
    console.log('🎤 Microphone initialized successfully');

    // Analyze microphone input in real-time
    let micAnalysisCount = 0;
    const micInterval = setInterval(() => {
      const micData = webAudio.getMicrophoneAnalysisData();

      console.log(`🎤 Mic Analysis ${++micAnalysisCount}:`, {
        level: (micData.rms * 100).toFixed(1) + '%',
        peak: (micData.peak * 100).toFixed(1) + '%',
        spectralCentroid: micData.spectralCentroid.toFixed(2) + 'Hz',
      });

      // Stop after 15 frames
      if (micAnalysisCount >= 15) {
        clearInterval(micInterval);
      }
    }, 300);

    // Wait for analysis to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    webAudio.stopMicrophone();
    console.log('✅ Microphone processing completed');

  } catch (error) {
    console.error('❌ Error in microphone processing:', error);
  } finally {
    webAudio.dispose();
  }
}

// Example 5: Audio Recording and Export
export async function audioRecordingExport() {
  console.log('🔴 Starting Audio Recording and Export Example');

  const webAudio = new WebAudioIntegration();

  try {
    await webAudio.resumeContext();

    // Create a simple melody to record
    const melody = [
      { note: 261.63, duration: 500 }, // C4
      { note: 293.66, duration: 500 }, // D4
      { note: 329.63, duration: 500 }, // E4
      { note: 392.00, duration: 500 }, // G4
      { note: 523.25, duration: 1000 }, // C5
    ];

    // Start recording
    const exportConfig: AudioExportConfig = {
      format: 'wav',
      sampleRate: 44100,
      bitDepth: 16,
    };

    await webAudio.startRecording(exportConfig);
    console.log('🔴 Recording started...');

    // Play melody
    for (let i = 0; i < melody.length; i++) {
      const { note, duration } = melody[i];

      webAudio.createOscillator(`note${i}`, {
        type: 'sine',
        frequency: note,
        gain: 0.6,
      });

      await webAudio.startOscillator(`note${i}`);
      await new Promise(resolve => setTimeout(resolve, duration));
      await webAudio.stopOscillator(`note${i}`);
    }

    // Stop recording
    webAudio.stopRecording();
    console.log('⏹️ Recording stopped');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Listen for recording processed event
    webAudio.addEventListener('recordingProcessed', (event: any) => {
      const audioData = event.detail;
      console.log('📁 Recording processed:', {
        duration: audioData.duration.toFixed(2) + 's',
        format: audioData.format,
        sampleRate: audioData.sampleRate + 'Hz',
        channels: audioData.channels,
        size: (audioData.blob.size / 1024).toFixed(2) + 'KB',
        url: audioData.url,
      });

      // Create download link
      const a = document.createElement('a');
      a.href = audioData.url;
      a.download = `recording_${Date.now()}.${audioData.format}`;
      a.click();

      console.log('💾 Download started');
    });

    console.log('✅ Audio recording and export completed');

  } catch (error) {
    console.error('❌ Error in audio recording:', error);
  } finally {
    webAudio.dispose();
  }
}

// Example 6: Interactive Musical Instrument
export async function interactiveInstrument() {
  console.log('🎹 Starting Interactive Musical Instrument Example');

  const webAudio = new WebAudioIntegration();

  try {
    await webAudio.resumeContext();

    // Create multiple oscillators for different voices
    const voices = ['sine', 'square', 'sawtooth', 'triangle'] as const;
    const activeNotes: { [key: string]: boolean } = {};

    // Set up real-time analysis
    const analysisInterval = setInterval(() => {
      const analysis = webAudio.getAnalysisData();

      // Log only if there's active audio
      if (analysis.rms > 0.001) {
        console.log(`🎵 Active Audio - RMS: ${(analysis.rms * 100).toFixed(1)}%`);
      }
    }, 100);

    // Keyboard mapping (simulate keyboard input)
    const keyboardMap: { [key: string]: number } = {
      'a': 261.63, // C4
      's': 293.66, // D4
      'd': 329.63, // E4
      'f': 349.23, // F4
      'g': 392.00, // G4
      'h': 440.00, // A4
      'j': 493.88, // B4
      'k': 523.25, // C5
    };

    // Simulate playing a sequence of notes
    const noteSequence = ['c', 'e', 'g', 'c', 'e', 'g', 'b', 'c'];
    let noteIndex = 0;

    const playNextNote = async () => {
      if (noteIndex >= noteSequence.length) {
        clearInterval(analysisInterval);
        console.log('✅ Interactive instrument sequence completed');
        return;
      }

      const note = noteSequence[noteIndex];
      const frequency = keyboardMap[note];
      const voice = voices[noteIndex % voices.length];

      if (frequency && !activeNotes[note]) {
        activeNotes[note] = true;

        // Create and start note
        webAudio.createOscillator(`note_${note}`, {
          type: voice,
          frequency: frequency,
          gain: 0.5,
        });

        await webAudio.startOscillator(`note_${note}`);
        console.log(`🎹 Playing note ${note.toUpperCase()} (${frequency.toFixed(2)}Hz) with ${voice} wave`);

        // Stop note after 300ms
        setTimeout(async () => {
          await webAudio.stopOscillator(`note_${note}`);
          delete activeNotes[note];

          // Play next note
          noteIndex++;
          setTimeout(playNextNote, 50);
        }, 300);
      }
    };

    // Start playing sequence
    playNextNote();

  } catch (error) {
    console.error('❌ Error in interactive instrument:', error);
  } finally {
    // Don't dispose immediately to allow for interaction
    setTimeout(() => {
      webAudio.dispose();
      console.log('🧹 Interactive instrument cleaned up');
    }, 10000);
  }
}

// Example 7: Advanced Audio Worklet Integration (if supported)
export async function audioWorkletIntegration() {
  console.log('🔧 Starting Audio Worklet Integration Example');

  const webAudio = new WebAudioIntegration();

  try {
    await webAudio.resumeContext();

    // Note: This would require actual worklet files to work
    // For demonstration purposes only
    try {
      const worklet = await webAudio.loadAudioWorklet({
        name: 'custom-processor',
        processorUrl: '/audio-worklets/custom-processor.js',
        parameters: {
          parameter1: 0.5,
          parameter2: 1000,
        },
      });

      console.log('🔧 Audio worklet loaded successfully');

      // In real implementation, you would connect the worklet to audio graph
      // worklet.connect(webAudio.getMasterGain());

    } catch (error) {
      console.log('ℹ️ Audio worklet not available (expected in this demo environment)');
    }

    console.log('✅ Audio worklet integration example completed');

  } catch (error) {
    console.error('❌ Error in audio worklet integration:', error);
  } finally {
    webAudio.dispose();
  }
}

// Export all examples
export const examples = {
  basicAudioSynthesis,
  realTimeAudioAnalysis,
  audioEffectsChain,
  microphoneInputProcessing,
  audioRecordingExport,
  interactiveInstrument,
  audioWorkletIntegration,
};

// Run all examples in sequence (for testing)
export async function runAllExamples() {
  console.log('🚀 Running all WebAudioIntegration examples...\n');

  try {
    await basicAudioSynthesis();
    console.log('\n' + '='.repeat(50) + '\n');

    await realTimeAudioAnalysis();
    console.log('\n' + '='.repeat(50) + '\n');

    await audioEffectsChain();
    console.log('\n' + '='.repeat(50) + '\n');

    // Note: Microphone example requires user permission, so we'll skip it in automated testing
    console.log('🎤 Skipping microphone example (requires user permission)');
    console.log('\n' + '='.repeat(50) + '\n');

    await audioRecordingExport();
    console.log('\n' + '='.repeat(50) + '\n');

    await interactiveInstrument();
    console.log('\n' + '='.repeat(50) + '\n');

    await audioWorkletIntegration();

    console.log('\n🎉 All examples completed successfully!');

  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// If this file is run directly, execute all examples
if (typeof window === 'undefined' && require.main === module) {
  runAllExamples();
}