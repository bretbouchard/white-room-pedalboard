//
//  SiriOrderingIntents_tvOS.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

#if os(tvOS)

import Foundation
import Intents
import SwiftUI

// =============================================================================
// MARK: - Order Song Intent (INIntent Implementation)
// =============================================================================

/**
 Siri intent for ordering songs with natural language

 This is the complete INIntent implementation that integrates with Siri's
 intent system for voice commands and suggestions.

 Users can say phrases like:
 - "Order a tense accelerating cue"
 - "Create an ambient loop"
 - "Make it more volatile"
 - "Switch to piano performance"
 - "Use HBO template"

 The intent handles all voice commands, donates interactions for Siri
 suggestions, and integrates with the OrderSongScreen UI.
 */
@available(tvOS 15.0, *)
public class OrderSongIntent: NSObject, INIntent {

    // MARK: - INIntent Protocol Implementation

    public var identifier: String {
        return "com.whiteroom.OrderSong"
    }

    // Required by INIntent - must be unique
    public var kind: String {
        return "OrderSong"
    }

    // Required by INIntent - grouping for UI organization
    public var intentDescription: INIntentDescription {
        return INIntentDescription(
            identifier: identifier,
            title: "Order a Song",
            subtitle: "Create music with voice commands",
            parameters: []
        )
    }

    // MARK: - Intent Properties

    // MARK: - Intent Properties

    public var name: String {
        return "OrderSong"
    }

    public var identifier: String? {
        return "com.whiteroom.OrderSong"
    }

    // MARK: - Intent Parameters

    /// The song name
    public var songName: String?

    /// Musical intent (song, cue, loop, etc.)
    public var intent: Intent?

    /// Motion type (static, accelerating, etc.)
    public var motion: Motion?

    /// Harmonic behavior
    public var harmonicBehavior: HarmonicBehavior?

    /// Certainty level (0.0 - 1.0)
    public var certainty: Double?

    /// Template name
    public var template: SongOrderTemplate?

    // MARK: - Initialization

    public init(
        songName: String? = nil,
        intent: Intent? = nil,
        motion: Motion? = nil,
        harmonicBehavior: HarmonicBehavior? = nil,
        certainty: Double? = nil,
        template: SongOrderTemplate? = nil
    ) {
        self.songName = songName
        self.intent = intent
        self.motion = motion
        self.harmonicBehavior = harmonicBehavior
        self.certainty = certainty
        self.template = template
        super.init()
    }

    // MARK: - Intent Handling

    /// Create a SongOrderContract from intent parameters
    public func createContract() -> SongOrderContract {
        // If template is specified, use it as base
        var baseContract: SongOrderContract
        if let template = template {
            baseContract = template.createContract(name: songName ?? "")
        } else {
            baseContract = SongOrderContract(
                name: songName ?? "Voice Command",
                intent: intent ?? .song,
                motion: motion ?? .static,
                harmonicBehavior: harmonicBehavior ?? .static,
                certainty: certainty ?? 0.5,
                identityLocks: IdentityLocks(),
                evolutionMode: .adaptive
            )
        }

        // Override with specific parameters if provided
        if let intent = intent {
            baseContract.intent = intent
        }
        if let motion = motion {
            baseContract.motion = motion
        }
        if let harmonicBehavior = harmonicBehavior {
            baseContract.harmonicBehavior = harmonicBehavior
        }
        if let certainty = certainty {
            baseContract.certainty = certainty
        }

        return baseContract
    }

    /// Generate voice confirmation message
    public func confirmationMessage() -> String {
        var parts: [String] = []

        if let template = template {
            parts.append("Created \(template.displayName)")
        } else {
            if let intent = intent {
                parts.append(intent.displayName.lowercased())
            }
            if let motion = motion {
                parts.append(motion.displayName.lowercased())
            }
            if let harmonicBehavior = harmonicBehavior {
                parts.append("\(harmonicBehavior.displayName) harmony")
            }
        }

        if let certainty = certainty {
            let certaintyLabel: String
            switch certainty {
            case 0.0..<0.25: certaintyLabel = "certain"
            case 0.25..<0.5: certaintyLabel = "tense"
            case 0.5..<0.75: certaintyLabel = "unstable"
            default: certaintyLabel = "volatile"
            }
            parts.append("with \(certaintyLabel) certainty")
        }

        if parts.isEmpty {
            return "Song created"
        }

        return "Created " + parts.joined(separator: " ")
    }

