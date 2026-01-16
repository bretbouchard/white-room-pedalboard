/**
 * Visual Composition Editor
 *
 * Interactive web-based interface for visual music composition
 * with real-time preview, drag-and-drop editing, and professional workflow.
 */

import { EventEmitter } from 'events';

export interface EditorConfiguration {
  theme: 'light' | 'dark' | 'auto';
  layout: 'horizontal' | 'vertical' | 'floating';
  grid: boolean;
  snapToGrid: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // minutes
  colorScheme: ColorScheme;
  shortcuts: KeyboardShortcuts;
  panels: EditorPanel[];
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  grid: string;
  selection: string;
  highlight: string;
  error: string;
  warning: string;
  success: string;
}

export interface KeyboardShortcuts {
  play: string[];
  stop: string[];
  record: string[];
  undo: string[];
  redo: string[];
  save: string[];
  export: string[];
  zoomIn: string[];
  zoomOut: string[];
  toggleGrid: string[];
  toggleSnap: string[];
  selectAll: string[];
  delete: string[];
  copy: string[];
  paste: string[];
  cut: string[];
}

export interface EditorPanel {
  id: string;
  type: 'timeline' | 'piano-roll' | 'notation' | 'mixer' | 'properties' | 'browser' | 'effects' | 'automation';
  title: string;
  visible: boolean;
  docked: boolean;
  position: { x: number; y: number; width: number; height: number };
  minimized: boolean;
  locked: boolean;
  floating: boolean;
}

export interface VisualComposition {
  id: string;
  name: string;
  tempo: number;
  timeSignature: string;
  key: string;
  duration: number; // measures
  zoom: number;
  scrollPosition: { x: number; y: number };
  tracks: VisualTrack[];
  markers: Marker[];
  sections: Section[];
  layers: Layer[];
  history: HistoryEntry[];
  metadata: CompositionMetadata;
}

export interface VisualTrack {
  id: string;
  name: string;
  type: 'midi' | 'audio' | 'automation' | 'tempo' | 'marker';
  instrument: string;
  color: string;
  height: number;
  muted: boolean;
  soloed: boolean;
  volume: number; // 0-100
  pan: number; // -100 to 100
  effects: Effect[];
  notes: VisualNote[];
  clips: Clip[];
  automation: AutomationLane[];
  selected: boolean;
  locked: boolean;
  recordArmed: boolean;
  monitoring: boolean;
}

export interface VisualNote {
  id: string;
  pitch: number; // MIDI note number
  startTime: number; // beats
  duration: number; // beats
  velocity: number; // 0-127
  selected: boolean;
  muted: boolean;
  color: string;
  articulation: 'normal' | 'staccato' | 'legato' | 'accent' | 'tenuto';
  dynamics: 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff';
  channel: number;
  bend: number; // pitch bend
  pressure: number; // aftertouch
  expression: number; // expression controller
}

export interface Clip {
  id: string;
  name: string;
  startTime: number; // beats
  duration: number; // beats
  content: ClipContent;
  color: string;
  selected: boolean;
  muted: boolean;
  locked: boolean;
  warped: boolean;
  stretchMode: 'none' | 'proportional' | 'timestretch' | 'beatsync';
}

export interface ClipContent {
  type: 'midi' | 'audio' | 'automation';
  notes?: VisualNote[];
  audioData?: ArrayBuffer;
  audioMetadata?: AudioMetadata;
  automation?: AutomationLane[];
  tempoChanges?: TempoChange[];
}

export interface AudioMetadata {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  duration: number;
  format: string;
  loopPoints?: { start: number; end: number };
  warpMarkers?: WarpMarker[];
}

export interface WarpMarker {
  beatTime: number;
  sampleTime: number;
  disabled: boolean;
}

export interface Effect {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, number>;
  enabled: boolean;
  bypassed: boolean;
  preset?: string;
}

