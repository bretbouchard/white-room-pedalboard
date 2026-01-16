/**
 * Plugin management system for audio effects and instruments
 */

import { PluginInfo } from './synthesis';

export interface PluginRegistry {
  instruments: Map<string, PluginInfo>;
  effects: Map<string, PluginInfo>;
}

export interface PluginLoadOptions {
  autoEnable?: boolean;
  defaultParameters?: Record<string, any>;
  presetName?: string;
}

export interface PluginInstance {
  id: string;
  pluginId: string;
  name: string;
  type: 'instrument' | 'effect';
  enabled: boolean;
  parameters: Record<string, any>;
  preset?: string;
}

/**
 * Plugin management system for organizing and loading audio plugins
 */
export class PluginManager {
  private registry: PluginRegistry = {
    instruments: new Map(),
    effects: new Map(),
  };
  private instances: Map<string, PluginInstance> = new Map();
  private loadedPlugins: Map<string, any> = new Map();

  /**
   * Register a plugin in the system
   */
  registerPlugin(plugin: PluginInfo): void {
    if (plugin.type === 'instrument') {
      this.registry.instruments.set(plugin.id, plugin);
    } else {
      this.registry.effects.set(plugin.id, plugin);
    }
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): void {
    this.registry.instruments.delete(pluginId);
    this.registry.effects.delete(pluginId);
    this.loadedPlugins.delete(pluginId);

    // Remove all instances of this plugin
    for (const [instanceId, instance] of this.instances.entries()) {
      if (instance.pluginId === pluginId) {
        this.instances.delete(instanceId);
      }
    }
  }

  /**
   * Load a plugin from URL or file
   */
  async loadPlugin(
    pluginUrl: string
    // options: PluginLoadOptions = {}
  ): Promise<PluginInfo> {
    try {
      // In a real implementation, this would load actual plugin files
      // For now, simulate loading with a mock plugin
      const mockPlugin: PluginInfo = {
        id: `plugin-${Date.now()}`,
        name: `Loaded Plugin`,
        type: 'instrument',
        parameters: [
          { name: 'volume', type: 'number', min: 0, max: 1, default: 0.7 },
          { name: 'enabled', type: 'boolean', default: true },
        ],
        presets: [
          { name: 'Default', parameters: { volume: 0.7, enabled: true } },
        ],
      };

      this.registerPlugin(mockPlugin);
      this.loadedPlugins.set(mockPlugin.id, { url: pluginUrl, loaded: true });

      return mockPlugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from ${pluginUrl}: ${error}`);
    }
  }

  /**
   * Create an instance of a plugin
   */
  createInstance(
    pluginId: string,
    instanceName?: string,
    options: PluginLoadOptions = {}
  ): PluginInstance {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const instanceId = `${pluginId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = instanceName || `${plugin.name} Instance`;

    // Get default parameters
    let parameters: Record<string, any> = {};
    for (const param of plugin.parameters) {
      parameters[param.name] = param.default;
    }

    // Apply preset if specified
    if (options.presetName && plugin.presets) {
      const preset = plugin.presets.find(p => p.name === options.presetName);
      if (preset) {
        parameters = { ...parameters, ...preset.parameters };
      }
    }

    // Apply custom parameters
    if (options.defaultParameters) {
      parameters = { ...parameters, ...options.defaultParameters };
    }

    const instance: PluginInstance = {
      id: instanceId,
      pluginId,
      name,
      type: plugin.type,
      enabled: options.autoEnable !== false,
      parameters,
      preset: options.presetName,
    };

    this.instances.set(instanceId, instance);
    return instance;
  }

  /**
   * Remove a plugin instance
   */
  removeInstance(instanceId: string): boolean {
    return this.instances.delete(instanceId);
  }

  /**
   * Get plugin instance by ID
   */
  getInstance(instanceId: string): PluginInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Get all instances of a specific plugin
   */
  getInstancesByPlugin(pluginId: string): PluginInstance[] {
    return Array.from(this.instances.values()).filter(
      instance => instance.pluginId === pluginId
    );
  }

  /**
   * Get all plugin instances
   */
  getAllInstances(): PluginInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Update instance parameters
   */
  updateInstanceParameters(
    instanceId: string,
    parameters: Record<string, any>
  ): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const plugin = this.getPlugin(instance.pluginId);
    if (!plugin) return false;

    // Validate parameters
    for (const [key, value] of Object.entries(parameters)) {
      const paramDef = plugin.parameters.find(p => p.name === key);
      if (!paramDef) continue;

      // Type validation
      if (paramDef.type === 'number') {
        if (typeof value !== 'number') continue;
        if (paramDef.min !== undefined && value < paramDef.min) continue;
        if (paramDef.max !== undefined && value > paramDef.max) continue;
      } else if (paramDef.type === 'boolean') {
        if (typeof value !== 'boolean') continue;
      } else if (paramDef.type === 'enum') {
        if (!paramDef.options?.includes(value)) continue;
      }

      instance.parameters[key] = value;
    }

    return true;
  }

  /**
   * Apply preset to instance
   */
  applyPreset(instanceId: string, presetName: string): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    const plugin = this.getPlugin(instance.pluginId);
    if (!plugin?.presets) return false;

    const preset = plugin.presets.find(p => p.name === presetName);
    if (!preset) return false;

    instance.parameters = { ...instance.parameters, ...preset.parameters };
    instance.preset = presetName;

    return true;
  }

