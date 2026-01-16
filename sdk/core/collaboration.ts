/**
 * Collaboration and conflict resolution system for the Schillinger SDK
 */

import {
  RhythmPattern,
  ChordProgression,
  MelodyLine,
  Composition,
} from "@schillinger-sdk/shared";

export interface CollaborativeSession {
  id: string;
  name: string;
  participants: Participant[];
  document: CollaborativeDocument;
  createdAt: Date;
  lastModified: Date;
  permissions: SessionPermissions;
}

export interface Participant {
  id: string;
  name: string;
  role:
    | "owner"
    | "editor"
    | "viewer"
    | "composer"
    | "arranger"
    | "orchestrator"
    | "producer"
    | "observer";
  joinedAt: Date;
  lastActive: Date;
  cursor?: CursorPosition;
  expertise: string[];
  attitude?: "engaged" | "neutral" | "minimal" | "skeptical";
  reliability?: number; // 0-100
  contributionQuality?: number; // 0-100
  status: "online" | "away" | "offline" | "busy";
  avatar?: string;
  permissions: Permission[];
  instrumentPreferences?: string[];
}

export interface CursorPosition {
  section?: string;
  element?: string;
  position?: number;
}

export interface Permission {
  action: string;
  scope: "all" | "own" | "assigned";
  restrictions?: string[];
}

export interface ErrorAttribution {
  componentId: string;
  errorDescription: string;
  contributors: ContributorAttribution[];
  operations: Operation[];
  timeline: ErrorTimeline[];
  impactAssessment: ErrorImpact;
  recoveryRecommendations: RecoveryAction[];
  preventionSuggestions: PreventionSuggestion[];
}

export interface ContributorAttribution {
  userId: string;
  name: string;
  role: string;
  operations: Operation[];
  responsibility: "high" | "medium" | "low" | "none";
  quality: number; // 0-100
  availability: string;
  expertise: string[];
  attitude: {
    engagement: "high" | "medium" | "low";
    collaboration: "excellent" | "good" | "fair" | "poor";
    reliability: "high" | "medium" | "low";
    comments: string[];
  };
  sentiment: "positive" | "neutral" | "negative" | "skeptical";
  motivation: "passionate" | "professional" | "minimal" | "paycheck_only";
}

export interface ErrorTimeline {
  timestamp: Date;
  operation: string;
  author: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-100
  expectations: string[];
  rationale?: string;
}

export interface ErrorImpact {
  technicalComplexity: number;
  userExperienceImpact: number;
  recoveryDifficulty: number;
  businessImpact: number;
  affectedComponents: number;
  stakeholderImpact: string[];
}

export interface RecoveryAction {
  priority: "high" | "medium" | "low";
  action: string;
  responsible: string;
  estimatedTime: number;
  description: string;
  prerequisites: string[];
  alternatives: string[];
}

export interface PreventionSuggestion {
  category: "process" | "technical" | "training" | "collaboration" | "cultural";
  suggestion: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  implementer: string;
  timeline: string;
}

export interface ParticipantProfile {
  userId: string;
  name: string;
  role: string;
  expertise: string[];
  reliability: number; // 0-100
  contributionQuality: number; // 0-100
  conflictResolution: number; // 0-100
  communicationStyle: "direct" | "diplomatic" | "detailed" | "minimal";
  motivation: "passionate" | "professional" | "minimal" | "paycheck_only";
  sentiment: "positive" | "neutral" | "negative" | "skeptical";
  responseTime: number; // average minutes
  availability: "high" | "medium" | "low";
  collaborationScore: number; // 0-100
  errorRate: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  notes: string[];
  lastAssessment: Date;
}

export interface CollaborativeDocument {
  id: string;
  type: "composition" | "pattern" | "progression";
  content: Composition | RhythmPattern | ChordProgression | MelodyLine;
  version: number;
  operations: Operation[];
}

export interface Operation {
  id: string;
  type: "create" | "update" | "delete" | "move" | "copy" | "merge" | "comment";
  timestamp: Date;
  authorId: string;
  targetId: string;
  targetType:
    | "note"
    | "chord"
    | "phrase"
    | "section"
    | "form"
    | "orchestration"
    | "annotation";
  data: any;
  previousData?: any;
  dependencies: string[];
  conflictResolution?: "auto" | "manual";
  isReversible: boolean;
  metadata: {
    duration?: number;
    complexity?: number;
    confidence?: number;
    intention: string;
    expectations: string[];
    rationale?: string;
    motivation?: "passionate" | "professional" | "minimal" | "paycheck_only";
    sentiment?: "positive" | "neutral" | "negative" | "skeptical";
  };
  // Legacy fields for backward compatibility
  path?: string;
  value?: any;
  oldValue?: any;
  userId?: string;
  version?: number;
}

export interface Conflict {
  id: string;
  type: "concurrent_edit" | "version_mismatch" | "permission_denied";
  operations: Operation[];
  timestamp: Date;
  participants: string[];
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: "merge" | "overwrite" | "manual" | "revert";
  resolvedData: any;
  timestamp: Date;
  resolvedBy: string;
  reasoning?: string;
}

export interface SessionPermissions {
  allowEdit: boolean;
  allowDelete: boolean;
  allowInvite: boolean;
  allowExport: boolean;
  requireApproval: boolean;
}

export interface MergeResult {
  success: boolean;
  merged?: any;
  conflicts?: Conflict[];
  warnings?: string[];
}

