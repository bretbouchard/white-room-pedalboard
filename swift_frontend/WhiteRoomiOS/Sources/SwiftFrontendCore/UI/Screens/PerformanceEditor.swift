//
//  PerformanceEditor.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI
import UIKit

// =============================================================================
// MARK: - Performance Editor Screen
// =============================================================================

/**
 Full-screen editor for editing a single PerformanceState_v1

 This comprehensive editor allows users to customize every aspect of a performance:
 - Arrangement style (solo_piano, satb, ambient_techno, etc.)
 - Density scale (0..1)
 - Groove profile selection
 - ConsoleX profile selection
 - Instrumentation map (Role → Instrument+Preset)
 - Mix targets (Role → gain/pan values)
 - Live preview of changes

 The editor provides real-time validation, haptic feedback, and live audio preview
 when connected to the audio engine.
 */
public struct PerformanceEditor: View {

    // MARK: - State

    @State private var performance: PerformanceState_v1
    @State private var isDirty: Bool = false
    @State private var isPlaying: Bool = false
    @State private var isLoading: Bool = false
    @State private var saveError: Error?
    @State private var showingSaveError: Bool = false
    @State private var validationErrors: [String] = []
    @State private var showingValidationErrors: Bool = false
    @State private var selectedRole: String?
    @State private var showingInstrumentPicker: Bool = false
    @State private var showingGroovePicker: Bool = false
    @State private var showingConsoleXPicker: Bool = false

    // MARK: - Environment

    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // MARK: - Callbacks

    private let onSave: (PerformanceState_v1) -> Void
    private let onCancel: () -> Void

    // MARK: - Computed Properties

    private var isCompactLayout: Bool {
        horizontalSizeClass == .compact
    }

    private var isValid: Bool {
        performance.validate().isValid
    }

    private var availableRoles: [String] {
        Array(performance.instrumentationMap.keys).sorted()
    }

    // MARK: - Initialization

    public init(
        performance: PerformanceState_v1,
        onSave: @escaping (PerformanceState_v1) -> Void,
        onCancel: @escaping () -> Void
    ) {
        self._performance = State(initialValue: performance)
        self.onSave = onSave
        self.onCancel = onCancel
    }

    // MARK: - Body

    public var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Basic Information Section
                    basicInformationSection

                    // Arrangement Section
                    arrangementSection

                    // Density Section
                    densitySection

                    // Groove Profile Section
                    grooveProfileSection

                    // ConsoleX Profile Section
                    consoleXProfileSection

                    // Instrumentation Map Section
                    instrumentationMapSection

                    // Mix Targets Section
                    mixTargetsSection

                    // Metadata Section
                    metadataSection

