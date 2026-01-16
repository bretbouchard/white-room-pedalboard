/**
 * @fileoverview This file contains the type definitions for the React Flow implementation.
 * It defines the base types for nodes and edges, as well as the specific types for the DAW and Theory views.
 * The types are designed to be extensible and modular, allowing for easy addition of new node and edge types.
 */

import type { Edge, Node, XYPosition } from '@xyflow/react';

// Re-export XYPosition for use in other modules
export type { XYPosition };

//================================================================================================
// Base Types
//================================================================================================

/**
 * Base data for all nodes in the flow.
 * @template T - The type of the node.
 */
export interface BaseNodeData<T extends string = string> extends Record<string, unknown> {
  /** The type of the node. */
  type: T;
  /** The label of the node. */
  label: string;
  /** A description of the node. */
  description?: string;
  /** The ID of the parent node. */
  parentId?: string;
  /** Zero-based ordering within the parent. */
  order: number;
  /** Hierarchical path of node ids from root to this node. */
  path: string[];
  /** The color of the node. */
  color?: string;
}

/**
 * Base data for all edges in the flow.
 * @template T - The type of the edge.
 */
export interface BaseEdgeData<T extends string = string> extends Record<string, unknown> {
  /** The type of the edge. */
  type: T;
  /** The context path for the edge. */
  contextPath: string[];
  /** The gain of the edge. */
  gain?: number;
  /** A description of the edge. */
  description?: string;
}

//================================================================================================
// Node & Edge Types
//================================================================================================

/** The type of an edge in the flow. */
export type FlowEdgeType = 'signal' | 'control' | 'arrangement' | 'analysis';

/** The type of a node in the DAW flow. */
export type DAWFlowNodeType = 'song' | 'section' | 'track' | 'clip' | 'bus' | 'effect' | 'analyzer' | 'automation' | 'plugin';

/** The type of a node in the Theory flow. */
export type TheoryFlowNodeType = 'theory_concept' | 'chord' | 'scale' | 'motif' | 'progression';

/** A union of all possible node types. */
export type FlowNodeType = DAWFlowNodeType | TheoryFlowNodeType;

//================================================================================================
// Node Data Interfaces
//================================================================================================

export interface SongNodeData extends BaseNodeData<"song"> {
  tempo: number;
  key: string;
  timeSignature: string;
  lengthBars: number;
}

export interface SectionNodeData extends BaseNodeData<"section"> {
  sectionType: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'custom';
  startBar: number;
  lengthBars: number;
}

export interface TrackNodeData extends BaseNodeData<"track"> {
  trackType: 'audio' | 'midi' | 'instrument' | 'aux';
  channel?: number;
  instrument?: string;
  busId?: string;
}

export interface ClipNodeData extends BaseNodeData<"clip"> {
  sourceType: 'audio' | 'midi' | 'pattern';
  startBeat: number;
  lengthBeats: number;
  fileName?: string;
}

export interface BusNodeData extends BaseNodeData<"bus"> {
  busType: 'master' | 'group' | 'fx';
}

export interface EffectNodeData extends BaseNodeData<"effect"> {
  pluginName: string;
  bypassed: boolean;
  mix: number;
  targetTrackId: string;
  plugin_instance_id?: string;
}

export interface AnalyzerNodeData extends BaseNodeData<"analyzer"> {
  metric: 'lufs' | 'spectrum' | 'loudness' | 'custom';
  windowMs: number;
  targetTrackId: string;
}

export interface AutomationNodeData extends BaseNodeData<"automation"> {
  parameterId: string;
  targetId: string;
  range: [number, number];
}

export interface TheoryConceptNodeData extends BaseNodeData<"theory_concept"> {
  conceptName: string;
}

export interface ChordNodeData extends BaseNodeData<"chord"> {
  chordName: string;
  notes: string[];
}

export interface ScaleNodeData extends BaseNodeData<"scale"> {
  scaleName: string;
  notes: string[];
}

export interface MotifNodeData extends BaseNodeData<"motif"> {
  motifPattern: string;
}

export interface ProgressionNodeData extends BaseNodeData<"progression"> {
  progression: string[];
}

export interface PluginNodeData extends BaseNodeData<"plugin"> {
  pluginInstanceId?: string;
  pluginName?: string;
  pluginCategory?: string;
  isBypassed?: boolean;
  cpuUsage?: number;
  latency?: number;
}

/** A map of node types to their data interfaces. */
export interface FlowNodeDataMap {
  song: SongNodeData;
  section: SectionNodeData;
  track: TrackNodeData;
  clip: ClipNodeData;
  bus: BusNodeData;
  effect: EffectNodeData;
  analyzer: AnalyzerNodeData;
  automation: AutomationNodeData;
  plugin: PluginNodeData;
  theory_concept: TheoryConceptNodeData;
  chord: ChordNodeData;
  scale: ScaleNodeData;
  motif: MotifNodeData;
  progression: ProgressionNodeData;
}

/** A union of all possible node data types. */
export type FlowNodeDataUnion = FlowNodeDataMap[keyof FlowNodeDataMap];

/** A generic type to get the specific node data type for a given flow node type. */
export type FlowNodeData<T extends FlowNodeType> = FlowNodeDataMap[T];

//================================================================================================
// React Flow Generic Types
//================================================================================================

/**
 * A generic node type for the React Flow implementation.
 * @template T - The type of the node.
 */
export type FlowNode<T extends FlowNodeType = FlowNodeType> = Node<FlowNodeDataMap[T], T>;

/**
 * A generic edge type for the React Flow implementation.
 * @template T - The type of the edge.
 */
export type FlowEdge<T extends FlowEdgeType = FlowEdgeType> = Edge<BaseEdgeData<T>>;

//================================================================================================
// Flow Hierarchy
//================================================================================================

/** A node in the flow hierarchy. */
export interface FlowHierarchyNode {
  node: FlowNode;
  children: FlowHierarchyNode[];
}

/** The flow hierarchy. */
export type FlowHierarchy = FlowHierarchyNode[];

//================================================================================================
// Flow Snapshot
//================================================================================================

/** A snapshot of the flow state. */
export interface FlowSnapshot {
  version: number;
  generatedAt: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  hierarchy: FlowHierarchy;
}

//================================================================================================
// Input Types
//================================================================================================

/**
 * Input for creating a new flow node.
 * @template T - The type of the node.
 */
export type NewFlowNodeInput<T extends FlowNodeType = FlowNodeType> = Omit<Node<FlowNodeDataMap[T], T>, 'id' | 'position'> & {
  id?: string;
  position?: XYPosition;
};

/** Input for creating a new flow edge. */
export type NewFlowEdgeInput = Omit<Edge, 'id'> & {
  id?: string;
};