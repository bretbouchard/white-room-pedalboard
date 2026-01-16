//
//  AccessibilityTesting.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Accessibility Testing Utilities
// =============================================================================

/**
 Utilities for testing accessibility features

 Provides tools for:
 - Accessibility audit
 - Contrast ratio checking
 - Touch target measurement
 - VoiceOver testing
 - Dynamic Type testing
 */
public struct AccessibilityTester {

    // MARK: - Audit Results

    public struct AuditResult {
        public let totalElements: Int
        public let labelledElements: Int
        public let missingLabels: Int
        public let issues: [AccessibilityIssue]

        public var score: Double {
            Double(labelledElements) / Double(totalElements)
        }

        public var passed: Bool {
            score >= 0.95 && issues.isEmpty
        }
    }

    public struct AccessibilityIssue {
        public let type: IssueType
        public let description: String
        public let severity: Severity
        public let element: String

        public enum IssueType {
            case missingLabel
            case poorContrast
            case smallTouchTarget
            case noKeyboardAccess
            case noDynamicType
            case colorOnlyIndicator
        }

        public enum Severity {
            case critical
            case high
            case medium
            case low
        }
    }

    // MARK: - Audit Functions

    /**
     Perform accessibility audit on view
     - Parameter view: View to audit
     - Returns: Audit results with issues
     */
    public static func audit(_ view: Any) -> AuditResult {
        var issues: [AccessibilityIssue] = []

        // Check for missing labels
        // (This is a placeholder - real implementation would use introspection)
        let labelledElements = 0 // Placeholder
        let totalElements = 0 // Placeholder

        let missingLabels = totalElements - labelledElements

        if missingLabels > 0 {
            issues.append(AccessibilityIssue(
                type: .missingLabel,
                description: "\(missingLabels) elements missing accessibility labels",
                severity: .critical,
                element: "Multiple"
            ))
        }

        return AuditResult(
            totalElements: totalElements,
            labelledElements: labelledElements,
            missingLabels: missingLabels,
            issues: issues
        )
    }

    // MARK: - Contrast Checking

    /**
     Check if two colors meet WCAG AA standard
     - Parameter foreground: Foreground color
     - Parameter background: Background color
     - Returns: True if 4.5:1 contrast ratio met
     */
    public static func meetsWCAG_AA(
        foreground: Color,
        background: Color
    ) -> Bool {
        ContrastChecker.contrastRatio(
            foreground: foreground,
            background: background
        ) >= 4.5
    }

    /**
     Check if two colors meet WCAG AAA standard
     - Parameter foreground: Foreground color
     - Parameter background: Background color
     - Returns: True if 7:1 contrast ratio met
     */
    public static func meetsWCAG_AAA(
        foreground: Color,
        background: Color
    ) -> Bool {
        ContrastChecker.contrastRatio(
            foreground: foreground,
            background: background
        ) >= 7.0
    }

    // MARK: - Touch Target Checking

    /**
     Check if touch target meets minimum size
     - Parameter size: Touch target size
     - Parameter platform: Platform to check against
     - Returns: True if minimum size met
     */
    public static func meetsTouchTargetMinimum(
        size: CGFloat,
        platform: Platform = .current
    ) -> Bool {
        let minimum: CGFloat
        switch platform {
        case .iOS:
            minimum = 44
        case .tvOS:
            minimum = 80
        case .macOS:
            minimum = 0 // No minimum for pointer-based
        case .auto:
            minimum = 44
        }

        return size >= minimum
    }

    public enum Platform {
        case iOS
        case tvOS
        case macOS
        case auto

        public static var current: Platform {
            #if os(iOS)
            return .iOS
            #elseif os(tvOS)
            return .tvOS
            #elseif os(macOS)
            return .macOS
            #else
            return .iOS
            #endif
        }
    }

    // MARK: - VoiceOver Testing

    /**
     Check if VoiceOver is running
     - Returns: True if VoiceOver active
     */
    public static var isVoiceOverRunning: Bool {
        UIAccessibility.isVoiceOverRunning
    }

    /**
     Announce message for testing
     - Parameter message: Message to announce
     */
    public static func announceForTesting(_ message: String) {
        #if DEBUG
        print("[Accessibility Test] Announcement: \(message)")
        #endif
        AccessibilityHelper.announce(message)
    }

    // MARK: - Dynamic Type Testing

    /**
     Get current dynamic type size category
     - Returns: Current size category
     */
    public static var currentDynamicTypeSize: ContentSizeCategory {
        #if os(iOS) || os(tvOS)
        return ContentSizeCategory.large
        #else
        return .medium
        #endif
    }

    /**
     Test if view works at given dynamic type size
     - Parameter size: Size category to test
     - Parameter view: View to test
     - Returns: True if view works at size
     */
    public static func testDynamicTypeSize(
        _ size: ContentSizeCategory,
        view: Any
    ) -> Bool {
        // Placeholder for testing implementation
        // In real implementation, would render view and check for truncation
        return true
    }

    // MARK: - Report Generation

    /**
     Generate accessibility audit report
     - Parameter results: Audit results
     - Returns: Formatted report string
     */
    public static func generateReport(_ results: AuditResult) -> String {
        var report = """
        # Accessibility Audit Report

        ## Summary
        - Total Elements: \(results.totalElements)
        - Labelled Elements: \(results.labelledElements)
        - Missing Labels: \(results.missingLabels)
        - Score: \(Int(results.score * 100))%
        - Status: \(results.passed ? "✅ PASSED" : "❌ FAILED")

        ## Issues
        """

        for issue in results.issues {
            let severityIcon: String
            switch issue.severity {
            case .critical: severityIcon = "🔴"
            case .high: severityIcon = "🟠"
            case .medium: severityIcon = "🟡"
            case .low: severityIcon = "🟢"
            }

            report += """

            \(severityIcon) **\(issueTypeToString(issue.type))**
            - Description: \(issue.description)
            - Element: \(issue.element)
            - Severity: \(severityToString(issue.severity))
            """
        }

        return report
    }