                    // Live Preview Section
                    livePreviewSection
                }
                .padding()
                #if os(iOS)
                .padding(.bottom) // Safe area for iOS home indicator
                #endif
            }
            .navigationTitle("Edit Performance")
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
                    HStack {
                        if isDirty {
                            Button("Reset") {
                                resetChanges()
                            }
                            .foregroundColor(.orange)
                        }

                        Button("Save") {
                            handleSave()
                        }
                        .disabled(!isValid || isLoading || !isDirty)
                    }
                }
            }
            .disabled(isLoading)
            #if os(iOS)
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
                // Handle backgrounding if needed
                UIApplication.shared.endEditing()
            }
            #endif
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
            .alert("Validation Errors", isPresented: $showingValidationErrors) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(validationErrors.joined(separator: "\n"))
            }
            .sheet(isPresented: $showingInstrumentPicker) {
                if let role = selectedRole {
                    InstrumentPickerSheet(
                        role: role,
                        currentAssignment: performance.instrumentationMap[role],
                        onAssign: { assignment in
                            updateInstrumentAssignment(for: role, assignment: assignment)
                            showingInstrumentPicker = false
                        },
                        onCancel: {
                            showingInstrumentPicker = false
                        }
                    )
                }
            }
            .sheet(isPresented: $showingGroovePicker) {
                GrooveProfilePickerSheet(
                    currentProfile: performance.grooveProfileId,
                    onSelect: { profileId in
                        updateGrooveProfile(profileId)
                        showingGroovePicker = false
                    },
                    onCancel: {
                        showingGroovePicker = false
                    }
                )
            }
            .sheet(isPresented: $showingConsoleXPicker) {
                ConsoleXProfilePickerSheet(
                    currentProfile: performance.consoleXProfileId,
                    onSelect: { profileId in
                        updateConsoleXProfile(profileId)
                        showingConsoleXPicker = false
                    },
                    onCancel: {
                        showingConsoleXPicker = false
                    }
                )
            }
        }
        #if os(iOS)
        .navigationViewStyle(StackNavigationViewStyle()) // Better iOS experience
        #endif
    }

    // =============================================================================
    // MARK: - Form Sections
    // =============================================================================

    private var basicInformationSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Basic Information")
                .font(.headline)
                .foregroundColor(.primary)

            TextField("Performance Name", text: bindingPerformanceName)
                .textFieldStyle(.roundedBorder)
                .onChange(of: bindingPerformanceName.wrappedValue) { _ in
                    markDirty()
                }

            Text("ID: \(performance.id)")
                .font(.caption)
                .foregroundColor(.secondary)

            if let createdAt = performance.createdAt {
                Text("Created: \(createdAt, style: .date)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private var arrangementSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Arrangement Style")
                .font(.headline)
                .foregroundColor(.primary)

            Picker("Style", selection: bindingArrangementStyle) {
                ForEach(ArrangementStyle.allCases, id: \.self) { style in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(style.displayName)
                            .font(.body)
                            .foregroundColor(.primary)
                        Text("Default density: \(Int(style.defaultDensity * 100))%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .tag(style)
                }
            }
            .pickerStyle(.menu)
            .onChange(of: performance.arrangementStyle) { _ in
                markDirty()
                triggerHapticFeedback()
            }

            Text(performance.arrangementStyle.displayName)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private var densitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Density")
                    .font(.headline)
                    .foregroundColor(.primary)

                Spacer()

                Text(densityLabel)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(densityColor)
            }

            // iOS-optimized touch slider with haptic feedback
            TouchOptimizedSlider(
                value: bindingDensity,
                range: 0...1,
                step: 0.05,
                hapticPattern: .density,
                onDragStart: {
                    // Medium feedback when user starts dragging
                    triggerHapticFeedback(.medium)
                },
                onValueChange: { newValue in
                    markDirty()
                    // Light feedback during drag at 10% intervals
                    let percentage = Int(newValue * 100)
                    if percentage % 10 == 0 {
                        triggerHapticFeedback(.light)
                    }
                }
            )
            .frame(height: 60) // Larger touch target for iOS

            HStack {
                Text("0%")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                Text("100%")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(densityDescription)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private var grooveProfileSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Groove Profile")
                .font(.headline)
                .foregroundColor(.primary)

            Button(action: {
                showingGroovePicker = true
            }) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Current Groove")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text(performance.grooveProfileId)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)

            Text("Rhythmic feel and timing adjustments")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private var consoleXProfileSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ConsoleX Profile")
                .font(.headline)
                .foregroundColor(.primary)

            Button(action: {
                showingConsoleXPicker = true
            }) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Mix Profile")
                            .font(.headline)
                            .foregroundColor(.primary)

                        Text(performance.consoleXProfileId)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .buttonStyle(.plain)

            Text("ConsoleX mixing configuration")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private var instrumentationMapSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Instrumentation Map")
                .font(.headline)
                .foregroundColor(.primary)

            if performance.instrumentationMap.isEmpty {
                Text("No instruments assigned")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                ForEach(availableRoles, id: \.self) { role in
                    Button(action: {
                        selectedRole = role
                        showingInstrumentPicker = true
                    }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(role.capitalized)
                                    .font(.body)
                                    .foregroundColor(.primary)

                                if let assignment = performance.instrumentationMap[role] {
                                    Text(assignment.instrumentId)
                                        .font(.caption)
                                        .foregroundColor(.secondary)

                                    if let presetId = assignment.presetId {
                                        Text("Preset: \(presetId)")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }

            Text("Tap a role to change its instrument")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private var mixTargetsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Mix Targets")
                .font(.headline)
                .foregroundColor(.primary)

            if performance.mixTargets.isEmpty {
                Text("No mix targets configured")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                ForEach(Array(performance.mixTargets.keys.sorted()), id: \.self) { role in
                    if let target = performance.mixTargets[role] {
                        MixTargetControl(
                            role: role,
                            target: target,
                            onGainChange: { newGain in
                                updateMixTargetGain(for: role, gain: newGain)
                            },
                            onPanChange: { newPan in
                                updateMixTargetPan(for: role, pan: newPan)
                            },
                            onStereoToggle: {
                                updateMixTargetStereo(for: role)
                            }
                        )
                    }
                }
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Metadata")
                .font(.headline)
                .foregroundColor(.primary)

            if let metadata = performance.metadata, !metadata.isEmpty {
                ForEach(Array(metadata.keys.sorted()), id: \.self) { key in
                    HStack {
                        Text(key.capitalized)
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Spacer()

                        Text(metadata[key] ?? "")
                            .font(.caption)
                            .foregroundColor(.primary)
                    }
                }
            } else {
                Text("No custom metadata")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    private var livePreviewSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Live Preview")
                .font(.headline)
                .foregroundColor(.primary)

            HStack {
                Button(action: togglePlayback) {
                    HStack {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.title3)
                            .foregroundColor(.white)

                        Text(isPlaying ? "Playing" : "Preview")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(isPlaying ? Color.orange : Color.blue)
                    )
                }
                .buttonStyle(.plain)

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("Hear changes instantly")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Text(isDirty ? "Unsaved changes" : "Up to date")
                        .font(.caption2)
                        .foregroundColor(isDirty ? .orange : .green)
                }
            }
        }
        .padding()
        .background(Color.secondary.opacity(0.1))
        .cornerRadius(12)
    }

    // =============================================================================
    // MARK: - Bindings
    // =============================================================================

    private var bindingPerformanceName: Binding<String> {
        Binding(
            get: { performance.name },
            set: {
                performance = PerformanceState_v1(
                    version: performance.version,
                    id: performance.id,
                    name: $0,
                    arrangementStyle: performance.arrangementStyle,
                    density: performance.density,
                    grooveProfileId: performance.grooveProfileId,
                    instrumentationMap: performance.instrumentationMap,
                    consoleXProfileId: performance.consoleXProfileId,
                    mixTargets: performance.mixTargets,
                    createdAt: performance.createdAt,
                    modifiedAt: Date(),
                    metadata: performance.metadata
                )
            }
        )
    }

    private var bindingArrangementStyle: Binding<ArrangementStyle> {
        Binding(
            get: { performance.arrangementStyle },
            set: {
                performance = PerformanceState_v1(
                    version: performance.version,
                    id: performance.id,
                    name: performance.name,
                    arrangementStyle: $0,
                    density: performance.density,
                    grooveProfileId: performance.grooveProfileId,
                    instrumentationMap: performance.instrumentationMap,
                    consoleXProfileId: performance.consoleXProfileId,
                    mixTargets: performance.mixTargets,
                    createdAt: performance.createdAt,
                    modifiedAt: Date(),
                    metadata: performance.metadata
                )
            }
        )
    }

    private var bindingDensity: Binding<Double> {
        Binding(
            get: { performance.density },
            set: {
                performance = PerformanceState_v1(
                    version: performance.version,
                    id: performance.id,
                    name: performance.name,
                    arrangementStyle: performance.arrangementStyle,
                    density: $0,
                    grooveProfileId: performance.grooveProfileId,
                    instrumentationMap: performance.instrumentationMap,
                    consoleXProfileId: performance.consoleXProfileId,
                    mixTargets: performance.mixTargets,
                    createdAt: performance.createdAt,
                    modifiedAt: Date(),
                    metadata: performance.metadata
                )
            }
        )
    }

    // =============================================================================
    // MARK: - Computed Properties
    // =============================================================================

    private var densityLabel: String {
        "\(Int(performance.density * 100))%"
    }

    private var densityDescription: String {
        switch performance.density {
        case 0.0..<0.2:
            return "Very sparse - minimal notes"
        case 0.2..<0.4:
            return "Sparse - breathing room"
        case 0.4..<0.6:
            return "Moderate - balanced density"
        case 0.6..<0.8:
            return "Dense - rich texture"
        default:
            return "Very dense - maximum notes"
        }
    }

    private var densityColor: Color {
        switch performance.density {
        case 0.0..<0.2:
            return .green
        case 0.2..<0.4:
            return .blue
        case 0.4..<0.6:
            return .yellow
        case 0.6..<0.8:
            return .orange
        default:
            return .red
        }
    }

    // =============================================================================
    // MARK: - Actions
    // =============================================================================

    private func markDirty() {
        isDirty = true
    }

    private func resetChanges() {
        // Reload original performance (would need to store initial state)
        isDirty = false
    }

    private func togglePlayback() {
        isPlaying.toggle()

        if isPlaying {
            // Start audio preview with current performance state
            triggerHapticFeedback()
        } else {
            // Stop audio preview
        }
    }

    private func triggerHapticFeedback(_ intensity: HapticIntensity = .light) {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: intensity.uiKitStyle)
        generator.impactOccurred()
        #endif
    }

    private func triggerSelectionHapticFeedback() {
        #if os(iOS)
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
        #endif
    }

    private func triggerNotificationHapticFeedback(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(type)
        #endif
    }

    private func updateInstrumentAssignment(for role: String, assignment: PerformanceInstrumentAssignment) {
        var newInstrumentationMap = performance.instrumentationMap
        newInstrumentationMap[role] = assignment

        performance = PerformanceState_v1(
            version: performance.version,
            id: performance.id,
            name: performance.name,
            arrangementStyle: performance.arrangementStyle,
            density: performance.density,
            grooveProfileId: performance.grooveProfileId,
            instrumentationMap: newInstrumentationMap,
            consoleXProfileId: performance.consoleXProfileId,
            mixTargets: performance.mixTargets,
            createdAt: performance.createdAt,
            modifiedAt: Date(),
            metadata: performance.metadata
        )
        markDirty()
        triggerHapticFeedback()
    }

    private func updateGrooveProfile(_ profileId: String) {
        performance = PerformanceState_v1(
            version: performance.version,
            id: performance.id,
            name: performance.name,
            arrangementStyle: performance.arrangementStyle,
            density: performance.density,
            grooveProfileId: profileId,
            instrumentationMap: performance.instrumentationMap,
            consoleXProfileId: performance.consoleXProfileId,
            mixTargets: performance.mixTargets,
            createdAt: performance.createdAt,
            modifiedAt: Date(),
            metadata: performance.metadata
        )
        markDirty()
        triggerHapticFeedback()
    }

    private func updateConsoleXProfile(_ profileId: String) {
        performance = PerformanceState_v1(
            version: performance.version,
            id: performance.id,
            name: performance.name,
            arrangementStyle: performance.arrangementStyle,
            density: performance.density,
            grooveProfileId: performance.grooveProfileId,
            instrumentationMap: performance.instrumentationMap,
            consoleXProfileId: profileId,
            mixTargets: performance.mixTargets,
            createdAt: performance.createdAt,
            modifiedAt: Date(),
            metadata: performance.metadata
        )
        markDirty()
        triggerHapticFeedback()
    }

    private func handleCancel() {
        if isDirty {
            // Could show confirmation dialog here
        }
        onCancel()
    }

    private func handleSave() {
        let validation = performance.validate()

        guard validation.isValid else {
            validationErrors = validation.errors
            showingValidationErrors = true
            return
        }

        isLoading = true

        // Update timestamp
        performance = PerformanceState_v1(
            version: performance.version,
            id: performance.id,
            name: performance.name,
            arrangementStyle: performance.arrangementStyle,
            density: performance.density,
            grooveProfileId: performance.grooveProfileId,
            instrumentationMap: performance.instrumentationMap,
            consoleXProfileId: performance.consoleXProfileId,
            mixTargets: performance.mixTargets,
            createdAt: performance.createdAt,
            modifiedAt: Date(),
            metadata: performance.metadata
        )

        Task {
            do {
                try await savePerformance()
                await MainActor.run {
                    isLoading = false
                    onSave(performance)
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

    private func savePerformance() async throws {
        // Simulate async save
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
    }

    private func panLabel(_ pan: Double) -> String {
        switch pan {
        case (-1.0)..<(-0.3):
            return "Left"
        case (-0.3)..<(-0.1):
            return "Left-Center"
        case (-0.1)..<(0.1):
            return "Center"
        case (0.1)..<(0.3):
            return "Right-Center"
        case (0.3)...(1.0):
            return "Right"
        default:
            return "Center"
        }
    }

    private func updateMixTargetGain(for role: String, gain: Double) {
        guard var target = performance.mixTargets[role] else { return }
        target = MixTarget(
            gain: gain,
            pan: target.pan,
            stereo: target.stereo
        )

        var newMixTargets = performance.mixTargets
        newMixTargets[role] = target

        performance = PerformanceState_v1(
            version: performance.version,
            id: performance.id,
            name: performance.name,
            arrangementStyle: performance.arrangementStyle,
            density: performance.density,
            grooveProfileId: performance.grooveProfileId,
            instrumentationMap: performance.instrumentationMap,
            consoleXProfileId: performance.consoleXProfileId,
            mixTargets: newMixTargets,
            createdAt: performance.createdAt,
            modifiedAt: Date(),
            metadata: performance.metadata
        )
        markDirty()
    }

    private func updateMixTargetPan(for role: String, pan: Double) {
        guard var target = performance.mixTargets[role] else { return }
        target = MixTarget(
            gain: target.gain,
            pan: pan,
            stereo: target.stereo
        )

        var newMixTargets = performance.mixTargets
        newMixTargets[role] = target

        performance = PerformanceState_v1(
            version: performance.version,
            id: performance.id,
            name: performance.name,
            arrangementStyle: performance.arrangementStyle,
            density: performance.density,
            grooveProfileId: performance.grooveProfileId,
            instrumentationMap: performance.instrumentationMap,
            consoleXProfileId: performance.consoleXProfileId,
            mixTargets: newMixTargets,
            createdAt: performance.createdAt,
            modifiedAt: Date(),
            metadata: performance.metadata
        )
        markDirty()
    }

    private func updateMixTargetStereo(for role: String) {
        guard var target = performance.mixTargets[role] else { return }
        target = MixTarget(
            gain: target.gain,
            pan: target.pan,
            stereo: !target.stereo
        )

        var newMixTargets = performance.mixTargets
        newMixTargets[role] = target

        performance = PerformanceState_v1(
            version: performance.version,
            id: performance.id,
            name: performance.name,
            arrangementStyle: performance.arrangementStyle,
            density: performance.density,
            grooveProfileId: performance.grooveProfileId,
            instrumentationMap: performance.instrumentationMap,
            consoleXProfileId: performance.consoleXProfileId,
            mixTargets: newMixTargets,
            createdAt: performance.createdAt,
            modifiedAt: Date(),
            metadata: performance.metadata
        )
        markDirty()
        triggerSelectionHapticFeedback()
    }
}

// =============================================================================
// MARK: - Instrument Picker Sheet
// =============================================================================

private struct InstrumentPickerSheet: View {
    let role: String
    let currentAssignment: PerformanceInstrumentAssignment?
    let onAssign: (PerformanceInstrumentAssignment) -> Void
    let onCancel: () -> Void

    @State private var selectedInstrument: String?
    @State private var selectedPreset: String?

    private let availableInstruments = [
        "LocalGal", "NexSynth", "SamSampler", "DrumMachine",
        "Piano", "Organ", "Strings", "Brass", "Winds", "Choir"
    ]

    private let availablePresets = [
        "default", "concert_grand", "jazz_piano", "warm_pad",
        "lead_synth", "bass_synth", "choir_soprano", "choir_alto",
        "choir_tenor", "choir_bass", "acoustic_bass", "rock_drums"
    ]

    var body: some View {
        NavigationView {
            List {
                Text(role.capitalized)
                    .font(.headline)

                Picker("Instrument", selection: $selectedInstrument) {
                    Text("Select an instrument").tag(String?.none)
                    ForEach(availableInstruments, id: \.self) { instrument in
                        Text(instrument).tag(Optional(instrument))
                    }
                }
                .pickerStyle(.menu)

                Picker("Preset", selection: $selectedPreset) {
                    Text("None").tag(String?.none)
                    ForEach(availablePresets, id: \.self) { preset in
                        Text(preset).tag(Optional(preset))
                    }
                }
                .pickerStyle(.menu)
            }
            .navigationTitle("Assign Instrument")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Assign") {
                        if let instrument = selectedInstrument {
                            let assignment = PerformanceInstrumentAssignment(
                                instrumentId: instrument,
                                presetId: selectedPreset
                            )
                            onAssign(assignment)
                        }
                    }
                    .disabled(selectedInstrument == nil)
                }
            }
            .onAppear {
                selectedInstrument = currentAssignment?.instrumentId
                selectedPreset = currentAssignment?.presetId
            }
        }
    }
}

// =============================================================================
// MARK: - Groove Profile Picker Sheet
// =============================================================================

private struct GrooveProfilePickerSheet: View {
    let currentProfile: String
    let onSelect: (String) -> Void
    let onCancel: () -> Void

    private let grooveProfiles = [
        "straight", "swing", "push", "drag",
        "shuffle", "hiphop", "jazz", "latin"
    ]

    var body: some View {
        NavigationView {
            List {
                ForEach(grooveProfiles, id: \.self) { profile in
                    Button(action: {
                        onSelect(profile)
                    }) {
                        HStack {
                            Text(profile.capitalized)
                                .font(.body)
                                .foregroundColor(.primary)

                            Spacer()

                            if profile == currentProfile {
                                Image(systemName: "checkmark")
                                    .font(.body)
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle("Groove Profile")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                    }
                }
            }
        }
    }
}

// =============================================================================
// MARK: - ConsoleX Profile Picker Sheet
// =============================================================================

private struct ConsoleXProfilePickerSheet: View {
    let currentProfile: String
    let onSelect: (String) -> Void
    let onCancel: () -> Void

    private let consoleXProfiles = [
        "default", "intimate", "choral", "electronic",
        "jazz", "jazz_trio", "rock", "orchestral",
        "chamber", "chamber_small", "electronic_full", "vocal"
    ]

    var body: some View {
        NavigationView {
            List {
                ForEach(consoleXProfiles, id: \.self) { profile in
                    Button(action: {
                        onSelect(profile)
                    }) {
                        HStack {
                            Text(profile.capitalized)
                                .font(.body)
                                .foregroundColor(.primary)

                            Spacer()

                            if profile == currentProfile {
                                Image(systemName: "checkmark")
                                    .font(.body)
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle("ConsoleX Profile")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        onCancel()
                    }
                }
            }
        }
    }
}

// =============================================================================
// MARK: - Mix Target Control
// =============================================================================

struct MixTargetControl: View {
    let role: String
    let target: MixTarget
    let onGainChange: (Double) -> Void
    let onPanChange: (Double) -> Void
    let onStereoToggle: () -> Void

    @State private var gain: Double
    @State private var pan: Double

    init(role: String, target: MixTarget, onGainChange: @escaping (Double) -> Void, onPanChange: @escaping (Double) -> Void, onStereoToggle: @escaping () -> Void) {
        self.role = role
        self.target = target
        self.onGainChange = onGainChange
        self.onPanChange = onPanChange
        self.onStereoToggle = onStereoToggle
        self._gain = State(initialValue: target.gain)
        self._pan = State(initialValue: target.pan)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Role header with stereo toggle
            HStack {
                Text(role.capitalized)
                    .font(.headline)
                    .foregroundColor(.primary)

                Spacer()

                Button(action: onStereoToggle) {
                    HStack(spacing: 4) {
                        Image(systemName: target.stereo ? "speaker.wave.2" : "speaker.wave.1")
                            .font(.caption)
                        Text(target.stereo ? "Stereo" : "Mono")
                            .font(.caption)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(target.stereo ? Color.blue.opacity(0.2) : Color.secondary.opacity(0.2))
                    .cornerRadius(6)
                }
                .buttonStyle(.plain)
            }

            // Gain slider with haptic feedback
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Gain")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Spacer()

                    Text("\(gain, specifier: "%.1f") dB")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }

                TouchOptimizedSlider(
                    value: $gain,
                    range: -24...12,
                    step: 0.5,
                    hapticPattern: .gain,
                    onDragStart: {
                        // Medium feedback when starting drag
                        triggerHapticFeedback(.medium)
                    },
                    onValueChange: { newValue in
                        onGainChange(newValue)
                    }
                )
                .frame(height: 50)
            }

            // Pan slider with haptic feedback
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Pan")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Spacer()

                    Text(panLabel(pan))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.purple)
                }

                TouchOptimizedSlider(
                    value: $pan,
                    range: -1...1,
                    step: 0.1,
                    hapticPattern: .pan,
                    onDragStart: {
                        triggerHapticFeedback(.light)
                    },
                    onValueChange: { newValue in
                        onPanChange(newValue)
                    }
                )
                .frame(height: 50)
            }

            HStack {
                Text("L")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                Spacer()

                Text("C")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                Spacer()

                Text("R")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
    }

    private func panLabel(_ pan: Double) -> String {
        switch pan {
        case (-1.0)..<(-0.3):
            return "L"
        case (-0.3)..<(-0.1):
            return "L-C"
        case (-0.1)..<(0.1):
            return "C"
        case (0.1)..<(0.3):
            return "R-C"
        case (0.3)...(1.0):
            return "R"
        default:
            return "C"
        }
    }

    private func triggerHapticFeedback(_ intensity: HapticIntensity) {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: intensity.uiKitStyle)
        generator.impactOccurred()
        #endif
    }
}

// =============================================================================
// MARK: - Haptic Intensity
// =============================================================================

enum HapticIntensity {
    case light
    case medium
    case heavy

    #if os(iOS)
    var uiKitStyle: UIImpactFeedbackGenerator.FeedbackStyle {
        switch self {
        case .light:
            return .light
        case .medium:
            return .medium
        case .heavy:
            return .heavy
        }
    }
    #endif
}

// =============================================================================
// MARK: - Haptic Pattern
// =============================================================================

enum HapticPattern {
    case density
    case tempo
    case pan
    case gain
    case custom

    func feedbackForValue(_ value: Double, previousValue: Double?) -> HapticIntensity? {
        switch self {
        case .density:
            // Light impact every 10%
            let percentage = Int(value * 100)
            if percentage % 10 == 0 {
                return .light
            }
            // Medium at boundaries (0%, 50%, 100%)
            if percentage == 0 || percentage == 50 || percentage == 100 {
                return .medium
            }
            // Heavy at extremes
            if percentage == 0 || percentage == 100 {
                return .heavy
            }
            return nil

        case .tempo:
            // Medium impact at BPM markers
            let bpm = Int(value)
            if [60, 80, 100, 120, 140, 160, 180].contains(bpm) {
                return .medium
            }
            return nil

        case .pan:
            // Heavy impact at center
            if abs(value) < 0.1 {
                return .heavy
            }
            return nil

        case .gain:
            // Medium at 0dB, heavy at max/min
            if abs(value) < 0.1 {
                return .medium
            }
            if value <= -12 || value >= 12 {
                return .heavy
            }
            return nil

        case .custom:
            return .light
        }
    }
}

// =============================================================================
// MARK: - Touch Optimized Slider
// =============================================================================

struct TouchOptimizedSlider: View {
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double
    let hapticPattern: HapticPattern
    let onDragStart: () -> Void
    let onValueChange: (Double) -> Void

    @State private var previousValue: Double?
    @State private var isDragging = false

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Track background
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.secondary.opacity(0.2))
                    .frame(height: 8)

                // Filled track
                RoundedRectangle(cornerRadius: 8)
                    .fill(trackColor)
                    .frame(width: trackWidth(in: geometry.size.width), height: 8)

                // Thumb
                Circle()
                    .fill(thumbColor)
                    .frame(width: thumbSize, height: thumbSize)
                    .offset(x: thumbOffset(in: geometry.size.width) - thumbSize / 2)
                    .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)
            }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { gesture in
                        if !isDragging {
                            isDragging = true
                            onDragStart()
                        }

                        let newValue = valueForLocation(gesture.location.x, in: geometry.size.width)
                        let steppedValue = roundToStep(newValue)

                        if steppedValue != value {
                            previousValue = value
                            value = steppedValue
                            onValueChange(steppedValue)

                            // Trigger haptic feedback based on pattern
                            if let intensity = hapticPattern.feedbackForValue(steppedValue, previousValue: previousValue) {
                                triggerHapticFeedback(intensity)
                            }
                        }
                    }
                    .onEnded { _ in
                        isDragging = false
                        previousValue = nil
                    }
            )
        }
    }

    // MARK: - Computed Properties

    private var thumbSize: CGFloat {
        #if os(iOS)
        return 44 // iOS minimum touch target
        #else
        return 28
        #endif
    }

    private var trackColor: Color {
        switch hapticPattern {
        case .density:
            return densityTrackColor
        case .tempo:
            return .blue
        case .pan:
            return .purple
        case .gain:
            return .green
        case .custom:
            return .accentColor
        }
    }

    private var densityTrackColor: Color {
        switch value {
        case 0.0..<0.2:
            return .green
        case 0.2..<0.4:
            return .blue
        case 0.4..<0.6:
            return .yellow
        case 0.6..<0.8:
            return .orange
        default:
            return .red
        }
    }

    private var thumbColor: Color {
        #if os(iOS)
        return isDragging ? .white : .accentColor
        #else
        return .accentColor
        #endif
    }

    // MARK: - Helper Methods

    private func trackWidth(in totalWidth: CGFloat) -> CGFloat {
        let normalizedValue = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        return CGFloat(normalizedValue) * totalWidth
    }

    private func thumbOffset(in totalWidth: CGFloat) -> CGFloat {
        let normalizedValue = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        return CGFloat(normalizedValue) * totalWidth
    }

    private func valueForLocation(_ location: CGFloat, in width: CGFloat) -> Double {
        let clampedLocation = max(0, min(location, width))
        let normalizedValue = Double(clampedLocation / width)
        return range.lowerBound + normalizedValue * (range.upperBound - range.lowerBound)
    }

    private func roundToStep(_ value: Double) -> Double {
        let steppedValue = round(value / step) * step
        return max(range.lowerBound, min(range.upperBound, steppedValue))
    }

    private func triggerHapticFeedback(_ intensity: HapticIntensity) {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: intensity.uiKitStyle)
        generator.impactOccurred()
        #endif
    }
}

