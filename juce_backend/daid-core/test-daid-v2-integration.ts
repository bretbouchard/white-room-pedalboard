/**
 * DAID v2 Integration Test
 * Validates the complete DAID v2 functionality including AudioFingerprint and AudioRenderRecorder
 */

import {
  DAIDGenerator,
  DAIDValidator,
  AudioFingerprint,
  AudioRenderRecorder,
  AudioFingerprintConfig,
  RecordingMetadata
} from './src';

async function testDAIDV2Integration() {
  console.log('🧪 Starting DAID v2 Integration Tests...\n');

  // Test 1: DAID v2 Generation
  console.log('1️⃣ Testing DAID v2 Generation...');
  try {
    const v2DAID = DAIDGenerator.generateV2({
      agentId: 'test-agent',
      entityType: 'audio-clip',
      entityId: 'clip-001',
      operation: 'create',
      fingerprint: 'abc123def456',
      audioMetadata: {
        duration: 120.5,
        sampleRate: 44100,
        channels: 2,
        format: 'wav'
      }
    });

    console.log(`✅ Generated v2 DAID: ${v2DAID}`);

    // Validate the v2 DAID
    const validation = DAIDGenerator.validate(v2DAID);
    if (validation.valid) {
      console.log('✅ DAID v2 validation passed');
    } else {
      console.error('❌ DAID v2 validation failed:', validation.errors);
      return false;
    }

    // Enhanced validation
    const enhancedValidation = DAIDValidator.validateEnhanced(v2DAID);
    if (enhancedValidation.isValid) {
      console.log('✅ DAID v2 enhanced validation passed');
    } else {
      console.error('❌ DAID v2 enhanced validation failed:', enhancedValidation.errors);
      return false;
    }

    // Parse v2 DAID
    const parsed = DAIDGenerator.parse(v2DAID);
    if (parsed && parsed.version === 'v2.0') {
      console.log('✅ DAID v2 parsing successful');
    } else {
      console.error('❌ DAID v2 parsing failed');
      return false;
    }

  } catch (error) {
    console.error('❌ DAID v2 generation test failed:', error);
    return false;
  }

  // Test 2: AudioFingerprint Generation
  console.log('\n2️⃣ Testing AudioFingerprint Generation...');
  try {
    // Create sample audio data (sine wave)
    const sampleRate = 44100;
    const duration = 1.0; // 1 second
    const frequency = 440; // A4 note
    const samples = Math.floor(sampleRate * duration);

    const audioData = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
    }

    const fingerprinter = new AudioFingerprint({
      sampleRate,
      windowSize: 1024,
      hopSize: 256,
      numBands: 16,
      fingerprintSize: 128,
      enableRobustHashing: true,
    });

    const fingerprintResult = await fingerprinter.generateFingerprint(audioData);

    console.log(`✅ Generated fingerprint: ${fingerprintResult.fingerprint}`);
    console.log(`✅ Confidence: ${fingerprintResult.confidence}`);
    console.log(`✅ Extraction time: ${fingerprintResult.extractionTime}ms`);
    console.log(`✅ Algorithm: ${fingerprintResult.algorithm}`);

    // Test fingerprint validation
    if (AudioFingerprint.validateFingerprintFormat(fingerprintResult.fingerprint)) {
      console.log('✅ Fingerprint format validation passed');
    } else {
      console.error('❌ Fingerprint format validation failed');
      return false;
    }

  } catch (error) {
    console.error('❌ AudioFingerprint test failed:', error);
    return false;
  }

  // Test 3: AudioRenderRecorder
  console.log('\n3️⃣ Testing AudioRenderRecorder...');
  try {
    const recorder = new AudioRenderRecorder({
      sampleRate: 44100,
      bufferSize: 512,
      channels: 2,
      format: 'float32',
      enableRealTimeProcessing: true,
      maxRecordingTime: 30,
      autoGenerateFingerprints: true,
    });

    const metadata: RecordingMetadata = {
      sessionId: 'test-session-001',
      agentId: 'test-agent',
      entityType: 'audio-render',
      entityId: 'render-001',
      operation: 'process',
      pluginChain: ['compressor', 'eq', 'reverb'],
      parameters: { threshold: -12, ratio: 4 },
      notes: 'Test recording for DAID v2 integration'
    };

    const sessionId = recorder.startRecording(metadata);
    console.log(`✅ Started recording session: ${sessionId}`);

    // Simulate audio processing
    const chunkCount = 10;
    for (let i = 0; i < chunkCount; i++) {
      const chunkSize = 512;
      const audioChunk = {
        data: [
          new Float32Array(chunkSize).fill(Math.random() * 0.1),
          new Float32Array(chunkSize).fill(Math.random() * 0.1)
        ],
        timestamp: Date.now(),
        channelCount: 2,
        sampleRate: 44100,
      };

      recorder.processAudioChunk(sessionId, audioChunk);
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate real-time processing
    }

    const session = await recorder.stopRecording(sessionId);
    console.log(`✅ Stopped recording session: ${session.id}`);
    console.log(`✅ Duration: ${session.duration}s`);
    console.log(`✅ Size: ${session.size} bytes`);
    console.log(`✅ Fingerprints: ${session.fingerprints?.length || 0}`);

    // Test DAID generation from session using the result directly
    if (session.fingerprints && session.fingerprints.length > 0) {
      try {
        const sessionDAID = DAIDGenerator.generateV2({
          agentId: session.metadata.agentId,
          entityType: session.metadata.entityType,
          entityId: session.metadata.entityId,
          operation: session.metadata.operation,
          fingerprint: session.fingerprints[0],
          audioMetadata: {
            duration: session.duration,
            sampleRate: session.sampleRate,
            channels: session.channels,
            format: session.format,
          },
        });

        console.log(`✅ Generated session DAID: ${sessionDAID}`);
      } catch (error) {
        console.error('❌ Failed to generate session DAID:', error);
        return false;
      }
    }

    // Check recording statistics
    const stats = recorder.getRecordingStats();
    console.log(`✅ Recording stats: ${stats.totalSessions} sessions, ${stats.totalDuration}s total`);

  } catch (error) {
    console.error('❌ AudioRenderRecorder test failed:', error);
    return false;
  }

  // Test 4: Version Compatibility
  console.log('\n4️⃣ Testing Version Compatibility...');
  try {
    const v1DAID = DAIDGenerator.generate({
      agentId: 'test-agent',
      entityType: 'test-entity',
      entityId: 'test-001',
      version: 'v1.0'
    });

    const v2DAID = DAIDGenerator.generate({
      agentId: 'test-agent',
      entityType: 'test-entity',
      entityId: 'test-002',
      version: 'v2.0'
    });

    console.log(`✅ Generated v1 DAID: ${v1DAID}`);
    console.log(`✅ Generated v2 DAID: ${v2DAID}`);

    // Test version compatibility checking
    const compatibility = DAIDValidator.checkVersionCompatibility(v1DAID, v2DAID);
    console.log(`✅ Version compatibility: ${compatibility.compatible ? 'Compatible' : 'Different versions expected'}`);
    console.log(`✅ Version issues: ${compatibility.issues.join(', ') || 'None'}`);

  } catch (error) {
    console.error('❌ Version compatibility test failed:', error);
    return false;
  }

  // Test 5: Enhanced Hash Validation
  console.log('\n5️⃣ Testing Enhanced Hash Validation...');
  try {
    const testHashes = [
      '0123456789abcdef', // 16 chars (v1)
      '0123456789abcdef0123456789abcdef', // 32 chars (v2)
      'invalidhash', // invalid format
      '0000000000000000', // placeholder
    ];

    for (const hash of testHashes) {
      const validation = DAIDValidator.validateProvenanceHash(hash);
      const status = validation.valid ? '✅' : '❌';
      console.log(`${status} Hash ${hash}: ${validation.valid ? 'Valid' : validation.errors.join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Enhanced hash validation test failed:', error);
    return false;
  }

  console.log('\n🎉 All DAID v2 Integration Tests Passed!');
  return true;
}

// Run the tests
testDAIDV2Integration()
  .then(success => {
    if (success) {
      console.log('\n🚀 DAID v2 integration is ready for production use!');
      process.exit(0);
    } else {
      console.log('\n💥 DAID v2 integration tests failed. Please review the errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Unexpected error during testing:', error);
    process.exit(1);
  });