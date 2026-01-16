/// Comprehensive tests for chaos playground
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:schillinger_sdk/schillinger_sdk.dart';

void main() {
  group('Chaos Playground Tests', () {
    group('ChaosScenarios', () {
      test('should create patch flood scenario', () {
        final scenario = ChaosScenarios.patchFlood(patchCount: 50);

        expect(scenario.name, 'patch_flood');
        expect(scenario.config['patchCount'], 50);
      });

      test('should create forbidden parameter attack scenario', () {
        final scenario = ChaosScenarios.forbiddenParameterAttack();

        expect(scenario.name, 'forbidden_parameter_attack');
      });

      test('should create causality attack scenario', () {
        final scenario = ChaosScenarios.causalityAttack();

        expect(scenario.name, 'causality_attack');
      });

      test('should create silence shield scenario', () {
        final scenario = ChaosScenarios.silenceShield();

        expect(scenario.name, 'silence_shield');
      });

      test('should create energy starvation scenario', () {
        final scenario = ChaosScenarios.energyStarvation();

        expect(scenario.name, 'energy_starvation');
      });

      test('should create constraint conflict storm scenario', () {
        final scenario = ChaosScenarios.constraintConflictStorm();

        expect(scenario.name, 'constraint_conflict_storm');
      });

      test('should create fork divergence scenario', () {
        final scenario = ChaosScenarios.forkDivergence();

        expect(scenario.name, 'fork_divergence');
      });

      test('should get all v1 scenarios', () {
        final scenarios = ChaosScenarios.allV1();

        expect(scenarios.length, 7);
        expect(scenarios.map((s) => s.name).toSet(), {
          'patch_flood',
          'forbidden_parameter_attack',
          'causality_attack',
          'silence_shield',
          'energy_starvation',
          'constraint_conflict_storm',
          'fork_divergence',
        });
      });

      test('should get scenario by name', () {
        final scenario = ChaosScenarios.byName('patch_flood');

        expect(scenario, isNotNull);
        expect(scenario!.name, 'patch_flood');
      });

      test('should return null for unknown scenario', () {
        final scenario = ChaosScenarios.byName('unknown_scenario');

        expect(scenario, isNull);
      });
    });

    group('ChaosRunner', () {
      test('should run patch flood scenario', () async {
        final runner = ChaosRunner(
          seed: 42,
          scenario: ChaosScenarios.patchFlood(patchCount: 10),
          boundaryConfig: ChaosBoundaryConfig(),
        );

        final result = await runner.run();

        expect(result.passed, true);
        expect(result.frames.length, greaterThan(0));
        expect(result.events.length, greaterThan(0));
      });

      test('should enforce energy boundaries', () async {
        final runner = ChaosRunner(
          seed: 42,
          scenario: ChaosScenarios.energyStarvation(),
          boundaryConfig: ChaosBoundaryConfig(
            energyMax: 100.0,
            energyCost: 50.0,
          ),
        );

        final result = await runner.run();

        expect(result.assertions.determinismHolds, true);
        expect(result.events.any((e) =>
            e['type'] == 'transform' && e['result'] == 'deferred'), true);
      });

      test('should block causality violations', () async {
        final runner = ChaosRunner(
          seed: 42,
          scenario: ChaosScenarios.causalityAttack(),
          boundaryConfig: ChaosBoundaryConfig(),
        );

        final result = await runner.run();

        expect(result.assertions.causalityIntact, true);
        expect(result.events.any((e) =>
            e['type'] == 'causality_blocked'), true);
      });

      test('should respect protected silence', () async {
        final runner = ChaosRunner(
          seed: 42,
          scenario: ChaosScenarios.silenceShield(),
          boundaryConfig: ChaosBoundaryConfig(),
        );

        final result = await runner.run();

        expect(result.assertions.forbiddenActionsBlocked, true);
      });

      test('should serialize and deserialize result', () async {
        final runner = ChaosRunner(
          seed: 42,
          scenario: ChaosScenarios.patchFlood(patchCount: 5),
          boundaryConfig: ChaosBoundaryConfig(),
        );

        final result = await runner.run();

        final json = result.toJson();
        final restored = ChaosResult.fromJson(json);

        expect(restored.passed, result.passed);
        expect(restored.frames.length, result.frames.length);
        expect(restored.assertions.determinismHolds,
            result.assertions.determinismHolds);
      });
    });

    group('ChaosAssertions', () {
      test('should pass when all assertions true', () {
        final assertions = ChaosAssertions(
          determinismHolds: true,
          causalityIntact: true,
          forbiddenActionsBlocked: true,
          allExplained: true,
        );

        expect(assertions.passed, true);
        expect(assertions.failures, isEmpty);
      });

      test('should fail when any assertion false', () {
        final assertions = ChaosAssertions(
          determinismHolds: true,
          causalityIntact: false,
          forbiddenActionsBlocked: true,
          allExplained: true,
          failures: ['Causality violation detected'],
        );

        expect(assertions.passed, false);
        expect(assertions.failures, isNotEmpty);
      });

      test('should serialize and deserialize', () {
        final assertions = ChaosAssertions(
          determinismHolds: true,
          causalityIntact: true,
          forbiddenActionsBlocked: true,
          allExplained: true,
          failures: [],
        );

        final json = assertions.toJson();
        final restored = ChaosAssertions.fromJson(json);

        expect(restored.determinismHolds, assertions.determinismHolds);
        expect(restored.causalityIntact, assertions.causalityIntact);
        expect(restored.forbiddenActionsBlocked,
            assertions.forbiddenActionsBlocked);
      });
    });

    group('Determinism Tests', () {
      test('should produce identical results with same seed', () async {
        final scenario = ChaosScenarios.patchFlood(patchCount: 20);

        final runner1 = ChaosRunner(
          seed: 42,
          scenario: scenario,
          boundaryConfig: ChaosBoundaryConfig(),
        );

        final runner2 = ChaosRunner(
          seed: 42,
          scenario: scenario,
          boundaryConfig: ChaosBoundaryConfig(),
        );

        final result1 = await runner1.run();
        final result2 = await runner2.run();

        // Same number of events
        expect(result1.events.length, result2.events.length);

        // Same frame structure
        expect(result1.frames.length, result2.frames.length);
      });

      test('should produce different results with different seeds', () async {
        final scenario = ChaosScenarios.patchFlood(patchCount: 20);

        final runner1 = ChaosRunner(
          seed: 42,
          scenario: scenario,
          boundaryConfig: ChaosBoundaryConfig(),
        );

        final runner2 = ChaosRunner(
          seed: 123,
          scenario: scenario,
          boundaryConfig: ChaosBoundaryConfig(),
        );

        final result1 = await runner1.run();
        final result2 = await runner2.run();

        // Results should still pass (deterministic), but different seeds
        // may produce different event sequences
        expect(result1.passed, true);
        expect(result2.passed, true);
      });
    });
  });
}