    // MARK: - INInteraction Donation

    /**
     Donate this intent to Siri for suggestions

     Calling this after user actions helps Siri learn when to suggest
     this voice command in the future.
     */
    public func donate() {
        let interaction = INInteraction(intent: self, response: nil)
        interaction.identifier = UUID().uuidString

        INInteraction.donate([interaction]) { error in
            if let error = error {
                print("Failed to donate OrderSong intent: \(error.localizedDescription)")
            } else {
                print("Successfully donated OrderSong intent to Siri")
            }
        }
    }

    /**
     Donate intent with specific suggestions

     Use this when a user performs an action that could be repeated via Siri.
     */
    public static func donateTemplateShortcut(template: SongOrderTemplate, songName: String) {
        let intent = OrderSongIntent(
            songName: songName,
            template: template
        )
        intent.donate()
    }

    /**
     Donate intent with custom parameters

     Use this when a user creates a song with specific parameters.
     */
    public static func donateCustomParameters(
        songName: String,
        intent: Intent,
        motion: Motion,
        harmonicBehavior: HarmonicBehavior,
        certainty: Double
    ) {
        let orderIntent = OrderSongIntent(
            songName: songName,
            intent: intent,
            motion: motion,
            harmonicBehavior: harmonicBehavior,
            certainty: certainty
        )
        orderIntent.donate()
    }
}

// =============================================================================
// MARK: - Intent Response
// =============================================================================

/**
 Response object for OrderSongIntent handling

 Provides success/failure status and user-facing messages.
 */
@available(tvOS 15.0, *)
public class OrderSongIntentResponse: NSObject, INIntentResponse {

    public var code: Code
    public var userActivity: NSUserActivity?
    public var contract: SongOrderContract?
    public var errorMessage: String?

    public enum Code: Int {
        case success = 0
        case unspecifiedFailure = 1
        case invalidParameters = 2
        case confirmationRequired = 3
    }

    public init(
        code: Code,
        userActivity: NSUserActivity? = nil,
        contract: SongOrderContract? = nil,
        errorMessage: String? = nil
    ) {
        self.code = code
        self.userActivity = userActivity
        self.contract = contract
        self.errorMessage = errorMessage
        super.init()
    }

    // Success response with created contract
    public static func success(contract: SongOrderContract) -> OrderSongIntentResponse {
        return OrderSongIntentResponse(
            code: .success,
            contract: contract
        )
    }

    // Failure response with error message
    public static func failure(message: String) -> OrderSongIntentResponse {
        return OrderSongIntentResponse(
            code: .unspecifiedFailure,
            errorMessage: message
        )
    }

    // Validation error response
    public static func validationErrors(_ errors: [String]) -> OrderSongIntentResponse {
        return OrderSongIntentResponse(
            code: .invalidParameters,
            errorMessage: errors.joined(separator: "\n")
        )
    }

    // Confirmation required for conflicts
    public static func confirmationRequired(message: String) -> OrderSongIntentResponse {
        return OrderSongIntentResponse(
            code: .confirmationRequired,
            errorMessage: message
        )
    }
}

// =============================================================================
// MARK: - Intent Handler (Complete Implementation)
// =============================================================================

/**
 Complete intent handler for processing Siri voice commands

 This handler:
 - Parses natural language into structured intents
 - Validates parameters and checks for conflicts
 - Creates SongOrderContract from voice commands
 - Handles errors and provides voice feedback
 - Integrates with OrderSongScreen UI
 - Donates interactions for Siri suggestions
 */
