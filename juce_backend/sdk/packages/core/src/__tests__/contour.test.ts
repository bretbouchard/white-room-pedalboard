import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ContourEngine,
  ContourAPI,
  ContourPoint,
  ContourShapeType,
  ContourGenerationOptions,
  ContourTransformation,
  TransformationParameters
} from '../contour';
import { SchillingerSDK } from '../client';
import { ValidationError as _ValidationError } from '@schillinger-sdk/shared';

// Mock the SDK client
const mockSDK = {
  isOfflineMode: vi.fn(() => true),
  getCachedOrExecute: vi.fn(),
  makeRequest: vi.fn(),
} as unknown as SchillingerSDK;

describe('ContourEngine', () => {
  describe('Contour Generation', () => {
    it('should generate linear contours', () => {
      const options: ContourGenerationOptions = {
        length: 10,
        range: { min: 60, max: 80 },
        style: 'smooth',
        complexity: 'simple'
      };

      const contour = ContourEngine.generateContour('linear', options);

      expect(contour).toHaveLength(10);
      expect(contour[0]).toHaveProperty('x');
      expect(contour[0]).toHaveProperty('y');
      expect(contour[0]).toHaveProperty('velocity');
      expect(contour[0]).toHaveProperty('duration');

      // Check that all points are within range
      contour.forEach(point => {
        expect(point.y).toBeGreaterThanOrEqual(options.range.min);
        expect(point.y).toBeLessThanOrEqual(options.range.max);
      });

      // Check x-coordinates are sequential
      contour.forEach((point, index) => {
        expect(point.x).toBe(index);
      });
    });

    it('should generate exponential contours', () => {
      const options: ContourGenerationOptions = {
        length: 8,
        range: { min: 50, max: 90 },
        style: 'smooth',
        complexity: 'moderate'
      };

      const contour = ContourEngine.generateContour('exponential', options);

      expect(contour).toHaveLength(8);
      expect(contour.every(point => point.y >= options.range.min && point.y <= options.range.max)).toBe(true);
    });

    it('should generate sigmoid contours with varying complexity', () => {
      const options: ContourGenerationOptions = {
        length: 12,
        range: { min: 40, max: 80 },
        style: 'smooth',
        complexity: 'complex'
      };

      const simpleContour = ContourEngine.generateContour('sigmoid', { ...options, complexity: 'simple' });
      const complexContour = ContourEngine.generateContour('sigmoid', { ...options, complexity: 'complex' });

      expect(simpleContour).toHaveLength(12);
      expect(complexContour).toHaveLength(12);

      // Complex contour should have steeper transitions
      const simpleRange = Math.max(...simpleContour.map(p => p.y)) - Math.min(...simpleContour.map(p => p.y));
      const complexRange = Math.max(...complexContour.map(p => p.y)) - Math.min(...complexContour.map(p => p.y));

      expect(complexRange).toBeGreaterThan(0);
    });

    it('should generate bell curve contours', () => {
      const options: ContourGenerationOptions = {
        length: 16,
        range: { min: 60, max: 84 },
        style: 'smooth',
        complexity: 'moderate'
      };

      const contour = ContourEngine.generateContour('bell_curve', options);

      expect(contour).toHaveLength(16);

      // Bell curve should have highest point in middle
      const maxIndex = contour.indexOf(contour.reduce((max, point) => point.y > max.y ? point : max));
      expect(Math.abs(maxIndex - contour.length / 2)).toBeLessThan(3);
    });

    it('should generate sinusoidal contours', () => {
      const options: ContourGenerationOptions = {
        length: 20,
        range: { min: 55, max: 75 },
        style: 'smooth',
        complexity: 'complex'
      };

      const contour = ContourEngine.generateContour('sinusoidal', options);

      expect(contour).toHaveLength(20);

      // Should have multiple peaks and valleys
      let directionChanges = 0;
      let lastDirection = 0;

      for (let i = 1; i < contour.length; i++) {
        const direction = Math.sign(contour[i].y - contour[i - 1].y);
        if (i > 1 && direction !== lastDirection && direction !== 0) {
          directionChanges++;
        }
        lastDirection = direction;
      }

      expect(directionChanges).toBeGreaterThan(2); // At least a few oscillations
    });

    it('should generate Schillinger wave contours', () => {
      const options: ContourGenerationOptions = {
        length: 24,
        range: { min: 48, max: 72 },
        style: 'smooth',
        complexity: 'complex'
      };

      const contour = ContourEngine.generateContour('schillinger_wave', options);

      expect(contour).toHaveLength(24);

      // Should have interesting harmonic content
      const pitches = contour.map(p => p.y);
      const uniquePitches = new Set(pitches);
      expect(uniquePitches.size).toBeGreaterThan(contour.length / 3); // Good variety
    });

    it('should generate resultant contours', () => {
      const options: ContourGenerationOptions = {
        length: 30,
        range: { min: 50, max: 80 },
        style: 'angular',
        complexity: 'moderate'
      };

      const contour = ContourEngine.generateContour('resultant_contour', options);

      expect(contour).toHaveLength(30);

      // Should have attack points where generators align
      const highVelocityPoints = contour.filter(point => point.velocity > 100);
      expect(highVelocityPoints.length).toBeGreaterThan(0);
    });

    it('should handle edge cases for contour generation', () => {
      const options: ContourGenerationOptions = {
        length: 1,
        range: { min: 60, max: 60 },
        style: 'smooth',
        complexity: 'simple'
      };

      const contour = ContourEngine.generateContour('linear', options);

      expect(contour).toHaveLength(1);
      expect(contour[0].y).toBe(60);
    });
  });

  describe('Contour Analysis', () => {
    it('should analyze contour structure correctly', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 65, velocity: 80, duration: 1 },
        { x: 3, y: 67, velocity: 80, duration: 1 },
        { x: 4, y: 65, velocity: 80, duration: 1 },
        { x: 5, y: 62, velocity: 80, duration: 1 },
        { x: 6, y: 60, velocity: 80, duration: 1 }
      ];

      const analysis = ContourEngine.analyzeContour(contour);

      expect(analysis.segments).toBeDefined();
      expect(analysis.segments.length).toBeGreaterThan(0);
      expect(analysis.overallShape).toBeDefined();
      expect(analysis.characteristics).toBeDefined();
      expect(analysis.musicalProperties).toBeDefined();
      expect(analysis.schillingerAnalysis).toBeDefined();

      // Should detect ascending then descending pattern
      expect(analysis.characteristics.direction).toBe('ascending_dominant');

      // Should have some symmetry for this shape
      expect(analysis.overallShape.symmetry).toBeGreaterThan(0);
    });

    it('should segment contours properly', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },   // Start
        { x: 1, y: 62, velocity: 80, duration: 1 },   // Ascending
        { x: 2, y: 64, velocity: 80, duration: 1 },   // Ascending
        { x: 3, y: 66, velocity: 80, duration: 1 },   // Ascending
        { x: 4, y: 66, velocity: 80, duration: 1 },   // Plateau
        { x: 5, y: 64, velocity: 80, duration: 1 },   // Descending
        { x: 6, y: 62, velocity: 80, duration: 1 },   // Descending
        { x: 7, y: 60, velocity: 80, duration: 1 }    // Descending
      ];

      const analysis = ContourEngine.analyzeContour(contour);

      expect(analysis.segments.length).toBeGreaterThan(2); // Should have multiple segments

      // Check segment properties
      analysis.segments.forEach(segment => {
        expect(segment.points.length).toBeGreaterThan(0);
        expect(segment.direction).toMatch(/^(ascending|descending|static)$/);
        expect(typeof segment.slope).toBe('number');
        expect(typeof segment.tension).toBe('number');
      });
    });

    it('should calculate musical properties correctly', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 },  // Tension peak
        { x: 3, y: 67, velocity: 80, duration: 1 },
        { x: 4, y: 64, velocity: 80, duration: 1 },  // Resolution
        { x: 5, y: 66, velocity: 80, duration: 1 },
        { x: 6, y: 68, velocity: 80, duration: 1 },
        { x: 7, y: 66, velocity: 80, duration: 1 }
      ];

      const analysis = ContourEngine.analyzeContour(contour);

      expect(analysis.musicalProperties.tensionProfile).toBeDefined();
      expect(analysis.musicalProperties.tensionProfile.length).toBeGreaterThan(0);
      expect(analysis.musicalProperties.tensionProfile.every(t => t >= 0 && t <= 1)).toBe(true);

      expect(analysis.musicalProperties.resolutionPoints).toBeDefined();
      expect(analysis.musicalProperties.climaxPoints).toBeDefined();
      expect(analysis.musicalProperties.stability).toBeGreaterThanOrEqual(0);
      expect(analysis.musicalProperties.stability).toBeLessThanOrEqual(1);
    });

    it('should perform Schillinger analysis', () => {
      const contour = ContourEngine.generateContour('schillinger_wave', {
        length: 24,
        range: { min: 48, max: 72 },
        style: 'smooth',
        complexity: 'moderate'
      });

      const analysis = ContourEngine.analyzeContour(contour);

      expect(analysis.schillingerAnalysis.interferencePatterns).toBeDefined();
      expect(analysis.schillingerAnalysis.resultantStructure).toBeDefined();
      expect(analysis.schillingerAnalysis.expansionPotential).toBeGreaterThanOrEqual(0);
      expect(analysis.schillingerAnalysis.expansionPotential).toBeLessThanOrEqual(1);

      // Should find some interference patterns
      expect(analysis.schillingerAnalysis.interferencePatterns.length).toBeGreaterThan(0);
    });

    it('should handle empty and single-point contours', () => {
      const emptyContour: ContourPoint[] = [];
      const singlePoint: ContourPoint[] = [{ x: 0, y: 60, velocity: 80, duration: 1 }];

      // Should not crash on empty contour
      expect(() => ContourEngine.analyzeContour(emptyContour)).not.toThrow();

      // Should analyze single point
      const singleAnalysis = ContourEngine.analyzeContour(singlePoint);
      expect(singleAnalysis.characteristics.range).toBe(0);
    });
  });

  describe('Contour Transformation', () => {
    it('should apply rotation transformation', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const transformation: ContourTransformation = {
        type: 'rotation',
        parameters: { angle: Math.PI / 4 } as TransformationParameters,
        resultingShape: {
          type: 'linear',
          parameters: { amplitude: 5, frequency: 1, phase: 0, offset: 65 },
          symmetry: 0.8,
          complexity: 0.5,
          elegance: 0.7
        }
      };

      const transformed = ContourEngine.transformContour(contour, transformation);

      expect(transformed).toHaveLength(3);
      expect(transformed[0].x).not.toBe(contour[0].x); // Should be rotated
      expect(transformed[0].y).not.toBe(contour[0].y);
    });

    it('should apply reflection transformation', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const transformation: ContourTransformation = {
        type: 'reflection',
        parameters: { axis: 'x' } as TransformationParameters,
        resultingShape: {
          type: 'linear',
          parameters: { amplitude: 5, frequency: 1, phase: 0, offset: 65 },
          symmetry: 1,
          complexity: 0.5,
          elegance: 0.7
        }
      };

      const transformed = ContourEngine.transformContour(contour, transformation);

      expect(transformed).toHaveLength(3);
      // Reflection across x-axis should invert y-coordinates around center
      const centerY = contour.reduce((sum, p) => sum + p.y, 0) / contour.length;
      transformed.forEach((point, i) => {
        expect(Math.abs(point.y - (2 * centerY - contour[i].y))).toBeLessThan(0.001);
      });
    });

    it('should apply scaling transformation', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const transformation: ContourTransformation = {
        type: 'scaling',
        parameters: { scaleX: 1.5, scaleY: 2 } as TransformationParameters,
        resultingShape: {
          type: 'linear',
          parameters: { amplitude: 10, frequency: 1, phase: 0, offset: 65 },
          symmetry: 0.8,
          complexity: 0.5,
          elegance: 0.7
        }
      };

      const transformed = ContourEngine.transformContour(contour, transformation);

      expect(transformed).toHaveLength(3);
      // Check that scaling is applied
      const centerY = contour.reduce((sum, p) => sum + p.y, 0) / contour.length;
      const transformedCenterY = transformed.reduce((sum, p) => sum + p.y, 0) / transformed.length;
      const expectedY = centerY + 2 * (contour[1].y - centerY); // scaleY = 2
      expect(Math.abs(transformed[1].y - expectedY)).toBeLessThan(0.001);
    });

    it('should apply morph transformation', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 64, velocity: 80, duration: 1 }
      ];

      const transformation: ContourTransformation = {
        type: 'morph',
        parameters: {
          morphTarget: {
            type: 'bell_curve',
            parameters: { amplitude: 4, frequency: 1, phase: 0, offset: 62 },
            symmetry: 1,
            complexity: 0.5,
            elegance: 0.9
          },
          blendRatio: 0.5
        } as TransformationParameters,
        resultingShape: {
          type: 'bell_curve',
          parameters: { amplitude: 4, frequency: 1, phase: 0, offset: 62 },
          symmetry: 1,
          complexity: 0.5,
          elegance: 0.9
        }
      };

      const transformed = ContourEngine.transformContour(contour, transformation);

      expect(transformed).toHaveLength(3);
      // Morph should create intermediate values
      transformed.forEach((point, i) => {
        expect(point.y).toBeGreaterThanOrEqual(Math.min(contour[i].y - 2, contour[i].y));
        expect(point.y).toBeLessThanOrEqual(Math.max(contour[i].y + 2, contour[i].y));
      });
    });

    it('should handle unsupported transformation types', () => {
      const contour: ContourPoint[] = [{ x: 0, y: 60, velocity: 80, duration: 1 }];

      const transformation: ContourTransformation = {
        type: 'unsupported' as any,
        parameters: {},
        resultingShape: {
          type: 'linear',
          parameters: { amplitude: 1, frequency: 1, phase: 0, offset: 60 },
          symmetry: 1,
          complexity: 0,
          elegance: 1
        }
      };

      expect(() => ContourEngine.transformContour(contour, transformation)).toThrow();
    });
  });

  describe('Contour Comparison', () => {
    it('should compare similar contours correctly', () => {
      const contour1: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 64, velocity: 80, duration: 1 }
      ];

      const contour2: ContourPoint[] = [
        { x: 0, y: 61, velocity: 80, duration: 1 },
        { x: 1, y: 63, velocity: 80, duration: 1 },
        { x: 2, y: 65, velocity: 80, duration: 1 }
      ];

      const comparison = ContourEngine.compareContours(contour1, contour2);

      expect(comparison.similarity).toBeGreaterThan(0.8); // Should be very similar
      expect(comparison.correspondence).toHaveLength(3);
      expect(comparison.differences.overall).toBeLessThan(0.2);
      expect(comparison.transformation).toBeDefined();
    });

    it('should compare different contours correctly', () => {
      const ascending: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 64, velocity: 80, duration: 1 }
      ];

      const descending: ContourPoint[] = [
        { x: 0, y: 64, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 60, velocity: 80, duration: 1 }
      ];

      const comparison = ContourEngine.compareContours(ascending, descending);

      expect(comparison.similarity).toBeLessThan(0.5); // Should be quite different
      expect(comparison.differences.pitch).toBeGreaterThan(0.5);
    });

    it('should handle contours of different lengths', () => {
      const short: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 }
      ];

      const long: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 61, velocity: 80, duration: 1 },
        { x: 2, y: 62, velocity: 80, duration: 1 },
        { x: 3, y: 63, velocity: 80, duration: 1 }
      ];

      const comparison = ContourEngine.compareContours(short, long);

      expect(comparison.similarity).toBeGreaterThanOrEqual(0);
      expect(comparison.similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('Contour Variations', () => {
    it('should generate inversion variations', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const variations = ContourEngine.generateVariations(contour, ['inversion'], {
        count: 1,
        intensity: 1,
        preserveCharacter: false
      });

      expect(variations).toHaveLength(1);
      expect(variations[0]).toHaveLength(3);

      // Inversion should flip around center
      const centerY = contour.reduce((sum, p) => sum + p.y, 0) / contour.length;
      variations[0].forEach((point, i) => {
        expect(Math.abs(point.y - (2 * centerY - contour[i].y))).toBeLessThan(1);
      });
    });

    it('should generate retrograde variations', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const variations = ContourEngine.generateVariations(contour, ['retrograde'], {
        count: 1,
        intensity: 1,
        preserveCharacter: false
      });

      expect(variations).toHaveLength(1);
      expect(variations[0]).toHaveLength(3);

      // Retrograde should reverse the contour
      expect(variations[0][0].y).toBeCloseTo(contour[2].y, 0);
      expect(variations[0][1].y).toBeCloseTo(contour[1].y, 0);
      expect(variations[0][2].y).toBeCloseTo(contour[0].y, 0);
    });

    it('should generate augmentation variations', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const variations = ContourEngine.generateVariations(contour, ['augmentation'], {
        count: 1,
        intensity: 0.5,
        preserveCharacter: false
      });

      expect(variations).toHaveLength(1);
      expect(variations[0]).toHaveLength(3);

      // Augmentation should expand time
      expect(variations[0][1].x).toBeGreaterThan(contour[1].x);
      expect(variations[0][2].x).toBeGreaterThan(contour[2].x);
    });

    it('should generate sequence variations', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const variations = ContourEngine.generateVariations(contour, ['sequence'], {
        count: 1,
        intensity: 0.3,
        preserveCharacter: false
      });

      expect(variations).toHaveLength(1);
      expect(variations[0].length).toBeGreaterThan(contour.length);

      // Sequence should repeat with transposition
      const transposition = Math.round(0.3 * 5); // intensity * 5 semitones max
      expect(variations[0][3].y).toBeCloseTo(contour[0].y + transposition, 0);
    });

    it('should generate ornamentation variations', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 2 },  // Long note for trill
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const variations = ContourEngine.generateVariations(contour, ['ornamentation'], {
        count: 1,
        intensity: 0.5,
        preserveCharacter: false
      });

      expect(variations).toHaveLength(1);
      expect(variations[0].length).toBeGreaterThan(contour.length);

      // Should have additional points for ornaments
      const additionalPoints = variations[0].length - contour.length;
      expect(additionalPoints).toBeGreaterThan(0);
    });

    it('should generate multiple variation types', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const variations = ContourEngine.generateVariations(contour, ['inversion', 'retrograde', 'augmentation'], {
        count: 1,
        intensity: 0.5,
        preserveCharacter: true
      });

      expect(variations).toHaveLength(3); // One variation for each type
      variations.forEach(variation => {
        expect(variation.length).toBeGreaterThan(0);
      });
    });

    it('should preserve character when requested', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const preservedVariation = ContourEngine.generateVariations(contour, ['inversion'], {
        count: 1,
        intensity: 0.5,
        preserveCharacter: true
      })[0];

      const fullInversion = ContourEngine.generateVariations(contour, ['inversion'], {
        count: 1,
        intensity: 1,
        preserveCharacter: false
      })[0];

      // Preserved variation should be closer to original
      const preservedDiff = preservedVariation.reduce((sum, point, i) =>
        sum + Math.abs(point.y - contour[i].y), 0);
      const fullDiff = fullInversion.reduce((sum, point, i) =>
        sum + Math.abs(point.y - contour[i].y), 0);

      expect(preservedDiff).toBeLessThan(fullDiff);
    });
  });

  describe('Contour Conversion', () => {
    it('should extract contour from melodic line', () => {
      const melody = {
        pitches: [60, 62, 64, 65, 64, 62, 60],
        durations: [1, 1, 1, 1, 1, 1, 1],
        velocities: [80, 85, 90, 95, 90, 85, 80]
      };

      const contour = ContourEngine.extractContour(melody);

      expect(contour).toHaveLength(7);
      contour.forEach((point, index) => {
        expect(point.x).toBe(index);
        expect(point.y).toBe(melody.pitches[index]);
        expect(point.velocity).toBe(melody.velocities[index]);
        expect(point.duration).toBe(melody.durations[index]);
      });
    });

    it('should convert contour back to melodic line', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 85, duration: 0.5 },
        { x: 2, y: 64, velocity: 90, duration: 1.5 }
      ];

      const melody = ContourEngine.contourToMelody(contour);

      expect(melody.pitches).toEqual([60, 62, 64]);
      expect(melody.durations).toEqual([1, 0.5, 1.5]);
      expect(melody.velocities).toEqual([80, 85, 90]);
    });

    it('should round pitch values when converting to melody', () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60.7, velocity: 80, duration: 1 },
        { x: 1, y: 62.3, velocity: 85, duration: 1 },
        { x: 2, y: 63.9, velocity: 90, duration: 1 }
      ];

      const melody = ContourEngine.contourToMelody(contour);

      expect(melody.pitches).toEqual([61, 62, 64]); // Rounded values
      expect(melody.velocities).toEqual([80, 85, 90]); // Rounded values
    });
  });
});

