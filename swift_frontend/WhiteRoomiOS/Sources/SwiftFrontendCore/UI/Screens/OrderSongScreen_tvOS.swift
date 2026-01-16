//
//  OrderSongScreen_tvOS.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

#if os(tvOS)

import SwiftUI

// =============================================================================
// MARK: - Order Song Screen (tvOS)
// =============================================================================

/**
 tvOS-optimized Order Song interface with Siri Remote integration

 This screen provides a 10-foot UI experience optimized for television viewing:
 - Large, readable text (1.5x-2x scale)
 - Focusable elements with visual feedback
 - Siri Remote navigation (swipe gestures, D-pad)
 - Voice command integration via Siri
 - Parallax effects on focused cards
 - Slide-over panels for options

 The interface is designed for couch viewing distance with minimal text
 and focus on big-picture musical decisions.
 */
public struct OrderSongScreen_tvOS: View {

    // MARK: - State

    @State private var contract: SongOrderContract
    @State private var isLoading: Bool = false
    @State private var saveError: Error?
    @State private var showingSaveError: Bool = false
    @State private var hasChanges: Bool = false
    @State private var showingTemplatePicker: Bool = false
    @State private var focusedSection: Section? = nil
    @State private var siriTranscript: String? = nil

    // MARK: - Environment

    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: Field?

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
        ZStack {
            // Background gradient for visual depth
            LinearGradient(
                colors: [
                    Color(.systemBackground),
                    Color(.systemBackground).opacity(0.8)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 40) {
                // Header with Siri feedback
                headerView

                // Main content scrollable area
                ScrollView {
                    VStack(spacing: 32) {
                        // Basic Information
                        basicInfoSection
                            .focused($focusedField, equals: .name)

                        // Musical Intent
                        intentSection
                            .focused($focusedField, equals: .intent)

                        // Motion
                        motionSection
                            .focused($focusedField, equals: .motion)

                        // Harmonic Behavior
                        harmonySection
                            .focused($focusedField, equals: .harmony)

                        // Certainty Slider (large, swipeable)
                        certaintySection
                            .focused($focusedField, equals: .certainty)

                        // Identity Locks
                        identityLocksSection
                            .focused($focusedField, equals: .identityLocks)

                        // Evolution Mode
                        evolutionSection
                            .focused($focusedField, equals: .evolution)

                        // Templates
                        templatesSection
                            .focused($focusedField, equals: .templates)
                    }
                    .padding(.horizontal, 60)
                }

                // Footer with actions
                footerActions
            }
            .padding(.vertical, 40)
        }
        .disabled(isLoading)
        .overlay {
            if isLoading {
                loadingOverlay
            }

            if let transcript = siriTranscript {
                siriFeedbackOverlay(transcript: transcript)
            }
        }
        .alert("Save Error", isPresented: $showingSaveError) {
            Button("OK", role: .cancel) { }
        } message: {
            if let error = saveError {
                Text(error.localizedDescription)
            }
        }
        .sheet(isPresented: $showingTemplatePicker) {
            TemplatePickerScreen_tvOS(
                selectedTemplate: Binding(
                    get: { nil },
                    set: { template in
                        if let template = template {
                            applyTemplate(template)
                        }
                        showingTemplatePicker = false
                    }
                )
            )
        }
        .onAppear {
            // Set initial focus
            focusedField = .name
        }
        .onPlayPauseCommand {
            // Handle Siri Remote play/pause button
            if focusedField == .certainty {
                // Quick adjust certainty with play/pause
                contract.certainty = contract.certainty > 0.5 ? 0.0 : 1.0
                markChanged()
            }
        }
    }

    // =============================================================================
    // MARK: - Header View
    // =============================================================================

    private var headerView: some View {
        VStack(spacing: 12) {
            Text("Order Song")
                .font(.system(size: 48, weight: .bold))
                .foregroundColor(.primary)

            Text("Use Siri Remote to navigate • Hold Siri to speak")
                .font(.system(size: 24))
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 60)
    }

    // =============================================================================
    // MARK: - Basic Info Section
    // =============================================================================

