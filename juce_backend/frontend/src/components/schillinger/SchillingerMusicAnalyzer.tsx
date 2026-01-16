/**
 * Schillinger Music Analyzer Component
 *
 * A React component that provides UI for analyzing musical content
 * using the Schillinger SDK.
 */

import React, { useState, useCallback, useRef } from 'react';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useSchillingerAnalysis } from '@/hooks/useSchillingerSDK';
import { Loader2, Search, Upload, FileAudio, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface MusicAnalyzerProps {
  onAnalysisComplete?: (analysis: any) => void;
  className?: string;
}

export function SchillingerMusicAnalyzer({
  onAnalysisComplete,
  className
}: MusicAnalyzerProps) {
  const [analysisType, setAnalysisType] = useState<string>('comprehensive');
  const [inputContent, setInputContent] = useState('');
  const [analysisDepth, setAnalysisDepth] = useState<string>('comprehensive');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    analyze,
    isAnalyzing,
    lastResult,
    error,
    isInitialized,
  } = useSchillingerAnalysis();

  const handleAnalyze = useCallback(async () => {
    if (!inputContent.trim()) {
      toast.error('Please provide some musical content to analyze');
      return;
    }

    try {
      const request = {
        type: analysisType as any,
        input: {
          content: {
            // Parse simple note format or treat as raw content
            notes: parseNoteInput(inputContent),
          },
        },
        options: {
          depth: analysisDepth,
          include: {
            harmonicAnalysis: true,
            melodicAnalysis: true,
            rhythmicAnalysis: true,
            structuralAnalysis: true,
            styleAnalysis: true,
            emotionAnalysis: true,
          },
        },
      };

      const result = await analyze(request);

      if (result.success && result.data) {
        toast.success('Analysis completed successfully!');
        onAnalysisComplete?.(result.data);
      } else {
        toast.error('Failed to analyze content');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Music analysis failed');
    }
  }, [analyze, analysisType, inputContent, analysisDepth, onAnalysisComplete]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // For now, just read the file content
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setInputContent(content);
        toast.success(`Loaded file: ${file.name}`);
      };
      reader.readAsText(file);
    }
  }, []);

  const parseNoteInput = (input: string): any[] => {
    // Simple parser for note input like "C4, D4, E4, F4, G4"
    try {
      const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const notes = input.split(',').map((note, index) => {
        const trimmed = note.trim();
        if (trimmed.length >= 2) {
          const noteName = trimmed[0];
          const octave = parseInt(trimmed[1]) || 4;
          const noteIndex = noteNames.indexOf(noteName.toUpperCase());
          if (noteIndex !== -1) {
            return {
              pitch: 60 + noteIndex + ((octave - 4) * 12), // MIDI note number
              startTime: index * 1, // 1 beat apart
              duration: 1,
              velocity: 80,
            };
          }
        }
        return null;
      }).filter(Boolean);

      return notes.length > 0 ? notes : [{
        pitch: 60,
        startTime: 0,
        duration: 1,
        velocity: 80,
      }];
    } catch {
      return [{
        pitch: 60,
        startTime: 0,
        duration: 1,
        velocity: 80,
      }];
    }
  };

  const loadExample = useCallback(() => {
    const exampleContent = "C4, D4, E4, F4, G4, A4, B4, C5";
    setInputContent(exampleContent);
    toast.info('Loaded example C major scale');
  }, []);

  if (!isInitialized) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Music Analyzer
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
          <BarChart3 className="h-5 w-5" />
          Music Analyzer
        </CardTitle>
        <CardDescription>
          Analyze musical content using AI-powered music theory
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
            <Label htmlFor="analysisType">Analysis Type</Label>
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
                <SelectItem value="harmony">Harmony</SelectItem>
                <SelectItem value="melody">Melody</SelectItem>
                <SelectItem value="rhythm">Rhythm</SelectItem>
                <SelectItem value="structure">Structure</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
                <SelectItem value="style">Style</SelectItem>
                <SelectItem value="emotion">Emotion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="depth">Analysis Depth</Label>
            <Select value={analysisDepth} onValueChange={setAnalysisDepth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="surface">Surface</SelectItem>
                <SelectItem value="structural">Structural</SelectItem>
                <SelectItem value="deep">Deep</SelectItem>
                <SelectItem value="comprehensive">Comprehensive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Musical Content</Label>
          <Textarea
            id="content"
            placeholder="Enter notes (e.g., C4, D4, E4, F4, G4) or paste musical data..."
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            rows={4}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            Enter notes as comma-separated values (e.g., C4, D4, E4, F4, G4)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputContent.trim()}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Music
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
          >
            <Upload className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            onClick={loadExample}
            disabled={isAnalyzing}
          >
            Example
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.mid,.json,.musicxml"
          onChange={handleFileUpload}
          className="hidden"
        />

        {lastResult?.success && lastResult.data && (
          <div className="mt-6 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-3">Analysis Results</h4>

              {lastResult.data.data?.analysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {lastResult.data.data.analysis.harmony && (
                    <div>
                      <strong>Harmony:</strong>
                      <ul className="mt-1 space-y-1 text-blue-700">
                        <li>• Key: {lastResult.data.data.analysis.harmony.keySignature?.key || 'Detected'}</li>
                        <li>• Complexity: {lastResult.data.data.analysis.harmony.harmonicComplexity || 'N/A'}</li>
                      </ul>
                    </div>
                  )}

                  {lastResult.data.data.analysis.melody && (
                    <div>
                      <strong>Melody:</strong>
                      <ul className="mt-1 space-y-1 text-blue-700">
                        <li>• Range: {lastResult.data.data.analysis.melody.range?.span || 'N/A'} semitones</li>
                        <li>• Complexity: {lastResult.data.data.analysis.melody.melodicComplexity || 'N/A'}</li>
                      </ul>
                    </div>
                  )}

                  {lastResult.data.data.analysis.rhythm && (
                    <div>
                      <strong>Rhythm:</strong>
                      <ul className="mt-1 space-y-1 text-blue-700">
                        <li>• Time Signature: {lastResult.data.data.analysis.rhythm.meter?.timeSignature?.numerator || 'N/A'}/{lastResult.data.data.analysis.rhythm.meter?.timeSignature?.denominator || 'N/A'}</li>
                        <li>• Complexity: {lastResult.data.data.analysis.rhythm.rhythmicComplexity || 'N/A'}</li>
                      </ul>
                    </div>
                  )}

                  {lastResult.data.data.analysis.emotion && (
                    <div>
                      <strong>Emotion:</strong>
                      <ul className="mt-1 space-y-1 text-blue-700">
                        <li>• Valence: {lastResult.data.data.analysis.emotion.primary?.valence || 'N/A'}</li>
                        <li>• Arousal: {lastResult.data.data.analysis.emotion.primary?.arousal || 'N/A'}</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600">
                  <strong>DAID:</strong> {lastResult.data.metadata?.daid || 'Generated'}
                  {lastResult.data.metadata?.processingTime && (
                    <span className="ml-4">
                      <strong>Processing Time:</strong> {lastResult.data.metadata.processingTime}ms
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}