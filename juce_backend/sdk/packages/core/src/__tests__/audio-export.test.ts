/**
 * Tests for Audio Export System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioExportEngine } from '../audio-export';

describe('Audio Export System', () => {
  let exportEngine: AudioExportEngine;
  let testComposition: any;

  beforeEach(() => {
    exportEngine = new AudioExportEngine();

    testComposition = {
      duration: 120, // 2 minutes
      metadata: {
        title: 'Test Composition',
        artist: 'Test Artist',
        composer: 'Test Composer',
        genre: 'Classical',
        tempo: 120,
        key: 'C major',
        timeSignature: '4/4',
        tags: ['test', 'classical']
      },
      sections: [
        {
          name: 'Introduction',
          duration: 30,
          instruments: ['Piano', 'Strings']
        },
        {
          name: 'Development',
          duration: 60,
          instruments: ['Piano', 'Strings', 'Woodwinds']
        },
        {
          name: 'Conclusion',
          duration: 30,
          instruments: ['Piano', 'Strings']
        }
      ]
    };
  });

  afterEach(() => {
    exportEngine = null as any;
  });

  describe('Format Support', () => {
    it('should provide comprehensive format support', () => {
      const allFormats = exportEngine.getSupportedFormats();
      expect(allFormats.length).toBeGreaterThan(10);

      const audioFormats = exportEngine.getSupportedFormats('audio');
      const midiFormats = exportEngine.getSupportedFormats('midi');
      const notationFormats = exportEngine.getSupportedFormats('notation');
      const projectFormats = exportEngine.getSupportedFormats('project');

      expect(audioFormats.length).toBeGreaterThan(4);
      expect(midiFormats.length).toBeGreaterThan(1);
      expect(notationFormats.length).toBeGreaterThan(1);
      expect(projectFormats.length).toBeGreaterThan(0);

      // Check for essential formats
      const formatIds = allFormats.map(f => f.id);
      expect(formatIds).toContain('wav');
      expect(formatIds).toContain('mp3');
      expect(formatIds).toContain('flac');
      expect(formatIds).toContain('midi-1');
      expect(formatIds).toContain('musicxml');
    });

    it('should have proper format metadata', () => {
      const wavFormat = exportEngine.getSupportedFormats('audio').find(f => f.id === 'wav');
      expect(wavFormat).toBeDefined();
      expect(wavFormat!.name).toBe('WAV');
      expect(wavFormat!.extension).toBe('wav');
      expect(wavFormat!.category).toBe('audio');
      expect(wavFormat!.quality).toBe('lossless');
      expect(wavFormat!.capabilities).toContain('high-quality');
    });
  });

  describe('Audio Export', () => {
    it('should export to WAV format', async () => {
      const options = {
        format: 'wav' as const,
        sampleRate: 48000 as const,
        bitDepth: 24 as const,
        channels: 2 as const,
        quality: 'lossless' as const,
        normalization: true,
        dithering: true,
        headroom: -3
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'wav', options);
      expect(exportId).toBeDefined();
      expect(typeof exportId).toBe('string');
      expect(exportId).toMatch(/^export_\d+_[a-z0-9]+$/);

      // Check initial progress
      let progress = exportEngine.getExportProgress(exportId);
      expect(progress).toBeDefined();
      expect(progress!.status).toBe('queued');
      expect(progress!.progress).toBe(0);
    });

    it('should export to MP3 format', async () => {
      const options = {
        format: 'mp3' as const,
        sampleRate: 44100 as const,
        bitDepth: 16 as const,
        channels: 2 as const,
        quality: 'medium' as const,
        bitrate: 192,
        normalization: true,
        dithering: false,
        headroom: -1
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'mp3', options);
      expect(exportId).toBeDefined();

      const progress = exportEngine.getExportProgress(exportId);
      expect(progress).toBeDefined();
      expect(progress!.status).toMatch(/^(queued|processing)$/);
    });

    it('should export to FLAC format', async () => {
      const options = {
        format: 'flac' as const,
        sampleRate: 96000 as const,
        bitDepth: 24 as const,
        channels: 2 as const,
        quality: 'lossless' as const,
        normalization: true,
        dithering: true,
        headroom: -6
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'flac', options);
      expect(exportId).toBeDefined();
    });
  });

  describe('MIDI Export', () => {
    it('should export to MIDI Type 1 format', async () => {
      const options = {
        format: 1 as const,
        resolution: 480,
        tempoMap: true,
        velocityScaling: true,
        noteOffVelocity: false,
        controllerData: true,
        metadata: {
          title: testComposition.metadata.title,
          composer: testComposition.metadata.composer,
          copyright: '© 2024 Test Composer',
          keySignature: testComposition.metadata.key,
          timeSignature: testComposition.metadata.timeSignature,
          tempo: testComposition.metadata.tempo,
          comments: 'Generated with Schillinger SDK'
        }
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'midi-1', options);
      expect(exportId).toBeDefined();

      const progress = exportEngine.getExportProgress(exportId);
      expect(progress).toBeDefined();
    });
  });

  describe('Notation Export', () => {
    it('should export to MusicXML format', async () => {
      const options = {
        format: 'musicxml' as const,
        layout: 'portrait' as const,
        pageSize: 'a4' as const,
        staffSize: 14,
        measureNumbers: true,
        chordSymbols: true,
        lyrics: false,
        dynamics: true,
        articulations: true,
        rehearsalMarks: false,
        transposition: 0
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'musicxml', options);
      expect(exportId).toBeDefined();
    });

    it('should export to PDF score format', async () => {
      const options = {
        format: 'pdf' as const,
        layout: 'landscape' as const,
        pageSize: 'letter' as const,
        staffSize: 12,
        measureNumbers: true,
        chordSymbols: true,
        lyrics: false,
        dynamics: true,
        articulations: true,
        rehearsalMarks: true,
        transposition: 0
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'pdf-score', options);
      expect(exportId).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    it('should track export progress accurately', async () => {
      const options = {
        format: 'wav' as const,
        sampleRate: 48000 as const,
        bitDepth: 24 as const,
        channels: 2 as const,
        quality: 'lossless' as const,
        normalization: true,
        dithering: true,
        headroom: -3
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'wav', options);

      // Wait a bit and check progress
      await new Promise(resolve => setTimeout(resolve, 200));

      const progress = exportEngine.getExportProgress(exportId);
      expect(progress).toBeDefined();
      expect(progress!.progress).toBeGreaterThanOrEqual(0);
      expect(progress!.progress).toBeLessThanOrEqual(100);
      expect(progress!.stage).toBeDefined();
      expect(progress!.estimatedTimeRemaining).toBeGreaterThan(0);
    });

    it('should handle export cancellation', async () => {
      const options = {
        format: 'wav' as const,
        sampleRate: 48000 as const,
        bitDepth: 24 as const,
        channels: 2 as const,
        quality: 'lossless' as const,
        normalization: true,
        dithering: true,
        headroom: -3
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'wav', options);

      // Cancel immediately
      const cancelled = exportEngine.cancelExport(exportId);
      expect(cancelled).toBe(true);

      const progress = exportEngine.getExportProgress(exportId);
      expect(progress).toBeDefined();
      expect(progress!.status).toBe('cancelled');
    });
  });

  describe('Batch Export', () => {
    it('should handle multiple format exports', async () => {
      const formats = [
        {
          formatId: 'wav',
          options: {
            format: 'wav' as const,
            sampleRate: 48000 as const,
            bitDepth: 24 as const,
            channels: 2 as const,
            quality: 'lossless' as const,
            normalization: true,
            dithering: true,
            headroom: -3
          }
        },
        {
          formatId: 'mp3',
          options: {
            format: 'mp3' as const,
            sampleRate: 44100 as const,
            bitDepth: 16 as const,
            channels: 2 as const,
            quality: 'medium' as const,
            bitrate: 192,
            normalization: true,
            dithering: false,
            headroom: -1
          }
        },
        {
          formatId: 'midi-1',
          options: {
            format: 1 as const,
            resolution: 480,
            tempoMap: true,
            velocityScaling: true,
            noteOffVelocity: false,
            controllerData: true,
            metadata: {
              title: testComposition.metadata.title,
              composer: testComposition.metadata.composer
            }
          }
        }
      ];

      const exportIds = await exportEngine.batchExport(testComposition, formats);
      expect(exportIds).toHaveLength(3);

      exportIds.forEach(id => {
        expect(id).toBeDefined();
        expect(typeof id).toBe('string');

        const progress = exportEngine.getExportProgress(id);
        expect(progress).toBeDefined();
      });
    });
  });

  describe('Event Emission', () => {
    it('should emit appropriate events', async () => {
      const events: any[] = [];

      exportEngine.on('exportStarted', (event) => events.push({ type: 'started', event }));
      exportEngine.on('progressUpdated', (event) => events.push({ type: 'progress', event }));
      exportEngine.on('exportCompleted', (event) => events.push({ type: 'completed', event }));
      exportEngine.on('exportCancelled', (event) => events.push({ type: 'cancelled', event }));

      const options = {
        format: 'wav' as const,
        sampleRate: 48000 as const,
        bitDepth: 24 as const,
        channels: 2 as const,
        quality: 'lossless' as const,
        normalization: true,
        dithering: true,
        headroom: -3
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'wav', options);

      // Should have started event
      const startedEvents = events.filter(e => e.type === 'started');
      expect(startedEvents.length).toBeGreaterThan(0);
      expect(startedEvents[0].event.exportId).toBe(exportId);

      // Cancel and check for cancelled event
      exportEngine.cancelExport(exportId);

      await new Promise(resolve => setTimeout(resolve, 100));

      const cancelledEvents = events.filter(e => e.type === 'cancelled');
      expect(cancelledEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Audio Preview', () => {
    it('should generate audio preview', async () => {
      const preview = await exportEngine.createPreview(testComposition, 0, 30);
      expect(preview).toBeDefined();
      expect(typeof preview).toBe('string');
      expect(preview).toMatch(/^data:audio\/wav;base64,/);
    });

    it('should generate preview from specific time', async () => {
      const preview = await exportEngine.createPreview(testComposition, 60, 15);
      expect(preview).toBeDefined();
      expect(typeof preview).toBe('string');
    });
  });

  describe('Device Management', () => {
    it('should provide audio device information', () => {
      const devices = exportEngine.getAudioDevices();
      expect(devices.length).toBeGreaterThan(0);

      const defaultDevice = devices.find(d => d.id === 'default-output');
      expect(defaultDevice).toBeDefined();
      expect(defaultDevice!.type).toBe('output');
      expect(defaultDevice!.channels).toBe(2);
      expect(defaultDevice!.sampleRates).toContain(48000);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported format errors', async () => {
      const options = {
        format: 'unsupported' as any,
        sampleRate: 48000 as const,
        bitDepth: 24 as const,
        channels: 2 as const,
        quality: 'lossless' as const,
        normalization: true,
        dithering: true,
        headroom: -3
      };

      await expect(
        exportEngine.exportComposition(testComposition, 'nonexistent-format', options)
      ).rejects.toThrow('Unsupported format: nonexistent-format');
    });

    it('should handle cancellation of non-existent exports', () => {
      const cancelled = exportEngine.cancelExport('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('File Size Estimation', () => {
    it('should provide reasonable file size estimates', async () => {
      const options = {
        format: 'wav' as const,
        sampleRate: 48000 as const,
        bitDepth: 24 as const,
        channels: 2 as const,
        quality: 'lossless' as const,
        normalization: true,
        dithering: true,
        headroom: -3
      };

      const exportId = await exportEngine.exportComposition(testComposition, 'wav', options);

      // Wait for completion or progress
      await new Promise(resolve => setTimeout(resolve, 100));

      const progress = exportEngine.getExportProgress(exportId);
      expect(progress).toBeDefined();
      expect(progress!.estimatedTimeRemaining).toBeGreaterThan(0);
    });
  });
});