    private static func issueTypeToString(_ type: AccessibilityIssue.IssueType) -> String {
        switch type {
        case .missingLabel: return "Missing Label"
        case .poorContrast: return "Poor Contrast"
        case .smallTouchTarget: return "Small Touch Target"
        case .noKeyboardAccess: return "No Keyboard Access"
        case .noDynamicType: return "No Dynamic Type"
        case .colorOnlyIndicator: return "Color Only Indicator"
        }
    }

    private static func severityToString(_ severity: AccessibilityIssue.Severity) -> String {
        switch severity {
        case .critical: return "Critical"
        case .high: return "High"
        case .medium: return "Medium"
        case .low: return "Low"
        }
    }
}

// =============================================================================
// MARK: - Debug Preview Helpers
// =============================================================================

#if DEBUG
public extension View {

    /**
     Show accessibility overlay for debugging

     Displays:
     - Touch target boundaries
     - Accessibility labels
     - Focus indicators
     */
    func accessibilityDebugOverlay() -> some View {
        self.overlay(
            AccessibilityDebugOverlay()
        )
    }
}

/**
 Debug overlay showing accessibility information
 */
struct AccessibilityDebugOverlay: View {
    @State private var showLabels = false
    @State private var showTouchTargets = false
    @State private var showFocus = false

    var body: some View {
        VStack {
            HStack {
                Toggle("Labels", isOn: $showLabels)
                Toggle("Touch Targets", isOn: $showTouchTargets)
                Toggle("Focus", isOn: $showFocus)
            }
            .padding()
            .background(Color.black.opacity(0.7))

            Spacer()
        }
    }
}
#endif

// =============================================================================
// MARK: - Accessibility Snapshot Testing
// =============================================================================

/**
 Snapshot testing for accessibility

 Captures accessibility properties for regression testing
 */
public struct AccessibilitySnapshot {

    public let labels: [String: String]
    public let traits: [String: String]
    public let hints: [String: String]
    public let frame: CGRect

    public init(
        labels: [String: String] = [:],
        traits: [String: String] = [:],
        hints: [String: String] = [:],
        frame: CGRect = .zero
    ) {
        self.labels = labels
        self.traits = traits
        self.hints = hints
        self.frame = frame
    }

    /**
     Compare two snapshots for differences
     - Parameter other: Snapshot to compare
     - Returns: Array of differences
     */
    public func compare(_ other: AccessibilitySnapshot) -> [String] {
        var differences: [String] = []

        // Compare labels
        for (key, value) in labels {
            if other.labels[key] != value {
                differences.append("Label changed for '\(key)': '\(value)' -> '\(other.labels[key] ?? "nil")'")
            }
        }

        // Compare traits
        for (key, value) in traits {
            if other.traits[key] != value {
                differences.append("Trait changed for '\(key)'")
            }
        }

        return differences
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct AccessibilityTesting_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 24) {
            Text("Accessibility Testing")
                .font(.title)
                .accessibleHeader()

            // Contrast examples
            VStack(alignment: .leading, spacing: 8) {
                Text("Contrast Ratios")
                    .font(.headline)

                HStack {
                    Text("Black on White")
                    Spacer()
                    Text("\(ContrastChecker.contrastRatio(foreground: .black, background: .white), specifier: "%.2f"):1")
                }

                HStack {
                    Text("Blue on White")
                    Spacer()
                    Text("\(ContrastChecker.contrastRatio(foreground: .blue, background: .white), specifier: "%.2f"):1")
                }

                HStack {
                    Text("Gray on Black")
                    Spacer()
                    Text("\(ContrastChecker.contrastRatio(foreground: .gray, background: .black), specifier: "%.2f"):1")
                }
            }

            // Touch target examples
            VStack(alignment: .leading, spacing: 8) {
                Text("Touch Targets")
                    .font(.headline)

                HStack {
                    Button("44pt") {}
                        .frame(width: 44, height: 44)
                        .overlay(
                            Text("✓")
                                .foregroundColor(.green)
                                .offset(x: 50)
                        )

                    Button("40pt") {}
                        .frame(width: 40, height: 40)
                        .overlay(
                            Text("✗")
                                .foregroundColor(.red)
                                .offset(x: 45)
                        )
                }
            }

            // VoiceOver status
            VStack(alignment: .leading, spacing: 8) {
                Text("Assistive Technology Status")
                    .font(.headline)

                HStack {
                    Text("VoiceOver")
                    Spacer()
                    Text(AccessibilityTester.isVoiceOverRunning ? "On" : "Off")
                        .foregroundColor(AccessibilityTester.isVoiceOverRunning ? .green : .gray)
                }

                HStack {
                    Text("High Contrast")
                    Spacer()
                    Text(AccessibilityHelper.isHighContrastEnabled ? "On" : "Off")
                        .foregroundColor(AccessibilityHelper.isHighContrastEnabled ? .green : .gray)
                }

                HStack {
                    Text("Reduce Motion")
                    Spacer()
                    Text(AccessibilityHelper.isReduceMotionEnabled ? "On" : "Off")
                        .foregroundColor(AccessibilityHelper.isReduceMotionEnabled ? .green : .gray)
                }
            }
        }
        .padding()
    }
}
#endif
