/**
 * Basic TypeScript DAID Core Example
 * 
 * This example demonstrates the fundamental usage of DAID Core in TypeScript,
 * including DAID generation, provenance tracking, and basic client operations.
 */

import { 
  UnifiedDAIDClient, 
  DAIDGenerator, 
  DAIDValidator,
  ProvenanceChainBuilder 
} from '@schillinger-daid/daid_core';

// Configuration
const config = {
  agentId: 'basic-example-v1',
  baseUrl: process.env.DAID_BASE_URL || 'http://localhost:8080',
  apiKey: process.env.DAID_API_KEY,
  enableBatching: true,
  enableCaching: true,
  enableHealthMonitoring: true,
  batchSize: 50,
  batchTimeout: 2000,
  systemComponent: 'basic-example',
  defaultTags: ['example', 'typescript']
};

async function basicDAIDOperations() {
  console.log('🚀 Starting Basic DAID Core Example');
  console.log('Configuration:', config);
  
  // Initialize the unified client
  const client = new UnifiedDAIDClient(config);
  await client.initialize();
  
  try {
    // 1. Basic DAID Generation (local-only)
    console.log('\n📝 1. Basic DAID Generation');
    const basicDAID = DAIDGenerator.generate({
      agentId: config.agentId,
      entityType: 'document',
      entityId: 'doc-001',
      operation: 'create',
      metadata: {
        title: 'My First Document',
        author: 'TypeScript Example',
        version: '1.0'
      }
    });
    
    console.log('Generated DAID:', basicDAID);
    
    // Validate the DAID
    const validation = DAIDValidator.validateEnhanced(basicDAID);
    console.log('DAID Validation:', {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    });
    
    // 2. Client-based DAID Creation with Provenance
    console.log('\n🔗 2. Client-based DAID Creation');
    const result1 = await client.createDAID(
      'user',
      'user-123',
      'create',
      {
        metadata: {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'developer'
        },
        tags: ['user', 'developer'],
        batch: false // Process immediately for this example
      }
    );
    
    console.log('User DAID Result:', result1);
    
    // 3. Create Related DAIDs with Parent Relationships
    console.log('\n👥 3. Creating Related DAIDs');
    const result2 = await client.createDAID(
      'project',
      'project-456',
      'create',
      {
        metadata: {
          name: 'DAID Integration Project',
          description: 'Example project using DAID Core',
          owner: 'user-123'
        },
        parentDaids: result1.daid ? [result1.daid] : [],
        tags: ['project', 'integration'],
        batch: false
      }
    );
    
    console.log('Project DAID Result:', result2);
    
    // 4. Batch Operations
    console.log('\n📦 4. Batch Operations');
    const batchPromises = [];
    
    for (let i = 1; i <= 5; i++) {
      batchPromises.push(
        client.createDAID(
          'task',
          `task-${i}`,
          'create',
          {
            metadata: {
              title: `Task ${i}`,
              description: `Example task number ${i}`,
              priority: i <= 2 ? 'high' : 'normal',
              project: 'project-456'
            },
            parentDaids: result2.daid ? [result2.daid] : [],
            tags: ['task', 'batch-created'],
            batch: true // Enable batching
          }
        )
      );
    }
    
    const batchResults = await Promise.all(batchPromises);
    console.log('Batch Results:', batchResults.map(r => ({
      success: r.success,
      daid: r.daid,
      batched: r.metadata?.batched
    })));
    
    // 5. Query Operations
    console.log('\n🔍 5. Query Operations');
    const queryResult = await client.queryDAIDs({
      entityType: 'task',
      tags: ['batch-created'],
      limit: 10
    });
    
    console.log('Query Result:', queryResult);
    
    // 6. Provenance Chain Analysis
    console.log('\n🔗 6. Provenance Chain Analysis');
    if (result2.daid) {
      const chainResult = client.getProvenanceChain(result2.daid);
      console.log('Provenance Chain:', {
        success: chainResult.success,
        hasChain: !!chainResult.chain,
        error: chainResult.error
      });
    }
    
    // 7. Health Check
    console.log('\n🏥 7. Health Check');
    const healthResult = await client.performHealthCheck();
    console.log('Health Check:', {
      success: healthResult.success,
      overallHealth: healthResult.health?.overallHealth,
      totalDAIDs: healthResult.health?.totalDAIDs,
      error: healthResult.error
    });
    
    // 8. Statistics
    console.log('\n📊 8. Client Statistics');
    const stats = client.getStats();
    console.log('Client Stats:', stats);
    
    // 9. Cache Operations
    console.log('\n💾 9. Cache Test');
    // Create the same DAID twice to test caching
    const cacheTest1 = await client.createDAID(
      'cache-test',
      'cache-001',
      'create',
      {
        metadata: { test: 'cache' },
        batch: false,
        skipCache: false
      }
    );
    
    const cacheTest2 = await client.createDAID(
      'cache-test',
      'cache-001',
      'create',
      {
        metadata: { test: 'cache' },
        batch: false,
        skipCache: false
      }
    );
    
    console.log('Cache Test Results:', {
      first: { daid: cacheTest1.daid, cached: cacheTest1.metadata?.cached },
      second: { daid: cacheTest2.daid, cached: cacheTest2.metadata?.cached },
      sameDAID: cacheTest1.daid === cacheTest2.daid
    });
    
    // 10. Error Handling Example
    console.log('\n❌ 10. Error Handling');
    try {
      // Attempt an operation that might fail
      const errorResult = await client.createDAID(
        '', // Invalid entity type
        'test',
        'create'
      );
      console.log('Error Test Result:', errorResult);
    } catch (error) {
      console.log('Caught Error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Example failed:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await client.flushBatch(); // Ensure all batched operations are processed
    await client.cleanup();
    console.log('✅ Cleanup complete');
  }
}

// Advanced example showing provenance chain building
async function provenanceChainExample() {
  console.log('\n🔗 Advanced Provenance Chain Example');
  
  const chainBuilder = new ProvenanceChainBuilder();
  
  // Create a workflow with multiple steps
  const steps = [
    { type: 'data', id: 'raw-data-001', operation: 'ingest' },
    { type: 'data', id: 'cleaned-data-001', operation: 'clean' },
    { type: 'model', id: 'model-001', operation: 'train' },
    { type: 'prediction', id: 'prediction-001', operation: 'predict' }
  ];
  
  let previousDAID: string | undefined;
  
  for (const step of steps) {
    const daid = DAIDGenerator.generate({
      agentId: 'workflow-agent',
      entityType: step.type,
      entityId: step.id,
      operation: step.operation,
      parentDaids: previousDAID ? [previousDAID] : [],
      metadata: {
        step: step.operation,
        workflow: 'ml-pipeline',
        timestamp: new Date().toISOString()
      }
    });
    
    // Add to chain
    chainBuilder.addRecord(daid, {
      entityType: step.type,
      entityId: step.id,
      operation: step.operation,
      agentId: 'workflow-agent',
      parentDaids: previousDAID ? [previousDAID] : [],
      metadata: {
        step: step.operation,
        workflow: 'ml-pipeline'
      }
    });
    
    console.log(`Step ${step.operation}: ${daid}`);
    previousDAID = daid;
  }
  
  // Analyze the chain
  if (previousDAID) {
    const chain = chainBuilder.getChain(previousDAID);
    const stats = chainBuilder.getStatistics();
    
    console.log('Chain Statistics:', stats);
    console.log('Final Chain Depth:', chain?.getDepth(previousDAID));
  }
}

// Run the examples
async function main() {
  try {
    await basicDAIDOperations();
    await provenanceChainExample();
    console.log('\n🎉 All examples completed successfully!');
  } catch (error) {
    console.error('❌ Examples failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { basicDAIDOperations, provenanceChainExample };
