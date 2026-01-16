import Foundation

// MARK: - HTTP Method

public enum HTTPMethod: String, CaseIterable {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
    case PATCH = "PATCH"
}

// MARK: - Network Manager

/// Handles all network requests for the SDK
public class NetworkManager {
    private var configuration: SDKConfiguration
    private let session: URLSession
    private let retryManager: RetryManager
    
    public init(configuration: SDKConfiguration) {
        self.configuration = configuration
        
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = configuration.timeout
        config.timeoutIntervalForResource = configuration.timeout * 2
        
        self.session = URLSession(configuration: config)
        self.retryManager = RetryManager(maxRetries: configuration.retries)
    }
    
    /// Update configuration
    public func updateConfiguration(_ newConfiguration: SDKConfiguration) {
        self.configuration = newConfiguration
    }
    
    /// Make HTTP request with retry logic
    public func makeRequest<T: Codable>(
        endpoint: String,
        method: HTTPMethod,
        body: Data?,
        token: String?,
        responseType: T.Type
    ) async -> Result<T, SchillingerError> {
        
        guard let url = URL(string: "\(configuration.apiUrl)\(endpoint)") else {
            return .failure(.configuration(ConfigurationError(field: "apiUrl", message: "Invalid API URL")))
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Schillinger-SDK-Swift/1.0.0 (\(configuration.environment.rawValue))", 
                        forHTTPHeaderField: "User-Agent")
        
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        return await retryManager.executeWithRetry {
            await self.performRequest(request: request, responseType: responseType)
        }
    }
    
    // MARK: - Private Methods
    
    private func performRequest<T: Codable>(
        request: URLRequest,
        responseType: T.Type
    ) async -> Result<T, SchillingerError> {
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.network(NetworkError(message: "Invalid response type")))
            }
            
            // Handle different status codes
            switch httpResponse.statusCode {
            case 200...299:
                // Success - decode response
                do {
                    let decodedResponse = try JSONDecoder().decode(responseType, from: data)
                    return .success(decodedResponse)
                } catch {
                    return .failure(ErrorHandler.handle(error))
                }
                
            case 401:
                return .failure(.authentication(AuthenticationError(
                    message: NSLocalizedString("network.error.unauthorized",
                                             value: "Authentication failed - token expired or invalid",
                                             comment: "Network error message"),
                    code: "UNAUTHORIZED"
                )))
                
            case 429:
                let retryAfter = getRetryAfter(from: httpResponse)
                return .failure(.rateLimit(RateLimitError(retryAfter: retryAfter)))
                
            case 400...499:
                let errorMessage = parseErrorMessage(from: data) ?? "Client error"
                return .failure(.validation(ValidationError(
                    field: "request",
                    value: nil,
                    expected: "valid request",
                    code: "CLIENT_ERROR"
                )))
                
            case 500...599:
                let errorMessage = parseErrorMessage(from: data) ?? "Server error"
                return .failure(.network(NetworkError(
                    message: errorMessage,
                    statusCode: httpResponse.statusCode,
                    code: "SERVER_ERROR"
                )))

            default:
                return .failure(.network(NetworkError(
                    message: "Unexpected status code: \(httpResponse.statusCode)",
                    statusCode: httpResponse.statusCode
                )))
            }
            
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    private func getRetryAfter(from response: HTTPURLResponse) -> TimeInterval {
        if let retryAfterString = response.value(forHTTPHeaderField: "Retry-After"),
           let retryAfter = TimeInterval(retryAfterString) {
            return retryAfter
        }
        return 60.0 // Default to 1 minute
    }
    
    private func parseErrorMessage(from data: Data) -> String? {
        do {
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = json["message"] as? String {
                return message
            }
        } catch {
            // Ignore JSON parsing errors
        }
        
        return String(data: data, encoding: .utf8)
    }
}

// MARK: - Retry Manager

/// Handles retry logic for network requests
public class RetryManager {
    private let maxRetries: Int
    private let baseDelay: TimeInterval = 1.0
    
    public init(maxRetries: Int) {
        self.maxRetries = maxRetries
    }
    
