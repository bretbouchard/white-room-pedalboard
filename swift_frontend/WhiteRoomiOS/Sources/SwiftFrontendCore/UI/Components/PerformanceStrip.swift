//
//  PerformanceStrip.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

/// A horizontal scrolling strip showing all Performances for the current Song.
///
/// PerformanceStrip displays performance cards with thumbnails, names, and quick stats.
/// Supports tap to activate, long-press for edit/delete, and swipe-up to expand Performance Editor.
/// Includes a + Create New Performance button at the bottom.
///
/// Adapted for iPhone (compact) and iPad/Mac (regular) size classes.
public struct PerformanceStrip: View {

    // MARK: - State

    @Binding private var performances: [PerformanceState]
    @Binding private var activePerformanceId: String
    @State private var draggedPerformance: PerformanceState?
    @State private var showingPerformanceEditor = false
    @State private var editingPerformance: PerformanceState?
    @State private var showingDeleteAlert = false
    @State private var deletingPerformance: PerformanceState?

    // MARK: - Environment

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass

    // MARK: - Callbacks

    private let onPerformanceSelected: (PerformanceState) -> Void
    private let onCreatePerformance: () -> Void
    private let onDeletePerformance: (PerformanceState) -> Void

    // MARK: - Computed Properties

    /// Whether the current layout is compact (iPhone portrait)
    private var isCompactWidth: Bool {
        horizontalSizeClass == .compact
    }

    /// Active performance or first performance if none selected
    private var activePerformance: PerformanceState? {
        performances.first { $0.id == activePerformanceId } ?? performances.first
    }

    // MARK: - Initialization

    /// Creates a new PerformanceStrip
    /// - Parameters:
    ///   - performances: Array of performances to display
    ///   - activePerformanceId: ID of the currently active performance
    ///   - onPerformanceSelected: Callback when a performance is tapped
    ///   - onCreatePerformance: Callback when + Create New Performance is tapped
    ///   - onDeletePerformance: Callback when a performance is deleted
    public init(
        performances: Binding<[PerformanceState]>,
        activePerformanceId: Binding<String>,
        onPerformanceSelected: @escaping (PerformanceState) -> Void,
        onCreatePerformance: @escaping () -> Void,
        onDeletePerformance: @escaping (PerformanceState) -> Void
    ) {
        self._performances = performances
        self._activePerformanceId = activePerformanceId
        self.onPerformanceSelected = onPerformanceSelected
        self.onCreatePerformance = onCreatePerformance
        self.onDeletePerformance = onDeletePerformance
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HeaderView()

            // Performance Strip
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: isCompactWidth ? 12 : 16) {
                    ForEach(performances) { performance in
                        PerformanceCard(
                            performance: performance,
                            isActive: performance.id == activePerformanceId,
                            isCompact: isCompactWidth,
                            onTap: {
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    activePerformanceId = performance.id
                                    onPerformanceSelected(performance)
                                }
                            },
                            onLongPress: {
                                editingPerformance = performance
                                showingPerformanceEditor = true
                            },
                            onSwipeUp: {
                                editingPerformance = performance
                                showingPerformanceEditor = true
                            }
                        )
                    }
                }
                .padding(.horizontal, isCompactWidth ? 12 : 16)
                .padding(.vertical, isCompactWidth ? 8 : 12)
            }
            .frame(height: isCompactWidth ? 140 : 160)

            Divider()

            // Create New Performance Button
            CreatePerformanceButton(
                isCompact: isCompactWidth,
                onTap: onCreatePerformance
            )
            .padding(isCompactWidth ? 12 : 16)
        }
        .sheet(isPresented: $showingPerformanceEditor) {
            if let performance = editingPerformance {
                PerformanceEditorSheet(
                    performance: performance,
                    isEditing: true,
                    onSave: { updatedPerformance in
                        updatePerformance(updatedPerformance)
                        showingPerformanceEditor = false
                    },
                    onDelete: {
                        deletingPerformance = performance
                        showingDeleteAlert = true
                        showingPerformanceEditor = false
                    },
                    onCancel: {
                        showingPerformanceEditor = false
                    }
                )
            }
        }
        .alert("Delete Performance", isPresented: $showingDeleteAlert, presenting: deletingPerformance) { performance in
            Button("Delete", role: .destructive) {
                if let perf = deletingPerformance {
                    deletePerformance(perf)
                }
                showingDeleteAlert = false
            }
            Button("Cancel", role: .cancel) {
                showingDeleteAlert = false
            }
        } message: { performance in
            Text("Are you sure you want to delete \"\(performance.name)\"? This action cannot be undone.")
        }
    }

    // MARK: - Helper Views

    private func HeaderView() -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Performances")
                    .font(isCompactWidth ? .headline : .title3)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)

                Text("\(performances.count) parallel universe\(performances.count == 1 ? "" : "s")")
                    .font(isCompactWidth ? .caption2 : .caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if let active = activePerformance {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Active")
                        .font(isCompactWidth ? .caption2 : .caption)
                        .foregroundColor(.secondary)

                    Text(active.name)
                        .font(isCompactWidth ? .caption : .caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                }
            }
        }
        .padding(.horizontal, isCompactWidth ? 12 : 16)
        .padding(.top, isCompactWidth ? 12 : 16)
        .padding(.bottom, isCompactWidth ? 8 : 12)
    }

    // MARK: - Actions

    private func updatePerformance(_ performance: PerformanceState) {
        if let index = performances.firstIndex(where: { $0.id == performance.id }) {
            performances[index] = performance
        }
    }

    private func deletePerformance(_ performance: PerformanceState) {
        withAnimation {
            performances.removeAll { $0.id == performance.id }

            // Update active performance if we deleted the active one
            if activePerformanceId == performance.id {
                activePerformanceId = performances.first?.id ?? ""
            }

            onDeletePerformance(performance)
        }
    }
}

