/**
 * Multi-Graph IR Architecture - Main Export
 *
 * Comprehensive IR system for Schillinger SDK supporting:
 * - Multiple independent song graphs on shared timeline
 * - Full Schillinger system embodiment (process-centric)
 * - Deterministic playback, diffing, replay, AI reasoning
 * - Human-machine co-performance
 *
 * IR Stack (24 types):
 * 1. TimelineIR - Global time authority
 * 2. SongGraphIR - Isolated musical graphs
 * 3. SongPlacementIR - Timeline coexistence
 * 4. InstrumentIR - Sound sources & processors
 * 5. SignalGraphIR - Wiring & routing
 * 6. ControlIR - Parameter evolution
 * 7. ProcessIR - Schillinger operations
 * 8. PatternIR - Musical events (v2 expanded, v1 backward compat)
 * 9. StructuralIR - Form & hierarchy
 * 10. MixIR - Cross-graph interaction
 * 11. SceneIR - System-level state
 * 12. RoleIR - Musical function authority
 * 13. ConstraintIR - Deterministic conflict resolution
 * 14. RealizationPolicyIR - Execution mode authority
 * 15. GraphInstanceIR - Concrete graph instances
 * 16. ParameterBindingIR - Parameter binding
 * 17. AutomationIR - Time-based parameter change
 * 18. PerformanceContextIR - Runtime constraints
 * 19. VariationIntentIR - Musical variation
 * 20. NamespaceIR - Collision safety
 * 21. IntentIR - Musical intent (AI, composer, system)
 * 22. HumanIntentIR - Live performer intent (Phase 6)
 * 23. GestureIR - Raw performance signals (Phase 6)
 * 24. ExplainabilityIR - Audit trail (v2 with human support)
 */

// Re-export error classes from shared package (for backward compatibility)
export {
  SchillingerError,
  MathError,
  ValidationError,
  NetworkError,
  AuthenticationError,
  InvalidCredentialsError,
  PermissionDeniedError,
  RateLimitError,
  QuotaExceededError,
  ConfigurationError,
  ProcessingError,
} from "@schillinger-sdk/shared/errors";

// Re-export rhythm transformation functions from shared package
export {
  applyRhythmAugmentation,
  applyRhythmDiminution,
  applyRhythmRetrograde,
  applyRhythmRotation,
  applyRhythmPermutation,
  applyRhythmFractioning,
} from "@schillinger-sdk/shared/math/pattern-variations";

// Shared types
export * from "./types";

// Priority 1: TimelineIR - Global time authority
export * from "./timeline";

// Priority 2: SongGraphIR - Isolated musical graphs
export * from "./song-graph";

// Priority 2: PatternIR - Musical events (v2 expanded, v1 backward compat)
export * from "./pattern";

// Priority 2: StructuralIR - Form & hierarchy
export * from "./structural";

// Priority 3: InstrumentIR - Sound sources & processors
export * from "./instrument";

// Priority 3: SignalGraphIR - Wiring & routing
export * from "./signal-graph";

// Priority 4: SongPlacementIR - Timeline coexistence
export * from "./song-placement";

// Priority 5: MixIR - Cross-graph interaction
export * from "./mix";

// Priority 6: SceneIR - System-level state
export * from "./scene";

// Priority 7: ProcessIR - Schillinger operations
export * from "./process";

// Priority 8: ControlIR - Parameter evolution
export * from "./control";

// Priority 9: NamespaceIR - Collision safety
export * from "./namespace";

// Priority 10: IntentIR - Musical intent (future)
export * from "./intent";

// Governance IRs - Authority and determinism
export * from "./role";
export * from "./constraint";
export * from "./realization-policy";

// Coordination IRs - Multi-song, multi-scene coordination
export * from "./graph-instance";
export * from "./parameter-binding";
export * from "./automation";
export * from "./performance-context";
export * from "./variation-intent";
export * from "./explainability";

// Phase 6: Human-Machine Co-Performance
export * from "./human-intent";
export * from "./gesture";