    private var basicInfoSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Song Name")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.primary)

            TextField("Enter song name", text: $contract.name)
                .font(.system(size: 32))
                .padding(.horizontal, 24)
                .padding(.vertical, 20)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(16)
                .focusable()
                .onChange(of: contract.name) { _ in
                    markChanged()
                }

            TextField("Description (optional)", text: bindingDescription)
                .font(.system(size: 28))
                .padding(.horizontal, 24)
                .padding(.vertical, 20)
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(16)
                .focusable()
                .onChange(of: bindingDescription.wrappedValue) { _ in
                    markChanged()
                }
        }
        .padding(32)
        .background(cardBackground)
        .tvFocusable()
    }

    // =============================================================================
    // MARK: - Intent Section
    // =============================================================================

    private var intentSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Musical Intent")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.primary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 16) {
                ForEach(Intent.allCases, id: \.self) { intent in
                    IntentCard_tvOS(
                        intent: intent,
                        isSelected: contract.intent == intent
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            contract.intent = intent
                            markChanged()
                        }
                    }
                    .focusable()
                }
            }

            Text(contract.intent.description)
                .font(.system(size: 22))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(32)
        .background(cardBackground)
        .tvFocusable()
    }

    // =============================================================================
    // MARK: - Motion Section
    // =============================================================================

    private var motionSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Motion")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.primary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 16) {
                ForEach(Motion.allCases, id: \.self) { motion in
                    MotionCard_tvOS(
                        motion: motion,
                        isSelected: contract.motion == motion
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            contract.motion = motion
                            markChanged()
                        }
                    }
                    .focusable()
                }
            }

            Text(contract.motion.description)
                .font(.system(size: 22))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(32)
        .background(cardBackground)
        .tvFocusable()
    }

    // =============================================================================
    // MARK: - Harmony Section
    // =============================================================================

    private var harmonySection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Harmonic Behavior")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.primary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 16) {
                ForEach(HarmonicBehavior.allCases, id: \.self) { harmony in
                    HarmonyCard_tvOS(
                        harmony: harmony,
                        isSelected: contract.harmonicBehavior == harmony
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            contract.harmonicBehavior = harmony
                            markChanged()
                        }
                    }
                    .focusable()
                }
            }

            Text(contract.harmonicBehavior.description)
                .font(.system(size: 22))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(32)
        .background(cardBackground)
        .tvFocusable()
    }

    // =============================================================================
    // MARK: - Certainty Section
    // =============================================================================

    private var certaintySection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text("Certainty")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundColor(.primary)

                Spacer()

                Text(certaintyLabel)
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.accentColor)
            }

            // Large slider optimized for Siri Remote swipe
            CertaintySlider_tvOS(
                value: $contract.certainty,
                label: certaintyLabel
            ) {
                markChanged()
            }

            Text(certaintyDescription)
                .font(.system(size: 22))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(32)
        .background(cardBackground)
        .tvFocusable()
    }

    // =============================================================================
    // MARK: - Identity Locks Section
    // =============================================================================

    private var identityLocksSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Identity Locks")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.primary)

            VStack(spacing: 16) {
                LockToggle_tvOS(
                    title: "Lock Rhythm",
                    isOn: $contract.identityLocks.rhythm,
                    icon: "metronome"
                ) {
                    markChanged()
                }

                LockToggle_tvOS(
                    title: "Lock Pitch",
                    isOn: $contract.identityLocks.pitch,
                    icon: "music.note"
                ) {
                    markChanged()
                }

                LockToggle_tvOS(
                    title: "Lock Form",
                    isOn: $contract.identityLocks.form,
                    icon: "rectangle.stack"
                ) {
                    markChanged()
                }
            }

            Text("Locked elements stay consistent during evolution")
                .font(.system(size: 22))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(32)
        .background(cardBackground)
        .tvFocusable()
    }

    // =============================================================================
    // MARK: - Evolution Section
    // =============================================================================

    private var evolutionSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Evolution Mode")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.primary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 16) {
                ForEach(EvolutionMode.allCases, id: \.self) { mode in
                    EvolutionCard_tvOS(
                        mode: mode,
                        isSelected: contract.evolutionMode == mode
                    ) {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            contract.evolutionMode = mode
                            markChanged()
                        }
                    }
                    .focusable()
                }
            }

            Text(contract.evolutionMode.description)
                .font(.system(size: 22))
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            if contract.evolutionMode.allowsEvolution {
                Text("This song will evolve over multiple plays")
                    .font(.system(size: 22))
                    .foregroundColor(.accentColor)
                    .padding(.top, 8)
            }
        }
        .padding(32)
        .background(cardBackground)
        .tvFocusable()
    }

    // =============================================================================
    // MARK: - Templates Section
    // =============================================================================

    private var templatesSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Quick Templates")
                .font(.system(size: 28, weight: .semibold))
                .foregroundColor(.primary)

            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 16),
                GridItem(.flexible(), spacing: 16)
            ], spacing: 16) {
                ForEach(SongOrderTemplate.allCases, id: \.self) { template in
                    TemplateCard_tvOS(template: template) {
                        applyTemplate(template)
                    }
                    .focusable()
                }
            }

            Button(action: { showingTemplatePicker = true }) {
                HStack {
                    Image(systemName: "square.grid.2x2")
                        .font(.system(size: 24))

                    Text("Browse All Templates")
                        .font(.system(size: 24, weight: .medium))

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 20))
                }
                .padding(.horizontal, 32)
                .padding(.vertical, 24)
                .background(Color.accentColor.opacity(0.2))
                .foregroundColor(.accentColor)
                .cornerRadius(16)
            }
            .buttonStyle(.plain)
        }
        .padding(32)
        .background(cardBackground)
        .tvFocusable()
    }

    // =============================================================================
    // MARK: - Footer Actions
    // =============================================================================

    private var footerActions: some View {
        HStack(spacing: 32) {
            Button(action: handleCancel) {
                Text("Cancel")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(Color.secondary.opacity(0.2))
                    .cornerRadius(12)
            }
            .buttonStyle(.plain)
            .disabled(isLoading)

            Button(action: handleSave) {
                Text("Save Song")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(isValid ? Color.accentColor : Color.secondary)
                    .cornerRadius(12)
            }
            .buttonStyle(.plain)
            .disabled(!isValid || isLoading)
        }
        .padding(.horizontal, 60)
        .padding(.bottom, 20)
    }

    // =============================================================================
    // MARK: - Loading Overlay
    // =============================================================================

    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.6)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                ProgressView()
                    .scaleEffect(2.0)

                Text("Saving Song...")
                    .font(.system(size: 28))
                    .foregroundColor(.white)
            }
            .padding(48)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
        }
    }

    // =============================================================================
    // MARK: - Siri Feedback Overlay
    // =============================================================================

    private func siriFeedbackOverlay(transcript: String) -> some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Image(systemName: "waveform")
                    .font(.system(size: 48))
                    .foregroundColor(.white)

                Text(transcript)
                    .font(.system(size: 28))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
            }
            .padding(40)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
            .padding(.horizontal, 60)
        }
        .transition(.opacity)
        .onAppear {
            // Auto-dismiss after 2 seconds
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                withAnimation {
                    siriTranscript = nil
                }
            }
        }
    }

    // =============================================================================
    // MARK: - Computed Properties
    // =============================================================================

    private var cardBackground: some View {
        Color.secondary.opacity(0.1)
            .cornerRadius(20)
    }

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

    // =============================================================================
    // MARK: - Actions
    // =============================================================================

    private func markChanged() {
        hasChanges = true
    }

    private func applyTemplate(_ template: SongOrderTemplate) {
        let newContract = template.createContract(name: contract.name)
        contract = newContract
        hasChanges = true

        // Show Siri feedback
        siriTranscript = "Applied \(template.displayName) template"
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
// MARK: - Focus Fields
// =============================================================================

enum Field: Hashable {
    case name
    case intent
    case motion
    case harmony
    case certainty
    case identityLocks
    case evolution
    case templates
}

enum Section: Hashable {
    case basicInfo
    case intent
    case motion
    case harmony
    case certainty
    case identityLocks
    case evolution
    case templates
}

// =============================================================================
// MARK: - tvOS Focusable Modifier
// =============================================================================

struct TVFocusableModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .focusEffectDisabled(false)
            .prefersDefaultFocus(false, in: nil)
    }
}

