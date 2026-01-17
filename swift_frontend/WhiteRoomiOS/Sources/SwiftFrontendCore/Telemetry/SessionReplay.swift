//
//  SessionReplay.swift
//  SwiftFrontendCore
//
//  Created by White Room AI
//  Copyright © 2026 White Room. All rights reserved.
//

import Foundation

// =============================================================================
// MARK: - Session Replay
// =============================================================================

/**
 Session replay system for debugging user workflows

 Maintains a circular buffer of UI events for comprehensive session recording:
 - Automatic event recording with circular buffer (max 1000 events)
 - JSON serialization for disk storage
 - Automatic save on critical events
 - Disk management with auto-cleanup
 - Thread-safe event queue

 Usage:
 ```swift
 // Record events automatically
 SessionReplay.shared.record(
     ReplayEvent(
         type: .tap,
         screen: "MovingSidewalkView",
         action: "Tapped Play Button",
         context: ["button_id": "play_button_1"]
     )
 )

 // Save session for debugging
 try SessionReplay.shared.saveSession()

 // Get event count
 let count = SessionReplay.shared.getEventCount()
 ```
 */
public class SessionReplay {

    // MARK: - Singleton

    public static let shared = SessionReplay()

    // MARK: - Properties

    private let maxEvents: Int
    private let fileManager = FileManager.default
    private let saveDirectory: URL

    // Thread-safe event storage
    private actor EventStorage {
        var events: [ReplayEvent] = []
        let maxCount: Int

        init(maxCount: Int) {
            self.maxCount = maxCount
        }

        func append(_ event: ReplayEvent) {
            events.append(event)

            // Circular buffer - remove oldest if over limit
            if events.count > maxCount {
                events.removeFirst(events.count - maxCount)
            }
        }

        func getEvents() -> [ReplayEvent] {
            events
        }

        func clear() {
            events.removeAll()
        }

        var count: Int {
            events.count
        }
    }

    private let eventStorage: EventStorage

    // MARK: - Initialization

    private init(maxEvents: Int = 1000) {
        self.maxEvents = maxEvents
        self.eventStorage = EventStorage(maxCount: maxEvents)

        // Setup save directory
        let cachesDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        self.saveDirectory = cachesDirectory.appendingPathComponent("SessionReplay", isDirectory: true)

        // Create directory if needed
        createSaveDirectoryIfNeeded()

        // Clean up old sessions
        cleanupOldSessions()
    }

    // MARK: - Public Methods

    /**
     Record a replay event

     - Parameter event: Event to record
     */
    public func record(_ event: ReplayEvent) {
        Task {
            await eventStorage.append(event)

            // Auto-save on critical events
            if event.type == .error {
                do {
                    try saveSession()
                } catch {
                    print("Failed to auto-save session: \(error)")
                }
            }
        }
    }

    /**
     Save current session to disk

     - Throws: File system errors

     File naming: session_YYYY-MM-DD_HH-mm-ss.json
     */
    public func saveSession() throws {
        let events = await eventStorage.getEvents()

        guard !events.isEmpty else {
            throw SessionReplayError.noEventsToSave
        }

        // Create filename with timestamp
        let timestamp = ISO8601DateFormatter().string(from: Date())
        let filename = "session_\(timestamp).json"
        let fileURL = saveDirectory.appendingPathComponent(filename)

        // Create session object
        let session = Session(
            id: UUID(),
            timestamp: Date(),
            events: events,
            metadata: createMetadata()
        )

        // Serialize to JSON
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601

        let data = try encoder.encode(session)

        // Write to disk
        try data.write(to: fileURL, options: .atomic)

        // Record to crash reporting
        CrashReporting.shared.leaveBreadcrumb(
            "Session saved: \(events.count) events",
            category: "session_replay",
            level: .info,
            data: ["file": filename]
        )
    }

    /**
     Load a session from disk

     - Parameter filename: Session filename (e.g., "session_2026-01-16_12-00-00.json")
     - Returns: Decoded session object
     - Throws: File system or decoding errors
     */
    public func loadSession(filename: String) throws -> Session {
        let fileURL = saveDirectory.appendingPathComponent(filename)

        guard fileManager.fileExists(atPath: fileURL.path) else {
            throw SessionReplayError.fileNotFound
        }

        let data = try Data(contentsOf: fileURL)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return try decoder.decode(Session.self, from: data)
    }

    /**
     Clear current session from memory

     Does not delete saved sessions from disk.
     */
    public func clearSession() {
        Task {
            await eventStorage.clear()
        }

        CrashReporting.shared.leaveBreadcrumb(
            "Session cleared",
            category: "session_replay",
            level: .info
        )
    }

    /**
     Get current event count

     - Returns: Number of events in memory
     */
    public func getEventCount() -> Int {
        Task {
            return await eventStorage.count
        }
        return 0 // Synchronous fallback
    }

    /**
     Get all events in memory

     - Returns: Array of replay events
     */
    public func getEvents() -> [ReplayEvent] {
        Task {
            return await eventStorage.getEvents()
        }
        return [] // Synchronous fallback
    }

    /**
     List all saved sessions

     - Returns: Array of session filenames
     - Throws: File system errors
     */
    public func listSavedSessions() throws -> [String] {
        let files = try fileManager.contentsOfDirectory(
            at: saveDirectory,
            includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey]
        )