@available(tvOS 15.0, *)
public class OrderSongIntentHandler: NSObject {

    // MARK: - Completion Callback

    /**
     Completion handler for intent processing

     Returns the created contract, error message, or confirmation request.
     */
    public typealias IntentCompletion = (OrderSongIntentResponse) -> Void

    // MARK: - Main Intent Handler

    /**
     Handle OrderSongIntent and create contract

     This is the main entry point for Siri voice commands.
     */
    public func handle(intent: OrderSongIntent, completion: @escaping IntentCompletion) {
        // Validate intent parameters
        let validationErrors = validate(intent)

        // Check for conflicts that require user confirmation
        if !validationErrors.isEmpty {
            let response = OrderSongIntentResponse.confirmationRequired(
                message: generateFeedback(for: intent, validationErrors: validationErrors)
            )
            completion(response)
            return
        }

        // Create contract from intent
        let contract = intent.createContract()

        // Validate the contract
        let contractValidation = contract.validate()
        if !contractValidation.isValid {
            let response = OrderSongIntentResponse.validationErrors(contractValidation.errors)
            completion(response)
            return
        }

        // Donate intent for Siri suggestions
        intent.donate()

        // Return success with created contract
        let response = OrderSongIntentResponse.success(contract: contract)
        completion(response)
    }

    /**
     Handle natural language transcript

     Convenience method for handling raw voice input.
     */
    public func handle(transcript: String, completion: @escaping IntentCompletion) {
        guard let intent = parseIntent(from: transcript) else {
            completion(OrderSongIntentResponse.failure(
                message: "I didn't understand that. Try saying 'Order a tense accelerating cue' or 'Create an ambient loop'"
            ))
            return
        }

        handle(intent: intent, completion: completion)
    }

    // MARK: - Intent Parsing