export interface AutomationLane {
  id: string;
  parameter: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
  color: string;
  visible: boolean;
  points: AutomationPoint[];
  curveType: 'linear' | 'exponential' | 'logarithmic' | 'spline';
  quantization: number;
}

export interface AutomationPoint {
  id: string;
  time: number;
  value: number;
  curve: 'linear' | 'jump' | 'smooth' | 'exponential';
  tension: number; // for spline curves
  selected: boolean;
  locked: boolean;
}

export interface Marker {
  id: string;
  name: string;
  time: number;
  type: 'section' | 'loop' | 'cue' | 'hit' | 'memory' | 'custom';
  color: string;
  description?: string;
  idNumber?: number;
  loopEnd?: boolean;
}

export interface Section {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  color: string;
  type: 'intro' | 'verse' | 'pre-chorus' | 'chorus' | 'bridge' | 'outro' | 'custom';
  repeats: number;
  variations: Section[];
}

export interface Layer {
  id: string;
  name: string;
  type: 'arrangement' | 'composition' | 'orchestration' | 'harmony' | 'rhythm';
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  tracks: string[]; // track IDs
  color: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  action: string;
  description: string;
  data: any;
  undoable: boolean;
  batchId?: string;
}

export interface CompositionMetadata {
  created: Date;
  modified: Date;
  author: string;
  version: string;
  tags: string[];
  notes: string;
  collaborators: string[];
  template?: string;
  genre: string;
  mood: string;
  instrumentation: string[];
}

export interface EditorState {
  currentTool: 'select' | 'draw' | 'erase' | 'cut' | 'glue' | 'stretch' | 'zoom' | 'pan';
  selectionMode: 'single' | 'multiple' | 'range' | 'track';
  playbackState: 'stopped' | 'playing' | 'recording' | 'paused';
  currentTime: number; // beats
  loopEnabled: boolean;
  loopStart: number;
  loopEnd: number;
  metronomeEnabled: boolean;
  clickVolume: number; // 0-100
  quantization: number; // beats subdivision
  followPlayback: boolean;
}

export interface Viewport {
  startTime: number;
  endTime: number;
  startPitch: number;
  endPitch: number;
  pixelsPerBeat: number;
  pixelsPerPitch: number;
  width: number;
  height: number;
  trackHeights: Record<string, number>;
}

export interface EditingAction {
  id: string;
  type: 'create' | 'edit' | 'delete' | 'move' | 'copy' | 'paste' | 'transform';
  target: string; // element ID or type
  data: any;
  timestamp: Date;
  user?: string;
  session?: string;
}

export interface RealtimeUpdate {
  id: string;
  type: 'note' | 'clip' | 'track' | 'selection' | 'viewport' | 'playback';
  data: any;
  timestamp: Date;
  userId: string;
  sessionId: string;
}

/**
 * Visual Composition Editor
 *
 * Interactive web-based editor for visual music composition
 * with professional workflow and real-time collaboration.
 */
export class VisualCompositionEditor extends EventEmitter {
  private composition: VisualComposition;
  private config: EditorConfiguration;
  private state: EditorState;
  private viewport: Viewport;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext;
  private isPlaying: boolean = false;
  private playheadPosition: number = 0;
  private selectedElements: Set<string> = new Set();
  private clipboard: any[] = [];
  private dragStart: { x: number; y: number } | null = null;
  private activeTool: string = 'select';
  private collaborators: Map<string, any> = new Map();

  constructor(canvas: HTMLCanvasElement, config?: Partial<EditorConfiguration>) {
    super();

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.audioContext = new AudioContext();

    // Initialize configuration
    this.config = this.initializeConfiguration(config);

    // Initialize composition
    this.composition = this.createDefaultComposition();

    // Initialize state
    this.state = this.initializeEditorState();

    // Initialize viewport
    this.viewport = this.initializeViewport();

    // Set up event listeners
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupAudioContext();

    // Start render loop
    this.startRenderLoop();

    // Enable auto-save
    if (this.config.autoSave) {
      this.startAutoSave();
    }
  }