// MARK: - Performance Card

/// A single performance card in the strip
// DUPLICATE: private struct PerformanceCard: View {
// DUPLICATE: 
// DUPLICATE:     let performance: PerformanceState
// DUPLICATE:     let isActive: Bool
// DUPLICATE:     let isCompact: Bool
// DUPLICATE:     let onTap: () -> Void
// DUPLICATE:     let onLongPress: () -> Void
// DUPLICATE:     let onSwipeUp: () -> Void
// DUPLICATE: 
// DUPLICATE:     @State private var isPressed = false
// DUPLICATE:     @State private var offset: CGFloat = 0
// DUPLICATE: 
// DUPLICATE:     var body: some View {
// DUPLICATE:         VStack(spacing: isCompact ? 6 : 8) {
// DUPLICATE:             // Thumbnail with waveform
// DUPLICATE:             ThumbnailView(
// DUPLICATE:                 performance: performance,
// DUPLICATE:                 isActive: isActive,
// DUPLICATE:                 isCompact: isCompact
// DUPLICATE:             )
// DUPLICATE: 
// DUPLICATE:             // Performance Name
// DUPLICATE:             Text(performance.name)
// DUPLICATE:                 .font(isCompact ? .caption : .caption)
// DUPLICATE:                 .fontWeight(isActive ? .semibold : .regular)
// DUPLICATE:                 .foregroundColor(isActive ? .primary : .secondary)
// DUPLICATE:                 .lineLimit(1)
// DUPLICATE:                 .frame(maxWidth: isCompact ? 100 : 120)
// DUPLICATE: 
// DUPLICATE:             // Quick Stats
// DUPLICATE:             QuickStatsView(
// DUPLICATE:                 performance: performance,
// DUPLICATE:                 isCompact: isCompact
// DUPLICATE:             )
// DUPLICATE:         }
// DUPLICATE:         .padding(isCompact ? 8 : 10)
// DUPLICATE:         .background(
// DUPLICATE:             RoundedRectangle(cornerRadius: isCompact ? 10 : 12)
// DUPLICATE:                 .fill(isActive ? Color.blue.opacity(0.1) : Color.secondary.opacity(0.05))
// DUPLICATE:                 .shadow(
// DUPLICATE:                     color: isActive ? .blue.opacity(0.3) : .black.opacity(0.1),
// DUPLICATE:                     radius: isActive ? 8 : 4,
// DUPLICATE:                     x: 0,
// DUPLICATE:                     y: isActive ? 4 : 2
// DUPLICATE:                 )
// DUPLICATE:         )
// DUPLICATE:         .overlay(
// DUPLICATE:             RoundedRectangle(cornerRadius: isCompact ? 10 : 12)
// DUPLICATE:                 .stroke(
// DUPLICATE:                     isActive ? Color.blue : Color.clear,
// DUPLICATE:                     lineWidth: 2
// DUPLICATE:                 )
// DUPLICATE:         )
// DUPLICATE:         .scaleEffect(isPressed ? 0.95 : 1.0)
// DUPLICATE:         .offset(y: offset)
// DUPLICATE:         .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
// DUPLICATE:         .animation(.spring(response: 0.3, dampingFraction: 0.7), value: offset)
// DUPLICATE:         .gesture(
// DUPLICATE:             SimultaneousGesture(
// DUPLICATE:                 // Tap gesture
// DUPLICATE:                 TapGesture()
// DUPLICATE:                     .onEnded { _ in
// DUPLICATE:                         onTap()
// DUPLICATE:                     },
// DUPLICATE: 
// DUPLICATE:                 // Long press gesture
// DUPLICATE:                 LongPressGesture(minimumDuration: 0.5)
// DUPLICATE:                     .onEnded { _ in
// DUPLICATE:                         onLongPress()
// DUPLICATE:                     },
// DUPLICATE: 
// DUPLICATE:                 // Drag gesture for swipe up
// DUPLICATE:                 DragGesture(minimumDistance: 50)
// DUPLICATE:                     .onChanged { value in
// DUPLICATE:                         if value.translation.height < -50 {
// DUPLICATE:                             offset = -10
// DUPLICATE:                         }
// DUPLICATE:                     }
// DUPLICATE:                     .onEnded { value in
// DUPLICATE:                         if value.translation.height < -50 {
// DUPLICATE:                             onSwipeUp()
// DUPLICATE:                         }
// DUPLICATE:                         offset = 0
// DUPLICATE:                     }
// DUPLICATE:             )
// DUPLICATE:         )
// DUPLICATE:         .onTapGesture {
// DUPLICATE:             // Fallback tap gesture
// DUPLICATE:             onTap()
// DUPLICATE:         }
// DUPLICATE:     }
// DUPLICATE: }

