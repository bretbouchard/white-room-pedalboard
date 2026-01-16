import { create } from 'zustand';
import {
  applyEdgeChanges,
  applyNodeChanges,
  EdgeChange,
  NodeChange,
  Node as RFNode,
  Edge as RFEdge,
} from '@xyflow/react';
import {
  FlowEdge,
  FlowEdgeType,
  FlowHierarchy,
  FlowHierarchyNode,
  FlowNode,
  FlowNodeData,
  FlowNodeType,
  FlowSnapshot,
  NewFlowEdgeInput,
  NewFlowNodeInput,
} from '@/types/flow';

//================================================================================================
// Initial State
//================================================================================================

const { nodes: initialDAWNodes, edges: initialDAWEdges } = createInitialGraph();
const initialTheoryNodes: FlowNode[] = [];
const initialTheoryEdges: FlowEdge[] = [];

//================================================================================================
// Store
//================================================================================================

type FlowViewType = 'daw' | 'theory';

interface DualFlowState {
  daw: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
  theory: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
  activeView: FlowViewType;
  hierarchy: FlowHierarchy;
  version: number;
  selectedNodeId?: string;

  // Actions
  setActiveView: (view: FlowViewType) => void;
  setDAWNodes: (nodes: FlowNode[]) => void;
  setDAWEdges: (edges: FlowEdge[]) => void;
  setTheoryNodes: (nodes: FlowNode[]) => void;
  setTheoryEdges: (edges: FlowEdge[]) => void;
  selectNode: (nodeId?: string) => void;
  clear: () => void;
  addNode: <T extends FlowNodeType>(input: NewFlowNodeInput<T>) => FlowNode<T>;
  addEdge: (input: NewFlowEdgeInput) => FlowEdge;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  updateNodeData: <T extends FlowNodeType>(nodeId: string, data: Partial<FlowNodeData<T>>) => void;
  applyNodeChanges: (changes: NodeChange[]) => void;
  applyEdgeChanges: (changes: EdgeChange[]) => void;
}

export const initialState: Pick<DualFlowState, 'daw' | 'theory' | 'activeView' | 'hierarchy' | 'selectedNodeId' | 'version'> = {
  daw: {
    nodes: initialDAWNodes,
    edges: initialDAWEdges,
  },
  theory: {
    nodes: initialTheoryNodes,
    edges: initialTheoryEdges,
  },
  activeView: 'daw',
  hierarchy: buildHierarchy(initialDAWNodes),
  selectedNodeId: undefined,
  version: 0,
};

export const useFlowStore = create<DualFlowState>((set, get) => ({
  ...initialState,
  clear: () => set(initialState),
  setActiveView: (view) => set({ activeView: view }),
  setDAWNodes: (nodes) => set((state) => ({ ...state, daw: { ...state.daw, nodes } })),
  setDAWEdges: (edges) => set((state) => ({ ...state, daw: { ...state.daw, edges } })),
  setTheoryNodes: (nodes) => set((state) => ({ ...state, theory: { ...state.theory, nodes } })),
  setTheoryEdges: (edges) => set((state) => ({ ...state, theory: { ...state.theory, edges } })),
  selectNode: (nodeId?: string) => set({ selectedNodeId: nodeId }),

  addNode: <T extends FlowNodeType>(input: NewFlowNodeInput<T>) => {
    const view = get().activeView;
    const id = input.id ?? generateId('node');
    const node: FlowNode<T> = {
      id,
      type: input.type,
      position: input.position ?? { x: 0, y: 0 },
      data: {
        ...input.data,
        order: input.data.order ?? determineNextOrder(get()[view].nodes, input.data.parentId),
        path: input.data.path ?? [id],
        label: input.data.label ?? deriveLabel(input.type as FlowNodeType),
      },
    };

    set(state => {
      const nodes = [...state[view].nodes, node];
      return {
        ...state,
        [view]: { ...state[view], nodes },
        ...(view === 'daw' && { hierarchy: buildHierarchy(nodes) }),
      };
    });

    return node;
  },

  addEdge: (input: NewFlowEdgeInput) => {
    const view = get().activeView;
    const edge = createEdge(input.source, input.target, input.data?.type as FlowEdgeType || 'signal', input.id);

    set(state => {
      const edges = [...state[view].edges, edge];
      return {
        ...state,
        [view]: { ...state[view], edges },
      };
    });

    return edge;
  },

  removeNode: (nodeId: string) => {
    set(state => {
      const view = state.activeView;
      const nodes = state[view].nodes.filter(n => n.id !== nodeId);
      return {
        ...state,
        [view]: { ...state[view], nodes },
        ...(view === 'daw' && { hierarchy: buildHierarchy(nodes) }),
      };
    });
  },

  removeEdge: (edgeId: string) => {
    set(state => {
      const view = state.activeView;
      const edges = state[view].edges.filter(e => e.id !== edgeId);
      return {
        ...state,
        [view]: { ...state[view], edges },
      };
    });
  },

  updateNodeData: <T extends FlowNodeType>(nodeId: string, data: Partial<FlowNodeData<T>>) => {
    set(state => {
      const view = state.activeView;
      const nodes = state[view].nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      );
      return {
        ...state,
        [view]: { ...state[view], nodes },
        ...(view === 'daw' && { hierarchy: buildHierarchy(nodes) }),
      };
    });
  },

  applyNodeChanges: (changes: NodeChange[]) => {
    const view = get().activeView;
    const currentNodes = get()[view].nodes;
    const updated = applyNodeChanges(changes, currentNodes as RFNode[]);

    set((state) => ({
      ...state,
      [view]: { ...state[view], nodes: updated as FlowNode[] },
      ...(view === 'daw' && { hierarchy: buildHierarchy(updated as FlowNode[]) }),
    }));
  },

  applyEdgeChanges: (changes: EdgeChange[]) => {
    const view = get().activeView;
    const currentEdges = get()[view].edges;
    const updated = applyEdgeChanges(changes, currentEdges as RFEdge[]);

    set((state) => ({
      ...state,
      [view]: { ...state[view], edges: updated as FlowEdge[] },
    }));
  },
}));