  /**
   * Initialize editor configuration
   */
  private initializeConfiguration(userConfig?: Partial<EditorConfiguration>): EditorConfiguration {
    const defaultConfig: EditorConfiguration = {
      theme: 'dark',
      layout: 'horizontal',
      grid: true,
      snapToGrid: true,
      autoSave: true,
      autoSaveInterval: 5,
      colorScheme: {
        primary: '#2196F3',
        secondary: '#4CAF50',
        accent: '#FF9800',
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        grid: '#333333',
        selection: '#4CAF50',
        highlight: '#FFC107',
        error: '#F44336',
        warning: '#FF9800',
        success: '#4CAF50'
      },
      shortcuts: {
        play: ['Space'],
        stop: ['Space'],
        record: ['r'],
        undo: ['Ctrl+Z', 'Cmd+Z'],
        redo: ['Ctrl+Y', 'Cmd+Y'],
        save: ['Ctrl+S', 'Cmd+S'],
        export: ['Ctrl+E', 'Cmd+E'],
        zoomIn: ['Ctrl+=', 'Cmd+='],
        zoomOut: ['Ctrl+-', 'Cmd+-'],
        toggleGrid: ['g'],
        toggleSnap: ['s'],
        selectAll: ['Ctrl+A', 'Cmd+A'],
        delete: ['Delete', 'Backspace'],
        copy: ['Ctrl+C', 'Cmd+C'],
        paste: ['Ctrl+V', 'Cmd+V'],
        cut: ['Ctrl+X', 'Cmd+X']
      },
      panels: this.initializePanels()
    };

    return { ...defaultConfig, ...userConfig };
  }

  /**
   * Create default composition
   */
  private createDefaultComposition(): VisualComposition {
    return {
      id: this.generateId(),
      name: 'Untitled Composition',
      tempo: 120,
      timeSignature: '4/4',
      key: 'C major',
      duration: 64,
      zoom: 1,
      scrollPosition: { x: 0, y: 0 },
      tracks: [
        {
          id: this.generateId(),
          name: 'Grand Piano',
          type: 'midi',
          instrument: 'Acoustic Grand Piano',
          color: '#4CAF50',
          height: 80,
          muted: false,
          soloed: false,
          volume: 80,
          pan: 0,
          effects: [],
          notes: [],
          clips: [],
          automation: [],
          selected: false,
          locked: false,
          recordArmed: false,
          monitoring: false
        }
      ],
      markers: [],
      sections: [],
      layers: [],
      history: [],
      metadata: {
        created: new Date(),
        modified: new Date(),
        author: 'User',
        version: '1.0.0',
        tags: [],
        notes: '',
        collaborators: [],
        genre: 'Classical',
        mood: 'Bright',
        instrumentation: ['Piano']
      }
    };
  }

  /**
   * Initialize editor state
   */
  private initializeEditorState(): EditorState {
    return {
      currentTool: 'select',
      selectionMode: 'multiple',
      playbackState: 'stopped',
      currentTime: 0,
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 32,
      metronomeEnabled: false,
      clickVolume: 50,
      quantization: 0.25, // 16th notes
      followPlayback: true
    };
  }

  /**
   * Initialize viewport
   */
  private initializeViewport(): Viewport {
    return {
      startTime: 0,
      endTime: 16,
      startPitch: 48, // C3
      endPitch: 96, // C7
      pixelsPerBeat: 40,
      pixelsPerPitch: 12,
      width: this.canvas.width,
      height: this.canvas.height,
      trackHeights: {}
    };
  }

