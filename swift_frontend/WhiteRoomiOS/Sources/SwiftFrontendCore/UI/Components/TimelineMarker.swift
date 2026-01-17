//
//  TimelineMarker.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//
//  Draggable timeline markers for loop start/end points.
//  Interactive components with snapping, visual feedback, and smooth animations.

import SwiftUI

// =============================================================================
// MARK: - Timeline Marker View
// =============================================================================

/**
 Draggable marker for loop start/end positions on the timeline.

 Features:
 - Drag to reposition
 - Snap to grid (beats, bars)
 - Visual feedback during drag
 - Smooth animations
 - Touch and mouse support
 - Accessibility support
 */
public struct TimelineMarker: View {

    // MARK: - Types

    public enum MarkerType {
        case loopStart
        case loopEnd
        case custom
    }

    // MARK: - State

    @Binding private var position: Double
    private let type: MarkerType
    private let duration: Double
    private let color: Color
    private let onDragChanged: ((Double) -> Void)?
    private let onDragEnded: ((Double) -> Void)?

    @State private var isDragging = false
    @State private var dragOffset: CGFloat = 0
    @State private var showTooltip = false

    // MARK: - Environment

    @Environment(\.colorScheme) private var colorScheme: ColorScheme

    // MARK: - Computed Properties

    private var isDarkMode: Bool {
        colorScheme == .dark
    }

    // MARK: - Initialization

    public init(
        position: Binding<Double>,
        type: MarkerType,
        duration: Double,
        color: Color = .blue,
        onDragChanged: ((Double) -> Void)? = nil,
        onDragEnded: ((Double) -> Void)? = nil
    ) {
        self._position = position
        self.type = type
        self.duration = duration
        self.color = color
        self.onDragChanged = onDragChanged
        self.onDragEnded = onDragEnded
    }

    // MARK: - Body

    public var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Marker line
                markerLine
                    .position(x: 0, y: geometry.size.height / 2)

                // Marker handle (top)
                markerHandle
                    .position(x: 0, y: 0)

                // Marker base (bottom)
                markerBase
                    .position(x: 0, y: geometry.size.height)

                // Tooltip (shows when dragging)
                if showTooltip || isDragging {
                    tooltip
                        .position(x: 0, y: -40)
                }
            }
            .frame(width: markerWidth)
            .background(
                // Invisible drag handle
                Color.clear
                    .frame(width: dragHandleWidth)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(coordinateSpace: .global)
                            .onChanged { value in
                                handleDragChanged(value, geometry: geometry)
                            }
                            .onEnded { value in
                                handleDragEnded(value, geometry: geometry)
                            }
                    )
            )
            .onTapGesture(count: 2) {
                // Double tap to reset
                resetToDefault()
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(accessibilityLabel)
            .accessibilityHint("Drag to adjust position, double tap to reset")
            .accessibilityValue(Text(formattedPosition))
        }
    }

    // MARK: - Marker Components

    private var markerLine: some View {
        Rectangle()
            .fill(color)
            .frame(width: 2)
    }

    private var markerHandle: some View {
        ZStack {
            // Handle background
            RoundedRectangle(cornerRadius: 4)
                .fill(color)
                .frame(width: 12, height: 16)

            // Handle icon
            Image(systemName: handleIcon)
                .font(.caption2)
                .fontWeight(.bold)
                .foregroundColor(.white)
        }
        .shadow(color: color.opacity(0.4), radius: 4, x: 0, y: 2)
    }

    private var markerBase: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(color.opacity(0.6))
            .frame(width: 8, height: 4)
    }

    private var tooltip: some View {
        HStack(spacing: 4) {
            Image(systemName: type == .loopStart ? "arrow.right" : "arrow.left")
                .font(.caption2)

            Text(formattedPosition)
                .font(.caption)
                .fontWeight(.semibold)
                .monospacedDigit()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(color.opacity(0.9))
                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
        )
        .foregroundColor(.white)
    }

    // MARK: - Computed Properties

    private var markerWidth: CGFloat {
        20
    }

    private var dragHandleWidth: CGFloat {
        40
    }

    private var handleIcon: String {
        switch type {
        case .loopStart:
            return "arrowtriangle.right.fill"
        case .loopEnd:
            return "arrowtriangle.left.fill"
        case .custom:
            return "circle.fill"
        }
    }

    private var accessibilityLabel: String {
        switch type {
        case .loopStart:
            return "Loop start marker"
        case .loopEnd:
            return "Loop end marker"
        case .custom:
            return "Timeline marker"
        }
    }

    private var formattedPosition: String {
        let mins = Int(position) / 60
        let secs = Int(position) % 60
        let ms = Int((position.truncatingRemainder(dividingBy: 1)) * 100)
        return String(format: "%02d:%02d.%02d", mins, secs, ms)
    }

    // MARK: - Drag Handlers

    private func handleDragChanged(_ value: DragGesture.Value, geometry: GeometryProxy) {
        isDragging = true
        showTooltip = true

        // Calculate new position based on drag
        let timelineWidth = geometry.size.width
        let deltaX = value.translation.width
        let newPosition = position + (Double(deltaX) / timelineWidth * duration)

        // Snap to grid
        let snappedPosition = snapToGrid(newPosition)

        // Update position
        position = max(0.0, min(snappedPosition, duration))

        onDragChanged?(position)
    }

    private func handleDragEnded(_ value: DragGesture.Value, geometry: GeometryProxy) {
        isDragging = false

        // Final snap
        let snappedPosition = snapToGrid(position)
        position = max(0.0, min(snappedPosition, duration))

        // Hide tooltip after delay
        Task {
            try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
            showTooltip = false
        }

        onDragEnded?(position)
    }

    private func snapToGrid(_ pos: Double) -> Double {
        // Snap to nearest beat (assuming 120 BPM, 4/4 time)
        let beatDuration = 0.5 // 120 BPM = 0.5 seconds per beat

        // Snap options: beat, half beat, quarter beat
        let snapIntervals = [beatDuration, beatDuration / 2, beatDuration / 4]

        // Find closest snap point
        for interval in snapIntervals {
            let snapped = (pos / interval).rounded() * interval
            if abs(pos - snapped) < (interval / 4) {
                return snapped
            }
        }

        return pos
    }

    private func resetToDefault() {
        switch type {
        case .loopStart:
            position = 0.0
        case .loopEnd:
            position = duration
        case .custom:
            position = duration / 2
        }

        // Provide haptic feedback on supported platforms
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        #endif
    }
}