// =============================================================================
// MARK: - Gesture Support Extensions
// =============================================================================

extension View {
    /// Adds swipe gesture for fine value adjustment
    func swipeGesture(
        axis: Axis = .horizontal,
        onSwipe: (CGFloat) -> Void
    ) -> some View {
        self.gesture(
            DragGesture()
                .onChanged { gesture in
                    let translation = axis == .horizontal ? gesture.translation.width : gesture.translation.height
                    onSwipe(translation)
                }
        )
    }

    /// Adds long-press gesture for preset menu
    func longPressMenu(
        actions: [UIMenuElement]
    ) -> some View {
        #if os(iOS)
        return self.contextMenu {
            Menu {
                ForEach(actions.indices, id: \.self) { index in
                    if let action = actions[index] as? UIAction {
                        Button(action: action.handler) {
                            Text(action.title)
                            if let image = action.image {
                                Image(uiImage: image)
                            }
                        }
                    }
                }
            } label: {
                Label("Presets", systemImage: "ellipsis.circle")
            }
        }
        #else
        return self
        #endif
    }
}

// =============================================================================
// MARK: - Shake to Undo Support
// =============================================================================

#if os(iOS)
extension UIApplication {
    func endEditing() {
        sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
#endif

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct PerformanceEditor_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Editing Solo Piano
            PerformanceEditor(
                performance: DefaultPerformances.soloPiano(),
                onSave: { _ in },
                onCancel: { }
            )
            .previewDisplayName("Solo Piano")

            // Editing SATB Choir
            PerformanceEditor(
                performance: DefaultPerformances.satb(),
                onSave: { _ in },
                onCancel: { }
            )
            .previewDisplayName("SATB Choir")

            // Editing Ambient Techno
            PerformanceEditor(
                performance: DefaultPerformances.ambientTechno(),
                onSave: { _ in },
                onCancel: { }
            )
            .previewDisplayName("Ambient Techno")

            // Dark mode
            PerformanceEditor(
                performance: DefaultPerformances.jazzTrio(),
                onSave: { _ in },
                onCancel: { }
            )
            .preferredColorScheme(.dark)
            .previewDisplayName("Dark Mode")
        }
    }
}
#endif