  /**
   * Initialize editor panels
   */
  private initializePanels(): EditorPanel[] {
    return [
      {
        id: 'timeline',
        type: 'timeline',
        title: 'Timeline',
        visible: true,
        docked: true,
        position: { x: 0, y: 0, width: 800, height: 200 },
        minimized: false,
        locked: false,
        floating: false
      },
      {
        id: 'piano-roll',
        type: 'piano-roll',
        title: 'Piano Roll',
        visible: true,
        docked: true,
        position: { x: 0, y: 200, width: 800, height: 400 },
        minimized: false,
        locked: false,
        floating: false
      },
      {
        id: 'properties',
        type: 'properties',
        title: 'Properties',
        visible: true,
        docked: true,
        position: { x: 800, y: 0, width: 200, height: 600 },
        minimized: false,
        locked: false,
        floating: false
      }
    ];
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Canvas events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Window events
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    // Drag and drop
    this.canvas.addEventListener('dragover', this.handleDragOver.bind(this));
    this.canvas.addEventListener('drop', this.handleDrop.bind(this));
  }

  /**
   * Setup keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    // Shortcuts are handled in keydown event handler
  }

  /**
   * Setup audio context
   */
  private setupAudioContext(): void {
    // Initialize audio context for playback
    this.audioContext = new AudioContext();
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    const render = () => {
      this.render();
      requestAnimationFrame(render);
    };
    render();
  }

  /**
   * Main render method
   */
  private render(): void {
    const ctx = this.ctx;
    const config = this.config.colorScheme;

    // Clear canvas
    ctx.fillStyle = config.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render based on active panels
    this.renderTimeline();
    this.renderPianoRoll();
    this.renderTrackHeaders();
    this.renderPlayhead();
    this.renderSelection();
    this.renderGrid();
  }

