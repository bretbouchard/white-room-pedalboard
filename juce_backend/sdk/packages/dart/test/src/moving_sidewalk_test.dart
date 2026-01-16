import 'dart:async';
import 'package:test/test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

import 'package:schillinger_sdk/schillinger_sdk.dart';

import 'moving_sidewalk_test.mocks.dart';

@GenerateMocks([
  BaseGenerator,
  IntensityField,
  CoincidenceField,
  OrchestraField,
  RoleLayer,
])
void main() {
  group('MovingSidewalk Reactive API', () {
    late MovingSidewalk sidewalk;
    late MockBaseGenerator mockRhythmGenerator;
    late MockBaseGenerator mockHarmonyGenerator;
    late MockIntensityField mockIntensityField;
    late MockCoincidenceField mockCoincidenceField;

    setUp(() {
      mockRhythmGenerator = MockBaseGenerator();
      mockHarmonyGenerator = MockBaseGenerator();
      mockIntensityField = MockIntensityField();
      mockCoincidenceField = MockCoincidenceField();

      // Setup mock behaviors
      when(mockIntensityField.getValueAt(any))
          .thenReturn(0.7);
      when(mockIntensityField.getGradientAt(any))
          .thenReturn(0.1);
      when(mockIntensityField.getCurvatureAt(any))
          .thenReturn(0.0);

      when(mockCoincidenceField.hasConvergenceAt(any, tolerance: anyNamed('tolerance')))
          .thenReturn(false);
      when(mockCoincidenceField.getStrengthAt(any))
          .thenReturn(0.3);
      when(mockCoincidenceField.getTimeToConvergence(any))
          .thenReturn(null);

      // Create MovingSidewalk with mocked dependencies
      sidewalk = MovingSidewalk(
        generators: {
          'rhythm': mockRhythmGenerator,
          'harmony': mockHarmonyGenerator,
        },
        fields: SidewalkFields(
          intensityField: mockIntensityField,
          coincidenceField: mockCoincidenceField,
        ),
        timeWindow: Duration(seconds: 10),
        frameInterval: Duration(milliseconds: 100),
        offlineMode: true,
        seed: 12345,
      );
    });

    tearDown(() {
      sidewalk.dispose();
    });

    test('should emit RealizedFrame every 100ms', () async {
      final frames = <RealizedFrame>[];
      final subscription = sidewalk.frames.listen(frames.add);

      // Setup mock generator to return valid layer
      final mockLayer = MockRoleLayer();
      when(mockLayer.role).thenReturn(MusicalRole.rhythm);
      when(mockRhythmGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockLayer);

      await sidewalk.play();
      await Future.delayed(Duration(milliseconds: 350));

      expect(frames.length, greaterThanOrEqualTo(3));
      expect(frames.first.time.inMilliseconds, equals(0));

      await subscription.cancel();
      await sidewalk.pause();
    });

    test('should provide stream of RealizedFrame with correct structure', () async {
      // Setup mock generator
      final mockLayer = MockRoleLayer();
      when(mockLayer.role).thenReturn(MusicalRole.bass);
      when(mockLayer.energy).thenReturn(0.7);
      when(mockLayer.emergence).thenReturn(0.3);
      when(mockRhythmGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockLayer);

      final frame = await sidewalk.frames.first;

      expect(frame, isA<RealizedFrame>());
      expect(frame.layers, isNotEmpty);
      expect(frame.layers.first.role, equals(MusicalRole.bass));
      expect(frame.intensity.value, equals(0.7));
      expect(frame.intensity.gradient, equals(0.1));
      expect(frame.coherenceScore, greaterThanOrEqualTo(0.0));
      expect(frame.coherenceScore, lessThanOrEqualTo(1.0));
    });

    test('should handle time scrubbing deterministically', () async {
      // Setup mock generator
      final mockLayer = MockRoleLayer();
      when(mockLayer.role).thenReturn(MusicalRole.melody);
      when(mockRhythmGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockLayer);

      // Seek to specific time
      await sidewalk.seekTo(Duration(seconds: 5));
      final frame1 = await sidewalk.frames.first;

      // Reset and seek again
      await sidewalk.reset();
      await sidewalk.seekTo(Duration(seconds: 5));
      final frame2 = await sidewalk.frames.first;

      // Should be identical (deterministic behavior)
      expect(frame1.layers.length, equals(frame2.layers.length));
      expect(frame1.intensity.value, equals(frame2.intensity.value));
      expect(frame1.coherenceScore, equals(frame2.coherenceScore));
      expect(frame1.time.seconds, equals(frame2.time.seconds));
    });

    test('should emit convergence events proactively', () async {
      final convergenceEvents = <ConvergenceEvent>[];
      final subscription = sidewalk.convergenceEvents.listen(convergenceEvents.add);

      // Setup convergence detection
      when(mockCoincidenceField.hasConvergenceAt(any, tolerance: anyNamed('tolerance')))
          .thenReturn(true);
      when(mockCoincidenceField.getStrengthAt(any))
          .thenReturn(0.8);
      when(mockCoincidenceField.getTimeToConvergence(any))
          .thenReturn(Duration(seconds: 2));

      // Setup mock generator
      final mockLayer = MockRoleLayer();
      when(mockLayer.role).thenReturn(MusicalRole.harmony);
      when(mockHarmonyGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockLayer);

      await sidewalk.play();
      await Future.delayed(Duration(milliseconds: 200));

      expect(convergenceEvents, isNotEmpty);
      expect(convergenceEvents.last.strength, greaterThan(0.7));

      await subscription.cancel();
      await sidewalk.pause();
    });

    test('should provide role-specific streams', () async {
      final bassLayers = <RoleLayer>[];
      final melodyLayers = <RoleLayer>[];

      // Setup mock generators
      final mockBassLayer = MockRoleLayer();
      final mockMelodyLayer = MockRoleLayer();

      when(mockBassLayer.role).thenReturn(MusicalRole.bass);
      when(mockMelodyLayer.role).thenReturn(MusicalRole.melody);

      when(mockRhythmGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockBassLayer);

      when(mockHarmonyGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockMelodyLayer);

      final bassSubscription = sidewalk.roleStream(MusicalRole.bass).listen(bassLayers.add);
      final melodySubscription = sidewalk.roleStream(MusicalRole.melody).listen(melodyLayers.add);

      await sidewalk.play();
      await Future.delayed(Duration(milliseconds: 200));

      expect(bassLayers, isNotEmpty);
      expect(melodyLayers, isNotEmpty);
      expect(bassLayers.every((l) => l.role == MusicalRole.bass), isTrue);
      expect(melodyLayers.every((l) => l.role == MusicalRole.melody), isTrue);

      await bassSubscription.cancel();
      await melodySubscription.cancel();
      await sidewalk.pause();
    });

    test('should handle playback state transitions correctly', () async {
      expect(sidewalk.playbackState, equals(PlaybackState.stopped));
      expect(sidewalk.currentTime.seconds, equals(0.0));

      await sidewalk.play();
      expect(sidewalk.playbackState, equals(PlaybackState.playing));

      await Future.delayed(Duration(milliseconds: 150));
      expect(sidewalk.currentTime.seconds, greaterThan(0.1));

      await sidewalk.pause();
      expect(sidewalk.playbackState, equals(PlaybackState.paused));

      await sidewalk.stop();
      expect(sidewalk.playbackState, equals(PlaybackState.stopped));
      expect(sidewalk.currentTime.seconds, equals(0.0));
    });

    test('should create and restore checkpoints', () async {
      // Setup mock generator
      final mockLayer = MockRoleLayer();
      when(mockLayer.role).thenReturn(MusicalRole.rhythm);
      when(mockRhythmGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockLayer);

      await sidewalk.play();
      await Future.delayed(Duration(milliseconds: 200));

      final checkpoint = sidewalk.createCheckpoint();
      expect(checkpoint.time.seconds, greaterThan(0.1));

      // Advance further
      await Future.delayed(Duration(milliseconds: 200));
      final laterTime = sidewalk.currentTime.seconds;

      // Restore checkpoint
      await sidewalk.restoreCheckpoint(checkpoint);
      expect(sidewalk.currentTime.seconds, lessThan(laterTime));

      await sidewalk.pause();
    });

    test('should fork sidewalk correctly', () async {
      // Setup mock generator
      final mockLayer = MockRoleLayer();
      when(mockLayer.role).thenReturn(MusicalRole.bass);
      when(mockRhythmGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockLayer);

      await sidewalk.seekTo(Duration(seconds: 10));

      final forked = sidewalk.fork();

      // Fork should be at same position
      expect(forked.currentTime.seconds, equals(10.0));
      expect(forked.currentState.seed, equals(sidewalk.currentState.seed));

      // But should be independent
      await sidewalk.seekTo(Duration(seconds: 20));
      expect(forked.currentTime.seconds, equals(10.0));
      expect(sidewalk.currentTime.seconds, equals(20.0));

      forked.dispose();
    });

    test('should operate in offline mode correctly', () async {
      expect(sidewalk.isOfflineMode, isTrue);

      // Should work without network
      await sidewalk.play();
      await Future.delayed(Duration(milliseconds: 100));

      final frame = await sidewalk.frames.first;
      expect(frame, isNotNull);
      expect(frame.layers, isA<List<RoleLayer>>());

      await sidewalk.pause();
    });

    test('should handle generator errors gracefully', () async {
      // Setup generator to throw error
      when(mockRhythmGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenThrow(Exception('Generator failed'));

      // Setup other generator to work normally
      final mockLayer = MockRoleLayer();
      when(mockLayer.role).thenReturn(MusicalRole.harmony);
      when(mockHarmonyGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockLayer);

      await sidewalk.play();
      await Future.delayed(Duration(milliseconds: 200));

      // Should still emit frames from working generators
      final frames = await sidewalk.frames.take(2).toList();
      expect(frames.length, equals(2));
      expect(frames.every((f) => f.layers.isNotEmpty), isTrue);

      await sidewalk.pause();
    });

    test('should provide accurate performance metrics', () async {
      // Setup mock generator
      final mockLayer = MockRoleLayer();
      when(mockLayer.role).thenReturn(MusicalRole.rhythm);
      when(mockRhythmGenerator.generateLayer(
        time: anyNamed('time'),
        intensity: anyNamed('intensity'),
        convergence: anyNamed('convergence'),
      )).thenAnswer((_) async => mockLayer);

      await sidewalk.play();
      await Future.delayed(Duration(milliseconds: 500));

      final metrics = sidewalk.getPerformanceMetrics();
      expect(metrics.frameCount, greaterThan(0));
      expect(metrics.averageFrameTime, greaterThan(0.0));
      expect(metrics.cacheHitRate, greaterThanOrEqualTo(0.0));
      expect(metrics.cacheHitRate, lessThanOrEqualTo(1.0));

      await sidewalk.pause();
    });
  });

  group('MovingSidewalk Builder Pattern', () {
    test('should create MovingSidewalk with builder pattern', () {
      final mockIntensityField = MockIntensityField();
      final mockCoincidenceField = MockCoincidenceField();
      final mockGenerator = MockBaseGenerator();

      final sidewalk = MovingSidewalk.builder()
          .addGenerator('test', mockGenerator)
          .intensityField(mockIntensityField)
          .coincidenceField(mockCoincidenceField)
          .timeWindow(Duration(seconds: 20))
          .frameInterval(Duration(milliseconds: 50))
          .offlineMode(true)
          .seed(54321)
          .build();

      expect(sidewalk.generators, contains('test'));
      expect(sidewalk.timeWindow, equals(Duration(seconds: 20)));
      expect(sidewalk.frameInterval, equals(Duration(milliseconds: 50)));
      expect(sidewalk.isOfflineMode, isTrue);
      expect(sidewalk.currentState.seed, equals(54321));

      sidewalk.dispose();
    });

    test('should throw error when required fields are missing', () {
      expect(
        () => MovingSidewalk.builder()
            .addGenerator('test', MockBaseGenerator())
            .build(),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}