import type {
  GeneratorResult,
  SchillingerSDK,
} from '../../shared/src/types';

/**
 * Abstract base class for all Generator classes in the Schillinger SDK.
 *
 * Generators provide a stateful, deterministic alternative to the functional APIs,
 * allowing for parameter persistence, configuration management, and enhanced
 * metadata tracking.
 *
 * @template TConfig - Configuration type for the generator
 * @template TParams - Runtime parameters type for the generator
 */
export abstract class BaseGenerator<TConfig, TParams> {
  protected config: TConfig;
  protected parameters: TParams;
  protected sdk: SchillingerSDK;
  protected readonly generatorName: string;

  /**
   * Create a new Generator instance
   *
   * @param config - Configuration options for the generator
   * @param sdk - SchillingerSDK instance (optional, can be set later)
   */
  constructor(config: TConfig, sdk?: SchillingerSDK) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.parameters = this.getDefaultParameters();
    this.sdk = sdk || (config as any)?.sdk;
    this.generatorName = this.constructor.name;
  }

  /**
   * Get the default configuration for this generator
   */
  abstract getDefaultConfig(): TConfig;

  /**
   * Get the default parameters for this generator
   */
  abstract getDefaultParameters(): TParams;

  /**
   * Update generator parameters
   *
   * @param params - Parameters to update (merged with existing)
   */
  setParameters(params: Partial<TParams>): void {
    this.parameters = { ...this.parameters, ...params };
  }

  /**
   * Get current generator parameters (readonly)
   */
  getParameters(): Readonly<TParams> {
    return { ...this.parameters };
  }

  /**
   * Get current generator configuration (readonly)
   */
  getConfig(): Readonly<TConfig> {
    return { ...this.config };
  }

  /**
   * Update generator configuration
   *
   * @param config - Configuration options to update
   */
  setConfig(config: Partial<TConfig>): void {
    this.config = { ...this.config, ...config };

    // Update SDK reference if provided
    if ((config as any)?.sdk) {
      this.sdk = (config as any).sdk;
    }
  }

  /**
   * Set or update the SDK instance
   *
   * @param sdk - SchillingerSDK instance
   */
  setSDK(sdk: SchillingerSDK): void {
    this.sdk = sdk;
  }

  /**
   * Get the current SDK instance
   */
  getSDK(): SchillingerSDK {
    if (!this.sdk) {
      throw new Error(`${this.generatorName}: SDK instance not available. Set SDK via constructor or setSDK() method.`);
    }
    return this.sdk;
  }

  /**
   * Wrap a result with enhanced metadata
   *
   * @param data - The raw result data
   * @param methodParams - Parameters used to generate the result
   * @param confidence - Optional confidence score
   * @param alternatives - Optional alternative results
   */
  protected createResult<T>(
    data: T,
    methodParams: Record<string, any> = {},
    confidence?: number,
    alternatives?: T[]
  ): GeneratorResult<T> {
    return {
      data,
      metadata: {
        generatedBy: this.generatorName,
        timestamp: Date.now(),
        parameters: {
          config: this.config,
          parameters: this.parameters,
          methodParams,
        },
        confidence,
        alternatives,
      },
    };
  }

  /**
   * Validate that SDK is available and throw descriptive error if not
   */
  protected requireSDK(): SchillingerSDK {
    if (!this.sdk) {
      throw new Error(`${this.generatorName}: SDK instance required for this operation. Set SDK via constructor or setSDK() method.`);
    }
    return this.sdk;
  }

  /**
   * Merge method parameters with current generator parameters
   *
   * @param methodParams - Parameters specific to this method call
   */
  protected mergeParameters(methodParams: Partial<TParams>): TParams {
    return { ...this.parameters, ...methodParams };
  }

  /**
   * Reset generator to default state
   */
  reset(): void {
    this.parameters = this.getDefaultParameters();
    this.config = this.getDefaultConfig();
  }

  /**
   * Get generator information
   */
  getInfo(): {
    name: string;
    config: Readonly<TConfig>;
    parameters: Readonly<TParams>;
    hasSDK: boolean;
  } {
    return {
      name: this.generatorName,
      config: this.getConfig(),
      parameters: this.getParameters(),
      hasSDK: !!this.sdk,
    };
  }

  /**
   * Clone the generator with current state
   */
  clone(): BaseGenerator<TConfig, TParams> {
    const ClonedGenerator = this.constructor as new (
      config: TConfig,
      sdk?: SchillingerSDK
    ) => BaseGenerator<TConfig, TParams>;

    return new ClonedGenerator(this.config, this.sdk);
  }
}

/**
 * Type guard to check if an object is a Generator
 */
export function isGenerator(obj: any): obj is BaseGenerator<any, any> {
  return obj && typeof obj === 'object' && 'generatorName' in obj && 'setParameters' in obj;
}