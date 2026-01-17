import SwiftUI
import Combine

/// Manages real-time synchronization across multiple notation views
///
/// Responsibilities:
/// - Note selection synchronization
/// - Playback position coordination
/// - Edit conflict resolution
/// - Performance optimization (debouncing, batching)
@available(iOS 16.0, *)
public class NotationSynchronizationManager: ObservableObject {

    // MARK: - Published Properties

    @Published var activeViews: [ViewRegistration] = []
    @Published var selectedNotes: Set<UUID> = []
    @Published var playbackPosition: TimeInterval = 0
    @Published var currentTimeSignature: TimeSignature = .fourFour
    @Published var currentTempo: Double = 120.0

    // MARK: - Private Properties

    private var syncCancellationToken: AnyCancellable?
    private var debounceTimer: Timer?
    private let debounceInterval: TimeInterval = 0.016  // ~60fps
    private var pendingUpdates: [SyncUpdate] = []

    // MARK: - Public Methods

    /// Register a view for synchronization
    public func registerView(_ id: UUID, type: NotationViewType) {
        let registration = ViewRegistration(
            id: id,
            type: type,
            registeredAt: Date()
        )

        // Avoid duplicate registrations
        if !activeViews.contains(where: { $0.id == id }) {
            activeViews.append(registration)

            // Listen for sync notifications from this view
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(handleSyncNotification(_:)),
                name: .notationViewDidUpdate,
                object: id
            )
        }
    }

    /// Unregister a view from synchronization
    public func unregisterView(_ id: UUID) {
        activeViews.removeAll { $0.id == id }
        NotificationCenter.default.removeObserver(self, name: .notationViewDidUpdate, object: id)
    }

    /// Sync note selection across all views
    public func syncSelection(_ newSelection: Set<UUID>, from viewId: UUID) {
        selectedNotes = newSelection

        // Debounce updates for performance
        debounce {
            // Notify all views except the source
            for view in activeViews where view.id != viewId {
                NotificationCenter.default.post(
                    name: .selectionDidChange,
                    object: SelectionChange(
                        viewId: view.id,
                        selectedNotes: newSelection
                    )
                )
            }
        }
    }

    /// Sync playback position across all views
    public func syncPlaybackPosition(_ position: TimeInterval) {
        playbackPosition = position

        // Immediate sync for playback (no debouncing)
        NotificationCenter.default.post(
            name: .playbackPositionDidChange,
            object: PlaybackPositionChange(
                position: position,
                timestamp: Date()
            )
        )
    }

    /// Sync note edits across all views
    public func syncNoteEdit(_ edit: NoteEdit, from viewId: UUID) {
        pendingUpdates.append(.noteEdit(edit))

        // Batch edit updates
        debounce {
            flushPendingUpdates(excluding: viewId)
        }
    }

    /// Sync tempo change across all views
    public func syncTempo(_ tempo: Double) {
        currentTempo = tempo

        NotificationCenter.default.post(
            name: .tempoDidChange,
            object: TempoSyncChange(tempo: tempo, timestamp: Date())
        )
    }

    /// Sync time signature change across all views
    public func syncTimeSignature(_ timeSignature: TimeSignature) {
        currentTimeSignature = timeSignature

        NotificationCenter.default.post(
            name: .timeSignatureDidChange,
            object: TimeSignatureSyncChange(timeSignature: timeSignature, timestamp: Date())
        )
    }

    /// Request focus for a specific view
    public func requestFocus(for viewId: UUID) {
        NotificationCenter.default.post(
            name: .viewDidRequestFocus,
            object: ViewFocusChange(viewId: viewId, timestamp: Date())
        )
    }

    // MARK: - Private Methods

    @objc private func handleSyncNotification(_ notification: Notification) {
        guard let viewId = notification.object as? UUID,
              let update = notification.userInfo?["update"] as? SyncUpdate else {
            return
        }

        switch update {
        case .noteEdit(let edit):
            syncNoteEdit(edit, from: viewId)

        case .selectionChange(let selection):
            syncSelection(selection.selectedNotes, from: viewId)

        case .playbackPosition(let position):
            syncPlaybackPosition(position.position)

        case .tempo(let tempo):
            syncTempo(tempo.tempo)

        case .timeSignature(let timeSignature):
            syncTimeSignature(timeSignature.timeSignature)
        }
    }

    private func debounce(work: @escaping () -> Void) {
        debounceTimer?.invalidate()
        debounceTimer = Timer.scheduledTimer(withTimeInterval: debounceInterval, repeats: false) { _ in
            work()
        }
    }

    private func flushPendingUpdates(excluding sourceViewId: UUID) {
        guard !pendingUpdates.isEmpty else { return }

        let updates = pendingUpdates
        pendingUpdates.removeAll()

        // Send batched updates to all views except source
        for view in activeViews where view.id != sourceViewId {
            NotificationCenter.default.post(
                name: .batchedUpdatesDidOccur,
                object: BatchedUpdate(
                    viewId: view.id,
                    updates: updates,
                    timestamp: Date()
                )
            )
        }
    }

    // MARK: - Initialization

    public init() {
        setupPeriodicSync()
    }

    private func setupPeriodicSync() {
        // Periodic sync to ensure consistency (every 100ms)
        syncCancellationToken = Timer.publish(every: 0.1, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.performPeriodicSync()
            }
    }

    private func performPeriodicSync() {
        // Flush any pending updates
        if !pendingUpdates.isEmpty {
            flushPendingUpdates(excluding: UUID())  // No source exclusion for periodic sync
        }
    }

    deinit {
        syncCancellationToken?.cancel()
        debounceTimer?.invalidate()
        NotificationCenter.default.removeObserver(self)
    }
}

