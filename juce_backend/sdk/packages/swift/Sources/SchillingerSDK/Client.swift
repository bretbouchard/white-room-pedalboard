import Foundation

// MARK: - SDK Configuration

/// Configuration options for the Schillinger SDK
public struct SDKConfiguration {
    public let apiUrl: String
    public let timeout: TimeInterval
    public let retries: Int
    public let cacheEnabled: Bool
    public let offlineMode: Bool
    public let environment: Environment
    public let debug: Bool
    public let autoRefreshToken: Bool
    public let maxConcurrentRequests: Int
    
    public enum Environment: String, CaseIterable {
        case development
        case staging
        case production
    }
    
    public init(
        apiUrl: String? = nil,
        timeout: TimeInterval = 30.0,
        retries: Int = 3,
        cacheEnabled: Bool = true,
        offlineMode: Bool = false,
        environment: Environment = .development,
        debug: Bool = false,
        autoRefreshToken: Bool = true,
        maxConcurrentRequests: Int = 10
    ) {
        self.apiUrl = apiUrl ?? Self.defaultApiUrl(for: environment)
        self.timeout = timeout
        self.retries = retries
        self.cacheEnabled = cacheEnabled
        self.offlineMode = offlineMode
        self.environment = environment
        self.debug = debug
        self.autoRefreshToken = autoRefreshToken
        self.maxConcurrentRequests = maxConcurrentRequests
    }
    
    private static func defaultApiUrl(for environment: Environment) -> String {
        switch environment {
        case .production:
            return "https://api.schillinger.ai/v1"
        case .staging:
            return "https://staging-api.schillinger.ai/v1"
        case .development:
            return "http://localhost:3000/api/v1"
        }
    }
}

// MARK: - SDK Events

/// SDK event types
public enum SDKEventType: String, CaseIterable {
    case auth
    case network
    case cache
    case error
    case config
}

/// SDK event structure
public struct SDKEvent {
    public let type: SDKEventType
    public let data: [String: Any]
    public let timestamp: Date
    
    public init(type: SDKEventType, data: [String: Any], timestamp: Date = Date()) {
        self.type = type
        self.data = data
        self.timestamp = timestamp
    }
}

/// SDK event listener
public typealias SDKEventListener = (SDKEvent) -> Void

// MARK: - Main SDK Class

/// Main Schillinger SDK client for iOS/macOS applications
@MainActor
public class SchillingerSDK: ObservableObject {
    
    // MARK: - Properties
    
    @Published public private(set) var isAuthenticated: Bool = false
    @Published public private(set) var isOfflineMode: Bool = false
    @Published public private(set) var connectionStatus: ConnectionStatus = .disconnected
    
    public enum ConnectionStatus {
        case connected
        case connecting
        case disconnected
        case error(SchillingerError)
    }
    
    private var configuration: SDKConfiguration
    private let authManager: AuthenticationManager
    private let networkManager: NetworkManager
    private let cacheManager: CacheManager
    private let offlineManager: OfflineManager
    
    private var eventListeners: [SDKEventType: [SDKEventListener]] = [:]
    private var activeRequests: Set<UUID> = []
    private var requestQueue: [(UUID, () async -> Void)] = []
    
    // API modules
    public lazy var rhythm: RhythmAPI = { RhythmAPI(sdk: self) }()
    public lazy var harmony: HarmonyAPI = { HarmonyAPI(sdk: self) }()
    public lazy var melody: MelodyAPI = { MelodyAPI(sdk: self) }()
    public lazy var composition: CompositionAPI = { CompositionAPI(sdk: self) }()

    // MARK: - Initialization

