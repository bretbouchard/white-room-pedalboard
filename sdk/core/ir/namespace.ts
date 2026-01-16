/**
 * NamespaceIR — Collision Safety
 *
 * Responsibility: Prevent ID collisions across independent graphs
 *
 * Rules:
 * - Every SongGraph has a namespace
 * - All IDs are resolved via namespace
 * - Prevents automation and AI collisions
 */

import type { NamespaceId } from "./types";

/**
 * NamespaceIR_v1 - ID namespace for collision safety
 *
 * NamespaceIR prevents ID collisions across independent SongGraphs.
 * Every SongGraph has a namespace, and all IDs within are resolved via it.
 */
export interface NamespaceIR_v1 {
  version: "1.0";

  /**
   * Unique namespace identifier
   * e.g., 'artist-1', 'session-abc', 'project-xyz'
   */
  id: NamespaceId;

  /**
   * Prefix for all IDs in this namespace
   * e.g., 'art1-', 'sess-', 'proj-'
   */
  prefix: string;
}