// =============================================================================
// MARK: - Supporting Types
// ===============================================================================

/// Registration information for a synchronized view
public struct ViewRegistration: Identifiable, Equatable {
    var id: UUID
    var type: NotationViewType
    var registeredAt: Date
}

/// Sync update types
public enum SyncUpdate: Equatable {
    case noteEdit(NoteEdit)
    case selectionChange(SelectionChange)
    case playbackPosition(PlaybackPositionChange)
    case tempo(TempoSyncChange)
    case timeSignature(TimeSignatureSyncChange)
}

/// Note edit information
public struct NoteEdit: Equatable, Codable {
    var noteId: UUID
    var pitch: Int?
    var startBeat: Double?
    var duration: Double?
    var velocity: Int?
    var editType: EditType

    public enum EditType: String, Codable {
        case created
        case modified
        case deleted
    }
}

/// Selection change information
public struct SelectionChange: Equatable, Codable {
    var viewId: UUID
    var selectedNotes: Set<UUID>
}

/// Playback position change
public struct PlaybackPositionChange: Equatable, Codable {
    var position: TimeInterval
    var timestamp: Date
}

/// Tempo sync change (for notification synchronization, not musical tempo)
public struct TempoSyncChange: Equatable, Codable {
    var tempo: Double
    var timestamp: Date
}

/// Time signature sync change (for notification synchronization, not musical events)
public struct TimeSignatureSyncChange: Equatable, Codable {
    var timeSignature: TimeSignature
    var timestamp: Date
}

/// View focus change
public struct ViewFocusChange: Equatable, Codable {
    var viewId: UUID
    var timestamp: Date
}

/// Batched update containing multiple sync operations
public struct BatchedUpdate: Equatable {
    var viewId: UUID
    var updates: [SyncUpdate]
    var timestamp: Date
}

// =============================================================================
// MARK: - Notification Names
// ===============================================================================

extension Notification.Name {
    static let notationViewDidUpdate = Notification.Name("notationViewDidUpdate")
    static let selectionDidChange = Notification.Name("selectionDidChange")
    static let playbackPositionDidChange = Notification.Name("playbackPositionDidChange")
    static let tempoDidChange = Notification.Name("tempoDidChange")
    static let timeSignatureDidChange = Notification.Name("timeSignatureDidChange")
    static let viewDidRequestFocus = Notification.Name("viewDidRequestFocus")
    static let batchedUpdatesDidOccur = Notification.Name("batchedUpdatesDidOccur")
}

// =============================================================================
// MARK: - Sync Helper Extension
// ===============================================================================

extension View {
    /// Subscribe to sync updates for this view
    public func syncableView(id: UUID, type: NotationViewType) -> some View {
        self.onAppear {
            // Register with sync manager when view appears
            NotificationCenter.default.post(
                name: .notationViewDidUpdate,
                object: id,
                userInfo: ["register": true, "type": type]
            )
        }
        .onDisappear {
            // Unregister when view disappears
            NotificationCenter.default.post(
                name: .notationViewDidUpdate,
                object: id,
                userInfo: ["unregister": true]
            )
        }
    }
}

// =============================================================================
// MARK: - Previews
// ===============================================================================

#if DEBUG
@available(iOS 16.0, *)
struct NotationSynchronizationManager_Previews: PreviewProvider {
    static var previews: some View {
        VStack {
            Text("Synchronization Manager")
                .font(.title)
            Text("Manages real-time sync across multiple views")
                .foregroundColor(.secondary)
        }
        .padding()
    }
}
#endif