/**
 * Collaboration manager for handling multi-user editing sessions
 */
export class CollaborationManager {
  private sessions = new Map<string, CollaborativeSession>();
  private conflicts = new Map<string, Conflict>();
  private operationHistory = new Map<string, Operation[]>();
  private eventListeners = new Map<string, Array<(event: any) => void>>();
  private participantProfiles = new Map<string, ParticipantProfile>();

  constructor() {
    this.initializeErrorTracking();
  }

  /**
   * Initialize comprehensive error tracking system
   */
  private initializeErrorTracking(): void {
    this.on("operationApplied", (data) => {
      this.trackOperationQuality(data);
    });

    this.on("conflictDetected", (data) => {
      this.analyzeConflictPatterns(data);
    });

    this.on("participantJoined", (data) => {
      this.assessParticipantReliability(data);
    });
  }

  /**
   * Create a new collaborative session
   */
  async createSession(
    name: string,
    document: CollaborativeDocument,
    permissions: SessionPermissions = this.getDefaultPermissions(),
  ): Promise<CollaborativeSession> {
    const session: CollaborativeSession = {
      id: this.generateId(),
      name,
      participants: [],
      document: {
        ...document,
        version: 1,
        operations: [],
      },
      createdAt: new Date(),
      lastModified: new Date(),
      permissions,
    };

    this.sessions.set(session.id, session);
    this.operationHistory.set(session.id, []);

    this.emit("sessionCreated", session);
    return session;
  }

  /**
   * Join a collaborative session
   */
  async joinSession(
    sessionId: string,
    participant: Omit<Participant, "joinedAt" | "lastActive">,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if participant already exists
    const existingIndex = session.participants.findIndex(
      (p) => p.id === participant.id,
    );
    const fullParticipant: Participant = {
      ...participant,
      joinedAt: new Date(),
      lastActive: new Date(),
    };

    if (existingIndex >= 0) {
      session.participants[existingIndex] = fullParticipant;
    } else {
      session.participants.push(fullParticipant);
    }

    this.emit("participantJoined", { sessionId, participant: fullParticipant });
  }

  /**
   * Leave a collaborative session
   */
  async leaveSession(sessionId: string, participantId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const participantIndex = session.participants.findIndex(
      (p) => p.id === participantId,
    );
    if (participantIndex >= 0) {
      const participant = session.participants[participantIndex];
      session.participants.splice(participantIndex, 1);
      this.emit("participantLeft", { sessionId, participant });
    }
  }

  /**
   * Apply an operation to a collaborative document
   */
  async applyOperation(
    sessionId: string,
    operation: Omit<Operation, "id" | "timestamp">,
  ): Promise<MergeResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const fullOperation: Operation = {
      ...operation,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Check for conflicts
    const conflicts = this.detectConflicts(session, fullOperation);

    if (conflicts.length > 0) {
      // Determine conflict type based on the reasons (prioritize path conflicts over version conflicts)
      const hasVersionConflict = conflicts.some((c) =>
        c.reason.includes("outdated"),
      );
      const hasPathConflict = conflicts.some((c) =>
        c.reason.includes("Concurrent modification"),
      );

      let conflictType:
        | "concurrent_edit"
        | "version_mismatch"
        | "permission_denied" = "concurrent_edit";
      if (hasPathConflict) {
        conflictType = "concurrent_edit";
      } else if (hasVersionConflict) {
        conflictType = "version_mismatch";
      }

      // Handle conflicts
      const conflict: Conflict = {
        id: this.generateId(),
        type: conflictType,
        operations: [fullOperation, ...conflicts.map((c) => c.operation)],
        timestamp: new Date(),
        participants: [
          fullOperation.authorId || fullOperation.userId || "unknown",
          ...conflicts.map(
            (c) => c.operation.authorId || c.operation.userId || "unknown",
          ),
        ],
      };

      this.conflicts.set(conflict.id, conflict);
      this.emit("conflictDetected", { sessionId, conflict });

      return {
        success: false,
        conflicts: [conflict],
      };
    }

    // Apply operation
    const result = this.applyOperationToDocument(
      session.document,
      fullOperation,
    );

    if (result.success) {
      session.document.version++;
      session.document.operations.push(fullOperation);
      session.lastModified = new Date();

      // Add to operation history
      const history = this.operationHistory.get(sessionId) || [];
      history.push(fullOperation);
      this.operationHistory.set(sessionId, history);

      this.emit("operationApplied", { sessionId, operation: fullOperation });
    }

    return result;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
  ): Promise<MergeResult> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    conflict.resolution = resolution;

    // Find the session this conflict belongs to
    const session = Array.from(this.sessions.values()).find((s) =>
      s.document.operations.some((op) => conflict.operations.includes(op)),
    );

    if (!session) {
      throw new Error("Session not found for conflict");
    }

    let result: MergeResult;

    switch (resolution.strategy) {
      case "merge":
        result = this.performMerge(session, conflict, resolution);
        break;
      case "overwrite":
        result = this.performOverwrite(session, conflict, resolution);
        break;
      case "revert":
        result = this.performRevert(session, conflict);
        break;
      case "manual":
        result = this.performManualResolution(session, conflict, resolution);
        break;
      default:
        throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
    }

    if (result.success) {
      this.conflicts.delete(conflictId);
      this.emit("conflictResolved", {
        sessionId: session.id,
        conflict,
        resolution,
        result,
      });
    }

