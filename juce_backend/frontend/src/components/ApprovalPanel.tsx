import React, { useState } from 'react';
import { sendApproval, ApprovalResponse } from '@/services/approvalService';

const ApprovalPanel: React.FC = () => {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApprovalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApproval = async (action: 'approve' | 'reject') => {
    if (!request) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await sendApproval(request.id, action);
      setResponse(result);
      setRequest(null); // Hide the panel after a decision is made
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!request) {
    // You might want a button to re-show the mock request for testing
    return null;
  }

  return (
    <>
      {/* Modal backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />

      {/* Modal content */}
      <div className="fixed bottom-4 right-4 w-96 bg-daw-surface-secondary shadow-lg rounded-lg p-4 border border-daw-surface-tertiary z-50">
      <h3 className="text-lg font-semibold text-daw-text-primary mb-2">Approval Required</h3>
      <div className="bg-daw-surface-primary p-3 rounded">
        <p className="text-sm text-daw-text-secondary">
          The AI agent wants to perform the following action:
        </p>
        <div className="my-2 p-2 bg-daw-surface-tertiary rounded">
            <p className="font-mono text-daw-text-primary"><strong>Tool:</strong> {request.tool}</p>
            <p className="text-xs text-daw-text-secondary mt-1">{request.details}</p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">Error: {error}</p>}
      {response && <p className="text-green-500 text-sm mt-2">{response.message}</p>}

      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={() => handleApproval('reject')}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
        >
          {loading ? 'Rejecting...' : 'Reject'}
        </button>
        <button
          onClick={() => handleApproval('approve')}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
        >
          {loading ? 'Approving...' : 'Approve'}
        </button>
      </div>
    </div>
    </>
  );
};

export default ApprovalPanel;
