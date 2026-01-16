/**
 * Tests for collaboration and conflict resolution system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  CollaborationManager,
  CollaborativeSession,
  Operation,
  Conflict,
  ConflictResolution,
  CollaborativeDocument,
  Participant,
} from '../collaboration';
import { Composition } from '@schillinger-sdk/shared';

describe('CollaborationManager', () => {
  let collaborationManager: CollaborationManager;
  let testDocument: CollaborativeDocument;
  let testComposition: Composition;

  beforeEach(() => {
    collaborationManager = new CollaborationManager();

    testComposition = {
      id: 'comp-1',
      name: 'Test Composition',
      sections: [],
      key: 'C',
      scale: 'major',
      tempo: 120,
      timeSignature: [4, 4],
    };

    testDocument = {
      id: 'doc-1',
      type: 'composition',
      content: testComposition,
      version: 1,
      operations: [],
    };
  });

  describe('Session Management', () => {
    it('should create a new collaborative session', async () => {
      const session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      expect(session.id).toBeDefined();
      expect(session.name).toBe('Test Session');
      expect(session.document.content).toEqual(testComposition);
      expect(session.participants).toHaveLength(0);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastModified).toBeInstanceOf(Date);
    });

    it('should join a session', async () => {
      const session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      const participant: Omit<Participant, 'joinedAt' | 'lastActive'> = {
        id: 'user-1',
        name: 'Test User',
        role: 'editor',
      };

      await collaborationManager.joinSession(session.id, participant);

      const updatedSession = collaborationManager.getSession(session.id);
      expect(updatedSession?.participants).toHaveLength(1);
      expect(updatedSession?.participants[0].id).toBe('user-1');
      expect(updatedSession?.participants[0].name).toBe('Test User');
      expect(updatedSession?.participants[0].role).toBe('editor');
      expect(updatedSession?.participants[0].joinedAt).toBeInstanceOf(Date);
      expect(updatedSession?.participants[0].lastActive).toBeInstanceOf(Date);
    });

    it('should update existing participant when rejoining', async () => {
      const session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      const participant: Omit<Participant, 'joinedAt' | 'lastActive'> = {
        id: 'user-1',
        name: 'Test User',
        role: 'editor',
      };

      await collaborationManager.joinSession(session.id, participant);

      // Rejoin with updated info
      const updatedParticipant = {
        ...participant,
        name: 'Updated User',
        role: 'owner' as const,
      };

      await collaborationManager.joinSession(session.id, updatedParticipant);

      const updatedSession = collaborationManager.getSession(session.id);
      expect(updatedSession?.participants).toHaveLength(1);
      expect(updatedSession?.participants[0].name).toBe('Updated User');
      expect(updatedSession?.participants[0].role).toBe('owner');
    });

    it('should leave a session', async () => {
      const session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      const participant: Omit<Participant, 'joinedAt' | 'lastActive'> = {
        id: 'user-1',
        name: 'Test User',
        role: 'editor',
      };

      await collaborationManager.joinSession(session.id, participant);
      expect(
        collaborationManager.getSession(session.id)?.participants
      ).toHaveLength(1);

      await collaborationManager.leaveSession(session.id, 'user-1');
      expect(
        collaborationManager.getSession(session.id)?.participants
      ).toHaveLength(0);
    });

    it('should get all active sessions', async () => {
      await collaborationManager.createSession('Session 1', testDocument);
      await collaborationManager.createSession('Session 2', testDocument);

      const sessions = collaborationManager.getActiveSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.name)).toContain('Session 1');
      expect(sessions.map(s => s.name)).toContain('Session 2');
    });
  });

  describe('Operation Application', () => {
    let session: CollaborativeSession;

    beforeEach(async () => {
      session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );
    });

    it('should apply update operation successfully', async () => {
      const operation: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'Updated Composition',
        oldValue: 'Test Composition',
        userId: 'user-1',
        version: 1,
      };

      const result = await collaborationManager.applyOperation(
        session.id,
        operation
      );

      expect(result.success).toBe(true);
      expect(result.conflicts).toBeUndefined();

      const updatedSession = collaborationManager.getSession(session.id);
      expect((updatedSession?.document.content as Composition).name).toBe(
        'Updated Composition'
      );
      expect(updatedSession?.document.version).toBe(2);
      expect(updatedSession?.document.operations).toHaveLength(1);
    });

    it('should apply insert operation to array', async () => {
      // First add a sections array
      const addSectionsOp: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'sections',
        value: [],
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, addSectionsOp);

      // Then insert into the array
      const insertOp: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'insert',
        path: 'sections.0',
        value: {
          id: 'section-1',
          type: 'verse',
          rhythm: { durations: [1, 1, 1, 1], timeSignature: [4, 4] },
          harmony: { chords: ['C', 'F', 'G', 'C'], key: 'C', scale: 'major' },
          length: 4,
          position: 0,
        },
        userId: 'user-1',
        version: 2,
      };

      const result = await collaborationManager.applyOperation(
        session.id,
        insertOp
      );

      expect(result.success).toBe(true);

      const updatedSession = collaborationManager.getSession(session.id);
      const composition = updatedSession?.document.content as Composition;
      expect(composition.sections).toHaveLength(1);
      expect(composition.sections[0].type).toBe('verse');
    });

    it('should apply delete operation', async () => {
      // First set a value
      const setOp: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'metadata',
        value: { style: 'jazz' },
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, setOp);

      // Then delete it
      const deleteOp: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'delete',
        path: 'metadata',
        userId: 'user-1',
        version: 2,
      };

      const result = await collaborationManager.applyOperation(
        session.id,
        deleteOp
      );

      expect(result.success).toBe(true);

      const updatedSession = collaborationManager.getSession(session.id);
      const composition = updatedSession?.document.content as Composition;
      expect(composition.metadata).toBeUndefined();
    });

    it('should handle invalid path gracefully', async () => {
      const operation: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'nonexistent.deeply.nested.path',
        value: 'test',
        userId: 'user-1',
        version: 1,
      };

      const result = await collaborationManager.applyOperation(
        session.id,
        operation
      );

      expect(result.success).toBe(false);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Path not found');
    });
  });

  describe('Conflict Detection', () => {
    let session: CollaborativeSession;

    beforeEach(async () => {
      session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );
    });

    it('should detect concurrent edits to same path', async () => {
      // Apply first operation
      const op1: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'First Update',
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, op1);

      // Apply conflicting operation
      const op2: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'Second Update',
        userId: 'user-2',
        version: 1, // Same version - conflict!
      };

      const result = await collaborationManager.applyOperation(session.id, op2);

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts![0].type).toBe('concurrent_edit');
      expect(result.conflicts![0].participants).toContain('user-1');
      expect(result.conflicts![0].participants).toContain('user-2');
    });

    it('should detect version conflicts', async () => {
      // Apply operation with outdated version
      const operation: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'tempo',
        value: 140,
        userId: 'user-1',
        version: 0, // Outdated version
      };

      const result = await collaborationManager.applyOperation(
        session.id,
        operation
      );

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });

    it('should not conflict with operations from same user in short time window', async () => {
      const op1: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'First Update',
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, op1);

      // Immediate follow-up from same user
      const op2: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'Second Update',
        userId: 'user-1', // Same user
        version: 1,
      };

      const result = await collaborationManager.applyOperation(session.id, op2);

      expect(result.success).toBe(true); // Should not conflict
    });
  });

  describe('Conflict Resolution', () => {
    let session: CollaborativeSession;
    let conflict: Conflict;

    beforeEach(async () => {
      session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      // Create a conflict
      const op1: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'First Update',
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, op1);

      const op2: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'Second Update',
        userId: 'user-2',
        version: 1,
      };

      const result = await collaborationManager.applyOperation(session.id, op2);
      conflict = result.conflicts![0];
    });

    it('should resolve conflict with merge strategy', async () => {
      const resolution: ConflictResolution = {
        strategy: 'merge',
        resolvedData: { name: 'Merged Update' },
        timestamp: new Date(),
        resolvedBy: 'user-1',
      };

      const result = await collaborationManager.resolveConflict(
        conflict.id,
        resolution
      );

      expect(result.success).toBe(true);

      const updatedSession = collaborationManager.getSession(session.id);
      expect((updatedSession?.document.content as Composition).name).toBe(
        'Merged Update'
      );
    });

    it('should resolve conflict with overwrite strategy', async () => {
      const newComposition = {
        ...testComposition,
        name: 'Overwritten Composition',
        tempo: 140,
      };

      const resolution: ConflictResolution = {
        strategy: 'overwrite',
        resolvedData: newComposition,
        timestamp: new Date(),
        resolvedBy: 'user-1',
      };

      const result = await collaborationManager.resolveConflict(
        conflict.id,
        resolution
      );

      expect(result.success).toBe(true);

      const updatedSession = collaborationManager.getSession(session.id);
      const composition = updatedSession?.document.content as Composition;
      expect(composition.name).toBe('Overwritten Composition');
      expect(composition.tempo).toBe(140);
    });

    it('should resolve conflict with manual strategy', async () => {
      const manuallyResolvedData = {
        ...testComposition,
        name: 'Manually Resolved',
      };

      const resolution: ConflictResolution = {
        strategy: 'manual',
        resolvedData: manuallyResolvedData,
        timestamp: new Date(),
        resolvedBy: 'user-1',
        reasoning: 'User chose this resolution after discussion',
      };

      const result = await collaborationManager.resolveConflict(
        conflict.id,
        resolution
      );

      expect(result.success).toBe(true);

      const updatedSession = collaborationManager.getSession(session.id);
      expect((updatedSession?.document.content as Composition).name).toBe(
        'Manually Resolved'
      );
    });

    it('should handle unknown resolution strategy', async () => {
      const resolution: ConflictResolution = {
        strategy: 'unknown' as any,
        resolvedData: {},
        timestamp: new Date(),
        resolvedBy: 'user-1',
      };

      await expect(
        collaborationManager.resolveConflict(conflict.id, resolution)
      ).rejects.toThrow('Unknown resolution strategy: unknown');
    });

    it('should handle non-existent conflict', async () => {
      const resolution: ConflictResolution = {
        strategy: 'merge',
        resolvedData: {},
        timestamp: new Date(),
        resolvedBy: 'user-1',
      };

      await expect(
        collaborationManager.resolveConflict('non-existent', resolution)
      ).rejects.toThrow('Conflict non-existent not found');
    });
  });

  describe('Cursor Management', () => {
    let session: CollaborativeSession;

    beforeEach(async () => {
      session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      const participant: Omit<Participant, 'joinedAt' | 'lastActive'> = {
        id: 'user-1',
        name: 'Test User',
        role: 'editor',
      };

      await collaborationManager.joinSession(session.id, participant);
    });

    it('should update participant cursor position', () => {
      const cursor = {
        section: 'section-1',
        element: 'rhythm',
        position: 5,
      };

      collaborationManager.updateCursor(session.id, 'user-1', cursor);

      const updatedSession = collaborationManager.getSession(session.id);
      const participant = updatedSession?.participants.find(
        p => p.id === 'user-1'
      );

      expect(participant?.cursor).toEqual(cursor);
      expect(participant?.lastActive).toBeInstanceOf(Date);
    });

    it('should handle cursor update for non-existent participant', () => {
      const cursor = { section: 'section-1' };

      // Should not throw
      collaborationManager.updateCursor(session.id, 'non-existent', cursor);

      const session_after = collaborationManager.getSession(session.id);
      expect(session_after?.participants).toHaveLength(1);
    });

    it('should handle cursor update for non-existent session', () => {
      const cursor = { section: 'section-1' };

      // Should not throw
      collaborationManager.updateCursor('non-existent', 'user-1', cursor);
    });
  });

  describe('Event System', () => {
    it('should emit session created event', async () => {
      const events: any[] = [];
      collaborationManager.on('sessionCreated', session => {
        events.push(session);
      });

      const session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(session.id);
    });

    it('should emit participant joined event', async () => {
      const events: any[] = [];
      collaborationManager.on('participantJoined', event => {
        events.push(event);
      });

      const session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      const participant: Omit<Participant, 'joinedAt' | 'lastActive'> = {
        id: 'user-1',
        name: 'Test User',
        role: 'editor',
      };

      await collaborationManager.joinSession(session.id, participant);

      expect(events).toHaveLength(1);
      expect(events[0].sessionId).toBe(session.id);
      expect(events[0].participant.id).toBe('user-1');
    });

    it('should emit operation applied event', async () => {
      const events: any[] = [];
      collaborationManager.on('operationApplied', event => {
        events.push(event);
      });

      const session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      const operation: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'Updated Name',
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, operation);

      expect(events).toHaveLength(1);
      expect(events[0].sessionId).toBe(session.id);
      expect(events[0].operation.type).toBe('update');
    });

    it('should emit conflict detected event', async () => {
      const events: any[] = [];
      collaborationManager.on('conflictDetected', event => {
        events.push(event);
      });

      const session = await collaborationManager.createSession(
        'Test Session',
        testDocument
      );

      // Create conflict
      const op1: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'First Update',
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, op1);

      const op2: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'Second Update',
        userId: 'user-2',
        version: 1,
      };

      await collaborationManager.applyOperation(session.id, op2);

      expect(events).toHaveLength(1);
      expect(events[0].sessionId).toBe(session.id);
      expect(events[0].conflict.type).toBe('concurrent_edit');
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      collaborationManager.on('sessionCreated', listener);
      collaborationManager.off('sessionCreated', listener);

      // Create session - listener should not be called
      collaborationManager.createSession('Test Session', testDocument);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Session Queries', () => {
    let session1: CollaborativeSession;
    let session2: CollaborativeSession;

    beforeEach(async () => {
      session1 = await collaborationManager.createSession(
        'Session 1',
        testDocument
      );
      session2 = await collaborationManager.createSession(
        'Session 2',
        testDocument
      );
    });

    it('should get session conflicts', async () => {
      // Create conflict in session1
      const op1: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'First Update',
        userId: 'user-1',
        version: 1,
      };

      await collaborationManager.applyOperation(session1.id, op1);

      const op2: Omit<Operation, 'id' | 'timestamp'> = {
        type: 'update',
        path: 'name',
        value: 'Second Update',
        userId: 'user-2',
        version: 1,
      };

      await collaborationManager.applyOperation(session1.id, op2);

      const conflicts1 = collaborationManager.getSessionConflicts(session1.id);
      const conflicts2 = collaborationManager.getSessionConflicts(session2.id);

      expect(conflicts1).toHaveLength(1);
      expect(conflicts2).toHaveLength(0);
    });
  });
});
