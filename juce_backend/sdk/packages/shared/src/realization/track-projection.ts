/**
 * Track Projection Implementation
 *
 * Maps realized layers to actual output tracks, handling instrument
 * assignment and output formatting for DAW integration.
 */

import {
  TrackProjection as ITrackProjection,
  TrackSet,
  RealizedLayer,
  InstrumentSpec,
  MusicalRole,
  MusicalMaterial,
  MusicalEvent,
  DAWTrackExport,
} from '../types/realization';
import { OrchestraField } from '../fields/orchestra-field';

/**
 * Track projection strategies
 */
export type ProjectionStrategy =
  | 'one-to-one'      // Each layer gets its own track
  | 'role-based'      // Layers with same role share tracks
  | 'instrument-group' // Same instruments grouped
  | 'density-based'   // Group by density/activity
  | 'adaptive';       // Dynamically choose best strategy

/**
 * Output format specifications
 */
export interface OutputFormat {
  format: 'midi' | 'audio' | 'daw';
  target?: string; // DAW name, interface, etc.
  sampleRate?: number; // For audio
  bitDepth?: number; // For audio
  tempo?: number;
  timeSignature?: [number, number];
}

/**
 * Track projection implementation
 */
export class TrackProjection implements ITrackProjection {
  public readonly id: string;
  public name: string;
  public layers: string[];
  public instrument?: InstrumentSpec;
  public output: {
    format: 'midi' | 'audio' | 'daw';
    channel?: number;
    bus?: string;
  };
  public parameters: {
    volume: number;
    pan: number;
    reverb?: number;
    effects?: Record<string, number>;
  };

  constructor(options: {
    id: string;
    name: string;
    layers: string[];
    instrument?: InstrumentSpec;
    output: {
      format: 'midi' | 'audio' | 'daw';
      channel?: number;
      bus?: string;
    };
    parameters: {
      volume: number;
      pan: number;
      reverb?: number;
      effects?: Record<string, number>;
    };
  }) {
    this.id = options.id;
    this.name = options.name;
    this.layers = options.layers;
    this.instrument = options.instrument;
    this.output = options.output;
    this.parameters = options.parameters;
  }

  /**
   * Check if this projection can handle additional layers
   */
  canAddLayer(layerId: string, layerRole: MusicalRole): boolean {
    if (this.layers.length === 0) return true;

    // Check role compatibility
    const primaryRole = this.getPrimaryRole();
    return this.areRolesCompatible(primaryRole, layerRole);
  }

  /**
   * Add a layer to this projection
   */
  addLayer(layerId: string, layerRole: MusicalRole): void {
    if (!this.canAddLayer(layerId, layerRole)) {
      throw new Error(`Cannot add layer ${layerId} to projection ${this.id}`);
    }

    this.layers.push(layerId);
    this.updateParametersForNewLayer();
  }

  /**
   * Remove a layer from this projection
   */
  removeLayer(layerId: string): void {
    const index = this.layers.indexOf(layerId);
    if (index >= 0) {
      this.layers.splice(index, 1);
      this.updateParametersAfterLayerRemoval();
    }
  }

  /**
   * Get primary role of this projection
   */
  getPrimaryRole(): MusicalRole {
    // This would need access to layer information - simplified here
    return 'melody'; // Placeholder
  }

  /**
   * Check if two roles are compatible for sharing a track
   */
  private areRolesCompatible(role1: MusicalRole, role2: MusicalRole): boolean {
    const compatibleMatrix: Record<MusicalRole, MusicalRole[]> = {
      'melody': ['counter-melody', 'lead', 'ornament'],
      'lead': ['melody', 'counter-melody'],
      'bass': ['rhythm', 'accompaniment'],
      'harmony': ['accompaniment', 'texture'],
      'counter-melody': ['melody', 'lead', 'ornament'],
      'rhythm': ['bass', 'texture'],
      'texture': ['harmony', 'rhythm', 'accompaniment'],
      'ornament': ['melody', 'counter-melody', 'texture'],
      'accompaniment': ['harmony', 'bass', 'texture']
    };

    return compatibleMatrix[role1]?.includes(role2) || false;
  }

  /**
   * Update parameters when adding a new layer
   */
  private updateParametersForNewLayer(): void {
    // Adjust volume and panning based on layer count
    const volumeAdjustment = 1 / Math.sqrt(this.layers.length);
    this.parameters.volume = Math.max(0.1, this.parameters.volume * volumeAdjustment);

    // Adjust panning if multiple layers
    if (this.layers.length > 1) {
      // Simple panning distribution
      this.parameters.pan = (this.layers.length - 1) / (this.layers.length + 1) * 2 - 1;
    }
  }