    public init(configuration: SDKConfiguration = SDKConfiguration()) {
        self.configuration = configuration
        self.authManager = AuthenticationManager()
        self.networkManager = NetworkManager(configuration: configuration)
        self.cacheManager = CacheManager(enabled: configuration.cacheEnabled)
        self.offlineManager = OfflineManager()

        // Set initial state
        self.isAuthenticated = authManager.isAuthenticated()
        self.isOfflineMode = configuration.offlineMode

        // Setup automatic token refresh if enabled
        if configuration.autoRefreshToken {
            setupTokenRefresh()
        }
        
        log("SDK initialized", data: ["environment": configuration.environment.rawValue])
    }
    
    // MARK: - Configuration
    
    /// Update SDK configuration
    public func configure(_ newConfiguration: SDKConfiguration) async {
        let oldConfig = configuration
        configuration = newConfiguration
        
        // Update managers
        networkManager.updateConfiguration(newConfiguration)
        cacheManager.setEnabled(newConfiguration.cacheEnabled)
        offlineManager.setOfflineMode(newConfiguration.offlineMode)
        
        isOfflineMode = newConfiguration.offlineMode
        
        log("SDK reconfigured", data: [
            "oldEnvironment": oldConfig.environment.rawValue,
            "newEnvironment": newConfiguration.environment.rawValue
        ])
        
        emit(event: SDKEvent(type: .config, data: [
            "newConfiguration": newConfiguration.environment.rawValue
        ]))
    }
    
    /// Get current configuration
    public func getConfiguration() -> SDKConfiguration {
        return configuration
    }
    
    // MARK: - Authentication
    
    /// Authenticate with the Schillinger System
    public func authenticate(credentials: AuthCredentials) async -> Result<AuthResult, SchillingerError> {
        log("Starting authentication", data: ["credentialType": getCredentialType(credentials)])
        
        connectionStatus = .connecting
        
        let result = await authManager.authenticate(
            credentials: credentials,
            apiUrl: configuration.apiUrl
        )
        
        switch result {
        case .success(let authResult):
            if authResult.success {
                isAuthenticated = true
                connectionStatus = .connected
                
                log("Authentication successful", data: [
                    "permissions": authResult.permissions?.map { $0.resource } ?? []
                ])
                
                emit(event: SDKEvent(type: .auth, data: [
                    "success": true,
                    "permissions": authResult.permissions?.map { $0.resource } ?? []
                ]))
            } else {
                connectionStatus = .disconnected
                emit(event: SDKEvent(type: .auth, data: ["success": false]))
            }
            return .success(authResult)
            
        case .failure(let error):
            connectionStatus = .error(error)
            emit(event: SDKEvent(type: .error, data: ["error": error.localizedDescription]))
            return .failure(error)
        }
    }
    
    /// Check if SDK is authenticated
    public func checkAuthentication() -> Bool {
        let authenticated = authManager.isAuthenticated()
        if isAuthenticated != authenticated {
            isAuthenticated = authenticated
        }
        return authenticated
    }
    
    /// Get current user permissions
    public func getPermissions() -> [String] {
        return authManager.getPermissions()
    }
    
    /// Check if user has specific permission
    public func hasPermission(_ permission: String) -> Bool {
        return authManager.hasPermission(permission)
    }
    
    /// Get token information
    public func getTokenInfo() -> TokenInfo? {
        return authManager.getTokenInfo()
    }
    
    /// Refresh authentication token
    public func refreshToken() async -> Result<Void, SchillingerError> {
        log("Refreshing token")
        
        let result = await authManager.refreshToken(apiUrl: configuration.apiUrl)
        
        switch result {
        case .success:
            log("Token refreshed successfully")
            emit(event: SDKEvent(type: .auth, data: ["refreshed": true]))
            return .success(())
            
        case .failure(let error):
            isAuthenticated = false
            connectionStatus = .error(error)
            log("Token refresh failed", data: ["error": error.localizedDescription])
            emit(event: SDKEvent(type: .error, data: ["error": error.localizedDescription]))
            return .failure(error)
        }
    }
    
