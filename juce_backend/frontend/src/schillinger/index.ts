/**
 * @fileoverview Schillinger Operating System Integration
 * Main entry point for the Schillinger OS integration with the audio agent
 */

import { SchillingerOS } from './core/schillinger-os';
import { DynamicBridgeEngine } from './core/dynamic-bridge';
import { IntentionProcessor } from './core/intention-processor';
import { AGUISchillingerBridge } from './core/agui-schillinger-bridge';
import type { SchillingerConfig, AGUISchillingerConfig } from './types/schillinger';

//================================================================================================
// Schillinger System Integration Class
//================================================================================================

export class SchillingerSystem {
  private schillingerOS: SchillingerOS;
  private dynamicBridge: DynamicBridgeEngine;
  private intentionProcessor: IntentionProcessor;
  private aguiBridge: AGUISchillingerBridge;
  private isInitialized = false;

  constructor(
    schillingerConfig: Partial<SchillingerConfig> = {},
    aguiConfig: Partial<AGUISchillingerConfig> = {}
  ) {
    // Initialize core components
    this.schillingerOS = new SchillingerOS(schillingerConfig);
    this.dynamicBridge = new DynamicBridgeEngine();
    this.intentionProcessor = new IntentionProcessor(this.schillingerOS.getConfig());

    // AGUI bridge will be initialized later when AGUI instance is available
    this.aguiBridge = null as any;
  }

  async initialize(aguiBridge?: any): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Schillinger System...');

      // Initialize core components
      await this.schillingerOS.initialize();
      await this.dynamicBridge.initialize();

      // Initialize AGUI bridge if provided
      if (aguiBridge) {
        this.aguiBridge = new AGUISchillingerBridge(
          this.schillingerOS,
          this.intentionProcessor,
          aguiBridge
        );
        await this.aguiBridge.initialize();
      }

      this.isInitialized = true;
      console.log('✅ Schillinger System initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Schillinger System:', error);
      throw error;
    }
  }

  // Core musical operations
  async processMusicalIntention(
    intention: string,
    currentMaterial: any,
    context: any = {}
  ) {
    if (!this.isInitialized) {
      throw new Error('Schillinger System not initialized. Call initialize() first.');
    }

    return this.intentionProcessor.processIntention(intention, currentMaterial, context);
  }

  async transformBetweenDimensions(
    fromDimension: string,
    toDimension: string,
    sourceMaterial: any,
    parameters: any = {}
  ) {
    if (!this.isInitialized) {
      throw new Error('Schillinger System not initialized. Call initialize() first.');
    }

    return this.dynamicBridge.transform(
      fromDimension as any,
      toDimension as any,
      sourceMaterial,
      parameters
    );
  }

  // AGUI integration
  async enhanceAGUIResponse(message: string, context: any) {
    if (!this.aguiBridge) {
      console.warn('AGUI Bridge not initialized');
      return null;
    }

    return this.aguiBridge.enhanceAGUIResponse(message, context);
  }

  // System status and utilities
  isReady(): boolean {
    return this.isInitialized &&
           this.schillingerOS.isReady() &&
           (this.aguiBridge?.isReady() ?? true);
  }

  getSystemInfo() {
    return {
      initialized: this.isInitialized,
      components: {
        schillingerOS: this.schillingerOS.isReady(),
        dynamicBridge: this.dynamicBridge ? true : false,
        intentionProcessor: this.intentionProcessor ? true : false,
        aguiBridge: this.aguiBridge?.isReady() ?? false
      },
      config: this.schillingerOS.getConfig()
    };
  }

  // Learning and adaptation
  recordFeedback(
    originalIntention: string,
    appliedOperations: any[],
    feedback: 'accept' | 'reject' | 'modify'
  ) {
    this.intentionProcessor.learnFromFeedback(
      originalIntention,
      appliedOperations,
      feedback
    );
  }

  getUserHistory(userId?: string) {
    return this.aguiBridge?.getUserLearningHistory(userId) || [];
  }

  // Cleanup
  dispose() {
    this.schillingerOS.dispose();
    this.isInitialized = false;
  }
}

//================================================================================================
// Global Instance and Initialization
//================================================================================================

let globalSchillingerSystem: SchillingerSystem | null = null;

export async function initializeSchillingerSystem(
  schillingerConfig?: Partial<SchillingerConfig>,
  aguiConfig?: Partial<AGUISchillingerConfig>,
  aguiBridge?: any
): Promise<SchillingerSystem> {
  if (globalSchillingerSystem) {
    console.warn('Schillinger System already initialized');
    return globalSchillingerSystem;
  }

  globalSchillingerSystem = new SchillingerSystem(schillingerConfig, aguiConfig);
  await globalSchillingerSystem.initialize(aguiBridge);

  return globalSchillingerSystem;
}

export function getSchillingerSystem(): SchillingerSystem | null {
  return globalSchillingerSystem;
}

//================================================================================================
// Convenience Functions for Direct Usage
//================================================================================================

export async function processMusicalIntention(
  intention: string,
  currentMaterial: any,
  context: any = {}
) {
  const system = getSchillingerSystem();
  if (!system) {
    throw new Error('Schillinger System not initialized. Call initializeSchillingerSystem() first.');
  }

  return system.processMusicalIntention(intention, currentMaterial, context);
}

export async function transformMusic(
  fromDimension: string,
  toDimension: string,
  sourceMaterial: any,
  parameters: any = {}
) {
  const system = getSchillingerSystem();
  if (!system) {
    throw new Error('Schillinger System not initialized. Call initializeSchillingerSystem() first.');
  }

  return system.transformBetweenDimensions(fromDimension, toDimension, sourceMaterial, parameters);
}

export async function enhanceAIResponse(message: string, context: any) {
  const system = getSchillingerSystem();
  if (!system) {
    return null;
  }

  return system.enhanceAGUIResponse(message, context);
}

//================================================================================================
// Exports
//================================================================================================

export { SchillingerSystem };
export type { SchillingerConfig, AGUISchillingerConfig };

// Export core components for advanced usage
export { SchillingerOS } from './core/schillinger-os';
export { DynamicBridgeEngine } from './core/dynamic-bridge';
export { IntentionProcessor } from './core/intention-processor';
export { AGUISchillingerBridge } from './core/agui-schillinger-bridge';

// Export types
export * from './types/schillinger';