//
//  OrderSongScreen.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Order Song Screen
// =============================================================================

/**
 Main UI for ordering songs with high-level musical parameters

 This screen provides a user-friendly interface for creating SongOrderContract
 without requiring knowledge of Schillinger theory. Users select musical intent,
 motion, harmony, certainty, and evolution modes through intuitive pickers.

 The screen adapts its layout for different platforms:
 - iOS: Touch-optimized with swipe gestures
 - macOS: Mouse/keyboard optimized with compact layout
 - tvOS: Remote-optimized with large focus indicators (future)
 */
public struct OrderSongScreen: View {

    // MARK: - State

    @State private var contract: SongOrderContract
    @State private var isLoading: Bool = false
    @State private var saveError: Error?
    @State private var showingSaveError: Bool = false
    @State private var hasChanges: Bool = false

    // MARK: - Environment

    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Computed Properties

    private var isCompactLayout: Bool {
        horizontalSizeClass == .compact
    }

    // MARK: - Initialization

    public init(
        existingContract: SongOrderContract? = nil,
        template: SongOrderTemplate? = nil
    ) {
        if let existing = existingContract {
            _contract = State(initialValue: existing)
        } else if let template = template {
            _contract = State(initialValue: template.createContract(name: ""))
        } else {
            // Start with blank template
            _contract = State(initialValue: SongOrderContract(
                name: "",
                intent: .song,
                motion: .static,
                harmonicBehavior: .static,
                certainty: 0.5,
                identityLocks: IdentityLocks(),
                evolutionMode: .adaptive
            ))
        }
    }

    // MARK: - Body

    public var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Basic Information
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Song Name")
                            .font(.headline)
                            .foregroundColor(.primary)

                        TextField("Enter song name", text: $contract.name)
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: contract.name) { _ in
                                markChanged()
                            }

                        TextField("Description (optional)", text: bindingDescription)
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: bindingDescription.wrappedValue) { _ in
                                markChanged()
                            }
                    }
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(12)

                    // Musical Intent
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Musical Intent")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Picker("Intent", selection: $contract.intent) {
                            ForEach(Intent.allCases, id: \.self) { intent in
                                Text(intent.displayName).tag(intent)
                            }
                        }
                        .pickerStyle(.segmented)
                        .onChange(of: contract.intent) { _ in
                            markChanged()
                        }

                        Text(contract.intent.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(12)

                    // Motion
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Motion")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Picker("Motion", selection: $contract.motion) {
                            ForEach(Motion.allCases, id: \.self) { motion in
                                Text(motion.displayName).tag(motion)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: contract.motion) { _ in
                            markChanged()
                        }

                        Text(contract.motion.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(12)

                    // Harmonic Behavior
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Harmonic Behavior")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Picker("Harmony", selection: $contract.harmonicBehavior) {
                            ForEach(HarmonicBehavior.allCases, id: \.self) { harmony in
                                Text(harmony.displayName).tag(harmony)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: contract.harmonicBehavior) { _ in
                            markChanged()
                        }

                        Text(contract.harmonicBehavior.description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(12)

                    // Certainty Slider
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Certainty")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Spacer()
                            Text(certaintyLabel)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }

                        Slider(value: $contract.certainty, in: 0...1) {
                            Text("Certainty")
                        } minimumValueLabel: {
                            Text("Certain")
                                .font(.caption)
                        } maximumValueLabel: {
                            Text("Volatile")
                                .font(.caption)
                        }
                        .onChange(of: contract.certainty) { _ in
                            markChanged()
                        }

                        Text(certaintyDescription)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(12)

                    // Identity Locks
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Identity Locks")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Toggle("Lock Rhythm", isOn: $contract.identityLocks.rhythm)
                            .onChange(of: contract.identityLocks.rhythm) { _ in
                                markChanged()
                            }

                        Toggle("Lock Pitch", isOn: $contract.identityLocks.pitch)
                            .onChange(of: contract.identityLocks.pitch) { _ in
                                markChanged()
                            }

                        Toggle("Lock Form", isOn: $contract.identityLocks.form)
                            .onChange(of: contract.identityLocks.form) { _ in
                                markChanged()
                            }

                        Text("Locked elements stay consistent during evolution")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(12)

                    // Evolution Mode
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Evolution Mode")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Picker("Evolution", selection: $contract.evolutionMode) {
                            ForEach(EvolutionMode.allCases, id: \.self) { mode in
                                Text(mode.displayName).tag(mode)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: contract.evolutionMode) { _ in
                            markChanged()
                        }

                        Text(contract.evolutionMode.description)
                            .font(.caption)
                            .foregroundColor(.secondary)

                        if contract.evolutionMode.allowsEvolution {
                            Text("This song will evolve over multiple plays")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(12)

                    // Template Actions
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Templates")
                            .font(.headline)
                            .foregroundColor(.primary)

                        ForEach(SongOrderTemplate.allCases, id: \.self) { template in
                            Button(action: { applyTemplate(template) }) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(template.displayName)
                                            .font(.body)
                                            .foregroundColor(.primary)
                                        Text(template.description)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    }
                                    .padding()
                                    .background(Color.secondary.opacity(0.05))
                                    .cornerRadius(8)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding()
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(12)
                }
                .padding()
            }
            .navigationTitle("Order Song")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        handleCancel()
                    }
                    .disabled(isLoading)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        handleSave()
                    }
                    .disabled(!isValid || isLoading)
                }
            }
            .disabled(isLoading)
            .overlay {
                if isLoading {
                    ProgressOverlay()
                }
            }
            .alert("Save Error", isPresented: $showingSaveError) {
                Button("OK", role: .cancel) { }
            } message: {
                if let error = saveError {
                    Text(error.localizedDescription)
                }
            }
        }
    }

    // MARK: - Computed Properties

    private var bindingDescription: Binding<String> {
        Binding(
            get: { contract.description ?? "" },
            set: { contract.description = $0.isEmpty ? nil : $0 }
        )
    }

    private var isValid: Bool {
        contract.validate().isValid && hasChanges
    }

    private var certaintyLabel: String {
        switch contract.certainty {
        case 0.0..<0.25: return "Certain"
        case 0.25..<0.5: return "Tense"
        case 0.5..<0.75: return "Unstable"
        default: return "Volatile"
        }
    }

    private var certaintyDescription: String {
        switch contract.certainty {
        case 0.0..<0.25:
            return "Highly predictable - same result every time"
        case 0.25..<0.5:
            return "Tightly controlled with slight variation"
        case 0.5..<0.75:
            return "Moderate unpredictability and tension"
        default:
            return "Highly volatile - dramatic changes likely"
        }
    }

    private var intentDescription: String {
        contract.intent.description
    }

    // MARK: - Actions

    private func markChanged() {
        hasChanges = true
    }

    private func applyTemplate(_ template: SongOrderTemplate) {
        let newContract = template.createContract(name: contract.name)
        contract = newContract
        hasChanges = true
    }

    private func handleCancel() {
        dismiss()
    }

    private func handleSave() {
        let validation = contract.validate()

        guard validation.isValid else {
            saveError = SaveError.validationFailed(validation.errors)
            showingSaveError = true
            return
        }

        isLoading = true

        // Update timestamp
        contract.updatedAt = Date()

        // Save to persistence layer
        Task {
            do {
                try await saveContract()
                await MainActor.run {
                    isLoading = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    saveError = error
                    showingSaveError = true
                }
            }
        }
    }

    private func saveContract() async throws {
        let persistence = SongOrderPersistence.shared
        try await persistence.save(contract)
    }
}