// MARK: - Thumbnail View

/// Thumbnail view with waveform visualization
private struct ThumbnailView: View {

    let performance: PerformanceState
    let isActive: Bool
    let isCompact: Bool

    var body: some View {
        ZStack {
            // Background gradient based on performance mode
            LinearGradient(
                gradient: gradientForMode(performance.mode),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .opacity(isActive ? 0.8 : 0.6)

            // Waveform visualization
            WaveformView(
                performance: performance,
                isActive: isActive,
                isCompact: isCompact
            )

            // Active indicator
            if isActive {
                VStack {
                    HStack {
                        Spacer()

                        Image(systemName: "checkmark.circle.fill")
                            .font(isCompact ? .caption : .body)
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
                    }
                    Spacer()
                }
                .padding(4)
            }
        }
        .frame(width: isCompact ? 100 : 120, height: isCompact ? 60 : 80)
        .clipShape(RoundedRectangle(cornerRadius: isCompact ? 8 : 10))
    }

    private func gradientForMode(_ mode: PerformanceState.PerformanceMode) -> Gradient {
        switch mode {
        case .piano:
            return Gradient(colors: [.blue, .purple])
        case .satb:
            return Gradient(colors: [.green, .teal])
        case .techno:
            return Gradient(colors: [.orange, .red])
        case .custom:
            return Gradient(colors: [.pink, .purple])
        }
    }
}

// MARK: - Waveform View

/// Waveform visualization for performance thumbnail
private struct WaveformView: View {

    let performance: PerformanceState
    let isActive: Bool
    let isCompact: Bool

