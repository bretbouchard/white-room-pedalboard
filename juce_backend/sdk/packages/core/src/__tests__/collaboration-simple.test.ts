/**
 * Simple tests for collaboration system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CollaborationManager,
  CollaborativeDocument,
  Operation,
} from '../collaboration';
import { Composition } from '@schillinger-sdk/shared';

describe('CollaborationManager Basic Tests', () => {
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

  it('should create CollaborationManager instance', () => {
    expect(collaborationManager).toBeDefined();
    expect(collaborationManager.getActiveSessions()).toHaveLength(0);
  });

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

    const participant = {
      id: 'user-1',
      name: 'Test User',
      role: 'editor' as const,
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

  it('should leave a session', async () => {
    const session = await collaborationManager.createSession(
      'Test Session',
      testDocument
    );

    const participant = {
      id: 'user-1',
      name: 'Test User',
      role: 'editor' as const,
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

  it('should apply update operation successfully', async () => {
    const session = await collaborationManager.createSession(
      'Test Session',
      testDocument
    );

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

  it('should detect concurrent edits to same path', async () => {
    const session = await collaborationManager.createSession(
      'Test Session',
      testDocument
    );

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

  it('should resolve conflict with overwrite strategy', async () => {
    const session = await collaborationManager.createSession(
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

    const conflictResult = await collaborationManager.applyOperation(
      session.id,
      op2
    );
    const conflict = conflictResult.conflicts![0];

    // Resolve with overwrite
    const newComposition = {
      ...testComposition,
      name: 'Overwritten Composition',
      tempo: 140,
    };

    const resolution = {
      strategy: 'overwrite' as const,
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

  it('should update participant cursor position', async () => {
    const session = await collaborationManager.createSession(
      'Test Session',
      testDocument
    );

    const participant = {
      id: 'user-1',
      name: 'Test User',
      role: 'editor' as const,
    };

    await collaborationManager.joinSession(session.id, participant);

    const cursor = {
      section: 'section-1',
      element: 'rhythm',
      position: 5,
    };

    collaborationManager.updateCursor(session.id, 'user-1', cursor);

    const updatedSession = collaborationManager.getSession(session.id);
    const updatedParticipant = updatedSession?.participants.find(
      p => p.id === 'user-1'
    );

    expect(updatedParticipant?.cursor).toEqual(cursor);
    expect(updatedParticipant?.lastActive).toBeInstanceOf(Date);
  });

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

    const participant = {
      id: 'user-1',
      name: 'Test User',
      role: 'editor' as const,
    };

    await collaborationManager.joinSession(session.id, participant);

    expect(events).toHaveLength(1);
    expect(events[0].sessionId).toBe(session.id);
    expect(events[0].participant.id).toBe('user-1');
  });

  it('should get all active sessions', async () => {
    await collaborationManager.createSession('Session 1', testDocument);
    await collaborationManager.createSession('Session 2', testDocument);

    const sessions = collaborationManager.getActiveSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.map(s => s.name)).toContain('Session 1');
    expect(sessions.map(s => s.name)).toContain('Session 2');
  });

  it('should handle invalid path gracefully', async () => {
    const session = await collaborationManager.createSession(
      'Test Session',
      testDocument
    );

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
