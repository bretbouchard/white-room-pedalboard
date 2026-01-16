//
//  ContractTemplates.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import SwiftUI

// =============================================================================
// MARK: - Template Category
// =============================================================================

/**
 Categories for organizing templates
 */
public enum TemplateCategory: String, CaseIterable, Codable {
    case media = "Media & Film"
    case ambient = "Ambient & Loop"
    case experimental = "Experimental"
    case classical = "Classical & Formal"

    var icon: String {
        switch self {
        case .media: return "film"
        case .ambient: return "wind"
        case .experimental: return "flame"
        case .classical: return "music.quarternote.3"
        }
    }

    var color: Color {
        switch self {
        case .media: return .blue
        case .ambient: return .green
        case .experimental: return .purple
        case .classical: return .orange
        }
    }
}

// =============================================================================
// MARK: - Contract Template
// =============================================================================

/**
 A pre-built template for SongOrderContract

 Templates provide starting points for common musical use cases.
 Each template includes all contract parameters with sensible defaults
 that can be customized by the user.
 */
public struct ContractTemplate: Identifiable, Equatable, Codable, Sendable {

    // MARK: - Identity

    /**
     Unique identifier for this template
     */
    public let id: String

    /**
     Human-readable name
     */
    public let name: String

    /**
     Detailed description of what this template creates
     */
    public let description: String

    /**
     Category for organizing templates
     */
    public let category: TemplateCategory

    /**
     Icon for visual identification
     */
    public let iconName: String

    /**
     The contract this template creates
     */
    public let contract: SongOrderContract

    // MARK: - Computed Properties

    /**
     Preview of key parameters for UI display
     */
    public var parameterPreview: [String: String] {
        [
            "Intent": contract.intent.displayName,
            "Motion": contract.motion.displayName,
            "Harmony": contract.harmonicBehavior.displayName,
            "Certainty": certaintyLabel
        ]
    }

    private var certaintyLabel: String {
        switch contract.certainty {
        case 0.0..<0.25: return "Certain"
        case 0.25..<0.5: return "Tense"
        case 0.5..<0.75: return "Unstable"
        default: return "Volatile"
        }
    }

    // MARK: - Initialization

    public init(
        id: String = UUID().uuidString,
        name: String,
        description: String,
        category: TemplateCategory,
        iconName: String,
        contract: SongOrderContract
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.category = category
        self.iconName = iconName
        self.contract = contract
    }
}

// =============================================================================
// MARK: - Template Registry
// =============================================================================

/**
 Registry of all available contract templates
 */
public struct ContractTemplates {

    // MARK: - Media & Film Templates

    /**
     HBO Cue Template

     Creates a dramatic, accelerating cue perfect for film/TV tension.
     Features revealed harmony that unfolds gradually with tense certainty.
     */
    public static let hboCue = ContractTemplate(
        name: "HBO Cue",
        description: "Tense, accelerating dramatic cue for film and TV",
        category: .media,
        iconName: "film.fill",
        contract: SongOrderContract(
            name: "HBO Cue",
            description: "Dramatic cue with building tension",
            intent: .cue,
            motion: .accelerating,
            harmonicBehavior: .revealed,
            certainty: 0.6, // tense
            identityLocks: IdentityLocks(rhythm: true, pitch: false, form: true),
            evolutionMode: .adaptive
        )
    )

    // MARK: - Ambient & Loop Templates

    /**
     Ambient Loop Template

     Creates a stable, certain ambient loop perfect for background music.
     Features static harmony and oscillating motion with high certainty.
     */
    public static let ambientLoop = ContractTemplate(
        name: "Ambient Loop",
        description: "Certain, oscillating ambient texture for backgrounds",
        category: .ambient,
        iconName: "wind.fill",
        contract: SongOrderContract(
            name: "Ambient Loop",
            description: "Seamless looping ambient texture",
            intent: .loop,
            motion: .oscillating,
            harmonicBehavior: .static,
            certainty: 0.0, // certain
            identityLocks: IdentityLocks(rhythm: true, pitch: true, form: true),
            evolutionMode: .museum
        )
    )

    // MARK: - Experimental Templates

    /**
     Ritual Collage Template

     Creates a volatile, experimental ritual piece with colliding elements.
     Features expanding harmony and high volatility for dramatic effect.
     */
    public static let ritualCollage = ContractTemplate(
        name: "Ritual Collage",
        description: "Volatile, colliding ritual music with dramatic evolution",
        category: .experimental,
        iconName: "flame.fill",
        contract: SongOrderContract(
            name: "Ritual Collage",
            description: "Ritualistic collage with colliding elements",
            intent: .ritual,
            motion: .colliding,
            harmonicBehavior: .expanding,
            certainty: 1.0, // volatile
            identityLocks: IdentityLocks(rhythm: false, pitch: false, form: false),
            evolutionMode: .living
        )
    )

    // MARK: - Classical & Formal Templates

    /**
     Performance Piece Template

     Creates a formal, fixed composition perfect for performance.
     Features cyclic harmony and static motion with high certainty.
     */
    public static let performancePiece = ContractTemplate(
        name: "Performance Piece",
        description: "Fixed, certain formal composition for performance",
        category: .classical,
        iconName: "music.quarternote.3",
        contract: SongOrderContract(
            name: "Performance Piece",
            description: "Formal performance piece",
            intent: .song,
            motion: .static,
            harmonicBehavior: .cyclic,
            certainty: 0.0, // certain
            identityLocks: IdentityLocks(rhythm: true, pitch: true, form: true),
            evolutionMode: .fixed
        )
    )

