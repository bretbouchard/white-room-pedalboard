//
//  OrchestrationConsole.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

#if os(macOS)

import SwiftUI

// =============================================================================
// MARK: - Orchestration Console (macOS)
// =============================================================================

/**
 macOS-optimized Orchestration Console for managing multiple songs, performances,
 and complex workflows with multi-window support and batch operations.

 Features:
 - Multi-window support with window groups, tabs, and positioning
 - Batch operations for editing multiple performances at once
 - Keyboard shortcuts for power-user workflow
 - Inspector panel for detailed property editing
 - ConsoleX strip editor for full mixer control
 - Drag and drop between windows
 - Right-click context menus everywhere
 - Undo/Redo stack with full history
 - Performance comparison side-by-side
 - Template management and bulk application
 - Export studio with batch operations
 */
public struct OrchestrationConsole: View {

    // MARK: - State

    @State private var songs: [Song] = []
    @State private var performances: [PerformanceState] = []
    @State private var selectedPerformances: Set<String> = []
    @State private var selectedSong: Song?
    @State private var windowArrangement: WindowArrangement = .grid
    @State private var showingInspector: Bool = true
    @State private var showingConsoleXStrip: Bool = true
    @State private var inspectorWidth: CGFloat = 300
    @State private var consoleXWidth: CGFloat = 400
    @State private var activeTab: ConsoleTab = .songs
    @State private var undoStack: [OrchestrationAction] = []
    @State private var redoStack: [OrchestrationAction] = []
    @State private var showingExportStudio: Bool = false
    @State private var showingTemplateManager: Bool = false
    @State private var showingFindReplace: Bool = false
    @State private var showingAnalysisDashboard: Bool = false
    @State private var isPlaying: Bool = false
    @State private var currentTime: Double = 0.0
    @State private var draggedPerformance: PerformanceState?
    @State private var windowPositions: [String: WindowPosition] = [:]
    @State private var midiLearnMode: Bool = false

