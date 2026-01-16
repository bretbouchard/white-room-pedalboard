import React, { useState } from 'react';
import Button from '@/components/ui/Button';

interface TransformationResult {
  success: boolean;
  data: any;
  provenance?: any;
  error?: string;
  execution_time_ms?: number;
}

const TransformationTest: React.FC = () => {
  const [result, setResult] = useState<TransformationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [availableTransformations, setAvailableTransformations] = useState<string[]>([]);

  const testMelodicContour = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8081/api/transformations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transformation: 'analyzeMelodicContour',
          data: {
            melody: [60, 62, 64, 65, 67, 69, 71, 72] // C major scale
          },
          options: {}
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testChordAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8081/api/transformations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transformation: 'analyzeChord',
          data: {
            chord: 'Cmaj7',
            key: 'C'
          },
          options: {}
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTransformations = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/transformations/available');
      const data = await response.json();
      setAvailableTransformations(data.transformations || []);
    } catch (error) {
      console.error('Failed to load available transformations:', error);
    }
  };

  React.useEffect(() => {
    loadAvailableTransformations();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-daw-text-primary">
        🧪 Transformation API Test
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-daw-surface-secondary p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-daw-text-secondary">
            Available Transformations ({availableTransformations.length})
          </h2>
          <div className="max-h-40 overflow-y-auto">
            {availableTransformations.map((transformation, index) => (
              <div key={index} className="text-sm text-daw-text-tertiary mb-1">
                • {transformation}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-daw-surface-secondary p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-daw-text-secondary">
            Test Functions
          </h2>
          <div className="space-y-2">
            <Button
              onClick={testMelodicContour}
              disabled={loading}
              variant="primary"
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Melodic Contour'}
            </Button>
            <Button
              onClick={testChordAnalysis}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Chord Analysis'}
            </Button>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-daw-surface-secondary p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-daw-text-secondary">
            Result {result.success ? '✅' : '❌'}
          </h2>
          
          {result.success ? (
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-daw-text-primary mb-2">Data:</h3>
                <pre className="bg-daw-surface-primary p-3 rounded text-sm text-daw-text-tertiary overflow-x-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
              
              {result.provenance && (
                <div>
                  <h3 className="font-medium text-daw-text-primary mb-2">Provenance:</h3>
                  <pre className="bg-daw-surface-primary p-3 rounded text-sm text-daw-text-tertiary overflow-x-auto">
                    {JSON.stringify(result.provenance, null, 2)}
                  </pre>
                </div>
              )}
              
              {result.execution_time_ms && (
                <div className="text-sm text-daw-text-secondary">
                  Execution time: {result.execution_time_ms.toFixed(2)}ms
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-400">
              <strong>Error:</strong> {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransformationTest;
