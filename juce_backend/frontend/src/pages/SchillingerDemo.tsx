/**
 * Schillinger SDK Demo Page
 *
 * A comprehensive demo page showing how to use the Schillinger SDK
 * for musical generation and analysis.
 */

import React, { useState } from 'react';
import { SchillingerProvider, SchillingerPatternGenerator, SchillingerMusicAnalyzer } from '@/components/schillinger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSchillinger } from '@/components/schillinger';
import { Music, BarChart3, Settings, Activity, CheckCircle, AlertCircle } from 'lucide-react';

export default function SchillingerDemo() {
  const [generatedPattern, setGeneratedPattern] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const { isInitialized, isInitializing, error, healthStatus, capabilities, service } = useSchillinger();

  const handlePatternGenerated = (pattern: any) => {
    setGeneratedPattern(pattern);
  };

  const handleAnalysisComplete = (analysis: any) => {
    setAnalysisResult(analysis);
  };

  const clearResults = () => {
    setGeneratedPattern(null);
    setAnalysisResult(null);
  };

  return (
    <SchillingerProvider>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Schillinger SDK Demo</h1>
          <p className="text-muted-foreground">
            Explore AI-powered musical generation and analysis capabilities
          </p>
        </div>

        {/* Status Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {isInitialized ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                SDK Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Initialized:</span>
                  <Badge variant={isInitialized ? "default" : "secondary"}>
                    {isInitialized ? "Ready" : isInitializing ? "Loading..." : "Not Started"}
                  </Badge>
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Health Check
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {healthStatus ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={healthStatus.data?.status === 'healthy' ? "success" : "danger"}>
                        {healthStatus.data?.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Uptime: {Math.floor(healthStatus.data?.uptime || 0)}s
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Checking health...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {capabilities ? (
                  <div className="text-sm text-muted-foreground">
                    <div>• Generation: {capabilities.data?.generation?.patternTypes?.length || 0} types</div>
                    <div>• Analysis: {capabilities.data?.analysis?.analysisTypes?.length || 0} types</div>
                    <div>• Caching: {service ? 'Enabled' : 'Disabled'}</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Loading capabilities...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="generation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generation" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Generation
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generation" className="mt-6">
            <SchillingerPatternGenerator
              onPatternGenerated={handlePatternGenerated}
            />
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            <SchillingerMusicAnalyzer
              onAnalysisComplete={handleAnalysisComplete}
            />
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {generatedPattern && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      Generated Pattern
                    </CardTitle>
                    <CardDescription>
                      Latest pattern generation result
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">ID:</span>
                          <p className="text-muted-foreground font-mono text-xs">
                            {generatedPattern.content?.id}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">Type:</span>
                          <p className="text-muted-foreground">{generatedPattern.content?.type}</p>
                        </div>
                      </div>

                      <div>
                        <span className="font-medium">DAID:</span>
                        <p className="text-muted-foreground font-mono text-xs break-all">
                          {generatedPattern.content?.daid}
                        </p>
                      </div>

                      {generatedPattern.metadata && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Confidence:</span>
                            <p className="text-muted-foreground">
                              {Math.round((generatedPattern.metadata.confidence || 0) * 100)}%
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Algorithm:</span>
                            <p className="text-muted-foreground">
                              {generatedPattern.metadata.algorithm}
                            </p>
                          </div>
                        </div>
                      )}

                      {generatedPattern.content?.patterns && (
                        <div>
                          <span className="font-medium">Generated:</span>
                          <p className="text-muted-foreground">
                            {generatedPattern.content.patterns.length} patterns
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysisResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Analysis Result
                    </CardTitle>
                    <CardDescription>
                      Latest music analysis result
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.data?.analysis && (
                        <div className="space-y-3">
                          {analysisResult.data.analysis.harmony && (
                            <div>
                              <h4 className="font-medium text-sm">Harmony</h4>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>• Key: {analysisResult.data.analysis.harmony.keySignature?.key || 'Detected'}</div>
                                <div>• Complexity: {analysisResult.data.analysis.harmony.harmonicComplexity || 'N/A'}</div>
                              </div>
                            </div>
                          )}

                          {analysisResult.data.analysis.melody && (
                            <div>
                              <h4 className="font-medium text-sm">Melody</h4>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>• Range: {analysisResult.data.analysis.melody.range?.span || 'N/A'} semitones</div>
                                <div>• Complexity: {analysisResult.data.analysis.melody.melodicComplexity || 'N/A'}</div>
                              </div>
                            </div>
                          )}

                          {analysisResult.data.analysis.emotion && (
                            <div>
                              <h4 className="font-medium text-sm">Emotion</h4>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>• Valence: {analysisResult.data.analysis.emotion.primary?.valence || 'N/A'}</div>
                                <div>• Arousal: {analysisResult.data.analysis.emotion.primary?.arousal || 'N/A'}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {analysisResult.metadata && (
                        <div className="pt-3 border-t">
                          <div className="text-xs text-muted-foreground">
                            <div>• DAID: {analysisResult.metadata.daid}</div>
                            <div>• Processing Time: {analysisResult.metadata.processingTime}ms</div>
                            <div>• Algorithm: {analysisResult.metadata.algorithm}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!generatedPattern && !analysisResult && (
                <Card className="col-span-2">
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Generate some music or analyze content to see results here.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button variant="secondary" onClick={() => {
                          const element = document.querySelector('[value="generation"]') as HTMLElement;
                          element?.click();
                        }}>
                          Try Generation
                        </Button>
                        <Button variant="secondary" onClick={() => {
                          const element = document.querySelector('[value="analysis"]') as HTMLElement;
                          element?.click();
                        }}>
                          Try Analysis
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {(generatedPattern || analysisResult) && (
              <div className="mt-4 text-center">
                <Button variant="secondary" onClick={clearResults}>
                  Clear Results
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </SchillingerProvider>
  );
}