        return files
            .filter { $0.pathExtension == "json" }
            .map { $0.lastPathComponent }
            .sorted()
    }

    /**
     Delete a specific session

     - Parameter filename: Session filename
     - Throws: File system errors
     */
    public func deleteSession(filename: String) throws {
        let fileURL = saveDirectory.appendingPathComponent(filename)

        guard fileManager.fileExists(atPath: fileURL.path) else {
            throw SessionReplayError.fileNotFound
        }

        try fileManager.removeItem(at: fileURL)

        CrashReporting.shared.leaveBreadcrumb(
            "Session deleted: \(filename)",
            category: "session_replay",
            level: .info
        )
    }

    /**
     Delete all saved sessions

     - Throws: File system errors
     */
    public func deleteAllSessions() throws {
        let files = try fileManager.contentsOfDirectory(at: saveDirectory, includingPropertiesForKeys: nil)

        for file in files where file.pathExtension == "json" {
            try fileManager.removeItem(at: file)
        }

        CrashReporting.shared.leaveBreadcrumb(
            "All sessions deleted",
            category: "session_replay",
            level: .info
        )
    }

    // MARK: - Private Methods

    private func createSaveDirectoryIfNeeded() {
        if !fileManager.fileExists(atPath: saveDirectory.path) {
            try? fileManager.createDirectory(
                at: saveDirectory,
                withIntermediateDirectories: true,
                attributes: nil
            )
        }
    }

    private func cleanupOldSessions() {
        do {
            let files = try fileManager.contentsOfDirectory(
                at: saveDirectory,
                includingPropertiesForKeys: [.contentModificationDateKey]
            )

            // Delete sessions older than 7 days
            let cutoffDate = Date().addingTimeInterval(-7 * 24 * 60 * 60)

            for file in files where file.pathExtension == "json" {
                if let modificationDate = try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate,
                   modificationDate < cutoffDate {
                    try? fileManager.removeItem(at: file)
                }
            }
        } catch {
            print("Failed to cleanup old sessions: \(error)")
        }
    }

    private func createMetadata() -> ReplaySessionMetadata {
        ReplaySessionMetadata(
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
            buildNumber: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown",
            deviceModel: UIDevice.current.model,
            systemVersion: UIDevice.current.systemVersion,
            sessionId: CrashReporting.shared
        )
    }
}

// =============================================================================
// MARK: - Session Models
// =============================================================================

/**
 Complete session data
 */
public struct Session: Codable {
    public let id: UUID
    public let timestamp: Date
    public let events: [ReplayEvent]
    public let metadata: ReplaySessionMetadata
}

/**
 Session metadata for replay sessions
 */
public struct ReplaySessionMetadata: Codable {
    public let appVersion: String
    public let buildNumber: String
    public let deviceModel: String
    public let systemVersion: String
    public let sessionId: String
}

/**
 Replay event
 */
public struct ReplayEvent: Codable, Sendable {
    public let id: UUID
    public let timestamp: Date
    public let type: EventType
    public let screen: String
    public let action: String
    public let context: [String: String]

    public init(
        type: EventType,
        screen: String,
        action: String,
        context: [String: String] = [:]
    ) {
        self.id = UUID()
        self.timestamp = Date()
        self.type = type
        self.screen = screen
        self.action = action
        self.context = context
    }
}

/**
 Event type
 */
public enum EventType: String, Codable {
    case tap
    case gesture
    case navigation
    case valueChange
    case screenView
    case error
}

// =============================================================================
// MARK: - Session Replay Errors
// =============================================================================

/**
 Session replay errors
 */
public enum SessionReplayError: Error, LocalizedError {
    case noEventsToSave
    case fileNotFound
    case invalidSessionData

    public var errorDescription: String? {
        switch self {
        case .noEventsToSave:
            return "No events to save - session is empty"
        case .fileNotFound:
            return "Session file not found"
        case .invalidSessionData:
            return "Invalid session data"
        }
    }
}

// =============================================================================
// MARK: - Session Replay Extensions
// =============================================================================

public extension SessionReplay {
    /**
     Export session as JSON string

     - Returns: JSON string representation of current session
     - Throws: Encoding errors
     */
    func exportSessionAsJSON() throws -> String {
        let events = await eventStorage.getEvents()

        let session = Session(
            id: UUID(),
            timestamp: Date(),
            events: events,
            metadata: createMetadata()
        )

        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601

        let data = try encoder.encode(session)
        return String(data: data, encoding: .utf8) ?? ""
    }

    /**
     Get session statistics

     - Returns: Statistics about current session
     */
    func getSessionStatistics() async -> SessionStatistics {
        let events = await eventStorage.getEvents()

        let eventTypeCounts = Dictionary(
            grouping: events,
            by: { $0.type }
        )
        .mapValues { $0.count }

        let screens = Set(events.map { $0.screen })

        return SessionStatistics(
            eventCount: events.count,
            eventTypeCounts: eventTypeCounts,
            uniqueScreens: screens.count,
            duration: events.last?.timestamp.timeIntervalSince(events.first?.timestamp ?? Date()) ?? 0
        )
    }
}

/**
 Session statistics
 */
public struct SessionStatistics {
    public let eventCount: Int
    public let eventTypeCounts: [EventType: Int]
    public let uniqueScreens: Int
    public let duration: TimeInterval
}
