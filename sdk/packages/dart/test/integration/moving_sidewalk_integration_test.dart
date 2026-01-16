import 'dart:async';
import 'package:test/test.dart';
import 'package:schillinger_sdk/schillinger_sdk.dart';

void main() {
  group('Moving Sidewalk Integration Tests', () {
    test('should create and run basic Moving Sidewalk', () async {
      // Create intensity field with some control points
      final intensityField = IntensityField.builder()
          .addPoint(MusicalTime.fromSeconds(0), 0.2)
          .addPoint(MusicalTime.fromSeconds(10), 0.5)
          .addPoint(MusicalTime.fromSeconds(20), 0.8)
          .addPoint(MusicalTime.fromSeconds(30), 1.0)
          .withInterpolation(InterpolationType.cubic)
          .build();

      // Create coincidence field with convergence points
      final coincidenceField = CoincidenceField.builder()
          .addConvergencePoint(
            time: MusicalTime.fromSeconds(30),
            type: ConvergenceType.cadence,
            strength: 0.8,
            participatingRoles: [MusicalRole.bass, MusicalRole.harmony],
          )
          .build();

      // Create basic rhythm generator
      final rhythmGenerator = RhythmGenerator(
        id: 'rhythm-gen-1',
        parameters: {
          'period': 8,
          'primaryAccents': [0, 3],
          'complexity': 0.6,
        },
      );

      // Create Moving Sidewalk
      final sidewalk = MovingSidewalk(
        generators: {'rhythm': rhythmGenerator},
        fields: SidewalkFields(
          intensityField: intensityField,
          coincidenceField: coincidenceField,
        ),
        timeWindow: Duration(seconds: 10),
        frameInterval: Duration(milliseconds: 100),
        offlineMode: true,
        seed: 12345,
      );

      // Verify initial state
      expect(sidewalk.playbackState, equals(PlaybackState.stopped));
      expect(sidewalk.currentTime.seconds, equals(0.0));
      expect(sidewalk.isOfflineMode, isTrue);

      // Start playback
      await sidewalk.play();
      expect(sidewalk.playbackState, equals(PlaybackState.playing));

      // Wait for some frames to be generated
      await Future.delayed(Duration(milliseconds: 250));

      // Verify frames are being generated
      final frames = <RealizedFrame>[];
      final subscription = sidewalk.frames.listen(frames.add);

      await Future.delayed(Duration(milliseconds: 200));

      expect(frames.length, greaterThan(0));

      // Verify frame structure
      final firstFrame = frames.first;
      expect(firstFrame.time.seconds, greaterThanOrEqualTo(0.0));
      expect(firstFrame.coherenceScore, greaterThanOrEqualTo(0.0));
      expect(firstFrame.coherenceScore, lessThanOrEqualTo(1.0));
      expect(firstFrame.intensity.value, greaterThanOrEqualTo(0.0));
      expect(firstFrame.intensity.value, lessThanOrEqualTo(1.0));

      // Test intensity field integration
      final intensityAt15s = sidewalk.getIntensityAt(Duration(seconds: 15));
      expect(intensityAt15s, greaterThan(0.2)); // Between 0.2 and 0.5
      expect(intensityAt15s, lessThan(0.5));

      // Test convergence detection
      final convergenceEvents = <ConvergenceEvent>[];
      final convergenceSubscription = sidewalk.convergenceEvents.listen(convergenceEvents.add);

      // Advance time towards convergence point
      await sidewalk.seekTo(Duration(seconds: 25));
      await Future.delayed(Duration(milliseconds: 300));

      // Should detect approaching convergence
      expect(sidewalk.isApproachingConvergence, isTrue);

      await subscription.cancel();
      await convergenceSubscription.cancel();
      await sidewalk.pause();

      // Verify playback stopped
      expect(sidewalk.playbackState, equals(PlaybackState.paused));

      // Test performance metrics
      final metrics = sidewalk.getPerformanceMetrics();
      expect(metrics.frameCount, greaterThan(0));
      expect(metrics.averageFrameTime, greaterThan(0.0));
      expect(metrics.cacheHitRate, greaterThanOrEqualTo(0.0));

      sidewalk.dispose();
    });

    test('should handle role-specific streams correctly', () async {
      // Create a simple setup with one role
      final intensityField = IntensityField.builder()
          .addPoint(MusicalTime.fromSeconds(0), 0.5)
          .build();

      final coincidenceField = CoincidenceField.builder().build();

      final rhythmGenerator = RhythmGenerator(
        id: 'test-rhythm',
        parameters: {'period': 4},
      );

      final sidewalk = MovingSidewalk(
        generators: {'rhythm': rhythmGenerator},
        fields: SidewalkFields(
          intensityField: intensityField,
          coincidenceField: coincidenceField,
        ),
        offlineMode: true,
      );

      // Test role stream
      final rhythmLayers = <RoleLayer>[];
      final rhythmSubscription = sidewalk.roleStream(MusicalRole.rhythm)
          .listen(rhythmLayers.add);

      await sidewalk.play();
      await Future.delayed(Duration(milliseconds: 150));

      expect(rhythmLayers, isNotEmpty);
      expect(rhythmLayers.every((l) => l.role == MusicalRole.rhythm), isTrue);

      await rhythmSubscription.cancel();
      await sidewalk.pause();
      sidewalk.dispose();
    });

    test('should support forking and checkpointing', () async {
      final intensityField = IntensityField.builder()
          .addPoint(MusicalTime.fromSeconds(0), 0.3)
          .addPoint(MusicalTime.fromSeconds(10), 0.7)
          .build();

      final coincidenceField = CoincidenceField.builder().build();

      final rhythmGenerator = RhythmGenerator(
        id: 'fork-test',
        parameters: {'period': 6},
      );

      final sidewalk = MovingSidewalk(
        generators: {'rhythm': rhythmGenerator},
        fields: SidewalkFields(
          intensityField: intensityField,
          coincidenceField: coincidenceField,
        ),
        offlineMode: true,
        seed: 54321,
      );

      // Advance to a specific position
      await sidewalk.seekTo(Duration(seconds: 8));

      // Create checkpoint
      final checkpoint = sidewalk.createCheckpoint();
      expect(checkpoint.time.seconds, equals(8.0));

      // Fork sidewalk
      final forked = sidewalk.fork();
      expect(forked.currentTime.seconds, equals(8.0));
      expect(forked.currentState.seed, equals(sidewalk.currentState.seed));

      // Advance original
      await sidewalk.seekTo(Duration(seconds: 15));

      // Fork should remain at original position
      expect(forked.currentTime.seconds, equals(8.0));
      expect(sidewalk.currentTime.seconds, equals(15.0));

      // Restore checkpoint on original
      await sidewalk.restoreCheckpoint(checkpoint);
      expect(sidewalk.currentTime.seconds, equals(8.0));

      sidewalk.dispose();
      forked.dispose();
    });

    test('should handle empty and edge cases gracefully', () async {
      final intensityField = IntensityField.builder()
          .addPoint(MusicalTime.fromSeconds(0), 0.1)
          .build();

      final coincidenceField = CoincidenceField.builder().build();

      // Empty generators map
      final emptySidewalk = MovingSidewalk(
        generators: {},
        fields: SidewalkFields(
          intensityField: intensityField,
          coincidenceField: coincidenceField,
        ),
        offlineMode: true,
      );

      // Should handle empty generators without crashing
      await emptySidewalk.play();
      await Future.delayed(Duration(milliseconds: 100));

      final frames = <RealizedFrame>[];
      final subscription = emptySidewalk.frames.listen(frames.add);

      await Future.delayed(Duration(milliseconds: 100));

      // Should emit empty frames
      expect(frames.length, greaterThan(0));
      expect(frames.first.layers, isEmpty);
      expect(frames.first.coherenceScore, equals(0.0));

      await subscription.cancel();
      await emptySidewalk.pause();
      emptySidewalk.dispose();
    });
  });
}