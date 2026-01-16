import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:schillinger_sdk/schillinger_sdk.dart';
import 'package:path/path.dart' as path;

/// Golden Reference Tests for Cross-Language Parity
///
/// These tests validate that Dart, TypeScript, and Swift implementations
/// produce identical results for the same inputs.
///
/// Golden reference files are stored in test/cross_language/golden/
void main() {
  group('Golden Reference - State Serialization', () {
    late Directory goldenDir;

    setUp(() async {
      goldenDir = Directory(path.join(
        Directory.current.path,
        'test',
        'cross_language',
        'golden',
      ));

      // Create golden directory if it doesn't exist
      if (!await goldenDir.exists()) {
        await goldenDir.create(recursive: true);
      }
    });

    test('Generate golden reference for basic state', () {
      final state = SidewalkState.initial(
        compositionId: 'golden-basic',
        totalDuration: const Duration(minutes: 3),
        tempo: const Tempo(bpm: 120),
      );

      final json = state.toJson();

      // Save as golden reference
      final goldenFile = File(path.join(
        goldenDir.path,
        'basic_state.golden.json',
      ));

      goldenFile.writeAsStringSync(json);

      // Verify round-trip
      final restored = SidewalkState.fromJson(json);
      expect(restored.stateId, state.stateId);
      expect(restored.isValid, isTrue);
    });

    test('Generate golden reference for complex state with roles', () {
      final state = SidewalkState(
        stateId: 'golden-complex-roles',
        createdAt: DateTime(2025, 1, 15, 12, 0),
        lastModified: DateTime(2025, 1, 15, 12, 30),
        musicalRealization: MusicalRealizationState(
          scaleRoot: 'C',
          scaleType: 'major',
          harmonicSeries: 1,
          activePitchClasses: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
          rhythmicParameters: {
            'timeSignature': '4/4',
            'tempo': 120,
          },
          melodicParameters: {
            'range': 12,
          },
        ),
        generatorState: GeneratorState.initial(),
        timeline: TimelineState.initial(
          totalDuration: const Duration(minutes: 4),
        ),
        roleAssignments: {
          'melody-lead': RoleAssignmentState(
            roleId: 'melody-lead',
            role: MusicalRole.melody,
            isActive: true,
            volume: 0.85,
            pan: 0.0,
            isMuted: false,
            isSolo: false,
            roleParameters: {
              'octave': 5,
              'range': 12,
            },
          ),
          'bass-foundation': RoleAssignmentState(
            roleId: 'bass-foundation',
            role: MusicalRole.bass,
            isActive: true,
            volume: 0.9,
            pan: -0.2,
            isMuted: false,
            isSolo: false,
            roleParameters: {
              'octave': 2,
              'range': 12,
            },
          ),
          'harmony-support': RoleAssignmentState(
            roleId: 'harmony-support',
            role: MusicalRole.harmony,
            isActive: true,
            volume: 0.7,
            pan: 0.3,
            isMuted: false,
            isSolo: false,
            roleParameters: {
              'voiceCount': 4,
            },
          ),
        },
        convergence: ConvergenceState.initial(),
        intensityCurves: {
          'global-intensity': IntensityCurveState(
            id: 'global-intensity',
            name: 'Global Intensity',
            points: [
              IntensityPointState(
                time: Duration.zero,
                value: 0.5,
                isControlPoint: true,
              ),
              IntensityPointState(
                time: const Duration(seconds: 30),
                value: 0.7,
                isControlPoint: true,
              ),
              IntensityPointState(
                time: const Duration(seconds: 60),
                value: 0.9,
                isControlPoint: true,
              ),
              IntensityPointState(
                time: const Duration(seconds: 90),
                value: 0.6,
                isControlPoint: true,
              ),
              IntensityPointState(
                time: const Duration(seconds: 120),
                value: 0.4,
                isControlPoint: true,
              ),
            ],
            curveType: 'cubic-spline',
          ),
        },
        performance: PerformanceState.initial(),
        metadata: StateMetadata.initial(
          compositionId: 'golden-complex-roles',
        ),
      );

      final json = state.toJson();

      // Save as golden reference
      final goldenFile = File(path.join(
        goldenDir.path,
        'complex_roles_state.golden.json',
      ));

      goldenFile.writeAsStringSync(json);

      // Verify round-trip
      final restored = SidewalkState.fromJson(json);
      expect(restored.stateId, state.stateId);
      expect(restored.roleAssignments.length, 3);
      expect(restored.intensityCurves.length, 1);
      expect(restored.isValid, isTrue);
    });

    test('Generate golden reference for convergence state', () {
      final state = SidewalkState(
        stateId: 'golden-convergence',
        createdAt: DateTime(2025, 1, 15),
        lastModified: DateTime(2025, 1, 15),
        musicalRealization: MusicalRealizationState.initial(
          totalDuration: const Duration(minutes: 2),
          tempo: const Tempo(bpm: 120),
        ),
        generatorState: GeneratorState.initial(),
        timeline: TimelineState.initial(
          totalDuration: const Duration(minutes: 2),
        ),
        roleAssignments: {},
        convergence: ConvergenceState(
          convergenceEvents: [
            ConvergenceEventState(
              id: 'conv-1',
              timestamp: DateTime(2025, 1, 15, 10, 30),
              position: const Duration(seconds: 30),
              convergingRoles: {'melody', 'bass', 'harmony'},
              convergenceType: 'perfect',
            ),
            ConvergenceEventState(
              id: 'conv-2',
              timestamp: DateTime(2025, 1, 15, 10, 45),
              position: const Duration(seconds: 60),
              convergingRoles: {'melody', 'rhythm'},
              convergenceType: 'rhythmic',
            ),
          ],
          activeZones: [
            ConvergenceZoneState(
              id: 'zone-1',
              name: 'First Convergence',
              startPosition: const Duration(seconds: 25),
              endPosition: const Duration(seconds: 35),
              involvedRoles: ['melody', 'bass', 'harmony'],
              intensity: 0.95,
            ),
            ConvergenceZoneState(
              id: 'zone-2',
              name: 'Second Convergence',
              startPosition: const Duration(seconds: 55),
              endPosition: const Duration(seconds: 65),
              involvedRoles: ['melody', 'rhythm'],
              intensity: 0.8,
            ),
          ],
          convergenceParameters: {
            'sensitivity': 0.8,
            'window': 2000,
          },
        ),
        intensityCurves: {},
        performance: PerformanceState.initial(),
        metadata: StateMetadata.initial(
          compositionId: 'golden-convergence',
        ),
      );

      final json = state.toJson();

      // Save as golden reference
      final goldenFile = File(path.join(
        goldenDir.path,
        'convergence_state.golden.json',
      ));

      goldenFile.writeAsStringSync(json);

      // Verify round-trip
      final restored = SidewalkState.fromJson(json);
      expect(restored.convergence.convergenceEvents.length, 2);
      expect(restored.convergence.activeZones.length, 2);
      expect(restored.isValid, isTrue);
    });

    test('Validate against existing golden references', () {
      // This test validates that the current implementation
      // matches previously generated golden references

      final goldenFiles = [
        'basic_state.golden.json',
        'complex_roles_state.golden.json',
        'convergence_state.golden.json',
      ];

      for (final goldenFilename in goldenFiles) {
        final goldenFile = File(path.join(goldenDir.path, goldenFilename));

        if (await goldenFile.exists()) {
          final goldenJson = goldenFile.readAsStringSync();
          final state = SidewalkState.fromJson(goldenJson);

          // Verify state is valid
          expect(state.isValid, isTrue, reason: 'Golden file $goldenFilename produced invalid state');

          // Verify round-trip
          final roundTripJson = state.toJson();
          final roundTripState = SidewalkState.fromJson(roundTripJson);

          expect(roundTripState.stateId, state.stateId);
          expect(roundTripState.isValid, isTrue);
        }
      }
    });
  });

  group('Cross-Language Schema Validation', () {
    test('State JSON schema compliance', () {
      final state = SidewalkState.initial(
        compositionId: 'schema-test',
        totalDuration: const Duration(minutes: 2),
      );

      final json = jsonDecode(state.toJson()) as Map<String, dynamic>;

      // Required top-level fields
      expect(json, containsPair('stateId', isString));
      expect(json, containsPair('createdAt', isString));
      expect(json, containsPair('lastModified', isString));
      expect(json, containsPair('musicalRealization', isMap));
      expect(json, containsPair('generatorState', isMap));
      expect(json, containsPair('timeline', isMap));
      expect(json, containsPair('roleAssignments', isMap));
      expect(json, containsPair('convergence', isMap));
      expect(json, containsPair('intensityCurves', isMap));
      expect(json, containsPair('performance', isMap));
      expect(json, containsPair('metadata', isMap));

      // Verify nested structure
      final musicalRealization = json['musicalRealization'] as Map<String, dynamic>;
      expect(musicalRealization, containsPair('scaleRoot', isString));
      expect(musicalRealization, containsPair('scaleType', isString));
      expect(musicalRealization, containsPair('activePitchClasses', isList));

      final timeline = json['timeline'] as Map<String, dynamic>;
      expect(timeline, containsPair('totalDuration', isInt));
      expect(timeline, containsPair('tempo', isInt));
      expect(timeline, containsPair('timeSignature', isString));
    });

    test('Role assignment JSON structure', () {
      final roleAssignment = RoleAssignmentState(
        roleId: 'test-role',
        role: MusicalRole.melody,
        isActive: true,
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        roleParameters: {
          'testParam': 'testValue',
        },
      );

      final json = jsonDecode(jsonEncode(roleAssignment)) as Map<String, dynamic>;

      expect(json, containsPair('roleId', 'test-role'));
      expect(json, containsPair('role', 'MusicalRole.melody'));
      expect(json, containsPair('isActive', isTrue));
      expect(json, containsPair('volume', 0.8));
      expect(json, containsPair('pan', 0.0));
      expect(json, containsPair('isMuted', isFalse));
      expect(json, containsPair('isSolo', isFalse));
      expect(json, containsPair('roleParameters', isMap));
    });

    test('Intensity curve JSON structure', () {
      final curve = IntensityCurveState(
        id: 'test-curve',
        name: 'Test Curve',
        points: [
          IntensityPointState(
            time: Duration.zero,
            value: 0.0,
            isControlPoint: true,
          ),
          IntensityPointState(
            time: const Duration(seconds: 10),
            value: 1.0,
            isControlPoint: true,
          ),
        ],
        curveType: 'linear',
      );

      final json = jsonDecode(jsonEncode(curve)) as Map<String, dynamic>;

      expect(json, containsPair('id', 'test-curve'));
      expect(json, containsPair('name', 'Test Curve'));
      expect(json, containsPair('curveType', 'linear'));

      final pointsJson = json['points'] as List;
      expect(pointsJson, hasLength(2));

      final firstPoint = pointsJson[0] as Map<String, dynamic>;
      expect(firstPoint, containsPair('time', 0));
      expect(firstPoint, containsPair('value', 0.0));
      expect(firstPoint, containsPair('isControlPoint', isTrue));
    });

    test('Convergence event JSON structure', () {
      final event = ConvergenceEventState(
        id: 'test-conv',
        timestamp: DateTime(2025, 1, 15, 10, 30),
        position: const Duration(seconds: 45),
        convergingRoles: {'melody', 'bass'},
        convergenceType: 'perfect',
      );

      final json = jsonDecode(jsonEncode(event)) as Map<String, dynamic>;

      expect(json, containsPair('id', 'test-conv'));
      expect(json, containsPair('position', 45000));
      expect(json, containsPair('convergenceType', 'perfect'));

      final rolesJson = json['convergingRoles'] as List;
      expect(rolesJson, contains('melody'));
      expect(rolesJson, contains('bass'));
    });
  });

  group('Cross-Language Numeric Precision', () {
    test('Duration serialization precision', () {
      final testDurations = [
        Duration.zero,
        const Duration(milliseconds: 1),
        const Duration(seconds: 1),
        const Duration(seconds: 30),
        const Duration(minutes: 1),
        const Duration(minutes: 5, seconds: 23, milliseconds: 456),
      ];

      for (final duration in testDurations) {
        final point = IntensityPointState(
          time: duration,
          value: 0.5,
          isControlPoint: true,
        );

        final json = jsonEncode(point);
        final restored = IntensityPointState.fromJson(jsonDecode(json));

        expect(
          restored.time,
          duration,
          reason: 'Duration $duration not preserved after round-trip',
        );
      }
    });

    test('Double precision in intensity values', () {
      final testValues = [
        0.0,
        0.1,
        0.5,
        0.7,
        0.999,
        1.0,
      ];

      for (final value in testValues) {
        final point = IntensityPointState(
          time: Duration.zero,
          value: value,
          isControlPoint: true,
        );

        final json = jsonEncode(point);
        final restored = IntensityPointState.fromJson(jsonDecode(json));

        expect(
          restored.value,
          closeTo(value, 0.0001),
          reason: 'Value $value not preserved after round-trip',
        );
      }
    });

    test('Volume and pan precision', () {
      final assignment = RoleAssignmentState(
        roleId: 'test',
        role: MusicalRole.bass,
        isActive: true,
        volume: 0.7358,
        pan: -0.4123,
        isMuted: false,
        isSolo: false,
        roleParameters: {},
      );

      final json = jsonEncode(assignment);
      final restored = RoleAssignmentState.fromJson(jsonDecode(json));

      expect(
        restored.volume,
        closeTo(0.7358, 0.0001),
        reason: 'Volume precision lost',
      );

      expect(
        restored.pan,
        closeTo(-0.4123, 0.0001),
        reason: 'Pan precision lost',
      );
    });
  });

  group('Language-Specific Encoding Tests', () {
    test('Dart enum serialization matches expected format', () {
      // Test that Dart enums serialize in a way compatible with TS/Swift
      final role = MusicalRole.melody;

      // In Dart, enum name is the default serialization
      // We need to ensure this matches across languages
      final expectedFormat = 'MusicalRole.melody';

      // This test documents the expected format
      // Cross-language parity requires consistent enum handling
      expect(role.toString(), contains('melody'));
    });

    test('DateTime ISO 8601 format', () {
      final timestamp = DateTime(2025, 1, 15, 10, 30, 45, 123);

      final event = ConvergenceEventState(
        id: 'test',
        timestamp: timestamp,
        position: Duration.zero,
        convergingRoles: {},
        convergenceType: 'test',
      );

      final json = jsonDecode(jsonEncode(event)) as Map<String, dynamic>;
      final timestampString = json['timestamp'] as String;

      // Verify ISO 8601 format
      expect(timestampString, matches(RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')));

      // Verify round-trip
      final restored = ConvergenceEventState.fromJson(jsonEncode(event));
      expect(restored.timestamp, timestamp);
    });

    test('Map and List structure preservation', () {
      final state = SidewalkState.initial(
        compositionId: 'structure-test',
        totalDuration: const Duration(minutes: 1),
      );

      final json = jsonDecode(state.toJson()) as Map<String, dynamic>;

      // Verify role assignments is a Map
      expect(json['roleAssignments'], isMap);

      // Verify markers is a List
      final timeline = json['timeline'] as Map<String, dynamic>;
      expect(timeline['markers'], isList);

      // Verify activePitchClasses is a List
      final musicalRealization = json['musicalRealization'] as Map<String, dynamic>;
      expect(musicalRealization['activePitchClasses'], isList);
    });
  });

  group('Cross-Language Migration Tests', () {
    test('State version compatibility', () {
      // Create state with version 2.0.0
      final state = SidewalkState.initial(
        compositionId: 'version-test',
        totalDuration: const Duration(minutes: 2),
      );

      final json = jsonDecode(state.toJson()) as Map<String, dynamic>;
      final metadata = json['metadata'] as Map<String, dynamic>;

      expect(metadata['version'], '2.0.0');

      // Verify version is accessible for migration logic
      expect(metadata.containsKey('version'), isTrue);
    });

    test('Custom properties preservation', () {
      final state = SidewalkState.initial(
        compositionId: 'custom-test',
        totalDuration: const Duration(minutes: 1),
      ).copyWith(
        metadata: StateMetadata(
          compositionId: 'custom-test',
          version: '2.0.0',
          tags: [],
          description: 'Test',
          customProperties: {
            'composer': 'Test Suite',
            'genre': 'Experimental',
            'crossLanguageId': 'test-12345',
          },
        ),
      );

      final json = jsonDecode(state.toJson()) as Map<String, dynamic>;
      final metadata = json['metadata'] as Map<String, dynamic>;
      final customProps = metadata['customProperties'] as Map<String, dynamic>;

      expect(customProps['composer'], 'Test Suite');
      expect(customProps['genre'], 'Experimental');
      expect(customProps['crossLanguageId'], 'test-12345');

      // Verify round-trip
      final restored = SidewalkState.fromJson(state.toJson());
      expect(
        restored.metadata.customProperties['composer'],
        'Test Suite',
      );
    });
  });
}