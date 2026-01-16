import { NextRequest, NextResponse } from 'next/server';

interface DAWSuggestion {
  id: string;
  title: string;
  description: string;
  actionType: 'tool_call' | 'readable_update';
  actionPayload: any;
  confidence: number; // 0-1
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const dawState = await req.json();

    console.log('Received DAW state for suggestions:', dawState);

    // Simulate a suggestion ranking algorithm
    const suggestions: DAWSuggestion[] = [];

    if (dawState.isPlaying) {
      suggestions.push({
        id: 'sugg-1',
        title: 'Adjust Master Volume',
        description: 'The master volume seems a bit low during playback.',
        actionType: 'tool_call',
        actionPayload: { name: 'setMasterVolume', parameters: { volume: 0.8 } },
        confidence: 0.7,
      });
    } else if (dawState.selectedTrack === 'Bass') {
      suggestions.push({
        id: 'sugg-2',
        title: 'Add Compressor to Bass',
        description: 'The bass track could benefit from some compression.',
        actionType: 'tool_call',
        actionPayload: { name: 'addEffectToTrack', parameters: { track: 'Bass', effect: 'Compressor' } },
        confidence: 0.9,
      });
    }

    // Sort suggestions by confidence (highest first)
    suggestions.sort((a, b) => b.confidence - a.confidence);

    const duration = Date.now() - startTime;
    console.log(`API POST /api/suggestions took ${duration}ms`);
    return NextResponse.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('Error generating suggestions:', error);
    const duration = Date.now() - startTime;
    console.log(`API POST /api/suggestions failed after ${duration}ms`);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
