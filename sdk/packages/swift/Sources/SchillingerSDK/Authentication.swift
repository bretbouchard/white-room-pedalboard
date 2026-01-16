import Foundation
import Security

// MARK: - Authentication Types

/// Authentication credentials for the Schillinger SDK
public struct AuthCredentials: Codable {
    public let apiKey: String?
    public let clerkToken: String?
    public let customAuth: [String: String]?
    
    public init(apiKey: String? = nil, clerkToken: String? = nil, customAuth: [String: String]? = nil) {
        self.apiKey = apiKey
        self.clerkToken = clerkToken
        self.customAuth = customAuth
    }
}

/// Authentication result
public struct AuthResult: Codable {
    public let success: Bool
    public let token: String?
    public let permissions: [Permission]?
    public let expiresAt: Date?
    public let refreshToken: String?
    
    public init(success: Bool, token: String? = nil, permissions: [Permission]? = nil, expiresAt: Date? = nil, refreshToken: String? = nil) {
        self.success = success
        self.token = token
        self.permissions = permissions
        self.expiresAt = expiresAt
        self.refreshToken = refreshToken
    }
}

/// Permission structure
public struct Permission: Codable, Equatable {
    public let resource: String
    public let actions: [String]
    
    public init(resource: String, actions: [String]) {
        self.resource = resource
        self.actions = actions
    }
}

/// Token information
public struct TokenInfo: Codable {
    public let token: String
    public let expiresAt: Date?
    public let refreshToken: String?
    public let permissions: [String]
    
    public init(token: String, expiresAt: Date? = nil, refreshToken: String? = nil, permissions: [String] = []) {
        self.token = token
        self.expiresAt = expiresAt
        self.refreshToken = refreshToken
        self.permissions = permissions
    }
}

// MARK: - Keychain Manager

/// Secure keychain storage for authentication credentials
public class KeychainManager {
    private let service: String
    private let accessGroup: String?
    
    public init(service: String = "com.schillinger.sdk", accessGroup: String? = nil) {
        self.service = service
        self.accessGroup = accessGroup
    }
    
    /// Store credentials securely in keychain
    public func store(credentials: AuthCredentials, for account: String) throws {
        let data = try JSONEncoder().encode(credentials)
        try store(data: data, for: account)
    }
    
    /// Retrieve credentials from keychain
    public func retrieveCredentials(for account: String) throws -> AuthCredentials? {
        guard let data = try retrieve(for: account) else { return nil }
        return try JSONDecoder().decode(AuthCredentials.self, from: data)
    }
    
    /// Store token info securely in keychain
    public func store(tokenInfo: TokenInfo, for account: String) throws {
        let data = try JSONEncoder().encode(tokenInfo)
        try store(data: data, for: "\(account).token")
    }
    
    /// Retrieve token info from keychain
    public func retrieveTokenInfo(for account: String) throws -> TokenInfo? {
        guard let data = try retrieve(for: "\(account).token") else { return nil }
        return try JSONDecoder().decode(TokenInfo.self, from: data)
    }
    
    /// Delete credentials from keychain
    public func delete(for account: String) throws {
        try delete(account: account)
        try delete(account: "\(account).token")
    }
    
    /// Check if credentials exist for account
    public func hasCredentials(for account: String) -> Bool {
        return (try? retrieve(for: account)) != nil
    }
    
    // MARK: - Private Methods
    
    private func store(data: Data, for account: String) throws {
        // Delete existing item first
        try? delete(account: account)
        
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        let status = SecItemAdd(query as CFDictionary, nil)
        
        guard status == errSecSuccess else {
            throw ErrorHandler.handle(SchillingerError.authentication(AuthenticationError(
                message: NSLocalizedString("keychain.error.store_failed",
                                         value: "Failed to store credentials in keychain",
                                         comment: "Keychain store error"),
                code: "KEYCHAIN_STORE_ERROR"
            )))
        }
    }
    