  /**
   * Enable/disable instance
   */
  setInstanceEnabled(instanceId: string, enabled: boolean): boolean {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;

    instance.enabled = enabled;
    return true;
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginInfo | undefined {
    return (
      this.registry.instruments.get(pluginId) ||
      this.registry.effects.get(pluginId)
    );
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): PluginInfo[] {
    return [
      ...Array.from(this.registry.instruments.values()),
      ...Array.from(this.registry.effects.values()),
    ];
  }

  /**
   * Get plugins by type
   */
  getPluginsByType(type: 'instrument' | 'effect'): PluginInfo[] {
    return Array.from(
      this.registry[type === 'instrument' ? 'instruments' : 'effects'].values()
    );
  }

  /**
   * Search plugins by name or tags
   */
  searchPlugins(query: string): PluginInfo[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPlugins().filter(
      plugin =>
        plugin.name.toLowerCase().includes(lowerQuery) ||
        plugin.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get plugin statistics
   */
  getStats(): {
    totalPlugins: number;
    instruments: number;
    effects: number;
    totalInstances: number;
    enabledInstances: number;
    loadedPlugins: number;
  } {
    const enabledInstances = Array.from(this.instances.values()).filter(
      i => i.enabled
    ).length;

    return {
      totalPlugins: this.getAllPlugins().length,
      instruments: this.registry.instruments.size,
      effects: this.registry.effects.size,
      totalInstances: this.instances.size,
      enabledInstances,
      loadedPlugins: this.loadedPlugins.size,
    };
  }

  /**
   * Export plugin configuration
   */
  exportConfiguration(): {
    plugins: PluginInfo[];
    instances: PluginInstance[];
    loadedPlugins: Array<{ id: string; url: string }>;
  } {
    return {
      plugins: this.getAllPlugins(),
      instances: this.getAllInstances(),
      loadedPlugins: Array.from(this.loadedPlugins.entries()).map(
        ([id, data]) => ({
          id,
          url: (data as any).url,
        })
      ),
    };
  }

  /**
   * Import plugin configuration
   */
  async importConfiguration(config: {
    plugins?: PluginInfo[];
    instances?: PluginInstance[];
    loadedPlugins?: Array<{ id: string; url: string }>;
  }): Promise<void> {
    // Register plugins
    if (config.plugins) {
      for (const plugin of config.plugins) {
        this.registerPlugin(plugin);
      }
    }

    // Load plugins from URLs
    if (config.loadedPlugins) {
      for (const pluginRef of config.loadedPlugins) {
        try {
          await this.loadPlugin(pluginRef.url);
        } catch (error) {
          console.warn(`Failed to load plugin ${pluginRef.id}: ${error}`);
        }
      }
    }

    // Recreate instances
    if (config.instances) {
      for (const instance of config.instances) {
        if (this.getPlugin(instance.pluginId)) {
          this.instances.set(instance.id, { ...instance });
        }
      }
    }
  }

  /**
   * Clear all plugins and instances
   */
  clear(): void {
    this.registry.instruments.clear();
    this.registry.effects.clear();
    this.instances.clear();
    this.loadedPlugins.clear();
  }

  /**
   * Initialize with built-in plugins
   */
  initializeBuiltIns(): void {
    // Built-in instruments
    const builtInInstruments: PluginInfo[] = [
      {
        id: 'builtin-sine',
        name: 'Sine Wave Synthesizer',
        type: 'instrument',
        parameters: [
          { name: 'volume', type: 'number', min: 0, max: 1, default: 0.7 },
          { name: 'attack', type: 'number', min: 0, max: 2, default: 0.01 },
          { name: 'decay', type: 'number', min: 0, max: 2, default: 0.1 },
          { name: 'sustain', type: 'number', min: 0, max: 1, default: 0.7 },
          { name: 'release', type: 'number', min: 0, max: 2, default: 0.2 },
          { name: 'detune', type: 'number', min: -100, max: 100, default: 0 },
        ],
        presets: [
          {
            name: 'Default',
            parameters: {
              volume: 0.7,
              attack: 0.01,
              decay: 0.1,
              sustain: 0.7,
              release: 0.2,
              detune: 0,
            },
          },
          {
            name: 'Pad',
            parameters: {
              volume: 0.5,
              attack: 0.5,
              decay: 0.3,
              sustain: 0.8,
              release: 1.0,
              detune: 0,
            },
          },
          {
            name: 'Lead',
            parameters: {
              volume: 0.8,
              attack: 0.001,
              decay: 0.05,
              sustain: 0.6,
              release: 0.1,
              detune: 5,
            },
          },
        ],
      },
      {
        id: 'builtin-square',
        name: 'Square Wave Synthesizer',
        type: 'instrument',
        parameters: [
          { name: 'volume', type: 'number', min: 0, max: 1, default: 0.6 },
          { name: 'attack', type: 'number', min: 0, max: 2, default: 0.01 },
          { name: 'decay', type: 'number', min: 0, max: 2, default: 0.1 },
          { name: 'sustain', type: 'number', min: 0, max: 1, default: 0.7 },
          { name: 'release', type: 'number', min: 0, max: 2, default: 0.2 },
          {
            name: 'pulseWidth',
            type: 'number',
            min: 0.1,
            max: 0.9,
            default: 0.5,
          },
        ],
        presets: [
          {
            name: 'Default',
            parameters: {
              volume: 0.6,
              attack: 0.01,
              decay: 0.1,
              sustain: 0.7,
              release: 0.2,
              pulseWidth: 0.5,
            },
          },
          {
            name: 'Bass',
            parameters: {
              volume: 0.8,
              attack: 0.001,
              decay: 0.2,
              sustain: 0.3,
              release: 0.1,
              pulseWidth: 0.3,
            },
          },
        ],
      },
      {
        id: 'builtin-drums',
        name: 'Drum Kit',
        type: 'instrument',
        parameters: [
          { name: 'volume', type: 'number', min: 0, max: 1, default: 0.8 },
          { name: 'kickVolume', type: 'number', min: 0, max: 1, default: 1.0 },
          { name: 'snareVolume', type: 'number', min: 0, max: 1, default: 0.8 },
          { name: 'hihatVolume', type: 'number', min: 0, max: 1, default: 0.6 },
          { name: 'kickTune', type: 'number', min: -12, max: 12, default: 0 },
          { name: 'snareTune', type: 'number', min: -12, max: 12, default: 0 },
        ],
        presets: [
          {
            name: 'Standard',
            parameters: {
              volume: 0.8,
              kickVolume: 1.0,
              snareVolume: 0.8,
              hihatVolume: 0.6,
              kickTune: 0,
              snareTune: 0,
            },
          },
          {
            name: 'Quiet',
            parameters: {
              volume: 0.5,
              kickVolume: 0.7,
              snareVolume: 0.5,
              hihatVolume: 0.3,
              kickTune: 0,
              snareTune: 0,
            },
          },
          {
            name: 'Punchy',
            parameters: {
              volume: 0.9,
              kickVolume: 1.2,
              snareVolume: 1.0,
              hihatVolume: 0.4,
              kickTune: -2,
              snareTune: 2,
            },
          },
        ],
      },
    ];

    // Built-in effects
    const builtInEffects: PluginInfo[] = [
      {
        id: 'builtin-reverb',
        name: 'Reverb',
        type: 'effect',
        parameters: [
          { name: 'roomSize', type: 'number', min: 0, max: 1, default: 0.5 },
          { name: 'damping', type: 'number', min: 0, max: 1, default: 0.5 },
          { name: 'wetLevel', type: 'number', min: 0, max: 1, default: 0.3 },
          { name: 'dryLevel', type: 'number', min: 0, max: 1, default: 0.7 },
          { name: 'enabled', type: 'boolean', default: true },
        ],
        presets: [
          {
            name: 'Small Room',
            parameters: {
              roomSize: 0.3,
              damping: 0.7,
              wetLevel: 0.2,
              dryLevel: 0.8,
              enabled: true,
            },
          },
          {
            name: 'Large Hall',
            parameters: {
              roomSize: 0.8,
              damping: 0.3,
              wetLevel: 0.5,
              dryLevel: 0.5,
              enabled: true,
            },
          },
          {
            name: 'Plate',
            parameters: {
              roomSize: 0.6,
              damping: 0.1,
              wetLevel: 0.4,
              dryLevel: 0.6,
              enabled: true,
            },
          },
        ],
      },
      {
        id: 'builtin-delay',
        name: 'Delay',
        type: 'effect',
        parameters: [
          { name: 'delayTime', type: 'number', min: 0, max: 2, default: 0.3 },
          { name: 'feedback', type: 'number', min: 0, max: 0.95, default: 0.4 },
          { name: 'wetLevel', type: 'number', min: 0, max: 1, default: 0.3 },
          { name: 'dryLevel', type: 'number', min: 0, max: 1, default: 0.7 },
          { name: 'enabled', type: 'boolean', default: true },
        ],
        presets: [
          {
            name: 'Short Echo',
            parameters: {
              delayTime: 0.125,
              feedback: 0.3,
              wetLevel: 0.2,
              dryLevel: 0.8,
              enabled: true,
            },
          },
          {
            name: 'Long Echo',
            parameters: {
              delayTime: 0.5,
              feedback: 0.6,
              wetLevel: 0.4,
              dryLevel: 0.6,
              enabled: true,
            },
          },
          {
            name: 'Slapback',
            parameters: {
              delayTime: 0.08,
              feedback: 0.1,
              wetLevel: 0.3,
              dryLevel: 0.7,
              enabled: true,
            },
          },
        ],
      },
      {
        id: 'builtin-filter',
        name: 'Filter',
        type: 'effect',
        parameters: [
          {
            name: 'cutoff',
            type: 'number',
            min: 20,
            max: 20000,
            default: 1000,
          },
          { name: 'resonance', type: 'number', min: 0, max: 10, default: 1 },
          {
            name: 'type',
            type: 'enum',
            options: ['lowpass', 'highpass', 'bandpass'],
            default: 'lowpass',
          },
          { name: 'enabled', type: 'boolean', default: true },
        ],
        presets: [
          {
            name: 'Low Pass',
            parameters: {
              cutoff: 1000,
              resonance: 1,
              type: 'lowpass',
              enabled: true,
            },
          },
          {
            name: 'High Pass',
            parameters: {
              cutoff: 200,
              resonance: 1,
              type: 'highpass',
              enabled: true,
            },
          },
          {
            name: 'Band Pass',
            parameters: {
              cutoff: 1000,
              resonance: 2,
              type: 'bandpass',
              enabled: true,
            },
          },
        ],
      },
    ];

    // Register all built-in plugins
    for (const plugin of [...builtInInstruments, ...builtInEffects]) {
      this.registerPlugin(plugin);
    }
  }
}
