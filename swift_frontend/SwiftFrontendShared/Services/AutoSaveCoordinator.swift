/**
 * White Room AutoSaveCoordinator
 *
 * SwiftUI integration for auto-save system.
 * Provides bindings and view modifiers for easy auto-save setup.
 *
 * Features:
 * - Published properties for UI updates
 * - View modifier for automatic tracking
 * - Unsaved changes indicator
 */

import SwiftUI
import Combine
import Foundation

// MARK: - AutoSave Coordinator

/// Coordinator for integrating auto-save with SwiftUI
public class AutoSaveCoordinator: ObservableObject {
  @Published public var hasUnsavedChanges: Bool = false
  @Published public var lastSaveTime: Date?
  @Published public var autosaveCount: Int = 0

  private let autoSaveManager: AutoSaveManager
  private var cancellables = Set<AnyCancellable>()
  private var currentSongId: String?

  public init(autoSaveManager: AutoSaveManager) {
    self.autoSaveManager = autoSaveManager

    // Start periodic updates
    startPeriodicUpdates()
  }

  /// Start periodic updates for last save time and count
  private func startPeriodicUpdates() {
    Task {
      while !Task.isCancelled {
        await MainActor.run {
          updateFromManager()
        }
        // Update every second
        try? await Task.sleep(nanoseconds: 1_000_000_000)
      }
    }
  }

  /// Update from AutoSaveManager
  private func updateFromManager() {
    Task {
      let lastSave = await autoSaveManager.getLastSaveTime()
      let history = await autoSaveManager.getSaveHistory()

      await MainActor.run {
        self.lastSaveTime = lastSave
        self.autosaveCount = history.count
        // Consider unsaved if we have a song but no recent save
        self.hasUnsavedChanges = currentSongId != nil && (lastSave == nil || Date().timeIntervalSince(lastSave ?? Date()) > 5)
      }
    }
  }

  /// Update autosave count
  public func updateAutosaveCount() {
    updateFromManager()
  }

  /// Save now
  public func saveNow() async throws {
    try await autoSaveManager.triggerImmediateSave()
    await MainActor.run {
      updateFromManager()
    }
  }

  /// Discard pending changes (stops auto-save)
  public func discardPending() {
    Task {
      await autoSaveManager.stopAutoSave()
      await MainActor.run {
        hasUnsavedChanges = false
        currentSongId = nil
      }
    }
  }

  /// Restore from autosave
  public func restoreFromAutosave(version: Int) async throws -> Song {
    let song = try await autoSaveManager.restoreFromAutoSave(version: version)
    await MainActor.run {
      hasUnsavedChanges = true
      currentSongId = song.id
    }
    return song
  }

  /// Clear all autosaves for current song
  public func clearAutosaves() async throws {
    guard let songId = currentSongId else {
      return
    }
    try await autoSaveManager.clearAutoSaves(for: songId)
    await MainActor.run {
      autosaveCount = 0
    }
  }

  /// Set the current song being tracked
  public func setCurrentSong(_ song: Song) {
    currentSongId = song.id
    hasUnsavedChanges = false

    Task {
      await autoSaveManager.startAutoSave(for: song)
    }
  }
}

// MARK: - View Modifier

/// View modifier for automatic auto-save tracking
public struct AutoSaveModifier: ViewModifier {
  @ObservedObject var coordinator: AutoSaveCoordinator
  @Binding var song: Song

  public func body(content: Content) -> some View {
    content
      .onAppear {
        coordinator.setCurrentSong(song)
      }
      .onChange(of: song.id) { newValue in
        coordinator.setCurrentSong(song)
      }
      .onChange(of: song) { newValue in
        // Song changed, mark as unsaved
        Task {
          await MainActor.run {
            coordinator.hasUnsavedChanges = true
          }
        }
      }
  }
}

// MARK: - View Extension

public extension View {
  /// Enable auto-save for a song binding
  func autoSave(
    coordinator: AutoSaveCoordinator,
    song: Binding<Song>
  ) -> some View {
    self.modifier(AutoSaveModifier(coordinator: coordinator, song: song))
  }
}

// MARK: - AutoSave Indicator View

/// View showing auto-save status
public struct AutoSaveIndicator: View {
  @ObservedObject var coordinator: AutoSaveCoordinator

  public init(coordinator: AutoSaveCoordinator) {
    self.coordinator = coordinator
  }

  public var body: some View {
    HStack(spacing: 8) {
      if coordinator.hasUnsavedChanges {
        Image(systemName: "circle.fill")
          .foregroundColor(.orange)
          .font(.system(size: 8))

        Text("Unsaved changes")
          .font(.caption)
          .foregroundColor(.secondary)
      } else if let lastSave = coordinator.lastSaveTime {
        Image(systemName: "checkmark.circle.fill")
          .foregroundColor(.green)
          .font(.system(size: 8))

        Text("Saved \(lastSave, style: .relative)")
          .font(.caption)
          .foregroundColor(.secondary)
      } else {
        Text("No autosaves")
          .font(.caption)
          .foregroundColor(.secondary)
      }

      if coordinator.autosaveCount > 0 {
        Text("(\(coordinator.autosaveCount))")
          .font(.caption2)
          .foregroundColor(.secondary)
      }
    }
    .onAppear {
      coordinator.updateAutosaveCount()
    }
  }
}

// MARK: - Preview

#Preview("Unsaved changes") {
  let manager = mockAutoSaveManager()
  let coordinator = AutoSaveCoordinator(autoSaveManager: manager)

  return AutoSaveIndicator(coordinator: coordinator)
}

#Preview("Saved") {
  let manager = mockAutoSaveManager()
  let coordinator = AutoSaveCoordinator(autoSaveManager: manager)

  return AutoSaveIndicator(coordinator: coordinator)
}

// MARK: - Mock Helpers

#if DEBUG
private func mockAutoSaveManager() -> AutoSaveManager {
  // This would need proper mocking infrastructure
  // For now, this is a placeholder
  fatalError("Mock infrastructure needed for previews")
}
#endif