//================================================================================================
// Utility Functions
//================================================================================================

function createInitialGraph(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const songId = generateId('song');
  const drumsId = generateId('track');
  const bassId = generateId('track');
  const verseId = generateId('section');
  const chorusId = generateId('section');
  const drumClipId = generateId('clip');
  const bassClipId = generateId('clip');

  const song: FlowNode<'song'> = {
    id: songId,
    type: 'song',
    position: { x: 0, y: 0 },
    data: {
      type: 'song',
      label: 'New Song',
      order: 0,
      path: [songId],
      tempo: 120,
      key: 'C Major',
      timeSignature: '4/4',
      lengthBars: 128,
    },
  };

  const verse: FlowNode<'section'> = {
    id: verseId,
    type: 'section',
    position: { x: -200, y: 200 },
    data: {
      type: 'section',
      label: 'Verse 1',
      parentId: songId,
      order: 0,
      path: [songId, verseId],
      sectionType: 'verse',
      startBar: 1,
      lengthBars: 16,
    },
  };

  const chorus: FlowNode<'section'> = {
    id: chorusId,
    type: 'section',
    position: { x: 200, y: 200 },
    data: {
      type: 'section',
      label: 'Chorus',
      parentId: songId,
      order: 1,
      path: [songId, chorusId],
      sectionType: 'chorus',
      startBar: 17,
      lengthBars: 16,
    },
  };

  const drums: FlowNode<'track'> = {
    id: drumsId,
    type: 'track',
    position: { x: -100, y: 400 },
    data: {
      type: 'track',
      label: 'Drums',
      parentId: songId,
      order: 0,
      path: [songId, drumsId],
      trackType: 'audio',
      color: '#F97316',
    },
  };

  const bass: FlowNode<'track'> = {
    id: bassId,
    type: 'track',
    position: { x: 100, y: 400 },
    data: {
      type: 'track',
      label: 'Bass',
      parentId: songId,
      order: 1,
      path: [songId, bassId],
      trackType: 'instrument',
      instrument: 'Analog Bass',
      color: '#22D3EE',
    },
  };

  const drumClip: FlowNode<'clip'> = {
    id: drumClipId,
    type: 'clip',
    position: { x: -100, y: 600 },
    data: {
      type: 'clip',
      label: 'Verse Beat',
      parentId: drumsId,
      order: 0,
      path: [songId, drumsId, drumClipId],
      sourceType: 'audio',
      startBeat: 1,
      lengthBeats: 16,
    },
  };

  const bassClip: FlowNode<'clip'> = {
    id: bassClipId,
    type: 'clip',
    position: { x: 100, y: 600 },
    data: {
      type: 'clip',
      label: 'Chorus Groove',
      parentId: bassId,
      order: 0,
      path: [songId, bassId, bassClipId],
      sourceType: 'midi',
      startBeat: 17,
      lengthBeats: 16,
    },
  };

  const edges: FlowEdge[] = [
    createEdge(verseId, drumsId, 'arrangement'),
    createEdge(verseId, bassId, 'arrangement'),
    createEdge(drumsId, drumClipId, 'arrangement'),
    createEdge(bassId, bassClipId, 'arrangement'),
    createEdge(drumsId, bassId, 'signal'),
  ];

  return {
    nodes: [song, verse, chorus, drums, bass, drumClip, bassClip],
    edges,
  };
}

function createEdge(source: string, target: string, type: FlowEdgeType, id?: string): FlowEdge {
  return {
    id: id ?? generateId('edge'),
    source,
    target,
    type: 'smoothstep',
    data: {
      type,
      contextPath: [],
    },
  };
}

function determineNextOrder(nodes: FlowNode[], parentId?: string): number {
  const siblings = nodes.filter(node => node.data.parentId === parentId);
  return siblings.length;
}

function buildHierarchy(nodes: FlowNode[]): FlowHierarchy {
  const map = new Map<string, FlowHierarchyNode>();
  const roots: FlowHierarchyNode[] = [];

  nodes.forEach(node => {
    map.set(node.id, { node, children: [] });
  });

  nodes.forEach(node => {
    const current = map.get(node.id)!;
    if (node.data.parentId) {
      const parent = map.get(node.data.parentId);
      if (parent) {
        parent.children.push(current);
      } else {
        roots.push(current);
      }
    } else {
      roots.push(current);
    }
  });

  const sortBranch = (branch: FlowHierarchyNode[]) => {
    branch.sort((a, b) => (a.node.data.order ?? 0) - (b.node.data.order ?? 0));
    branch.forEach(node => sortBranch(node.children));
  };

  sortBranch(roots);
  return roots;
}

function buildSnapshot(version: number, nodes: FlowNode[], edges: FlowEdge[]): FlowSnapshot {
  return {
    version,
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    hierarchy: buildHierarchy(nodes),
  };
}

function deriveLabel(type: FlowNodeType): string {
  switch (type) {
    case 'section':
      return 'Section';
    case 'track':
      return 'Track';
    case 'clip':
      return 'Clip';
    case 'bus':
      return 'Bus';
    case 'effect':
      return 'Effect';
    case 'analyzer':
      return 'Analyzer';
    case 'automation':
      return 'Automation';
    case 'song':
    default:
      return 'Untitled';
  }
}

function generateId(prefix: string): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}