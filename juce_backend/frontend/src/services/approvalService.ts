const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8350/api';

export interface ApprovalResponse {
  success: boolean;
  message: string;
}

/**
 * Sends an approval decision to the backend.
 * @param approvalId The ID of the approval request.
 * @param action The decision, either "approve" or "reject".
 * @returns The response from the backend.
 */
export const sendApproval = async (
  approvalId: string,
  action: 'approve' | 'reject'
): Promise<ApprovalResponse> => {
  // Try to get Clerk authentication token
  let token: string | null = null;
  try {
    // Access Clerk through the global window object
    const clerk = (window as any).Clerk;
    console.log('Clerk object available:', !!clerk);
    console.log('Clerk session available:', !!clerk?.session);
    console.log('Clerk session getToken available:', !!clerk?.session?.getToken);

    if (clerk?.session?.getToken) {
      token = await clerk.session.getToken({ template: 'default' });
      console.log('Retrieved Clerk token length:', token?.length || 0);
      console.log('Retrieved Clerk token preview:', token?.substring(0, 20) + '...' || 'null');
    } else {
      console.warn('Clerk session or getToken method not available');
    }
  } catch (tokenError) {
    console.warn('Failed to obtain Clerk session token for approval API:', tokenError);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if token is available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log('Sending approval request:', {
    url: `${API_BASE_URL}/approvals/${approvalId}`,
    hasAuthHeader: !!headers['Authorization'],
    authHeaderLength: headers['Authorization']?.length || 0,
    action
  });

  const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(errorData.message || 'Failed to send approval');
  }

  return response.json();
};