    /**
     Parse natural language into OrderSongIntent

     Comprehensive natural language parsing that supports:
     - Musical intents (song, cue, loop, ritual, identity)
     - Motion types (static, accelerating, oscillating, colliding, dissolving)
     - Harmonic behaviors (static, revealed, cyclic, expanding, collapsing)
     - Certainty levels (certain, tense, unstable, volatile)
     - Template shortcuts (HBO, ambient, ritual, performance)
     - Parameter modifications ("more volatile", "less certain")
     - Song names ("called X", "named Y")

     Examples:
     - "Order a tense accelerating cue" → Intent: .cue, Motion: .accelerating, Certainty: 0.4
     - "Create an ambient loop" → Intent: .loop, Template: .ambientLoop
     - "Make it more volatile" → Certainty: 1.0
     - "Use HBO template" → Template: .hboCue
     - "New song with revealed harmony" → Intent: .song, Harmony: .revealed
     - "Make it less tense" → Certainty: 0.2
     */
    public func parseIntent(from transcript: String) -> OrderSongIntent? {
        let lowercased = transcript.lowercased()

        var intent: Intent? = nil
        var motion: Motion? = nil
        var harmonicBehavior: HarmonicBehavior? = nil
        var certainty: Double? = nil
        var template: SongOrderTemplate? = nil

        // Parse intent (musical purpose)
        if lowercased.contains("cue") || lowercased.contains("dramatic") {
            intent = .cue
        } else if lowercased.contains("loop") || lowercased.contains("ambient") {
            intent = .loop
        } else if lowercased.contains("ritual") || lowercased.contains("ceremony") {
            intent = .ritual
        } else if lowercased.contains("song") || lowercased.contains("composition") {
            intent = .song
        } else if lowercased.contains("identity") || lowercased.contains("character") {
            intent = .identity
        }

        // Parse motion (how music moves)
        if lowercased.contains("accelerating") || lowercased.contains("build") {
            motion = .accelerating
        } else if lowercased.contains("oscillating") || lowercased.contains("swinging") {
            motion = .oscillating
        } else if lowercased.contains("colliding") || lowercased.contains("clashing") {
            motion = .colliding
        } else if lowercased.contains("dissolving") || lowercased.contains("breaking") {
            motion = .dissolving
        } else if lowercased.contains("static") || lowercased.contains("stable") {
            motion = .static
        }

        // Parse harmony (harmonic behavior)
        if lowercased.contains("revealed") || lowercased.contains("unfolding") {
            harmonicBehavior = .revealed
        } else if lowercased.contains("cyclic") || lowercased.contains("repeating") {
            harmonicBehavior = .cyclic
        } else if lowercased.contains("expanding") || lowercased.contains("growing") {
            harmonicBehavior = .expanding
        } else if lowercased.contains("collapsing") || lowercased.contains("simplifying") {
            harmonicBehavior = .collapsing
        }

        // Parse certainty (predictability)
        if lowercased.contains("volatile") || lowercased.contains("unpredictable") {
            certainty = 1.0
        } else if lowercased.contains("unstable") || lowercased.contains("tension") {
            certainty = 0.6
        } else if lowercased.contains("tense") {
            certainty = 0.4
        } else if lowercased.contains("certain") || lowercased.contains("predictable") {
            certainty = 0.0
        }

        // Parse modifications ("more", "less")
        if lowercased.contains("more volatile") || lowercased.contains("more unpredictable") {
            certainty = 1.0
        } else if lowercased.contains("more unstable") {
            certainty = 0.6
        } else if lowercased.contains("more tense") {
            certainty = 0.4
        } else if lowercased.contains("more certain") || lowercased.contains("more predictable") {
            certainty = 0.0
        } else if lowercased.contains("less volatile") || lowercased.contains("less unpredictable") {
            certainty = 0.0
        } else if lowercased.contains("less tense") {
            certainty = 0.0
        } else if lowercased.contains("less certain") {
            certainty = 1.0
        }

        // Parse template shortcuts
        if lowercased.contains("hbo") || lowercased.contains("film") || lowercased.contains("tv") {
            template = .hboCue
        } else if lowercased.contains("ambient") && lowercased.contains("loop") {
            template = .ambientLoop
        } else if lowercased.contains("ritual") && lowercased.contains("collage") {
            template = .ritualCollage
        } else if lowercased.contains("performance") || lowercased.contains("formal") {
            template = .performancePiece
        }

        // At least one parameter should be specified
        if intent == nil && motion == nil && harmonicBehavior == nil && certainty == nil && template == nil {
            return nil
        }

        return OrderSongIntent(
            songName: extractSongName(from: lowercased),
            intent: intent,
            motion: motion,
            harmonicBehavior: harmonicBehavior,
            certainty: certainty,
            template: template
        )
    }

    // MARK: - Song Name Extraction

    private func extractSongName(from transcript: String) -> String? {
        // Try to extract a song name from the transcript
        // This is a simple implementation - could be enhanced with NLP

        let patterns = [
            "called (.+)",
            "named (.+)",
            "titled (.+)",
            "create (.+)",
            "order (.+)"
        ]

        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: transcript, range: NSRange(transcript.startIndex..., in: transcript)),
               match.numberOfRanges > 1 {
                let nameRange = match.range(at: 1)
                if let swiftRange = Range(nameRange, in: transcript) {
                    return String(transcript[swiftRange]).trimmingCharacters(in: .whitespaces)
                }
            }
        }

        return nil
    }

    // MARK: - Intent Validation

    /**
     Validate intent and check for conflicts

     Returns validation errors if parameters conflict
     */
    public func validate(_ intent: OrderSongIntent) -> [String] {
        var errors: [String] = []

        // Check for conflicting parameters
        if let motion = intent.motion, let certainty = intent.certainty {
            // Static motion with high certainty is unusual
            if motion == .static && certainty > 0.7 {
                errors.append("Static motion with volatile certainty may not create interesting results")
            }

            // Dissolving motion with high certainty is contradictory
            if motion == .dissolving && certainty < 0.3 {
                errors.append("Dissolving motion works best with some uncertainty")
            }
        }

        // Check template conflicts
        if intent.template != nil {
            if intent.intent != nil || intent.motion != nil || intent.harmonicBehavior != nil {
                errors.append("Template already specifies all musical parameters")
            }
        }

        return errors
    }

    // MARK: - Voice Feedback

    /**
     Generate appropriate voice feedback for the user

     Provides confirmation or asks clarifying questions
     */
    public func generateFeedback(for intent: OrderSongIntent, validationErrors: [String]) -> String {
        if !validationErrors.isEmpty {
            // Warn about conflicts
            return "Warning: \(validationErrors.joined(separator: ". ")) Would you like to continue?"
        }

        // Generate confirmation
        return intent.confirmationMessage()
    }
}