    private func retrieve(for account: String) throws -> Data? {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        switch status {
        case errSecSuccess:
            return result as? Data
        case errSecItemNotFound:
            return nil
        default:
            throw ErrorHandler.handle(SchillingerError.authentication(AuthenticationError(
                message: NSLocalizedString("keychain.error.retrieve_failed",
                                         value: "Failed to retrieve credentials from keychain",
                                         comment: "Keychain retrieve error"),
                code: "KEYCHAIN_RETRIEVE_ERROR"
            )))
        }
    }
    
    private func delete(account: String) throws {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw ErrorHandler.handle(SchillingerError.authentication(AuthenticationError(
                message: NSLocalizedString("keychain.error.delete_failed",
                                         value: "Failed to delete credentials from keychain",
                                         comment: "Keychain delete error"),
                code: "KEYCHAIN_DELETE_ERROR"
            )))
        }
    }
}

// MARK: - Authentication Manager

/// Manages authentication state and token lifecycle
public class AuthenticationManager {
    private let keychainManager: KeychainManager
    private let account: String
    private var tokenInfo: TokenInfo?
    private var tokenRefreshTask: Task<Void, Never>?
    
    public init(account: String = "default", keychainManager: KeychainManager = KeychainManager()) {
        self.account = account
        self.keychainManager = keychainManager
        
        // Try to load existing token info
        self.tokenInfo = try? keychainManager.retrieveTokenInfo(for: account)
    }
    
    deinit {
        tokenRefreshTask?.cancel()
    }
    
