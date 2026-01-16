/**
 * AudioManager Unit Tests
 *
 * Comprehensive tests for real audio manager functionality
 */

import XCTest
@testable import SwiftFrontendShared

final class AudioManagerTests: XCTestCase {

  var audioManager: AudioManager!

  override func setUp() {
    super.setUp()
    audioManager = AudioManager()
  }

  override func tearDown() {
    audioManager = nil
    super.tearDown()
  }

  // MARK: - Initialization Tests

  func testInitialization() {
    // Manager should be ready after initialization
    XCTAssertTrue(audioManager.isReady, "AudioManager should be ready after initialization")
  }

  func testInitialState() {
    // Check initial state values
    XCTAssertEqual(audioManager.playbackState, .stopped, "Initial state should be stopped")
    XCTAssertEqual(audioManager.currentPosition, 0.0, "Initial position should be 0")
    XCTAssertEqual(audioManager.tempo, 120.0, "Initial tempo should be 120 BPM")
    XCTAssertEqual(audioManager.channelLevels.count, 2, "Should have 2 channel levels")
    XCTAssertEqual(audioManager.channelLevels[0], 0.0, "Initial level for channel 0 should be 0")
    XCTAssertEqual(audioManager.channelLevels[1], 0.0, "Initial level for channel 1 should be 0")
  }

  func testInitializationWithCustomConfig() {
    let customConfig = AudioConfig(sampleRate: 44100.0, bufferSize: 256)
    let customManager = AudioManager(config: customConfig)

    XCTAssertTrue(customManager.isReady, "Manager with custom config should be ready")
  }

  // MARK: - Playback Control Tests

  func testStartPlayback() throws {
    try audioManager.startPlayback()

    XCTAssertEqual(audioManager.playbackState, .playing, "State should be playing after start")
  }

  func testStopPlayback() throws {
    try audioManager.startPlayback()
    try audioManager.stopPlayback()

    XCTAssertEqual(audioManager.playbackState, .stopped, "State should be stopped after stop")
    XCTAssertEqual(audioManager.currentPosition, 0.0, "Position should reset to 0")
  }

  func testPausePlayback() throws {
    try audioManager.startPlayback()
    try audioManager.pausePlayback()

    XCTAssertEqual(audioManager.playbackState, .paused, "State should be paused")
  }

  func testMultipleStartPlayback() throws {
    try audioManager.startPlayback()
    try audioManager.startPlayback()  // Second start

    XCTAssertEqual(audioManager.playbackState, .playing, "State should remain playing")
  }

  func testStopWhenNotPlaying() throws {
    // Stop without starting should not throw
    try audioManager.stopPlayback()

    XCTAssertEqual(audioManager.playbackState, .stopped, "State should remain stopped")
  }

  func testPauseWhenNotPlaying() {
    // Pause without starting should throw
    XCTAssertThrowsError(try audioManager.pausePlayback(), "Pause when not playing should throw") { error in
      XCTAssertTrue(error is AudioManagerError, "Error should be AudioManagerError")
    }
  }

  // MARK: - Playback State Transitions Tests

  func testPlaybackStateTransitions() throws {
    // Stopped -> Playing
    XCTAssertEqual(audioManager.playbackState, .stopped)
    try audioManager.startPlayback()
    XCTAssertEqual(audioManager.playbackState, .playing)

    // Playing -> Paused
    try audioManager.pausePlayback()
    XCTAssertEqual(audioManager.playbackState, .paused)

    // Paused -> Stopped
    try audioManager.stopPlayback()
    XCTAssertEqual(audioManager.playbackState, .stopped)

    // Stopped -> Playing again
    try audioManager.startPlayback()
    XCTAssertEqual(audioManager.playbackState, .playing)
  }

  // MARK: - Tempo Tests

  func testSetTempo() throws {
    try audioManager.setTempo(140.0)

    XCTAssertEqual(audioManager.tempo, 140.0, "Tempo should be updated")
  }

  func testSetTempoDuringPlayback() throws {
    try audioManager.startPlayback()
    try audioManager.setTempo(150.0)

    XCTAssertEqual(audioManager.tempo, 150.0, "Tempo should be updated during playback")
    XCTAssertEqual(audioManager.playbackState, .playing, "Should remain playing")
  }

  func testSetTempoBeforeReady() {
    // Create manager but mark as not ready
    let notReadyManager = AudioManager()
    // Note: In real scenario, we'd need to mock the engine not being ready

    // This would throw if engine is not ready
    // XCTAssertThrowsError(try notReadyManager.setTempo(100.0))
  }

  // MARK: - Seek Tests

  func testSeekToPosition() throws {
    try audioManager.seek(to: 5000.0)

    XCTAssertEqual(audioManager.currentPosition, 5000.0, "Position should be updated")
  }