  /**
   * Update parameters after removing a layer
   */
  private updateParametersAfterLayerRemoval(): void {
    if (this.layers.length > 0) {
      const volumeAdjustment = Math.sqrt(this.layers.length + 1) / Math.sqrt(this.layers.length);
      this.parameters.volume = Math.min(1.0, this.parameters.volume * volumeAdjustment);

      if (this.layers.length === 1) {
        this.parameters.pan = 0; // Center single layer
      }
    }
  }
}

/**
 * Track set manager for creating and managing track projections
 */
export class TrackSetManager {
  private _projections: Map<string, TrackProjection> = new Map();
  private _orchestraField: OrchestraField;
  private _strategy: ProjectionStrategy;

  constructor(
    orchestraField: OrchestraField,
    strategy: ProjectionStrategy = 'adaptive'
  ) {
    this._orchestraField = orchestraField;
    this._strategy = strategy;
  }

  /**
   * Create track projections from realized layers
   */
  assign(layers: RealizedLayer[]): TrackSet {
    // Clear existing projections
    this._projections.clear();

    // Group layers based on strategy
    const layerGroups = this.groupLayers(layers);

    // Create projections for each group
    for (const group of layerGroups) {
      const projection = this.createProjectionForGroup(group);
      this._projections.set(projection.id, projection);
    }

    // Optimize the overall track set
    this.optimizeTrackSet();

    return {
      id: `trackset-${Date.now()}`,
      tracks: Array.from(this._projections.values()),
      metadata: {
        format: 'daw',
        target: 'generic'
      }
    };
  }

  /**
   * Export track set for specific DAW
   */
  exportForDAW(
    trackSet: TrackSet,
    dawFormat: 'ableton' | 'logic' | 'protools' | 'cubase' | 'generic-midi',
    options: {
      tempo?: number;
      timeSignature?: [number, number];
      duration?: number;
    } = {}
  ): DAWTrackExport {
    const tempo = options.tempo || 120;
    const timeSignature = options.timeSignature || [4, 4];
    const duration = options.duration || 30;

    return {
      format: dawFormat,
      tracks: trackSet.tracks.map(track => ({
        name: track.name,
        instrument: track.instrument?.name || 'Unknown',
        midiData: this.generateMIDIData(track, duration, tempo),
        automation: this.generateAutomation(track, duration, tempo)
      })),
      tempo,
      timeSignature,
      duration
    };
  }

  /**
   * Get projection by ID
   */
  getProjection(id: string): TrackProjection | undefined {
    return this._projections.get(id);
  }

  /**
   * Get all projections
   */
  getAllProjections(): TrackProjection[] {
    return Array.from(this._projections.values());
  }

  /**
   * Update projection strategy
   */
  setStrategy(strategy: ProjectionStrategy): void {
    this._strategy = strategy;
  }

  /**
   * Group layers based on current strategy
   */
  private groupLayers(layers: RealizedLayer[]): RealizedLayer[][] {
    switch (this._strategy) {
      case 'one-to-one':
        return layers.map(layer => [layer]);

      case 'role-based':
        return this.groupByRole(layers);

      case 'instrument-group':
        return this.groupByInstrument(layers);

      case 'density-based':
        return this.groupByDensity(layers);

      case 'adaptive':
        return this.adaptiveGrouping(layers);

      default:
        return this.groupByRole(layers);
    }
  }

  /**
   * Group layers by musical role
   */
  private groupByRole(layers: RealizedLayer[]): RealizedLayer[][] {
    const roleGroups: Map<MusicalRole, RealizedLayer[]> = new Map();

    for (const layer of layers) {
      const role = layer.role;
      if (!roleGroups.has(role)) {
        roleGroups.set(role, []);
      }
      roleGroups.get(role)!.push(layer);
    }

    return Array.from(roleGroups.values());
  }

  /**
   * Group layers by compatible instrument assignment
   */
  private groupByInstrument(layers: RealizedLayer[]): RealizedLayer[][] {
    // Assign instruments to layers first
    const assignments = this._orchestraField.assignInstruments(
      layers.map(layer => ({
        layerId: layer.id,
        role: layer.role,
        register: layer.register,
        energy: layer.energy
      }))
    );

    // Group by instrument family
    const familyGroups: Map<string, RealizedLayer[]> = new Map();

    for (const assignment of assignments) {
      const family = assignment.instrument.family;
      if (!familyGroups.has(family)) {
        familyGroups.set(family, []);
      }
      const layer = layers.find(l => l.id === assignment.layerId);
      if (layer) {
        familyGroups.get(family)!.push(layer);
      }
    }

    return Array.from(familyGroups.values());
  }