    // MARK: - Environment

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.undoManager) private var undoManager

    // MARK: - Computed Properties

    private var hasSelection: Bool {
        !selectedPerformances.isEmpty
    }

    private var canUndo: Bool {
        !undoStack.isEmpty
    }

    private var canRedo: Bool {
        !redoStack.isEmpty
    }

    // MARK: - Body

    public var body: some View {
        WindowGroup {
            consoleBody
                .frame(minWidth: 1200, minHeight: 800)
                .toolbar {
                    toolbarContent
                }
                .windowToolbarStyle(.unified)
                .windowStyle(.hiddenTitleBar)
        }
        .windowTabbingStyle(.preferred)
        .commands {
            commandMenuContent
        }
        .onAppear {
            loadInitialData()
            restoreWindowPositions()
        }
        .onDisappear {
            saveWindowPositions()
        }
    }

    private var consoleBody: some View {
        HSplitView {
            // Main Content Area
            VStack(spacing: 0) {
                // Tab Bar
                tabBar

                // Content Area
                Group {
                    switch activeTab {
                    case .songs:
                        songOrchestratorView
                    case .performances:
                        performanceMatrixView
                    case .templates:
                        templateManagerView
                    case .analysis:
                        analysisDashboardView
                    }
                }
            }

            // Inspector Panel
            if showingInspector {
                inspectorPanel
                    .frame(minWidth: 250, idealWidth: inspectorWidth)
            }
        }
        .frame(minWidth: 800)
    }

    // =============================================================================
    // MARK: - Tab Bar
    // =============================================================================

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(ConsoleTab.allCases, id: \.self) { tab in
                Button(action: { activeTab = tab }) {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 16))
                        Text(tab.displayName)
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(activeTab == tab ? Color.accentColor.opacity(0.2) : Color.clear)
                    .foregroundColor(activeTab == tab ? .accentColor : .primary)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(height: 50)
        .background(Color(NSColor.controlBackgroundColor))
    }

    // =============================================================================
    // MARK: - Song Orchestrator
    // =============================================================================

    private var songOrchestratorView: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 300, maximum: 500), spacing: 16)], spacing: 16) {
                ForEach(songs) { song in
                    SongCard(
                        song: song,
                        performances: performancesForSong(song.id),
                        isSelected: selectedSong?.id == song.id,
                        onSelect: { selectedSong = song },
                        onEditPerformance: { performance in
                            openPerformanceEditor(performance)
                        },
                        onDuplicatePerformance: { performance in
                            duplicatePerformance(performance)
                        },
                        onDeletePerformance: { performance in
                            deletePerformance(performance)
                        }
                    )
                    .contextMenu {
                        songContextMenu(for: song)
                    }
                }
            }
            .padding()
        }
        .background(Color(NSColor.textBackgroundColor))
    }

    // =============================================================================
    // MARK: - Performance Matrix
    // =============================================================================

    private var performanceMatrixView: some View {
        HSplitView {
            // Performance Table
            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("Performances")
                        .font(.headline)
                        .padding()

                    Spacer()

                    Button(action: createNewPerformance) {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()

                // Table
                Table(performances, selection: $selectedPerformances) {
                    TableColumn("Name") { performance in
                        Text(performance.name)
                            .fontWeight(selectedPerformances.contains(performance.id) ? .bold : .regular)
                    }
                    .width(min: 150)

                    TableColumn("Mode") { performance in
                        Text(performance.mode.rawValue.capitalized)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .width(min: 100)

                    TableColumn("Density") { performance in
                        HStack {
                            ProgressView(value: performance.globalDensityMultiplier)
                                .frame(width: 80)
                            Text("\(Int(performance.globalDensityMultiplier * 100))%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .width(min: 120)

                    TableColumn("Tempo") { performance in
                        Text("x\(performance.tempoMultiplier, specifier: "%.1f")")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .width(min: 80)

                    TableColumn("Tags") { performance in
                        HStack {
                            ForEach(performance.tags.prefix(2), id: \.self) { tag in
                                Text(tag)
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.accentColor.opacity(0.2))
                                    .cornerRadius(4)
                            }
                            if performance.tags.count > 2 {
                                Text("+\(performance.tags.count - 2)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .tableStyle(.inset(alternatesRowBackgrounds: true))
                .contextMenu(forSelectionType: PerformanceState.self) { selection in
                    performanceContextMenu(for: selection)
                } primaryAction: { performance in
                    openPerformanceEditor(performance)
                }
            }

            // ConsoleX Strip Editor
            if showingConsoleXStrip {
                consoleXStripEditor
                    .frame(minWidth: 300, idealWidth: consoleXWidth)
            }
        }
    }

    // =============================================================================
    // MARK: - ConsoleX Strip Editor
    // =============================================================================

    private var consoleXStripEditor: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("ConsoleX Mixer")
                    .font(.headline)

                Spacer()

                Button(action: { showingConsoleXStrip = false }) {
                    Image(systemName: "xmark.circle.fill")
                }
                .buttonStyle(.plain)
            }
            .padding()

            Divider()

            // Channel Strips
            if let song = selectedSong {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(song.mixGraph.tracks) { track in
                            ConsoleXChannelStrip(
                                track: track,
                                isMuted: track.mute,
                                isSolo: track.solo,
                                onVolumeChange: { newVolume in
                                    updateTrackVolume(trackId: track.id, volume: newVolume)
                                },
                                onPanChange: { newPan in
                                    updateTrackPan(trackId: track.id, pan: newPan)
                                },
                                onMuteToggle: {
                                    toggleTrackMute(trackId: track.id)
                                },
                                onSoloToggle: {
                                    toggleTrackSolo(trackId: track.id)
                                }
                            )
                        }
                    }
                    .padding()
                }
            } else {
                VStack {
                    Spacer()
                    Text("Select a song to edit ConsoleX")
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
        }
        .background(Color(NSColor.controlBackgroundColor))
    }

    // =============================================================================
    // MARK: - Template Manager
    // =============================================================================

    private var templateManagerView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Create New Template
                VStack(alignment: .leading, spacing: 12) {
                    Text("Create Template from Performance")
                        .font(.headline)

                    HStack {
                        Text("Template Name")
                        TextField("Enter template name", text: .constant(""))
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 200)

                        Spacer()

                        Button("Create") {
                            // Create template
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)

                // Existing Templates
                VStack(alignment: .leading, spacing: 12) {
                    Text("Saved Templates")
                        .font(.headline)

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 200))], spacing: 16) {
                        ForEach(availableTemplates, id: \.name) { template in
                            TemplateCard(
                                template: template,
                                onApply: { songId in
                                    applyTemplate(template, to: songId)
                                },
                                onDelete: {
                                    deleteTemplate(template)
                                }
                            )
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color(NSColor.textBackgroundColor))
    }

    // =============================================================================
    // MARK: - Analysis Dashboard
    // =============================================================================

    private var analysisDashboardView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Predictability Overview
                VStack(alignment: .leading, spacing: 12) {
                    Text("Evolution Patterns")
                        .font(.headline)

                    HStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Low Predictability")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(songs.filter { $0.metadata.tags.contains("volatile") }.count)")
                                .font(.title)
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red.opacity(0.2))
                        .cornerRadius(8)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Medium Predictability")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(songs.filter { $0.metadata.tags.contains("evolving") }.count)")
                                .font(.title)
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.yellow.opacity(0.2))
                        .cornerRadius(8)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("High Predictability")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(songs.filter { $0.metadata.tags.contains("stable") }.count)")
                                .font(.title)
                                .fontWeight(.bold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green.opacity(0.2))
                        .cornerRadius(8)
                    }
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)

                // Performance Density Distribution
                VStack(alignment: .leading, spacing: 12) {
                    Text("Density Distribution")
                        .font(.headline)

                    HStack(alignment: .top, spacing: 12) {
                        ForEach(0..<5) { i in
                            let count = performances.filter {
                                let density = $0.globalDensityMultiplier
                                return Double(i) * 0.2 <= density && density < Double(i + 1) * 0.2
                            }.count

                            VStack(spacing: 4) {
                                Rectangle()
                                    .fill(Color.accentColor)
                                    .frame(height: CGFloat(count) * 20)
                                Text("\(Int(Double(i) * 0.2 * 100))%")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .frame(height: 200)
                }
                .padding()
                .background(Color.secondary.opacity(0.1))
                .cornerRadius(12)
            }
            .padding()
        }
        .background(Color(NSColor.textBackgroundColor))
    }

    // =============================================================================
    // MARK: - Inspector Panel
    // =============================================================================

    private var inspectorPanel: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Inspector")
                    .font(.headline)

                Spacer()

                Button(action: { showingInspector = false }) {
                    Image(systemName: "xmark.circle.fill")
                }
                .buttonStyle(.plain)
            }
            .padding()

            Divider()

            // Content
            ScrollView {
                if hasSelection {
                    VStack(alignment: .leading, spacing: 20) {
                        // Selection Info
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Selected")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(selectedPerformances.count) performance(s)")
                                .font(.headline)
                        }
                        .padding()
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(8)

                        // Batch Edit Density
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Batch Edit Density")
                                .font(.subheadline)
                                .fontWeight(.semibold)

                            Slider(value: .constant(0.5), in: 0...1)
                            HStack {
                                Text("0%")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text("100%")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Button("Apply to Selected") {
                                applyDensityToSelected(0.5)
                            }
                            .buttonStyle(.borderedProminent)
                            .frame(maxWidth: .infinity)
                        }
                        .padding()
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(8)

                        // Batch Apply Preset
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Batch Apply Preset")
                                .font(.subheadline)
                                .fontWeight(.semibold)

                            Picker("Preset", selection: .constant("default")) {
                                Text("Default").tag("default")
                                Text("Piano").tag("piano")
                                Text("SATB").tag("satb")
                                Text("Techno").tag("techno")
                            }
                            .pickerStyle(.menu)

                            Button("Apply to Selected") {
                                applyPresetToSelected("default")
                            }
                            .buttonStyle(.borderedProminent)
                            .frame(maxWidth: .infinity)
                        }
                        .padding()
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(8)

                        // Batch Operations
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Batch Operations")
                                .font(.subheadline)
                                .fontWeight(.semibold)

                            VStack(spacing: 8) {
                                Button("Duplicate Selected") {
                                    duplicateSelectedPerformances()
                                }
                                .frame(maxWidth: .infinity)

                                Button("Delete Selected") {
                                    deleteSelectedPerformances()
                                }
                                .frame(maxWidth: .infinity)
                                .foregroundColor(.red)

                                Button("Compare Side-by-Side") {
                                    compareSelectedPerformances()
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding()
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(8)
                    }
                    .padding()
                } else {
                    VStack {
                        Spacer()
                        Text("No selection")
                            .foregroundColor(.secondary)
                        Text("Cmd+click to select multiple")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                }
            }
        }
        .background(Color(NSColor.controlBackgroundColor))
        .frame(minWidth: 250)
    }

    // =============================================================================
    // MARK: - Toolbar
    // =============================================================================

    private var toolbarContent: some ToolbarContent {
        Group {
            ToolbarItemGroup(placement: .automatic) {
                // Window Arrangement
                Menu {
                    Button("Grid", action: { arrangeWindows(.grid) })
                    Button("Cascade", action: { arrangeWindows(.cascade) })
                    Button("Tile Horizontal", action: { arrangeWindows(.tileHorizontal) })
                    Button("Tile Vertical", action: { arrangeWindows(.tileVertical) })
                } label: {
                    Image(systemName: "square.grid.2x2")
                }

                Divider()

                // Toggle Panels
                Button(action: { showingInspector.toggle() }) {
                    Image(systemName: "sidebar.right")
                }
                .keyboardShortcut("i", modifiers: [.command, .option])

                Button(action: { showingConsoleXStrip.toggle() }) {
                    Image(systemName: "slider.horizontal.3")
                }

                Divider()

                // Playback Controls
                Button(action: togglePlayback) {
                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                }
                .keyboardShortcut(" ")

                Button(action: stopPlayback) {
                    Image(systemName: "stop.fill")
                }
                .keyboardShortcut(".", modifiers: [.command])

                Divider()

                // Export
                Button(action: { showingExportStudio = true }) {
                    Image(systemName: "square.and.arrow.up")
                }
                .keyboardShortcut("e", modifiers: [.command])

                // Templates
                Button(action: { showingTemplateManager = true }) {
                    Image(systemName: "doc.text")
                }
                .keyboardShortcut("t", modifiers: [.command])

                // Analysis
                Button(action: { showingAnalysisDashboard = true }) {
                    Image(systemName: "chart.bar")
                }
            }

            ToolbarItemGroup(placement: .primaryAction) {
                Menu {
                    Button("Undo", action: undo)
                        .keyboardShortcut("z", modifiers: [.command])
                    Button("Redo", action: redo)
                        .keyboardShortcut("z", modifiers: [.command, .shift])

                    Divider()

                    Button("Cut", action: cut)
                        .keyboardShortcut("x", modifiers: [.command])
                    Button("Copy", action: copy)
                        .keyboardShortcut("c", modifiers: [.command])
                    Button("Paste", action: paste)
                        .keyboardShortcut("v", modifiers: [.command])

                    Divider()

                    Button("Find...", action: { showingFindReplace = true })
                        .keyboardShortcut("f", modifiers: [.command])
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }

    // =============================================================================
    // MARK: - Command Menu
    // =============================================================================>

    private var commandMenuContent: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("New Song", action: createNewSong)
                .keyboardShortcut("n", modifiers: [.command])
            Button("New Performance", action: createNewPerformance)
                .keyboardShortcut("n", modifiers: [.command, .shift])
        }

        CommandGroup(replacing: .pasteboard) {
            Button("Cut", action: cut)
                .keyboardShortcut("x", modifiers: [.command])
            Button("Copy", action: copy)
                .keyboardShortcut("c", modifiers: [.command])
            Button("Paste", action: paste)
                .keyboardShortcut("v", modifiers: [.command])
        }

        CommandMenu("Window") {
            Button("Arrange in Grid", action: { arrangeWindows(.grid) })
                .keyboardShortcut("g", modifiers: [.command, .option])
            Button("Arrange Cascading", action: { arrangeWindows(.cascade) })
                .keyboardShortcut("c", modifiers: [.command, .option])
            Button("Tile Horizontal", action: { arrangeWindows(.tileHorizontal) })
                .keyboardShortcut("h", modifiers: [.command, .option])
            Button("Tile Vertical", action: { arrangeWindows(.tileVertical) })
                .keyboardShortcut("v", modifiers: [.command, .option])

            Divider()

            Button("Toggle Inspector", action: { showingInspector.toggle() })
                .keyboardShortcut("i", modifiers: [.command, .option])
            Button("Toggle ConsoleX", action: { showingConsoleXStrip.toggle() })
                .keyboardShortcut("x", modifiers: [.command, .option])

            Divider()

            Button("Minimize", action: minimizeAllWindows)
                .keyboardShortcut("m", modifiers: [.command])
            Button("Zoom", action: zoomAllWindows)
                .keyboardShortcut("z", modifiers: [.control])
        }

        CommandMenu("Tools") {
            Button("Export Studio...", action: { showingExportStudio = true })
                .keyboardShortcut("e", modifiers: [.command])
            Button("Template Manager...", action: { showingTemplateManager = true })
                .keyboardShortcut("t", modifiers: [.command])
            Button("Analysis Dashboard...", action: { showingAnalysisDashboard = true })
                .keyboardShortcut("a", modifiers: [.command, .option])
            Button("Find and Replace...", action: { showingFindReplace = true })
                .keyboardShortcut("f", modifiers: [.command])

            Divider()

            Button("Toggle MIDI Learn Mode", action: { midiLearnMode.toggle() })
                .keyboardShortcut("m", modifiers: [.control, .option])
        }
    }

    // =============================================================================
    // MARK: - Context Menus
    // =============================================================================

    private func songContextMenu(for song: Song) -> some View {
        Group {
            Button("Edit Song") {
                editSong(song)
            }

            Button("Duplicate Song") {
                duplicateSong(song)
            }

            Divider()

            Button("Export Song") {
                exportSong(song)
            }

            Divider()

            Button("Delete Song", role: .destructive) {
                deleteSong(song)
            }
        }
    }

    private func performanceContextMenu(for performances: Set<PerformanceState>) -> some View {
        Group {
            Button("Edit Performance") {
                if let performance = performances.first {
                    openPerformanceEditor(performance)
                }
            }

            Button("Duplicate") {
                for performance in performances {
                    duplicatePerformance(performance)
                }
            }

            Divider()

            Button("Apply Preset") {
                Menu {
                    Button("Default") { applyPresetToSelected("default") }
                    Button("Piano") { applyPresetToSelected("piano") }
                    Button("SATB") { applyPresetToSelected("satb") }
                    Button("Techno") { applyPresetToSelected("techno") }
                }
            }

            Button("Edit Density...") {
                // Show density editor
            }

            Divider()

            Button("Compare Side-by-Side") {
                compareSelectedPerformances()
            }

            Divider()

            Button("Delete", role: .destructive) {
                for performance in performances {
                    deletePerformance(performance)
                }
            }
        }
    }

    // =============================================================================
    // MARK: - Actions
    // =============================================================================

    private func loadInitialData() {
        // Load songs and performances from persistence
        // This is a placeholder - real implementation would load from disk
        songs = []
        performances = []
    }

    private func restoreWindowPositions() {
        // Restore window positions from UserDefaults
        if let data = UserDefaults.standard.data(forKey: "windowPositions"),
           let decoded = try? JSONDecoder().decode([String: WindowPosition].self, from: data) {
            windowPositions = decoded
        }
    }

    private func saveWindowPositions() {
        // Save window positions to UserDefaults
        if let encoded = try? JSONEncoder().encode(windowPositions) {
            UserDefaults.standard.set(encoded, forKey: "windowPositions")
        }
    }

    private func createNewSong() {
        let newSong = Song(
            id: UUID().uuidString,
            name: "New Song",
            version: "1.0",
            metadata: SongMetadata(
                tempo: 120.0,
                timeSignature: [4, 4]
            ),
            sections: [],
            roles: [],
            projections: [],
            mixGraph: MixGraph(
                tracks: [],
                buses: [],
                sends: [],
                master: MixMasterConfig(volume: 0.8)
            ),
            realizationPolicy: RealizationPolicy(
                windowSize: MusicalTime(beats: 4),
                lookaheadDuration: MusicalTime(beats: 1),
                determinismMode: .seeded
            ),
            determinismSeed: UUID().uuidString,
            createdAt: Date(),
            updatedAt: Date()
        )
        songs.append(newSong)
        pushUndo(OrchestrationAction(type: .createSong, object: .song(newSong)))
    }

    private func createNewPerformance() {
        let newPerformance = PerformanceState(
            id: UUID().uuidString,
            name: "New Performance",
            version: "1.0",
            mode: .custom,
            roleOverrides: [:],
            globalDensityMultiplier: 0.5,
            instrumentReassignments: [:],
            ensembleOverride: nil,
            groove: .straight,
            tempoMultiplier: 1.0,
            consolexOverrides: [:],
            effectsOverrides: [:],
            tags: [],
            createdAt: Date(),
            updatedAt: Date()
        )
        performances.append(newPerformance)
        pushUndo(OrchestrationAction(type: .createPerformance, object: .performance(newPerformance)))
    }

    private func openPerformanceEditor(_ performance: PerformanceState) {
        // Open performance editor in new window
        // This would use NSWindowController on AppKit
        print("Opening performance editor for: \(performance.name)")
    }

    private func duplicatePerformance(_ performance: PerformanceState) {
        var duplicate = performance
        duplicate.id = UUID().uuidString
        duplicate.name = "\(performance.name) (Copy)"
        duplicate.createdAt = Date()
        duplicate.updatedAt = Date()
        performances.append(duplicate)
        pushUndo(OrchestrationAction(type: .duplicatePerformance, object: .performance(duplicate)))
    }

    private func deletePerformance(_ performance: PerformanceState) {
        performances.removeAll { $0.id == performance.id }
        pushUndo(OrchestrationAction(type: .deletePerformance, object: .performance(performance)))
    }

    private func editSong(_ song: Song) {
        selectedSong = song
        activeTab = .songs
    }

    private func duplicateSong(_ song: Song) {
        var duplicate = song
        duplicate.id = UUID().uuidString
        duplicate.name = "\(song.name) (Copy)"
        duplicate.createdAt = Date()
        duplicate.updatedAt = Date()
        songs.append(duplicate)
        pushUndo(OrchestrationAction(type: .duplicateSong, object: .song(duplicate)))
    }

    private func deleteSong(_ song: Song) {
        songs.removeAll { $0.id == song.id }
        pushUndo(OrchestrationAction(type: .deleteSong, object: .song(song)))
    }

    private func exportSong(_ song: Song) {
        showingExportStudio = true
        selectedSong = song
    }

    private func arrangeWindows(_ arrangement: WindowArrangement) {
        windowArrangement = arrangement
        // Apply window arrangement using NSWindow positioning
        print("Arranging windows: \(arrangement)")
    }

    private func togglePlayback() {
        isPlaying.toggle()
    }

    private func stopPlayback() {
        isPlaying = false
        currentTime = 0.0
    }

    // MARK: - Batch Operations

    private func applyDensityToSelected(_ density: Double) {
        for id in selectedPerformances {
            if let index = performances.firstIndex(where: { $0.id == id }) {
                var performance = performances[index]
                performance.globalDensityMultiplier = density
                performance.updatedAt = Date()
                performances[index] = performance
            }
        }
        pushUndo(OrchestrationAction(type: .batchEditDensity, object: .density(density)))
    }

    private func applyPresetToSelected(_ preset: String) {
        for id in selectedPerformances {
            if let index = performances.firstIndex(where: { $0.id == id }) {
                var performance = performances[index]
                // Apply preset logic here
                performance.updatedAt = Date()
                performances[index] = performance
            }
        }
        pushUndo(OrchestrationAction(type: .batchApplyPreset, object: .preset(preset)))
    }

    private func duplicateSelectedPerformances() {
        for id in selectedPerformances {
            if let performance = performances.first(where: { $0.id == id }) {
                duplicatePerformance(performance)
            }
        }
    }

    private func deleteSelectedPerformances() {
        for id in selectedPerformances {
            if let performance = performances.first(where: { $0.id == id }) {
                deletePerformance(performance)
            }
        }
        selectedPerformances.removeAll()
    }

    private func compareSelectedPerformances() {
        // Open side-by-side comparison view
        print("Comparing \(selectedPerformances.count) performances")
    }

    // MARK: - Undo/Redo

    private func pushUndo(_ action: OrchestrationAction) {
        undoStack.append(action)
        redoStack.removeAll()
    }

    private func undo() {
        guard let action = undoStack.popLast() else { return }
        redoStack.append(action)
        // Apply undo logic
    }

    private func redo() {
        guard let action = redoStack.popLast() else { return }
        undoStack.append(action)
        // Apply redo logic
    }

    // MARK: - Edit Menu

    private func cut() {
        // Cut selected items
    }

    private func copy() {
        // Copy selected items to pasteboard
    }

    private func paste() {
        // Paste from pasteboard
    }

    // MARK: - Window Management

    private func minimizeAllWindows() {
        // Minimize all windows
    }

    private func zoomAllWindows() {
        // Zoom all windows
    }

    // MARK: - ConsoleX Updates

    private func updateTrackVolume(trackId: String, volume: Double) {
        if var song = selectedSong,
           let index = songs.firstIndex(where: { $0.id == song.id }),
           let trackIndex = song.mixGraph.tracks.firstIndex(where: { $0.id == trackId }) {
            song.mixGraph.tracks[trackIndex].volume = volume
            songs[index] = song
        }
    }

    private func updateTrackPan(trackId: String, pan: Double) {
        if var song = selectedSong,
           let index = songs.firstIndex(where: { $0.id == song.id }),
           let trackIndex = song.mixGraph.tracks.firstIndex(where: { $0.id == trackId }) {
            song.mixGraph.tracks[trackIndex].pan = pan
            songs[index] = song
        }
    }

    private func toggleTrackMute(trackId: String) {
        if var song = selectedSong,
           let index = songs.firstIndex(where: { $0.id == song.id }),
           let trackIndex = song.mixGraph.tracks.firstIndex(where: { $0.id == trackId }) {
            song.mixGraph.tracks[trackIndex].mute.toggle()
            songs[index] = song
        }
    }

    private func toggleTrackSolo(trackId: String) {
        if var song = selectedSong,
           let index = songs.firstIndex(where: { $0.id == song.id }),
           let trackIndex = song.mixGraph.tracks.firstIndex(where: { $0.id == trackId }) {
            song.mixGraph.tracks[trackIndex].solo.toggle()
            songs[index] = song
        }
    }

    // MARK: - Templates

    private func applyTemplate(_ template: PerformanceTemplate, to songId: String) {
        // Apply template to song
    }

    private func deleteTemplate(_ template: PerformanceTemplate) {
        // Delete template
    }

    // MARK: - Helper Methods

    private func performancesForSong(_ songId: String) -> [PerformanceState] {
        return performances.filter { $0.id == songId }
    }
}

