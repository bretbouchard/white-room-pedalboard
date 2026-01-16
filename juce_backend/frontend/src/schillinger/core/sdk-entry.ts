/**
 * Schillinger SDK for tvOS JavaScriptCore Embedding
 * @version 1.0.0
 * @platform tvOS JavaScriptCore
 */

interface IRDelta {
  type: 'add' | 'remove' | 'update';
  path: string;
  value?: any;
}

interface SessionConfig {
  sessionSeed: number;
  graphInstanceId: string;
  schemaVersion: string;
  sdkBuildHash: string;
}

interface TimeWindow {
  from: number;
  to: number;
}

interface Plan {
  planHash: string;
  irHash: string;
  generatedAt: number;
  window: TimeWindow;
  operations: any[];
}

interface Explanation {
  type: string;
  message: string;
  relatedIRPath?: string;
}

interface ValidationResult {
  ok: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface SessionSnapshot {
  sessionId: string;
  ir: any;
  seed: number;
  graphInstanceId: string;
  timestamp: number;
}

class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

class SessionManager {
  private sessions: Map<string, any> = new Map();

  createSession(config: SessionConfig): string {
    const sessionId = 'session-' + SeededRNG.hashString(config.graphInstanceId + config.sessionSeed);

    this.sessions.set(sessionId, {
      id: sessionId,
      ir: {},
      seed: config.sessionSeed,
      graphInstanceId: config.graphInstanceId,
      schemaVersion: config.schemaVersion,
      createdAt: Date.now()
    });

    return sessionId;
  }

  getSession(sessionId: string): any | null {
    return this.sessions.get(sessionId) || null;
  }

  updateSessionIR(sessionId: string, delta: IRDelta): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (delta.type === 'add' || delta.type === 'update') {
      if (delta.value !== undefined) {
        this.setPath(session.ir, delta.path, delta.value);
      }
    } else if (delta.type === 'remove') {
      this.deletePath(session.ir, delta.path);
    }

    return true;
  }

  private setPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  private deletePath(obj: any, path: string): void {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) return;
      current = current[keys[i]];
    }
    delete current[keys[keys.length - 1]];
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

class IRValidator {
  validate(ir: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ir || typeof ir !== 'object') {
      return {
        ok: false,
        isValid: false,
        errors: ['IR is null or not an object'],
        warnings: []
      };
    }

    this.validateSchema(ir, errors, warnings);
    this.validateUniqueIDs(ir, errors, warnings);
    this.validateAcyclic(ir, errors, warnings);

    return {
      ok: errors.length === 0,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateSchema(ir: any, errors: string[], warnings: string[]): void {
    if (!ir.schemaVersion) {
      warnings.push('Missing schemaVersion');
    }
    if (!ir.graph) {
      errors.push('Missing required field: graph');
    }
  }

  private validateUniqueIDs(ir: any, errors: string[], warnings: string[]): void {
    const seenIDs = new Set<string>();

    const traverse = (obj: any, path: string) => {
      if (!obj || typeof obj !== 'object') return;

      if (obj.id && typeof obj.id === 'string') {
        if (seenIDs.has(obj.id)) {
          errors.push('Duplicate ID detected: ' + obj.id + ' at ' + path);
        }
        seenIDs.add(obj.id);
      }

      for (const key in obj) {
        traverse(obj[key], path + '.' + key);
      }
    };

    traverse(ir, 'root');
  }

  private validateAcyclic(ir: any, errors: string[], warnings: string[]): void {
    const visited = new Set<any>();
    const recursionStack = new Set<any>();

    const detectCycle = (obj: any): boolean => {
      if (!obj || typeof obj !== 'object') return false;

      if (recursionStack.has(obj)) {
        errors.push('Cycle detected in IR graph');
        return true;
      }

      if (visited.has(obj)) return false;

      visited.add(obj);
      recursionStack.add(obj);

      for (const key in obj) {
        if (detectCycle(obj[key])) return true;
      }

      recursionStack.delete(obj);
      return false;
    };

    detectCycle(ir);
  }
}

class PlanGenerator {
  generate(sessionId: string, session: any, window: TimeWindow): Plan {
    const rng = new SeededRNG(session.seed + window.from);
    const operations: any[] = [];

    const operationCount = Math.floor(rng.next() * 10) + 1;

    for (let i = 0; i < operationCount; i++) {
      operations.push({
        type: 'note',
        pitch: Math.floor(rng.next() * 128),
        velocity: Math.floor(rng.next() * 127),
        startTime: window.from + (rng.next() * (window.to - window.from)),
        duration: rng.next() * 1000
      });
    }

    const planHash = this.generateHash(operations);
    const irHash = this.generateHash(session.ir);

    return {
      planHash,
      irHash,
      generatedAt: Date.now(),
      window,
      operations
    };
  }

