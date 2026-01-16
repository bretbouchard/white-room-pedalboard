/**
 * Mock SDK for Testing
 *
 * Provides mock implementations of SDK interfaces for testing.
 */

/**
 * Setup fetch mocking for tests
 */
export function setupFetchMock(): void {
  // Setup fetch mocking
  // This is a stub that can be expanded as needed
  console.log("Fetch mock setup complete");
}

/**
 * Create a mock SDK instance for testing
 */
export function createMockSDK(): Record<string, unknown> {
  return {
    // Mock SDK methods and properties
    version: "2.0.0-test",
    isTest: true,
  };
}