  /**
   * Group layers by activity density
   */
  private groupByDensity(layers: RealizedLayer[]): RealizedLayer[][] {
    // Calculate layer density
    const layersWithDensity = layers.map(layer => ({
      layer,
      density: layer.material.length / 10 // Assuming 10 second window
    }));

    // Sort by density
    layersWithDensity.sort((a, b) => b.density - a.density);

    // Group into balanced sets
    const groups: RealizedLayer[][] = [];
    const targetGroupsCount = Math.min(8, Math.ceil(layers.length / 2));

    for (let i = 0; i < targetGroupsCount; i++) {
      groups.push([]);
    }

    // Distribute layers round-robin to balance density
    for (let i = 0; i < layersWithDensity.length; i++) {
      const groupIndex = i % targetGroupsCount;
      groups[groupIndex].push(layersWithDensity[i].layer);
    }

    return groups;
  }

  /**
   * Adaptive grouping based on context
   */
  private adaptiveGrouping(layers: RealizedLayer[]): RealizedLayer[][] {
    const layerCount = layers.length;

    if (layerCount <= 4) {
      // Small number of layers - one-to-one
      return this.groupByRole(layers);
    } else if (layerCount <= 8) {
      // Medium number - role-based with some grouping
      return this.hybridGrouping(layers);
    } else {
      // Large number - density-based for efficiency
      return this.groupByDensity(layers);
    }
  }

  /**
   * Hybrid grouping combining role and density considerations
   */
  private hybridGrouping(layers: RealizedLayer[]): RealizedLayer[][] {
    const groups: RealizedLayer[][] = [];

    // Keep dominant roles separate
    const dominantRoles = ['melody', 'lead', 'bass'];
    const dominantLayers = layers.filter(l => dominantRoles.includes(l.role));
    const otherLayers = layers.filter(l => !dominantRoles.includes(l.role));

    // Add dominant layers as separate groups
    for (const layer of dominantLayers) {
      groups.push([layer]);
    }

    // Group other layers by role
    const otherGroups = this.groupByRole(otherLayers);
    groups.push(...otherGroups);

    return groups;
  }

  /**
   * Create projection for a layer group
   */
  private createProjectionForGroup(group: RealizedLayer[]): TrackProjection {
    if (group.length === 0) {
      throw new Error('Cannot create projection for empty group');
    }

    const primaryLayer = group[0];
    const layerIds = group.map(l => l.id);

    // Assign instrument for the group
    const assignment = this._orchestraField.assignInstruments([{
      layerId: primaryLayer.id,
      role: primaryLayer.role,
      register: this.calculateGroupRegister(group),
      energy: this.calculateGroupEnergy(group)
    }]);

    const instrument = assignment[0]?.instrument;

    return new TrackProjection({
      id: `track-${group[0].id}-${Date.now()}`,
      name: this.generateTrackName(group, instrument),
      layers: layerIds,
      instrument,
      output: {
        format: 'midi',
        channel: this.getMidiChannel(instrument?.family)
      },
      parameters: {
        volume: this.calculateGroupVolume(group),
        pan: this.calculateGroupPan(group),
        reverb: this.calculateGroupReverb(instrument?.family)
      }
    });
  }

  /**
   * Optimize overall track set
   */
  private optimizeTrackSet(): void {
    // Balance volume levels
    this.balanceVolumes();

    // Optimize panning for stereo field
    this.optimizePanning();

    // Resolve conflicts
    this.resolveConflicts();
  }

  /**
   * Balance volume levels across all tracks
   */
  private balanceVolumes(): void {
    const projections = Array.from(this._projections.values());
    if (projections.length === 0) return;

    // Calculate average volume
    const avgVolume = projections.reduce((sum, p) => sum + p.parameters.volume, 0) / projections.length;

    // Apply gentle balancing
    for (const projection of projections) {
      const adjustment = 0.7 + (projection.parameters.volume / avgVolume) * 0.3;
      projection.parameters.volume = Math.max(0.1, Math.min(1.0, projection.parameters.volume * adjustment));
    }
  }

  /**
   * Optimize panning for stereo distribution
   */
  private optimizePanning(): void {
    const projections = Array.from(this._projections.values());
    const sortedByRole = this.sortByRoleImportance(projections);

    for (let i = 0; i < sortedByRole.length; i++) {
      const projection = sortedByRole[i];
      if (projection.parameters.pan === 0) { // Only if not manually set
        // Distribute across stereo field
        const panPosition = (i / (sortedByRole.length - 1)) * 2 - 1;
        projection.parameters.pan = panPosition * 0.8; // Reduce extremes
      }
    }
  }

