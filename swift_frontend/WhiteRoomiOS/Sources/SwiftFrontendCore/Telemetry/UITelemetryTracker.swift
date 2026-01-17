//
//  UITelemetryTracker.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation
import SwiftUI

// =============================================================================
// MARK: - UI Telemetry Tracker
// =============================================================================

/**
 UI telemetry tracking system for automatic user interaction monitoring

 Integrates with CrashReporting.swift to provide comprehensive UI analytics:
 - Automatic tap/gesture tracking via SwiftUI modifiers
 - Screen view monitoring with timestamps
 - Navigation flow tracking
 - Value change logging for sliders, pickers, etc.
 - Thread-safe breadcrumb recording

 Usage:
 ```swift
 Button("Save") {
     saveProject()
 }
 .trackInteraction("Save Button")

 // Manual tracking
 UITelemetryTracker.shared.trackTap("Play Button", in: "MovingSidewalkView")
 ```
 */
public class UITelemetryTracker: ObservableObject {

    // MARK: - Singleton

    public static let shared = UITelemetryTracker()

    // MARK: - Properties

    private let crashReporting = CrashReporting.shared
    private let sessionId: String

    // Thread-safe event queue
    private actor EventQueue {
        var pendingEvents: [TelemetryEvent] = []

        func append(_ event: TelemetryEvent) {
            pendingEvents.append(event)
        }

        func flush() -> [TelemetryEvent] {
            let events = pendingEvents
            pendingEvents.removeAll()
            return events
        }

        var count: Int {
            pendingEvents.count
        }
    }

    private let eventQueue = EventQueue()

    // MARK: - Initialization

    private init() {
        self.sessionId = UUID().uuidString
        setupSession()
    }

    // MARK: - Public Tracking Methods

    /**
     Track a tap/click interaction

     - Parameters:
       - element: Element identifier (button name, etc.)
       - screen: Current screen name
     */
    public func trackTap(_ element: String, in screen: String) {
        let event = TelemetryEvent(
            type: .uiInteraction,
            screen: screen,
            element: element,
            action: "tap",
            context: [:]
        )

        Task {
            await eventQueue.append(event)
            crashReporting.leaveBreadcrumb(
                "Tapped: \(element)",
                category: "ui",
                level: .info,
                data: ["screen": screen, "element": element]
            )
        }
    }

    /**
     Track a gesture interaction

     - Parameters:
       - gesture: Gesture type (swipe, pinch, pan, etc.)
       - element: Element receiving gesture
     */
    public func trackGesture(_ gesture: String, on element: String) {
        let event = TelemetryEvent(
            type: .uiInteraction,
            screen: currentScreen(),
            element: element,
            action: "gesture",
            context: ["gesture_type": gesture]
        )

        Task {
            await eventQueue.append(event)
            crashReporting.leaveBreadcrumb(
                "Gesture: \(gesture) on \(element)",
                category: "ui",
                level: .info,
                data: ["gesture": gesture, "element": element]
            )
        }
    }

    /**
     Track navigation between screens

     - Parameters:
       - from: Source screen
       - to: Destination screen
     */
    public func trackNavigation(from: String, to: String) {
        let event = TelemetryEvent(
            type: .navigation,
            screen: from,
            element: nil,
            action: "navigate",
            context: ["destination": to]
        )

        Task {
            await eventQueue.append(event)
            crashReporting.trackNavigation(to, from: from)
        }
    }

    /**
     Track screen view

     - Parameter screen: Screen name
     */
    public func trackScreenView(_ screen: String) {
        let event = TelemetryEvent(
            type: .uiInteraction,
            screen: screen,
            element: nil,
            action: "screen_view",
            context: [:]
        )

        Task {
            await eventQueue.append(event)
            crashReporting.leaveBreadcrumb(
                "Screen view: \(screen)",
                category: "navigation",
                level: .info,
                data: ["screen": screen]
            )
        }
    }

    /**
     Track value change (slider, picker, toggle, etc.)

     - Parameters:
       - element: Element identifier
       - value: New value
     */
    public func trackValueChange(_ element: String, to value: Any) {
        let valueString: String
        if let intValue = value as? Int {
            valueString = String(intValue)
        } else if let doubleValue = value as? Double {
            valueString = String(format: "%.2f", doubleValue)
        } else if let boolValue = value as? Bool {
            valueString = boolValue ? "true" : "false"
        } else {
            valueString = String(describing: value)
        }

        let event = TelemetryEvent(
            type: .uiInteraction,
            screen: currentScreen(),
            element: element,
            action: "value_change",
            context: ["new_value": valueString]
        )

        Task {
            await eventQueue.append(event)
            crashReporting.leaveBreadcrumb(
                "Changed: \(element) to \(valueString)",
                category: "ui",
                level: .info,
                data: ["element": element, "value": valueString]
            )
        }
    }

    /**
     Track error in UI context

     - Parameters:
       - error: Error description
       - screen: Current screen
       - element: Related element (optional)
     */
    public func trackError(_ error: String, in screen: String, element: String? = nil) {
        let event = TelemetryEvent(
            type: .error,
            screen: screen,
            element: element,
            action: "error",
            context: ["error_description": error]
        )

        Task {
            await eventQueue.append(event)
            crashReporting.leaveBreadcrumb(
                "UI Error: \(error)",
                category: "ui",
                level: .error,
                data: ["screen": screen, "element": element ?? "unknown"]
            )
        }
    }

    // MARK: - Private Methods

    private func setupSession() {
        crashReporting.setCustomValue(sessionId, forKey: "telemetry_session_id")
        crashReporting.setCustomValue(Date(), forKey: "session_start_time")
    }

    private func currentScreen() -> String {
        // In a real implementation, this would detect the current screen
        // For now, return "unknown" - can be enhanced with screen tracking
        return "unknown"
    }
}

// =============================================================================
// MARK: - SwiftUI View Modifier
// =============================================================================

/**
 SwiftUI view modifier for automatic interaction tracking

 Usage:
 ```swift
 Button("Save") {
     saveProject()
 }
 .trackInteraction("Save Button")
 */
public struct TrackInteractionModifier: ViewModifier {
    let element: String
    let screen: String

    @Environment(\.isEnabled) private var isEnabled: Bool

    public func body(content: Content) -> some View {
        if isEnabled {
            content
                .simultaneousGesture(
                    TapGesture()
                        .onEnded { _ in
                            UITelemetryTracker.shared.trackTap(element, in: screen)
                        }
                )
        } else {
            content
        }
    }
}

public extension View {
    /**
     Track user interactions on this view

     - Parameters:
       - element: Element identifier
       - screen: Current screen (optional, auto-detected if possible)

     - Returns: View with tracking enabled
     */
    func trackInteraction(_ element: String, in screen: String = "unknown") -> some View {
        self.modifier(TrackInteractionModifier(element: element, screen: screen))
    }
}

// =============================================================================
// MARK: - Custom Gesture Tracking
// =============================================================================

/**
 Gesture tracking wrapper for complex gestures
 */
public struct TrackedGestureView<Content: View>: View {
    let content: Content
    let element: String
    let screen: String

    public init(element: String, screen: String = "unknown", @ViewBuilder content: () -> Content) {
        self.element = element
        self.screen = screen
        self.content = content()
    }

    public var body: some View {
        content
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onEnded { _ in
                        UITelemetryTracker.shared.trackTap(element, in: screen)
                    }
            )
    }
}
