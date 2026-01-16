import { NextRequest, NextResponse } from 'next/server';
import { SuggestionRequestSchema } from '../feedback/route';

// Mock AI suggestion engine (in production, this would integrate with real ML models)
class AISuggestionEngine {
  async generateSuggestions(context: any, type?: string) {
    const suggestions = [];

    // Generate node suggestions based on context
    if (!type || type === 'node-suggestion') {
      const nodeSuggestions = await this.generateNodeSuggestions(context);
      suggestions.push(...nodeSuggestions);
    }

    // Generate connection suggestions
    if (!type || type === 'connection-recommendation') {
      const connectionSuggestions = await this.generateConnectionSuggestions(context);
      suggestions.push(...connectionSuggestions);
    }

    // Generate flow optimizations
    if (!type || type === 'flow-optimization') {
      const optimizations = await this.generateFlowOptimizations(context);
      suggestions.push(...optimizations);
    }

    // Generate parameter suggestions
    if (!type || type === 'parameter-suggestion') {
      const paramSuggestions = await this.generateParameterSuggestions(context);
      suggestions.push(...paramSuggestions);
    }

    // Generate workflow improvements
    if (!type || type === 'workflow-improvement') {
      const workflowImprovements = await this.generateWorkflowImprovements(context);
      suggestions.push(...workflowImprovements);
    }

    return suggestions;
  }

  private async generateNodeSuggestions(context: any) {
    const { nodes, activeView, selectedNodeId } = context;
    const suggestions = [];

    // Suggest adding tracks for songs without them
    const songNodes = nodes.filter((n: any) => n.type === 'song');
    const trackNodes = nodes.filter((n: any) => n.type === 'track');

    for (const song of songNodes) {
      const songTracks = trackNodes.filter((t: any) => t.data.parentId === song.id);
      if (songTracks.length < 4) {
        suggestions.push({
          id: `node-suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'node-suggestion',
          timestamp: Date.now(),
          payload: {
            confidence: 0.8,
            reasoning: `Song "${song.data.label}" has only ${songTracks.length} tracks. Adding more tracks can improve arrangement complexity.`,
            suggestion: {
              nodeType: 'track',
              position: {
                x: song.position.x + (songTracks.length * 150),
                y: song.position.y + 200
              },
              data: {
                parentId: song.id,
                label: `AI: Track ${songTracks.length + 1}`,
                trackType: songTracks.length === 0 ? 'audio' : 'instrument',
                color: '#' + Math.floor(Math.random()*16777215).toString(16)
              },
              reason: 'Expand song arrangement'
            }
          }
        });
      }
    }

    // Suggest sections for songs
    for (const song of songNodes) {
      const sectionNodes = nodes.filter((n: any) => n.type === 'section' && n.data.parentId === song.id);
      if (sectionNodes.length < 3) {
        const sectionTypes = ['verse', 'chorus', 'bridge', 'outro'];
        const existingTypes = sectionNodes.map((s: any) => s.data.sectionType);
        const missingTypes = sectionTypes.filter(type => !existingTypes.includes(type));

        if (missingTypes.length > 0) {
          const suggestedType = missingTypes[0];
          suggestions.push({
            id: `node-suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'node-suggestion',
            timestamp: Date.now(),
            payload: {
              confidence: 0.7,
              reasoning: `Song "${song.data.label}" is missing a ${suggestedType} section. Adding varied sections improves song structure.`,
              suggestion: {
                nodeType: 'section',
                position: {
                  x: song.position.x + (sectionNodes.length * 180) - 150,
                  y: song.position.y + 150
                },
                data: {
                  parentId: song.id,
                  label: `AI: ${suggestedType.charAt(0).toUpperCase() + suggestedType.slice(1)}`,
                  sectionType: suggestedType,
                  startBar: sectionNodes.length * 16 + 1,
                  lengthBars: 16
                },
                reason: 'Add song section for better structure'
              }
            }
          });
        }
      }
    }