describe('ContourAPI', () => {
  describe('Advanced Contour Generation', () => {
    it('should generate advanced contours with analysis', async () => {
      const options: ContourGenerationOptions = {
        length: 16,
        range: { min: 50, max: 80 },
        style: 'smooth',
        complexity: 'moderate'
      };

      const result = await ContourAPI.generateAdvancedContour('bell_curve', options);

      expect(result.contour).toHaveLength(16);
      expect(result.analysis).toBeDefined();
      expect(result.metadata).toBeDefined();

      expect(result.metadata.complexity).toBeGreaterThanOrEqual(0);
      expect(result.metadata.complexity).toBeLessThanOrEqual(1);
      expect(result.metadata.elegance).toBeGreaterThanOrEqual(0);
      expect(result.metadata.elegance).toBeLessThanOrEqual(1);
      expect(result.metadata.tension).toBeGreaterThanOrEqual(0);
      expect(result.metadata.tension).toBeLessThanOrEqual(1);

      // Bell curve should have high elegance
      expect(result.metadata.elegance).toBeGreaterThan(0.6);
    });

    it('should generate different complexities for the same shape', async () => {
      const baseOptions: ContourGenerationOptions = {
        length: 12,
        range: { min: 55, max: 75 },
        style: 'smooth',
        complexity: 'simple'
      };

      const simple = await ContourAPI.generateAdvancedContour('sinusoidal', {
        ...baseOptions,
        complexity: 'simple'
      });

      const complex = await ContourAPI.generateAdvancedContour('sinusoidal', {
        ...baseOptions,
        complexity: 'complex'
      });

      expect(simple.metadata.complexity).toBeLessThan(complex.metadata.complexity);
      expect(simple.contour).toHaveLength(12);
      expect(complex.contour).toHaveLength(12);
    });
  });

  describe('Intelligent Contour Transformation', () => {
    it('should transform contours with quality assessment', async () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 64, velocity: 80, duration: 1 },
        { x: 3, y: 66, velocity: 80, duration: 1 }
      ];

      const transformation: ContourTransformation = {
        type: 'reflection',
        parameters: { axis: 'x' } as TransformationParameters,
        resultingShape: {
          type: 'linear',
          parameters: { amplitude: 3, frequency: 1, phase: 0, offset: 63 },
          symmetry: 1,
          complexity: 0.5,
          elegance: 0.7
        }
      };

      const result = await ContourAPI.transformContour(contour, transformation);

      expect(result.transformedContour).toHaveLength(4);
      expect(result.analysis).toBeDefined();
      expect(result.quality).toBeGreaterThanOrEqual(0);
      expect(result.quality).toBeLessThanOrEqual(1);

      // Should have decent quality for a simple reflection
      expect(result.quality).toBeGreaterThan(0.3);
    });

    it('should assess quality correctly for different transformations', async () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 63, velocity: 80, duration: 1 },
        { x: 2, y: 66, velocity: 80, duration: 1 },
        { x: 3, y: 69, velocity: 80, duration: 1 }
      ];

      const simpleTransform: ContourTransformation = {
        type: 'scaling',
        parameters: { scaleX: 1.1, scaleY: 1.1 } as TransformationParameters,
        resultingShape: {
          type: 'linear',
          parameters: { amplitude: 4.5, frequency: 1, phase: 0, offset: 64.5 },
          symmetry: 1,
          complexity: 0.5,
          elegance: 0.8
        }
      };

      const extremeTransform: ContourTransformation = {
        type: 'warp',
        parameters: {
          warpFunction: (point) => ({
            ...point,
            y: point.y + (Math.random() - 0.5) * 20 // Large random variation
          })
        } as TransformationParameters,
        resultingShape: {
          type: 'schillinger_wave',
          parameters: { amplitude: 10, frequency: 3, phase: 0, offset: 65 },
          symmetry: 0.3,
          complexity: 0.9,
          elegance: 0.2
        }
      };

      const simpleResult = await ContourAPI.transformContour(contour, simpleTransform);
      const extremeResult = await ContourAPI.transformContour(contour, extremeTransform);

      expect(simpleResult.quality).toBeGreaterThan(extremeResult.quality);
      expect(simpleResult.quality).toBeGreaterThan(0.5);
    });
  });

  describe('Contour Comparison and Analysis', () => {
    it('should compare contours with relationship analysis', async () => {
      const similar1: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 64, velocity: 80, duration: 1 }
      ];

      const similar2: ContourPoint[] = [
        { x: 0, y: 61, velocity: 80, duration: 1 },
        { x: 1, y: 63, velocity: 80, duration: 1 },
        { x: 2, y: 65, velocity: 80, duration: 1 }
      ];

      const different: ContourPoint[] = [
        { x: 0, y: 70, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 60, velocity: 80, duration: 1 }
      ];

      const similarResult = await ContourAPI.compareContours(similar1, similar2);
      const differentResult = await ContourAPI.compareContours(similar1, different);

      expect(similarResult.comparison.similarity).toBeGreaterThan(0.8);
      expect(similarResult.relationship).toBe('similar');

      expect(differentResult.comparison.similarity).toBeLessThan(0.7);
      expect(differentResult.relationship).toMatch(/^(related|variant|independent)$/);

      expect(similarResult.analysis1).toBeDefined();
      expect(similarResult.analysis2).toBeDefined();
    });

    it('should correctly categorize relationships', async () => {
      const original: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 65, velocity: 80, duration: 1 },
        { x: 2, y: 70, velocity: 80, duration: 1 }
      ];

      const identical = original.map(p => ({ ...p }));
      const slightVariant = original.map(p => ({ ...p, y: p.y + 1 }));
      const independent = [
        { x: 0, y: 72, velocity: 80, duration: 1 },
        { x: 1, y: 68, velocity: 80, duration: 1 },
        { x: 2, y: 72, velocity: 80, duration: 1 }
      ];

      const identicalResult = await ContourAPI.compareContours(original, identical);
      const variantResult = await ContourAPI.compareContours(original, slightVariant);
      const independentResult = await ContourAPI.compareContours(original, independent);

      expect(identicalResult.relationship).toBe('similar');
      expect(variantResult.relationship).toMatch(/^(similar|related)$/);
      expect(independentResult.relationship).toMatch(/^(variant|independent)$/);
    });
  });

  describe('Intelligent Contour Variations', () => {
    it('should generate variations with analysis and recommendations', async () => {
      const contour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 64, velocity: 80, duration: 1 },
        { x: 2, y: 68, velocity: 80, duration: 1 },
        { x: 3, y: 72, velocity: 80, duration: 1 }
      ];

      const result = await ContourAPI.generateContourVariations(contour, {
        variationTypes: ['inversion', 'retrograde', 'sequence'],
        count: 1,
        intensity: 0.5,
        preserveCharacter: true
      });

      expect(result.variations).toHaveLength(3);
      expect(result.analyses).toHaveLength(3);
      expect(result.recommendations).toBeDefined();

      result.analyses.forEach(analysis => {
        expect(analysis.overallShape).toBeDefined();
        expect(analysis.segments).toBeDefined();
        expect(analysis.characteristics).toBeDefined();
        expect(analysis.musicalProperties).toBeDefined();
      });

      // Should have at least some recommendations
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide meaningful recommendations', async () => {
      const elegantContour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 64, velocity: 80, duration: 1 },
        { x: 3, y: 62, velocity: 80, duration: 1 },
        { x: 4, y: 60, velocity: 80, duration: 1 }
      ];

      const result = await ContourAPI.generateContourVariations(elegantContour, {
        variationTypes: ['inversion'],
        count: 1,
        intensity: 1,
        preserveCharacter: true
      });

      // Should find elegance in the symmetrical contour
      const hasEleganceRecommendation = result.recommendations.some(rec =>
        rec.toLowerCase().includes('elegance') || rec.toLowerCase().includes('balance')
      );

      expect(hasEleganceRecommendation).toBe(true);
    });
  });

  describe('Schillinger Analysis', () => {
    it('should analyze Schillinger-specific properties', async () => {
      const contour = ContourEngine.generateContour('schillinger_wave', {
        length: 24,
        range: { min: 48, max: 72 },
        style: 'smooth',
        complexity: 'moderate'
      });

      const result = await ContourAPI.analyzeSchillingerProperties(contour);

      expect(result.analysis).toBeDefined();
      expect(result.schillingerReport).toBeDefined();

      expect(result.schillingerReport.interferencePatterns).toBeDefined();
      expect(result.schillingerReport.resultantStructure).toBeDefined();
      expect(result.schillingerReport.expansionPotential).toBeDefined();
      expect(result.schillingerReport.recommendations).toBeDefined();

      // Should find interference patterns in a Schillinger wave
      expect(result.schillingerReport.interferencePatterns.length).toBeGreaterThan(0);

      // Should provide recommendations
      expect(result.schillingerReport.recommendations.length).toBeGreaterThan(0);

      // Should classify expansion potential
      expect(['Low', 'Medium', 'High']).toContain(result.schillingerReport.expansionPotential);
    });

    it('should provide different recommendations based on contour properties', async () => {
      const symmetricalContour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 64, velocity: 80, duration: 1 },
        { x: 2, y: 68, velocity: 80, duration: 1 },
        { x: 3, y: 64, velocity: 80, duration: 1 },
        { x: 4, y: 60, velocity: 80, duration: 1 }
      ];

      const result = await ContourAPI.analyzeSchillingerProperties(symmetricalContour);

      // Should mention symmetry in recommendations
      const hasSymmetryRecommendation = result.schillingerReport.recommendations.some(rec =>
        rec.toLowerCase().includes('symmetry')
      );

      expect(hasSymmetryRecommendation).toBe(true);
      expect(result.analysis.characteristics.fractalDimension).toBeGreaterThanOrEqual(1);
      expect(result.analysis.schillingerAnalysis.resultantStructure.symmetry).toBeGreaterThan(0.5);
    });

    it('should handle expansion potential assessment', async () => {
      const simpleContour: ContourPoint[] = [
        { x: 0, y: 60, velocity: 80, duration: 1 },
        { x: 1, y: 62, velocity: 80, duration: 1 },
        { x: 2, y: 64, velocity: 80, duration: 1 }
      ];

      const complexContour: ContourPoint[] = Array(16).fill(null).map((_, i) => ({
        x: i,
        y: 60 + Math.sin(i * 0.5) * 8 + Math.random() * 4,
        velocity: 80,
        duration: 1
      }));

      const simpleResult = await ContourAPI.analyzeSchillingerProperties(simpleContour);
      const complexResult = await ContourAPI.analyzeSchillingerProperties(complexContour);

      // Complex contour should have higher expansion potential
      const simplePotential = simpleResult.analysis.schillingerAnalysis.expansionPotential;
      const complexPotential = complexResult.analysis.schillingerAnalysis.expansionPotential;

      expect(simplePotential).toBeGreaterThanOrEqual(0);
      expect(simplePotential).toBeLessThanOrEqual(1);
      expect(complexPotential).toBeGreaterThanOrEqual(0);
      expect(complexPotential).toBeLessThanOrEqual(1);
    });
  });
});