  /**
   * Resolve track conflicts
   */
  private resolveConflicts(): void {
    // Check for duplicate MIDI channels
    const channelUsage: Map<number, TrackProjection[]> = new Map();

    for (const projection of this._projections.values()) {
      if (projection.output.channel !== undefined) {
        if (!channelUsage.has(projection.output.channel)) {
          channelUsage.set(projection.output.channel, []);
        }
        channelUsage.get(projection.output.channel)!.push(projection);
      }
    }

    // Resolve channel conflicts
    for (const [channel, projections] of channelUsage.entries()) {
      if (projections.length > 1) {
        // Reassign channels
        for (let i = 0; i < projections.length; i++) {
          projections[i].output.channel = (channel + i) % 16; // MIDI channels 0-15
        }
      }
    }
  }

  // Helper methods

  private calculateGroupRegister(group: RealizedLayer[]): any {
    const registers = group.map(l => l.register);
    const min = Math.min(...registers.map(r => r.min));
    const max = Math.max(...registers.map(r => r.max));
    return { min, max, center: (min + max) / 2, width: max - min };
  }

  private calculateGroupEnergy(group: RealizedLayer[]): number {
    return group.reduce((sum, layer) => sum + layer.energy, 0) / group.length;
  }

  private generateTrackName(group: RealizedLayer[], instrument?: InstrumentSpec): string {
    if (group.length === 1) {
      const layer = group[0];
      return `${instrument?.name || layer.role} (${layer.id})`;
    } else {
      const roles = group.map(l => l.role).join(' + ');
      return `${instrument?.name || 'Ensemble'} (${roles})`;
    }
  }

  private getMidiChannel(family?: string): number {
    const channels: Record<string, number> = {
      'strings': 0,
      'woodwinds': 1,
      'brass': 2,
      'percussion': 9, // Channel 10 for percussion
      'keyboard': 3,
      'electronic': 4
    };

    return channels[family || ''] || 0;
  }

  private calculateGroupVolume(group: RealizedLayer[]): number {
    const avgEnergy = group.reduce((sum, layer) => sum + layer.energy, 0) / group.length;
    return 0.3 + avgEnergy * 0.5; // Map 0.3-0.8 range
  }

  private calculateGroupPan(group: RealizedLayer[]): number {
    // Simple panning based on primary role
    const primaryRole = group[0].role;
    const rolePans: Record<MusicalRole, number> = {
      melody: 0,
      lead: 0,
      bass: 0,
      harmony: 0,
      'counter-melody': 0.3,
      rhythm: -0.3,
      texture: 0,
      ornament: 0.2,
      accompaniment: -0.2
    };

    return rolePans[primaryRole] || 0;
  }

  private calculateGroupReverb(family?: string): number {
    const reverbLevels: Record<string, number> = {
      'strings': 0.4,
      'woodwinds': 0.2,
      'brass': 0.3,
      'percussion': 0.1,
      'keyboard': 0.3,
      'electronic': 0.5
    };

    return reverbLevels[family || ''] || 0.2;
  }

  private sortByRoleImportance(projections: TrackProjection[]): TrackProjection[] {
    const roleOrder: Record<MusicalRole, number> = {
      melody: 1,
      lead: 2,
      bass: 3,
      harmony: 4,
      'counter-melody': 5,
      rhythm: 6,
      texture: 7,
      ornament: 8,
      accompaniment: 9
    };

    return projections.sort((a, b) => {
      const roleA = this.getProjectionRole(a);
      const roleB = this.getProjectionRole(b);
      return (roleOrder[roleA] || 999) - (roleOrder[roleB] || 999);
    });
  }

  private getProjectionRole(projection: TrackProjection): MusicalRole {
    // This would need access to layer information - simplified
    return 'melody';
  }

  private generateMIDIData(track: TrackProjection, duration: number, tempo: number): ArrayBuffer {
    // Simplified MIDI data generation
    const ticksPerQuarter = 480;
    const totalTicks = (duration / 60) * tempo * ticksPerQuarter;

    // Create basic MIDI structure
    const midiData = new ArrayBuffer(1000); // Placeholder
    return midiData;
  }

  private generateAutomation(track: TrackProjection, duration: number, tempo: number): Array<{
    parameter: string;
    points: Array<{ time: number; value: number }>;
  }> {
    return [
      {
        parameter: 'volume',
        points: [
          { time: 0, value: track.parameters.volume },
          { time: duration, value: track.parameters.volume }
        ]
      },
      {
        parameter: 'pan',
        points: [
          { time: 0, value: track.parameters.pan },
          { time: duration, value: track.parameters.pan }
        ]
      }
    ];
  }
}