extension View {
    func tvFocusable() -> some View {
        modifier(TVFocusableModifier())
    }
}

// =============================================================================
// MARK: - Intent Card (tvOS)
// =============================================================================

struct IntentCard_tvOS: View {
    let intent: Intent
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: intent.iconName)
                    .font(.system(size: 36))
                    .foregroundColor(isSelected ? .white : intent.color)

                Text(intent.displayName)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(isSelected ? .white : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 32)
            .background(
                isSelected ?
                    LinearGradient(
                        colors: [intent.color, intent.color.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ) :
                    Color.secondary.opacity(0.1)
            )
            .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

extension Intent {
    var iconName: String {
        switch self {
        case .identity: return "person.fill"
        case .song: return "music.note"
        case .cue: return "film.fill"
        case .ritual: return "flame.fill"
        case .loop: return "repeat"
        }
    }

    var color: Color {
        switch self {
        case .identity: return .blue
        case .song: return .purple
        case .cue: return .red
        case .ritual: return .orange
        case .loop: return .green
        }
    }
}

// =============================================================================
// MARK: - Motion Card (tvOS)
// =============================================================================

struct MotionCard_tvOS: View {
    let motion: Motion
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: motion.iconName)
                    .font(.system(size: 36))
                    .foregroundColor(isSelected ? .white : .blue)

                Text(motion.displayName)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(isSelected ? .white : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 32)
            .background(
                isSelected ?
                    LinearGradient(
                        colors: [Color.blue, Color.blue.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ) :
                    Color.secondary.opacity(0.1)
            )
            .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

extension Motion {
    var iconName: String {
        switch self {
        case .static: return "stop.fill"
        case .accelerating: return "speedometer"
        case .oscillating: return "waveform.path"
        case .colliding: return "arrow.left.arrow.right"
        case .dissolving: return "wind"
        }
    }
}

// =============================================================================
// MARK: - Harmony Card (tvOS)
// =============================================================================

struct HarmonyCard_tvOS: View {
    let harmony: HarmonicBehavior
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: harmony.iconName)
                    .font(.system(size: 36))
                    .foregroundColor(isSelected ? .white : .green)

                Text(harmony.displayName)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(isSelected ? .white : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 32)
            .background(
                isSelected ?
                    LinearGradient(
                        colors: [Color.green, Color.green.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ) :
                    Color.secondary.opacity(0.1)
            )
            .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

extension HarmonicBehavior {
    var iconName: String {
        switch self {
        case .static: return "equal"
        case .revealed: return "eye.fill"
        case .cyclic: return "arrow.clockwise"
        case .expanding: return "arrow.up.right"
        case .collapsing: return "arrow.down.left"
        }
    }
}

// =============================================================================
// MARK: - Evolution Card (tvOS)
// =============================================================================

struct EvolutionCard_tvOS: View {
    let mode: EvolutionMode
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: mode.iconName)
                    .font(.system(size: 36))
                    .foregroundColor(isSelected ? .white : .purple)

                Text(mode.displayName)
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(isSelected ? .white : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 32)
            .background(
                isSelected ?
                    LinearGradient(
                        colors: [Color.purple, Color.purple.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ) :
                    Color.secondary.opacity(0.1)
            )
            .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

extension EvolutionMode {
    var iconName: String {
        switch self {
        case .fixed: return "lock.fill"
        case .adaptive: return "slider.horizontal.3"
        case .living: return "leaf.fill"
        case .museum: return "building.columns.fill"
        }
    }
}

// =============================================================================
// MARK: - Template Card (tvOS)
// =============================================================================

struct TemplateCard_tvOS: View {
    let template: SongOrderTemplate
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Image(systemName: template.iconName)
                        .font(.system(size: 32))
                        .foregroundColor(template.color)
                        .frame(width: 64, height: 64)
                        .background(template.color.opacity(0.2))
                        .cornerRadius(12)

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 20))
                        .foregroundColor(.secondary)
                }

                Text(template.displayName)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.primary)

                Text(template.description)
                    .font(.system(size: 20))
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            .padding(24)
            .background(Color.secondary.opacity(0.1))
            .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

extension SongOrderTemplate {
    var iconName: String {
        switch self {
        case .hboCue: return "film.fill"
        case .ambientLoop: return "wind.fill"
        case .ritualCollage: return "flame.fill"
        case .performancePiece: return "music.quarternote.3"
        }
    }

    var color: Color {
        switch self {
        case .hboCue: return .blue
        case .ambientLoop: return .green
        case .ritualCollage: return .orange
        case .performancePiece: return .purple
        }
    }
}

// =============================================================================
// MARK: - Certainty Slider (tvOS)
// =============================================================================

struct CertaintySlider_tvOS: View {
    @Binding var value: Double
    let label: String
    let onChange: () -> Void

    @State private var isFocused = false

    var body: some View {
        VStack(spacing: 16) {
            // Visual slider track
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.secondary.opacity(0.3))
                        .frame(height: 16)

                    // Filled portion
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [.green, .yellow, .red],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geometry.size.width * CGFloat(value), height: 16)

                    // Thumb indicator
                    Circle()
                        .fill(Color.white)
                        .frame(width: 32, height: 32)
                        .shadow(radius: 4)
                        .offset(x: (geometry.size.width * CGFloat(value)) - 16)
                }
            }
            .frame(height: 48)
            .focusable()
            .onTapGesture { location in
                // Handle tap for quick adjustment
                let newValue = Double(location.x / 300) // Approximate width
                value = max(0, min(1, newValue))
                onChange()
            }
            .digitalCrownRotation($value, from: 0, through: 1, sensitivity: .medium)

            // Instructions
            Text("Swipe on Siri Remote or use Digital Crown")
                .font(.system(size: 18))
                .foregroundColor(.secondary)
        }
    }
}

