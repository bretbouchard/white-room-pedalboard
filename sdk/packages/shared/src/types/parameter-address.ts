/**
 * ParameterAddress - Hierarchical addressing scheme for automation and control
 *
 * Address Format: /scope/component/.../parameter
 * Examples:
 *   /role/bass/note
 *   /role/harmony/velocity
 *   /track/3/console/drive
 *   /track/1/volume
 *   /bus/A/send/1/amount
 *   /instrument/lead/cutoff
 *   /global/tempo
 *
 * @module types/parameter-address
 */

import type {
  SongModel_v1,
  Role_v1,
  TrackConfig,
  BusConfig,
} from "./song-model";

// =============================================================================
// SUPPORTING TYPES
// =============================================================================

/**
 * Parameter scope classification
 */
export type ParameterScope =
  | "role"
  | "track"
  | "bus"
  | "instrument"
  | "global"
  | "section"
  | "transport";

/**
 * Parsed address components
 */
export interface ParsedAddress {
  /** Original address string */
  raw: string;
  /** Address scope (role, track, bus, instrument, global) */
  scope: ParameterScope;
  /** Address components after scope */
  components: string[];
  /** Validation status */
  validation: "valid" | "invalid";
}

/**
 * Resolved parameter target in SongModel
 */
export interface ParameterTarget {
  /** Target type */
  type: ParameterScope;
  /** Target ID (role/track/bus/instrument ID, undefined for global) */
  id?: string;
  /** Parameter name */
  parameter: string;
  /** Resolved role (for role targets) */
  role?: Role_v1;
  /** Resolved track (for track/instrument targets) */
  track?: TrackConfig;
  /** Resolved bus (for bus targets) */
  bus?: BusConfig;
  /** Global value (null, resolved by audio engine) */
  value?: unknown;
}

// =============================================================================
// PARAMETER ADDRESS CLASS
// =============================================================================

/**
 * ParameterAddress - Hierarchical addressing for automation and control
 *
 * Provides parsing, validation, and resolution of parameter addresses within
 * a SongModel. Addresses follow the pattern: /scope/id/.../parameter
 *
 * @example
 * ```typescript
 * const addr = new ParameterAddress('/role/bass/volume');
 * const target = addr.resolve(songModel);
 * console.log(target.role); // Role_v1 object
 * ```
 */
export class ParameterAddress {
  private readonly address: string;
  private readonly parsed: ParsedAddress;

  /**
   * Create a ParameterAddress instance
   * @param address - Address string (e.g., "/role/bass/note")
   * @throws Error if address is invalid
   */
  constructor(address: string) {
    if (!ParameterAddress.validate(address)) {
      throw new Error(`Invalid parameter address: ${address}`);
    }
    this.address = address;
    this.parsed = ParameterAddress.parse(address);
  }

  /**
   * Parse address string into components
   * @param address - Address string (e.g., "/role/bass/note")
   * @returns ParsedAddress object
   */
  static parse(address: string): ParsedAddress {
    // Remove leading slashes and split
    const parts = address.replace(/^\/+/, "").split("/");

    return {
      raw: address,
      scope: parts[0] as ParameterScope,
      components: parts.slice(1),
      validation: "valid",
    };
  }

  /**
   * Validate address format
   * @param address - Address string to validate
   * @returns true if valid, false otherwise
   */
  static validate(address: string): boolean {
    // Type check
    if (typeof address !== "string") return false;

    // Must start with /
    if (!address.startsWith("/")) return false;

    // Minimum length check: "/x/y" is minimum (3 chars)
    if (address.length < 3) return false;

    // Check for double slashes (invalid)
    if (address.includes("//")) return false;

    // Split and validate parts
    const parts = address.split("/");

    // Need at least /scope/component (3 parts: '', scope, component)
    if (parts.length < 3) return false;

    // Check for empty parts after the first one (caused by double slashes or trailing slash)
    // Skip the first empty part from leading slash
    if (parts.slice(1).some((part) => part === "")) return false;

    // Extract scope (parts[1] since parts[0] is empty from leading /)
    const scope = parts[1] as ParameterScope;

    // Validate scope
    const validScopes: ParameterScope[] = [
      "role",
      "track",
      "bus",
      "instrument",
      "global",
      "section",
      "transport",
    ];
    if (!validScopes.includes(scope)) return false;

    return true;
  }

