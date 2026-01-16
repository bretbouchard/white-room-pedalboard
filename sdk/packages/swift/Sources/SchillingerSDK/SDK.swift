// Re-export all public types and classes
@_exported import Foundation

// MARK: - Main SDK Export

/// The main Schillinger SDK for iOS/macOS applications
/// 
/// This SDK provides comprehensive access to the Schillinger System's mathematical music composition capabilities
/// with native Swift async/await patterns, Codable protocols, Keychain integration, and comprehensive error handling.
///
/// ## Features
/// - **Rhythm Generation**: Create rhythmic patterns using Schillinger's mathematical principles
/// - **Harmony Analysis**: Generate and analyze chord progressions
/// - **Melody Creation**: Build melodic lines with various contours and styles  
/// - **Composition Tools**: Create complete musical compositions with structure analysis
/// - **Reverse Analysis**: Infer Schillinger parameters from existing musical patterns
/// - **Offline Support**: Core mathematical functions work without internet connectivity
/// - **Secure Authentication**: Keychain-based credential storage
/// - **Comprehensive Error Handling**: Localized error messages with recovery suggestions
///
/// ## Usage
/// ```swift
/// import SchillingerSDK
///
/// // Initialize SDK
/// let sdk = SchillingerSDK()
///
/// // Authenticate
/// let credentials = AuthCredentials(apiKey: "your-api-key")
/// let authResult = await sdk.authenticate(credentials: credentials)
///
/// // Generate rhythm pattern
/// let rhythmResult = await sdk.rhythm.generateResultant(a: 3, b: 2)
/// ```
///
/// ## Requirements
/// - iOS 15.0+ / macOS 12.0+ / watchOS 8.0+ / tvOS 15.0+
/// - Swift 5.9+

// MARK: - Version Information

/// SDK version information
public struct SDKVersion {
    /// Current SDK version
    public static let version = "1.0.0"
    
    /// SDK build number
    public static let build = "1"
    
    /// Minimum supported iOS version
    public static let minimumIOSVersion = "15.0"
    
    /// Minimum supported macOS version
    public static let minimumMacOSVersion = "12.0"
    
    /// SDK name
    public static let name = "SchillingerSDK"
    
    /// Full version string
    public static let fullVersion = "\(name) \(version) (build \(build))"
}