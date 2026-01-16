//
//  CognitiveAccessibility.swift
//  SwiftFrontendShared
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Cognitive Accessibility Support
// =============================================================================

/**
 Cognitive accessibility support for users with:

 - Memory impairments (Alzheimer's, dementia)
 - Attention deficits (ADHD)
 - Learning disabilities (dyslexia, dyscalculia)
 - Autism spectrum disorders
 - Intellectual disabilities
 */

public extension View {

    // MARK: - Clear Language

    /**
     Use clear, simple language

     - Short sentences (10-15 words)
     - Active voice
     - Simple vocabulary
     - Avoid jargon and acronyms
     - Use concrete examples
     */
    func plainLanguage() -> some View {
        self
            .font(.body)
            .lineLimit(nil)
            .lineSpacing(4)
    }

    // MARK: - Consistent Navigation

    /**
     Maintain consistent navigation structure

     - Same navigation items in same order
     - Clear back button labels
     - Breadcrumbs for hierarchy
     - Clear current location
     */
    func consistentNavigation() -> some View {
        self
            .navigationTitle("White Room")
            .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Error Messages

    /**
     Provide helpful, actionable error messages

     - What happened (plain language)
     - Why it happened (if known)
     - How to fix it (specific steps)
     - Example of correct input
     */
    func helpfulError(
        message: String,
        suggestion: String? = nil,
        example: String? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.error)

                Text("Error")
                    .font(.headline)

                Spacer()
            }

            Text(message)
                .font(.body)

            if let suggestion = suggestion {
                VStack(alignment: .leading, spacing: 4) {
                    Text("How to fix:")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text(suggestion)
                        .font(.body)
                }
            }

            if let example = example {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Example:")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text(example)
                        .font(.body)
                        .italic()
                }
            }
        }
        .padding()
        .background(Color.error.opacity(0.1))
        .cornerRadius(8)
        .accessibleLabel("Error: \(message)")
    }

    // MARK: - Progressive Disclosure

    /**
     Show advanced options progressively

     - Start with essential options
     - Hide advanced features
     - Show "Advanced" expander
     - Clear indication of hidden content
     */
    func progressiveDisclosure<Content: View>(
        isExpanded: Binding<Bool>,
        advancedContent: @escaping () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            self

            Button(action: { isExpanded.wrappedValue.toggle() }) {
                HStack {
                    Text(isExpanded.wrappedValue ? "Hide Advanced" : "Show Advanced")
                        .font(.subheadline)

                    Image(systemName: isExpanded.wrappedValue ? "chevron.up" : "chevron.down")
                }
            }
            .buttonStyle(.plain)

            if isExpanded.wrappedValue {
                advancedContent()
                    .transition(.opacity.combined(with: .slide))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isExpanded.wrappedValue)
    }

    // MARK: - Undo/Redo Support

    /**
     Add undo capability for safety

     Users with cognitive impairments may make mistakes.
     Always provide undo for destructive actions.
     */
    func undoable(
        action: @escaping () -> Void,
        undoAction: @escaping () -> Void,
        label: String
    ) -> some View {
        Button(action: action) {
            Text(label)
        }
        .contextMenu {
            Button("Undo", role: .destructive) {
                undoAction()
                AccessibilityHelper.announce("Action undone")
            }
        }
    }
}

// =============================================================================
// MARK: - Step-by-Step Wizard
// =============================================================================

/**
 Break complex tasks into steps

 Users with cognitive impairments may be overwhelmed
 by complex multi-step processes.
 */
@available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
public struct StepWizard<StepContent: View>: View {

    // MARK: - Properties

    let steps: [WizardStep]
    @State private var currentStep = 0
    let onComplete: () -> Void

    // MARK: - Step Definition

    public struct WizardStep {
        let title: String
        let content: StepContent
        let isRequired: Bool

        public init(
            title: String,
            isRequired: Bool = true,
            @ViewBuilder content: () -> StepContent
        ) {
            self.title = title
            self.isRequired = isRequired
            self.content = content()
        }
    }

    // MARK: - Initialization

