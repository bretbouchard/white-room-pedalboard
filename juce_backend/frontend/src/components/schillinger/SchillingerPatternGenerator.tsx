/**
 * Schillinger Pattern Generator Component
 *
 * A React component that provides UI for generating musical patterns
 * using the Schillinger SDK.
 */

import React, { useState, useCallback } from 'react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { usePatternGeneration } from '@/hooks/useSchillingerSDK';
import { Loader2, Music, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PatternGeneratorProps {
  onPatternGenerated?: (pattern: any) => void;
  className?: string;
}

export function SchillingerPatternGenerator({
  onPatternGenerated,
  className
}: PatternGeneratorProps) {
  const [parameters, setParameters] = useState({
    key: 'C',
    scale: 'MAJOR',
    timeSignature: [4, 4] as [number, number],
    tempo: 120,
    length: 4,
    complexity: 5,
  });

  const {
    generatePattern,
    isGenerating,
    lastResult,
    error,
    isInitialized,
  } = usePatternGeneration();

  const handleGenerate = useCallback(async () => {
    try {
      const result = await generatePattern(parameters);

      if (result.success && result.data) {
        toast.success('Pattern generated successfully!');
        onPatternGenerated?.(result.data);
      } else {
        toast.error('Failed to generate pattern');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Pattern generation failed');
    }
  }, [generatePattern, parameters, onPatternGenerated]);

  const handleRandomize = useCallback(() => {
    const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const scales = ['MAJOR', 'MINOR', 'HARMONIC_MINOR', 'MELODIC_MINOR', 'PENTATONIC_MAJOR'];
    const timeSignatures = [[3, 4], [4, 4], [6, 8], [2, 4]] as [number, number][];

    setParameters({
      key: keys[Math.floor(Math.random() * keys.length)],
      scale: scales[Math.floor(Math.random() * scales.length)],
      timeSignature: timeSignatures[Math.floor(Math.random() * timeSignatures.length)],
      tempo: Math.floor(Math.random() * 60) + 60, // 60-120 BPM
      length: Math.floor(Math.random() * 8) + 1, // 1-8 bars
      complexity: Math.floor(Math.random() * 10) + 1, // 1-10
    });
  }, []);

  if (!isInitialized) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Pattern Generator
          </CardTitle>
          <CardDescription>
            Initializing Schillinger SDK...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Pattern Generator
        </CardTitle>
        <CardDescription>
          Generate musical patterns using AI-powered composition
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
            <p className="text-sm font-medium">Error: {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="key">Key</Label>
            <Select value={parameters.key} onValueChange={(value) =>
              setParameters(prev => ({ ...prev, key: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['C', 'D', 'E', 'F', 'G', 'A', 'B'].map(key => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scale">Scale</Label>
            <Select value={parameters.scale} onValueChange={(value) =>
              setParameters(prev => ({ ...prev, scale: value }))
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAJOR">Major</SelectItem>
                <SelectItem value="MINOR">Minor</SelectItem>
                <SelectItem value="HARMONIC_MINOR">Harmonic Minor</SelectItem>
                <SelectItem value="MELODIC_MINOR">Melodic Minor</SelectItem>
                <SelectItem value="PENTATONIC_MAJOR">Pentatonic Major</SelectItem>
                <SelectItem value="BLUES">Blues</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeSignature">Time Signature</Label>
            <Select
              value={`${parameters.timeSignature[0]}/${parameters.timeSignature[1]}`}
              onValueChange={(value) => {
                const [num, den] = value.split('/').map(Number);
                setParameters(prev => ({ ...prev, timeSignature: [num, den] as [number, number] }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3/4">3/4</SelectItem>
                <SelectItem value="4/4">4/4</SelectItem>
                <SelectItem value="6/8">6/8</SelectItem>
                <SelectItem value="2/4">2/4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tempo">Tempo: {parameters.tempo} BPM</Label>
            <Slider
              value={parameters.tempo}
              onChange={(value) => setParameters(prev => ({ ...prev, tempo: value }))}
              min={60}
              max={180}
              step={5}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="length">Length: {parameters.length} bars</Label>
            <Slider
              value={parameters.length}
              onChange={(value) => setParameters(prev => ({ ...prev, length: value }))}
              min={1}
              max={16}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complexity">Complexity: {parameters.complexity}</Label>
            <Slider
              value={parameters.complexity}
              onChange={(value) => setParameters(prev => ({ ...prev, complexity: value }))}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Generate Pattern
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            onClick={handleRandomize}
            disabled={isGenerating}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {lastResult?.success && lastResult.data && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Generated Pattern</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>ID:</strong> {lastResult.data.content?.id}</p>
              <p><strong>DAID:</strong> {lastResult.data.content?.daid}</p>
              <p><strong>Type:</strong> {lastResult.data.content?.type}</p>
              {lastResult.data.content?.patterns && (
                <p><strong>Patterns:</strong> {lastResult.data.content.patterns.length} generated</p>
              )}
              {lastResult.data.metadata?.confidence && (
                <p><strong>Confidence:</strong> {Math.round(lastResult.data.metadata.confidence * 100)}%</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}