    var body: some View {
        GeometryReader { geometry in
            let width = geometry.size.width
            let height = geometry.size.height

            // Generate waveform bars based on density
            let barCount = isCompact ? 20 : 30
            let barWidth = width / CGFloat(barCount)

            ZStack {
                ForEach(0..<barCount, id: \.self) { i in
                    let barHeight = generateBarHeight(for: i, total: barCount, maxHeight: height)
                    let xPosition = CGFloat(i) * barWidth

                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.white.opacity(isActive ? 0.9 : 0.6))
                        .frame(width: barWidth - 2, height: barHeight)
                        .offset(y: (height - barHeight) / 2)
                }
            }
        }
    }

    private func generateBarHeight(for index: Int, total: Int, maxHeight: CGFloat) -> CGFloat {
        // Generate pseudo-random but consistent waveform based on performance ID
        let hash = performance.id.hashValue
        let seed = abs(hash + index * 13)

        // Use density to affect overall height
        let densityMultiplier = performance.globalDensityMultiplier
        let randomFactor = CGFloat(seed % 100) / 100.0

        let minHeight = maxHeight * 0.2
        let maxBarHeight = maxHeight * 0.8 * densityMultiplier

        return minHeight + (maxBarHeight * randomFactor)
    }
}

// MARK: - Quick Stats View

/// Quick stats display (density, tempo, key)
private struct QuickStatsView: View {

    let performance: PerformanceState
    let isCompact: Bool

    var body: some View {
        HStack(spacing: isCompact ? 4 : 6) {
            // Density indicator
            StatIndicator(
                icon: "circle.fill",
                value: String(format: "%.0f%%", performance.globalDensityMultiplier * 100),
                isCompact: isCompact
            )

            // Tempo multiplier
            StatIndicator(
                icon: "metronome",
                value: String(format: "%.1fx", performance.tempoMultiplier),
                isCompact: isCompact
            )

            // Mode indicator
            StatIndicator(
                icon: modeIcon(performance.mode),
                value: modeLabel(performance.mode),
                isCompact: isCompact
            )
        }
    }

    private func modeIcon(_ mode: PerformanceState.PerformanceMode) -> String {
        switch mode {
        case .piano: return "pianokeys"
        case .satb: return "person.3.fill"
        case .techno: return "waveform.path"
        case .custom: return "star.fill"
        }
    }

    private func modeLabel(_ mode: PerformanceState.PerformanceMode) -> String {
        switch mode {
        case .piano: return "Piano"
        case .satb: return "SATB"
        case .techno: return "Techno"
        case .custom: return "Custom"
        }
    }
}

/// Individual stat indicator
private struct StatIndicator: View {

    let icon: String
    let value: String
    let isCompact: Bool

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: icon)
                .font(isCompact ? .caption2 : .caption2)
                .foregroundColor(.secondary)

            Text(value)
                .font(isCompact ? .caption2 : .caption2)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Create Performance Button

/// Button to create a new performance
private struct CreatePerformanceButton: View {

    let isCompact: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                Image(systemName: "plus.circle.fill")
                    .font(isCompact ? .title3 : .title2)
                    .foregroundColor(.blue)