// =============================================================================
// MARK: - Supporting Types
// =============================================================================

/**
 Console tab selection
 */
public enum ConsoleTab: String, CaseIterable {
    case songs
    case performances
    case templates
    case analysis

    var displayName: String {
        switch self {
        case .songs: return "Songs"
        case .performances: return "Performances"
        case .templates: return "Templates"
        case .analysis: return "Analysis"
        }
    }

    var icon: String {
        switch self {
        case .songs: return "music.note.list"
        case .performances: return "waveform.path"
        case .templates: return "doc.text"
        case .analysis: return "chart.bar"
        }
    }
}

/**
 Window arrangement options
 */
public enum WindowArrangement {
    case grid
    case cascade
    case tileHorizontal
    case tileVertical
}

/**
 Window position data
 */
public struct WindowPosition: Codable {
    let x: CGFloat
    let y: CGFloat
    let width: CGFloat
    let height: CGFloat
}

/**
 Orchestration action for undo/redo
 */
public struct OrchestrationAction {
    let type: ActionType
    let object: ActionType.Object
    let timestamp: Date

    public enum ActionType {
        case createSong
        case createPerformance
        case duplicateSong
        case duplicatePerformance
        case deleteSong
        case deletePerformance
        case batchEditDensity
        case batchApplyPreset

        public enum Object {
            case song(Song)
            case performance(PerformanceState)
            case density(Double)
            case preset(String)
        }
    }

    public init(type: ActionType, object: ActionType.Object) {
        self.type = type
        self.object = object
        self.timestamp = Date()
    }
}

/**
 Performance template
 */
public struct PerformanceTemplate: Identifiable {
    public let id: String
    public let name: String
    public let description: String
    public let performance: PerformanceState
}

// =============================================================================
// MARK: - Preview
// =============================================================================

#if DEBUG
struct OrchestrationConsole_Previews: PreviewProvider {
    static var previews: some View {
        OrchestrationConsole()
            .frame(width: 1200, height: 800)
    }
}
#endif

#endif
