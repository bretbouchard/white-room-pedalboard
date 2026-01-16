import Foundation

// MARK: - Error Types

/// Concrete error enum for all Schillinger SDK errors
public enum SchillingerError: LocalizedError {
    case validation(ValidationError)
    case network(NetworkError)
    case authentication(AuthenticationError)
    case processing(ProcessingError)
    case configuration(ConfigurationError)
    case rateLimit(RateLimitError)
    case cache(CacheError)
    case offline(OfflineError)
    
    public var code: String {
        switch self {
        case .validation(let error): return error.code
        case .network(let error): return error.code
        case .authentication(let error): return error.code
        case .processing(let error): return error.code
        case .configuration(let error): return error.code
        case .rateLimit(let error): return error.code
        case .cache(let error): return error.code
        case .offline(let error): return error.code
        }
    }
    
    public var category: ErrorCategory {
        switch self {
        case .validation(let error): return error.category
        case .network(let error): return error.category
        case .authentication(let error): return error.category
        case .processing(let error): return error.category
        case .configuration(let error): return error.category
        case .rateLimit(let error): return error.category
        case .cache(let error): return error.category
        case .offline(let error): return error.category
        }
    }
    
    public var details: [String: Any]? {
        switch self {
        case .validation(let error): return error.details
        case .network(let error): return error.details
        case .authentication(let error): return error.details
        case .processing(let error): return error.details
        case .configuration(let error): return error.details
        case .rateLimit(let error): return error.details
        case .cache(let error): return error.details
        case .offline(let error): return error.details
        }
    }
    
    public var suggestions: [String] {
        switch self {
        case .validation(let error): return error.suggestions
        case .network(let error): return error.suggestions
        case .authentication(let error): return error.suggestions
        case .processing(let error): return error.suggestions
        case .configuration(let error): return error.suggestions
        case .rateLimit(let error): return error.suggestions
        case .cache(let error): return error.suggestions
        case .offline(let error): return error.suggestions
        }
    }
    
    public var errorDescription: String? {
        switch self {
        case .validation(let error): return error.errorDescription
        case .network(let error): return error.errorDescription
        case .authentication(let error): return error.errorDescription
        case .processing(let error): return error.errorDescription
        case .configuration(let error): return error.errorDescription
        case .rateLimit(let error): return error.errorDescription
        case .cache(let error): return error.errorDescription
        case .offline(let error): return error.errorDescription
        }
    }
    
    public var failureReason: String? {
        switch self {
        case .validation(let error): return error.failureReason
        case .network(let error): return error.failureReason
        case .authentication(let error): return error.failureReason
        case .processing(let error): return error.failureReason
        case .configuration(let error): return error.failureReason
        case .rateLimit(let error): return error.failureReason
        case .cache(let error): return error.failureReason
        case .offline(let error): return error.failureReason
        }
    }
    
    public var recoverySuggestion: String? {
        switch self {
        case .validation(let error): return error.recoverySuggestion
        case .network(let error): return error.recoverySuggestion
        case .authentication(let error): return error.recoverySuggestion
        case .processing(let error): return error.recoverySuggestion
        case .configuration(let error): return error.recoverySuggestion
        case .rateLimit(let error): return error.recoverySuggestion
        case .cache(let error): return error.recoverySuggestion
        case .offline(let error): return error.recoverySuggestion
        }
    }
}

/// Error categories for better error handling
public enum ErrorCategory: String, CaseIterable {
    case validation
    case network
    case authentication
    case processing
    case configuration
    case cache
    case offline
}

// MARK: - Specific Error Types

/// Validation errors for input parameters
public struct ValidationError: LocalizedError {
    public let code: String
    public let category: ErrorCategory = .validation
    public let field: String
    public let value: Any?
    public let expected: String
    public let details: [String: Any]?
    public let suggestions: [String]
    
    public init(field: String, value: Any?, expected: String, code: String = "VALIDATION_ERROR") {
        self.field = field
        self.value = value
        self.expected = expected
        self.code = code
        self.details = [
            "field": field,
            "value": value as Any,
            "expected": expected
        ]
        self.suggestions = [
            NSLocalizedString("validation.suggestion.check_field", 
                            value: "Please provide a valid \(field) value", 
                            comment: "Validation error suggestion")
        ]
    }
    