    public init(
        steps: [WizardStep],
        onComplete: @escaping () -> Void
    ) where StepContent == AnyView {
        self.steps = steps
        self.onComplete = onComplete
        self._currentStep = State(initialValue: 0)
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 24) {
            // Progress indicator
            ProgressView(value: Double(currentStep), total: Double(steps.count))
                .accessibleLabel("Step \(currentStep + 1) of \(steps.count)")

            // Step indicator
            HStack {
                ForEach(0..<steps.count, id: \.self) { index in
                    VStack(spacing: 8) {
                        Circle()
                            .fill(index <= currentStep ? Color.blue : Color.gray)
                            .frame(width: 32, height: 32)
                            .overlay(
                                Text("\(index + 1)")
                                    .foregroundColor(.white)
                            )

                        if index < steps.count - 1 {
                            Rectangle()
                                .fill(index < currentStep ? Color.blue : Color.gray)
                                .frame(height: 2)
                                .frame(maxWidth: .infinity)
                        }
                    }
                }
            }
            .accessibleIgnore()

            // Current step content
            VStack(alignment: .leading, spacing: 16) {
                Text(steps[currentStep].title)
                    .font(.title2)
                    .accessibleHeader()

                steps[currentStep].content
            }
            .accessibleScreenChange("Step \(currentStep + 1): \(steps[currentStep].title)")

            // Navigation buttons
            HStack {
                if currentStep > 0 {
                    Button("Back") {
                        currentStep -= 1
                    }
                    .touchTarget()
                }

                Spacer()

                if currentStep < steps.count - 1 {
                    Button("Next") {
                        currentStep += 1
                    }
                    .touchTarget()
                } else {
                    Button("Complete") {
                        onComplete()
                    }
                    .buttonStyle(.borderedProminent)
                    .touchTarget()
                }
            }
        }
        .padding()
        .accessibleDynamicType()
    }
}

// =============================================================================
// MARK: - Accessible Form
// =============================================================================

/**
 Accessible form with clear labels and validation

 Features:
 - Clear field labels (not placeholders)
 - Helpful validation messages
 - Example values
 - Progress indication
 */
@available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
public struct AccessibleForm<Content: View>: View {

    // MARK: - Properties

    let title: String
    let content: Content
    @State private var validationErrors: [String: String] = [:]

    // MARK: - Initialization

    public init(
        title: String,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.content = content()
    }

    // MARK: - Body

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text(title)
                    .font(.title)
                    .accessibleHeader()

                content

                if !validationErrors.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Please fix the following issues:")
                            .font(.headline)

                        ForEach(validationErrors.keys.sorted(), id: \.self) { field in
                            if let error = validationErrors[field] {
                                HStack {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.error)

                                    Text(error)
                                        .font(.body)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color.error.opacity(0.1))
                    .cornerRadius(8)
                    .accessibleLabel("Form errors")
                }
            }
            .padding()
        }
        .accessibleDynamicType()
    }
}

// =============================================================================
// MARK: - Accessible Form Field
// =============================================================================

/**
 Accessible form field with label, hint, and validation
 */
@available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
public struct AccessibleFormField: View {

    let label: String
    var hint: String?
    var example: String?
    @Binding var text: String
    var isSecure: Bool = false
    var validationError: String?

    public init(
        label: String,
        hint: String? = nil,
        example: String? = nil,
        text: Binding<String>,
        isSecure: Bool = false,
        validationError: String? = nil
    ) {
        self.label = label
        self.hint = hint
        self.example = example
        self._text = text
        self.isSecure = isSecure
        self.validationError = validationError
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.headline)
                .accessibleHeader()

            if let hint = hint {
                Text(hint)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .accessibleIgnore()
            }

            Group {
                if isSecure {
                    SecureField("", text: $text)
                } else {
                    TextField("", text: $text)
                }
            }
            .textFieldStyle(.roundedBorder)
            .accessibilityLabel(label)
            .accessibilityValue(text)
            .accessibilityHint("Double tap to edit")

            if let example = example {
                Text("Example: \(example)")
                    .font(.caption)
                    .italic()
                    .foregroundColor(.secondary)
                    .accessibleIgnore()
            }

            if let error = validationError {
                HStack {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.error)

                    Text(error)
                        .font(.caption)
                        .foregroundColor(.error)
                }
            }
        }
        .accessibleDynamicType()
    }
}

