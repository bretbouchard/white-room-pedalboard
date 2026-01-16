/// Tests for capability discovery and dynamic feature detection
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:schillinger_sdk/schillinger_sdk.dart';

void main() {
  group('Capability Discovery Tests', () {
    group('SDKCapabilities', () {
      test('should be singleton', () {
        final instance1 = SDKCapabilities.instance;
        final instance2 = SDKCapabilities.instance;

        expect(identical(instance1, instance2), true);
      });

      test('should check core capabilities', () {
        final caps = SDKCapabilities.instance;

        // These capabilities should be available in v2.1
        expect(caps.hasCapability('realization'), true);
        expect(caps.hasCapability('offline'), true);
        expect(caps.hasCapability('visualization'), true);
      });

      test('should check feature availability', () {
        final caps = SDKCapabilities.instance;

        // Check specific features
        expect(caps.hasFeature('dawExport', 'midi'), true);
        expect(caps.hasFeature('dawExport', 'musicxml'), true);
        expect(caps.hasFeature('visualization', 'timeline'), true);
        expect(caps.hasFeature('visualization', 'intensity'), true);
      });

      test('should return capability report', () {
        final caps = SDKCapabilities.instance;
        final report = caps.getReport();

        expect(report.capabilities, isNotEmpty);
        expect(report.sdkVersion, isNotNull);
      });
    });

    group('CapabilityUI', () {
      test('should build widget if capable', () {
        final widget = CapabilityUI.buildIfCapable(
          'realization',
          () => 'Widget Built',
        );

        expect(widget, 'Widget Built');
      });

      test('should return null if not capable', () {
        final widget = CapabilityUI.buildIfCapable(
          'nonexistent_capability',
          () => 'Widget Built',
        );

        expect(widget, isNull);
      });

      test('should use fallback when not capable', () {
        final result = CapabilityUI.withFallback(
          capabilityName: 'realization',
          builder: () => 'Main Feature',
          fallback: () => 'Fallback',
        );

        expect(result, 'Main Feature');
      });

      test('should use fallback when capability missing', () {
        final result = CapabilityUI.withFallback(
          capabilityName: 'nonexistent_capability',
          builder: () => 'Main Feature',
          fallback: () => 'Fallback',
        );

        expect(result, 'Fallback');
      });
    });
  });
}