describe('Contour Performance and Validation', () => {
  it('should handle large contours efficiently', () => {
    const startTime = performance.now();

    const largeOptions: ContourGenerationOptions = {
      length: 1000,
      range: { min: 40, max: 80 },
      style: 'smooth',
      complexity: 'moderate'
    };

    const contour = ContourEngine.generateContour('sinusoidal', largeOptions);
    const endTime = performance.now();

    expect(contour).toHaveLength(1000);
    expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
  });

  it('should validate contour integrity', () => {
    const options: ContourGenerationOptions = {
      length: 50,
      range: { min: 50, max: 70 },
      style: 'smooth',
      complexity: 'moderate'
    };

    const contour = ContourEngine.generateContour('bell_curve', options);

    // All points should have valid properties
    contour.forEach((point, index) => {
      expect(typeof point.x).toBe('number');
      expect(typeof point.y).toBe('number');
      expect(typeof point.velocity).toBe('number');
      expect(typeof point.duration).toBe('number');

      expect(point.x).toBe(index);
      expect(point.y).toBeGreaterThanOrEqual(options.range.min);
      expect(point.y).toBeLessThanOrEqual(options.range.max);
      expect(point.velocity).toBeGreaterThanOrEqual(0);
      expect(point.velocity).toBeLessThanOrEqual(127);
      expect(point.duration).toBeGreaterThan(0);
    });
  });

  it('should maintain consistency across multiple generations', () => {
    const options: ContourGenerationOptions = {
      length: 20,
      range: { min: 55, max: 75 },
      style: 'smooth',
      complexity: 'moderate'
    };

    const contours = Array(5).fill(null).map(() =>
      ContourEngine.generateContour('triangle', options)
    );

    contours.forEach(contour => {
      expect(contour).toHaveLength(20);
      contour.forEach(point => {
        expect(point.y).toBeGreaterThanOrEqual(options.range.min);
        expect(point.y).toBeLessThanOrEqual(options.range.max);
      });
    });
  });
});