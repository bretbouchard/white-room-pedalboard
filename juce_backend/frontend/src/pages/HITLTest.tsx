import React, { useState } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';
import Button from '@/components/ui/Button';
import { isCopilotEnabled } from '@/config/copilot';

const HITLTest: React.FC = () => {
  const [actionResults, setActionResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isCopilotEnabled) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-3">
        <h1 className="text-2xl font-semibold text-daw-text-primary">HITL Test</h1>
        <p className="text-daw-text-secondary">
          CopilotKit is currently disabled. Provide `VITE_ENABLE_COPILOTKIT=true` and a runtime URL to exercise the
          human-in-the-loop flows.
        </p>
      </div>
    );
  }

  // Test the confirmKey HITL action
  useCopilotAction({
    name: "confirmKey",
    description: "Test the confirmKey HITL action",
    parameters: [
      {
        name: "suggestedKey",
        type: "string",
        description: "The suggested musical key",
        required: true,
      },
      {
        name: "confidence",
        type: "number", 
        description: "Confidence level (0-1)",
        required: false,
      }
    ],
    handler: async ({ suggestedKey, confidence }) => {
      console.log('confirmKey action triggered:', { suggestedKey, confidence });
      
      const result = {
        action: 'confirmKey',
        timestamp: new Date().toISOString(),
        input: { suggestedKey, confidence },
        result: `Key ${suggestedKey} confirmed with confidence ${confidence || 'unknown'}`
      };
      
      setActionResults(prev => [result, ...prev]);
      return result;
    },
  });

  // Test the chooseMotif HITL action
  useCopilotAction({
    name: "chooseMotif",
    description: "Test the chooseMotif HITL action",
    parameters: [
      {
        name: "motifs",
        type: "object",
        description: "Array of motif options",
        required: true,
      },
      {
        name: "context",
        type: "string",
        description: "Musical context",
        required: false,
      }
    ],
    handler: async ({ motifs, context }) => {
      console.log('chooseMotif action triggered:', { motifs, context });
      
      const result = {
        action: 'chooseMotif',
        timestamp: new Date().toISOString(),
        input: { motifs, context },
        result: `Motif chosen from ${Array.isArray(motifs) ? motifs.length : 'unknown'} options`
      };
      
      setActionResults(prev => [result, ...prev]);
      return result;
    },
  });

  // Test the requestFeedback HITL action
  useCopilotAction({
    name: "requestFeedback",
    description: "Test the requestFeedback HITL action",
    parameters: [
      {
        name: "question",
        type: "string",
        description: "The feedback question",
        required: true,
      },
      {
        name: "options",
        type: "object",
        description: "Feedback options",
        required: false,
      }
    ],
    handler: async ({ question, options }) => {
      console.log('requestFeedback action triggered:', { question, options });
      
      const result = {
        action: 'requestFeedback',
        timestamp: new Date().toISOString(),
        input: { question, options },
        result: `Feedback requested: "${question}"`
      };
      
      setActionResults(prev => [result, ...prev]);
      return result;
    },
  });

  const testTransformationWithHITL = async () => {
    setLoading(true);
    try {
      // First, call a transformation
      const transformResponse = await fetch('http://localhost:8081/api/transformations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transformation: 'analyzeMelodicContour',
          data: {
            melody: [60, 64, 67, 72, 69, 65, 62, 60] // C-E-G-C-A-F-D-C
          },
          options: {}
        }),
      });

      const transformData = await transformResponse.json();
      
      if (transformData.success) {
        // Simulate triggering HITL actions based on transformation result
        const contour = transformData.data.contour;
        
        // Simulate confirmKey action
        const keyResult = {
          action: 'confirmKey (simulated)',
          timestamp: new Date().toISOString(),
          input: { suggestedKey: 'C major', confidence: 0.9 },
          result: `Key analysis based on ${contour.overall_direction} melody`
        };
        
        setActionResults(prev => [keyResult, ...prev]);
      }
      
    } catch (error) {
      console.error('Test failed:', error);
      const errorResult = {
        action: 'error',
        timestamp: new Date().toISOString(),
        input: {},
        result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      setActionResults(prev => [errorResult, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setActionResults([]);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-daw-text-primary">
        🤖 HITL Actions Test
      </h1>

      <div className="bg-daw-surface-secondary p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-4 text-daw-text-secondary">
          Test Controls
        </h2>
        <div className="space-y-2">
          <Button
            onClick={testTransformationWithHITL}
            disabled={loading}
            variant="primary"
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Transformation + HITL Flow'}
          </Button>
          <Button
            onClick={clearResults}
            variant="secondary"
            className="w-full"
          >
            Clear Results
          </Button>
        </div>
      </div>

      <div className="bg-daw-surface-secondary p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-daw-text-secondary">
          HITL Action Results ({actionResults.length})
        </h2>
        
        {actionResults.length === 0 ? (
          <div className="text-daw-text-tertiary text-center py-8">
            No HITL actions triggered yet. Try the test above or interact with CopilotKit.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {actionResults.map((result, index) => (
              <div key={index} className="bg-daw-surface-primary p-3 rounded border-l-4 border-daw-accent">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-daw-text-primary">
                    {result.action}
                  </span>
                  <span className="text-xs text-daw-text-tertiary">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-daw-text-secondary mb-2">
                  <strong>Input:</strong> {JSON.stringify(result.input)}
                </div>
                <div className="text-sm text-daw-text-primary">
                  <strong>Result:</strong> {result.result}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-daw-surface-secondary p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-daw-text-secondary">
          Available HITL Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-daw-text-primary mb-1">confirmKey</h4>
            <p className="text-daw-text-tertiary">Confirm suggested musical key</p>
          </div>
          <div>
            <h4 className="font-medium text-daw-text-primary mb-1">chooseMotif</h4>
            <p className="text-daw-text-tertiary">Choose from motif options</p>
          </div>
          <div>
            <h4 className="font-medium text-daw-text-primary mb-1">requestFeedback</h4>
            <p className="text-daw-text-tertiary">Request user feedback</p>
          </div>
          <div>
            <h4 className="font-medium text-daw-text-primary mb-1">confirmMultiStepAction</h4>
            <p className="text-daw-text-tertiary">Confirm complex actions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HITLTest;