// =============================================================================
// MARK: - Lock Toggle (tvOS)
// =============================================================================

struct LockToggle_tvOS: View {
    let title: String
    @Binding var isOn: Bool
    let icon: String
    let onChange: () -> Void

    var body: some View {
        Button(action: {
            withAnimation(.easeInOut(duration: 0.2)) {
                isOn.toggle()
                onChange()
            }
        }) {
            HStack(spacing: 20) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundColor(isOn ? .accentColor : .secondary)
                    .frame(width: 48, height: 48)
                    .background(isOn ? Color.accentColor.opacity(0.2) : Color.secondary.opacity(0.1))
                    .cornerRadius(12)

                Text(title)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundColor(.primary)

                Spacer()

                Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 32))
                    .foregroundColor(isOn ? .accentColor : .secondary)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 20)
            .background(Color.secondary.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

// =============================================================================
// MARK: - Template Picker Screen (tvOS)
// =============================================================================

struct TemplatePickerScreen_tvOS: View {
    @Binding var selectedTemplate: SongOrderTemplate?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 24),
                    GridItem(.flexible(), spacing: 24)
                ], spacing: 24) {
                    ForEach(SongOrderTemplate.allCases, id: \.self) { template in
                        TemplateCard_tvOS(template: template) {
                            selectedTemplate = template
                            dismiss()
                        }
                        .focusable()
                    }
                }
                .padding(.horizontal, 60)
                .padding(.vertical, 40)
            }
            .navigationTitle("Choose Template")
        }
    }
}

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
struct OrderSongScreen_tvOS_Previews: PreviewProvider {
    static var previews: some View {
        OrderSongScreen_tvOS()
            .previewDisplayName("New Contract")

        OrderSongScreen_tvOS(
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

        OrderSongScreen_tvOS(template: .hboCue)
            .previewDisplayName("From Template")
    }
}
#endif

#endif
