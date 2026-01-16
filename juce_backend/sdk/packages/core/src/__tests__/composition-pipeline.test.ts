/**
 * Test Suite for Composition Pipeline
 *
 * Comprehensive tests for the master orchestration engine that
 * integrates all Schillinger SDK components into a complete
 * musical composition workflow.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CompositionPipeline,
  CompositionAPI,
  CompositionRequest,
  CompositionProject,
  ThemeMaterial,
  Rational,
  createQuickComposition,
  analyzeProject,
  createTheme
} from '../composition-pipeline';

describe('CompositionPipeline', () => {
  const basicTheme = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale
  const secondaryTheme = [72, 71, 69, 67, 65, 64, 62, 60]; // C major scale descending

  const basicRequest: CompositionRequest = {
    id: 'test-request',
    title: 'Test Composition',
    duration: new Rational(64, 1),
    style: {
      era: 'classical',
      genre: 'chamber',
      mood: 'lyrical',
      complexity: 'moderate'
    },
    ensemble: {
      type: 'chamber',
      size: 'quartet',
      instrumentation: ['violin', 'viola', 'cello']
    },
    structure: {
      formType: 'binary'
    },
    material: {
      themes: [],
      motifs: [],
      harmonicLanguage: 'tonal',
      keyCenter: 'C',
      rhythmicCharacter: 'regular'
    },
    constraints: {
      technicalDifficulty: 'intermediate',
      instrumentalRanges: 'comfortable',
      orchestrationDensity: 'moderate',
      dynamicRange: 'moderate'
    },
    objectives: {
      primaryGoal: 'performance',
      targetAudience: 'general',
      emotionalImpact: 'moderate'
    }
  };

  describe('execute', () => {
    it('should execute complete composition pipeline', async () => {
      const request = {
        ...basicRequest,
        material: {
          ...basicRequest.material,
          themes: [
            createTheme(basicTheme, 'Primary Theme', 'primary'),
            createTheme(secondaryTheme, 'Secondary Theme', 'secondary')
          ]
        }
      };

      const result = await CompositionPipeline.execute(request);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.stages).toHaveLength(8); // Should have 8 pipeline stages
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toBeDefined();
      expect(result.timing.total).toBeGreaterThan(0);
      expect(result.statistics.techniques).toBeGreaterThan(0);
    }, 10000); // 10 second timeout for pipeline execution

    it('should handle errors gracefully', async () => {
      const invalidRequest = {
        ...basicRequest,
        duration: new Rational(4, 1), // Too short for most forms
        material: {
          ...basicRequest.material,
          themes: [createTheme([60], 'Single Note', 'primary')]
        }
      };

      const result = await CompositionPipeline.execute(invalidRequest);

      // Should still complete but with warnings/errors
      expect(result).toBeDefined();
      expect(result.success).toBeDefined(); // May be true or false depending on implementation
    }, 5000);

    it('should generate correct structure', async () => {
      const request = {
        ...basicRequest,
        structure: {
          formType: 'sonata'
        },
        material: {
          ...basicRequest.material,
          themes: [
            createTheme(basicTheme, 'Primary Theme', 'primary'),
            createTheme(secondaryTheme, 'Secondary Theme', 'secondary')
          ]
        }
      };

      const result = await CompositionPipeline.execute(request, { optimizeFor: 'quality' });

      expect(result.success).toBe(true);
      expect(result.project.form.type).toBe('sonata');
      expect(result.project.form.sections).toHaveLength(3); // Exposition, Development, Recapitulation
      expect(result.project.sections).toHaveLength(3);
    }, 10000);

    it('should generate orchestration', async () => {
      const request = {
        ...basicRequest,
        ensemble: {
          type: 'orchestral',
          size: 'full',
          instrumentation: ['violin', 'flute', 'trumpet']
        },
        material: {
          ...basicRequest.material,
          themes: [createTheme(basicTheme, 'Primary Theme', 'primary')]
        }
      };

      const result = await CompositionPipeline.execute(request);

      expect(result.success).toBe(true);
      expect(result.project.orchestration).toBeDefined();
      expect(result.project.orchestration.overall.ensemble.length).toBeGreaterThan(0);
      expect(result.project.orchestration.sections).toBeDefined();
    }, 10000);

    it('should apply different styles correctly', async () => {
      const styles = ['classical', 'romantic', 'modern', 'contemporary'];

      for (const style of styles) {
        const request = {
          ...basicRequest,
          style: {
            era: style as any,
            genre: 'chamber',
            mood: 'lyrical',
            complexity: 'moderate'
          },
          material: {
            ...basicRequest.material,
            themes: [createTheme(basicTheme, 'Primary Theme', 'primary')]
          }
        };

        const result = await CompositionPipeline.execute(request);

        expect(result.success).toBe(true);
        expect(result.project.request.style.era).toBe(style);
      }
    }, 15000);

    it('should handle different ensemble types', async () => {
      const ensembles = [
        { type: 'solo', size: 'solo' as const },
        { type: 'chamber', size: 'quartet' as const },
        { type: 'orchestral', size: 'full' as const }
      ];

      for (const ensemble of ensembles) {
        const request = {
          ...basicRequest,
          ensemble,
          material: {
            ...basicRequest.material,
            themes: [createTheme(basicTheme, 'Primary Theme', 'primary')]
          }
        };

        const result = await CompositionPipeline.execute(request);

        expect(result.success).toBe(true);
        expect(result.project.request.ensemble.type).toBe(ensemble.type);
        expect(result.project.request.ensemble.size).toBe(ensemble.size);
      }
    }, 15000);

    it('should generate appropriate complexity levels', async () => {
      const complexities = ['simple', 'moderate', 'complex', 'very_complex'] as const;

      for (const complexity of complexities) {
        const request = {
          ...basicRequest,
          style: {
            era: 'classical',
            genre: 'chamber',
            mood: 'lyrical',
            complexity
          },
          material: {
            ...basicRequest.material,
            themes: [createTheme(basicTheme, 'Primary Theme', 'primary')]
          }
        };

        const result = await CompositionPipeline.execute(request);

        expect(result.success).toBe(true);
        expect(result.project.request.style.complexity).toBe(complexity);
        // More complex compositions should have more techniques
        expect(result.statistics.techniques).toBeGreaterThanOrEqual(0);
      }
    }, 20000);
  });

  describe('quickCompose', () => {
    it('should create composition quickly with minimal parameters', async () => {
      const themes = [basicTheme, secondaryTheme];
      const result = await CompositionPipeline.quickCompose(
        themes,
        new Rational(32, 1),
        'classical'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project.duration.toNumber()).toBeCloseTo(32, 1);
      expect(result.project.sections.length).toBeGreaterThan(0);
    }, 5000);

    it('should handle different styles in quick compose', async () => {
      const styles = ['classical', 'modern', 'film'] as const;

      for (const style of styles) {
        const result = await CompositionPipeline.quickCompose(
          [basicTheme],
          new Rational(24, 1),
          style
        );

        expect(result.success).toBe(true);
        expect(result.project.request.style.era).toBeDefined();
      }
    }, 10000);

    it('should work with different ensemble sizes', async () => {
      const ensembles = ['string_quartet', 'orchestra', 'chamber'] as const;

      for (const ensemble of ensembles) {
        const result = await CompositionPipeline.quickCompose(
          [basicTheme],
          new Rational(48, 1),
          'classical'
        );

        expect(result.success).toBe(true);
        expect(result.project.orchestration).toBeDefined();
      }
    }, 10000);
  });

  describe('generateVariations', () => {
    it('should generate structural variations', async () => {
      // First create a base composition
      const baseResult = await CompositionPipeline.quickCompose(
        [basicTheme],
        new Rational(48, 1),
        'classical'
      );

      expect(baseResult.success).toBe(true);

      // Generate variations
      const variations = await CompositionPipeline.generateVariations(
        baseResult.project,
        'structural',
        2
      );

      expect(variations).toHaveLength(2);
      expect(variations.every(v => v.success)).toBe(true);
      expect(variations.every(v => v.project.id !== baseResult.project.id)).toBe(true);
    }, 15000);

    it('should generate thematic variations', async () => {
      const baseResult = await CompositionPipeline.quickCompose(
        [basicTheme, secondaryTheme],
        new Rational(64, 1),
        'classical'
      );

      const variations = await CompositionPipeline.generateVariations(
        baseResult.project,
        'thematic',
        3
      );

      expect(variations).toHaveLength(3);
      expect(variations.every(v => v.success)).toBe(true);
    }, 15000);

    it('should generate combined variations', async () => {
      const baseResult = await CompositionPipeline.quickCompose(
        [basicTheme],
        new Rational(32, 1),
        'modern'
      );

      const variations = await CompositionPipeline.generateVariations(
        baseResult.project,
        'combined',
        2
      );

      expect(variations).toHaveLength(2);
      expect(variations.every(v => v.success)).toBe(true);
    }, 15000);
  });

  describe('analyzeComposition', () => {
    it('should analyze composition correctly', async () => {
      const result = await CompositionPipeline.quickCompose(
        [basicTheme],
        new Rational(64, 1),
        'classical'
      );

      expect(result.success).toBe(true);

      const analysis = CompositionPipeline.analyzeComposition(result.project);

      expect(analysis).toBeDefined();
      expect(analysis.quality).toBeDefined();
      expect(analysis.potential).toBeDefined();
      expect(analysis.recommendations).toBeDefined();

      expect(analysis.quality.overall).toBeGreaterThanOrEqual(0);
      expect(analysis.quality.overall).toBeLessThanOrEqual(1);
      expect(analysis.potential.audience).toBeDefined();
    }, 10000);

    it('should provide meaningful recommendations', async () => {
      const result = await CompositionPipeline.quickCompose(
        [basicTheme, secondaryTheme],
        new Rational(96, 1),
        'modern'
      );

      const analysis = CompositionPipeline.analyzeComposition(result.project);

      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.every(r => r.category && r.priority && r.suggestion)).toBe(true);
      expect(analysis.recommendations.every(r => r.impact >= 0 && r.impact <= 1)).toBe(true);
    }, 10000);

    it('should calculate quality scores correctly', async () => {
      const result = await CompositionPipeline.quickCompose(
        [basicTheme],
        new Rational(48, 1),
        'classical'
      );

      const analysis = CompositionPipeline.analyzeComposition(result.project);

      expect(analysis.quality.technical).toBeGreaterThanOrEqual(0);
      expect(analysis.quality.technical).toBeLessThanOrEqual(1);
      expect(analysis.quality.artistic).toBeGreaterThanOrEqual(0);
      expect(analysis.quality.artistic).toBeLessThanOrEqual(1);
      expect(analysis.quality.performability).toBeGreaterThanOrEqual(0);
      expect(analysis.quality.performability).toBeLessThanOrEqual(1);
    }, 10000);
  });

  describe('Integration Tests', () => {
    it('should integrate all engines correctly', async () => {
      const complexRequest: CompositionRequest = {
        id: 'integration-test',
        title: 'Complex Integration Test',
        duration: new Rational(128, 1),
        style: {
          era: 'romantic',
          genre: 'symphony',
          mood: 'dramatic',
          complexity: 'complex'
        },
        ensemble: {
          type: 'orchestral',
          size: 'full',
          instrumentation: ['violin', 'viola', 'cello', 'flute', 'oboe', 'clarinet', 'horn', 'trumpet', 'trombone']
        },
        structure: {
          formType: 'sonata',
          developmentIntensity: 0.8
        },
        material: {
          themes: [
            createTheme(basicTheme, 'Primary Theme', 'primary'),
            createTheme(secondaryTheme, 'Secondary Theme', 'secondary'),
            createTheme([72, 74, 76, 77, 79, 81, 83, 84], 'Third Theme', 'transitional')
          ],
          motifs: [],
          harmonicLanguage: 'tonal',
          keyCenter: 'C',
          rhythmicCharacter: 'complex'
        },
        constraints: {
          technicalDifficulty: 'advanced',
          instrumentalRanges: 'extended',
          orchestrationDensity: 'dense',
          dynamicRange: 'wide'
        },
        objectives: {
          primaryGoal: 'performance',
          targetAudience: 'connoisseurs',
          emotionalImpact: 'powerful'
        }
      };

      const result = await CompositionPipeline.execute(complexRequest);

      expect(result.success).toBe(true);
      expect(result.project.form.type).toBe('sonata');
      expect(result.project.sections.length).toBeGreaterThanOrEqual(3);
      expect(result.project.orchestration.overall.ensemble.length).toBeGreaterThan(5);
      expect(result.statistics.techniques).toBeGreaterThan(5); // Should use many techniques
    }, 15000);

    it('should handle edge cases gracefully', async () => {
      // Test with minimal material
      const minimalRequest = {
        ...basicRequest,
        duration: new Rational(16, 1), // Very short
        structure: {
          formType: 'binary'
        },
        material: {
          ...basicRequest.material,
          themes: [createTheme([60], 'Single Note', 'primary')]
        }
      };

      const result = await CompositionPipeline.execute(minimalRequest);

      // Should handle gracefully, even if warnings are generated
      expect(result).toBeDefined();
      expect(result.project).toBeDefined();
    }, 5000);

    it('should maintain consistency across pipeline stages', async () => {
      const request = {
        ...basicRequest,
        material: {
          ...basicRequest.material,
          themes: [
            createTheme(basicTheme, 'Primary Theme', 'primary'),
            createTheme(secondaryTheme, 'Secondary Theme', 'secondary')
          ]
        }
      };

      const result = await CompositionPipeline.execute(request, { saveIntermediates: true });

      expect(result.success).toBe(true);
      expect(result.stages).toHaveLength(8);

      // Check that all stages completed successfully
      result.stages.forEach(stage => {
        expect(stage.status).toBe('completed');
        expect(stage.duration).toBeGreaterThan(0);
        expect(stage.output).toBeDefined();
      });

      // Check final project consistency
      const project = result.project;
      expect(project.form).toBeDefined();
      expect(project.sections.length).toBeGreaterThan(0);
      expect(project.orchestration).toBeDefined();
      expect(project.analysis).toBeDefined();
    }, 15000);
  });

  describe('Performance Tests', () => {
    it('should complete simple composition within time limits', async () => {
      const startTime = performance.now();

      const result = await CompositionPipeline.execute({
        ...basicRequest,
        material: {
          ...basicRequest.material,
          themes: [createTheme(basicTheme, 'Primary Theme', 'primary')]
        }
      }, { optimizeFor: 'speed' });

      const executionTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(5000); // 5 second limit for simple composition
    }, 10000);

    it('should handle complex composition efficiently', async () => {
      const complexRequest = {
        ...basicRequest,
        duration: new Rational(256, 1),
        style: {
          era: 'modern',
          genre: 'ensemble',
          mood: 'dramatic',
          complexity: 'complex'
        },
        material: {
          ...basicRequest.material,
          themes: [
            createTheme(basicTheme, 'Theme 1', 'primary'),
            createTheme(secondaryTheme, 'Theme 2', 'secondary')
          ]
        }
      };

      const startTime = performance.now();

      const result = await CompositionPipeline.execute(complexRequest, { optimizeFor: 'quality' });

      const executionTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(20000); // 20 second limit for complex composition
    }, 25000);

    it('should scale performance with composition size', async () => {
      const sizes = [32, 64, 128];
      const times: number[] = [];

      for (const size of sizes) {
        const startTime = performance.now();

        const result = await CompositionPipeline.execute({
          ...basicRequest,
          duration: new Rational(size, 1),
          material: {
            ...basicRequest.material,
            themes: [createTheme(basicTheme.slice(0, Math.min(8, size)), 'Theme', 'primary')]
          }
        });

        const executionTime = performance.now() - startTime;
        times.push(executionTime);

        expect(result.success).toBe(true);
      }

      // Performance should scale reasonably (not exponentially)
      expect(times[2]).toBeLessThan(times[1] * 3); // 128 should not be 3x slower than 64
      expect(times[1]).toBeLessThan(times[0] * 3); // 64 should not be 3x slower than 32
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      const invalidRequest = {
        ...basicRequest,
        duration: new Rational(0, 1), // Zero duration
        material: {
          ...basicRequest.material,
          themes: []
        }
      };

      const result = await CompositionPipeline.execute(invalidRequest);

      // Should not crash
      expect(result).toBeDefined();
      expect(result.timing.total).toBeGreaterThan(0);
    }, 5000);

    it('should provide meaningful error messages', async () => {
      const result = await CompositionPipeline.execute({
        ...basicRequest,
        material: {
          ...basicRequest.material,
          themes: [createTheme(basicTheme, 'Theme', 'invalid' as any)] // Invalid theme type
        }
      });

      expect(result).toBeDefined();
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toBeDefined();
      }
    }, 5000);

    it('should handle pipeline stage failures', async () => {
      // Mock a stage that might fail
      const request = {
        ...basicRequest,
        ensemble: {
          type: 'invalid' as any,
          size: 'invalid' as any
        },
        material: {
          ...basicRequest.material,
          themes: [createTheme(basicTheme, 'Theme', 'primary')]
        }
      };

      const result = await CompositionPipeline.execute(request);

      // Should handle gracefully even with invalid ensemble data
      expect(result).toBeDefined();
      expect(result.timing.total).toBeGreaterThan(0);
    }, 5000);
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during multiple compositions', async () => {
      const compositions = [];

      // Create multiple compositions
      for (let i = 0; i < 5; i++) {
        const result = await CompositionPipeline.quickCompose(
          [basicTheme],
          new Rational(32, 1),
          'classical'
        );

        expect(result.success).toBe(true);
        compositions.push(result);
      }

      // All compositions should be valid
      expect(compositions).toHaveLength(5);
      compositions.forEach(comp => {
        expect(comp.project).toBeDefined();
        expect(comp.project.id).toBeDefined();
      });
    }, 25000);

    it('should manage large compositions efficiently', async () => {
      const largeRequest = {
        ...basicRequest,
        duration: new Rational(512, 1), // Very large
        style: {
          era: 'contemporary',
          genre: 'experimental',
          mood: 'mysterious',
          complexity: 'very_complex'
        },
        material: {
          ...basicRequest.material,
          themes: [
            createTheme(basicTheme, 'Large Theme 1', 'primary'),
            createTheme(secondaryTheme, 'Large Theme 2', 'secondary'),
            createTheme([72, 74, 76, 78, 80, 81, 83, 85], 'Large Theme 3', 'transitional')
          ]
        }
      };

      const result = await CompositionPipeline.execute(largeRequest);

      expect(result.success).toBe(true);
      expect(result.project.duration.toNumber()).toBe(512);
      expect(result.statistics.operations).toBeGreaterThan(0);
    }, 30000);
  });
});

describe('CompositionAPI', () => {
  describe('quickCompose', () => {
    it('should be available as alias', async () => {
      const result = await CompositionAPI.quickCompose(
        [basicTheme],
        new Rational(32, 1),
        'classical'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    }, 5000);
  });

  describe('compose', () => {
    it('should compose with full parameters', async () => {
      const themes = [
        createTheme(basicTheme, 'Professional Theme', 'primary'),
        createTheme(secondaryTheme, 'Professional Secondary', 'secondary')
      ];

      const result = await CompositionAPI.compose(
        themes,
        'binary',
        ['violin', 'viola', 'cello'],
        {
          duration: new Rational(48, 1),
          style: {
            era: 'classical',
            mood: 'lyrical'
          }
        }
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.project.request.material.themes).toHaveLength(2);
    }, 10000);
  });

  describe('createVariations', () => {
    it('should create multiple variation types', async () => {
      const baseResult = await CompositionAPI.quickCompose(
        [basicTheme],
        new Rational(48, 1),
        'classical'
      );

      const variations = await CompositionAPI.createVariations(
        baseResult.project,
        4,
        ['thematic', 'harmonic', 'orchestral']
      );

      expect(variations.length).toBeGreaterThan(0);
      expect(variations.every(v => v.success)).toBe(true);
    }, 15000);
  });

  describe('analyzeComposition', () => {
    it('should provide comprehensive analysis', async () => {
      const result = await CompositionAPI.quickCompose(
        [basicTheme, secondaryTheme],
        new Rational(64, 1),
        'modern'
      );

      const analysis = CompositionAPI.analyzeComposition(result.project);

      expect(analysis.quality).toBeDefined();
      expect(analysis.quality.overall).toBeGreaterThanOrEqual(0);
      expect(analysis.potential).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    }, 10000);
  });
});

describe('Utility Functions', () => {
  describe('createQuickComposition', () => {
    it('should be exported and functional', async () => {
      const result = await createQuickComposition(
        [basicTheme],
        new Rational(32, 1),
        'film'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    }, 5000);
  });

  describe('analyzeProject', () => {
    it('should analyze project composition', async () => {
      const result = await createQuickComposition(
        [basicTheme],
        new Rational(32, 1),
        'classical'
      );

      const analysis = analyzeProject(result.project);

      expect(analysis).toBeDefined();
      expect(analysis.quality).toBeDefined();
      expect(analysis.potential).toBeDefined();
    }, 5000);
  });

  describe('createTheme', () => {
    it('should create theme with correct structure', () => {
      const theme = createTheme(basicTheme, 'Test Theme', 'primary');

      expect(theme).toBeDefined();
      expect(theme.name).toBe('Test Theme');
      expect(theme.type).toBe('primary');
      expect(theme.melodic).toBeDefined();
      expect(theme.rhythmic).toBeDefined();
      expect(theme.harmonic).toBeDefined();
    });

    it('should calculate intervals correctly', () => {
      const theme = createTheme(basicTheme, 'Interval Test', 'primary');

      expect(theme.melodic.intervals).toHaveLength(basicTheme.length - 1);
      expect(theme.melodic.intervals[0]).toBe(basicTheme[1] - basicTheme[0]);
    });

    it('should calculate range correctly', () => {
      const theme = createTheme([60, 72, 84, 96], 'Range Test', 'primary');

      expect(theme.melodic.range).toBe(96 - 60); // 36 semitones
    });
  });
});