// =============================================================================
// MARK: - Siri Shortcut Helper
// =============================================================================

/**
 Helper for creating and managing Siri shortcuts
 */
@available(tvOS 15.0, *)
public struct SiriShortcutHelper {

    /**
     Create INVoiceShortcut for common templates

     Users can say "HBO Cue" to quickly create a dramatic cue
     */
    public static func createTemplateShortcuts() -> [INVoiceShortcut] {
        var shortcuts: [INVoiceShortcut] = []

        let templates: [(SongOrderTemplate, String)] = [
            (.hboCue, "HBO Cue"),
            (.ambientLoop, "Ambient Loop"),
            (.ritualCollage, "Ritual Collage"),
            (.performancePiece, "Performance Piece")
        ]

        for (template, phrase) in templates {
            let intent = OrderSongIntent(template: template)
            let voiceShortcut = INVoiceShortcut(
                identifier: template.rawValue,
                phrase: INShortcutPhrase(spokenPhrase: phrase, intent: intent),
                isEnabled: true
            )
            shortcuts.append(voiceShortcut)
        }

        return shortcuts
    }

    /**
     Suggested phrases for users to discover Siri capabilities
     */
    public static let suggestedPhrases = [
        "Order a tense accelerating cue",
        "Create an ambient loop",
        "Make it more volatile",
        "Use HBO template",
        "Create a song with revealed harmony",
        "Order a ritual collage",
        "Create a certain static composition",
        "Make it unstable and oscillating"
    ]
}

// =============================================================================
// MARK: - Voice Command View Modifier (Complete UI Integration)
// =============================================================================

/**
 Complete UI integration modifier for Siri voice commands

 This modifier:
 - Requests Siri authorization on appear
 - Listens for voice command notifications
 - Parses natural language into intents
 - Validates and applies voice commands to contracts
 - Shows voice feedback overlays
 - Handles errors and confirmation requests
 - Donates interactions for Siri suggestions
 - Integrates seamlessly with OrderSongScreen

 Usage:
 ```swift
 OrderSongScreen_tvOS()
     .voiceCommands(contract: $contract) { feedback in
         print("Voice feedback: \(feedback)")
     }
 ```
 */
struct VoiceCommandModifier: ViewModifier {
    @Binding var contract: SongOrderContract
    let onVoiceFeedback: (String) -> Void

    @State private var isListening = false
    @State private var voiceFeedback: String? = nil
    @State private var siriAuthorized: Bool = false

    private let handler = OrderSongIntentHandler()

    func body(content: Content) -> some View {
        content
            .onAppear {
                requestSiriAuthorization()
            }
            .onReceive(NotificationCenter.default.publisher(for: .voiceCommand)) { notification in
                if let voiceText = notification.userInfo?["voiceText"] as? String {
                    handleVoiceCommand(voiceText)
                }
            }
            .overlay {
                if let feedback = voiceFeedback {
                    voiceFeedbackOverlay(text: feedback)
                }
            }
    }

    // MARK: - Siri Authorization