  /**
   * Render timeline
   */
  private renderTimeline(): void {
    const ctx = this.ctx;
    const viewport = this.viewport;
    const config = this.config.colorScheme;

    const timelineHeight = 60;
    const y = 0;

    // Timeline background
    ctx.fillStyle = config.surface;
    ctx.fillRect(0, y, this.canvas.width, timelineHeight);

    // Time markers
    ctx.strokeStyle = config.grid;
    ctx.fillStyle = config.text;
    ctx.font = '12px Arial';

    const beatsPerBar = 4; // Assuming 4/4 time
    const startBar = Math.floor(viewport.startTime);
    const endBar = Math.ceil(viewport.endTime);

    for (let bar = startBar; bar <= endBar; bar++) {
      const x = this.beatToX(bar * beatsPerBar);

      // Major beat (bar line)
      ctx.strokeStyle = config.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + timelineHeight);
      ctx.stroke();

      // Bar number
      ctx.fillText(bar.toString(), x + 5, y + 20);

      // Beat lines
      for (let beat = 1; beat < beatsPerBar; beat++) {
        const beatX = this.beatToX(bar * beatsPerBar + beat);
        ctx.strokeStyle = config.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(beatX, y);
        ctx.lineTo(beatX, y + timelineHeight);
        ctx.stroke();
      }
    }
  }

  /**
   * Render piano roll
   */
  private renderPianoRoll(): void {
    const ctx = this.ctx;
    const viewport = this.viewport;
    const config = this.config.colorScheme;

    const timelineHeight = 60;
    const startY = timelineHeight;

    // Piano roll background
    ctx.fillStyle = config.surface;
    ctx.fillRect(0, startY, this.canvas.width, this.canvas.height - startY);

    // Draw pitch lines (piano keys)
    for (let pitch = viewport.startPitch; pitch <= viewport.endPitch; pitch++) {
      const y = this.pitchToY(pitch);

      if (this.isBlackKey(pitch)) {
        ctx.fillStyle = '#333333';
      } else {
        ctx.fillStyle = '#1a1a1a';
      }
      ctx.fillRect(0, y, this.canvas.width, this.viewport.pixelsPerPitch);

      // Octave lines
      if (pitch % 12 === 0) {
        ctx.strokeStyle = config.text;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.canvas.width, y);
        ctx.stroke();

        // Octave labels
        const octave = Math.floor(pitch / 12) - 1;
        const noteName = this.midiNoteToName(pitch);
        ctx.fillStyle = config.text;
        ctx.font = '10px Arial';
        ctx.fillText(`${noteName}${octave}`, 5, y - 2);
      }
    }

    // Render notes for each track
    this.composition.tracks.forEach(track => {
      if (track.type === 'midi') {
        this.renderTrackNotes(track, startY);
      }
    });
  }

  /**
   * Render track headers
   */
  private renderTrackHeaders(): void {
    const ctx = this.ctx;
    const viewport = this.viewport;
    const config = this.config.colorScheme;

    const headerWidth = 150;
    const timelineHeight = 60;

    // Track header background
    ctx.fillStyle = config.surface;
    ctx.fillRect(0, timelineHeight, headerWidth, this.canvas.height - timelineHeight);

    // Render each track header
    this.composition.tracks.forEach((track, index) => {
      const y = timelineHeight + (index * 80);

      // Track background
      ctx.fillStyle = track.selected ? config.selection : config.surface;
      ctx.fillRect(0, y, headerWidth, 80);

      // Track border
      ctx.strokeStyle = config.grid;
      ctx.strokeRect(0, y, headerWidth, 80);

      // Track name
      ctx.fillStyle = config.text;
      ctx.font = '14px Arial';
      ctx.fillText(track.name, 10, y + 25);

      // Instrument
      ctx.font = '12px Arial';
      ctx.fillStyle = '#888888';
      ctx.fillText(track.instrument, 10, y + 45);

      // Controls
      this.renderTrackControls(track, y, headerWidth);
    });
  }

  /**
   * Render track controls
   */
  private renderTrackControls(track: VisualTrack, y: number, width: number): void {
    const ctx = this.ctx;
    const config = this.config.colorScheme;

    const buttonSize = 20;
    const padding = 10;
    const startX = width - padding - buttonSize * 4;

    // Mute button
    ctx.fillStyle = track.muted ? config.error : config.surface;
    ctx.fillRect(startX, y + 10, buttonSize, buttonSize);
    ctx.strokeStyle = config.text;
    ctx.strokeRect(startX, y + 10, buttonSize, buttonSize);
    ctx.fillStyle = config.text;
    ctx.font = '12px Arial';
    ctx.fillText('M', startX + 6, y + 25);

    // Solo button
    ctx.fillStyle = track.soloed ? config.warning : config.surface;
    ctx.fillRect(startX + buttonSize + 5, y + 10, buttonSize, buttonSize);
    ctx.strokeStyle = config.text;
    ctx.strokeRect(startX + buttonSize + 5, y + 10, buttonSize, buttonSize);
    ctx.fillStyle = config.text;
    ctx.fillText('S', startX + buttonSize + 11, y + 25);

    // Record arm button
    ctx.fillStyle = track.recordArmed ? config.error : config.surface;
    ctx.fillRect(startX + (buttonSize + 5) * 2, y + 10, buttonSize, buttonSize);
    ctx.strokeStyle = config.text;
    ctx.strokeRect(startX + (buttonSize + 5) * 2, y + 10, buttonSize, buttonSize);
    ctx.fillStyle = config.text;
    ctx.fillText('R', startX + (buttonSize + 5) * 2 + 6, y + 25);
  }

  /**
   * Render notes for a track
   */
  private renderTrackNotes(track: VisualTrack, startY: number): void {
    const ctx = this.ctx;
    const viewport = this.viewport;
    const config = this.config.colorScheme;

    track.notes.forEach(note => {
      const x = this.beatToX(note.startTime);
      const width = this.beatToX(note.startTime + note.duration) - x;
      const y = this.pitchToY(note.pitch + 1);
      const height = this.viewport.pixelsPerPitch;

      // Note rectangle
      ctx.fillStyle = note.selected ? config.highlight : track.color;
      ctx.fillRect(x, y, width, height);

      // Note border
      ctx.strokeStyle = config.text;
      ctx.strokeRect(x, y, width, height);

      // Velocity indicator (height variation)
      if (note.velocity < 64) {
        ctx.fillStyle = `${config.surface}88`;
        ctx.fillRect(x, y + height * 0.3, width, height * 0.7);
      }
    });
  }

  /**
   * Render playhead
   */
  private renderPlayhead(): void {
    const ctx = this.ctx;
    const config = this.config.colorScheme;

    const x = this.beatToX(this.state.currentTime);

    ctx.strokeStyle = config.error;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, this.canvas.height);
    ctx.stroke();

    // Playhead triangle
    ctx.fillStyle = config.error;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 10, 10);
    ctx.lineTo(x - 10, 10);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Render selection
   */
  private renderSelection(): void {
    const ctx = this.ctx;
    const config = this.config.colorScheme;

    if (this.selectedElements.size > 0) {
      ctx.strokeStyle = config.selection;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      // Render selection rectangles around selected elements
      this.selectedElements.forEach(elementId => {
        const element = this.findElementById(elementId);
        if (element) {
          const rect = this.getElementBounds(element);
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
      });

      ctx.setLineDash([]);
    }
  }

  /**
   * Render grid
   */
  private renderGrid(): void {
    if (!this.config.grid) return;

    const ctx = this.ctx;
    const viewport = this.viewport;
    const config = this.config.colorScheme;

    // Vertical lines (beat grid)
    ctx.strokeStyle = config.grid;
    ctx.lineWidth = 0.5;

    const startBeat = Math.floor(viewport.startTime);
    const endBeat = Math.ceil(viewport.endTime);

    for (let beat = startBeat; beat <= endBeat; beat += 0.25) { // 16th note grid
      const x = this.beatToX(beat);
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
  }

  /**
   * Mouse event handlers
   */
  private handleMouseDown(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.dragStart = { x, y };

    const element = this.getElementAtPosition(x, y);

    switch (this.state.currentTool) {
      case 'select':
        if (element) {
          if (event.shiftKey) {
            this.toggleSelection(element.id);
          } else {
            this.selectElement(element.id, !event.ctrlKey);
          }
        } else {
          this.clearSelection();
        }
        break;

      case 'draw':
        this.startDrawing(x, y);
        break;

      case 'erase':
        if (element) {
          this.deleteElement(element.id);
        }
        break;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.dragStart) {
      const rect = this.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Handle dragging based on current tool and selection
      if (this.state.currentTool === 'select' && this.selectedElements.size > 0) {
        this.dragSelectedElements(x - this.dragStart.x, y - this.dragStart.y);
      }
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    this.dragStart = null;
    this.commitHistory();
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    if (event.ctrlKey || event.metaKey) {
      // Zoom
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      this.zoom(delta, event.offsetX, event.offsetY);
    } else {
      // Pan
      this.pan(event.deltaX, event.deltaY);
    }
  }

  private handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // Show context menu at position
  }

  /**
   * Keyboard event handlers
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const key = this.getShortcutKey(event);

    // Check shortcuts
    if (this.matchesShortcut(key, this.config.shortcuts.play)) {
      this.togglePlayback();
    } else if (this.matchesShortcut(key, this.config.shortcuts.stop)) {
      this.stopPlayback();
    } else if (this.matchesShortcut(key, this.config.shortcuts.record)) {
      this.toggleRecording();
    } else if (this.matchesShortcut(key, this.config.shortcuts.undo)) {
      this.undo();
    } else if (this.matchesShortcut(key, this.config.shortcuts.redo)) {
      this.redo();
    } else if (this.matchesShortcut(key, this.config.shortcuts.save)) {
      this.saveComposition();
    } else if (this.matchesShortcut(key, this.config.shortcuts.delete)) {
      this.deleteSelectedElements();
    } else if (this.matchesShortcut(key, this.config.shortcuts.copy)) {
      this.copySelection();
    } else if (this.matchesShortcut(key, this.config.shortcuts.paste)) {
      this.pasteSelection();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Handle key release if needed
  }

  /**
   * Window event handlers
   */
  private handleResize(): void {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.viewport.width = this.canvas.width;
    this.viewport.height = this.canvas.height;
  }

  private handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /**
   * Drag and drop handlers
   */
  private handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private handleDrop(event: DragEvent): void {
    event.preventDefault();
    // Handle dropped files or content
  }

  /**
   * Coordinate conversion utilities
   */
  private beatToX(beat: number): number {
    const viewport = this.viewport;
    return (beat - viewport.startTime) * viewport.pixelsPerBeat;
  }

  private xToBeat(x: number): number {
    const viewport = this.viewport;
    return (x / viewport.pixelsPerBeat) + viewport.startTime;
  }

  private pitchToY(pitch: number): number {
    const viewport = this.viewport;
    const timelineHeight = 60;
    return timelineHeight + (viewport.endPitch - pitch) * viewport.pixelsPerPitch;
  }

  private yToPitch(y: number): number {
    const viewport = this.viewport;
    const timelineHeight = 60;
    return viewport.endPitch - ((y - timelineHeight) / viewport.pixelsPerPitch);
  }

  /**
   * Utility methods
   */
  private isBlackKey(pitch: number): boolean {
    const blackKeys = [1, 3, 6, 8, 10]; // Relative to C
    return blackKeys.includes(pitch % 12);
  }

  private midiNoteToName(pitch: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return notes[pitch % 12];
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getShortcutKey(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    parts.push(event.key);
    return parts.join('+');
  }

  private matchesShortcut(key: string, shortcuts: string[]): boolean {
    return shortcuts.some(shortcut => {
      return this.normalizeShortcut(shortcut) === this.normalizeShortcut(key);
    });
  }

  private normalizeShortcut(shortcut: string): string {
    return shortcut.toLowerCase().replace('cmd', 'ctrl');
  }

  /**
   * Element management
   */
  private getElementAtPosition(x: number, y: number): any {
    // Find element at cursor position
    // Check notes, clips, tracks, etc.
    return null; // Placeholder
  }

  private findElementById(id: string): any {
    // Find element by ID across all collections
    return null; // Placeholder
  }

  private getElementBounds(element: any): { x: number; y: number; width: number; height: number } {
    // Return bounding rectangle for element
    return { x: 0, y: 0, width: 0, height: 0 }; // Placeholder
  }

  /**
   * Selection management
   */
  private selectElement(id: string, clearOthers: boolean = true): void {
    if (clearOthers) {
      this.selectedElements.clear();
    }
    this.selectedElements.add(id);
    this.emit('selectionChanged', { selected: Array.from(this.selectedElements) });
  }

  private toggleSelection(id: string): void {
    if (this.selectedElements.has(id)) {
      this.selectedElements.delete(id);
    } else {
      this.selectedElements.add(id);
    }
    this.emit('selectionChanged', { selected: Array.from(this.selectedElements) });
  }

  private clearSelection(): void {
    this.selectedElements.clear();
    this.emit('selectionChanged', { selected: [] });
  }

  /**
   * Playback control
   */
  public togglePlayback(): void {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  public startPlayback(): void {
    this.isPlaying = true;
    this.state.playbackState = 'playing';
    this.state.currentTime = 0;
    this.emit('playbackStarted');
  }

  public stopPlayback(): void {
    this.isPlaying = false;
    this.state.playbackState = 'stopped';
    this.state.currentTime = 0;
    this.emit('playbackStopped');
  }

  public toggleRecording(): void {
    if (this.state.playbackState === 'recording') {
      this.state.playbackState = 'stopped';
    } else {
      this.state.playbackState = 'recording';
    }
    this.emit('recordingToggled', { recording: this.state.playbackState === 'recording' });
  }

  /**
   * Editing operations
   */
  public deleteSelectedElements(): void {
    this.selectedElements.forEach(id => {
      this.deleteElement(id);
    });
    this.clearSelection();
  }

  private deleteElement(id: string): void {
    // Find and delete element by ID
    this.emit('elementDeleted', { id });
  }

  public copySelection(): void {
    // Copy selected elements to clipboard
    this.clipboard = Array.from(this.selectedElements).map(id => this.findElementById(id));
    this.emit('selectionCopied', { count: this.clipboard.length });
  }

  public pasteSelection(): void {
    // Paste elements from clipboard
    this.emit('selectionPasted', { count: this.clipboard.length });
  }

  public undo(): void {
    // Implement undo functionality
    this.emit('undo');
  }

  public redo(): void {
    // Implement redo functionality
    this.emit('redo');
  }

  /**
   * View operations
   */
  public zoom(factor: number, centerX: number, centerY: number): void {
    const oldPixelsPerBeat = this.viewport.pixelsPerBeat;
    this.viewport.pixelsPerBeat *= factor;
    this.viewport.pixelsPerBeat = Math.max(10, Math.min(200, this.viewport.pixelsPerBeat));

    // Adjust scroll to zoom at center point
    const beatAtCenter = this.xToBeat(centerX);
    const newPixelsPerBeat = this.viewport.pixelsPerBeat;
    const beatOffset = beatAtCenter - this.viewport.startTime;
    const pixelOffset = beatOffset * oldPixelsPerBeat;
    const newBeatOffset = pixelOffset / newPixelsPerBeat;
    this.viewport.startTime = beatAtCenter - newBeatOffset;

    this.emit('zoomChanged', { zoom: this.viewport.pixelsPerBeat });
  }

  public pan(deltaX: number, deltaY: number): void {
    const viewport = this.viewport;
    const beatDelta = deltaX / viewport.pixelsPerBeat;
    const pitchDelta = deltaY / viewport.pixelsPerPitch;

    viewport.startTime -= beatDelta;
    viewport.startPitch += pitchDelta;

    this.emit('viewportChanged', viewport);
  }

  /**
   * History management
   */
  private commitHistory(): void {
    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      action: 'edit',
      description: 'Element modification',
      data: {},
      undoable: true
    };

    this.composition.history.push(entry);

    // Limit history size
    if (this.composition.history.length > 100) {
      this.composition.history.shift();
    }
  }

  /**
   * Auto-save
   */
  private startAutoSave(): void {
    setInterval(() => {
      this.saveComposition();
    }, this.config.autoSaveInterval * 60 * 1000);
  }

  /**
   * File operations
   */
  public saveComposition(): void {
    const compositionData = JSON.stringify(this.composition, null, 2);
    localStorage.setItem('composition', compositionData);
    this.emit('compositionSaved', { id: this.composition.id });
  }

  public loadComposition(): void {
    const compositionData = localStorage.getItem('composition');
    if (compositionData) {
      try {
        this.composition = JSON.parse(compositionData);
        this.emit('compositionLoaded', { id: this.composition.id });
      } catch (error) {
        console.error('Failed to load composition:', error);
      }
    }
  }

  /**
   * Utility methods
   */
  private hasUnsavedChanges(): boolean {
    return true; // Placeholder - check if there are unsaved changes
  }

  private startDrawing(x: number, y: number): void {
    // Start drawing new note/element
  }

  private dragSelectedElements(deltaX: number, deltaY: number): void {
    // Drag selected elements
  }

  // Public getters
  public get composition(): VisualComposition {
    return this.composition;
  }

  public get state(): EditorState {
    return this.state;
  }

  public get viewport(): Viewport {
    return this.viewport;
  }

  public get config(): EditorConfiguration {
    return this.config;
  }
}

// Export all interfaces for external use
export type {
  EditorConfiguration,
  ColorScheme,
  KeyboardShortcuts,
  EditorPanel,
  VisualComposition,
  VisualTrack,
  VisualNote,
  Clip,
  ClipContent,
  AudioMetadata,
  WarpMarker,
  Effect,
  AutomationLane,
  AutomationPoint,
  Marker,
  Section,
  Layer,
  HistoryEntry,
  CompositionMetadata,
  EditorState,
  Viewport,
  EditingAction,
  RealtimeUpdate
};