    return result;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CollaborativeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): CollaborativeSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get conflicts for a session
   */
  getSessionConflicts(sessionId: string): Conflict[] {
    return Array.from(this.conflicts.values()).filter((conflict) =>
      this.sessions
        .get(sessionId)
        ?.document.operations.some((op) => conflict.operations.includes(op)),
    );
  }

  /**
   * Update participant cursor position
   */
  updateCursor(
    sessionId: string,
    participantId: string,
    cursor: CursorPosition,
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const participant = session.participants.find(
      (p) => p.id === participantId,
    );
    if (participant) {
      participant.cursor = cursor;
      participant.lastActive = new Date();
      this.emit("cursorUpdated", { sessionId, participantId, cursor });
    }
  }

  /**
   * Add event listener
   */
  on(event: string, listener: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private methods

  /**
   * Detect conflicts between operations
   */
  private detectConflicts(
    session: CollaborativeSession,
    operation: Operation,
  ): Array<{ operation: Operation; reason: string }> {
    const conflicts: Array<{ operation: Operation; reason: string }> = [];
    const recentOperations = session.document.operations.slice(-10); // Check last 10 operations

    let hasPathConflict = false;
    let hasSameUserRecentOperation = false;

    for (const existingOp of recentOperations) {
      // Check if there's a recent operation from the same user
      if (
        existingOp.userId === operation.userId &&
        Math.abs(
          existingOp.timestamp.getTime() - operation.timestamp.getTime(),
        ) < 1000
      ) {
        hasSameUserRecentOperation = true;
        continue;
      }

      // Check for path conflicts
      if (
        existingOp.path &&
        operation.path &&
        this.pathsConflict(existingOp.path, operation.path)
      ) {
        hasPathConflict = true;
        conflicts.push({
          operation: existingOp,
          reason: "Concurrent modification of the same element",
        });
      }

      // Check for version conflicts against other operations (only if no path conflict)
      if (
        !hasPathConflict &&
        operation.version &&
        existingOp.version &&
        operation.version <= existingOp.version
      ) {
        conflicts.push({
          operation: existingOp,
          reason: "Operation based on outdated version",
        });
      }
    }

    // Check for version conflicts against document version (only if no path conflicts, no operation conflicts, and no recent same-user operations)
    if (
      !hasPathConflict &&
      conflicts.length === 0 &&
      !hasSameUserRecentOperation &&
      operation.version &&
      operation.version < session.document.version
    ) {
      // Create a synthetic operation to represent the version conflict
      const versionConflictOp: Operation = {
        id: "version-conflict",
        type: "update",
        timestamp: new Date(),
        authorId: "system",
        targetId: session.document.id,
        targetType: "form",
        data: { version: session.document.version },
        dependencies: [],
        isReversible: false,
        metadata: {
          intention: "Version conflict detection",
          expectations: ["Document version update"],
        },
        path: "version",
        value: session.document.version,
        userId: "system",
        version: session.document.version,
      };

      conflicts.push({
        operation: versionConflictOp,
        reason: "Operation based on outdated document version",
      });
    }

    return conflicts;
  }

  /**
   * Check if two paths conflict
   */
  private pathsConflict(path1: string, path2: string): boolean {
    const parts1 = path1.split(".");
    const parts2 = path2.split(".");

    // Exact match
    if (path1 === path2) {
      return true;
    }

    // Parent-child relationship
    const minLength = Math.min(parts1.length, parts2.length);
    for (let i = 0; i < minLength; i++) {
      if (parts1[i] !== parts2[i]) {
        return false;
      }
    }

    return true; // One path is a parent of the other
  }

  /**
   * Apply operation to document
   */
  private applyOperationToDocument(
    document: CollaborativeDocument,
    operation: Operation,
  ): MergeResult {
    try {
      if (!operation.path) {
        return {
          success: false,
          warnings: ["Operation path is required"],
        };
      }
      const pathParts = operation.path.split(".");
      let target = document.content as any;

      // Navigate to the target location
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (target[pathParts[i]] === undefined) {
          return {
            success: false,
            warnings: [
              `Path not found: ${pathParts.slice(0, i + 1).join(".")}`,
            ],
          };
        }
        target = target[pathParts[i]];
      }

      const finalKey = pathParts[pathParts.length - 1];

      switch (operation.type) {
        case "create":
          if (Array.isArray(target)) {
            const index = parseInt(finalKey, 10);
            target.splice(index, 0, operation.data || operation.value);
          } else {
            target[finalKey] = operation.data || operation.value;
          }
          break;

        case "delete":
          if (Array.isArray(target)) {
            const index = parseInt(finalKey, 10);
            target.splice(index, 1);
          } else {
            delete target[finalKey];
          }
          break;

        case "update":
          target[finalKey] = operation.value;
          break;

        case "move":
          // Move operation requires special handling
          return this.handleMoveOperation(document, operation);

        default:
          return {
            success: false,
            warnings: [`Unknown operation type: ${operation.type}`],
          };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        warnings: [
          `Failed to apply operation: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * Handle move operations
   */
  private handleMoveOperation(
    document: CollaborativeDocument,
    operation: Operation,
  ): MergeResult {
    // Move operations require source and destination paths
    const { sourcePath, destinationPath } = operation.value || {};

    if (!sourcePath || !destinationPath) {
      return {
        success: false,
        warnings: ["Move operation requires sourcePath and destinationPath"],
      };
    }

    try {
      // Get source value
      const sourceValue = this.getValueAtPath(document.content, sourcePath);

      // Remove from source
      const deleteResult = this.applyOperationToDocument(document, {
        ...operation,
        type: "delete",
        path: sourcePath,
      });

      if (!deleteResult.success) {
        return deleteResult;
      }

      // Insert at destination
      const insertResult = this.applyOperationToDocument(document, {
        ...operation,
        type: "create",
        path: destinationPath,
        value: sourceValue,
        data: sourceValue,
      });

      return insertResult;
    } catch (error) {
      return {
        success: false,
        warnings: [
          `Move operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * Get value at path
   */
  private getValueAtPath(obj: any, path: string): any {
    const pathParts = path.split(".");
    let current = obj;

    for (const part of pathParts) {
      if (current[part] === undefined) {
        throw new Error(`Path not found: ${path}`);
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Perform merge resolution
   */
  private performMerge(
    session: CollaborativeSession,
    conflict: Conflict,
    resolution: ConflictResolution,
  ): MergeResult {
    // If resolution data is provided, use it directly
    if (resolution.resolvedData) {
      // Apply the resolved data to the document
      session.document.content = {
        ...session.document.content,
        ...resolution.resolvedData,
      };
      session.document.version++;
      session.lastModified = new Date();

      return {
        success: true,
        merged: session.document.content,
      };
    }

    // Otherwise, implement intelligent merging based on operation types and content
    const mergedContent = { ...session.document.content };

    // Apply operations in chronological order, attempting to merge where possible
    const sortedOperations = conflict.operations.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    for (const operation of sortedOperations) {
      const result = this.applyOperationToDocument(
        { ...session.document, content: mergedContent },
        operation,
      );
      if (!result.success) {
        return {
          success: false,
          warnings: [
            `Failed to merge operation ${operation.id}: ${result.warnings?.join(", ")}`,
          ],
        };
      }
    }

    session.document.content = mergedContent;
    session.document.version++;
    session.lastModified = new Date();

    return {
      success: true,
      merged: mergedContent,
    };
  }

  /**
   * Perform overwrite resolution
   */
  private performOverwrite(
    session: CollaborativeSession,
    _conflict: Conflict,
    resolution: ConflictResolution,
  ): MergeResult {
    session.document.content = resolution.resolvedData;
    session.document.version++;
    session.lastModified = new Date();

    return {
      success: true,
      merged: resolution.resolvedData,
    };
  }

  /**
   * Perform revert resolution
   */
  private performRevert(
    session: CollaborativeSession,
    conflict: Conflict,
  ): MergeResult {
    // Find the last stable version before the conflict
    const conflictOperationIds = new Set(
      conflict.operations.map((op) => op.id),
    );
    const stableOperations = session.document.operations.filter(
      (op) => !conflictOperationIds.has(op.id),
    );

    // Rebuild document from stable operations
    const originalContent = this.getOriginalContent(session.document);
    const revertedContent = { ...originalContent };

    for (const operation of stableOperations) {
      this.applyOperationToDocument(
        { ...session.document, content: revertedContent },
        operation,
      );
    }

    session.document.content = revertedContent;
    session.document.version++;
    session.lastModified = new Date();

    return {
      success: true,
      merged: revertedContent,
    };
  }

  /**
   * Perform manual resolution
   */
  private performManualResolution(
    session: CollaborativeSession,
    _conflict: Conflict,
    resolution: ConflictResolution,
  ): MergeResult {
    session.document.content = resolution.resolvedData;
    session.document.version++;
    session.lastModified = new Date();

    return {
      success: true,
      merged: resolution.resolvedData,
    };
  }

  /**
   * Get original content (before any operations)
   */
  private getOriginalContent(document: CollaborativeDocument): any {
    // This would typically be stored separately or reconstructed from the initial state
    // For now, return a deep copy of current content
    return JSON.parse(JSON.stringify(document.content));
  }

  /**
   * Get default permissions
   */
  private getDefaultPermissions(): SessionPermissions {
    return {
      allowEdit: true,
      allowDelete: false,
      allowInvite: false,
      allowExport: true,
      requireApproval: false,
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error("Error in collaboration event listener:", error);
        }
      });
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate comprehensive error attribution report
   *
   * When something breaks, this tells you EXACTLY who did what,
   * why they did it, who should have known better, and who's
   * just here for the paycheck.
   */
  generateErrorAttribution(
    sessionId: string,
    errorComponent: string,
    errorDescription: string,
  ): ErrorAttribution {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const componentOperations = session.document.operations.filter(
      (op) =>
        op.targetId === errorComponent ||
        (op.path && op.path.includes(errorComponent)),
    );

    const contributors = Array.from(
      new Set(
        componentOperations.map((op) => op.authorId || op.userId || "unknown"),
      ),
    );

    const attribution: ErrorAttribution = {
      componentId: errorComponent,
      errorDescription,
      contributors: contributors.map((contributorId) =>
        this.createContributorAttribution(
          contributorId,
          componentOperations,
          session,
        ),
      ),
      operations: componentOperations,
      timeline: this.createErrorTimeline(componentOperations),
      impactAssessment: this.assessErrorImpact(componentOperations, session),
      recoveryRecommendations: this.generateRecoveryRecommendations(
        componentOperations,
        session,
      ),
      preventionSuggestions: this.generatePreventionSuggestions(
        componentOperations,
        session,
      ),
    };

    return attribution;
  }

  /**
   * Create detailed contributor attribution
   */
  private createContributorAttribution(
    contributorId: string,
    operations: Operation[],
    session: CollaborativeSession,
  ): ContributorAttribution {
    const contributorOps = operations.filter(
      (op) => (op.authorId || op.userId) === contributorId,
    );

    const participant = session.participants.find(
      (p) => p.id === contributorId,
    );
    const profile = this.participantProfiles.get(contributorId);

    // Motivation priority: explicit in operations > profile > deduce from behavior
    const explicitMotivation = contributorOps.find(
      (op) => op.metadata?.motivation,
    )?.metadata?.motivation;
    const motivation =
      explicitMotivation ||
      profile?.motivation ||
      this.deduceMotivation(contributorOps, participant);

    return {
      userId: contributorId,
      name: participant?.name || "Unknown Contributor",
      role: participant?.role || "unknown",
      operations: contributorOps,
      responsibility: this.calculateResponsibility(contributorOps),
      quality: this.calculateContributionQuality(contributorOps, profile),
      availability: participant?.status || "offline",
      expertise: participant?.expertise || [],
      attitude: this.assessAttitude(participant, contributorOps, profile),
      sentiment: profile?.sentiment || "neutral",
      motivation,
    };
  }

  /**
   * Calculate responsibility level for errors
   */
  private calculateResponsibility(
    operations: Operation[],
  ): "high" | "medium" | "low" | "none" {
    if (operations.length === 0) return "none";

    const deleteOps = operations.filter((op) => op.type === "delete").length;
    const complexOps = operations.filter(
      (op) => op.metadata?.complexity && op.metadata.complexity > 0.7,
    ).length;

    const lowConfidenceOps = operations.filter(
      (op) => op.metadata?.confidence && op.metadata.confidence < 0.3,
    ).length;

    const paycheckOps = operations.filter(
      (op) => op.metadata?.motivation === "paycheck_only",
    ).length;

    if (deleteOps > 0 || lowConfidenceOps > 0) return "high";
    if (
      complexOps > operations.length / 2 ||
      paycheckOps > operations.length / 2
    )
      return "medium";
    return "low";
  }

  /**
   * Calculate contribution quality
   */
  private calculateContributionQuality(
    operations: Operation[],
    profile?: ParticipantProfile,
  ): number {
    if (operations.length === 0) return 100;

    const avgConfidence =
      operations.reduce(
        (sum, op) => sum + (op.metadata?.confidence || 0.5),
        0,
      ) / operations.length;

    const avgComplexity =
      operations.reduce(
        (sum, op) => sum + (op.metadata?.complexity || 0.5),
        0,
      ) / operations.length;

    const reversibleRate =
      operations.filter((op) => op.isReversible).length / operations.length;

    const qualityScore =
      avgConfidence * 0.4 +
      (1 - Math.abs(0.5 - avgComplexity)) * 0.3 +
      reversibleRate * 0.3;

    return Math.round(qualityScore * 100);
  }

  /**
   * Assess contributor attitude and engagement
   */
  private assessAttitude(
    participant: Participant | undefined,
    operations: Operation[],
    profile?: ParticipantProfile,
  ): {
    engagement: "high" | "medium" | "low";
    collaboration: "excellent" | "good" | "fair" | "poor";
    reliability: "high" | "medium" | "low";
    comments: string[];
  } {
    if (!participant) {
      return {
        engagement: "low",
        collaboration: "poor",
        reliability: "low",
        comments: ["Unknown contributor - no information available"],
      };
    }

    const recentOps = operations.filter(
      (op) => Date.now() - op.timestamp.getTime() < 24 * 60 * 60 * 1000,
    );

    const avgConfidence =
      operations.reduce(
        (sum, op) => sum + (op.metadata?.confidence || 0.5),
        0,
      ) / operations.length;

    const engagement =
      recentOps.length > 5 ? "high" : recentOps.length > 2 ? "medium" : "low";

    const collaboration =
      avgConfidence > 0.8
        ? "excellent"
        : avgConfidence > 0.6
          ? "good"
          : avgConfidence > 0.4
            ? "fair"
            : "poor";

    const reliability = profile
      ? profile.reliability > 75
        ? "high"
        : profile.reliability > 50
          ? "medium"
          : "low"
      : participant.status === "online"
        ? "high"
        : participant.status === "away"
          ? "medium"
          : "low";

    const comments: string[] = [];

    if (participant.role === "observer") {
      comments.push("Observer role - limited contribution authority");
    }

    if (avgConfidence < 0.5) {
      comments.push("Low confidence in operations - may be uncertain");
    }

    if (recentOps.length === 0) {
      comments.push("No recent activity - potentially disengaged");
    }

    if (profile?.motivation === "paycheck_only") {
      comments.push("Just here for the paycheck - minimal engagement expected");
    }

    if (profile && profile.errorRate > 30) {
      comments.push("High error rate - may need additional supervision");
    }

    const cynicalOps = operations.filter(
      (op) =>
        op.metadata?.sentiment === "skeptical" ||
        op.metadata?.motivation === "paycheck_only",
    ).length;

    if (cynicalOps > operations.length / 2) {
      comments.push(
        "Overly cynical attitude - may be resistant to collaboration",
      );
    }

    return { engagement, collaboration, reliability, comments };
  }

  /**
   * Deduce motivation from operations and participant behavior
   */
  private deduceMotivation(
    operations: Operation[],
    participant?: Participant,
  ): "passionate" | "professional" | "minimal" | "paycheck_only" {
    const explicitMotivation = operations.find((op) => op.metadata?.motivation)
      ?.metadata?.motivation;
    if (explicitMotivation) return explicitMotivation;

    if (operations.length === 0) {
      return "minimal";
    }

    const avgConfidence =
      operations.reduce(
        (sum, op) => sum + (op.metadata?.confidence || 0.5),
        0,
      ) / operations.length;

    const detailedRationale = operations.filter(
      (op) => op.metadata?.rationale && op.metadata.rationale.length > 50,
    ).length;

    const positiveSentiment = operations.filter(
      (op) => op.metadata?.sentiment === "positive",
    ).length;

    // Check for passionate: high confidence + positive sentiment OR high confidence + detailed rationale
    if (
      avgConfidence > 0.8 &&
      (positiveSentiment > operations.length / 2 ||
        detailedRationale > operations.length / 2)
    ) {
      return "passionate";
    }

    // Check for professional: good confidence + expertise
    if (
      avgConfidence > 0.6 &&
      participant &&
      participant.expertise.length > 0
    ) {
      return "professional";
    }

    // Check for paycheck_only: low confidence
    if (avgConfidence < 0.4) {
      return "paycheck_only";
    }

    return "minimal";
  }

  /**
   * Create detailed error timeline
   */
  private createErrorTimeline(operations: Operation[]): ErrorTimeline[] {
    return operations
      .map((op) => ({
        timestamp: op.timestamp,
        operation: `${op.type} ${op.targetType || "element"}`,
        author: op.authorId || op.userId || "unknown",
        description: op.metadata?.intention || "No intention provided",
        severity: this.assessOperationSeverity(op),
        confidence: Math.round((op.metadata?.confidence || 0.5) * 100),
        expectations: op.metadata?.expectations || [],
        rationale: op.metadata?.rationale,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Assess operation severity
   */
  private assessOperationSeverity(
    operation: Operation,
  ): "low" | "medium" | "high" | "critical" {
    if (operation.type === "delete") return "critical";
    if (operation.metadata?.complexity && operation.metadata.complexity > 0.8)
      return "high";
    if (operation.metadata?.complexity && operation.metadata.complexity > 0.5)
      return "medium";
    return "low";
  }

  /**
   * Assess comprehensive error impact
   */
  private assessErrorImpact(
    operations: Operation[],
    session: CollaborativeSession,
  ): ErrorImpact {
    // Handle empty operations case
    if (operations.length === 0) {
      return {
        technicalComplexity: 0.5,
        userExperienceImpact: 0.5,
        recoveryDifficulty: 0.5,
        businessImpact: 0.5,
        affectedComponents: 1,
        stakeholderImpact: session.participants.map(
          (p) =>
            `${p.name} (${p.role}) - ${
              p.role === "owner" || p.role === "producer"
                ? "High Impact"
                : p.role === "composer" || p.role === "arranger"
                  ? "Medium Impact"
                  : "Low Impact"
            }`,
        ),
      };
    }

    const technicalComplexity =
      operations.reduce(
        (sum, op) => sum + (op.metadata?.complexity || 0.5),
        0,
      ) / operations.length;

    const userExperienceImpact =
      operations.filter(
        (op) => op.targetType === "form" || op.targetType === "orchestration",
      ).length / operations.length;

    const recoveryDifficulty =
      operations.filter((op) => !op.isReversible).length / operations.length;

    const businessImpact =
      operations.filter(
        (op) => op.metadata?.confidence && op.metadata.confidence < 0.3,
      ).length / operations.length;

    const affectedComponents = Array.from(
      new Set(operations.map((op) => op.targetId || "unknown")),
    ).length;

    const stakeholderImpact = session.participants.map(
      (p) =>
        `${p.name} (${p.role}) - ${
          p.role === "owner" || p.role === "producer"
            ? "High Impact"
            : p.role === "composer" || p.role === "arranger"
              ? "Medium Impact"
              : "Low Impact"
        }`,
    );

    return {
      technicalComplexity,
      userExperienceImpact,
      recoveryDifficulty,
      businessImpact,
      affectedComponents,
      stakeholderImpact,
    };
  }

  /**
   * Generate recovery recommendations with responsible parties
   */
  private generateRecoveryRecommendations(
    operations: Operation[],
    session: CollaborativeSession,
  ): RecoveryAction[] {
    const recommendations: RecoveryAction[] = [];
    const contributors = Array.from(
      new Set(operations.map((op) => op.authorId || op.userId || "unknown")),
    );

    // If no operations, provide general recommendations
    if (operations.length === 0) {
      recommendations.push({
        priority: "high",
        action: "Investigate component error from scratch",
        responsible: "Development Team",
        estimatedTime: 30,
        description: "No operation history available - need full investigation",
        prerequisites: [
          "Access to component source",
          "Understanding of system architecture",
        ],
        alternatives: [
          "Recreate component from scratch",
          "Restore from backup",
        ],
      });

      recommendations.push({
        priority: "medium",
        action: "Review system logs for error context",
        responsible: "System Administrator",
        estimatedTime: 15,
        description: "System logs may contain additional error details",
        prerequisites: ["Access to log files", "Log analysis tools"],
        alternatives: ["Manual code review", "Runtime debugging"],
      });

      return recommendations;
    }

    // Priority 1: Contact most recent contributor
    const lastOp = operations[operations.length - 1];
    const lastAuthor = lastOp?.authorId || lastOp?.userId || "unknown";
    const lastParticipant = session.participants.find(
      (p) => p.id === lastAuthor,
    );

    recommendations.push({
      priority: "high",
      action: "Contact last modifier for immediate assistance",
      responsible: `${lastParticipant?.name || lastAuthor} (${lastParticipant?.role || "unknown"})`,
      estimatedTime: 5,
      description: `${lastParticipant?.name || lastAuthor} made the most recent change at ${lastOp?.timestamp.toLocaleString()} with confidence ${Math.round((lastOp?.metadata?.confidence || 0.5) * 100)}%`,
      prerequisites: ["User is available and responsive"],
      alternatives: [
        "Roll back to previous version",
        "Assign to senior team member",
      ],
    });

    // Priority 2: Review by senior/expert contributor
    const seniorContributor = contributors.find((contributorId) => {
      const ops = operations.filter(
        (op) => (op.authorId || op.userId) === contributorId,
      );
      const participant = session.participants.find(
        (p) => p.id === contributorId,
      );
      return (
        ops.length > 1 ||
        participant?.role === "producer" ||
        participant?.role === "orchestrator"
      );
    });

    if (seniorContributor) {
      const seniorParticipant = session.participants.find(
        (p) => p.id === seniorContributor,
      );
      recommendations.push({
        priority: "high",
        action: "Request review by experienced contributor",
        responsible: `${seniorParticipant?.name || seniorContributor} (${seniorParticipant?.role || "experienced"})`,
        estimatedTime: 15,
        description: `${seniorParticipant?.name || seniorContributor} has significant experience with this component`,
        prerequisites: [
          "Access to full component history",
          "Understanding of musical context",
        ],
        alternatives: ["External expert review", "Team consensus decision"],
      });
    }

    // Priority 3: Automated rollback if possible
    const reversibleOps = operations.filter((op) => op.isReversible);
    if (reversibleOps.length > 0) {
      recommendations.push({
        priority: "medium",
        action: "Consider automated rollback to last stable state",
        responsible: "System Administrator",
        estimatedTime: 2,
        description: `${reversibleOps.length} of ${operations.length} operations are reversible`,
        prerequisites: ["Recent backup available", "No dependent components"],
        alternatives: ["Manual reconstruction", "Partial rollback"],
      });
    }

    // Priority 4: Team collaboration session
    if (contributors.length > 1) {
      recommendations.push({
        priority: "medium",
        action: "Schedule collaborative resolution session",
        responsible: "Team Lead/Producer",
        estimatedTime: 30,
        description:
          "All contributors should participate in resolution to prevent future issues",
        prerequisites: [
          "All contributors available",
          "Screen sharing capability",
          "Version control access",
        ],
        alternatives: [
          "Async discussion",
          "Individual reviews with consolidation",
        ],
      });
    }

    // Add at least one medium priority recommendation if none exists yet
    const hasMediumPriority = recommendations.some(
      (r) => r.priority === "medium",
    );
    if (!hasMediumPriority) {
      recommendations.push({
        priority: "medium",
        action: "Document error and resolution steps",
        responsible: "Team Lead",
        estimatedTime: 10,
        description: "Ensure proper documentation for future reference",
        prerequisites: ["Documentation access", "Time for write-up"],
        alternatives: ["Video documentation", "Knowledge base entry"],
      });
    }

    return recommendations;
  }

  /**
   * Generate prevention suggestions based on patterns
   */
  private generatePreventionSuggestions(
    operations: Operation[],
    session: CollaborativeSession,
  ): PreventionSuggestion[] {
    const suggestions: PreventionSuggestion[] = [];

    // Process improvements
    const lowConfidenceOps = operations.filter(
      (op) => op.metadata?.confidence && op.metadata.confidence < 0.5,
    ).length;

    if (lowConfidenceOps > operations.length / 3) {
      suggestions.push({
        category: "process",
        suggestion:
          "Implement mandatory confidence threshold for complex operations",
        impact: "high",
        effort: "medium",
        implementer: "Development Team",
        timeline: "2 weeks",
      });
    }

    const cynicalOps = operations.filter(
      (op) =>
        op.metadata?.sentiment === "skeptical" ||
        op.metadata?.motivation === "paycheck_only",
    ).length;

    if (cynicalOps > operations.length / 2) {
      suggestions.push({
        category: "cultural",
        suggestion:
          "Address team morale and engagement - consider team building and motivation initiatives",
        impact: "high",
        effort: "high",
        implementer: "Team Lead/HR",
        timeline: "1 month",
      });
    }

    // Technical improvements
    suggestions.push({
      category: "technical",
      suggestion: "Add automated testing for critical musical components",
      impact: "high",
      effort: "medium",
      implementer: "Development Team",
      timeline: "3 weeks",
    });

    suggestions.push({
      category: "technical",
      suggestion: "Implement real-time validation during composition",
      impact: "medium",
      effort: "medium",
      implementer: "Development Team",
      timeline: "2 weeks",
    });

    // Training improvements
    const inexperiencedContributors = session.participants.filter(
      (p) => p.role === "observer" || p.expertise.length === 0,
    );

    if (inexperiencedContributors.length > 0) {
      suggestions.push({
        category: "training",
        suggestion: `Provide training for ${inexperiencedContributors.length} inexperienced team members`,
        impact: "medium",
        effort: "medium",
        implementer: "Senior Team Members",
        timeline: "1 month",
      });
    }

    // Collaboration improvements
    suggestions.push({
      category: "collaboration",
      suggestion: "Require confirmation before destructive operations",
      impact: "medium",
      effort: "low",
      implementer: "Development Team",
      timeline: "1 week",
    });

    suggestions.push({
      category: "collaboration",
      suggestion: "Implement peer review system for complex musical changes",
      impact: "high",
      effort: "medium",
      implementer: "Team Lead",
      timeline: "2 weeks",
    });

    return suggestions;
  }

  /**
   * Track operation quality for future attribution
   */
  private trackOperationQuality(data: any): void {
    const { sessionId, operation } = data;

    let profile = this.participantProfiles.get(
      operation.authorId || operation.userId,
    );
    if (!profile) {
      profile = this.createDefaultProfile(
        operation.authorId || operation.userId,
      );
      this.participantProfiles.set(profile.userId, profile);
    }

    // Update profile based on operation
    this.updateProfileFromOperation(profile, operation);
  }

  /**
   * Analyze conflict patterns for systemic issues
   */
  private analyzeConflictPatterns(data: any): void {
    const { sessionId, conflict } = data;

    // Track conflict patterns by participant
    conflict.participants.forEach((participantId: string) => {
      let profile = this.participantProfiles.get(participantId);
      if (!profile) {
        profile = this.createDefaultProfile(participantId);
        this.participantProfiles.set(participantId, profile);
      }

      // Update conflict resolution metrics
      profile.conflictResolution = Math.max(0, profile.conflictResolution - 5);
      profile.lastAssessment = new Date();
    });
  }

  /**
   * Assess participant reliability on join
   */
  private assessParticipantReliability(data: any): void {
    const { sessionId, participant } = data;

    const profile = this.createDefaultProfile(participant.id);

    // Use participant's provided values if available
    profile.name = participant.name;
    profile.role = participant.role;
    profile.expertise = participant.expertise || [];

    if (participant.reliability !== undefined) {
      profile.reliability = participant.reliability;
    }

    if (participant.contributionQuality !== undefined) {
      profile.contributionQuality = participant.contributionQuality;
    }

    // Set motivation based on attitude
    // engaged -> professional (committed and reliable)
    // neutral -> professional (default)
    // skeptical -> paycheck_only (just doing the job)
    // minimal -> minimal (minimum effort)
    if (participant.attitude === "skeptical") {
      profile.motivation = "paycheck_only";
      // Higher error rate for skeptical participants
      profile.errorRate = 25;
      profile.conflictResolution = Math.max(0, profile.conflictResolution - 25);
    } else if (participant.attitude === "minimal") {
      profile.motivation = "minimal";
      // Even higher error rate for minimal effort participants
      profile.errorRate = 35;
      profile.conflictResolution = Math.max(0, profile.conflictResolution - 35);
    } else if (participant.attitude === "engaged") {
      // Lower error rate for engaged participants
      profile.errorRate = 5;
      profile.conflictResolution = Math.min(
        100,
        profile.conflictResolution + 15,
      );
    }

    this.participantProfiles.set(participant.id, profile);
  }

  /**
   * Create default participant profile
   */
  private createDefaultProfile(userId: string): ParticipantProfile {
    return {
      userId,
      name: "Unknown Participant",
      role: "unknown",
      expertise: [],
      reliability: 50,
      contributionQuality: 50,
      conflictResolution: 50,
      communicationStyle: "minimal",
      motivation: "professional",
      sentiment: "neutral",
      responseTime: 60,
      availability: "medium",
      collaborationScore: 50,
      errorRate: 10,
      strengths: [],
      weaknesses: ["New participant - insufficient data"],
      notes: [],
      lastAssessment: new Date(),
    };
  }

  /**
   * Update profile from operation
   */
  private updateProfileFromOperation(
    profile: ParticipantProfile,
    operation: Operation,
  ): void {
    const confidence = operation.metadata?.confidence || 0.5;
    const complexity = operation.metadata?.complexity || 0.5;

    // Update contribution quality based on confidence and complexity
    const operationQuality = confidence * (1 - Math.abs(0.5 - complexity));
    profile.contributionQuality = Math.round(
      profile.contributionQuality * 0.8 + operationQuality * 100 * 0.2,
    );

    // Update reliability based on operation success
    if (operation.metadata?.confidence && operation.metadata.confidence > 0.7) {
      profile.reliability = Math.min(100, profile.reliability + 1);
    } else if (
      operation.metadata?.confidence &&
      operation.metadata.confidence < 0.3
    ) {
      profile.reliability = Math.max(0, profile.reliability - 2);
      profile.errorRate = Math.min(100, profile.errorRate + 1);
    }

    // Update sentiment from operation
    if (operation.metadata?.sentiment) {
      profile.sentiment = operation.metadata.sentiment;
    }

    // Update motivation from operation
    if (operation.metadata?.motivation) {
      profile.motivation = operation.metadata.motivation;
    }

    profile.lastAssessment = new Date();
  }

  /**
   * Get participant profile
   */
  getParticipantProfile(userId: string): ParticipantProfile | undefined {
    return this.participantProfiles.get(userId);
  }

  /**
   * Update participant profile
   */
  updateParticipantProfile(profile: ParticipantProfile): void {
    this.participantProfiles.set(profile.userId, profile);
  }
}