    /// Execute operation with exponential backoff retry
    public func executeWithRetry<T>(
        operation: () async -> Result<T, SchillingerError>
    ) async -> Result<T, SchillingerError> {
        
        for attempt in 1...maxRetries {
            let result = await operation()
            
            switch result {
            case .success:
                return result
                
            case .failure(let error):
                // Don't retry certain types of errors
                if !shouldRetry(error: error) || attempt == maxRetries {
                    return result
                }
                
                // Wait before retrying with exponential backoff
                let delay = baseDelay * pow(2.0, Double(attempt - 1))
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }
        
        // This should never be reached, but just in case
        return await operation()
    }
    
    private func shouldRetry(error: SchillingerError) -> Bool {
        switch error {
        case .network(let networkError):
            // Retry network errors, but not authentication or validation errors
            if let statusCode = networkError.details?["statusCode"] as? Int {
                return statusCode >= 500 // Only retry server errors
            }
            return true

        case .authentication, .validation, .configuration, .processing, .cache, .offline, .rateLimit:
            return false
        }
    }
}

// MARK: - Cache Manager

/// Manages in-memory and persistent caching
public class CacheManager {
    private var memoryCache: [String: CacheEntry] = [:]
    private let cacheQueue = DispatchQueue(label: "com.schillinger.sdk.cache", attributes: .concurrent)
    private var isEnabled: Bool
    
    private struct CacheEntry {
        let data: Data
        let expiresAt: Date
    }
    
    public init(enabled: Bool) {
        self.isEnabled = enabled
    }
    
    /// Set cache enabled state
    public func setEnabled(_ enabled: Bool) {
        isEnabled = enabled
        if !enabled {
            clear()
        }
    }
    
    /// Get cached value
    public func get<T: Codable>(key: String) -> T? {
        guard isEnabled else { return nil }
        
        return cacheQueue.sync {
            guard let entry = memoryCache[key] else { return nil }
            
            // Check if expired
            if entry.expiresAt <= Date() {
                memoryCache.removeValue(forKey: key)
                return nil
            }
            
            do {
                return try JSONDecoder().decode(T.self, from: entry.data)
            } catch {
                // Remove corrupted entry
                memoryCache.removeValue(forKey: key)
                return nil
            }
        }
    }
    
    /// Set cached value
    public func set<T: Codable>(key: String, value: T, ttl: TimeInterval) {
        guard isEnabled else { return }
        
        do {
            let data = try JSONEncoder().encode(value)
            let expiresAt = Date().addingTimeInterval(ttl)
            let entry = CacheEntry(data: data, expiresAt: expiresAt)
            
            cacheQueue.async(flags: .barrier) {
                self.memoryCache[key] = entry
            }
        } catch {
            // Ignore encoding errors
        }
    }
    
    /// Clear all cached values
    public func clear() {
        cacheQueue.async(flags: .barrier) {
            self.memoryCache.removeAll()
        }
    }
    
    /// Get cache statistics
    public func getStats() -> CacheStats {
        return cacheQueue.sync {
            let totalEntries = memoryCache.count
            let expiredEntries = memoryCache.values.filter { $0.expiresAt <= Date() }.count
            
            return CacheStats(
                totalEntries: totalEntries,
                expiredEntries: expiredEntries,
                hitRate: 0.0 // Would need to track hits/misses for accurate rate
            )
        }
    }
    
    /// Check if cache is healthy
    public func isHealthy() -> Bool {
        return isEnabled
    }
}

// MARK: - Cache Stats

public struct CacheStats {
    public let totalEntries: Int
    public let expiredEntries: Int
    public let hitRate: Double
}

// MARK: - Offline Manager

/// Manages offline capabilities and operations
public class OfflineManager {
    private var isOffline: Bool = false
    private let offlineCapableOperations: Set<String> = [
        "generateRhythmicResultant",
        "applyRhythmVariation",
        "calculatePatternComplexity",
        "generateHarmonicProgression",
        "analyzeMelody"
    ]
    
    /// Set offline mode
    public func setOfflineMode(_ offline: Bool) {
        isOffline = offline
    }
    
    /// Check if operation can be performed offline
    public func isOfflineCapable(_ endpoint: String) -> Bool {
        // Extract operation name from endpoint
        let operationName = endpoint.components(separatedBy: "/").last ?? ""
        return offlineCapableOperations.contains(operationName)
    }
    
    /// Check if specific operation can be performed offline
    public func canPerformOffline(_ operation: String) -> Bool {
        return offlineCapableOperations.contains(operation)
    }
    
    /// Get list of offline-capable operations
    public func getOfflineCapableOperations() -> [String] {
        return Array(offlineCapableOperations)
    }
}