    public var errorDescription: String? {
        return NSLocalizedString("validation.error.invalid_field", 
                                value: "Invalid \(field): expected \(expected), got \(String(describing: value))", 
                                comment: "Validation error description")
    }
    
    public var failureReason: String? {
        return NSLocalizedString("validation.failure.invalid_input", 
                                value: "The provided input does not meet the required format", 
                                comment: "Validation failure reason")
    }
    
    public var recoverySuggestion: String? {
        return suggestions.joined(separator: "\n")
    }
}

/// Network-related errors
public struct NetworkError: LocalizedError {
    public let code: String
    public let category: ErrorCategory = .network
    public let statusCode: Int?
    public let details: [String: Any]?
    public let suggestions: [String]
    private let message: String
    
    public init(message: String, statusCode: Int? = nil, code: String = "NETWORK_ERROR") {
        self.message = message
        self.statusCode = statusCode
        self.code = code
        self.details = statusCode.map { ["statusCode": $0] }
        self.suggestions = [
            NSLocalizedString("network.suggestion.check_connection", 
                            value: "Check your internet connection", 
                            comment: "Network error suggestion"),
            NSLocalizedString("network.suggestion.verify_endpoint", 
                            value: "Verify API endpoint is accessible", 
                            comment: "Network error suggestion"),
            NSLocalizedString("network.suggestion.retry", 
                            value: "Try again in a few moments", 
                            comment: "Network error suggestion")
        ]
    }
    
    public var errorDescription: String? {
        return message
    }
    
    public var failureReason: String? {
        if let statusCode = statusCode {
            return NSLocalizedString("network.failure.http_error", 
                                    value: "HTTP error \(statusCode)", 
                                    comment: "Network failure reason")
        }
        return NSLocalizedString("network.failure.connection", 
                                value: "Network connection failed", 
                                comment: "Network failure reason")
    }
    
    public var recoverySuggestion: String? {
        return suggestions.joined(separator: "\n")
    }
}

/// Authentication-related errors
public struct AuthenticationError: LocalizedError {
    public let code: String
    public let category: ErrorCategory = .authentication
    public let details: [String: Any]?
    public let suggestions: [String]
    private let message: String
    
    public init(message: String, code: String = "AUTH_ERROR") {
        self.message = message
        self.code = code
        self.details = nil
        self.suggestions = [
            NSLocalizedString("auth.suggestion.check_credentials", 
                            value: "Check your API credentials", 
                            comment: "Auth error suggestion"),
            NSLocalizedString("auth.suggestion.check_token", 
                            value: "Ensure your token is not expired", 
                            comment: "Auth error suggestion"),
            NSLocalizedString("auth.suggestion.contact_support", 
                            value: "Contact support if the issue persists", 
                            comment: "Auth error suggestion")
        ]
    }
    
    public var errorDescription: String? {
        return message
    }
    
    public var failureReason: String? {
        return NSLocalizedString("auth.failure.invalid_credentials", 
                                value: "Authentication credentials are invalid or expired", 
                                comment: "Auth failure reason")
    }
    
    public var recoverySuggestion: String? {
        return suggestions.joined(separator: "\n")
    }
}

/// Processing-related errors
public struct ProcessingError: LocalizedError {
    public let code: String
    public let category: ErrorCategory = .processing
    public let operation: String
    public let details: [String: Any]?
    public let suggestions: [String]
    private let message: String
    
    public init(operation: String, details: String, code: String = "PROCESSING_ERROR") {
        self.operation = operation
        self.message = NSLocalizedString("processing.error.failed_operation", 
                                       value: "Failed to \(operation): \(details)", 
                                       comment: "Processing error message")
        self.code = code
        self.details = ["operation": operation]
        self.suggestions = [
            NSLocalizedString("processing.suggestion.different_params", 
                            value: "Try with different parameters", 
                            comment: "Processing error suggestion"),
            NSLocalizedString("processing.suggestion.check_format", 
                            value: "Check input data format", 
                            comment: "Processing error suggestion"),
            NSLocalizedString("processing.suggestion.reduce_complexity", 
                            value: "Reduce complexity if applicable", 
                            comment: "Processing error suggestion")
        ]
    }
    
    public var errorDescription: String? {
        return message
    }
    
    public var failureReason: String? {
        return NSLocalizedString("processing.failure.operation_failed", 
                                value: "The requested operation could not be completed", 
                                comment: "Processing failure reason")
    }
    
