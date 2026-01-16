import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:schillinger_sdk/schillinger_sdk.dart';
import 'package:path/path.dart' as path;
import 'package:temp/temp.dart';

void main() {
  group('SidewalkState - Serialization', () {
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp();
    });

    tearDown(() async {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('Initial state creation', () {
      final state = SidewalkState.initial(
        compositionId: 'test-composition-1',
        totalDuration: const Duration(minutes: 5),
        tempo: const Tempo(bpm: 140),
      );

      expect(state.isValid, isTrue);
      expect(state.stateId, isNotEmpty);
      expect(state.metadata.compositionId, 'test-composition-1');
      expect(state.musicalRealization.scaleRoot, 'C');
      expect(state.generatorState.generationSeed, isPositive);
    });

    test('JSON serialization round-trip', () {
      final original = SidewalkState.initial(
        compositionId: 'test-composition-2',
        totalDuration: const Duration(minutes: 3),
        tempo: const Tempo(bpm: 100),
      );

      // Serialize
      final json = original.toJson();

      // Deserialize
      final restored = SidewalkState.fromJson(json);

      // Verify all fields
      expect(restored.stateId, original.stateId);
      expect(restored.createdAt, original.createdAt);
      expect(restored.lastModified, original.lastModified);
      expect(restored.musicalRealization.scaleRoot, original.musicalRealization.scaleRoot);
      expect(restored.generatorState.activeGenerator, original.generatorState.activeGenerator);
      expect(restored.timeline.totalDuration, original.timeline.totalDuration);
      expect(restored.metadata.compositionId, original.metadata.compositionId);
      expect(restored.isValid, isTrue);
    });

    test('Complex state serialization', () {
      final state = SidewalkState(
        stateId: 'complex-state-1',
        createdAt: DateTime(2025, 1, 15, 10, 30),
        lastModified: DateTime(2025, 1, 15, 12, 45),
        musicalRealization: MusicalRealizationState(
          scaleRoot: 'D',
          scaleType: 'minor',
          harmonicSeries: 2,
          activePitchClasses: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
          rhythmicParameters: {
            'timeSignature': '3/4',
            'tempo': 110,
          },
          melodicParameters: {
            'range': 18,
            'direction': 'ascending',
          },
        ),
        generatorState: GeneratorState(
          activeGenerator: 'interference',
          generatorParameters: {
            'algorithm': 'advanced',
            'complexity': 0.8,
          },
          generationSeed: 12345,
          enabledFeatures: ['convergence_zones'],
          disabledConstraints: [],
        ),
        timeline: TimelineState(
          totalDuration: const Duration(minutes: 4),
          tempo: 110,
          timeSignature: '3/4',
          markers: [
            TimelineMarkerState(
              id: 'marker-1',
              name: 'Verse',
              position: const Duration(seconds: 30),
              color: '#FF0000',
            ),
          ],
          regions: [
            TimelineRegionState(
              id: 'region-1',
              name: 'Chorus',
              startPosition: const Duration(seconds: 60),
              endPosition: const Duration(seconds: 120),
              color: '#00FF00',
            ),
          ],
        ),
        roleAssignments: {
          'melody-1': RoleAssignmentState(
            roleId: 'melody-1',
            role: MusicalRole.melody,
            isActive: true,
            volume: 0.8,
            pan: 0.0,
            isMuted: false,
            isSolo: false,
            roleParameters: {},
          ),
          'bass-1': RoleAssignmentState(
            roleId: 'bass-1',
            role: MusicalRole.bass,
            isActive: true,
            volume: 0.9,
            pan: -0.3,
            isMuted: false,
            isSolo: false,
            roleParameters: {},
          ),
        },
        convergence: ConvergenceState(
          convergenceEvents: [
            ConvergenceEventState(
              id: 'conv-1',
              timestamp: DateTime(2025, 1, 15, 10, 30),
              position: const Duration(seconds: 45),
              convergingRoles: {'melody-1', 'bass-1'},
              convergenceType: 'perfect',
            ),
          ],
          activeZones: [
            ConvergenceZoneState(
              id: 'zone-1',
              name: 'Main Convergence',
              startPosition: const Duration(seconds: 40),
              endPosition: const Duration(seconds: 50),
              involvedRoles: ['melody-1', 'bass-1'],
              intensity: 0.9,
            ),
          ],
          convergenceParameters: {
            'sensitivity': 0.8,
          },
        ),
        intensityCurves: {
          'melody-intensity': IntensityCurveState(
            id: 'curve-1',
            name: 'Melody Intensity',
            points: [
              IntensityPointState(
                time: Duration.zero,
                value: 0.5,
                isControlPoint: true,
              ),
              IntensityPointState(
                time: const Duration(seconds: 30),
                value: 0.8,
                isControlPoint: true,
              ),
              IntensityPointState(
                time: const Duration(seconds: 60),
                value: 0.6,
                isControlPoint: false,
              ),
            ],
            curveType: 'cubic',
          ),
        },
        performance: PerformanceState(
          playbackParameters: {
            'loopEnabled': true,
            'loopStart': 0,
            'loopEnd': 60000,
          },
          automationTracks: ['velocity', 'expression'],
          expression: {
            'velocityCurve': 'exponential',
            'dynamicRange': 0.8,
          },
        ),
        metadata: StateMetadata(
          compositionId: 'complex-composition',
          version: '2.0.0',
          tags: ['experimental', 'convergence-heavy'],
          description: 'Complex composition with multiple convergences',
          customProperties: {
            'composer': 'Test Suite',
            'genre': 'Avant-garde',
          },
        ),
      );

      // Serialize and deserialize
      final json = state.toJson();
      final restored = SidewalkState.fromJson(json);

      // Verify complex structures
      expect(restored.stateId, state.stateId);
      expect(restored.musicalRealization.scaleRoot, 'D');
      expect(restored.timeline.markers.length, 1);
      expect(restored.timeline.regions.length, 1);
      expect(restored.roleAssignments.length, 2);
      expect(restored.convergence.convergenceEvents.length, 1);
      expect(restored.convergence.activeZones.length, 1);
      expect(restored.intensityCurves.length, 1);
      expect(restored.performance.automationTracks.length, 2);
      expect(restored.metadata.tags.length, 2);
      expect(restored.isValid, isTrue);
    });

    test('State copyWith modification', () {
      final original = SidewalkState.initial(
        compositionId: 'test-3',
        totalDuration: const Duration(minutes: 2),
      );

      final modified = original.copyWith(
        musicalRealization: MusicalRealizationState(
          scaleRoot: 'F#',
          scaleType: 'pentatonic',
          harmonicSeries: 3,
          activePitchClasses: ['F#', 'A#', 'B', 'C#', 'D#'],
          rhythmicParameters: {},
          melodicParameters: {},
        ),
      );

      expect(original.musicalRealization.scaleRoot, 'C');
      expect(modified.musicalRealization.scaleRoot, 'F#');
      expect(original.stateId, modified.stateId); // Unchanged
    });

    test('State size calculation', () {
      final state = SidewalkState.initial(
        compositionId: 'test-4',
        totalDuration: const Duration(minutes: 1),
      );

      final size = state.sizeInBytes;

      expect(size, isPositive);
      expect(size, greaterThan(1000)); // At least 1KB for minimal state
    });

    test('Invalid state detection', () {
      // Create invalid state via manual construction
      final invalid = SidewalkState(
        stateId: '', // Invalid: empty ID
        createdAt: DateTime(2025, 1, 15),
        lastModified: DateTime(2025, 1, 14), // Invalid: modified before created
        musicalRealization: MusicalRealizationState(
          scaleRoot: '', // Invalid: empty root
          scaleType: 'major',
          harmonicSeries: 1,
          activePitchClasses: [],
          rhythmicParameters: {},
          melodicParameters: {},
        ),
        generatorState: GeneratorState(
          activeGenerator: '',
          generatorParameters: {},
          generationSeed: 0,
          enabledFeatures: [],
          disabledConstraints: [],
        ),
        timeline: TimelineState(
          totalDuration: Duration.zero, // Invalid: zero duration
          tempo: 120,
          timeSignature: '4/4',
          markers: [],
          regions: [],
        ),
        roleAssignments: {},
        convergence: ConvergenceState(
          convergenceEvents: [],
          activeZones: [],
          convergenceParameters: {},
        ),
        intensityCurves: {},
        performance: PerformanceState(
          playbackParameters: {},
          automationTracks: [],
          expression: {},
        ),
        metadata: StateMetadata(
          compositionId: 'test',
          version: '2.0.0',
          tags: [],
          customProperties: {},
        ),
      );

      expect(invalid.isValid, isFalse);
    });
  });

  group('StatePersistenceManager - File Operations', () {
    late Directory tempDir;
    late StatePersistenceManager persistence;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp();
      persistence = StatePersistenceManager(
        storageDirectory: tempDir,
        autoBackup: true,
        maxBackups: 5,
      );
    });

    tearDown(() async {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('Save and load state', () async {
      final original = SidewalkState.initial(
        compositionId: 'save-load-test',
        totalDuration: const Duration(minutes: 2),
        tempo: const Tempo(bpm: 135),
      );

      // Save
      final saveResult = await persistence.saveState(original);
      expect(saveResult.success, isTrue);
      expect(saveResult.filename, isNotNull);
      expect(saveResult.size, isPositive);
      expect(saveResult.hash, isNotNull);

      // Load
      final loadResult = await persistence.loadState(saveResult.filename!);
      expect(loadResult.success, isTrue);
      expect(loadResult.state, isNotNull);
      expect(loadResult.state!.isValid, isTrue);

      // Verify integrity
      expect(loadResult.state!.stateId, original.stateId);
      expect(loadResult.state!.metadata.compositionId, 'save-load-test');
      expect(loadResult.size, saveResult.size);
      expect(loadResult.hash, saveResult.hash);
    });

    test('List saved states', () async {
      // Save multiple states
      final states = [
        SidewalkState.initial(
          compositionId: 'composition-1',
          totalDuration: const Duration(minutes: 3),
        ),
        SidewalkState.initial(
          compositionId: 'composition-2',
          totalDuration: const Duration(minutes: 4),
        ),
        SidewalkState.initial(
          compositionId: 'composition-3',
          totalDuration: const Duration(minutes: 2),
        ),
      ];

      for (final state in states) {
        await persistence.saveState(state);
      }

      // List states
      final savedStates = await persistence.listStates();
      expect(savedStates.length, 3);

      // Verify sorting (newest first)
      expect(savedStates[0].lastModified.isAfter(savedStates[1].lastModified), isTrue);

      // Verify metadata
      final compositionIds = savedStates.map((s) => s.compositionId).toSet();
      expect(compositionIds, containsAll(['composition-1', 'composition-2', 'composition-3']));
    });

    test('Delete state', () async {
      final state = SidewalkState.initial(
        compositionId: 'delete-test',
        totalDuration: const Duration(minutes: 1),
      );

      // Save
      final saveResult = await persistence.saveState(state);
      expect(saveResult.success, isTrue);

      // Verify it exists
      var listed = await persistence.listStates();
      expect(listed.length, 1);

      // Delete
      final deleted = await persistence.deleteState(saveResult.filename!);
      expect(deleted, isTrue);

      // Verify it's gone
      listed = await persistence.listStates();
      expect(listed.length, 0);
    });

    test('Export and import state', () async {
      final original = SidewalkState.initial(
        compositionId: 'export-import-test',
        totalDuration: const Duration(minutes: 3),
        tempo: const Tempo(bpm: 128),
      );

      // Export
      final exportPath = path.join(tempDir.path, 'exported.state');
      final exportResult = await persistence.exportState(original, exportPath);
      expect(exportResult.success, isTrue);

      // Import
      final importResult = await persistence.importState(exportPath);
      expect(importResult.success, isTrue);
      expect(importResult.state, isNotNull);
      expect(importResult.state!.isValid, isTrue);

      // Verify integrity
      expect(importResult.state!.stateId, original.stateId);
      expect(importResult.state!.metadata.compositionId, 'export-import-test');
    });

    test('Backup creation', () async {
      final state = SidewalkState.initial(
        compositionId: 'backup-test',
        totalDuration: const Duration(minutes: 2),
      );

      // Save (should create backup)
      final saveResult = await persistence.saveState(state);
      expect(saveResult.success, isTrue);

      // Check backup directory
      final backupDir = Directory(path.join(tempDir.path, 'backups'));
      expect(await backupDir.exists(), isTrue);

      // List backups
      final backups = await backupDir.list().toList();
      expect(backups.length, greaterThan(0));
    });
  });

  group('StateHistoryManager - Undo/Redo', () {
    late StateHistoryManager history;

    setUp(() {
      history = StateHistoryManager(
        maxHistorySize: 50,
        persistHistory: false,
      );
    });

    tearDown(() {
      history.dispose();
    });

    test('Add states and navigate history', () {
      // Add states
      final state1 = SidewalkState.initial(
        compositionId: 'history-test',
        totalDuration: const Duration(minutes: 2),
      );

      final state2 = state1.copyWith(
        lastModified: DateTime.now(),
        musicalRealization: MusicalRealizationState(
          scaleRoot: 'D',
          scaleType: 'major',
          harmonicSeries: 1,
          activePitchClasses: [],
          rhythmicParameters: {},
          melodicParameters: {},
        ),
      );

      final state3 = state2.copyWith(
        lastModified: DateTime.now(),
        musicalRealization: MusicalRealizationState(
          scaleRoot: 'E',
          scaleType: 'major',
          harmonicSeries: 1,
          activePitchClasses: [],
          rhythmicParameters: {},
          melodicParameters: {},
        ),
      );

      history.addState(state1, description: 'Initial');
      history.addState(state2, description: 'Changed to D');
      history.addState(state3, description: 'Changed to E');

      // Verify current state
      expect(history.currentState?.musicalRealization.scaleRoot, 'E');
      expect(history.canUndo, isTrue);
      expect(history.canRedo, isFalse);

      // Undo
      final undoState = history.undo();
      expect(undoState?.musicalRealization.scaleRoot, 'D');
      expect(history.canUndo, isTrue);
      expect(history.canRedo, isTrue);

      // Redo
      final redoState = history.redo();
      expect(redoState?.musicalRealization.scaleRoot, 'E');
      expect(history.canRedo, isFalse);
    });

    test('Branch creation', () {
      final mainState = SidewalkState.initial(
        compositionId: 'branch-test',
        totalDuration: const Duration(minutes: 2),
      );

      history.addState(mainState);

      // Create branch
      final branchName = history.createBranch('experiment', description: 'Experimental branch');
      expect(branchName, 'experiment');
      expect(history.branches, contains('experiment'));

      // Switch to branch
      final switched = history.switchBranch('experiment');
      expect(switched, isTrue);
      expect(history.currentBranch, 'experiment');

      // Add state to new branch
      final branchState = mainState.copyWith(
        lastModified: DateTime.now(),
        musicalRealization: MusicalRealizationState(
          scaleRoot: 'F#',
          scaleType: 'minor',
          harmonicSeries: 2,
          activePitchClasses: [],
          rhythmicParameters: {},
          melodicParameters: {},
        ),
      );

      history.addState(branchState);
      expect(history.currentState?.musicalRealization.scaleRoot, 'F#');

      // Switch back to main
      history.switchBranch('main');
      expect(history.currentState?.musicalRealization.scaleRoot, 'C');
    });

    test('State diff calculation', () {
      final state1 = SidewalkState.initial(
        compositionId: 'diff-test',
        totalDuration: const Duration(minutes: 2),
      );

      final state2 = state1.copyWith(
        musicalRealization: MusicalRealizationState(
          scaleRoot: 'G',
          scaleType: 'major',
          harmonicSeries: 1,
          activePitchClasses: [],
          rhythmicParameters: {},
          melodicParameters: {},
        ),
      );

      final diff = StateHistoryManager.diff(state1, state2);

      expect(diff.isEmpty, isFalse);
      expect(diff.changeCount, 1);
      expect(diff.changes.containsKey('musicalRealization'), isTrue);
    });

    test('History compression', () {
      final manager = StateHistoryManager(maxHistorySize: 10);

      // Add many states
      for (int i = 0; i < 50; i++) {
        final state = SidewalkState.initial(
          compositionId: 'compress-test-$i',
          totalDuration: const Duration(minutes: 1),
        );
        manager.addState(state);
      }

      // Verify compression occurred
      final history = manager.getHistory();
      expect(history.length, lessThan(50));
      expect(history.length, lessThanOrEqualTo(10));
    });

    test('History export/import', () {
      final state = SidewalkState.initial(
        compositionId: 'export-test',
        totalDuration: const Duration(minutes: 2),
      );

      history.addState(state);

      // Export
      final exported = history.exportHistory();
      expect(exported, isNotEmpty);

      // Import into new manager
      final newManager = StateHistoryManager();
      final imported = newManager.importHistory(exported);
      expect(imported, isTrue);

      // Verify
      expect(newManager.getHistory().length, 1);

      newManager.dispose();
    });
  });
}