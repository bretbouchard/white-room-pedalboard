/**
 * Schillinger Integration Service
 *
 * Provides a thin adapter around the core SDK for integration scenarios.
 * Uses dynamic import to resolve the SDK at call time so test mocks
 * (vi.mock) can reliably intercept '@schillinger-sdk/core'.
 */

export class SchillingerIntegrationService {
  private sdkPromise: Promise<any> | null = null;

  private async getSDK(): Promise<any> {
    if (!this.sdkPromise) {
      this.sdkPromise = import('@schillinger-sdk/core').then((mod: any) => {
        const SDKCtor = mod?.SchillingerSDK ?? mod?.default?.SchillingerSDK;
        if (!SDKCtor) throw new Error('SDK not available or incompatible');
        return new SDKCtor();
      });
    }
    return this.sdkPromise;
  }

  /**
   * Analyze harmonic structure using Schillinger's methods
   * @param pattern Input musical pattern to analyze
   * @returns Harmonic analysis results
   */
  async analyzeHarmony(pattern: any): Promise<any> {
    try {
      const sdk = await this.getSDK();
      if (typeof sdk.analyzeHarmonicStructure !== 'function') {
        throw new Error('SDK not available or incompatible');
      }
      return await sdk.analyzeHarmonicStructure(pattern);
    } catch (error) {
      throw new Error(
        `Harmonic analysis failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate musical pattern using Schillinger's systems
   * @param parameters Generation parameters
   * @returns Generated musical pattern
   */
  async generatePattern(parameters: {
    basePattern: any;
    variationRules: Array<{ operation: string; intensity: number }>;
    complexityLevel: number;
  }): Promise<any> {
    try {
      const sdk = await this.getSDK();
      if (typeof sdk.generatePattern !== 'function') {
        throw new Error('SDK not available or incompatible');
      }
      return await sdk.generatePattern(
        parameters.basePattern,
        parameters.variationRules,
        parameters.complexityLevel
      );
    } catch (error) {
      throw new Error(
        `Pattern generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
