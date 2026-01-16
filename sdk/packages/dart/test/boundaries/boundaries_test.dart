/// Comprehensive tests for all 12 boundary components
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:schillinger_sdk/schillinger_sdk.dart';

void main() {
  group('Boundary System Tests', () {
    group('EnergyBudgetV1', () {
      test('should consume energy for transformations', () {
        final budget = EnergyBudgetV1(
          max: 100.0,
          available: 100.0,
          cost: EnergyCost(transform: 10.0, modulate: 20.0),
          recoverPerFrame: 1.0,
        );

        expect(budget.canAfford('transform'), true);
        budget.consume('transform');
        expect(budget.available, 90.0);
      });

      test('should defer actions when energy insufficient', () {
        final budget = EnergyBudgetV1(
          max: 100.0,
          available: 5.0,
          cost: EnergyCost(transform: 10.0, modulate: 20.0),
          recoverPerFrame: 1.0,
        );

        expect(budget.canAfford('transform'), false);
        expect(budget.consume('transform'), false);
      });

      test('should recover energy over time', () {
        final budget = EnergyBudgetV1(
          max: 100.0,
          available: 50.0,
          cost: EnergyCost(transform: 10.0, modulate: 20.0),
          recoverPerFrame: 5.0,
        );

        budget.recover();
        expect(budget.available, 55.0);

        budget.recover();
        expect(budget.available, 60.0);
      });

      test('should clamp recovery to max', () {
        final budget = EnergyBudgetV1(
          max: 100.0,
          available: 95.0,
          cost: EnergyCost(transform: 10.0, modulate: 20.0),
          recoverPerFrame: 10.0,
        );

        budget.recover();
        expect(budget.available, 100.0); // Clamped to max
      });

      test('should serialize and deserialize', () {
        final budget = EnergyBudgetV1(
          max: 100.0,
          available: 75.0,
          cost: EnergyCost(transform: 10.0, modulate: 20.0),
          recoverPerFrame: 5.0,
        );

        final json = budget.toJson();
        final restored = EnergyBudgetV1.fromJson(json);

        expect(restored.max, budget.max);
        expect(restored.available, budget.available);
        expect(restored.recoverPerFrame, budget.recoverPerFrame);
      });
    });

    group('SilenceRegionV1', () {
      test('should contain ticks within range', () {
        final region = SilenceRegionV1(
          startTick: 10,
          endTick: 20,
          scope: SilenceScope.local,
          protected: true,
        );

        expect(region.contains(5), false);
        expect(region.contains(10), true);
        expect(region.contains(15), true);
        expect(region.contains(20), true);
        expect(region.contains(25), false);
      });

      test('should allow protected silence checks', () {
        final protected = SilenceRegionV1(
          startTick: 10,
          endTick: 20,
          scope: SilenceScope.global,
          protected: true,
        );

        final unprotected = SilenceRegionV1(
          startTick: 30,
          endTick: 40,
          scope: SilenceScope.local,
          protected: false,
        );

        expect(protected.isProtected(), true);
        expect(unprotected.isProtected(), false);
      });

      test('should manage silence regions', () {
        final manager = SilenceManager();

        final region = SilenceRegionV1(
          startTick: 10,
          endTick: 20,
          scope: SilenceScope.global,
          protected: true,
        );

        final withRegion = manager.addRegion(region);

        expect(withRegion.isInSilence(15), true);
        expect(withRegion.isInSilence(25), false);
        expect(withRegion.isProtectedSilence(15), true);
      });

      test('should serialize and deserialize', () {
        final region = SilenceRegionV1(
          startTick: 10,
          endTick: 20,
          scope: SilenceScope.global,
          protected: true,
        );

        final json = region.toJson();
        final restored = SilenceRegionV1.fromJson(json);

        expect(restored.startTick, region.startTick);
        expect(restored.endTick, region.endTick);
        expect(restored.scope, region.scope);
        expect(restored.protected, region.protected);
      });
    });

    group('ConstraintResolver', () {
      test('should allow higher priority requests', () {
        final result = ConstraintResolver.resolve(
          requested: ConstraintPriority.determinism,
          existing: ConstraintPriority.playRequests,
          requestContext: 'Test',
          existingContext: 'Test',
        );

        expect(result.allowed, true);
        expect(result.winningPriority, ConstraintPriority.determinism);
      });

      test('should deny lower priority requests', () {
        final result = ConstraintResolver.resolve(
          requested: ConstraintPriority.playRequests,
          existing: ConstraintPriority.determinism,
          requestContext: 'Test',
          existingContext: 'Test',
        );

        expect(result.allowed, false);
        expect(result.winningPriority, ConstraintPriority.determinism);
        expect(result.conflictDetails, isNotEmpty);
      });

      test('should deny equal priority (first come first served)', () {
        final result = ConstraintResolver.resolve(
          requested: ConstraintPriority.invariants,
          existing: ConstraintPriority.invariants,
          requestContext: 'New request',
          existingContext: 'Existing',
        );

        expect(result.allowed, false);
      });

      test('should check against active constraints', () {
        final result = ConstraintResolver.checkAllowed(
          requestedAction: ConstraintPriority.playRequests,
          activeConstraints: [
            ConstraintPriority.determinism,
            ConstraintPriority.invariants,
          ],
        );

        expect(result.allowed, false);
      });
    });

    group('ExplainabilityManager', () {
      test('should not log when disabled', () {
        final manager = ExplainabilityManager(enabled: false);

        manager.log(
          atTick: 100,
          cause: 'Test cause',
          summary: 'Test summary',
        );

        expect(manager.getBuffer().isEmpty, true);
      });

      test('should log when enabled', () {
        final manager = ExplainabilityManager(enabled: true);

        manager.log(
          atTick: 100,
          cause: 'Test cause',
          summary: 'Test summary',
        );

        expect(manager.getBuffer().length, 1);
        expect(manager.getBuffer().first.atTick, 100);
      });

      test('should clear buffer', () {
        final manager = ExplainabilityManager(enabled: true);

        manager.log(atTick: 100, cause: 'Test', summary: 'Test');
        manager.log(atTick: 200, cause: 'Test', summary: 'Test');

        expect(manager.getBuffer().length, 2);

        final cleared = manager.clear();
        expect(cleared.getBuffer().isEmpty, true);
      });

      test('should serialize and deserialize', () {
        final manager = ExplainabilityManager(
          enabled: true,
          buffer: [],
        );

        manager.log(atTick: 100, cause: 'Test cause', summary: 'Test summary');

        final json = manager.toJson();
        final restored = ExplainabilityManager.fromJson(json);

        expect(restored.enabled, manager.enabled);
        expect(restored.getBuffer().length, manager.getBuffer().length);
      });
    });

    group('PlaySurfaceV1', () {
      test('should allow allowlisted parameters', () {
        final surface = PlaySurfaceV1(
          allowedParameters: ['param1', 'param2'],
          mode: PlaySurfaceMode.strict,
        );

        final result = surface.requestChange('param1', 'value');

        expect(result.allowed, true);
        expect(result.action, PlaySurfaceAction.allow);
      });

      test('should reject non-allowlisted in strict mode', () {
        final surface = PlaySurfaceV1(
          allowedParameters: ['param1', 'param2'],
          mode: PlaySurfaceMode.strict,
        );

        final result = surface.requestChange('forbidden', 'value');

        expect(result.allowed, false);
        expect(result.action, PlaySurfaceAction.reject);
      });

      test('should warn in warn mode', () {
        final surface = PlaySurfaceV1(
          allowedParameters: ['param1', 'param2'],
          mode: PlaySurfaceMode.warn,
        );

        final result = surface.requestChange('forbidden', 'value');

        expect(result.allowed, false);
        expect(result.action, PlaySurfaceAction.warn);
      });
    });

    group('TemporalAuthorityV1', () {
      test('should allow scrub when enabled', () {
        final authority = TemporalAuthorityV1(canScrub: true);

        final result = authority.requestScrub(Duration(seconds: 10));

        expect(result.allowed, true);
        expect(result.position, Duration(seconds: 10));
      });

      test('should deny scrub when disabled', () {
        final authority = TemporalAuthorityV1(canScrub: false);

        final result = authority.requestScrub(Duration(seconds: 10));

        expect(result.allowed, false);
        expect(result.reason, isNotNull);
      });

      test('should allow fork when enabled', () {
        final authority = TemporalAuthorityV1(canFork: true);

        final result = authority.requestFork(Duration(seconds: 10));

        expect(result.allowed, true);
      });

      test('should always deny causality override', () {
        final authority = TemporalAuthorityV1(
          canScrub: true,
          canFork: true,
          canOverrideCausality: false,
        );

        expect(authority.canOverrideCausality, false);
      });
    });

    group('CausalityBoundary', () {
      test('should throw when reading future', () {
        expect(
          () => CausalityBoundary.validateReadFrame(100, 150),
          throwsA(isA<CausalityViolation>()),
        );
      });

      test('should allow reading present/past', () {
        expect(
          () => CausalityBoundary.validateReadFrame(100, 50),
          returnsNormally,
        );
      });

      test('should throw when modifying past', () {
        expect(
          () => CausalityBoundary.validateModifyFrame(100, 50),
          throwsA(isA<CausalityViolation>()),
        );
      });

      test('should allow modifying present/future', () {
        expect(
          () => CausalityBoundary.validateModifyFrame(100, 150),
          returnsNormally,
        );
      });

      test('should throw on invalid tick', () {
        expect(
          () => CausalityBoundary.validateTemporalIntegrity(-1),
          throwsA(isA<CausalityViolation>()),
        );
      });
    });

    group('AuthorityGradient', () {
      test('should allow higher authority requests', () {
        final request = AuthorityRequest(
          requester: AuthorityLevel.system,
          target: AuthorityLevel.play,
          action: 'override',
        );

        expect(request.isAllowed(), true);
      });

      test('should deny lower authority requests', () {
        final request = AuthorityRequest(
          requester: AuthorityLevel.play,
          target: AuthorityLevel.system,
          action: 'override',
        );

        expect(request.isAllowed(), false);
      });

      test('should create proper results', () {
        final allowed = AuthorityRequest(
          requester: AuthorityLevel.system,
          target: AuthorityLevel.play,
          action: 'test',
        ).toResult();

        expect(allowed.allowed, true);

        final denied = AuthorityRequest(
          requester: AuthorityLevel.play,
          target: AuthorityLevel.system,
          action: 'test',
        ).toResult();

        expect(denied.allowed, false);
      });
    });

    group('MutationRateV1', () {
      test('should allow mutations within limit', () {
        final rate = MutationRateV1(
          maxPerSecond: 10,
          maxPerPhrase: 20,
        );

        expect(rate.canMutate(), true);
        expect(rate.mutate(), true);
        expect(rate.currentPerSecond, 1);
      });

      test('should deny mutations exceeding limit', () {
        final rate = MutationRateV1(
          maxPerSecond: 5,
          maxPerPhrase: 10,
          currentPerSecond: 5,
        );

        expect(rate.canMutate(), false);
        expect(rate.mutate(), false);
      });

      test('should reset per-second counter', () {
        final rate = MutationRateV1(
          maxPerSecond: 5,
          maxPerPhrase: 10,
          currentPerSecond: 5,
          lastSecondReset: DateTime.now().subtract(Duration(seconds: 2)),
        );

        expect(rate.canMutate(), true); // Should reset first
      });

      test('should reset phrase counter', () {
        final rate = MutationRateV1(
          maxPerSecond: 5,
          maxPerPhrase: 10,
          currentPerPhrase: 10,
        );

        rate.resetPhrase();
        expect(rate.currentPerPhrase, 0);
      });
    });

    group('AccessRequest', () {
      test('should validate observation access', () {
        final request = AccessRequest(
          mode: AccessMode.observe,
          action: 'read_state',
        );

        final result = request.validate();
        expect(result.allowed, true);
      });

      test('should deny observation with state change', () {
        final request = AccessRequest(
          mode: AccessMode.observe,
          action: 'modify',
          parameters: {'modifyValue': true},
        );

        final result = request.validate();
        expect(result.allowed, false);
      });

      test('should allow intervention', () {
        final request = AccessRequest(
          mode: AccessMode.intervene,
          action: 'update_parameter',
        );

        final result = request.validate();
        expect(result.allowed, true);
      });
    });

    group('SerializationBoundary', () {
      test('should reject ephemera serialization', () {
        final data = {
          'state': {'tempo': 120.0},
          'ephemera': {'tempBuffer': [1, 2, 3]},
        };

        final validation = SerializationBoundary.validate(data);
        expect(validation.valid, false);
        expect(validation.violations, contains('EPHEMERA should not be serialized'));
      });

      test('should require state in serialization', () {
        final data = {
          'metadata': {'version': '2.0.0'},
        };

        final validation = SerializationBoundary.validate(data);
        expect(validation.valid, false);
      });

      test('should filter data by scope', () {
        final data = {
          'state': {'tempo': 120.0},
          '_private': 'hidden',
          'metadata': {'version': '2.0.0'},
        };

        final filtered = SerializationBoundary.filterForSerialization(
          data,
          [SerializationScope.state, SerializationScope.metadata],
        );

        expect(filtered.containsKey('state'), true);
        expect(filtered.containsKey('_private'), false);
        expect(filtered.containsKey('metadata'), true);
      });
    });

    group('ExplanationV1', () {
      test('should validate structural causes', () {
        final valid = ExplanationV1(
          atTick: 100,
          cause: 'Invariant preservation required',
          summary: 'Maintained interval ratio across transformation',
        );

        expect(valid.isValid(), true);
      });

      test('should reject implementation details', () {
        final invalid = ExplanationV1(
          atTick: 100,
          cause: 'function in Transform.dart line 42',
          summary: 'Called private method',
        );

        expect(invalid.isValid(), false);
      });

      test('should add to boundary only if valid', () {
        final boundary = ExplanationBoundary();
        final valid = ExplanationV1(
          atTick: 100,
          cause: 'Structural requirement',
          summary: 'Maintained invariants',
        );

        final withValid = boundary.add(valid);
        expect(withValid.getAll().length, 1);

        expect(
          () => withValid.add(ExplanationV1(
            atTick: 200,
            cause: 'dart:memory error',
            summary: 'Null pointer',
          )),
          throwsArgumentError,
        );
      });
    });
  });
}