    /// Logout and clear authentication
    public func logout() async {
        await authManager.logout()
        isAuthenticated = false
        connectionStatus = .disconnected
        cacheManager.clear()
        
        log("Logged out successfully")
        emit(event: SDKEvent(type: .auth, data: ["success": false, "reason": "Logged out"]))
    }
    
    // MARK: - Network Requests
    
    /// Make authenticated HTTP request
    public func makeRequest<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Data? = nil,
        responseType: T.Type
    ) async -> Result<T, SchillingerError> {
        
        // Check offline mode
        if configuration.offlineMode && !offlineManager.isOfflineCapable(endpoint) {
            return .failure(.offline(OfflineError(operation: endpoint)))
        }
        
        // Check rate limiting
        if activeRequests.count >= configuration.maxConcurrentRequests {
            return await queueRequest {
                await self.makeRequest(endpoint: endpoint, method: method, body: body, responseType: responseType)
            }
        }
        
        // Auto-refresh token if needed
        if configuration.autoRefreshToken && authManager.isTokenExpiringSoon() {
            let _ = await refreshToken()
        }
        
        let requestId = UUID()
        activeRequests.insert(requestId)
        
        defer {
            activeRequests.remove(requestId)
            processRequestQueue()
        }
        
        let result = await networkManager.makeRequest(
            endpoint: endpoint,
            method: method,
            body: body,
            token: authManager.getCurrentToken(),
            responseType: responseType
        )
        
        switch result {
        case .success(let response):
            log("Request successful", data: ["endpoint": endpoint])
            return .success(response)
            
        case .failure(let error):
            log("Request failed", data: ["endpoint": endpoint, "error": error.localizedDescription])
            emit(event: SDKEvent(type: .error, data: ["error": error.localizedDescription]))

            // Handle authentication errors
            switch error {
            case .authentication:
                isAuthenticated = false
                connectionStatus = .error(error)
            default:
                break
            }

            return .failure(error)
        }
    }
    
    // MARK: - Caching
    
    /// Get cached result or execute operation
    public func getCachedOrExecute<T: Codable>(
        cacheKey: String,
        operation: () async -> Result<T, SchillingerError>,
        ttl: TimeInterval = 300
    ) async -> Result<T, SchillingerError> {
        
        if !configuration.cacheEnabled {
            return await operation()
        }
        
        if let cached: T = cacheManager.get(key: cacheKey) {
            return .success(cached)
        }
        
        let result = await operation()
        
        if case .success(let value) = result {
            cacheManager.set(key: cacheKey, value: value, ttl: ttl)
        }
        
        return result
    }
    
    /// Clear all caches
    public func clearCache() {
        cacheManager.clear()
        log("Cache cleared")
    }
    
    // MARK: - Offline Mode
    
    /// Set offline mode
    public func setOfflineMode(_ offline: Bool) {
        configuration = SDKConfiguration(
            apiUrl: configuration.apiUrl,
            timeout: configuration.timeout,
            retries: configuration.retries,
            cacheEnabled: configuration.cacheEnabled,
            offlineMode: offline,
            environment: configuration.environment,
            debug: configuration.debug,
            autoRefreshToken: configuration.autoRefreshToken,
            maxConcurrentRequests: configuration.maxConcurrentRequests
        )
        
        offlineManager.setOfflineMode(offline)
        isOfflineMode = offline
        
        log("Offline mode changed", data: ["offline": offline])
    }
    
    // MARK: - Event System
    
    /// Subscribe to SDK events
    public func on(_ eventType: SDKEventType, listener: @escaping SDKEventListener) {
        if eventListeners[eventType] == nil {
            eventListeners[eventType] = []
        }
        eventListeners[eventType]?.append(listener)
    }
    
    /// Unsubscribe from SDK events
    public func off(_ eventType: SDKEventType) {
        eventListeners[eventType] = nil
    }
    
    // MARK: - Health and Metrics
    
    /// Get SDK health status
    public func getHealthStatus() async -> HealthStatus {
        var checks: [String: Bool] = [:]
        
        // Check API connectivity
        if !configuration.offlineMode {
            let result = await networkManager.makeRequest(
                endpoint: "/health",
                method: HTTPMethod.GET,
                body: nil as Data?,
                token: nil as String?,
                responseType: HealthResponse.self
            )
            checks["api"] = result.isSuccess
        } else {
            checks["api"] = true
        }
        
        // Check authentication
        checks["auth"] = isAuthenticated
        
        // Check cache
        checks["cache"] = cacheManager.isHealthy()
        
        // Check offline capabilities
        checks["offline"] = offlineManager.canPerformOffline("generateRhythmicResultant")
        
        let healthyChecks = checks.values.filter { $0 }.count
        let totalChecks = checks.count
        
        let status: HealthStatus.Status
        if healthyChecks == totalChecks {
            status = .healthy
        } else if healthyChecks >= totalChecks / 2 {
            status = .degraded
        } else {
            status = .unhealthy
        }
        
        return HealthStatus(status: status, checks: checks, timestamp: Date())
    }
    
    /// Get SDK metrics
    public func getMetrics() -> SDKMetrics {
        return SDKMetrics(
            cache: cacheManager.getStats(),
            requests: RequestMetrics(
                active: activeRequests.count,
                queued: requestQueue.count
            ),
            auth: AuthMetrics(
                authenticated: isAuthenticated,
                permissions: getPermissions().count,
                tokenExpiry: getTokenInfo()?.expiresAt
            )
        )
    }
    
    // MARK: - Private Methods
    
    private func getCredentialType(_ credentials: AuthCredentials) -> String {
        if credentials.apiKey != nil { return "apiKey" }
        if credentials.clerkToken != nil { return "clerkToken" }
        if credentials.customAuth != nil { return "customAuth" }
        return "unknown"
    }
    
    private func setupTokenRefresh() {
        Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 60_000_000_000) // 1 minute
                
                if authManager.isTokenExpiringSoon() {
                    let _ = await refreshToken()
                }
            }
        }
    }
    
    private func queueRequest<T>(operation: @escaping @Sendable () async -> Result<T, SchillingerError>) async -> Result<T, SchillingerError> {
        return await withCheckedContinuation { continuation in
            let requestId = UUID()
            requestQueue.append((requestId, {
                let result = await operation()
                continuation.resume(returning: result)
            }))
        }
    }
    
    private func processRequestQueue() {
        while !requestQueue.isEmpty && activeRequests.count < configuration.maxConcurrentRequests {
            let (_, operation) = requestQueue.removeFirst()
            Task {
                await operation()
            }
        }
    }
    
    private func emit(event: SDKEvent) {
        if let listeners = eventListeners[event.type] {
            for listener in listeners {
                listener(event)
            }
        }
    }
    
    private func log(_ message: String, data: [String: Any] = [:]) {
        if configuration.debug {
            let timestamp = ISO8601DateFormatter().string(from: Date())
            print("[Schillinger SDK \(timestamp)] \(message)", data.isEmpty ? "" : data)
        }
    }
}

// MARK: - Supporting Types

public struct HealthStatus {
    public enum Status {
        case healthy
        case degraded
        case unhealthy
    }
    
    public let status: Status
    public let checks: [String: Bool]
    public let timestamp: Date
}

public struct HealthResponse: Codable {
    public let status: String
}

public struct SDKMetrics {
    public let cache: CacheStats
    public let requests: RequestMetrics
    public let auth: AuthMetrics
}

public struct RequestMetrics {
    public let active: Int
    public let queued: Int
}

public struct AuthMetrics {
    public let authenticated: Bool
    public let permissions: Int
    public let tokenExpiry: Date?
}

// MARK: - Result Extensions

extension Result {
    var isSuccess: Bool {
        switch self {
        case .success:
            return true
        case .failure:
            return false
        }
    }
}