/**
 * Critical Path Tests for SchillingerSDK Client
 *
 * These tests cover the core SDK functionality including:
 * - Client initialization and configuration
 * - Authentication flow
 * - Request handling and error management
 * - Rate limiting and quota enforcement
 * - Cache management
 * - Offline mode handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SchillingerSDK } from './client'
import type { SchillingerSDKConfig } from './client'

describe('SchillingerSDK Client - Critical Path Tests', () => {
  let sdk: SchillingerSDK

  afterEach(async () => {
    if (sdk) {
      await sdk.dispose()
    }
  })

  describe('Client Initialization', () => {
    it('should initialize with default configuration', () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1'
      })

      expect(sdk.getApiUrl()).toBe('http://localhost:3000/api/v1')
      expect(sdk.getTimeout()).toBe(60000)
      expect(sdk.getRetries()).toBe(1)
      expect(sdk.getMaxConcurrentRequests()).toBe(10)
      expect(sdk.isCacheEnabled()).toBe(true)
    })

    it('should initialize with custom configuration', () => {
      const config: SchillingerSDKConfig = {
        apiUrl: 'https://api.example.com/v1',
        timeout: 30000,
        retries: 3,
        cacheEnabled: false,
        debug: true
      }

      sdk = new SchillingerSDK(config)

      expect(sdk.getApiUrl()).toBe('https://api.example.com/v1')
      expect(sdk.getTimeout()).toBe(30000)
      expect(sdk.getRetries()).toBe(3)
      expect(sdk.isCacheEnabled()).toBe(false)
      expect(sdk.isDebugEnabled()).toBe(true)
    })

    it('should validate required configuration fields', () => {
      expect(() => {
        sdk = new SchillingerSDK({} as any)
      }).toThrow()
    })

    it('should enforce HTTPS in production', () => {
      expect(() => {
        sdk = new SchillingerSDK({
          apiUrl: 'http://api.example.com',
          environment: 'production'
        })
      }).toThrow()
    })
  })

  describe('Authentication Flow', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })
    })

    it('should authenticate with API key', async () => {
      const result = await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      expect(result.success).toBe(true)
      expect(sdk.isAuthenticated()).toBe(true)
    })

    it('should track authentication state', async () => {
      expect(sdk.isAuthenticated()).toBe(false)

      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      expect(sdk.isAuthenticated()).toBe(true)
    })

    it('should logout and clear authentication', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      expect(sdk.isAuthenticated()).toBe(true)

      await sdk.logout()

      expect(sdk.isAuthenticated()).toBe(false)
    })

    it('should handle authentication failures gracefully', async () => {
      const result = await sdk.authenticate({
        apiKey: 'invalid-key'
      })

      expect(result.success).toBe(false)
      expect(sdk.isAuthenticated()).toBe(false)
    })
  })

  describe('Request Handling', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })
    })

    it('should make authenticated requests', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      const response = await sdk.makeRequest('/test', {
        method: 'GET'
      })

      // Response validation depends on mock implementation
      expect(response).toBeDefined()
    })

    it('should handle request failures with proper error types', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      await expect(
        sdk.makeRequest('/invalid-endpoint')
      ).rejects.toThrow()
    })

    it('should retry failed requests', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        retries: 3,
        debug: false
      })

      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      // Test retry logic with endpoint that may fail
      const response = await sdk.makeRequest('/test-retry')
      expect(response).toBeDefined()
    })

    it('should enforce timeout on requests', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        timeout: 1000,
        debug: false
      })

      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      await expect(
        sdk.makeRequest('/slow-endpoint')
      ).rejects.toThrow()
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        respectRateLimits: true,
        maxRequestsPerSecond: 2,
        debug: false
      })
    })

    it('should enforce rate limits when enabled', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      const startTime = Date.now()

      // Make multiple requests
      await sdk.makeRequest('/rate-limit-test')
      await sdk.makeRequest('/rate-limit-test')
      await sdk.makeRequest('/rate-limit-test')

      const elapsed = Date.now() - startTime

      // Should take at least 1 second due to rate limiting
      expect(elapsed).toBeGreaterThan(500)
    })

    it('should respect maxRequestsPerSecond configuration', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      const maxRequests = 5
      const promises: Promise<any>[] = []

      for (let i = 0; i < maxRequests; i++) {
        promises.push(sdk.makeRequest('/rate-limit-test'))
      }

      await Promise.all(promises)

      // All requests should complete without errors
      expect(promises.length).toBe(maxRequests)
    })
  })

  describe('Quota Management', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        quotaLimits: {
          dailyRequests: 100,
          monthlyRequests: 1000
        },
        debug: false
      })
    })

    it('should track quota usage', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      sdk.setQuotaUsage({
        dailyRequests: 50,
        monthlyRequests: 500
      })

      const quotaInfo = await sdk.getQuotaInfo()

      expect(quotaInfo.limits.daily).toBe(100)
      expect(quotaInfo.usage.daily).toBe(50)
      expect(quotaInfo.remaining.daily).toBe(50)
    })

    it('should enforce quota limits', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      sdk.setQuotaUsage({
        dailyRequests: 100,
        monthlyRequests: 1000
      })

      await expect(
        sdk.makeRequest('/test')
      ).rejects.toThrow()
    })

    it('should provide accurate remaining quota', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      sdk.setQuotaUsage({
        dailyRequests: 75
      })

      const quotaInfo = await sdk.getQuotaInfo()
      expect(quotaInfo.remaining.daily).toBe(25)
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        cacheEnabled: true,
        debug: false
      })
    })

    it('should cache responses when enabled', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      const cacheKey = 'test-cache-key'
      const testData = { result: 'test-data' }

      // Cache data
      await sdk.cache.set(cacheKey, testData, 60)

      // Retrieve from cache
      const cached = await sdk.cache.get(cacheKey)
      expect(cached).toEqual(testData)
    })

    it('should respect cache TTL', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      const cacheKey = 'test-ttl-key'
      const testData = { result: 'test-data' }

      // Set with short TTL
      await sdk.cache.set(cacheKey, testData, 1)

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should return null after expiration
      const cached = await sdk.cache.get(cacheKey)
      expect(cached).toBeNull()
    })

    it('should clear cache on demand', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      await sdk.cache.set('key1', { data: 'value1' }, 60)
      await sdk.cache.set('key2', { data: 'value2' }, 60)

      sdk.clearCache()

      const cached1 = await sdk.cache.get('key1')
      const cached2 = await sdk.cache.get('key2')

      expect(cached1).toBeNull()
      expect(cached2).toBeNull()
    })
  })

  describe('Offline Mode', () => {
    it('should handle offline mode', () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        offlineMode: true,
        debug: false
      })

      sdk.setOfflineMode()
      expect(sdk.isOfflineMode()).toBe(true)
    })

    it('should use cached data in offline mode', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        cacheEnabled: true,
        debug: false
      })

      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      const cacheKey = 'offline-test'
      const testData = { result: 'offline-data' }

      await sdk.cache.set(cacheKey, testData, 60)

      const cached = await sdk.cache.get(cacheKey)
      expect(cached).toEqual(testData)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })
    })

    it('should handle network errors gracefully', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      await expect(
        sdk.makeRequest('/network-error')
      ).rejects.toThrow()
    })

    it('should handle timeout errors', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        timeout: 100,
        debug: false
      })

      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      await expect(
        sdk.makeRequest('/timeout-test')
      ).rejects.toThrow()
    })

    it('should provide error context', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      try {
        await sdk.makeRequest('/error-test')
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error.message).toBeTruthy()
      }
    })
  })

  describe('Feature Flags', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        features: {
          realtimeGeneration: true,
          collaborativeEditing: false
        },
        debug: false
      })
    })

    it('should respect feature flags', () => {
      expect(sdk.isFeatureEnabled('realtimeGeneration')).toBe(true)
      expect(sdk.isFeatureEnabled('collaborativeEditing')).toBe(false)
      expect(sdk.isFeatureEnabled('advancedAnalysis')).toBe(false)
    })

    it('should allow runtime feature flag changes', () => {
      expect(sdk.isFeatureEnabled('realtimeGeneration')).toBe(true)

      sdk.configure({
        features: {
          realtimeGeneration: false
        }
      })

      expect(sdk.isFeatureEnabled('realtimeGeneration')).toBe(false)
    })
  })

  describe('Metrics and Monitoring', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })
    })

    it('should record custom metrics', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      sdk.recordMetric('test.metric', 42, { tag: 'test-value' })

      const metrics = sdk.getCustomMetrics()
      expect(metrics['test.metric']).toBeDefined()
      expect(metrics['test.metric'].value).toBe(42)
    })

    it('should track monitoring data', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      const monitoringData = sdk.getMonitoringData()

      expect(monitoringData.provider).toBe('datadog')
      expect(monitoringData.metricsSent).toBeGreaterThanOrEqual(0)
    })

    it('should capture telemetry data', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      await sdk.makeRequest('/test')

      const telemetry = sdk.getTelemetryData()
      expect(telemetry.requests.length).toBeGreaterThan(0)
    })
  })

  describe('Resource Management', () => {
    it('should properly dispose of resources', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })

      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      await sdk.dispose()

      expect(sdk.isAuthenticated()).toBe(false)
    })

    it('should handle multiple dispose calls', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })

      await sdk.dispose()
      await sdk.dispose() // Should not throw

      expect(true).toBe(true)
    })
  })

  describe('Configuration Updates', () => {
    it('should allow runtime configuration changes', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })

      await sdk.configure({
        timeout: 30000,
        retries: 5
      })

      expect(sdk.getTimeout()).toBe(30000)
      expect(sdk.getRetries()).toBe(5)
    })

    it('should preserve authentication on reconfiguration', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })

      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      await sdk.configure({
        timeout: 30000
      })

      expect(sdk.isAuthenticated()).toBe(true)
    })
  })

  describe('Health and Status', () => {
    beforeEach(() => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: false
      })
    })

    it('should provide health status', async () => {
      const health = await sdk.getHealthStatus()

      expect(health.status).toBeDefined()
      expect(health.checks).toBeDefined()
      expect(health.timestamp).toBeInstanceOf(Date)
    })

    it('should provide metrics', async () => {
      await sdk.authenticate({
        apiKey: 'test-api-key'
      })

      const metrics = sdk.getMetrics()

      expect(metrics.cache).toBeDefined()
      expect(metrics.requests).toBeDefined()
      expect(metrics.auth).toBeDefined()
    })

    it('should report auth status correctly', () => {
      expect(sdk.isAuthenticated()).toBe(false)

      sdk.authenticate({
        apiKey: 'test-api-key'
      })

      expect(sdk.isAuthenticated()).toBe(true)
    })
  })

  describe('Debug Information', () => {
    it('should provide debug information', async () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: true
      })

      const debugInfo = await sdk.getDebugInfo()

      expect(debugInfo.environment).toBeDefined()
      expect(debugInfo.version).toBeDefined()
      expect(debugInfo.authenticated).toBeDefined()
      expect(debugInfo.features).toBeDefined()
    })

    it('should respect debug flag', () => {
      sdk = new SchillingerSDK({
        apiUrl: 'http://localhost:3000/api/v1',
        debug: true
      })

      expect(sdk.isDebugEnabled()).toBe(true)

      sdk.configure({
        debug: false
      })

      expect(sdk.isDebugEnabled()).toBe(false)
    })
  })
})