    /// Authenticate with the provided credentials
    public func authenticate(credentials: AuthCredentials, apiUrl: String) async -> Result<AuthResult, SchillingerError> {
        do {
            // Validate credentials
            try validateCredentials(credentials)
            
            // Store credentials securely
            try keychainManager.store(credentials: credentials, for: account)
            
            // Perform authentication request
            let result = await performAuthentication(credentials: credentials, apiUrl: apiUrl)
            
            switch result {
            case .success(let authResult):
                if authResult.success, let token = authResult.token {
                    // Store token info
                    let tokenInfo = TokenInfo(
                        token: token,
                        expiresAt: authResult.expiresAt,
                        refreshToken: authResult.refreshToken,
                        permissions: authResult.permissions?.map { $0.resource } ?? []
                    )
                    
                    try keychainManager.store(tokenInfo: tokenInfo, for: account)
                    self.tokenInfo = tokenInfo
                    
                    // Start automatic token refresh if needed
                    startTokenRefreshTimer()
                }
                return .success(authResult)
                
            case .failure(let error):
                return .failure(error)
            }
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    /// Check if currently authenticated
    public func isAuthenticated() -> Bool {
        guard let tokenInfo = tokenInfo else { return false }
        
        // Check if token is expired
        if let expiresAt = tokenInfo.expiresAt, expiresAt <= Date() {
            return false
        }
        
        return true
    }
    
    /// Get current token for API requests
    public func getCurrentToken() -> String? {
        guard isAuthenticated() else { return nil }
        return tokenInfo?.token
    }
    
    /// Get current user permissions
    public func getPermissions() -> [String] {
        return tokenInfo?.permissions ?? []
    }
    
    /// Check if user has specific permission
    public func hasPermission(_ permission: String) -> Bool {
        let permissions = getPermissions()
        return permissions.contains(permission) || permissions.contains("admin")
    }
    
    /// Get token information
    public func getTokenInfo() -> TokenInfo? {
        return tokenInfo
    }
    
    /// Check if token is about to expire (within 5 minutes)
    public func isTokenExpiringSoon() -> Bool {
        guard let expiresAt = tokenInfo?.expiresAt else { return false }
        let fiveMinutesFromNow = Date().addingTimeInterval(5 * 60)
        return expiresAt <= fiveMinutesFromNow
    }
    
    /// Refresh the current token
    public func refreshToken(apiUrl: String) async -> Result<Void, SchillingerError> {
        guard let tokenInfo = tokenInfo,
              let refreshToken = tokenInfo.refreshToken else {
            return .failure(.authentication(AuthenticationError(
                message: NSLocalizedString("auth.error.no_refresh_token",
                                         value: "No refresh token available",
                                         comment: "Auth error message"),
                code: "NO_REFRESH_TOKEN"
            )))
        }
        
        let result = await performTokenRefresh(refreshToken: refreshToken, apiUrl: apiUrl)
        
        switch result {
        case .success(let newTokenInfo):
            do {
                try keychainManager.store(tokenInfo: newTokenInfo, for: account)
                self.tokenInfo = newTokenInfo
                return .success(())
            } catch {
                return .failure(ErrorHandler.handle(error))
            }
            
        case .failure(let error):
            // Clear invalid token
            self.tokenInfo = nil
            try? keychainManager.delete(for: account)
            return .failure(error)
        }
    }
    
    /// Logout and clear all authentication data
    public func logout() async {
        tokenRefreshTask?.cancel()
        tokenRefreshTask = nil
        tokenInfo = nil
        try? keychainManager.delete(for: account)
    }
    
    // MARK: - Private Methods
    
    private func validateCredentials(_ credentials: AuthCredentials) throws {
        let hasApiKey = credentials.apiKey?.isEmpty == false
        let hasClerkToken = credentials.clerkToken?.isEmpty == false
        let hasCustomAuth = credentials.customAuth?.isEmpty == false
        
        guard hasApiKey || hasClerkToken || hasCustomAuth else {
            throw ErrorHandler.handle(SchillingerError.validation(ValidationError(
                field: "credentials",
                value: nil,
                expected: "apiKey, clerkToken, or customAuth"
            )))
        }
    }
    
    private func performAuthentication(credentials: AuthCredentials, apiUrl: String) async -> Result<AuthResult, SchillingerError> {
        guard let url = URL(string: "\(apiUrl)/auth/login") else {
            return .failure(.configuration(ConfigurationError(field: "apiUrl", message: "Invalid API URL")))
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            let requestBody = try JSONEncoder().encode(credentials)
            request.httpBody = requestBody
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.network(NetworkError(message: "Invalid response")))
            }

            if httpResponse.statusCode == 200 {
                let authResult = try JSONDecoder().decode(AuthResult.self, from: data)
                return .success(authResult)
            } else {
                let errorMessage = String(data: data, encoding: .utf8) ?? "Authentication failed"
                return .failure(.authentication(AuthenticationError(message: errorMessage)))
            }
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    private func performTokenRefresh(refreshToken: String, apiUrl: String) async -> Result<TokenInfo, SchillingerError> {
        guard let url = URL(string: "\(apiUrl)/auth/refresh") else {
            return .failure(.configuration(ConfigurationError(field: "apiUrl", message: "Invalid API URL")))
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            let requestBody = try JSONEncoder().encode(["refreshToken": refreshToken])
            request.httpBody = requestBody

            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.network(NetworkError(message: "Invalid response")))
            }

            if httpResponse.statusCode == 200 {
                let refreshResult = try JSONDecoder().decode(AuthResult.self, from: data)

                guard let token = refreshResult.token else {
                    return .failure(.authentication(AuthenticationError(message: "No token in refresh response")))
                }

                let newTokenInfo = TokenInfo(
                    token: token,
                    expiresAt: refreshResult.expiresAt,
                    refreshToken: refreshResult.refreshToken ?? refreshToken,
                    permissions: refreshResult.permissions?.map { $0.resource } ?? []
                )

                return .success(newTokenInfo)
            } else {
                let errorMessage = String(data: data, encoding: .utf8) ?? "Token refresh failed"
                return .failure(.authentication(AuthenticationError(message: errorMessage)))
            }
        } catch {
            return .failure(ErrorHandler.handle(error))
        }
    }
    
    private func startTokenRefreshTimer() {
        tokenRefreshTask?.cancel()
        
        tokenRefreshTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 60_000_000_000) // 1 minute
                
                if isTokenExpiringSoon() {
                    // Note: This would need the API URL to be stored or passed in
                    // For now, we'll just log that refresh is needed
                    print("Token refresh needed but no API URL available")
                }
            }
        }
    }
}