  /**
   * Resolve address to actual parameter target in SongModel
   * @param model - SongModel_v1 to resolve against
   * @returns ParameterTarget object
   * @throws Error if target not found
   */
  resolve(model: SongModel_v1): ParameterTarget {
    const { scope, components } = this.parsed;

    switch (scope) {
      case "role":
        return this.resolveRole(model, components);
      case "track":
        return this.resolveTrack(model, components);
      case "bus":
        return this.resolveBus(model, components);
      case "instrument":
        return this.resolveInstrument(model, components);
      case "global":
        return this.resolveGlobal(components);
      case "section":
        return this.resolveSection(model, components);
      case "transport":
        return this.resolveTransport(components);
      default:
        throw new Error(`Unknown scope: ${scope}`);
    }
  }

  /**
   * Resolve role parameter address
   * @param model - SongModel to search
   * @param components - Address components [roleId, parameter, ...]
   * @returns Role parameter target
   * @throws Error if role not found
   */
  private resolveRole(
    model: SongModel_v1,
    components: string[],
  ): ParameterTarget {
    const roleId = components[0];
    const role = model.roles.find((r) => r.id === roleId);

    if (!role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    return {
      type: "role",
      id: roleId,
      parameter: components[1],
      role,
    };
  }

  /**
   * Resolve track parameter address
   * @param model - SongModel to search
   * @param components - Address components [trackId, parameter, ...]
   * @returns Track parameter target
   * @throws Error if track not found
   */
  private resolveTrack(
    model: SongModel_v1,
    components: string[],
  ): ParameterTarget {
    const trackId = components[0];
    const track = model.mixGraph.tracks.find((t) => t.id === trackId);

    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    return {
      type: "track",
      id: trackId,
      parameter: components[1],
      track,
    };
  }

  /**
   * Resolve bus parameter address
   * @param model - SongModel to search
   * @param components - Address components [busId, parameter, ...]
   * @returns Bus parameter target
   * @throws Error if bus not found
   */
  private resolveBus(
    model: SongModel_v1,
    components: string[],
  ): ParameterTarget {
    const busId = components[0];
    const bus = model.mixGraph.buses.find((b) => b.id === busId);

    if (!bus) {
      throw new Error(`Bus not found: ${busId}`);
    }

    return {
      type: "bus",
      id: busId,
      parameter: components[1],
      bus,
    };
  }

  /**
   * Resolve instrument parameter address
   * Instruments are referenced via track configurations
   * @param model - SongModel to search
   * @param components - Address components [instrumentId, parameter, ...]
   * @returns Instrument parameter target
   * @throws Error if instrument not found
   */
  private resolveInstrument(
    model: SongModel_v1,
    components: string[],
  ): ParameterTarget {
    const instrumentId = components[0];

    // Instruments are referenced in track configurations
    const track = model.mixGraph.tracks.find(
      (t) => t.instrumentId === instrumentId,
    );

    if (!track) {
      throw new Error(`Instrument not found: ${instrumentId}`);
    }

    return {
      type: "instrument",
      id: instrumentId,
      parameter: components[1],
      track,
    };
  }

  /**
   * Resolve global parameter address
   * @param components - Address components [parameter, ...]
   * @returns Global parameter target
   */
  private resolveGlobal(components: string[]): ParameterTarget {
    return {
      type: "global",
      parameter: components[0],
      value: null, // Will be resolved by audio engine
    };
  }

  /**
   * Resolve section parameter address
   * @param model - SongModel to search
   * @param components - Address components [sectionId, parameter, ...]
   * @returns Section parameter target
   */
  private resolveSection(
    model: SongModel_v1,
    components: string[],
  ): ParameterTarget {
    const sectionId = components[0];
    const section = model.sections.find((s) => s.id === sectionId);

    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    return {
      type: "section",
      id: sectionId,
      parameter: components[1],
      value: null, // Section parameters are metadata
    };
  }

  /**
   * Resolve transport parameter address
   * @param components - Address components [parameter, ...]
   * @returns Transport parameter target
   */
  private resolveTransport(components: string[]): ParameterTarget {
    return {
      type: "transport",
      parameter: components[0],
      value: null, // Transport parameters are global state
    };
  }

  // -------------------------------------------------------------------------
  // GETTERS
  // -------------------------------------------------------------------------

  /**
   * Get the address scope
   */
  get scope(): ParameterScope {
    return this.parsed.scope;
  }

  /**
   * Get address components (excluding scope)
   */
  get components(): readonly string[] {
    // Return a frozen copy to prevent external modification
    return Object.freeze([...this.parsed.components]);
  }

  /**
   * Get the raw address string
   */
  get value(): string {
    return this.address;
  }

  /**
   * Get the path components
   */
  get path(): string[] {
    return this.parsed.components;
  }

  /**
   * Convert address to string
   */
  toString(): string {
    return this.address;
  }

  /**
   * String coercion for easy logging
   */
  toJSON(): { address: string; value: string; scope: ParameterScope } {
    return {
      address: this.address,
      value: this.address,
      scope: this.parsed.scope,
    };
  }
}
