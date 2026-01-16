/**
 * Test Suite for Form Module
 *
 * Comprehensive tests for musical form generation, structural analysis,
 * and architectural patterns based on Schillinger's Book 4: Form.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  FormEngine,
  FormAPI,
  MusicalForm,
  FormalSection,
  FormTemplate,
  FormGenerationConstraints,
  FormAnalysisResult,
  TonalPlan,
  ThematicMaterial,
  Rational,
  getAvailableFormTemplates,
  suggestFormForMaterial
} from '../form';

describe('FormEngine', () => {
  const baseConstraints: FormGenerationConstraints = {
    duration: new Rational(64, 1),
    complexity: 'moderate',
    developmentalIntensity: 0.5,
    contrastLevel: 0.5,
    formalClarity: 0.8,
    symmetricalPreference: 0.6,
    variationAmount: 0.3,
    contemporaryElements: false
  };

  const testThemes = ['primary', 'secondary'];

  describe('generateForm', () => {
    it('should generate binary form', () => {
      const form = FormEngine.generateForm('binary', baseConstraints, testThemes);

      expect(form).toBeDefined();
      expect(form.type).toBe('binary');
      expect(form.sections).toHaveLength(2);
      expect(form.sections[0].name).toBe('A');
      expect(form.sections[1].name).toBe('B');
      expect(form.sections[0].duration.toNumber()).toBeGreaterThan(0);
      expect(form.sections[1].duration.toNumber()).toBeGreaterThan(0);
    });

    it('should generate ternary form', () => {
      const form = FormEngine.generateForm('ternary', baseConstraints, testThemes);

      expect(form.type).toBe('ternary');
      expect(form.sections).toHaveLength(3);
      expect(form.sections[0].name).toBe('A');
      expect(form.sections[1].name).toBe('B');
      expect(form.sections[2].name).toBe('A\'');
    });

    it('should generate sonata form', () => {
      const form = FormEngine.generateForm('sonata', baseConstraints, testThemes);

      expect(form.type).toBe('sonata');
      expect(form.sections).toHaveLength(3);
      expect(form.sections[0].type).toBe('exposition');
      expect(form.sections[1].type).toBe('development');
      expect(form.sections[2].type).toBe('recapitulation');
    });

    it('should generate rondo form', () => {
      const form = FormEngine.generateForm('rondo', baseConstraints, testThemes);

      expect(form.type).toBe('rondo');
      expect(form.sections.length).toBeGreaterThanOrEqual(5);
      expect(form.sections.filter(s => s.type === 'refrain').length).toBe(3); // A appears 3 times
      expect(form.sections.filter(s => s.type === 'episode').length).toBe(2); // B and C episodes
    });

    it('should generate arch form', () => {
      const form = FormEngine.generateForm('arch', baseConstraints, testThemes);

      expect(form.type).toBe('arch');
      expect(form.sections).toHaveLength(5);
      expect(form.sections[0].name).toBe('A');
      expect(form.sections[4].name).toBe('A\'');
      expect(form.sections[1].name).toBe('B');
      expect(form.sections[3].name).toBe('B\'');
      expect(form.sections[2].name).toBe('C');
    });

    it('should generate theme and variations', () => {
      const form = FormEngine.generateForm('theme_variations', baseConstraints, testThemes);

      expect(form.type).toBe('theme_variations');
      expect(form.sections.length).toBeGreaterThanOrEqual(1);
      expect(form.sections[0].type).toBe('theme');
      expect(form.sections[0].materials.themes).toContain('primary');
    });

    it('should respect duration constraints', () => {
      const duration = new Rational(48, 1);
      const form = FormEngine.generateForm('binary', { ...baseConstraints, duration }, testThemes);

      expect(form.duration.toNumber()).toBeCloseTo(48, 1);
    });

    it('should throw error for invalid duration', () => {
      expect(() => {
        FormEngine.generateForm('binary', {
          ...baseConstraints,
          duration: new Rational(8, 1) // Too short for binary form
        }, testThemes);
      }).toThrow();
    });

    it('should apply complexity constraints', () => {
      const simpleForm = FormEngine.generateForm('binary', {
        ...baseConstraints,
        complexity: 'simple'
      }, testThemes);

      const complexForm = FormEngine.generateForm('sonata', {
        ...baseConstraints,
        complexity: 'complex'
      }, testThemes);

      expect(simpleForm.architecture.complexity).toBeLessThan(complexForm.architecture.complexity);
    });

    it('should create correct section types', () => {
      const sonataForm = FormEngine.generateForm('sonata', baseConstraints, testThemes);

      const exposition = sonataForm.sections.find(s => s.type === 'exposition');
      const development = sonataForm.sections.find(s => s.type === 'development');
      const recapitulation = sonataForm.sections.find(s => s.type === 'recapitulation');

      expect(exposition).toBeDefined();
      expect(development).toBeDefined();
      expect(recapitulation).toBeDefined();
    });

    it('should generate subsections for flexible sections', () => {
      const form = FormEngine.generateForm('sonata', {
        ...baseConstraints,
        duration: new Rational(128, 1) // Longer duration allows subsections
      }, testThemes);

      const flexibleSections = form.sections.filter(s => s.structure.subsections.length > 0);
      expect(flexibleSections.length).toBeGreaterThan(0);

      flexibleSections.forEach(section => {
        expect(section.structure.subsections.length).toBeGreaterThanOrEqual(2);
        section.structure.subsections.forEach(subsection => {
          expect(subsection.duration.toNumber()).toBeGreaterThan(0);
        });
      });
    });

    it('should set up section relationships', () => {
      const form = FormEngine.generateForm('ternary', baseConstraints, testThemes);

      form.sections.forEach((section, index) => {
        if (index > 0) {
          expect(section.follows).toContain(form.sections[index - 1].id);
        }
        if (index < form.sections.length - 1) {
          expect(section.precedes).toContain(form.sections[index + 1].id);
        }
      });
    });
  });

  describe('analyzeForm', () => {
    it('should analyze binary form correctly', () => {
      const form = FormEngine.generateForm('binary', baseConstraints, testThemes);
      const analysis = FormEngine.analyzeForm(form);

      expect(analysis.form).toBe(form);
      expect(analysis.metrics.symmetry).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.symmetry).toBeLessThanOrEqual(1);
      expect(analysis.metrics.balance).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.balance).toBeLessThanOrEqual(1);
      expect(analysis.metrics.coherence).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.coherence).toBeLessThanOrEqual(1);
      expect(analysis.metrics.originality).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.originality).toBeLessThanOrEqual(1);
      expect(analysis.metrics.effectiveness).toBeGreaterThanOrEqual(0);
      expect(analysis.metrics.effectiveness).toBeLessThanOrEqual(1);
    });

    it('should generate recommendations for unbalanced forms', () => {
      // Create an intentionally unbalanced form
      const unbalancedForm = FormEngine.generateForm('binary', {
        ...baseConstraints,
        duration: new Rational(64, 1)
      }, testThemes);

      // Make it unbalanced by adjusting durations
      unbalancedForm.sections[0].duration = new Rational(4, 1); // Very short first section
      unbalancedForm.sections[1].duration = new Rational(60, 1); // Very long second section

      const analysis = FormEngine.analyzeForm(unbalancedForm);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations.some(r => r.type === 'structural')).toBe(true);
      expect(analysis.predictions.audienceExpectation).toBeGreaterThanOrEqual(0);
      expect(analysis.predictions.memorability).toBeGreaterThanOrEqual(0);
    });

    it('should predict audience responses', () => {
      const classicalForm = FormEngine.generateForm('sonata', baseConstraints, testThemes);
      const analysis = FormEngine.analyzeForm(classicalForm);

      expect(analysis.predictions.audienceExpectation).toBeGreaterThanOrEqual(0.5); // Sonata is well-known
      expect(analysis.predictions.memorability).toBeGreaterThanOrEqual(0);
      expect(analysis.predictions.emotionalImpact).toBeGreaterThanOrEqual(0);
      expect(analysis.predictions.structuralInterest).toBeGreaterThanOrEqual(0);
    });
  });

  describe('transformForm', () => {
    it('should expand form correctly', () => {
      const originalForm = FormEngine.generateForm('binary', baseConstraints, testThemes);
      const originalDuration = originalForm.duration.toNumber();

      const expandedForm = FormEngine.transformForm(originalForm, 'expand', { factor: 1.5 });

      expect(expandedForm.name).toContain('expand');
      expect(expandedForm.duration.toNumber()).toBeCloseTo(originalDuration * 1.5, 1);
      expect(expandedForm.sections).toHaveLength(originalForm.sections.length);
    });

    it('should contract form correctly', () => {
      const originalForm = FormEngine.generateForm('ternary', baseConstraints, testThemes);
      const originalDuration = originalForm.duration.toNumber();

      const contractedForm = FormEngine.transformForm(originalForm, 'contract', { factor: 0.7 });

      expect(contractedForm.name).toContain('contract');
      expect(contractedForm.duration.toNumber()).toBeCloseTo(originalDuration * 0.7, 1);
    });

    it('should develop form correctly', () => {
      const originalForm = FormEngine.generateForm('binary', baseConstraints, testThemes);
      const developedForm = FormEngine.transformForm(originalForm, 'develop', { intensity: 0.7 });

      expect(developedForm.name).toContain('develop');

      // Check that complexity increased
      const originalComplexity = originalForm.sections.reduce((sum, s) => sum + s.character.complexity, 0) / originalForm.sections.length;
      const developedComplexity = developedForm.sections.reduce((sum, s) => sum + s.character.complexity, 0) / developedForm.sections.length;

      expect(developedComplexity).toBeGreaterThan(originalComplexity);
    });

    it('should simplify form correctly', () => {
      const originalForm = FormEngine.generateForm('sonata', baseConstraints, testThemes);
      const simplifiedForm = FormEngine.transformForm(originalForm, 'simplify', { intensity: 0.6 });

      expect(simplifiedForm.name).toContain('simplify');

      // Check that stability increased
      const originalStability = originalForm.sections.reduce((sum, s) => sum + s.character.stability, 0) / originalForm.sections.length;
      const simplifiedStability = simplifiedForm.sections.reduce((sum, s) => sum + s.character.stability, 0) / simplifiedForm.sections.length;

      expect(simplifiedStability).toBeGreaterThan(originalStability);
    });

    it('should contemporize form correctly', () => {
      const originalForm = FormEngine.generateForm('binary', baseConstraints, testThemes);
      const contemporizedForm = FormEngine.transformForm(originalForm, 'contemporize', {
        elements: ['chromaticism', 'polyrhythm']
      });

      expect(contemporizedForm.name).toContain('contemporize');

      // Check that contemporary elements were added
      const hasPolyrhythmicTextures = contemporizedForm.sections.some(section =>
        section.materials.textures.includes('polyrhythmic')
      );
      expect(hasPolyrhythmicTextures).toBe(true);
    });
  });

  describe('createFormTemplate', () => {
    it('should create custom form template', () => {
      const customTemplate = FormEngine.createFormTemplate(
        'Custom Form',
        'custom',
        [
          { name: 'Introduction', type: 'theme', relativeDuration: 0.1, optional: true, repeatable: false, flexible: false },
          { name: 'Main', type: 'theme', relativeDuration: 0.4, optional: false, repeatable: true, flexible: true },
          { name: 'Bridge', type: 'bridge', relativeDuration: 0.2, optional: false, repeatable: false, flexible: true },
          { name: 'Conclusion', type: 'coda', relativeDuration: 0.3, optional: false, repeatable: false, flexible: true }
        ]
      );

      expect(customTemplate.name).toBe('Custom Form');
      expect(customTemplate.type).toBe('custom');
      expect(customTemplate.structure).toHaveLength(4);
      expect(customTemplate.constraints.requiredSections).toContain('Main');
      expect(customTemplate.constraints.optionalSections).toContain('Introduction');
    });

    it('should apply custom constraints', () => {
      const customTemplate = FormEngine.createFormTemplate(
        'Constrained Form',
        'custom',
        [
          { name: 'A', type: 'theme', relativeDuration: 0.5, optional: false, repeatable: true, flexible: true },
          { name: 'B', type: 'episode', relativeDuration: 0.5, optional: false, repeatable: true, flexible: true }
        ],
        {
          minDuration: new Rational(32, 1),
          maxDuration: new Rational(128, 1),
          maxDepth: 4
        }
      );

      expect(customTemplate.constraints.minDuration.toNumber()).toBe(32);
      expect(customTemplate.constraints.maxDuration.toNumber()).toBe(128);
      expect(customTemplate.constraints.maxDepth).toBe(4);
    });
  });

  describe('getFormTemplates', () => {
    it('should return available form templates', () => {
      const templates = FormEngine.getFormTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.type === 'binary')).toBe(true);
      expect(templates.some(t => t.type === 'sonata')).toBe(true);
      expect(templates.some(t => t.type === 'rondo')).toBe(true);
      expect(templates.every(t => t.structure.length > 0)).toBe(true);
    });

    it('should return templates with required properties', () => {
      const templates = FormEngine.getFormTemplates();

      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.type).toBeDefined();
        expect(template.structure).toBeDefined();
        expect(template.constraints).toBeDefined();
        expect(template.guidelines).toBeDefined();
      });
    });
  });

  describe('suggestForm', () => {
    it('should suggest forms for given material', () => {
      const suggestions = FormEngine.suggestForm(
        ['primary', 'secondary'],
        new Rational(64, 1),
        'moderate'
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.suitability >= 0 && s.suitability <= 1)).toBe(true);
      expect(suggestions.every(s => s.reasons.length > 0)).toBe(true);
    });

    it('should prioritize suitable forms', () => {
      const suggestions = FormEngine.suggestForm(
        ['primary'],
        new Rational(32, 1),
        'simple'
      );

      // Should suggest simpler forms like binary or ternary
      const sortedSuggestions = suggestions.sort((a, b) => b.suitability - a.suitability);
      expect(sortedSuggestions[0].suitability).toBeGreaterThan(0.5);
    });

    it('should return empty suggestions for impossible constraints', () => {
      const suggestions = FormEngine.suggestForm(
        ['primary'],
        new Rational(4, 1), // Very short duration
        'simple'
      );

      expect(suggestions.length).toBe(0);
    });
  });
});

describe('FormAPI', () => {
  const baseDuration = new Rational(64, 1);
  const testThemes = ['primary', 'secondary'];

  describe('generateOptimalForm', () => {
    it('should generate optimal form with analysis', () => {
      const result = FormAPI.generateOptimalForm(
        testThemes,
        baseDuration,
        { complexity: 'moderate', style: 'classical' }
      );

      expect(result.form).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.analysis).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate different forms for different complexities', () => {
      const simpleResult = FormAPI.generateOptimalForm(
        testThemes,
        baseDuration,
        { complexity: 'simple' }
      );

      const complexResult = FormAPI.generateOptimalForm(
        testThemes,
        baseDuration,
        { complexity: 'complex' }
      );

      expect(simpleResult.form.type).not.toBe(complexResult.form.type);
    });

    it('should generate alternatives with different types', () => {
      const result = FormAPI.generateOptimalForm(testThemes, baseDuration);

      const formTypes = [result.form, ...result.alternatives].map(f => f.type);
      const uniqueTypes = new Set(formTypes);

      expect(uniqueTypes.size).toBeGreaterThan(1);
    });

    it('should provide relevant recommendations', () => {
      const result = FormAPI.generateOptimalForm(
        testThemes,
        baseDuration,
        { emotionalShape: 'arc' }
      );

      expect(result.recommendations.some(r => r.includes('suitability'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('emotional shape'))).toBe(true);
    });
  });

  describe('createFormFromSections', () => {
    it('should create form from sections', () => {
      const sections: FormalSection[] = [
        {
          id: 'section1',
          name: 'First',
          type: 'theme',
          duration: new Rational(32, 1),
          priority: 0.5,
          character: { stability: 0.7, intensity: 0.5, complexity: 0.4, momentum: 0.6 },
          materials: { themes: ['primary'], motifs: [], textures: ['homophonic'], orchestrations: ['standard'] },
          structure: {
            subsections: [],
            cadenceType: 'perfect',
            harmonicGoal: 'C',
            dominantPreparation: true
          },
          relationships: { precedes: [], follows: [], parallels: [], contrasts: [] }
        },
        {
          id: 'section2',
          name: 'Second',
          type: 'episode',
          duration: new Rational(32, 1),
          priority: 0.5,
          character: { stability: 0.3, intensity: 0.7, complexity: 0.6, momentum: 0.8 },
          materials: { themes: ['secondary'], motifs: [], textures: ['polyphonic'], orchestrations: ['standard'] },
          structure: {
            subsections: [],
            cadenceType: 'imperfect',
            harmonicGoal: 'G',
            dominantPreparation: false
          },
          relationships: { precedes: [], follows: [], parallels: [], contrasts: [] }
        }
      ];

      const form = FormAPI.createFormFromSections(sections, 'custom');

      expect(form.sections).toHaveLength(2);
      expect(form.duration.toNumber()).toBeCloseTo(64, 1);
      expect(form.type).toBe('custom');
    });

    it('should handle sections with subsections', () => {
      const sections: FormalSection[] = [
        {
          id: 'section1',
          name: 'Complex Section',
          type: 'development',
          duration: new Rational(64, 1),
          priority: 0.6,
          character: { stability: 0.2, intensity: 0.8, complexity: 0.9, momentum: 0.7 },
          materials: { themes: ['primary'], motifs: [], textures: ['complex'], orchestrations: ['full'] },
          structure: {
            subsections: [
              {
                id: 'sub1',
                name: 'Part 1',
                duration: new Rational(32, 1),
                character: { stability: 0.3, intensity: 0.6, complexity: 0.7, momentum: 0.8 },
                content: { melody: ['melody1'], harmony: ['harmony1'], rhythm: ['rhythm1'], texture: 'homophonic' },
                transitions: { in: 'gradual', out: 'bridge' }
              },
              {
                id: 'sub2',
                name: 'Part 2',
                duration: new Rational(32, 1),
                character: { stability: 0.4, intensity: 0.8, complexity: 0.8, momentum: 0.6 },
                content: { melody: ['melody2'], harmony: ['harmony2'], rhythm: ['rhythm2'], texture: 'polyphonic' },
                transitions: { in: 'bridge', out: 'gradual' }
              }
            ],
            cadenceType: 'imperfect',
            harmonicGoal: 'D',
            dominantPreparation: true
          },
          relationships: { precedes: [], follows: [], parallels: [], contrasts: [] }
        }
      ];

      const form = FormAPI.createFormFromSections(sections, 'custom');

      expect(form.sections[0].structure.subsections).toHaveLength(2);
      expect(form.sections[0].flexible).toBe(true);
    });
  });

  describe('extractFormStructure', () => {
    it('should extract form from harmonic analysis', () => {
      const harmonicAnalysis = [
        { time: 0, key: 'C', function: 'tonic' },
        { time: 16, key: 'G', function: 'dominant' },
        { time: 32, key: 'D', function: 'development' },
        { time: 48, key: 'C', function: 'tonic' }
      ];

      const thematicAnalysis = [
        { theme: 'primary', start: 0, end: 16 },
        { theme: 'secondary', start: 16, end: 32 },
        { theme: 'primary', start: 32, end: 48 }
      ];

      const form = FormAPI.extractFormStructure(harmonicAnalysis, thematicAnalysis, new Rational(48, 1));

      expect(form.sections).toHaveLength(4);
      expect(form.sections[0].structure.harmonicGoal).toBe('C');
      expect(form.sections[1].structure.harmonicGoal).toBe('G');
      expect(form.sections[2].structure.harmonicGoal).toBe('D');
      expect(form.sections[3].structure.harmonicGoal).toBe('C');
    });

    it('should associate themes with sections', () => {
      const harmonicAnalysis = [
        { time: 0, key: 'C', function: 'tonic' },
        { time: 24, key: 'G', function: 'dominant' }
      ];

      const thematicAnalysis = [
        { theme: 'main_theme', start: 2, end: 10 },
        { theme: 'secondary_theme', start: 26, end: 40 }
      ];

      const form = FormAPI.extractFormStructure(harmonicAnalysis, thematicAnalysis, new Rational(48, 1));

      expect(form.sections[0].materials.themes).toContain('main_theme');
      expect(form.sections[1].materials.themes).toContain('secondary_theme');
    });
  });

  describe('compareForms', () => {
    it('should compare identical forms', () => {
      const form1 = FormEngine.generateForm('binary', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, testThemes);

      const form2 = FormEngine.generateForm('binary', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, testThemes);

      const comparison = FormAPI.compareForms(form1, form2);

      expect(comparison.structuralSimilarity).toBeGreaterThan(0.8);
      expect(comparison.thematicSimilarity).toBeGreaterThan(0.8);
      expect(comparison.overallSimilarity).toBeGreaterThan(0.8);
      expect(comparison.differences.length).toBeLessThan(2);
    });

    it('should compare different forms', () => {
      const binaryForm = FormEngine.generateForm('binary', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, testThemes);

      const sonataForm = FormEngine.generateForm('sonata', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, testThemes);

      const comparison = FormAPI.compareForms(binaryForm, sonataForm);

      expect(comparison.structuralSimilarity).toBeLessThan(0.6);
      expect(comparison.differences.length).toBeGreaterThan(0);
      expect(comparison.differences.some(d => d.includes('form types'))).toBe(true);
    });

    it('should find thematic relationships', () => {
      const form1 = FormEngine.generateForm('sonata', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, ['primary', 'secondary']);

      const form2 = FormEngine.generateForm('rondo', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, ['primary', 'secondary']);

      const comparison = FormAPI.compareForms(form1, form2);

      expect(comparison.relationships.length).toBeGreaterThan(0);
      expect(comparison.thematicSimilarity).toBeGreaterThan(0);
    });
  });

  describe('generateFormVariations', () => {
    it('should generate structural variations', () => {
      const baseForm = FormEngine.generateForm('binary', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, testThemes);

      const variations = FormAPI.generateFormVariations(baseForm, 3, 'structural');

      expect(variations).toHaveLength(3);
      expect(variations.every(v => v.name.includes('develop'))).toBe(true);

      // Check that variations have different complexity levels
      const complexities = variations.map(v => v.architecture.complexity);
      const uniqueComplexities = new Set(complexities);
      expect(uniqueComplexities.size).toBeGreaterThan(1);
    });

    it('should generate thematic variations', () => {
      const baseForm = FormEngine.generateForm('theme_variations', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, testThemes);

      const variations = FormAPI.generateFormVariations(baseForm, 2, 'thematic');

      expect(variations).toHaveLength(2);
      expect(variations.every(v => v.name.includes('contemporize'))).toBe(true);
    });

    it('should generate combined variations', () => {
      const baseForm = FormEngine.generateForm('sonata', {
        duration: new Rational(64, 1),
        complexity: 'moderate'
      }, testThemes);

      const variations = FormAPI.generateFormVariations(baseForm, 2, 'combined');

      expect(variations).toHaveLength(2);
      // Combined variations should have both development and contemporary elements
    });
  });
});

describe('Utility Functions', () => {
  describe('getAvailableFormTemplates', () => {
    it('should return form templates', () => {
      const templates = getAvailableFormTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.id && t.name && t.type)).toBe(true);
    });

    it('should include standard forms', () => {
      const templates = getAvailableFormTemplates();
      const types = templates.map(t => t.type);

      expect(types).toContain('binary');
      expect(types).toContain('ternary');
      expect(types).toContain('sonata');
      expect(types).toContain('rondo');
    });
  });

  describe('suggestFormForMaterial', () => {
    it('should suggest forms for musical material', () => {
      const suggestions = suggestFormForMaterial(
        ['theme1', 'theme2', 'theme3'],
        new Rational(96, 1),
        'complex'
      );

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.suitability >= 0 && s.suitability <= 1)).toBe(true);
    });

    it('should prioritize based on material characteristics', () => {
      // With 3 themes and long duration, should suggest more complex forms
      const suggestions = suggestFormForMaterial(
        ['theme1', 'theme2', 'theme3'],
        new Rational(128, 1),
        'complex'
      );

      const topSuggestion = suggestions.sort((a, b) => b.suitability - a.suitability)[0];
      expect(topSuggestion.suitability).toBeGreaterThan(0.6);

      // Should suggest forms that can handle multiple themes
      const suitableForms = suggestions.filter(s => s.suitability > 0.5);
      expect(suitableForms.length).toBeGreaterThan(0);
    });
  });
});

describe('Rational Numbers in Forms', () => {
  it('should handle rational arithmetic correctly', () => {
    const form = FormEngine.generateForm('binary', {
      duration: new Rational(64, 1),
      complexity: 'moderate'
    }, ['primary']);

    const totalDuration = form.sections.reduce((sum, section) =>
      sum.add(section.duration), new Rational(0, 1)
    );

    expect(totalDuration.equals(form.duration)).toBe(true);
  });

  it('should preserve precision through transformations', () => {
    const originalForm = FormEngine.generateForm('ternary', {
      duration: new Rational(96, 1), // 3/2 minutes at quarter=60
      complexity: 'moderate'
    }, ['primary']);

    const expandedForm = FormEngine.transformForm(originalForm, 'expand', { factor: 2 });

    expect(expandedForm.duration.toNumber()).toBeCloseTo(192, 1);

    const contractedForm = FormEngine.transformForm(expandedForm, 'contract', { factor: 0.5 });

    expect(contractedForm.duration.toNumber()).toBeCloseTo(96, 1);
  });
});

describe('Performance Tests', () => {
  it('should generate complex forms efficiently', () => {
    const startTime = performance.now();

    const form = FormEngine.generateForm('sonata', {
      duration: new Rational(256, 1), // Long, complex form
      complexity: 'complex',
      developmentalIntensity: 0.8,
      contrastLevel: 0.7
    }, ['primary', 'secondary', 'transitional']);

    const executionTime = performance.now() - startTime;

    expect(form).toBeDefined();
    expect(form.sections.length).toBe(3);
    expect(executionTime).toBeLessThan(100); // 100ms target
  });

  it('should analyze forms quickly', () => {
    const form = FormEngine.generateForm('rondo', {
      duration: new Rational(128, 1),
      complexity: 'moderate'
    }, ['primary', 'secondary', 'episode']);

    const startTime = performance.now();
    const analysis = FormEngine.analyzeForm(form);
    const executionTime = performance.now() - startTime;

    expect(analysis.metrics).toBeDefined();
    expect(analysis.recommendations).toBeDefined();
    expect(executionTime).toBeLessThan(50); // 50ms target
  });

  it('should generate form variations efficiently', () => {
    const baseForm = FormEngine.generateForm('theme_variations', {
      duration: new Rational(64, 1),
      complexity: 'moderate'
    }, ['theme1']);

    const startTime = performance.now();
    const variations = FormAPI.generateFormVariations(baseForm, 5, 'combined');
    const executionTime = performance.now() - startTime;

    expect(variations).toHaveLength(5);
    expect(executionTime).toBeLessThan(200); // 200ms target for 5 variations
  });
});

describe('Edge Cases', () => {
  it('should handle single theme material', () => {
    const form = FormEngine.generateForm('theme_variations', {
      duration: new Rational(48, 1),
      complexity: 'simple'
    }, ['single_theme']);

    expect(form).toBeDefined();
    expect(form.sections[0].materials.themes).toContain('single_theme');
  });

  it('should handle very long durations', () => {
    const form = FormEngine.generateForm('sonata', {
      duration: new Rational(512, 1), // Very long form
      complexity: 'complex'
    }, ['primary', 'secondary']);

    expect(form).toBeDefined();
    expect(form.duration.toNumber()).toBe(512);
  });

  it('should handle minimal complexity', () => {
    const form = FormEngine.generateForm('binary', {
      duration: new Rational(32, 1),
      complexity: 'simple',
      developmentalIntensity: 0.1,
      contrastLevel: 0.1
    }, ['simple_theme']);

    expect(form).toBeDefined();
    expect(form.architecture.complexity).toBeLessThan(0.5);
  });

  it('should handle maximal complexity', () => {
    const form = FormEngine.generateForm('sonata', {
      duration: new Rational(128, 1),
      complexity: 'complex',
      developmentalIntensity: 1.0,
      contrastLevel: 1.0,
      contemporaryElements: true
    }, ['complex_theme1', 'complex_theme2', 'complex_theme3']);

    expect(form).toBeDefined();
    expect(form.architecture.complexity).toBeGreaterThan(0.5);
  });

  it('should handle custom template generation', () => {
    const customTemplate = FormEngine.createFormTemplate(
      'Edge Case Form',
      'custom',
      [
        { name: 'Intro', type: 'theme', relativeDuration: 0.1, optional: true, repeatable: false, flexible: false },
        { name: 'Main', type: 'theme', relativeDuration: 0.8, optional: false, repeatable: true, flexible: true },
        { name: 'Outro', type: 'coda', relativeDuration: 0.1, optional: true, repeatable: false, flexible: false }
      ]
    );

    const form = FormEngine.generateForm(customTemplate, {
      duration: new Rational(64, 1),
      complexity: 'moderate'
    }, ['edge_theme']);

    expect(form).toBeDefined();
    expect(form.sections.length).toBeGreaterThanOrEqual(1);
    expect(form.sections.some(s => s.name === 'Main')).toBe(true);
  });
});