// =============================================================================
// MARK: - Memory Aids
// =============================================================================

/**
 Memory aids for users with cognitive impairments

 Features:
 - Save and restore state
 - Clear visual indicators
 - Recent items history
 - Favorites/bookmarks
 */
@available(iOS 15.0, macOS 12.0, tvOS 15.0, *)
public class MemoryAids: ObservableObject {

    // MARK: - Published Properties

    @Published public var recentItems: [String] = []
    @Published public var favorites: Set<String> = []

    // MARK: - Singleton

    public static let shared = MemoryAids()

    // MARK: - Initialization

    public init() {
        loadFromPersistence()
    }

    // MARK: - Methods

    /**
     Add item to recent items
     - Parameter item: Item to add
     */
    public func addToRecent(_ item: String) {
        recentItems.removeAll { $0 == item }
        recentItems.insert(item, at: 0)

        // Keep only last 10 items
        if recentItems.count > 10 {
            recentItems = Array(recentItems.prefix(10))
        }

        saveToPersistence()
    }

    /**
     Toggle favorite status
     - Parameter item: Item to toggle
     */
    public func toggleFavorite(_ item: String) {
        if favorites.contains(item) {
            favorites.remove(item)
            AccessibilityHelper.announce("Removed from favorites")
        } else {
            favorites.insert(item)
            AccessibilityHelper.announce("Added to favorites")
        }

        saveToPersistence()
    }

    /**
     Check if item is favorited
     - Parameter item: Item to check
     */
    public func isFavorite(_ item: String) -> Bool {
        favorites.contains(item)
    }

    // MARK: - Persistence

    private func loadFromPersistence() {
        if let recentData = UserDefaults.standard.array(forKey: "recentItems") as? [String] {
            recentItems = recentData
        }

        if let favoritesData = UserDefaults.standard.array(forKey: "favorites") as? [String] {
            favorites = Set(favoritesData)
        }
    }

    private func saveToPersistence() {
        UserDefaults.standard.set(recentItems, forKey: "recentItems")
        UserDefaults.standard.set(Array(favorites), forKey: "favorites")
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct CognitiveAccessibility_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            VStack(spacing: 32) {
                Text("Cognitive Accessibility")
                    .font(.title)
                    .accessibleHeader()

                // Example wizard
                StepWizard(
                    steps: [
                        .init(title: "Choose Mode") {
                            AnyView(VStack {
                                Text("Select your performance mode")
                                Picker("Mode", selection: .constant("Piano")) {
                                    Text("Piano").tag("Piano")
                                    Text("SATB").tag("SATB")
                                    Text("Techno").tag("Techno")
                                }
                                .pickerStyle(.segmented)
                            })
                        },
                        .init(title: "Configure Settings") {
                            AnyView(VStack {
                                Text("Adjust settings for your performance")
                                Toggle("Enable Reverb", isOn: .constant(true))
                                Toggle("Enable Delay", isOn: .constant(false))
                            })
                        },
                        .init(title: "Review") {
                            AnyView(VStack {
                                Text("Review your choices")
                                Text("Mode: Piano")
                                Text("Reverb: Enabled")
                                Text("Delay: Disabled")
                            })
                        }
                    ]
                ) {
                    print("Wizard complete")
                }

                // Example form
                AccessibleForm(title: "Project Settings") {
                    AccessibleFormField(
                        label: "Project Name",
                        hint: "Enter a name for your project",
                        example: "My Song 2024",
                        text: .constant("")
                    )

                    AccessibleFormField(
                        label: "Tempo",
                        hint: "Enter tempo in beats per minute",
                        example: "120",
                        text: .constant("120")
                    )
                }

                // Example progressive disclosure
                VStack(alignment: .leading) {
                    Text("Basic Controls")
                        .font(.headline)

                    Toggle("Enable Reverb", isOn: .constant(true))
                }
                .progressiveDisclosure(isExpanded: .constant(true)) {
                    VStack(alignment: .leading) {
                        Text("Advanced Settings")
                            .font(.headline)

                        Slider(value: .constant(0.5), in: 0...1, label: { Text("Decay") })
                        Slider(value: .constant(0.5), in: 0...1, label: { Text("Mix") })
                    }
                }
            }
            .padding()
        }
    }
}
#endif