  private generateHash(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

class ExplainabilityEngine {
  explain(sessionId: string, session: any, query: string): Explanation[] {
    const explanations: Explanation[] = [];

    if (query.includes('rhythm') || query.includes('pattern')) {
      explanations.push({
        type: 'rhythm',
        message: 'Rhythm generated using Schillinger interference patterns',
        relatedIRPath: 'graph.rhythm'
      });
    }

    if (query.includes('harmony') || query.includes('chord')) {
      explanations.push({
        type: 'harmony',
        message: 'Harmony derived from axis progression and resultant theory',
        relatedIRPath: 'graph.harmony'
      });
    }

    if (query.includes('melody') || query.includes('contour')) {
      explanations.push({
        type: 'melody',
        message: 'Melody constructed using contour expansion and interval permutation',
        relatedIRPath: 'graph.melody'
      });
    }

    if (explanations.length === 0) {
      explanations.push({
        type: 'general',
        message: 'Musical material generated using Schillinger System techniques'
      });
    }

    return explanations;
  }
}

class SchillingerSDKImpl {
  private sessionManager: SessionManager;
  private planGenerator: PlanGenerator;
  private explainability: ExplainabilityEngine;
  private validator: IRValidator;
  private sdkBuildHash: string;

  constructor() {
    this.sessionManager = new SessionManager();
    this.planGenerator = new PlanGenerator();
    this.explainability = new ExplainabilityEngine();
    this.validator = new IRValidator();
    this.sdkBuildHash = 'dev-build';
  }

  init(config: SessionConfig): { sessionId: string; sdkBuildHash: string; schemaVersion: string } {
    const sessionId = this.sessionManager.createSession(config);

    return {
      sessionId,
      sdkBuildHash: this.sdkBuildHash,
      schemaVersion: config.schemaVersion
    };
  }

  applyIR(sessionId: string, delta: IRDelta): { ok: boolean; irHash: string } {
    const success = this.sessionManager.updateSessionIR(sessionId, delta);

    if (!success) {
      return { ok: false, irHash: '' };
    }

    const session = this.sessionManager.getSession(sessionId);
    const irHash = this.generateHash(session.ir);

    return { ok: true, irHash };
  }

  plan(sessionId: string, window: TimeWindow): { ok: boolean; planHash: string; plan: Plan } {
    const session = this.sessionManager.getSession(sessionId);

    if (!session) {
      return { ok: false, planHash: '', plan: null as any };
    }

    const generatedPlan = this.planGenerator.generate(sessionId, session, window);

    return { ok: true, planHash: generatedPlan.planHash, plan: generatedPlan };
  }

  explain(sessionId: string, query: string): { ok: boolean; explanations: Explanation[] } {
    const session = this.sessionManager.getSession(sessionId);

    if (!session) {
      return { ok: false, explanations: [] };
    }

    const explanations = this.explainability.explain(sessionId, session, query);

    return { ok: true, explanations };
  }

  snapshot(sessionId: string): { ok: boolean; snapshot: SessionSnapshot } {
    const session = this.sessionManager.getSession(sessionId);

    if (!session) {
      return { ok: false, snapshot: null as any };
    }

    const snapshot: SessionSnapshot = {
      sessionId,
      ir: JSON.parse(JSON.stringify(session.ir)),
      seed: session.seed,
      graphInstanceId: session.graphInstanceId,
      timestamp: Date.now()
    };

    return { ok: true, snapshot };
  }

  validate(ir: any): ValidationResult {
    return this.validator.validate(ir);
  }

  private generateHash(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

const sdkInstance = new SchillingerSDKImpl();

(globalThis as any).SchillingerSDK = {
  init: (config: SessionConfig) => sdkInstance.init(config),
  applyIR: (sessionId: string, delta: IRDelta) => sdkInstance.applyIR(sessionId, delta),
  plan: (sessionId: string, window: TimeWindow) => sdkInstance.plan(sessionId, window),
  explain: (sessionId: string, query: string) => sdkInstance.explain(sessionId, query),
  snapshot: (sessionId: string) => sdkInstance.snapshot(sessionId),
  validate: (ir: any) => sdkInstance.validate(ir)
};

export { SchillingerSDKImpl, SessionManager, PlanGenerator, ExplainabilityEngine, IRValidator };