// =============================================================================
// MARK: - Progress Overlay
// =============================================================================

// DUPLICATE: struct ProgressOverlay: View {
// DUPLICATE:     var body: some View {
// DUPLICATE:         ZStack {
// DUPLICATE:             Color.black.opacity(0.3)
// DUPLICATE:                 .ignoresSafeArea()
// DUPLICATE: 
// DUPLICATE:             ProgressView()
// DUPLICATE:                 .scaleEffect(1.5)
// DUPLICATE:                 .padding()
// DUPLICATE:                 .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
// DUPLICATE:         }
// DUPLICATE:     }
// DUPLICATE: }

// =============================================================================
// MARK: - Save Error
// =============================================================================

enum SaveError: LocalizedError {
    case validationFailed([String])
    case persistenceFailed(Error)
    case unknown

    var errorDescription: String? {
        switch self {
        case .validationFailed(let errors):
            return "Validation failed:\n" + errors.joined(separator: "\n")
        case .persistenceFailed(let error):
            return "Failed to save: \(error.localizedDescription)"
        case .unknown:
            return "An unknown error occurred"
        }
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct OrderSongScreen_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // New contract (blank)
            OrderSongScreen()
                .previewDisplayName("New Contract")

            // Existing contract
            OrderSongScreen(
                existingContract: SongOrderContract(
                    name: "HBO Cue - Tension",
                    description: "Dramatic cue for scene 42",
                    intent: .cue,
                    motion: .accelerating,
                    harmonicBehavior: .revealed,
                    certainty: 0.6,
                    identityLocks: IdentityLocks(rhythm: true, pitch: false, form: true),
                    evolutionMode: .adaptive
                )
            )
            .previewDisplayName("Existing Contract")

            // From template
            OrderSongScreen(template: .hboCue)
                .previewDisplayName("From Template")

            // Dark mode
            OrderSongScreen()
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
        }
    }
}
#endif