    // MARK: - Template Collections

    /**
     All available templates
     */
    public static let allTemplates: [ContractTemplate] = [
        hboCue,
        ambientLoop,
        ritualCollage,
        performancePiece
    ]

    /**
     Templates organized by category
     */
    public static let templatesByCategory: [TemplateCategory: [ContractTemplate]] = {
        var result: [TemplateCategory: [ContractTemplate]] = [:]
        for template in allTemplates {
            result[template.category, default: []].append(template)
        }
        return result
    }()

    /**
     Get template by ID
     */
    public static func template(id: String) -> ContractTemplate? {
        allTemplates.first { $0.id == id }
    }
}

// =============================================================================
// MARK: - Template Browser Screen
// =============================================================================

/**
 Template browser for selecting contract templates

 Users can browse available templates by category, preview parameters,
 and select a template to use as a starting point for customization.
 */
public struct TemplateBrowserScreen: View {

    // MARK: - State

    @State private var selectedCategory: TemplateCategory? = nil
    @State private var searchText: String = ""

    // MARK: - Environment

    @Environment(\.dismiss) private var dismiss

    // MARK: - Callbacks

    let onTemplateSelected: (ContractTemplate) -> Void

    // MARK: - Computed Properties

    private var filteredTemplates: [ContractTemplate] {
        var templates = ContractTemplates.allTemplates

        // Filter by category
        if let category = selectedCategory {
            templates = templates.filter { $0.category == category }
        }

        // Filter by search text
        if !searchText.isEmpty {
            templates = templates.filter { template in
                template.name.localizedCaseInsensitiveContains(searchText) ||
                template.description.localizedCaseInsensitiveContains(searchText)
            }
        }

        return templates
    }

    // MARK: - Initialization

    public init(onTemplateSelected: @escaping (ContractTemplate) -> Void) {
        self.onTemplateSelected = onTemplateSelected
    }

    // MARK: - Body

    public var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Category Filter
                categoryFilterView

                Divider()

                // Template List
                templateListView
            }
            .navigationTitle("Choose Template")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search templates")
        }
    }

    // MARK: - Category Filter

    private var categoryFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                // All Categories
                CategoryButton(
                    title: "All",
                    icon: "square.grid.2x2",
                    isSelected: selectedCategory == nil,
                    color: .gray
                ) {
                    selectedCategory = nil
                }

                // Individual Categories
                ForEach(TemplateCategory.allCases, id: \.self) { category in
                    CategoryButton(
                        title: category.rawValue,
                        icon: category.icon,
                        isSelected: selectedCategory == category,
                        color: category.color
                    ) {
                        selectedCategory = category
                    }
                }
            }
            .padding()
        }
        .background(Color.secondary.opacity(0.1))
    }

    // MARK: - Template List

    private var templateListView: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                if filteredTemplates.isEmpty {
                    emptyStateView
                } else {
                    ForEach(filteredTemplates) { template in
                        ContractTemplateCard(template: template) {
                            onTemplateSelected(template)
                            dismiss()
                        }
                    }
                }
            }
            .padding()
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.secondary)

            Text("No templates found")
                .font(.headline)
                .foregroundColor(.primary)

            Text("Try adjusting your search or category filter")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

// =============================================================================
// MARK: - Category Button
// =============================================================================

struct CategoryButton: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.caption)

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? color : Color.secondary.opacity(0.2))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
        .buttonStyle(.plain)
    }
}

// =============================================================================
// MARK: - Template Card
// =============================================================================

/**
 Card component for displaying ContractTemplate

 This is a local implementation that works with ContractTemplate (struct),
 separate from the shared TemplateCard component that works with SongOrderTemplate (enum).
 */
private struct ContractTemplateCard: View {
    let template: ContractTemplate
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    // Icon
                    Image(systemName: template.iconName)
                        .font(.title2)
                        .foregroundColor(template.category.color)
                        .frame(width: 44, height: 44)
                        .background(template.category.color.opacity(0.2))
                        .cornerRadius(10)

                    VStack(alignment: .leading, spacing: 4) {
                        // Name
                        Text(template.name)
                            .font(.headline)
                            .foregroundColor(.primary)

                        // Category Badge
                        Text(template.category.rawValue)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(template.category.color.opacity(0.2))
                            .foregroundColor(template.category.color)
                            .cornerRadius(4)
                    }

                    Spacer()

                    // Chevron
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Description
                Text(template.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                // Parameter Preview
                parameterPreviewView
            }
            .padding()
            .background(Color.secondary.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }

    private var parameterPreviewView: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Parameters")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)

            HStack(spacing: 12) {
                ForEach(Array(template.parameterPreview.sorted(by: { $0.key < $1.key })), id: \.key) { key, value in
                    HStack(spacing: 4) {
                        Text(key + ":")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(value)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                    }
                }
            }
        }
    }
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct TemplateBrowserScreen_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            TemplateBrowserScreen { template in
                print("Selected: \(template.name)")
            }
            .previewDisplayName("Template Browser")

            TemplateBrowserScreen { template in
                print("Selected: \(template.name)")
            }
            .preferredColorScheme(.dark)
            .previewDisplayName("Dark Mode")
        }
    }
}
#endif
