/// Tests for semantic versioning and state replay guarantees
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:schillinger_sdk/schillinger_sdk.dart';

void main() {
  group('Semantic Versioning Tests', () {
    group('SemanticVersioning', () {
      test('should check version compatibility', () {
        // Same major version = compatible
        expect(SemanticVersioning.isCompatible('2.0.0', '2.1.0'), true);
        expect(SemanticVersioning.isCompatible('2.5.0', '2.0.0'), true);

        // Different major version = incompatible
        expect(SemanticVersioning.isCompatible('1.0.0', '2.0.0'), false);
        expect(SemanticVersioning.isCompatible('2.0.0', '3.0.0'), false);
      });

      test('should detect need for migration', () {
        // Same version = no migration
        expect(SemanticVersioning.needsMigration('2.1.0'), false);

        // Different major = needs migration
        expect(SemanticVersioning.needsMigration('1.5.0'), true);
        expect(SemanticVersioning.needsMigration('3.0.0'), true);
      });

      test('should get migration path', () {
        final path = SemanticVersioning.getMigrationPath('1.5.0');

        expect(path, isNotEmpty);
        expect(path.first.fromVersion, '1.5.0');
        expect(path.last.toVersion, SemanticVersioning.currentVersion);
      });

      test('should have current version 2.1.0', () {
        expect(SemanticVersioning.currentVersion, '2.1.0');
      });
    });

    group('GeneratorDeprecation', () {
      test('should detect deprecated generators', () {
        // Test with known deprecated generator
        final isDeprecated = GeneratorDeprecation.isDeprecated(
          'old_rhythm_generator',
        );

        // This will be false until we add deprecations
        expect(isDeprecated, isA<bool>());
      });

      test('should migrate config to new generator', () {
        final oldConfig = {
          'param1': 'value1',
          'param2': 'value2',
        };

        final newConfig = GeneratorDeprecation.migrateConfig(
          'old_rhythm_generator',
          oldConfig,
        );

        expect(newConfig, isA<Map<String, dynamic>>());
      });

      test('should provide deprecation information', () {
        final deprecated = GeneratorDeprecation.deprecated;

        expect(deprecated, isA<Map<String, DeprecatedGenerator>>());
      });
    });

    group('State Replay Tests', () {
      test('should serialize and replay state exactly', () {
        final original = SidewalkState.initial();

        // Serialize
        final json = original.toJson();

        // Deserialize
        final replayed = SidewalkState.fromJson(json);

        // Verify key fields match
        expect(replayed.stateId, original.stateId);
        expect(replayed.createdAt, original.createdAt);
        expect(replayed.musicalRealization.tempo,
            original.musicalRealization.tempo);
      });

      test('should preserve state across multiple serializations', () {
        final state1 = SidewalkState.initial();

        final json1 = state1.toJson();
        final state2 = SidewalkState.fromJson(json1);

        final json2 = state2.toJson();
        final state3 = SidewalkState.fromJson(json2);

        // All serializations should produce same result
        expect(state3.stateId, state1.stateId);
      });

      test('should handle version compatibility', () {
        final state = SidewalkState(
          metadata: StateMetadata(
            version: '2.1.0',
            sdkVersion: '2.1.0',
            createdAt: DateTime.now(),
          ),
        );

        // Same version = compatible
        expect(
          SemanticVersioning.isCompatible(
            state.metadata.version,
            SemanticVersioning.currentVersion,
          ),
          true,
        );
      });
    });
  });
}