    // Suggest theory nodes for theory view
    if (activeView === 'theory') {
      const existingTheoryNodes = nodes.filter((n: any) =>
        ['theory_concept', 'chord', 'scale'].includes(n.type)
      );

      if (existingTheoryNodes.length === 0) {
        suggestions.push({
          id: `node-suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'node-suggestion',
          timestamp: Date.now(),
          payload: {
            confidence: 0.9,
            reasoning: 'Theory view is empty. Start with a basic scale to establish harmonic foundation.',
            suggestion: {
              nodeType: 'scale',
              position: { x: 0, y: 0 },
              data: {
                label: 'AI: C Major Scale',
                scaleName: 'C Major',
                notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B']
              },
              reason: 'Start with fundamental scale'
            }
          }
        });
      }
    }

    return suggestions;
  }

  private async generateConnectionSuggestions(context: any) {
    const { nodes, edges } = context;
    const suggestions = [];

    // Find tracks without clips
    const trackNodes = nodes.filter((n: any) => n.type === 'track');
    const clipNodes = nodes.filter((n: any) => n.type === 'clip');

    for (const track of trackNodes) {
      const trackClips = clipNodes.filter((c: any) => c.data.parentId === track.id);
      const hasClipConnection = edges.some((e: any) =>
        e.source === track.id && clipNodes.some((c: any) => c.id === e.target)
      );

      if (trackClips.length === 0 && !hasClipConnection) {
        suggestions.push({
          id: `connection-suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'connection-recommendation',
          timestamp: Date.now(),
          payload: {
            confidence: 0.6,
            reasoning: `Track "${track.data.label}" has no clips. Consider adding audio or MIDI clips for content.`,
            suggestion: {
              sourceId: track.id,
              targetId: track.id, // This would be resolved when clip is created
              connectionType: 'arrangement',
              reason: 'Add clips to track'
            }
          }
        });
      }
    }

    // Suggest signal routing between tracks
    const audioTracks = trackNodes.filter((t: any) => t.data.trackType === 'audio');
    const instrumentTracks = trackNodes.filter((t: any) => t.data.trackType === 'instrument');