                Text("Create New Performance")
                    .font(isCompact ? .subheadline : .body)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)

                Spacer()
            }
            .padding(.horizontal, isCompact ? 14 : 16)
            .padding(.vertical, isCompact ? 12 : 14)
            .background(
                RoundedRectangle(cornerRadius: isCompact ? 10 : 12)
                    .fill(Color.blue.opacity(0.1))
                    .overlay(
                        RoundedRectangle(cornerRadius: isCompact ? 10 : 12)
                            .stroke(Color.blue.opacity(0.3), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Performance Editor Sheet (Placeholder)

/// Placeholder for Performance Editor sheet
private struct PerformanceEditorSheet: View {

    let performance: PerformanceState
    let isEditing: Bool
    let onSave: (PerformanceState) -> Void
    let onDelete: () -> Void
    let onCancel: () -> Void

    @State private var editedPerformance: PerformanceState

    init(
        performance: PerformanceState,
        isEditing: Bool,
        onSave: @escaping (PerformanceState) -> Void,
        onDelete: @escaping () -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.performance = performance
        self.isEditing = isEditing
        self.onSave = onSave
        self.onDelete = onDelete
        self.onCancel = onCancel
        self._editedPerformance = State(initialValue: performance)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Performance Details") {
                    TextField("Name", text: $editedPerformance.name)

                    Picker("Mode", selection: $editedPerformance.mode) {
                        Text("Piano").tag(PerformanceState.PerformanceMode.piano)
                        Text("SATB").tag(PerformanceState.PerformanceMode.satb)
                        Text("Techno").tag(PerformanceState.PerformanceMode.techno)
                        Text("Custom").tag(PerformanceState.PerformanceMode.custom)
                    }
                }

                Section("Settings") {
                    VStack(alignment: .leading) {
                        Text("Density: \(String(format: "%.0f%%", editedPerformance.globalDensityMultiplier * 100))")
                        Slider(value: $editedPerformance.globalDensityMultiplier, in: 0...2)
                    }

                    VStack(alignment: .leading) {
                        Text("Tempo Multiplier: \(String(format: "%.1fx", editedPerformance.tempoMultiplier))")
                        Slider(value: $editedPerformance.tempoMultiplier, in: 0.5...2.0)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Performance" : "New Performance")
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
                    HStack {
                        if isEditing {
                            Button(role: .destructive) {
                                onDelete()
                            } label: {
                                Image(systemName: "trash")
                            }
                        }

                        Button("Save") {
                            onSave(editedPerformance)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
struct PerformanceStrip_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // iPhone SE (compact)
            PerformanceStrip(
                performances: .constant(mockPerformances),
                activePerformanceId: .constant("piano"),
                onPerformanceSelected: { _ in },
                onCreatePerformance: { },
                onDeletePerformance: { _ in }
            )
            .previewDevice("iPhone SE (3rd generation)")
            .previewDisplayName("iPhone SE")

            // iPhone 14 Pro (compact)
            PerformanceStrip(
                performances: .constant(mockPerformances),
                activePerformanceId: .constant("satb"),
                onPerformanceSelected: { _ in },
                onCreatePerformance: { },
                onDeletePerformance: { _ in }
            )
            .previewDevice("iPhone 14 Pro")
            .previewDisplayName("iPhone 14 Pro")

            // iPad Pro (regular)
            PerformanceStrip(
                performances: .constant(mockPerformances),
                activePerformanceId: .constant("techno"),
                onPerformanceSelected: { _ in },
                onCreatePerformance: { },
                onDeletePerformance: { _ in }
            )
            .previewDevice("iPad Pro (12.9-inch) (6th generation)")
            .previewDisplayName("iPad Pro")

            // Dark mode
            PerformanceStrip(
                performances: .constant(mockPerformances),
                activePerformanceId: .constant("piano"),
                onPerformanceSelected: { _ in },
                onCreatePerformance: { },
                onDeletePerformance: { _ in }
            )
            .previewDevice("iPhone 14 Pro")
            .preferredColorScheme(.dark)
            .previewDisplayName("iPhone 14 Pro - Dark")
        }
    }

    private static let mockPerformances: [PerformanceState] = [
        PerformanceState(
            id: "piano",
            name: "Solo Piano",
            version: "1.0",
            mode: .piano,
            roleOverrides: [:],
            globalDensityMultiplier: 0.6,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .straight,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["piano", "minimal"],
            createdAt: Date(),
            updatedAt: Date()
        ),
        PerformanceState(
            id: "satb",
            name: "SATB Choir",
            version: "1.0",
            mode: .satb,
            roleOverrides: [:],
            globalDensityMultiplier: 0.8,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .straight,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["choral", "ensemble"],
            createdAt: Date(),
            updatedAt: Date()
        ),
        PerformanceState(
            id: "techno",
            name: "Ambient Techno",
            version: "1.0",
            mode: .techno,
            roleOverrides: [:],
            globalDensityMultiplier: 1.2,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .swing,
            tempoMultiplier: 1.2,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["electronic", "ambient"],
            createdAt: Date(),
            updatedAt: Date()
        ),
        PerformanceState(
            id: "custom",
            name: "Jazz Trio",
            version: "1.0",
            mode: .custom,
            roleOverrides: [:],
            globalDensityMultiplier: 0.9,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .swing,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: ["jazz", "improvisation"],
            createdAt: Date(),
            updatedAt: Date()
        )
    ]
}
#endif