    public var recoverySuggestion: String? {
        return suggestions.joined(separator: "\n")
    }
}

/// Configuration-related errors
public struct ConfigurationError: LocalizedError {
    public let code: String
    public let category: ErrorCategory = .configuration
    public let field: String
    public let details: [String: Any]?
    public let suggestions: [String]
    private let message: String
    
    public init(field: String, message: String, code: String = "CONFIG_ERROR") {
        self.field = field
        self.message = NSLocalizedString("config.error.invalid_field", 
                                       value: "Invalid configuration for \(field): \(message)", 
                                       comment: "Configuration error message")
        self.code = code
        self.details = ["field": field]
        self.suggestions = [
            NSLocalizedString("config.suggestion.check_docs", 
                            value: "Check the documentation for valid configuration options", 
                            comment: "Configuration error suggestion"),
            NSLocalizedString("config.suggestion.use_defaults", 
                            value: "Use default values if unsure", 
                            comment: "Configuration error suggestion")
        ]
    }
    
    public var errorDescription: String? {
        return message
    }
    
    public var failureReason: String? {
        return NSLocalizedString("config.failure.invalid_config", 
                                value: "The provided configuration is invalid", 
                                comment: "Configuration failure reason")
    }
    
    public var recoverySuggestion: String? {
        return suggestions.joined(separator: "\n")
    }
}

/// Rate limiting errors
public struct RateLimitError: LocalizedError {
    public let code: String = "RATE_LIMIT_ERROR"
    public let category: ErrorCategory = .network
    public let retryAfter: TimeInterval
    public let details: [String: Any]?
    public let suggestions: [String]
    
    public init(retryAfter: TimeInterval, endpoint: String? = nil) {
        self.retryAfter = retryAfter
        self.details = endpoint.map { ["endpoint": $0] }
        self.suggestions = [
            NSLocalizedString("rate_limit.suggestion.wait", 
                            value: "Wait \(Int(retryAfter)) seconds before retrying", 
                            comment: "Rate limit error suggestion"),
            NSLocalizedString("rate_limit.suggestion.reduce_requests", 
                            value: "Reduce the frequency of requests", 
                            comment: "Rate limit error suggestion")
        ]
    }
    
    public var errorDescription: String? {
        return NSLocalizedString("rate_limit.error.exceeded", 
                                value: "Rate limit exceeded. Please wait \(Int(retryAfter)) seconds", 
                                comment: "Rate limit error description")
    }
    
    public var failureReason: String? {
        return NSLocalizedString("rate_limit.failure.too_many_requests", 
                                value: "Too many requests sent in a short period", 
                                comment: "Rate limit failure reason")
    }
    
    public var recoverySuggestion: String? {
        return suggestions.joined(separator: "\n")
    }
}

/// Cache-related errors
public struct CacheError: LocalizedError {
    public let code: String
    public let category: ErrorCategory = .cache
    public let details: [String: Any]?
    public let suggestions: [String]
    private let message: String
    
    public init(message: String, code: String = "CACHE_ERROR") {
        self.message = message
        self.code = code
        self.details = nil
        self.suggestions = [
            NSLocalizedString("cache.suggestion.clear_cache", 
                            value: "Try clearing the cache", 
                            comment: "Cache error suggestion"),
            NSLocalizedString("cache.suggestion.disable_cache", 
                            value: "Disable caching temporarily", 
                            comment: "Cache error suggestion")
        ]
    }
    
    public var errorDescription: String? {
        return message
    }
    
    public var failureReason: String? {
        return NSLocalizedString("cache.failure.operation_failed", 
                                value: "Cache operation failed", 
                                comment: "Cache failure reason")
    }
    
    public var recoverySuggestion: String? {
        return suggestions.joined(separator: "\n")
    }
}

/// Offline mode errors
public struct OfflineError: LocalizedError {
    public let code: String = "OFFLINE_ERROR"
    public let category: ErrorCategory = .offline
    public let operation: String
    public let details: [String: Any]?
    public let suggestions: [String]
    
    public init(operation: String) {
        self.operation = operation
        self.details = ["operation": operation]
        self.suggestions = [
            NSLocalizedString("offline.suggestion.check_connection", 
                            value: "Check your internet connection", 
                            comment: "Offline error suggestion"),
            NSLocalizedString("offline.suggestion.use_offline_features", 
                            value: "Use offline-capable features only", 
                            comment: "Offline error suggestion")
        ]
    }
    
