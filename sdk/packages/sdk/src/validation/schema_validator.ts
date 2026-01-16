/**
 * Schema Validation for White Room Data Models
 *
 * Provides runtime validation for SchillingerSong_v1, SongModel_v1,
 * and PerformanceState_v1 schemas according to their JSON Schema definitions.
 *
 * Validation returns Result<T, ValidationError> with specific field paths
 * and user-friendly error messages.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Validation result type
 */
export type ValidationResult<T> = Result<T, ValidationError>;

/**
 * Result type (similar to Rust's Result)
 */
export type Result<T, E> = Ok<T, E> | Err<T, E>;

export interface Ok<T, E> {
  readonly _tag: 'Ok';
  readonly value: T;
}

export interface Err<T, E> {
  readonly _tag: 'Err';
  readonly error: E;
}

/**
 * Validation error with field path and message
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
}

// =============================================================================
// Result Constructors
// =============================================================================

export const Ok = <T, E>(value: T): Result<T, E> => ({
  _tag: 'Ok',
  value
});

export const Err = <T, E>(error: E): Result<T, E> => ({
  _tag: 'Err',
  error
});

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T, E> =>
  result._tag === 'Ok';

export const isErr = <T, E>(result: Result<T, E>): result is Err<T, E> =>
  result._tag === 'Err';

// =============================================================================
// Validation Error Helpers
// =============================================================================

export class ValidationErrors {
  private readonly errors: ValidationError[] = [];

  add(field: string, message: string, value?: unknown): void {
    this.errors.push({ field, message, value });
  }

  addAll(errors: ValidationError[]): void {
    this.errors.push(...errors);
  }

  isEmpty(): boolean {
    return this.errors.length === 0;
  }

  toResult<T>(value: T): Result<T, ValidationError[]> {
    if (this.isEmpty()) {
      return Ok(value);
    }
    return Err(this.errors);
  }

  toJSON(): ValidationError[] {
    return [...this.errors];
  }
}

// =============================================================================
// UUID Validation
// =============================================================================]

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

// =============================================================================
// SchillingerSong_v1 Validation
// =============================================================================

export interface SchillingerSong_v1 {
  readonly version: string;
  readonly id: string;
  readonly createdAt: number;
  readonly modifiedAt: number;
  readonly author: string;
  readonly name: string;
  readonly seed: number;
  readonly ensemble: EnsembleModel;
  readonly bindings: BindingModel;
  readonly constraints: ConstraintModel;
  readonly console: ConsoleModel;
  readonly book1?: RhythmSystem[];
  readonly book2?: MelodySystem[];
  readonly book3?: HarmonySystem[];
  readonly book4?: FormSystem;
  readonly book5?: OrchestrationSystem[];
  readonly instrumentAssignments?: InstrumentAssignment[];
  readonly presets?: PresetAssignment[];
  readonly automation?: AutomationTimeline;
}

export function validateSchillingerSong(
  data: unknown
): Result<SchillingerSong_v1, ValidationError[]> {
  const errors = new ValidationErrors();

  // Must be object
  if (typeof data !== 'object' || data === null) {
    errors.add('root', 'SchillingerSong must be an object', data);
    return errors.toResult(data as SchillingerSong_v1);
  }

  const obj = data as Record<string, unknown>;

  // Version (const: "1.0")
  if (obj.version !== '1.0') {
    errors.add('version', 'Version must be "1.0"', obj.version);
  }

  // ID (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add('id', 'ID must be a valid UUID', obj.id);
  }

  // createdAt (Unix timestamp, >= 0)
  if (typeof obj.createdAt !== 'number' || obj.createdAt < 0) {
    errors.add('createdAt', 'createdAt must be a non-negative number', obj.createdAt);
  }

  // modifiedAt (Unix timestamp, >= 0)
  if (typeof obj.modifiedAt !== 'number' || obj.modifiedAt < 0) {
    errors.add('modifiedAt', 'modifiedAt must be a non-negative number', obj.modifiedAt);
  }

  // author (string)
  if (typeof obj.author !== 'string') {
    errors.add('author', 'author must be a string', obj.author);
  }

  // name (string, minLength: 1, maxLength: 256)
  if (typeof obj.name !== 'string') {
    errors.add('name', 'name must be a string', obj.name);
  } else if (obj.name.length < 1 || obj.name.length > 256) {
    errors.add('name', 'name must be between 1 and 256 characters', obj.name);
  }

  // seed (integer, min: 0, max: 4294967295)
  if (typeof obj.seed !== 'number' || obj.seed < 0 || obj.seed > 4294967295) {
    errors.add('seed', 'seed must be between 0 and 4294967295', obj.seed);
  }

  // Validate ensemble
  if (obj.ensemble) {
    errors.addAll(validateEnsembleModel(obj.ensemble).err || []);
  } else {
    errors.add('ensemble', 'ensemble is required');
  }

  // Validate bindings
  if (obj.bindings) {
    errors.addAll(validateBindingModel(obj.bindings).err || []);
  } else {
    errors.add('bindings', 'bindings is required');
  }

  // Validate constraints
  if (obj.constraints) {
    errors.addAll(validateConstraintModel(obj.constraints).err || []);
  } else {
    errors.add('constraints', 'constraints is required');
  }

  // Validate console
  if (obj.console) {
    errors.addAll(validateConsoleModel(obj.console).err || []);
  } else {
    errors.add('console', 'console is required');
  }

  // Optional arrays
  if (obj.book1 !== undefined) {
    if (!Array.isArray(obj.book1)) {
      errors.add('book1', 'book1 must be an array');
    } else {
      obj.book1.forEach((item, index) => {
        errors.addAll(
          validateRhythmSystem(item, `book1[${index}]`).err || []
        );
      });
    }
  }

  if (obj.book2 !== undefined) {
    if (!Array.isArray(obj.book2)) {
      errors.add('book2', 'book2 must be an array');
    } else {
      obj.book2.forEach((item, index) => {
        errors.addAll(
          validateMelodySystem(item, `book2[${index}]`).err || []
        );
      });
    }
  }

  if (obj.book3 !== undefined) {
    if (!Array.isArray(obj.book3)) {
      errors.add('book3', 'book3 must be an array');
    } else {
      obj.book3.forEach((item, index) => {
        errors.addAll(
          validateHarmonySystem(item, `book3[${index}]`).err || []
        );
      });
    }
  }

  if (obj.book4 !== undefined) {
    errors.addAll(validateFormSystem(obj.book4, 'book4').err || []);
  }

  if (obj.book5 !== undefined) {
    if (!Array.isArray(obj.book5)) {
      errors.add('book5', 'book5 must be an array');
    } else {
      obj.book5.forEach((item, index) => {
        errors.addAll(
          validateOrchestrationSystem(item, `book5[${index}]`).err || []
        );
      });
    }
  }

  return errors.toResult(data as SchillingerSong_v1);
}

// =============================================================================
// EnsembleModel Validation
// =============================================================================

export interface EnsembleModel {
  readonly version: string;
  readonly id: string;
  readonly voices: Voice[];
  readonly voiceCount: number;
  readonly groups?: VoiceGroup[];
  readonly balance?: BalanceRules;
}

function validateEnsembleModel(
  data: unknown,
  path = 'ensemble'
): Result<EnsembleModel, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'EnsembleModel must be an object', data);
    return errors.toResult(data as EnsembleModel);
  }

  const obj = data as Record<string, unknown>;

  // version (const: "1.0")
  if (obj.version !== '1.0') {
    errors.add(`${path}.version`, 'Version must be "1.0"', obj.version);
  }

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // voices (array, non-empty)
  if (!Array.isArray(obj.voices)) {
    errors.add(`${path}.voices`, 'voices must be an array');
  } else if (obj.voices.length === 0) {
    errors.add(`${path}.voices`, 'voices must not be empty');
  } else {
    obj.voices.forEach((voice, index) => {
      errors.addAll(validateVoice(voice, `${path}.voices[${index}]`).err || []);
    });
  }

  // voiceCount (integer, min: 1, max: 100)
  if (typeof obj.voiceCount !== 'number' || obj.voiceCount < 1 || obj.voiceCount > 100) {
    errors.add(`${path}.voiceCount`, 'voiceCount must be between 1 and 100', obj.voiceCount);
  }

  // Optional groups
  if (obj.groups !== undefined) {
    if (!Array.isArray(obj.groups)) {
      errors.add(`${path}.groups`, 'groups must be an array');
    } else {
      obj.groups.forEach((group, index) => {
        errors.addAll(validateVoiceGroup(group, `${path}.groups[${index}]`).err || []);
      });
    }
  }

  // Optional balance
  if (obj.balance !== undefined) {
    errors.addAll(validateBalanceRules(obj.balance, `${path}.balance`).err || []);
  }

  return errors.toResult(data as EnsembleModel);
}

// =============================================================================
// Voice Validation
// =============================================================================

export interface Voice {
  readonly id: string;
  readonly name: string;
  readonly rolePools: RolePool[];
}

function validateVoice(
  data: unknown,
  path = 'voice'
): Result<Voice, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'Voice must be an object', data);
    return errors.toResult(data as Voice);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // name (string)
  if (typeof obj.name !== 'string') {
    errors.add(`${path}.name`, 'name must be a string', obj.name);
  }

  // rolePools (array)
  if (!Array.isArray(obj.rolePools)) {
    errors.add(`${path}.rolePools`, 'rolePools must be an array');
  } else {
    obj.rolePools.forEach((pool, index) => {
      errors.addAll(validateRolePool(pool, `${path}.rolePools[${index}]`).err || []);
    });
  }

  return errors.toResult(data as Voice);
}

// =============================================================================
// RolePool Validation
// =============================================================================

export interface RolePool {
  readonly role: 'primary' | 'secondary' | 'tertiary';
  readonly functionalClass: 'foundation' | 'motion' | 'ornament' | 'reinforcement';
  readonly enabled?: boolean;
}

function validateRolePool(
  data: unknown,
  path = 'rolePool'
): Result<RolePool, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'RolePool must be an object', data);
    return errors.toResult(data as RolePool);
  }

  const obj = data as Record<string, unknown>;

  // role (enum)
  const validRoles = ['primary', 'secondary', 'tertiary'];
  if (typeof obj.role !== 'string' || !validRoles.includes(obj.role)) {
    errors.add(`${path}.role`, `role must be one of: ${validRoles.join(', ')}`, obj.role);
  }

  // functionalClass (enum)
  const validClasses = ['foundation', 'motion', 'ornament', 'reinforcement'];
  if (typeof obj.functionalClass !== 'string' || !validClasses.includes(obj.functionalClass)) {
    errors.add(`${path}.functionalClass`, `functionalClass must be one of: ${validClasses.join(', ')}`, obj.functionalClass);
  }

  // enabled (optional boolean)
  if (obj.enabled !== undefined && typeof obj.enabled !== 'boolean') {
    errors.add(`${path}.enabled`, 'enabled must be a boolean', obj.enabled);
  }

  return errors.toResult(data as RolePool);
}

// =============================================================================
// VoiceGroup Validation
// =============================================================================

export interface VoiceGroup {
  readonly id: string;
  readonly name: string;
  readonly voiceIds: string[];
}

function validateVoiceGroup(
  data: unknown,
  path = 'voiceGroup'
): Result<VoiceGroup, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'VoiceGroup must be an object', data);
    return errors.toResult(data as VoiceGroup);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // name (string)
  if (typeof obj.name !== 'string') {
    errors.add(`${path}.name`, 'name must be a string', obj.name);
  }

  // voiceIds (array of UUIDs)
  if (!Array.isArray(obj.voiceIds)) {
    errors.add(`${path}.voiceIds`, 'voiceIds must be an array');
  } else {
    obj.voiceIds.forEach((voiceId, index) => {
      if (typeof voiceId !== 'string' || !isValidUUID(voiceId)) {
        errors.add(`${path}.voiceIds[${index}]`, 'voiceId must be a valid UUID', voiceId);
      }
    });
  }

  return errors.toResult(data as VoiceGroup);
}

// =============================================================================
// BalanceRules Validation
// =============================================================================

export interface BalanceRules {
  readonly priority?: number[];
  readonly limits?: {
    readonly maxVoices: number;
    readonly maxPolyphony: number;
  };
}

function validateBalanceRules(
  data: unknown,
  path = 'balanceRules'
): Result<BalanceRules, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'BalanceRules must be an object', data);
    return errors.toResult(data as BalanceRules);
  }

  const obj = data as Record<string, unknown>;

  // Optional priority (array of integers)
  if (obj.priority !== undefined) {
    if (!Array.isArray(obj.priority)) {
      errors.add(`${path}.priority`, 'priority must be an array');
    } else {
      obj.priority.forEach((item, index) => {
        if (typeof item !== 'number' || !Number.isInteger(item)) {
          errors.add(`${path}.priority[${index}]`, 'priority item must be an integer', item);
        }
      });
    }
  }

  // Optional limits
  if (obj.limits !== undefined) {
    if (typeof obj.limits !== 'object' || obj.limits === null) {
      errors.add(`${path}.limits`, 'limits must be an object');
    } else {
      const limits = obj.limits as Record<string, unknown>;

      if (typeof limits.maxVoices !== 'number' || limits.maxVoices < 1 || limits.maxVoices > 100) {
        errors.add(`${path}.limits.maxVoices`, 'maxVoices must be between 1 and 100', limits.maxVoices);
      }

      if (typeof limits.maxPolyphony !== 'number' || limits.maxPolyphony < 1 || limits.maxPolyphony > 200) {
        errors.add(`${path}.limits.maxPolyphony`, 'maxPolyphony must be between 1 and 200', limits.maxPolyphony);
      }
    }
  }

  return errors.toResult(data as BalanceRules);
}

// =============================================================================
// BindingModel Validation
// =============================================================================

export interface BindingModel {
  readonly rhythmBindings?: string[];
  readonly melodyBindings?: string[];
  readonly harmonyBindings?: string[];
}

function validateBindingModel(
  data: unknown,
  path = 'bindings'
): Result<BindingModel, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'BindingModel must be an object', data);
    return errors.toResult(data as BindingModel);
  }

  const obj = data as Record<string, unknown>;

  // Optional rhythmBindings (array of UUIDs)
  if (obj.rhythmBindings !== undefined) {
    if (!Array.isArray(obj.rhythmBindings)) {
      errors.add(`${path}.rhythmBindings`, 'rhythmBindings must be an array');
    } else {
      obj.rhythmBindings.forEach((binding, index) => {
        if (typeof binding !== 'string' || !isValidUUID(binding)) {
          errors.add(`${path}.rhythmBindings[${index}]`, 'binding must be a valid UUID', binding);
        }
      });
    }
  }

  // Optional melodyBindings (array of UUIDs)
  if (obj.melodyBindings !== undefined) {
    if (!Array.isArray(obj.melodyBindings)) {
      errors.add(`${path}.melodyBindings`, 'melodyBindings must be an array');
    } else {
      obj.melodyBindings.forEach((binding, index) => {
        if (typeof binding !== 'string' || !isValidUUID(binding)) {
          errors.add(`${path}.melodyBindings[${index}]`, 'binding must be a valid UUID', binding);
        }
      });
    }
  }

  // Optional harmonyBindings (array of UUIDs)
  if (obj.harmonyBindings !== undefined) {
    if (!Array.isArray(obj.harmonyBindings)) {
      errors.add(`${path}.harmonyBindings`, 'harmonyBindings must be an array');
    } else {
      obj.harmonyBindings.forEach((binding, index) => {
        if (typeof binding !== 'string' || !isValidUUID(binding)) {
          errors.add(`${path}.harmonyBindings[${index}]`, 'binding must be a valid UUID', binding);
        }
      });
    }
  }

  return errors.toResult(data as BindingModel);
}

// =============================================================================
// ConstraintModel Validation
// =============================================================================

export interface ConstraintModel {
  readonly constraints?: unknown[];
}

function validateConstraintModel(
  data: unknown,
  path = 'constraints'
): Result<ConstraintModel, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'ConstraintModel must be an object', data);
    return errors.toResult(data as ConstraintModel);
  }

  const obj = data as Record<string, unknown>;

  // Optional constraints (array)
  if (obj.constraints !== undefined && !Array.isArray(obj.constraints)) {
    errors.add(`${path}.constraints`, 'constraints must be an array');
  }

  return errors.toResult(data as ConstraintModel);
}

// =============================================================================
// ConsoleModel Validation
// =============================================================================

export interface ConsoleModel {
  readonly version: string;
  readonly id: string;
  readonly voiceBusses?: Bus[];
  readonly mixBusses?: Bus[];
  readonly masterBus?: Bus;
  readonly sendEffects?: SendEffect[];
  readonly routing?: RoutingMatrix;
  readonly metering?: MeteringConfig;
}

function validateConsoleModel(
  data: unknown,
  path = 'console'
): Result<ConsoleModel, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'ConsoleModel must be an object', data);
    return errors.toResult(data as ConsoleModel);
  }

  const obj = data as Record<string, unknown>;

  // version (const: "1.0")
  if (obj.version !== '1.0') {
    errors.add(`${path}.version`, 'Version must be "1.0"', obj.version);
  }

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // Optional arrays
  if (obj.voiceBusses !== undefined) {
    if (!Array.isArray(obj.voiceBusses)) {
      errors.add(`${path}.voiceBusses`, 'voiceBusses must be an array');
    } else {
      obj.voiceBusses.forEach((bus, index) => {
        errors.addAll(validateBus(bus, `${path}.voiceBusses[${index}]`).err || []);
      });
    }
  }

  if (obj.mixBusses !== undefined) {
    if (!Array.isArray(obj.mixBusses)) {
      errors.add(`${path}.mixBusses`, 'mixBusses must be an array');
    } else {
      obj.mixBusses.forEach((bus, index) => {
        errors.addAll(validateBus(bus, `${path}.mixBusses[${index}]`).err || []);
      });
    }
  }

  if (obj.masterBus !== undefined) {
    errors.addAll(validateBus(obj.masterBus, `${path}.masterBus`).err || []);
  }

  return errors.toResult(data as ConsoleModel);
}

// =============================================================================
// Bus Validation
// =============================================================================

export interface Bus {
  readonly id: string;
  readonly name: string;
  readonly type: 'voice' | 'mix' | 'master';
  readonly inserts?: EffectSlot[];
  readonly gain?: number;
  readonly pan?: number;
  readonly muted?: boolean;
  readonly solo?: boolean;
}

function validateBus(
  data: unknown,
  path = 'bus'
): Result<Bus, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'Bus must be an object', data);
    return errors.toResult(data as Bus);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // name (string)
  if (typeof obj.name !== 'string') {
    errors.add(`${path}.name`, 'name must be a string', obj.name);
  }

  // type (enum)
  const validTypes = ['voice', 'mix', 'master'];
  if (typeof obj.type !== 'string' || !validTypes.includes(obj.type)) {
    errors.add(`${path}.type`, `type must be one of: ${validTypes.join(', ')}`, obj.type);
  }

  // Optional gain (number, max: 0)
  if (obj.gain !== undefined && (typeof obj.gain !== 'number' || obj.gain > 0)) {
    errors.add(`${path}.gain`, 'gain must be a number <= 0', obj.gain);
  }

  // Optional pan (number, min: -1, max: 1)
  if (obj.pan !== undefined && (typeof obj.pan !== 'number' || obj.pan < -1 || obj.pan > 1)) {
    errors.add(`${path}.pan`, 'pan must be a number between -1 and 1', obj.pan);
  }

  return errors.toResult(data as Bus);
}

// =============================================================================
// EffectSlot Validation
// =============================================================================

export interface EffectSlot {
  readonly id: string;
  readonly effectType: string;
  readonly enabled?: boolean;
  readonly bypassed?: boolean;
  readonly parameters?: Record<string, unknown>;
  readonly automation?: string;
}

function validateEffectSlot(
  data: unknown,
  path = 'effectSlot'
): Result<EffectSlot, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'EffectSlot must be an object', data);
    return errors.toResult(data as EffectSlot);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // effectType (string, enum validation would go here)
  if (typeof obj.effectType !== 'string') {
    errors.add(`${path}.effectType`, 'effectType must be a string', obj.effectType);
  }

  return errors.toResult(data as EffectSlot);
}

// =============================================================================
// SendEffect Validation
// =============================================================================

export interface SendEffect {
  readonly id: string;
  readonly busId: string;
  readonly effectType: string;
  readonly enabled?: boolean;
  readonly parameters?: Record<string, unknown>;
  readonly sends?: Send[];
}

function validateSendEffect(
  data: unknown,
  path = 'sendEffect'
): Result<SendEffect, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'SendEffect must be an object', data);
    return errors.toResult(data as SendEffect);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // busId (UUID)
  if (typeof obj.busId !== 'string' || !isValidUUID(obj.busId)) {
    errors.add(`${path}.busId`, 'busId must be a valid UUID', obj.busId);
  }

  // effectType (string)
  if (typeof obj.effectType !== 'string') {
    errors.add(`${path}.effectType`, 'effectType must be a string', obj.effectType);
  }

  return errors.toResult(data as SendEffect);
}

// =============================================================================
// Send Validation
// =============================================================================

export interface Send {
  readonly sourceBusId: string;
  readonly level: number;
  readonly pan?: number;
}

function validateSend(
  data: unknown,
  path = 'send'
): Result<Send, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'Send must be an object', data);
    return errors.toResult(data as Send);
  }

  const obj = data as Record<string, unknown>;

  // sourceBusId (UUID)
  if (typeof obj.sourceBusId !== 'string' || !isValidUUID(obj.sourceBusId)) {
    errors.add(`${path}.sourceBusId`, 'sourceBusId must be a valid UUID', obj.sourceBusId);
  }

  // level (number, max: 0)
  if (typeof obj.level !== 'number' || obj.level > 0) {
    errors.add(`${path}.level`, 'level must be a number <= 0', obj.level);
  }

  // Optional pan (number, min: -1, max: 1)
  if (obj.pan !== undefined && (typeof obj.pan !== 'number' || obj.pan < -1 || obj.pan > 1)) {
    errors.add(`${path}.pan`, 'pan must be a number between -1 and 1', obj.pan);
  }

  return errors.toResult(data as Send);
}

// =============================================================================
// RoutingMatrix Validation
// =============================================================================

export interface RoutingMatrix {
  readonly routes: Route[];
}

function validateRoutingMatrix(
  data: unknown,
  path = 'routing'
): Result<RoutingMatrix, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'RoutingMatrix must be an object', data);
    return errors.toResult(data as RoutingMatrix);
  }

  const obj = data as Record<string, unknown>;

  // routes (array)
  if (!Array.isArray(obj.routes)) {
    errors.add(`${path}.routes`, 'routes must be an array');
  } else {
    obj.routes.forEach((route, index) => {
      errors.addAll(validateRoute(route, `${path}.routes[${index}]`).err || []);
    });
  }

  return errors.toResult(data as RoutingMatrix);
}

// =============================================================================
// Route Validation
// =============================================================================

export interface Route {
  readonly sourceBusId: string;
  readonly destinationBusId: string;
  readonly level?: number;
  readonly enabled?: boolean;
}

function validateRoute(
  data: unknown,
  path = 'route'
): Result<Route, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'Route must be an object', data);
    return errors.toResult(data as Route);
  }

  const obj = data as Record<string, unknown>;

  // sourceBusId (UUID)
  if (typeof obj.sourceBusId !== 'string' || !isValidUUID(obj.sourceBusId)) {
    errors.add(`${path}.sourceBusId`, 'sourceBusId must be a valid UUID', obj.sourceBusId);
  }

  // destinationBusId (UUID)
  if (typeof obj.destinationBusId !== 'string' || !isValidUUID(obj.destinationBusId)) {
    errors.add(`${path}.destinationBusId`, 'destinationBusId must be a valid UUID', obj.destinationBusId);
  }

  // Optional level (number, max: 0)
  if (obj.level !== undefined && (typeof obj.level !== 'number' || obj.level > 0)) {
    errors.add(`${path}.level`, 'level must be a number <= 0', obj.level);
  }

  return errors.toResult(data as Route);
}

// =============================================================================
// MeteringConfig Validation
// =============================================================================

export interface MeteringConfig {
  readonly enabled?: boolean;
  readonly refreshRate?: number;
  readonly meterType?: 'peak' | 'rms' | 'both';
  readonly holdTime?: number;
}

function validateMeteringConfig(
  data: unknown,
  path = 'metering'
): Result<MeteringConfig, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'MeteringConfig must be an object', data);
    return errors.toResult(data as MeteringConfig);
  }

  const obj = data as Record<string, unknown>;

  // Optional refreshRate (integer, min: 10, max: 60)
  if (obj.refreshRate !== undefined) {
    if (typeof obj.refreshRate !== 'number' || obj.refreshRate < 10 || obj.refreshRate > 60) {
      errors.add(`${path}.refreshRate`, 'refreshRate must be between 10 and 60', obj.refreshRate);
    }
  }

  // Optional meterType (enum)
  if (obj.meterType !== undefined) {
    const validTypes = ['peak', 'rms', 'both'];
    if (typeof obj.meterType !== 'string' || !validTypes.includes(obj.meterType)) {
      errors.add(`${path}.meterType`, `meterType must be one of: ${validTypes.join(', ')}`, obj.meterType);
    }
  }

  return errors.toResult(data as MeteringConfig);
}

// =============================================================================
// RhythmSystem Validation
// =============================================================================

export interface RhythmSystem {
  readonly id: string;
  readonly type: 'resultant' | 'permutation' | 'density';
  readonly generators: Generator[];
}

function validateRhythmSystem(
  data: unknown,
  path = 'rhythmSystem'
): Result<RhythmSystem, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'RhythmSystem must be an object', data);
    return errors.toResult(data as RhythmSystem);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // type (enum)
  const validTypes = ['resultant', 'permutation', 'density'];
  if (typeof obj.type !== 'string' || !validTypes.includes(obj.type)) {
    errors.add(`${path}.type`, `type must be one of: ${validTypes.join(', ')}`, obj.type);
  }

  // generators (array)
  if (!Array.isArray(obj.generators)) {
    errors.add(`${path}.generators`, 'generators must be an array');
  } else {
    obj.generators.forEach((gen, index) => {
      errors.addAll(validateGenerator(gen, `${path}.generators[${index}]`).err || []);
    });
  }

  return errors.toResult(data as RhythmSystem);
}

// =============================================================================
// Generator Validation
// =============================================================================

export interface Generator {
  readonly period: number;
  readonly phaseOffset: number;
}

function validateGenerator(
  data: unknown,
  path = 'generator'
): Result<Generator, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'Generator must be an object', data);
    return errors.toResult(data as Generator);
  }

  const obj = data as Record<string, unknown>;

  // period (integer, min: 1)
  if (typeof obj.period !== 'number' || obj.period < 1) {
    errors.add(`${path}.period`, 'period must be >= 1', obj.period);
  }

  // phaseOffset (number, min: 0)
  if (typeof obj.phaseOffset !== 'number' || obj.phaseOffset < 0) {
    errors.add(`${path}.phaseOffset`, 'phaseOffset must be >= 0', obj.phaseOffset);
  }

  return errors.toResult(data as Generator);
}

// =============================================================================
// MelodySystem Validation
// =============================================================================

export interface MelodySystem {
  readonly id: string;
  readonly type: 'pitch_cycle' | 'interval_seed';
}

function validateMelodySystem(
  data: unknown,
  path = 'melodySystem'
): Result<MelodySystem, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'MelodySystem must be an object', data);
    return errors.toResult(data as MelodySystem);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // type (enum)
  const validTypes = ['pitch_cycle', 'interval_seed'];
  if (typeof obj.type !== 'string' || !validTypes.includes(obj.type)) {
    errors.add(`${path}.type`, `type must be one of: ${validTypes.join(', ')}`, obj.type);
  }

  return errors.toResult(data as MelodySystem);
}

// =============================================================================
// HarmonySystem Validation
// =============================================================================

export interface HarmonySystem {
  readonly id: string;
  readonly type: 'distribution' | 'chord_class';
}

function validateHarmonySystem(
  data: unknown,
  path = 'harmonySystem'
): Result<HarmonySystem, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'HarmonySystem must be an object', data);
    return errors.toResult(data as HarmonySystem);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // type (enum)
  const validTypes = ['distribution', 'chord_class'];
  if (typeof obj.type !== 'string' || !validTypes.includes(obj.type)) {
    errors.add(`${path}.type`, `type must be one of: ${validTypes.join(', ')}`, obj.type);
  }

  return errors.toResult(data as HarmonySystem);
}

// =============================================================================
// FormSystem Validation
// =============================================================================

export interface FormSystem {
  readonly id: string;
  readonly ratioTree: number[];
}

function validateFormSystem(
  data: unknown,
  path = 'formSystem'
): Result<FormSystem, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'FormSystem must be an object', data);
    return errors.toResult(data as FormSystem);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // ratioTree (array of numbers)
  if (!Array.isArray(obj.ratioTree)) {
    errors.add(`${path}.ratioTree`, 'ratioTree must be an array');
  } else {
    obj.ratioTree.forEach((ratio, index) => {
      if (typeof ratio !== 'number') {
        errors.add(`${path}.ratioTree[${index}]`, 'ratio must be a number', ratio);
      }
    });
  }

  return errors.toResult(data as FormSystem);
}

// =============================================================================
// OrchestrationSystem Validation
// =============================================================================

export interface OrchestrationSystem {
  readonly id: string;
  readonly type: 'role_assignment' | 'register' | 'density';
}

function validateOrchestrationSystem(
  data: unknown,
  path = 'orchestrationSystem'
): Result<OrchestrationSystem, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'OrchestrationSystem must be an object', data);
    return errors.toResult(data as OrchestrationSystem);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // type (enum)
  const validTypes = ['role_assignment', 'register', 'density'];
  if (typeof obj.type !== 'string' || !validTypes.includes(obj.type)) {
    errors.add(`${path}.type`, `type must be one of: ${validTypes.join(', ')}`, obj.type);
  }

  return errors.toResult(data as OrchestrationSystem);
}

// =============================================================================
// InstrumentAssignment Validation
// =============================================================================

export interface InstrumentAssignment {
  readonly voiceId: string;
  readonly instrumentType: string;
  readonly presetId?: string;
  readonly busId?: string;
}

function validateInstrumentAssignment(
  data: unknown,
  path = 'instrumentAssignment'
): Result<InstrumentAssignment, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'InstrumentAssignment must be an object', data);
    return errors.toResult(data as InstrumentAssignment);
  }

  const obj = data as Record<string, unknown>;

  // voiceId (UUID)
  if (typeof obj.voiceId !== 'string' || !isValidUUID(obj.voiceId)) {
    errors.add(`${path}.voiceId`, 'voiceId must be a valid UUID', obj.voiceId);
  }

  // instrumentType (enum)
  const validTypes = [
    'LocalGal',
    'KaneMarco',
    'KaneMarcoAether',
    'KaneMarcoAetherString',
    'NexSynth',
    'SamSampler',
    'DrumMachine'
  ];
  if (typeof obj.instrumentType !== 'string' || !validTypes.includes(obj.instrumentType)) {
    errors.add(`${path}.instrumentType`, `instrumentType must be one of: ${validTypes.join(', ')}`, obj.instrumentType);
  }

  return errors.toResult(data as InstrumentAssignment);
}

// =============================================================================
// PresetAssignment Validation
// =============================================================================

export interface PresetAssignment {
  readonly instrumentType: string;
  readonly presetId: string;
}

function validatePresetAssignment(
  data: unknown,
  path = 'presetAssignment'
): Result<PresetAssignment, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'PresetAssignment must be an object', data);
    return errors.toResult(data as PresetAssignment);
  }

  const obj = data as Record<string, unknown>;

  // instrumentType (enum)
  const validTypes = [
    'LocalGal',
    'KaneMarco',
    'KaneMarcoAether',
    'KaneMarcoAetherString',
    'NexSynth',
    'SamSampler',
    'DrumMachine'
  ];
  if (typeof obj.instrumentType !== 'string' || !validTypes.includes(obj.instrumentType)) {
    errors.add(`${path}.instrumentType`, `instrumentType must be one of: ${validTypes.join(', ')}`, obj.instrumentType);
  }

  // presetId (string)
  if (typeof obj.presetId !== 'string') {
    errors.add(`${path}.presetId`, 'presetId must be a string', obj.presetId);
  }

  return errors.toResult(data as PresetAssignment);
}

// =============================================================================
// AutomationTimeline Validation
// =============================================================================

export interface AutomationTimeline {
  readonly version: string;
  readonly tracks: unknown[];
}

function validateAutomationTimeline(
  data: unknown,
  path = 'automation'
): Result<AutomationTimeline, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'AutomationTimeline must be an object', data);
    return errors.toResult(data as AutomationTimeline);
  }

  const obj = data as Record<string, unknown>;

  // version (const: "1.0")
  if (obj.version !== '1.0') {
    errors.add(`${path}.version`, 'Version must be "1.0"', obj.version);
  }

  // tracks (array)
  if (!Array.isArray(obj.tracks)) {
    errors.add(`${path}.tracks`, 'tracks must be an array');
  }

  return errors.toResult(data as AutomationTimeline);
}

// =============================================================================
// SongModel_v1 Validation
// =============================================================================

export interface SongModel_v1 {
  readonly version: string;
  readonly id: string;
  readonly sourceSongId: string;
  readonly derivationId: string;
  readonly timeline: SongTimeline;
  readonly notes: NoteEvent[];
  readonly automations?: SongAutomation[];
  readonly duration: number;
  readonly tempo: number;
  readonly timeSignature: [number, number];
  readonly sampleRate: 44100 | 48000 | 96000;
  readonly voiceAssignments: VoiceAssignment[];
  readonly console: ConsoleModel;
  readonly presets?: PresetAssignment[];
  readonly derivedAt: number;
  readonly performances?: PerformanceState_v1[];
  readonly activePerformanceId?: string;
}

export interface SongTimeline {
  readonly sections: SongTimelineSection[];
  readonly tempo: number;
  readonly timeSignature: [number, number];
}

export interface SongTimelineSection {
  readonly id: string;
  readonly name: string;
  readonly startTime: number;
  readonly duration: number;
  readonly tempo?: number;
  readonly timeSignature?: [number, number];
}

export interface NoteEvent {
  readonly id: string;
  readonly voiceId: string;
  readonly startTime: number;
  readonly duration: number;
  readonly pitch: number;
  readonly velocity: number;
  readonly derivation?: NoteDerivation;
}

export interface NoteDerivation {
  readonly systemType: 'rhythm' | 'melody' | 'harmony';
  readonly systemId: string;
  readonly confidence: number;
}

export interface SongAutomation {
  readonly id: string;
  readonly target: string;
  readonly time: number;
  readonly value: number;
  readonly interpolation?: 'linear' | 'curve' | 'step';
}

export function validateSongModel(
  data: unknown
): Result<SongModel_v1, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add('root', 'SongModel must be an object', data);
    return errors.toResult(data as SongModel_v1);
  }

  const obj = data as Record<string, unknown>;

  // Version (const: "1.0")
  if (obj.version !== '1.0') {
    errors.add('version', 'Version must be "1.0"', obj.version);
  }

  // ID (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add('id', 'ID must be a valid UUID', obj.id);
  }

  // sourceSongId (UUID)
  if (typeof obj.sourceSongId !== 'string' || !isValidUUID(obj.sourceSongId)) {
    errors.add('sourceSongId', 'sourceSongId must be a valid UUID', obj.sourceSongId);
  }

  // derivationId (UUID)
  if (typeof obj.derivationId !== 'string' || !isValidUUID(obj.derivationId)) {
    errors.add('derivationId', 'derivationId must be a valid UUID', obj.derivationId);
  }

  // duration (integer, min: 0)
  if (typeof obj.duration !== 'number' || obj.duration < 0) {
    errors.add('duration', 'duration must be a non-negative number', obj.duration);
  }

  // tempo (number, exclusiveMin: 0, max: 500)
  if (typeof obj.tempo !== 'number' || obj.tempo <= 0 || obj.tempo > 500) {
    errors.add('tempo', 'tempo must be between 0 and 500 (exclusive)', obj.tempo);
  }

  // timeSignature (array, minItems: 2, maxItems: 2)
  if (!Array.isArray(obj.timeSignature) || obj.timeSignature.length !== 2) {
    errors.add('timeSignature', 'timeSignature must be an array of 2 integers [numerator, denominator]');
  } else {
    obj.timeSignature.forEach((item, index) => {
      if (typeof item !== 'number' || !Number.isInteger(item)) {
        errors.add(`timeSignature[${index}]`, 'timeSignature value must be an integer', item);
      }
    });
  }

  // sampleRate (enum: 44100, 48000, 96000)
  const validSampleRates = [44100, 48000, 96000];
  if (typeof obj.sampleRate !== 'number' || !validSampleRates.includes(obj.sampleRate)) {
    errors.add('sampleRate', `sampleRate must be one of: ${validSampleRates.join(', ')}`, obj.sampleRate);
  }

  // Validate timeline
  if (obj.timeline) {
    errors.addAll(validateSongTimeline(obj.timeline).err || []);
  } else {
    errors.add('timeline', 'timeline is required');
  }

  // Validate notes array
  if (!Array.isArray(obj.notes)) {
    errors.add('notes', 'notes must be an array');
  } else {
    obj.notes.forEach((note, index) => {
      errors.addAll(validateNoteEvent(note, `notes[${index}]`).err || []);
    });
  }

  // Validate voiceAssignments
  if (!Array.isArray(obj.voiceAssignments)) {
    errors.add('voiceAssignments', 'voiceAssignments must be an array');
  } else {
    obj.voiceAssignments.forEach((assignment, index) => {
      errors.addAll(validateSongVoiceAssignment(assignment, `voiceAssignments[${index}]`).err || []);
    });
  }

  // Validate console
  if (obj.console) {
    errors.addAll(validateConsoleModel(obj.console).err || []);
  } else {
    errors.add('console', 'console is required');
  }

  // derivedAt (integer, min: 0)
  if (typeof obj.derivedAt !== 'number' || obj.derivedAt < 0) {
    errors.add('derivedAt', 'derivedAt must be a non-negative number', obj.derivedAt);
  }

  // Optional activePerformanceId (UUID)
  if (obj.activePerformanceId !== undefined && (typeof obj.activePerformanceId !== 'string' || !isValidUUID(obj.activePerformanceId))) {
    errors.add('activePerformanceId', 'activePerformanceId must be a valid UUID', obj.activePerformanceId);
  }

  return errors.toResult(data as SongModel_v1);
}

function validateSongTimeline(
  data: unknown,
  path = 'timeline'
): Result<SongTimeline, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'SongTimeline must be an object', data);
    return errors.toResult(data as SongTimeline);
  }

  const obj = data as Record<string, unknown>;

  // sections (array)
  if (!Array.isArray(obj.sections)) {
    errors.add(`${path}.sections`, 'sections must be an array');
  } else {
    obj.sections.forEach((section, index) => {
      errors.addAll(validateSongTimelineSection(section, `${path}.sections[${index}]`).err || []);
    });
  }

  // tempo (number, exclusiveMin: 0, max: 500)
  if (typeof obj.tempo !== 'number' || obj.tempo <= 0 || obj.tempo > 500) {
    errors.add(`${path}.tempo`, 'tempo must be between 0 and 500 (exclusive)', obj.tempo);
  }

  // timeSignature (array, minItems: 2, maxItems: 2)
  if (!Array.isArray(obj.timeSignature) || obj.timeSignature.length !== 2) {
    errors.add(`${path}.timeSignature`, 'timeSignature must be an array of 2 integers');
  }

  return errors.toResult(data as SongTimeline);
}

function validateSongTimelineSection(
  data: unknown,
  path = 'section'
): Result<SongTimelineSection, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'SongTimelineSection must be an object', data);
    return errors.toResult(data as SongTimelineSection);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // name (string)
  if (typeof obj.name !== 'string') {
    errors.add(`${path}.name`, 'name must be a string', obj.name);
  }

  // startTime (integer, min: 0)
  if (typeof obj.startTime !== 'number' || obj.startTime < 0) {
    errors.add(`${path}.startTime`, 'startTime must be a non-negative number', obj.startTime);
  }

  // duration (integer, min: 0)
  if (typeof obj.duration !== 'number' || obj.duration < 0) {
    errors.add(`${path}.duration`, 'duration must be a non-negative number', obj.duration);
  }

  return errors.toResult(data as SongTimelineSection);
}

function validateNoteEvent(
  data: unknown,
  path = 'note'
): Result<NoteEvent, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'NoteEvent must be an object', data);
    return errors.toResult(data as NoteEvent);
  }

  const obj = data as Record<string, unknown>;

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add(`${path}.id`, 'id must be a valid UUID', obj.id);
  }

  // voiceId (UUID)
  if (typeof obj.voiceId !== 'string' || !isValidUUID(obj.voiceId)) {
    errors.add(`${path}.voiceId`, 'voiceId must be a valid UUID', obj.voiceId);
  }

  // startTime (integer, min: 0)
  if (typeof obj.startTime !== 'number' || obj.startTime < 0) {
    errors.add(`${path}.startTime`, 'startTime must be a non-negative number', obj.startTime);
  }

  // duration (integer, min: 0)
  if (typeof obj.duration !== 'number' || obj.duration < 0) {
    errors.add(`${path}.duration`, 'duration must be a non-negative number', obj.duration);
  }

  // pitch (integer, min: 0, max: 127)
  if (typeof obj.pitch !== 'number' || obj.pitch < 0 || obj.pitch > 127) {
    errors.add(`${path}.pitch`, 'pitch must be between 0 and 127', obj.pitch);
  }

  // velocity (number, min: 0, max: 1)
  if (typeof obj.velocity !== 'number' || obj.velocity < 0 || obj.velocity > 1) {
    errors.add(`${path}.velocity`, 'velocity must be between 0 and 1', obj.velocity);
  }

  return errors.toResult(data as NoteEvent);
}

function validateSongVoiceAssignment(
  data: unknown,
  path = 'voiceAssignment'
): Result<VoiceAssignment, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'VoiceAssignment must be an object', data);
    return errors.toResult(data as VoiceAssignment);
  }

  const obj = data as Record<string, unknown>;

  // voiceId (UUID)
  if (typeof obj.voiceId !== 'string' || !isValidUUID(obj.voiceId)) {
    errors.add(`${path}.voiceId`, 'voiceId must be a valid UUID', obj.voiceId);
  }

  // instrumentId (enum)
  const validInstruments = ['LocalGal', 'KaneMarco', 'KaneMarcoAether', 'KaneMarcoAetherString', 'NexSynth', 'SamSampler', 'DrumMachine'];
  if (typeof obj.instrumentId !== 'string' || !validInstruments.includes(obj.instrumentId)) {
    errors.add(`${path}.instrumentId`, `instrumentId must be one of: ${validInstruments.join(', ')}`, obj.instrumentId);
  }

  // presetId (string, optional)
  if (obj.presetId !== undefined && typeof obj.presetId !== 'string') {
    errors.add(`${path}.presetId`, 'presetId must be a string', obj.presetId);
  }

  // busId (UUID)
  if (typeof obj.busId !== 'string' || !isValidUUID(obj.busId)) {
    errors.add(`${path}.busId`, 'busId must be a valid UUID', obj.busId);
  }

  return errors.toResult(data as VoiceAssignment);
}

export interface VoiceAssignment {
  readonly voiceId: string;
  readonly instrumentId: string;
  readonly presetId?: string;
  readonly busId: string;
}

// =============================================================================
// PerformanceState_v1 Validation
// =============================================================================

export interface PerformanceState_v1 {
  readonly version: string;
  readonly id: string;
  readonly name: string;
  readonly arrangementStyle: PerformanceArrangementStyle;
  readonly density?: number;
  readonly grooveProfileId?: string;
  readonly instrumentationMap?: Record<string, PerformanceInstrumentAssignment>;
  readonly consoleXProfileId?: string;
  readonly mixTargets?: Record<string, PerformanceMixTarget>;
  readonly createdAt?: string;
  readonly modifiedAt?: string;
  readonly metadata?: Record<string, unknown>;
}

export type PerformanceArrangementStyle =
  | 'SOLO_PIANO'
  | 'SATB'
  | 'CHAMBER_ENSEMBLE'
  | 'FULL_ORCHESTRA'
  | 'JAZZ_COMBO'
  | 'JAZZ_TRIO'
  | 'ROCK_BAND'
  | 'AMBIENT_TECHNO'
  | 'ELECTRONIC'
  | 'ACAPPELLA'
  | 'STRING_QUARTET'
  | 'CUSTOM';

export interface PerformanceInstrumentAssignment {
  readonly instrumentId: string;
  readonly presetId?: string;
  readonly parameters?: Record<string, number>;
}

export interface PerformanceMixTarget {
  readonly gain: number;
  readonly pan: number;
  readonly stereo?: boolean;
}

export function validatePerformanceState(
  data: unknown
): Result<PerformanceState_v1, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add('root', 'PerformanceState must be an object', data);
    return errors.toResult(data as PerformanceState_v1);
  }

  const obj = data as Record<string, unknown>;

  // version (const: "1")
  if (obj.version !== '1') {
    errors.add('version', 'Version must be "1"', obj.version);
  }

  // id (UUID)
  if (typeof obj.id !== 'string' || !isValidUUID(obj.id)) {
    errors.add('id', 'ID must be a valid UUID', obj.id);
  }

  // name (string, minLength: 1, maxLength: 256)
  if (typeof obj.name !== 'string') {
    errors.add('name', 'name must be a string', obj.name);
  } else if (obj.name.length < 1 || obj.name.length > 256) {
    errors.add('name', 'name must be between 1 and 256 characters', obj.name);
  }

  // arrangementStyle (enum)
  const validStyles = [
    'SOLO_PIANO',
    'SATB',
    'CHAMBER_ENSEMBLE',
    'FULL_ORCHESTRA',
    'JAZZ_COMBO',
    'JAZZ_TRIO',
    'ROCK_BAND',
    'AMBIENT_TECHNO',
    'ELECTRONIC',
    'ACAPPELLA',
    'STRING_QUARTET',
    'CUSTOM'
  ];
  if (typeof obj.arrangementStyle !== 'string' || !validStyles.includes(obj.arrangementStyle)) {
    errors.add('arrangementStyle', `arrangementStyle must be one of: ${validStyles.join(', ')}`, obj.arrangementStyle);
  }

  // Optional density (number, min: 0, max: 1)
  if (obj.density !== undefined && (typeof obj.density !== 'number' || obj.density < 0 || obj.density > 1)) {
    errors.add('density', 'density must be between 0 and 1', obj.density);
  }

  // Optional grooveProfileId (string)
  if (obj.grooveProfileId !== undefined && typeof obj.grooveProfileId !== 'string') {
    errors.add('grooveProfileId', 'grooveProfileId must be a string', obj.grooveProfileId);
  }

  // Optional consoleXProfileId (string)
  if (obj.consoleXProfileId !== undefined && typeof obj.consoleXProfileId !== 'string') {
    errors.add('consoleXProfileId', 'consoleXProfileId must be a string', obj.consoleXProfileId);
  }

  // Optional instrumentationMap (object)
  if (obj.instrumentationMap !== undefined) {
    if (typeof obj.instrumentationMap !== 'object' || obj.instrumentationMap === null) {
      errors.add('instrumentationMap', 'instrumentationMap must be an object');
    } else {
      const map = obj.instrumentationMap as Record<string, unknown>;
      Object.keys(map).forEach(key => {
        errors.addAll(validatePerformanceInstrumentAssignment(map[key], `instrumentationMap.${key}`).err || []);
      });
    }
  }

  // Optional mixTargets (object)
  if (obj.mixTargets !== undefined) {
    if (typeof obj.mixTargets !== 'object' || obj.mixTargets === null) {
      errors.add('mixTargets', 'mixTargets must be an object');
    } else {
      const targets = obj.mixTargets as Record<string, unknown>;
      Object.keys(targets).forEach(key => {
        errors.addAll(validatePerformanceMixTarget(targets[key], `mixTargets.${key}`).err || []);
      });
    }
  }

  // Optional timestamps (ISO 8601 date-time strings)
  if (obj.createdAt !== undefined && typeof obj.createdAt === 'string') {
    if (!Date.parse(obj.createdAt)) {
      errors.add('createdAt', 'createdAt must be a valid ISO 8601 date-time string', obj.createdAt);
    }
  }

  if (obj.modifiedAt !== undefined && typeof obj.modifiedAt === 'string') {
    if (!Date.parse(obj.modifiedAt)) {
      errors.add('modifiedAt', 'modifiedAt must be a valid ISO 8601 date-time string', obj.modifiedAt);
    }
  }

  return errors.toResult(data as PerformanceState_v1);
}

function validatePerformanceInstrumentAssignment(
  data: unknown,
  path = 'instrumentAssignment'
): Result<PerformanceInstrumentAssignment, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'PerformanceInstrumentAssignment must be an object', data);
    return errors.toResult(data as PerformanceInstrumentAssignment);
  }

  const obj = data as Record<string, unknown>;

  // instrumentId (string, required)
  if (typeof obj.instrumentId !== 'string') {
    errors.add(`${path}.instrumentId`, 'instrumentId must be a string', obj.instrumentId);
  }

  // Optional presetId (string)
  if (obj.presetId !== undefined && typeof obj.presetId !== 'string') {
    errors.add(`${path}.presetId`, 'presetId must be a string', obj.presetId);
  }

  // Optional parameters (object with number values)
  if (obj.parameters !== undefined) {
    if (typeof obj.parameters !== 'object' || obj.parameters === null) {
      errors.add(`${path}.parameters`, 'parameters must be an object');
    } else {
      const params = obj.parameters as Record<string, unknown>;
      Object.keys(params).forEach(key => {
        if (typeof params[key] !== 'number') {
          errors.add(`${path}.parameters.${key}`, 'parameter value must be a number', params[key]);
        }
      });
    }
  }

  return errors.toResult(data as PerformanceInstrumentAssignment);
}

function validatePerformanceMixTarget(
  data: unknown,
  path = 'mixTarget'
): Result<PerformanceMixTarget, ValidationError[]> {
  const errors = new ValidationErrors();

  if (typeof data !== 'object' || data === null) {
    errors.add(path, 'PerformanceMixTarget must be an object', data);
    return errors.toResult(data as PerformanceMixTarget);
  }

  const obj = data as Record<string, unknown>;

  // gain (number, required)
  if (typeof obj.gain !== 'number') {
    errors.add(`${path}.gain`, 'gain must be a number', obj.gain);
  }

  // pan (number, min: -1, max: 1, required)
  if (typeof obj.pan !== 'number' || obj.pan < -1 || obj.pan > 1) {
    errors.add(`${path}.pan`, 'pan must be a number between -1 and 1', obj.pan);
  }

  // Optional stereo (boolean)
  if (obj.stereo !== undefined && typeof obj.stereo !== 'boolean') {
    errors.add(`${path}.stereo`, 'stereo must be a boolean', obj.stereo);
  }

  return errors.toResult(data as PerformanceMixTarget);
}