// =============================================================================
// MARK: - Loop Markers Pair
// =============================================================================

/**
 A pair of loop start/end markers that work together.

 Ensures start never exceeds end, provides visual feedback for loop region.
 */
public struct LoopMarkersPair: View {

    @Binding private var loopStart: Double
    @Binding private var loopEnd: Double
    private let duration: Double
    private let color: Color
    private let isEnabled: Bool

    @State private var isDraggingStart = false
    @State private var isDraggingEnd = false

    // MARK: - Initialization

    public init(
        loopStart: Binding<Double>,
        loopEnd: Binding<Double>,
        duration: Double,
        color: Color = .blue,
        isEnabled: Bool = true
    ) {
        self._loopStart = loopStart
        self._loopEnd = loopEnd
        self.duration = duration
        self.color = color
        self.isEnabled = isEnabled
    }

    // MARK: - Body

    public var body: some View {
        ZStack(alignment: .leading) {
            // Loop region background
            if isEnabled && loopEnd > loopStart {
                loopRegionBackground
            }

            // Start marker
            TimelineMarker(
                position: Binding(
                    get: { loopStart },
                    set: { newStart in
                        // Ensure start doesn't exceed end
                        loopStart = min(newStart, loopEnd - 0.1)
                    }
                ),
                type: .loopStart,
                duration: duration,
                color: color
            )
            .opacity(isEnabled ? 1.0 : 0.5)
            .disabled(!isEnabled)

            // End marker
            TimelineMarker(
                position: Binding(
                    get: { loopEnd },
                    set: { newEnd in
                        // Ensure end doesn't precede start
                        loopEnd = max(newEnd, loopStart + 0.1)
                    }
                ),
                type: .loopEnd,
                duration: duration,
                color: color
            )
            .offset(x: calculateOffset())
            .opacity(isEnabled ? 1.0 : 0.5)
            .disabled(!isEnabled)
        }
    }

    // MARK: - View Components

    private var loopRegionBackground: some View {
        GeometryReader { geometry in
            let startX = (loopStart / duration) * geometry.size.width
            let endX = (loopEnd / duration) * geometry.size.width
            let width = endX - startX

            ZStack {
                // Background fill
                RoundedRectangle(cornerRadius: 4)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                color.opacity(0.1),
                                color.opacity(0.2),
                                color.opacity(0.1)
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                // Top edge
                Rectangle()
                    .fill(color.opacity(0.3))
                    .frame(height: 1)

                // Bottom edge
                Rectangle()
                    .fill(color.opacity(0.3))
                    .frame(height: 1)
            }
            .frame(width: width)
            .position(x: startX + width / 2, y: geometry.size.height / 2)
        }
    }

    // MARK: - Helper Methods

    private func calculateOffset() -> CGFloat {
        // This would be calculated based on actual view geometry
        // For now, return a placeholder
        return 0
    }
}

// =============================================================================
// MARK: - Marker Control Panel
// =============================================================================