    public var errorDescription: String? {
        return NSLocalizedString("offline.error.operation_unavailable", 
                                value: "Operation '\(operation)' is not available in offline mode", 
                                comment: "Offline error description")
    }
    
    public var failureReason: String? {
        return NSLocalizedString("offline.failure.no_connection", 
                                value: "No internet connection available", 
                                comment: "Offline failure reason")
    }
    
    public var recoverySuggestion: String? {
        return suggestions.joined(separator: "\n")
    }
}

// MARK: - Error Handler

/// Centralized error handling utility
public struct ErrorHandler {
    /// Handle and transform errors into appropriate Schillinger errors
    public static func handle(_ error: Error) -> SchillingerError {
        if let schillingerError = error as? SchillingerError {
            return schillingerError
        }
        
        // Handle URLSession errors
        if let urlError = error as? URLError {
            return handleURLError(urlError)
        }
        
        // Handle JSON decoding errors
        if let decodingError = error as? DecodingError {
            return handleDecodingError(decodingError)
        }
        
        // Handle JSON encoding errors
        if let encodingError = error as? EncodingError {
            return handleEncodingError(encodingError)
        }
        
        // Generic error fallback
        return .processing(ProcessingError(
            operation: "unknown",
            details: error.localizedDescription
        ))
    }
    
    private static func handleURLError(_ error: URLError) -> SchillingerError {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost:
            return .network(NetworkError(
                message: NSLocalizedString("network.error.no_connection", 
                                         value: "No internet connection", 
                                         comment: "Network error message"),
                statusCode: nil
            ))
        case .timedOut:
            return .network(NetworkError(
                message: NSLocalizedString("network.error.timeout", 
                                         value: "Request timed out", 
                                         comment: "Network error message"),
                statusCode: nil
            ))
        case .badURL:
            return .configuration(ConfigurationError(
                field: "apiUrl",
                message: NSLocalizedString("config.error.invalid_url", 
                                         value: "Invalid API URL", 
                                         comment: "Configuration error message")
            ))
        default:
            return .network(NetworkError(
                message: error.localizedDescription,
                statusCode: nil
            ))
        }
    }
    
    private static func handleDecodingError(_ error: DecodingError) -> SchillingerError {
        switch error {
        case .typeMismatch(let type, let context):
            return .processing(ProcessingError(
                operation: "decode response",
                details: NSLocalizedString("processing.error.type_mismatch", 
                                         value: "Expected \(type) at \(context.codingPath)", 
                                         comment: "Processing error details")
            ))
        case .valueNotFound(let type, let context):
            return .processing(ProcessingError(
                operation: "decode response",
                details: NSLocalizedString("processing.error.value_not_found", 
                                         value: "Missing \(type) at \(context.codingPath)", 
                                         comment: "Processing error details")
            ))
        case .keyNotFound(let key, let context):
            return .processing(ProcessingError(
                operation: "decode response",
                details: NSLocalizedString("processing.error.key_not_found", 
                                         value: "Missing key '\(key.stringValue)' at \(context.codingPath)", 
                                         comment: "Processing error details")
            ))
        case .dataCorrupted(let context):
            return .processing(ProcessingError(
                operation: "decode response",
                details: NSLocalizedString("processing.error.data_corrupted", 
                                         value: "Corrupted data at \(context.codingPath)", 
                                         comment: "Processing error details")
            ))
        @unknown default:
            return .processing(ProcessingError(
                operation: "decode response",
                details: error.localizedDescription
            ))
        }
    }
    
    private static func handleEncodingError(_ error: EncodingError) -> SchillingerError {
        switch error {
        case .invalidValue(let value, let context):
            return .processing(ProcessingError(
                operation: "encode request",
                details: NSLocalizedString("processing.error.invalid_value", 
                                         value: "Invalid value \(value) at \(context.codingPath)", 
                                         comment: "Processing error details")
            ))
        @unknown default:
            return .processing(ProcessingError(
                operation: "encode request",
                details: error.localizedDescription
            ))
        }
    }
}

// MARK: - Result Extensions

extension Result where Failure == Error {
    /// Map error to SchillingerError
    public func mapError() -> Result<Success, SchillingerError> {
        return mapError { ErrorHandler.handle($0) }
    }
}