    if (audioTracks.length > 1) {
      for (let i = 0; i < audioTracks.length - 1; i++) {
        const sourceTrack = audioTracks[i];
        const targetTrack = audioTracks[i + 1];

        const existingConnection = edges.some((e: any) =>
          e.source === sourceTrack.id && e.target === targetTrack.id
        );

        if (!existingConnection) {
          suggestions.push({
            id: `connection-suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'connection-recommendation',
            timestamp: Date.now(),
            payload: {
              confidence: 0.4,
              reasoning: `Consider routing signal from "${sourceTrack.data.label}" to "${targetTrack.data.label}" for processing chain.`,
              suggestion: {
                sourceId: sourceTrack.id,
                targetId: targetTrack.id,
                connectionType: 'signal',
                reason: 'Create signal processing chain'
              }
            }
          });
        }
      }
    }

    return suggestions;
  }

  private async generateFlowOptimizations(context: any) {
    const { nodes, edges } = context;
    const suggestions = [];

    // Check for node overlap
    const nodePositions = nodes.map((n: any) => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y
    }));

    const hasOverlaps = nodePositions.some((pos1: any, i: number) =>
      nodePositions.some((pos2: any, j: number) =>
        i !== j &&
        Math.abs(pos1.x - pos2.x) < 200 &&
        Math.abs(pos1.y - pos2.y) < 100
      )
    );

    if (hasOverlaps) {
      const optimizedPositions: Record<string, any> = {};

      // Simple grid layout optimization
      const nodesByType = nodes.reduce((acc: any, node: any) => {
        if (!acc[node.type]) acc[node.type] = [];
        acc[node.type].push(node);
        return acc;
      }, {});

      let yOffset = 0;
      Object.entries(nodesByType).forEach(([type, typeNodes]: [string, any]) => {
        (typeNodes as any[]).forEach((node: any, index: number) => {
          optimizedPositions[node.id] = {
            x: index * 200,
            y: yOffset
          };
        });
        yOffset += 150;
      });

      suggestions.push({
        id: `flow-optimization-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'flow-optimization',
        timestamp: Date.now(),
        payload: {
          confidence: 0.9,
          reasoning: 'Nodes are overlapping and could be better organized for clarity.',
          suggestion: {
            type: 'layout',
            changes: {
              nodePositions: optimizedPositions
            },
            reason: 'Organize nodes in grid layout by type'
          }
        }
      });
    }

    // Check for orphaned nodes
    const connectedNodeIds = new Set();
    edges.forEach((edge: any) => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    const orphanedNodes = nodes.filter((n: any) => !connectedNodeIds.has(n.id) && n.type !== 'song');

    if (orphanedNodes.length > 0) {
      suggestions.push({
        id: `flow-optimization-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'flow-optimization',
        timestamp: Date.now(),
        payload: {
          confidence: 0.7,
          reasoning: `${orphanedNodes.length} nodes are not connected to the flow. Consider connecting them or removing if unnecessary.`,
          suggestion: {
            type: 'organization',
            changes: {
              nodeRemovals: orphanedNodes.map((n: any) => n.id)
            },
            reason: 'Remove orphaned nodes'
          }
        }
      });
    }

    return suggestions;
  }

  private async generateParameterSuggestions(context: any) {
    const { nodes, selectedNodeId } = context;
    const suggestions = [];

    if (!selectedNodeId) return suggestions;

    const selectedNode = nodes.find((n: any) => n.id === selectedNodeId);
    if (!selectedNode) return suggestions;

    // Suggest parameter improvements based on node type
    switch (selectedNode.type) {
      case 'track':
        if (!selectedNode.data.color) {
          suggestions.push({
            id: `parameter-suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'parameter-suggestion',
            timestamp: Date.now(),
            payload: {
              confidence: 0.5,
              reasoning: 'Adding a color to tracks helps with visual organization.',
              suggestion: {
                nodeId: selectedNodeId,
                parameters: {
                  color: '#' + Math.floor(Math.random()*16777215).toString(16)
                },
                reason: 'Add track color for organization'
              }
            }
          });
        }
        break;

      case 'song':
        if (!selectedNode.data.tempo || selectedNode.data.tempo < 80) {
          suggestions.push({
            id: `parameter-suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'parameter-suggestion',
            timestamp: Date.now(),
            payload: {
              confidence: 0.6,
              reasoning: 'Consider setting an appropriate tempo for the song genre.',
              suggestion: {
                nodeId: selectedNodeId,
                parameters: {
                  tempo: 120
                },
                reason: 'Set standard tempo'
              }
            }
          });
        }
        break;
    }

    return suggestions;
  }

  private async generateWorkflowImprovements(context: any) {
    const { nodes, edges, activeView } = context;
    const suggestions = [];

    // Analyze workflow completeness
    const songNodes = nodes.filter((n: any) => n.type === 'song');
    const trackNodes = nodes.filter((n: any) => n.type === 'track');
    const clipNodes = nodes.filter((n: any) => n.type === 'clip');

    if (songNodes.length > 0 && trackNodes.length > 0 && clipNodes.length === 0) {
      suggestions.push({
        id: `workflow-improvement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'workflow-improvement',
        timestamp: Date.now(),
        payload: {
          confidence: 0.8,
          reasoning: 'Your workflow has songs and tracks but no audio content. Adding clips will make the workflow functional.',
          suggestion: {
            suggestions: [{
              type: 'add_nodes',
              description: 'Add audio/MIDI clips to tracks',
              impact: 'high',
              changes: { clipTypes: ['audio', 'midi'] }
            }],
            reasoning: 'Complete the signal chain with actual content'
          }
        }
      });
    }

    // Suggest arrangement improvements
    if (trackNodes.length > 0 && edges.length === 0) {
      suggestions.push({
        id: `workflow-improvement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'workflow-improvement',
        timestamp: Date.now(),
        payload: {
          confidence: 0.7,
          reasoning: 'Tracks exist but no connections are defined. Creating relationships will improve workflow understanding.',
          suggestion: {
            suggestions: [{
              type: 'optimize_connections',
              description: 'Define track routing and relationships',
              impact: 'medium',
              changes: { connectionTypes: ['signal', 'arrangement'] }
            }],
            reasoning: 'Establish clear signal flow'
          }
        }
      });
    }

    return suggestions;
  }
}

const suggestionEngine = new AISuggestionEngine();

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const validatedData = SuggestionRequestSchema.safeParse(body);

    if (!validatedData.success) {
      console.warn('AGUI Suggestion Request Validation Failed:', validatedData.error);
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: validatedData.error.errors.map(e => e.message).join(', ')
      }, { status: 400 });
    }

    const { context, type } = validatedData.data;

    // Generate AI suggestions
    const suggestions = await suggestionEngine.generateSuggestions(context, type);

    console.log('AGUI Suggestions Generated:', {
      count: suggestions.length,
      type,
      activeView: context.activeView,
      nodeCount: context.nodes.length
    });

    const duration = Date.now() - startTime;
    console.log(`API POST /api/agui/suggest took ${duration}ms`);

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length,
      duration,
      context: {
        activeView: context.activeView,
        nodeCount: context.nodes.length,
        edgeCount: context.edges.length
      }
    });

  } catch (error: any) {
    console.error('Error generating AGUI suggestions:', error);
    const duration = Date.now() - startTime;
    console.log(`API POST /api/agui/suggest failed after ${duration}ms`);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}