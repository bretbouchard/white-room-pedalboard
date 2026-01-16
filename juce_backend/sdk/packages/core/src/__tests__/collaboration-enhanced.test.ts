/**
 * Tests for enhanced collaboration system with error attribution
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CollaborationManager } from '../collaboration';

describe('Enhanced Collaboration System', () => {
  let collaborationManager: CollaborationManager;
  let sessionId: string;

  beforeEach(async () => {
    collaborationManager = new CollaborationManager();

    // Create a test session
    const document = {
      id: 'test-doc',
      type: 'composition' as const,
      content: {
        sections: [],
        tempo: 120,
        key: 'C major'
      },
      version: 1,
      operations: []
    };

    const session = await collaborationManager.createSession(
      'Test Composition Session',
      document
    );
    sessionId = session.id;

    // Add participants with different profiles
    await collaborationManager.joinSession(sessionId, {
      id: 'user-1',
      name: 'Alice Composer',
      role: 'composer' as const,
      expertise: ['harmony', 'form'],
      attitude: 'engaged' as const,
      reliability: 90,
      contributionQuality: 85,
      status: 'online' as const,
      permissions: [{ action: 'all', scope: 'all' as const }]
    });

    await collaborationManager.joinSession(sessionId, {
      id: 'user-2',
      name: 'Bob Minimal',
      role: 'observer' as const,
      expertise: [],
      attitude: 'minimal' as const,
      reliability: 40,
      contributionQuality: 30,
      status: 'away' as const,
      permissions: [{ action: 'view', scope: 'all' as const }]
    });

    await collaborationManager.joinSession(sessionId, {
      id: 'user-3',
      name: 'Charlie Paycheck',
      role: 'editor' as const,
      expertise: ['rhythm'],
      attitude: 'skeptical' as const,
      reliability: 25,
      contributionQuality: 20,
      status: 'offline' as const,
      permissions: [{ action: 'edit', scope: 'own' as const }]
    });
  });

  describe('Error Attribution System', () => {
    it('should generate detailed error attribution report', () => {
      // Simulate some operations that lead to an error
      const operations = [
        {
          id: 'op-1',
          type: 'create' as const,
          timestamp: new Date(Date.now() - 10000),
          authorId: 'user-1',
          targetId: 'melody-section',
          targetType: 'melody' as const,
          data: { notes: [60, 62, 64, 65] },
          isReversible: true,
          metadata: {
            confidence: 0.9,
            complexity: 0.6,
            intention: 'Create main melody',
            expectations: ['Should work with harmony'],
            sentiment: 'positive' as const,
            motivation: 'passionate' as const
          }
        },
        {
          id: 'op-2',
          type: 'update' as const,
          timestamp: new Date(Date.now() - 5000),
          authorId: 'user-3',
          targetId: 'melody-section',
          targetType: 'melody' as const,
          data: { notes: [60, 60, 60, 60] }, // Problematic change
          isReversible: false,
          metadata: {
            confidence: 0.2,
            complexity: 0.9,
            intention: 'Simplify melody',
            expectations: ['This should be fine'],
            sentiment: 'skeptical' as const,
            motivation: 'paycheck_only' as const
          }
        },
        {
          id: 'op-3',
          type: 'delete' as const,
          timestamp: new Date(Date.now() - 2000),
          authorId: 'user-2',
          targetId: 'melody-section',
          targetType: 'melody' as const,
          data: null,
          isReversible: false,
          metadata: {
            confidence: 0.1,
            complexity: 0.8,
            intention: 'Remove problematic melody',
            expectations: ['No one will notice'],
            sentiment: 'negative' as const,
            motivation: 'minimal' as const
          }
        }
      ];

      // Add operations to session history
      const session = collaborationManager.getSession(sessionId);
      if (session) {
        operations.forEach(op => session.document.operations.push(op));
      }

      // Generate error attribution
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'melody-section',
        'Melody section is corrupted and cannot be played'
      );

      // Verify attribution structure
      expect(attribution).toBeDefined();
      expect(attribution.componentId).toBe('melody-section');
      expect(attribution.errorDescription).toContain('corrupted');
      expect(attribution.contributors).toHaveLength(3);
      expect(attribution.operations).toHaveLength(3);
      expect(attribution.timeline).toHaveLength(3);
      expect(attribution.recoveryRecommendations.length).toBeGreaterThan(0);
      expect(attribution.preventionSuggestions.length).toBeGreaterThan(0);

      // Check contributor attributions
      const aliceAttribution = attribution.contributors.find(c => c.userId === 'user-1');
      const bobAttribution = attribution.contributors.find(c => c.userId === 'user-2');
      const charlieAttribution = attribution.contributors.find(c => c.userId === 'user-3');

      expect(aliceAttribution).toBeDefined();
      expect(aliceAttribution.responsibility).toBe('low'); // Did the right thing
      expect(aliceAttribution.quality).toBeGreaterThan(80);
      expect(aliceAttribution.motivation).toBe('passionate');

      expect(bobAttribution).toBeDefined();
      expect(bobAttribution.responsibility).toBe('high'); // Deleted the section
      expect(bobAttribution.quality).toBeLessThan(50);
      expect(bobAttribution.motivation).toBe('minimal');

      expect(charlieAttribution).toBeDefined();
      expect(charlieAttribution.responsibility).toBe('high'); // Made problematic changes
      expect(charlieAttribution.quality).toBeLessThan(30);
      expect(charlieAttribution.motivation).toBe('paycheck_only');
    });

    it('should provide actionable recovery recommendations', () => {
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'test-component',
        'Test error description'
      );

      const recommendations = attribution.recoveryRecommendations;

      // Should have high, medium, and low priority recommendations
      const highPriority = recommendations.filter(r => r.priority === 'high');
      const mediumPriority = recommendations.filter(r => r.priority === 'medium');

      expect(highPriority.length).toBeGreaterThan(0);
      expect(mediumPriority.length).toBeGreaterThan(0);

      // High priority should have responsible parties
      highPriority.forEach(rec => {
        expect(rec.responsible).toBeDefined();
        expect(rec.estimatedTime).toBeGreaterThan(0);
        expect(rec.alternatives.length).toBeGreaterThan(0);
      });
    });

    it('should suggest prevention strategies based on patterns', () => {
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'test-component',
        'Test error description'
      );

      const suggestions = attribution.preventionSuggestions;

      expect(suggestions.length).toBeGreaterThan(0);

      // Should include different categories
      const categories = new Set(suggestions.map(s => s.category));
      expect(categories.size).toBeGreaterThan(1);

      // Each suggestion should have implementation details
      suggestions.forEach(suggestion => {
        expect(suggestion.implementer).toBeDefined();
        expect(suggestion.timeline).toBeDefined();
        expect(suggestion.effort).toMatch(/^(low|medium|high)$/);
      });
    });

    it('should track participant profiles and quality metrics', () => {
      // Get participant profiles
      const aliceProfile = collaborationManager.getParticipantProfile('user-1');
      const charlieProfile = collaborationManager.getParticipantProfile('user-3');

      expect(aliceProfile).toBeDefined();
      expect(charlieProfile).toBeDefined();

      if (aliceProfile) {
        expect(aliceProfile.reliability).toBeGreaterThan(80);
        expect(aliceProfile.contributionQuality).toBeGreaterThan(80);
        expect(aliceProfile.motivation).toBe('professional');
      }

      if (charlieProfile) {
        expect(charlieProfile.errorRate).toBeGreaterThan(10);
        expect(charlieProfile.conflictResolution).toBeLessThan(50);
      }
    });
  });

  describe('Error Timeline and Impact Assessment', () => {
    it('should create detailed error timeline', () => {
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'timeline-test',
        'Error for timeline testing'
      );

      const timeline = attribution.timeline;

      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);

      timeline.forEach(entry => {
        expect(entry.timestamp).toBeInstanceOf(Date);
        expect(entry.operation).toBeDefined();
        expect(entry.author).toBeDefined();
        expect(entry.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(entry.confidence).toBeGreaterThanOrEqual(0);
        expect(entry.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should assess comprehensive error impact', () => {
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'impact-test',
        'Error for impact testing'
      );

      const impact = attribution.impactAssessment;

      expect(impact).toBeDefined();
      expect(impact.technicalComplexity).toBeGreaterThanOrEqual(0);
      expect(impact.technicalComplexity).toBeLessThanOrEqual(1);
      expect(impact.userExperienceImpact).toBeGreaterThanOrEqual(0);
      expect(impact.userExperienceImpact).toBeLessThanOrEqual(1);
      expect(impact.recoveryDifficulty).toBeGreaterThanOrEqual(0);
      expect(impact.recoveryDifficulty).toBeLessThanOrEqual(1);
      expect(impact.businessImpact).toBeGreaterThanOrEqual(0);
      expect(impact.businessImpact).toBeLessThanOrEqual(1);
      expect(impact.affectedComponents).toBeGreaterThan(0);
      expect(impact.stakeholderImpact).toBeDefined();
      expect(Array.isArray(impact.stakeholderImpact)).toBe(true);
    });
  });

  describe('Attitude and Motivation Analysis', () => {
    it('should correctly assess participant attitudes', () => {
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'attitude-test',
        'Error for attitude testing'
      );

      const contributors = attribution.contributors;

      contributors.forEach(contributor => {
        expect(contributor.attitude).toBeDefined();
        expect(contributor.attitude.engagement).toMatch(/^(high|medium|low)$/);
        expect(contributor.attitude.collaboration).toMatch(/^(excellent|good|fair|poor)$/);
        expect(contributor.attitude.reliability).toMatch(/^(high|medium|low)$/);
        expect(Array.isArray(contributor.attitude.comments)).toBe(true);

        // Check for attitude-specific comments
        if (contributor.motivation === 'paycheck_only') {
          const hasPaycheckComment = contributor.attitude.comments.some(
            comment => comment.includes('paycheck')
          );
          expect(hasPaycheckComment).toBe(true);
        }
      });
    });

    it('should deduce motivation from behavior patterns', () => {
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'motivation-test',
        'Error for motivation testing'
      );

      const contributors = attribution.contributors;

      contributors.forEach(contributor => {
        expect(contributor.motivation).toMatch(
          /^(passionate|professional|minimal|paycheck_only)$/
        );
      });
    });
  });

  describe('Collaboration Quality Metrics', () => {
    it('should calculate contribution quality accurately', () => {
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'quality-test',
        'Error for quality testing'
      );

      const contributors = attribution.contributors;

      contributors.forEach(contributor => {
        expect(contributor.quality).toBeGreaterThanOrEqual(0);
        expect(contributor.quality).toBeLessThanOrEqual(100);
      });
    });

    it('should assess responsibility levels appropriately', () => {
      const attribution = collaborationManager.generateErrorAttribution(
        sessionId,
        'responsibility-test',
        'Error for responsibility testing'
      );

      const contributors = attribution.contributors;

      contributors.forEach(contributor => {
        expect(contributor.responsibility).toMatch(
          /^(high|medium|low|none)$/
        );
      });
    });
  });
});