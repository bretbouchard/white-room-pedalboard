import { describe, it, expect } from 'vitest';
import { createNodeAddOperation, createNodeRemoveOperation, transform } from '@/lib/collaboration/operational-transforms';

describe('Multi-User Collaboration Scenarios', () => {
  it('should create operations with correct structure', () => {
    const operation1 = createNodeAddOperation('user1', { id: 'node1', type: 'track', position: { x: 100, y: 100 } });
    const operation2 = createNodeRemoveOperation('user2', 'node1');

    expect(operation1).toMatchObject({
      type: 'node_add',
      userId: 'user1',
      view: 'daw',
      data: { id: 'node1', type: 'track', position: { x: 100, y: 100 } }
    });

    expect(operation2).toMatchObject({
      type: 'node_remove',
      userId: 'user2',
      view: 'daw',
      data: { nodeId: 'node1' }
    });
  });

  it('should handle operational transforms correctly', () => {
    const operation1 = createNodeAddOperation('user1', { id: 'node1', type: 'track', position: { x: 100, y: 100 } });
    const operation2 = createNodeAddOperation('user2', { id: 'node2', type: 'section', position: { x: 200, y: 200 } });

    // Transform should return a Transform object
    const result = transform(operation1, operation2);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('before');
    expect(result).toHaveProperty('after');
    expect(typeof result.before).toBe('object');
    expect(typeof result.after).toBe('object');
  });

  it('should handle different views without conflicts', () => {
    const dawOperation = createNodeAddOperation('user1', { id: 'node1', type: 'track' }, 'daw');
    const theoryOperation = createNodeAddOperation('user2', { id: 'node1', type: 'chord' }, 'theory');

    const result = transform(dawOperation, theoryOperation);

    // Operations on different views should not conflict - second op is returned unchanged
    expect(result).toBeDefined();
    expect(result.before).toBe(theoryOperation);
    expect(result.after).toBe(theoryOperation);
  });

  it('should handle same-node conflicts', () => {
    const addOp = createNodeAddOperation('user1', { id: 'node1', type: 'track', position: { x: 100, y: 100 } });
    const deleteOp = createNodeRemoveOperation('user2', 'node1');

    const result = transform(addOp, deleteOp);

    // Transform should handle add/delete conflicts - add operation wins, delete becomes noop
    expect(result).toBeDefined();
    expect(result.before.type).toBe('node_remove');
    expect(result.after.type).toBe('noop');
  });

  it('should manage operation timestamps and revisions', () => {
    const now = Date.now();
    const operation = createNodeAddOperation('user1', { id: 'node1', type: 'track' }, 'daw', 1);

    expect(operation.timestamp).toBeGreaterThanOrEqual(now);
    expect(operation.revision).toBe(1);
    expect(operation.id).toBeDefined();
    expect(typeof operation.id).toBe('string');
  });

  it('should handle multiple operation types', () => {
    const addOp = createNodeAddOperation('user1', { id: 'node1', type: 'track' });
    const removeOp = createNodeRemoveOperation('user2', 'node2');

    expect(addOp.type).toBe('node_add');
    expect(removeOp.type).toBe('node_remove');

    const result = transform(addOp, removeOp);
    expect(result).toBeDefined();
    expect(result.before.type).toBe(removeOp.type);
  });
});