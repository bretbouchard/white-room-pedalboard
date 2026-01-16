/**
 * Tests for Visual Composition Editor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisualCompositionEditor } from '../visual-editor';

// Mock HTML Canvas API
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  font = '';
  setLineDash = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  stroke = vi.fn();
  fill = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  closePath = vi.fn();
  clearRect = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  translate = vi.fn();
  scale = vi.fn();
  rotate = vi.fn();
  arc = vi.fn();
  bezierCurveTo = vi.fn();
  quadraticCurveTo = vi.fn();
  rect = vi.fn();
  clip = vi.fn();
}

class MockHTMLCanvasElement {
  width = 800;
  height = 600;
  offsetWidth = 800;
  offsetHeight = 600;
  getContext(type: string): CanvasRenderingContext2D | null {
    if (type === '2d') {
      return new MockCanvasRenderingContext2D() as any;
    }
    return null;
  }
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600
  }));
}

// Mock AudioContext
class MockAudioContext {
  destination = {};
  currentTime = 0;
  state = 'running' as const;
  createGain = vi.fn();
  createOscillator = vi.fn();
  createAnalyser = vi.fn();
  resume = vi.fn();
  suspend = vi.fn();
}

describe('Visual Composition Editor', () => {
  let editor: VisualCompositionEditor;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Setup global mocks
    global.HTMLCanvasElement = MockHTMLCanvasElement as any;
    global.AudioContext = MockAudioContext as any;
    global.requestAnimationFrame = vi.fn((callback) => {
      setTimeout(callback, 16);
      return 1;
    });
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };

    mockCanvas = new MockHTMLCanvasElement() as any;
    editor = new VisualCompositionEditor(mockCanvas);
  });

  afterEach(() => {
    editor = null as any;
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(editor).toBeDefined();
      expect(editor.composition).toBeDefined();
      expect(editor.state).toBeDefined();
      expect(editor.viewport).toBeDefined();
      expect(editor.config).toBeDefined();
    });

    it('should create default composition structure', () => {
      const composition = editor.composition;

      expect(composition.id).toBeDefined();
      expect(composition.name).toBe('Untitled Composition');
      expect(composition.tempo).toBe(120);
      expect(composition.timeSignature).toBe('4/4');
      expect(composition.key).toBe('C major');
      expect(composition.duration).toBe(64);
      expect(composition.tracks).toHaveLength(1);
      expect(composition.markers).toHaveLength(0);
      expect(composition.sections).toHaveLength(0);
    });

    it('should create initial MIDI track', () => {
      const tracks = editor.composition.tracks;
      expect(tracks).toHaveLength(1);

      const track = tracks[0];
      expect(track.type).toBe('midi');
      expect(track.name).toBe('Grand Piano');
      expect(track.instrument).toBe('Acoustic Grand Piano');
      expect(track.height).toBe(80);
      expect(track.muted).toBe(false);
      expect(track.soloed).toBe(false);
      expect(track.notes).toHaveLength(0);
    });

    it('should initialize editor state correctly', () => {
      const state = editor.state;

      expect(state.currentTool).toBe('select');
      expect(state.selectionMode).toBe('multiple');
      expect(state.playbackState).toBe('stopped');
      expect(state.currentTime).toBe(0);
      expect(state.loopEnabled).toBe(false);
      expect(state.metronomeEnabled).toBe(false);
      expect(state.quantization).toBe(0.25);
    });

    it('should initialize viewport correctly', () => {
      const viewport = editor.viewport;

      expect(viewport.startTime).toBe(0);
      expect(viewport.endTime).toBe(16);
      expect(viewport.startPitch).toBe(48);
      expect(viewport.endPitch).toBe(96);
      expect(viewport.pixelsPerBeat).toBe(40);
      expect(viewport.pixelsPerPitch).toBe(12);
      expect(viewport.width).toBe(800);
      expect(viewport.height).toBe(600);
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        theme: 'light' as const,
        layout: 'vertical' as const,
        autoSave: false,
        autoSaveInterval: 10
      };

      const customEditor = new VisualCompositionEditor(mockCanvas, customConfig);

      expect(customEditor.config.theme).toBe('light');
      expect(customEditor.config.layout).toBe('vertical');
      expect(customEditor.config.autoSave).toBe(false);
      expect(customEditor.config.autoSaveInterval).toBe(10);
    });

    it('should use default color scheme', () => {
      const colorScheme = editor.config.colorScheme;

      expect(colorScheme.primary).toBe('#2196F3');
      expect(colorScheme.secondary).toBe('#4CAF50');
      expect(colorScheme.background).toBe('#121212');
      expect(colorScheme.text).toBe('#FFFFFF');
      expect(colorScheme.grid).toBe('#333333');
    });

    it('should initialize editor panels', () => {
      const panels = editor.config.panels;

      expect(panels.length).toBeGreaterThan(0);

      const timelinePanel = panels.find(p => p.type === 'timeline');
      const pianoRollPanel = panels.find(p => p.type === 'piano-roll');
      const propertiesPanel = panels.find(p => p.type === 'properties');

      expect(timelinePanel).toBeDefined();
      expect(pianoRollPanel).toBeDefined();
      expect(propertiesPanel).toBeDefined();
    });
  });

  describe('Coordinate Conversion', () => {
    it('should convert beats to x coordinates', () => {
      const x = editor['beatToX'](4); // Beat 4
      expect(x).toBe((4 - editor.viewport.startTime) * editor.viewport.pixelsPerBeat);
    });

    it('should convert x coordinates to beats', () => {
      const x = 160; // 4 beats at 40 pixels per beat
      const beat = editor['xToBeat'](x);
      expect(beat).toBe(x / editor.viewport.pixelsPerBeat + editor.viewport.startTime);
    });

    it('should convert pitch to y coordinates', () => {
      const pitch = 60; // Middle C
      const y = editor['pitchToY'](pitch);
      const expectedY = 60 + (editor.viewport.endPitch - pitch) * editor.viewport.pixelsPerPitch;
      expect(y).toBe(expectedY);
    });

    it('should convert y coordinates to pitch', () => {
      const y = 300;
      const pitch = editor['yToPitch'](y);
      const timelineHeight = 60;
      const expectedPitch = editor.viewport.endPitch - ((y - timelineHeight) / editor.viewport.pixelsPerPitch);
      expect(pitch).toBe(expectedPitch);
    });
  });

  describe('Selection Management', () => {
    it('should select single element', () => {
      const testId = 'test-element';
      editor['selectElement'](testId);

      const selected = editor.state['selectedElements'];
      expect(selected.size).toBe(1);
      expect(selected.has(testId)).toBe(true);
    });

    it('should clear existing selection when selecting new element', () => {
      const testId1 = 'test-element-1';
      const testId2 = 'test-element-2';

      editor['selectElement'](testId1);
      editor['selectElement'](testId2);

      const selected = editor.state['selectedElements'];
      expect(selected.size).toBe(1);
      expect(selected.has(testId1)).toBe(false);
      expect(selected.has(testId2)).toBe(true);
    });

    it('should toggle selection', () => {
      const testId = 'test-element';

      editor['toggleSelection'](testId);
      expect(editor.state['selectedElements'].has(testId)).toBe(true);

      editor['toggleSelection'](testId);
      expect(editor.state['selectedElements'].has(testId)).toBe(false);
    });

    it('should clear selection', () => {
      const testIds = ['element-1', 'element-2', 'element-3'];
      testIds.forEach(id => editor['selectElement'](id, false));

      expect(editor.state['selectedElements'].size).toBe(3);

      editor['clearSelection']();
      expect(editor.state['selectedElements'].size).toBe(0);
    });
  });

  describe('Playback Control', () => {
    it('should start playback', () => {
      editor.startPlayback();

      expect(editor.state.playbackState).toBe('playing');
    });

    it('should stop playback', () => {
      editor.startPlayback();
      editor.stopPlayback();

      expect(editor.state.playbackState).toBe('stopped');
      expect(editor.state.currentTime).toBe(0);
    });

    it('should toggle playback', () => {
      editor.togglePlayback();
      expect(editor.state.playbackState).toBe('playing');

      editor.togglePlayback();
      expect(editor.state.playbackState).toBe('stopped');
    });

    it('should toggle recording', () => {
      editor.toggleRecording();
      expect(editor.state.playbackState).toBe('recording');

      editor.toggleRecording();
      expect(editor.state.playbackState).toBe('stopped');
    });
  });

  describe('View Operations', () => {
    it('should zoom in', () => {
      const initialPixelsPerBeat = editor.viewport.pixelsPerBeat;

      editor.zoom(1.5, 400, 300);

      expect(editor.viewport.pixelsPerBeat).toBeGreaterThan(initialPixelsPerBeat);
      expect(editor.viewport.pixelsPerBeat).toBeLessThanOrEqual(200);
    });

    it('should zoom out', () => {
      const initialPixelsPerBeat = editor.viewport.pixelsPerBeat;

      editor.zoom(0.7, 400, 300);

      expect(editor.viewport.pixelsPerBeat).toBeLessThan(initialPixelsPerBeat);
      expect(editor.viewport.pixelsPerBeat).toBeGreaterThanOrEqual(10);
    });

    it('should limit zoom to reasonable bounds', () => {
      // Test maximum zoom
      editor.zoom(10, 400, 300);
      expect(editor.viewport.pixelsPerBeat).toBe(200);

      // Test minimum zoom
      editor.zoom(0.01, 400, 300);
      expect(editor.viewport.pixelsPerBeat).toBe(10);
    });

    it('should pan viewport', () => {
      const initialStartTime = editor.viewport.startTime;
      const initialStartPitch = editor.viewport.startPitch;

      editor.pan(100, -50);

      expect(editor.viewport.startTime).toBeLessThan(initialStartTime);
      expect(editor.viewport.startPitch).toBeGreaterThan(initialStartPitch);
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      // Reset keyboard event handling
      editor['dragStart'] = null;
    });

    it('should handle space key for playback toggle', () => {
      const mockEvent = {
        key: ' ',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      editor['handleKeyDown'](mockEvent as any);
      expect(editor.state.playbackState).toBe('playing');
    });

    it('should handle delete key for selection deletion', () => {
      // Select some elements first
      const testIds = ['element-1', 'element-2'];
      testIds.forEach(id => editor['selectElement'](id, false));

      const mockEvent = {
        key: 'Delete',
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      const deleteSpy = vi.spyOn(editor, 'deleteSelectedElements');
      editor['handleKeyDown'](mockEvent as any);

      expect(deleteSpy).toHaveBeenCalled();
    });

    it('should handle Ctrl+Z for undo', () => {
      const mockEvent = {
        key: 'z',
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
        altKey: false,
        preventDefault: vi.fn()
      };

      const undoSpy = vi.spyOn(editor, 'undo');
      editor['handleKeyDown'](mockEvent as any);

      expect(undoSpy).toHaveBeenCalled();
    });

    it('should normalize shortcut keys', () => {
      expect(editor['normalizeShortcut']('Cmd+S')).toBe('ctrl+s');
      expect(editor['normalizeShortcut']('CTRL+Z')).toBe('ctrl+z');
      expect(editor['normalizeShortcut']('Shift+Cmd+A')).toBe('shift+ctrl+a');
    });
  });

  describe('File Operations', () => {
    it('should save composition to localStorage', () => {
      editor.saveComposition();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'composition',
        expect.any(String)
      );
    });

    it('should load composition from localStorage', () => {
      const mockComposition = {
        id: 'test-id',
        name: 'Test Composition',
        tempo: 140,
        tracks: []
      };

      (localStorage.getItem as any).mockReturnValue(JSON.stringify(mockComposition));

      editor.loadComposition();

      expect(localStorage.getItem).toHaveBeenCalledWith('composition');
      expect(editor.composition.name).toBe('Test Composition');
      expect(editor.composition.tempo).toBe(140);
    });

    it('should handle invalid composition data', () => {
      (localStorage.getItem as any).mockReturnValue('invalid json');

      // Should not throw error
      expect(() => editor.loadComposition()).not.toThrow();
    });
  });

  describe('Event Emission', () => {
    it('should emit selection changed events', () => {
      const emitSpy = vi.spyOn(editor, 'emit');

      editor['selectElement']('test-element');

      expect(emitSpy).toHaveBeenCalledWith('selectionChanged', {
        selected: ['test-element']
      });
    });

    it('should emit playback events', () => {
      const emitSpy = vi.spyOn(editor, 'emit');

      editor.startPlayback();
      expect(emitSpy).toHaveBeenCalledWith('playbackStarted');

      editor.stopPlayback();
      expect(emitSpy).toHaveBeenCalledWith('playbackStopped');

      editor.toggleRecording();
      expect(emitSpy).toHaveBeenCalledWith('recordingToggled', {
        recording: true
      });
    });

    it('should emit zoom changed events', () => {
      const emitSpy = vi.spyOn(editor, 'emit');

      editor.zoom(1.2, 400, 300);

      expect(emitSpy).toHaveBeenCalledWith('zoomChanged', {
        zoom: expect.any(Number)
      });
    });

    it('should emit viewport changed events', () => {
      const emitSpy = vi.spyOn(editor, 'emit');

      editor.pan(50, 25);

      expect(emitSpy).toHaveBeenCalledWith('viewportChanged', editor.viewport);
    });
  });

  describe('Composition Editing', () => {
    it('should add new tracks', () => {
      const initialTrackCount = editor.composition.tracks.length;

      const newTrack = {
        id: editor['generateId'](),
        name: 'New Track',
        type: 'midi' as const,
        instrument: 'Synth',
        color: '#FF5722',
        height: 80,
        muted: false,
        soloed: false,
        volume: 75,
        pan: 0,
        effects: [],
        notes: [],
        clips: [],
        automation: [],
        selected: false,
        locked: false,
        recordArmed: false,
        monitoring: false
      };

      editor.composition.tracks.push(newTrack);

      expect(editor.composition.tracks.length).toBe(initialTrackCount + 1);
      expect(editor.composition.tracks[initialTrackCount].name).toBe('New Track');
    });

    it('should add notes to tracks', () => {
      const track = editor.composition.tracks[0];
      const initialNoteCount = track.notes.length;

      const newNote = {
        id: editor['generateId'](),
        pitch: 60,
        startTime: 0,
        duration: 1,
        velocity: 80,
        selected: false,
        muted: false,
        color: track.color,
        articulation: 'normal' as const,
        dynamics: 'mf' as const,
        channel: 0,
        bend: 0,
        pressure: 0,
        expression: 100
      };

      track.notes.push(newNote);

      expect(track.notes.length).toBe(initialNoteCount + 1);
      expect(track.notes[initialNoteCount].pitch).toBe(60);
    });

    it('should add markers', () => {
      const initialMarkerCount = editor.composition.markers.length;

      const newMarker = {
        id: editor['generateId'](),
        name: 'Verse Start',
        time: 8,
        type: 'section' as const,
        color: '#2196F3',
        description: 'Beginning of verse section'
      };

      editor.composition.markers.push(newMarker);

      expect(editor.composition.markers.length).toBe(initialMarkerCount + 1);
      expect(editor.composition.markers[initialMarkerCount].name).toBe('Verse Start');
    });
  });

  describe('Utility Methods', () => {
    it('should identify black keys correctly', () => {
      expect(editor['isBlackKey'](61)).toBe(true); // C#
      expect(editor['isBlackKey'](63)).toBe(true); // D#
      expect(editor['isBlackKey'](66)).toBe(true); // F#
      expect(editor['isBlackKey'](68)).toBe(true); // G#
      expect(editor['isBlackKey'](70)).toBe(true); // A#

      expect(editor['isBlackKey'](60)).toBe(false); // C
      expect(editor['isBlackKey'](62)).toBe(false); // D
      expect(editor['isBlackKey'](64)).toBe(false); // E
      expect(editor['isBlackKey'](65)).toBe(false); // F
    });

    it('should convert MIDI notes to names', () => {
      expect(editor['midiNoteToName'](60)).toBe('C');
      expect(editor['midiNoteToName'](61)).toBe('C#');
      expect(editor['midiNoteToName'](62)).toBe('D');
      expect(editor['midiNoteToName'](63)).toBe('D#');
      expect(editor['midiNoteToName'](64)).toBe('E');
    });

    it('should generate unique IDs', () => {
      const id1 = editor['generateId']();
      const id2 = editor['generateId']();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });
  });
});