    private func requestSiriAuthorization() {
        INPreferences.requestSiriAuthorization { status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    siriAuthorized = true
                    print("✅ Siri authorized for voice commands")
                case .denied:
                    siriAuthorized = false
                    print("❌ Siri authorization denied")
                case .restricted:
                    siriAuthorized = false
                    print("⚠️ Siri authorization restricted")
                case .notDetermined:
                    siriAuthorized = false
                    print("⏳ Siri authorization not determined")
                @unknown default:
                    siriAuthorized = false
                    print("❓ Unknown Siri authorization status")
                }
            }
        }
    }

    // MARK: - Voice Command Handling

    private func handleVoiceCommand(_ text: String) {
        guard siriAuthorized else {
            showFeedback("Siri is not authorized. Please enable Siri in Settings.")
            return
        }

        isListening = true

        // Handle the intent
        handler.handle(transcript: text) { response in
            DispatchQueue.main.async {
                switch response.code {
                case .success:
                    if let newContract = response.contract {
                        // Apply the created contract
                        contract = newContract
                        showFeedback("✅ \(text.capitalized)")
                    }

                case .confirmationRequired:
                    if let message = response.errorMessage {
                        showFeedback("⚠️ \(message)")
                    }

                case .invalidParameters:
                    if let message = response.errorMessage {
                        showFeedback("❌ \(message)")
                    }

                case .unspecifiedFailure:
                    if let message = response.errorMessage {
                        showFeedback("❌ \(message)")
                    }
                }

                isListening = false
            }
        }
    }

    // MARK: - Voice Feedback

    private func showFeedback(_ message: String) {
        voiceFeedback = message
        onVoiceFeedback(message)

        // Auto-dismiss after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            withAnimation {
                voiceFeedback = nil
            }
        }
    }

    private func voiceFeedbackOverlay(text: String) -> some View {
        ZStack {
            // Semi-transparent background
            Color.black.opacity(0.6)
                .ignoresSafeArea()

            // Feedback card
            VStack(spacing: 20) {
                // Siri icon
                Image(systemName: "waveform.and.mic")
                    .font(.system(size: 48))
                    .foregroundColor(.white)
                    .symbolEffect(.pulse)

                // Feedback message
                Text(text)
                    .font(.system(size: 28, weight: .medium))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(4)
                    .padding(.horizontal, 40)
            }
            .padding(48)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(.ultraThinMaterial)
                    .shadow(radius: 20)
            )
            .padding(.horizontal, 60)
        }
        .transition(.opacity.combined(with: .scale(scale: 0.9)))
    }
}

// MARK: - Notification Extension

extension Notification.Name {
    static let voiceCommand = Notification.Name("voiceCommand")
}

// MARK: - View Extension

extension View {
    /**
     Add Siri voice command support to any view

     - Parameters:
       - contract: Binding to SongOrderContract that will be updated by voice
       - onVoiceFeedback: Callback receiving voice feedback messages

     - Returns: View with Siri voice command integration
     */
    func voiceCommands(
        contract: Binding<SongOrderContract>,
        onVoiceFeedback: @escaping (String) -> Void
    ) -> some View {
        modifier(VoiceCommandModifier(contract: contract, onVoiceFeedback: onVoiceFeedback))
    }
}

// =============================================================================
// MARK: - Demo Integration
// =============================================================================

/**
 Demo helper for simulating voice commands during development
 */
#if DEBUG
@available(tvOS 15.0, *)
public class VoiceCommandSimulator {

    public static let shared = VoiceCommandSimulator()

    private init() {}

    /**
     Simulate a voice command for testing without actual Siri
     */
    public func simulateVoiceCommand(_ text: String) {
        NotificationCenter.default.post(
            name: .voiceCommand,
            object: nil,
            userInfo: ["voiceText": text]
        )
    }

    /**
     Demo commands for testing
     */
    public static let demoCommands = [
        "Order a tense accelerating cue",
        "Create an ambient loop",
        "Make it more volatile",
        "Use HBO template",
        "Create a ritual collage",
        "Order a performance piece",
        "Make it certain",
        "Create a song with revealed harmony"
    ]
}
#endif

#endif