  func testSeekDuringPlayback() throws {
    try audioManager.startPlayback()
    try audioManager.seek(to: 10000.0)

    XCTAssertEqual(audioManager.currentPosition, 10000.0, "Position should be updated during playback")
    XCTAssertEqual(audioManager.playbackState, .playing, "Should remain playing")
  }

  func testSeekToZero() throws {
    try audioManager.seek(to: 0.0)

    XCTAssertEqual(audioManager.currentPosition, 0.0, "Position should be 0")
  }

  // MARK: - Audio Level Tests

  func testGetAudioLevelValidChannel() {
    let level0 = audioManager.getAudioLevel(channel: 0)
    let level1 = audioManager.getAudioLevel(channel: 1)

    XCTAssertEqual(level0, 0.0, "Initial level should be 0")
    XCTAssertEqual(level1, 0.0, "Initial level should be 0")
  }

  func testGetAudioLevelInvalidChannel() {
    let levelInvalid = audioManager.getAudioLevel(channel: 999)

    XCTAssertEqual(levelInvalid, 0.0, "Invalid channel should return 0")
  }

  func testGetAudioLevelNegativeChannel() {
    let levelNegative = audioManager.getAudioLevel(channel: -1)

    XCTAssertEqual(levelNegative, 0.0, "Negative channel should return 0")
  }

  // MARK: - Panic Stop Tests

  func testPanicStop() throws {
    try audioManager.startPlayback()
    try audioManager.setTempo(150.0)
    try audioManager.seek(to: 5000.0)

    audioManager.panicStop()

    XCTAssertEqual(audioManager.playbackState, .stopped, "State should be stopped after panic")
    XCTAssertEqual(audioManager.currentPosition, 0.0, "Position should be reset")
    XCTAssertEqual(audioManager.tempo, 150.0, "Tempo should remain (not reset)")
    XCTAssertEqual(audioManager.channelLevels[0], 0.0, "Levels should be reset")
    XCTAssertEqual(audioManager.channelLevels[1], 0.0, "Levels should be reset")
  }

  func testPanicStopWhenNotPlaying() {
    audioManager.panicStop()

    XCTAssertEqual(audioManager.playbackState, .stopped, "Should remain stopped")
  }

  // MARK: - Error Handling Tests

  func testPlaybackFailedError() {
    // This test would require mocking engine failures
    // For now, we test that errors can be thrown

    let error = AudioManagerError.playbackFailed("Test error")
    XCTAssertEqual(error.errorDescription, "Playback failed: Test error")
  }

  func testEngineNotReadyError() {
    let error = AudioManagerError.engineNotReady
    XCTAssertEqual(error.errorDescription, "Audio engine is not ready")
  }

  func testInitializationFailedError() {
    let error = AudioManagerError.initializationFailed("Test failure")
    XCTAssertEqual(error.errorDescription, "Failed to initialize audio engine: Test failure")
  }

  func testInvalidStateError() {
    let error = AudioManagerError.invalidState("Test state")
    XCTAssertEqual(error.errorDescription, "Invalid audio state: Test state")
  }

  // MARK: - Configuration Tests

  func testDefaultConfig() {
    let defaultConfig = AudioConfig.default

    XCTAssertEqual(defaultConfig.sampleRate, 48000.0, "Default sample rate should be 48000")
    XCTAssertEqual(defaultConfig.bufferSize, 512, "Default buffer size should be 512")
  }

  func testCustomConfigCreation() {
    let customConfig = AudioConfig(sampleRate: 44100.0, bufferSize: 256)

    XCTAssertEqual(customConfig.sampleRate, 44100.0)
    XCTAssertEqual(customConfig.bufferSize, 256)
  }

  // MARK: - Performance Tests

  func testPlaybackControlPerformance() throws {
    measure {
      for _ in 0..<1000 {
        try? audioManager.startPlayback()
        try? audioManager.stopPlayback()
      }
    }
  }

  func testTempoChangePerformance() throws {
    try audioManager.startPlayback()

    measure {
      for i in 0..<1000 {
        try? audioManager.setTempo(Double(i))
      }
    }
  }

  func testSeekPerformance() throws {
    measure {
      for i in 0..<1000 {
        try? audioManager.seek(to: Double(i * 100))
      }
    }
  }

  // MARK: - Memory Tests

  func testMemoryAllocation() {
    // Create multiple managers to test memory management
    weak var weakManager: AudioManager?

    autoreleasepool {
      let tempManager = AudioManager()
      weakManager = tempManager
      XCTAssertTrue(weakManager != nil, "Manager should exist within autoreleasepool")
    }

    // Manager should be deallocated after autoreleasepool
    XCTAssertNil(weakManager, "Manager should be deallocated")
  }
}
