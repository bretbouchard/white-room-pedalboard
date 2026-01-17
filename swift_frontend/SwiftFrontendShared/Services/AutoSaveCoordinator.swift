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

  public init(autoSaveManager: AutoSaveManager) {
    self.autoSaveManager = autoSaveManager

    // Subscribe to AutoSaveManager changes
    Task {
      await autoSaveManager.$isDirty
        .receive(on: RunLoop.main)
        .assign(to: &$hasUnsavedChanges)
    }

    Task {
      await autoSaveManager.$lastSaveTime
        .receive(on: RunLoop.main)
        .assign(to: &$lastSaveTime)
    }

    // Update autosave count periodically
    Task {
      await MainActor.run {
        updateAutosaveCount()
      }
    }
  }

  /// Update autosave count
  public func updateAutosaveCount() {
    Task {
      let count = try? await autoSaveManager.getAutosaves().count
      await MainActor.run {
        self.autosaveCount = count ?? 0
      }
    }
  }

  /// Save now
  public func saveNow() async throws {
    try await autoSaveManager.saveNow()
    await MainActor.run {
      updateAutosaveCount()
    }
  }

  /// Discard pending changes
  public func discardPending() {
    Task {
      await autoSaveManager.discardPendingSave()
      await MainActor.run {
        hasUnsavedChanges = false
      }
    }
  }

  /// Restore from autosave
  public func restoreFromAutosave(_ autosaveId: String) async throws -> Song {
    let song = try await autoSaveManager.restoreFromAutosave(autosaveId)
    await MainActor.run {
      hasUnsavedChanges = true
    }
    return song
  }

  /// Clear all autosaves
  public func clearAutosaves() async throws {
    try await autoSaveManager.clearAutosaves()
    await MainActor.run {
      autosaveCount = 0
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
      .onChange(of: song) { oldValue, newValue in
        Task {
          await coordinator.autoSaveManager.markDirty(newValue)
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