/**
 Control panel for managing timeline markers.

 Provides buttons to add, remove, and reset markers.
 */
public struct MarkerControlPanel: View {

    @Binding private var loopStart: Double
    @Binding private var loopEnd: Double
    @Binding private var isLooping: Bool
    private let duration: Double
    private let color: Color

    // MARK: - Initialization

    public init(
        loopStart: Binding<Double>,
        loopEnd: Binding<Double>,
        isLooping: Binding<Double>,
        duration: Double,
        color: Color = .blue
    ) {
        self._loopStart = loopStart
        self._loopEnd = loopEnd
        self._isLooping = isLooping
        self.duration = duration
        self.color = color
    }

    // MARK: - Body

    public var body: some View {
        HStack(spacing: 12) {
            // Toggle loop button
            Button(action: toggleLoop) {
                HStack(spacing: 6) {
                    Image(systemName: isLooping ? "repeat.circle.fill" : "repeat.circle")
                        .font(.title3)

                    Text(isLooping ? "Loop On" : "Loop Off")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                .foregroundColor(isLooping ? .white : color)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(isLooping ? color : color.opacity(0.1))
                )
            }
            .buttonStyle(PlainButtonStyle())

            Spacer()

            // Set to selection button
            Button(action: setToSelection) {
                Image(systemName: "square.and.arrow.down")
                    .font(.body)
                    .foregroundColor(color)
                    .frame(width: 36, height: 36)
                    .background(
                        Circle()
                            .fill(color.opacity(0.1))
                    )
            }
            .buttonStyle(PlainButtonStyle())

            // Reset markers button
            Button(action: resetMarkers) {
                Image(systemName: "arrow.counterclockwise")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .frame(width: 36, height: 36)
                    .background(
                        Circle()
                            .fill(Color.secondary.opacity(0.1))
                    )
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
    }

    // MARK: - Actions

    private func toggleLoop() {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            isLooping.toggle()
        }

        // Provide haptic feedback
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        #endif
    }

    private func setToSelection() {
        // Set loop to a predefined region (e.g., first 8 bars)
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            loopStart = 0.0
            loopEnd = min(16.0, duration) // 16 seconds or duration
        }

        // Provide haptic feedback
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        #endif
    }

    private func resetMarkers() {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            loopStart = 0.0
            loopEnd = duration
        }

        // Provide haptic feedback
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        #endif
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct TimelineMarker_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            // Single marker
            TimelineMarkerPreview()
                .previewDisplayName("Single Marker")
                .frame(height: 200)

            // Loop markers pair
            LoopMarkersPairPreview()
                .previewDisplayName("Loop Markers")
                .frame(height: 200)

            // Marker control panel
            MarkerControlPanelPreview()
                .previewDisplayName("Control Panel")

            // Dark mode
            TimelineMarkerPreview()
                .previewDisplayName("Dark Mode")
                .preferredColorScheme(.dark)
                .frame(height: 200)
        }
        .padding()
    }

    private struct TimelineMarkerPreview: View {
        @State private var position: Double = 30.0

        var body: some View {
            ZStack(alignment: .leading) {
                // Timeline background
                Rectangle()
                    .fill(Color.secondary.opacity(0.1))
                    .overlay(
                        Grid()
                    )

                TimelineMarker(
                    position: $position,
                    type: .loopStart,
                    duration: 180.0,
                    color: .blue
                )
            }
        }

        private struct Grid: View {
            var body: some View {
                GeometryReader { geometry in
                    ForEach(0..<10) { i in
                        let x = CGFloat(i) * geometry.size.width / 10
                        Rectangle()
                            .fill(Color.secondary.opacity(0.2))
                            .frame(width: 1)
                            .position(x: x, y: geometry.size.height / 2)
                    }
                }
            }
        }
    }

    private struct LoopMarkersPairPreview: View {
        @State private var loopStart: Double = 30.0
        @State private var loopEnd: Double = 60.0

        var body: some View {
            ZStack(alignment: .leading) {
                // Timeline background
                Rectangle()
                    .fill(Color.secondary.opacity(0.1))

                LoopMarkersPair(
                    loopStart: $loopStart,
                    loopEnd: $loopEnd,
                    duration: 180.0,
                    color: .purple,
                    isEnabled: true
                )
            }
        }
    }

    private struct MarkerControlPanelPreview: View {
        @State private var loopStart: Double = 30.0
        @State private var loopEnd: Double = 60.0
        @State private var isLooping: Bool = true

        var body: some View {
            MarkerControlPanel(
                loopStart: $loopStart,
                loopEnd: $loopEnd,
                isLooping: $isLooping,
                duration: 180.0,
                color: .orange
            )
        }
    }
}
#endif
