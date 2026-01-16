# DAID Provenance Consumption Guide

**Version**: 1.0.0  
**Date**: September 22, 2025  
**Audience**: Developers, Data Scientists, Analysts  
**Status**: Active

## Overview

This guide demonstrates how to **consume** and **analyze** DAID provenance data from any system using the DAID Core library. While the DAID Core README covers creating provenance, this guide focuses on reading, extracting, and utilizing provenance information for analysis, debugging, and compliance across any domain.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Reading Provenance from API Responses](#reading-provenance-from-api-responses)
3. [Extracting Provenance Chains](#extracting-provenance-chains)
4. [Analyzing Operation History](#analyzing-operation-history)
5. [Frontend Integration Examples](#frontend-integration-examples)
6. [Advanced Provenance Queries](#advanced-provenance-queries)
7. [Compliance and Audit Use Cases](#compliance-and-audit-use-cases)

## Quick Start

### Basic Provenance Extraction (TypeScript)

```typescript
import { DAIDClient, ProvenanceData } from '@schillinger-daid/daid_core';

// Initialize DAID client
const daidClient = new DAIDClient({
  baseUrl: 'https://api.your-system.com',
  apiKey: process.env.DAID_API_KEY,
  agentId: 'consumer-agent-001'
});

// Extract provenance from any API response
async function extractProvenance(apiResponse: any): Promise<ProvenanceData | null> {
  if (!apiResponse.success || !apiResponse.provenance) {
    return null;
  }
  
  const provenance = apiResponse.provenance;
  
  return {
    id: provenance.id,
    operation: provenance.operation,
    timestamp: provenance.timestamp,
    inputs: provenance.inputs,
    outputs: provenance.outputs,
    context: provenance.context || {},
    metadata: provenance.metadata || {}
  };
}

// Usage example
const operationResult = await yourApiCall();
const provenance = await extractProvenance(operationResult);

if (provenance) {
  console.log(`Operation ${provenance.operation} executed at ${new Date(provenance.timestamp * 1000)}`);
  console.log('Agent:', provenance.context?.agent_id);
  console.log('Inputs:', provenance.inputs);
}
```

### Python Example

```python
from daid_core import DAIDClient, ProvenanceAnalyzer
from datetime import datetime
import requests

# Initialize DAID client
daid_client = DAIDClient(
    base_url='https://api.your-system.com',
    api_key=os.getenv('DAID_API_KEY'),
    agent_id='python-consumer-001'
)

def extract_provenance(api_response):
    """Extract provenance data from API response."""
    if not api_response.get('success') or 'provenance' not in api_response:
        return None
    
    prov = api_response['provenance']
    
    return {
        'id': prov.get('id'),
        'operation': prov.get('operation'),
        'timestamp': prov.get('timestamp'),
        'inputs': prov.get('inputs', {}),
        'outputs': prov.get('outputs', {}),
        'context': prov.get('context', {}),
        'metadata': prov.get('metadata', {})
    }

# Usage
response = requests.post('/api/operations/execute', json={
    'operation': 'data_transformation',
    'data': {'input': 'sample_data'}
})

result = response.json()
provenance = extract_provenance(result)

if provenance:
    timestamp = datetime.fromtimestamp(provenance['timestamp'])
    print(f"Operation performed: {provenance['operation']}")
    print(f"At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Agent: {provenance['context'].get('agent_id', 'unknown')}")
```

## Reading Provenance from API Responses

### Standard Provenance Structure

Any system using DAID Core should return provenance data in this standardized format:

```json
{
  "success": true,
  "data": { /* operation results */ },
  "provenance": {
    "id": "daid:v1.0:2025-09-22T19:30:00Z:agent-123:operation:entity-456:abc123",
    "operation": "data_transformation",
    "timestamp": 1695408600.123,
    "inputs": {
      "source_data": "input_value",
      "parameters": {"param1": "value1"}
    },
    "outputs": {
      "result": "transformed_data",
      "metrics": {"processing_time": 150}
    },
    "context": {
      "agent_id": "processing-agent-001",
      "user_id": "user-123",
      "session_id": "session-456",
      "system_version": "1.0.0"
    },
    "metadata": {
      "execution_time_ms": 150.5,
      "algorithm_version": "2.1.0",
      "resource_usage": {"memory_mb": 45, "cpu_percent": 12}
    }
  },
  "execution_time_ms": 150.5
}
```

### TypeScript Interface for Provenance

```typescript
interface ProvenanceData {
  id: string;
  operation: string;
  timestamp: number;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  context: {
    agent_id?: string;
    user_id?: string;
    session_id?: string;
    system_version?: string;
  };
  metadata?: Record<string, any>;
}

interface ProvenanceResponse {
  success: boolean;
  data: any;
  provenance?: ProvenanceData;
  execution_time_ms?: number;
  error?: string;
}
```

## Extracting Provenance Chains

### Building Operation History

```typescript
class ProvenanceChain {
  private operations: ProvenanceData[] = [];
  
  addOperation(provenance: ProvenanceData) {
    this.operations.push(provenance);
  }
  
  getHistory(): ProvenanceData[] {
    return [...this.operations].sort((a, b) => a.timestamp - b.timestamp);
  }
  
  getOperationTypes(): string[] {
    return [...new Set(this.operations.map(p => p.operation))];
  }
  
  getAgentsInvolved(): string[] {
    return [...new Set(this.operations.map(p => p.context.agent_id).filter(Boolean))];
  }
  
  getTotalExecutionTime(): number {
    return this.operations.reduce((total, p) => 
      total + (p.metadata?.execution_time_ms || 0), 0
    );
  }
  
  generateSummary(): string {
    const history = this.getHistory();
    const types = this.getOperationTypes();
    const agents = this.getAgentsInvolved();
    
    return `
Provenance Chain Summary:
- ${history.length} operations
- Types: ${types.join(', ')}
- Agents: ${agents.join(', ')}
- Total execution time: ${this.getTotalExecutionTime()}ms
- Time span: ${new Date(history[0]?.timestamp * 1000)} to ${new Date(history[history.length - 1]?.timestamp * 1000)}
    `.trim();
  }
  
  exportToJSON(): string {
    return JSON.stringify({
      chain_id: `chain-${Date.now()}`,
      created_at: new Date().toISOString(),
      summary: {
        total_operations: this.operations.length,
        operation_types: this.getOperationTypes(),
        agents_involved: this.getAgentsInvolved(),
        total_execution_time: this.getTotalExecutionTime()
      },
      operations: this.getHistory()
    }, null, 2);
  }
}

// Usage example
const chain = new ProvenanceChain();

// Add operations from multiple API calls
const dataProcessing = await processData(inputData);
chain.addOperation(extractProvenance(dataProcessing)!);

const dataAnalysis = await analyzeData(processedData);
chain.addOperation(extractProvenance(dataAnalysis)!);

const reportGeneration = await generateReport(analysisResults);
chain.addOperation(extractProvenance(reportGeneration)!);

console.log(chain.generateSummary());
```

### Python Chain Analysis

```python
class ProvenanceChain:
    def __init__(self):
        self.operations = []
    
    def add_operation(self, provenance_data):
        """Add a provenance record to the chain."""
        self.operations.append(provenance_data)
    
    def get_history(self):
        """Get operations sorted by timestamp."""
        return sorted(self.operations, key=lambda p: p['timestamp'])
    
    def get_operation_types(self):
        """Get unique operation types in the chain."""
        return list(set(p['operation'] for p in self.operations))
    
    def get_agents_involved(self):
        """Get unique agents involved in the chain."""
        agents = [p['context'].get('agent_id') for p in self.operations]
        return list(set(filter(None, agents)))
    
    def get_total_execution_time(self):
        """Calculate total execution time across all operations."""
        return sum(p.get('metadata', {}).get('execution_time_ms', 0) 
                  for p in self.operations)
    
    def generate_summary(self):
        """Generate a human-readable summary of the chain."""
        history = self.get_history()
        types = self.get_operation_types()
        agents = self.get_agents_involved()
        
        if not history:
            return "Empty provenance chain"
        
        start_time = datetime.fromtimestamp(history[0]['timestamp'])
        end_time = datetime.fromtimestamp(history[-1]['timestamp'])
        
        return f"""
Provenance Chain Summary:
- {len(history)} operations
- Types: {', '.join(types)}
- Agents: {', '.join(agents)}
- Total execution time: {self.get_total_execution_time()}ms
- Time span: {start_time} to {end_time}
        """.strip()
    
    def export_to_json(self):
        """Export chain to JSON format."""
        import json
        
        return json.dumps({
            'chain_id': f'chain-{int(time.time())}',
            'created_at': datetime.now().isoformat(),
            'summary': {
                'total_operations': len(self.operations),
                'operation_types': self.get_operation_types(),
                'agents_involved': self.get_agents_involved(),
                'total_execution_time': self.get_total_execution_time()
            },
            'operations': self.get_history()
        }, indent=2)

# Usage
chain = ProvenanceChain()

# Process multiple operations and track provenance
operations = [
    {'operation': 'data_ingestion', 'data': raw_data},
    {'operation': 'data_cleaning', 'data': ingested_data},
    {'operation': 'data_analysis', 'data': clean_data}
]

for op in operations:
    result = api_call(op)
    provenance = extract_provenance(result)
    if provenance:
        chain.add_operation(provenance)

print(chain.generate_summary())
```

## Analyzing Operation History

### Pattern Detection in Provenance

```typescript
interface OperationPattern {
  sequence: string[];
  frequency: number;
  agents: string[];
  avgExecutionTime: number;
}

class ProvenanceAnalyzer {
  static findCommonPatterns(provenanceData: ProvenanceData[]): OperationPattern[] {
    const patterns = new Map<string, OperationPattern>();

    // Group by sessions or time windows
    const sessions = this.groupBySession(provenanceData);

    sessions.forEach(session => {
      const sequence = session.map(p => p.operation);
      const key = sequence.join(' -> ');

      if (!patterns.has(key)) {
        patterns.set(key, {
          sequence,
          frequency: 0,
          agents: [],
          avgExecutionTime: 0
        });
      }

      const pattern = patterns.get(key)!;
      pattern.frequency++;

      const agentId = session[0]?.context.agent_id;
      if (agentId && !pattern.agents.includes(agentId)) {
        pattern.agents.push(agentId);
      }

      const totalTime = session.reduce((sum, p) =>
        sum + (p.metadata?.execution_time_ms || 0), 0
      );
      pattern.avgExecutionTime = (pattern.avgExecutionTime + totalTime) / pattern.frequency;
    });

    return Array.from(patterns.values()).sort((a, b) => b.frequency - a.frequency);
  }

  private static groupBySession(data: ProvenanceData[]): ProvenanceData[][] {
    const sessions = new Map<string, ProvenanceData[]>();

    data.forEach(prov => {
      const sessionId = prov.context.session_id || 'unknown';
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      sessions.get(sessionId)!.push(prov);
    });

    return Array.from(sessions.values());
  }

  static generateUsageReport(provenanceData: ProvenanceData[]): string {
    const patterns = this.findCommonPatterns(provenanceData);
    const operationCounts = this.countOperations(provenanceData);

    return `
Usage Analysis Report:
===================

Most Common Operation Patterns:
${patterns.slice(0, 5).map((p, i) =>
  `${i + 1}. ${p.sequence.join(' → ')} (${p.frequency} times, ${p.agents.length} agents)`
).join('\n')}

Operation Frequency:
${Object.entries(operationCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([name, count]) => `- ${name}: ${count} times`)
  .join('\n')}
    `.trim();
  }

  private static countOperations(data: ProvenanceData[]): Record<string, number> {
    return data.reduce((counts, prov) => {
      counts[prov.operation] = (counts[prov.operation] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }
}
```

## Frontend Integration Examples

### React Hook for Provenance Tracking

```typescript
import { useState, useCallback } from 'react';

interface UseProvenanceResult {
  provenanceHistory: ProvenanceData[];
  addProvenance: (data: ProvenanceData) => void;
  clearHistory: () => void;
  getChainSummary: () => string;
}

export function useProvenance(): UseProvenanceResult {
  const [provenanceHistory, setProvenanceHistory] = useState<ProvenanceData[]>([]);

  const addProvenance = useCallback((data: ProvenanceData) => {
    setProvenanceHistory(prev => [...prev, data]);
  }, []);

  const clearHistory = useCallback(() => {
    setProvenanceHistory([]);
  }, []);

  const getChainSummary = useCallback(() => {
    const chain = new ProvenanceChain();
    provenanceHistory.forEach(p => chain.addOperation(p));
    return chain.generateSummary();
  }, [provenanceHistory]);

  return {
    provenanceHistory,
    addProvenance,
    clearHistory,
    getChainSummary
  };
}

// Usage in component
function OperationComponent() {
  const { provenanceHistory, addProvenance, getChainSummary } = useProvenance();

  const handleOperation = async (type: string, data: any) => {
    const response = await fetch('/api/operations/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: type, data })
    });

    const result = await response.json();

    if (result.success && result.provenance) {
      addProvenance(result.provenance);
    }

    return result;
  };

  return (
    <div>
      <button onClick={() => handleOperation('data_processing', { input: 'sample' })}>
        Process Data
      </button>

      <div>
        <h3>Provenance History ({provenanceHistory.length} items)</h3>
        <pre>{getChainSummary()}</pre>
      </div>
    </div>
  );
}
```

## Advanced Provenance Queries

### Querying Provenance by Criteria

```typescript
class ProvenanceQuery {
  private data: ProvenanceData[];

  constructor(data: ProvenanceData[]) {
    this.data = data;
  }

  byOperation(type: string): ProvenanceQuery {
    return new ProvenanceQuery(
      this.data.filter(p => p.operation === type)
    );
  }

  byAgent(agentId: string): ProvenanceQuery {
    return new ProvenanceQuery(
      this.data.filter(p => p.context.agent_id === agentId)
    );
  }

  byTimeRange(start: Date, end: Date): ProvenanceQuery {
    const startTs = start.getTime() / 1000;
    const endTs = end.getTime() / 1000;

    return new ProvenanceQuery(
      this.data.filter(p => p.timestamp >= startTs && p.timestamp <= endTs)
    );
  }

  withExecutionTimeAbove(ms: number): ProvenanceQuery {
    return new ProvenanceQuery(
      this.data.filter(p => (p.metadata?.execution_time_ms || 0) > ms)
    );
  }

  sortByTimestamp(desc = false): ProvenanceQuery {
    const sorted = [...this.data].sort((a, b) =>
      desc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );
    return new ProvenanceQuery(sorted);
  }

  results(): ProvenanceData[] {
    return this.data;
  }

  count(): number {
    return this.data.length;
  }
}

// Usage examples
const query = new ProvenanceQuery(allProvenanceData);

// Find all data processing operations by specific agent in last 24 hours
const recentProcessing = query
  .byOperation('data_processing')
  .byAgent('agent-123')
  .byTimeRange(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date())
  .sortByTimestamp(true)
  .results();

// Find slow operations
const slowOperations = query
  .withExecutionTimeAbove(1000) // > 1 second
  .sortByTimestamp(true)
  .results();

console.log(`Found ${recentProcessing.length} recent processing operations`);
console.log(`Found ${slowOperations.length} slow operations`);
```

## Compliance and Audit Use Cases

### Generating Audit Reports

```typescript
interface AuditReport {
  period: { start: Date; end: Date };
  totalOperations: number;
  uniqueAgents: number;
  operationBreakdown: Record<string, number>;
  complianceFlags: string[];
  recommendations: string[];
}

class ComplianceAuditor {
  static generateAuditReport(
    provenanceData: ProvenanceData[],
    startDate: Date,
    endDate: Date
  ): AuditReport {
    const query = new ProvenanceQuery(provenanceData);
    const periodData = query.byTimeRange(startDate, endDate).results();

    const uniqueAgents = new Set(
      periodData.map(p => p.context.agent_id).filter(Boolean)
    ).size;

    const operationBreakdown = periodData.reduce((acc, p) => {
      acc[p.operation] = (acc[p.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const complianceFlags = this.checkCompliance(periodData);
    const recommendations = this.generateRecommendations(periodData);

    return {
      period: { start: startDate, end: endDate },
      totalOperations: periodData.length,
      uniqueAgents,
      operationBreakdown,
      complianceFlags,
      recommendations
    };
  }

  private static checkCompliance(data: ProvenanceData[]): string[] {
    const flags: string[] = [];

    // Check for missing agent context
    const missingAgentContext = data.filter(p => !p.context.agent_id).length;
    if (missingAgentContext > 0) {
      flags.push(`${missingAgentContext} operations missing agent context`);
    }

    // Check for unusually long execution times
    const slowOperations = data.filter(p =>
      (p.metadata?.execution_time_ms || 0) > 5000
    ).length;
    if (slowOperations > 0) {
      flags.push(`${slowOperations} operations exceeded 5s execution time`);
    }

    // Check for missing provenance IDs
    const missingIds = data.filter(p => !p.id).length;
    if (missingIds > 0) {
      flags.push(`${missingIds} operations missing provenance IDs`);
    }

    return flags;
  }

  private static generateRecommendations(data: ProvenanceData[]): string[] {
    const recommendations: string[] = [];

    // Analyze usage patterns
    const operationCounts = data.reduce((acc, p) => {
      acc[p.operation] = (acc[p.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsed = Object.entries(operationCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostUsed && mostUsed[1] > data.length * 0.5) {
      recommendations.push(
        `Consider optimizing ${mostUsed[0]} operation (${mostUsed[1]} uses, ${((mostUsed[1]/data.length)*100).toFixed(1)}% of total)`
      );
    }

    // Check for performance optimization opportunities
    const avgExecutionTime = data.reduce((sum, p) =>
      sum + (p.metadata?.execution_time_ms || 0), 0
    ) / data.length;

    if (avgExecutionTime > 1000) {
      recommendations.push(
        `Average execution time is ${avgExecutionTime.toFixed(1)}ms - consider performance optimization`
      );
    }

    return recommendations;
  }
}

// Usage
const auditReport = ComplianceAuditor.generateAuditReport(
  allProvenanceData,
  new Date('2025-09-01'),
  new Date('2025-09-30')
);

console.log('Audit Report:', auditReport);
```

## Best Practices

### 1. Always Check for Provenance
```typescript
// Good: Always check if provenance exists
if (result.success && result.provenance) {
  const provenance = result.provenance;
  // Process provenance...
}

// Bad: Assuming provenance always exists
const provenance = result.provenance; // May be undefined
```

### 2. Handle Missing Context Gracefully
```typescript
// Good: Provide defaults for missing context
const agentId = provenance.context?.agent_id || 'unknown-agent';
const sessionId = provenance.context?.session_id || 'unknown-session';

// Bad: Direct access without checking
const agentId = provenance.context.agent_id; // May throw error
```

### 3. Store Provenance for Analysis
```typescript
// Good: Persist provenance for later analysis
class ProvenanceStore {
  private storage: ProvenanceData[] = [];

  add(provenance: ProvenanceData) {
    this.storage.push(provenance);
    // Optionally persist to database or localStorage
    this.persist();
  }

  private persist() {
    // Save to persistent storage
    localStorage.setItem('provenance-history', JSON.stringify(this.storage));
  }
}
```

### 4. Use Provenance for Debugging
```typescript
// Good: Use provenance to debug operation issues
function debugOperation(result: any) {
  if (!result.success && result.provenance) {
    console.error('Operation failed:', {
      operation: result.provenance.operation,
      inputs: result.provenance.inputs,
      timestamp: new Date(result.provenance.timestamp * 1000),
      agent: result.provenance.context?.agent_id,
      error: result.error
    });
  }
}
```

## Conclusion

DAID provenance consumption enables powerful analysis, debugging, and compliance capabilities across any system. By following the patterns and examples in this guide, you can:

- Track operation history and agent interactions
- Generate compliance and audit reports
- Analyze usage patterns and performance metrics
- Debug issues using provenance context
- Build transparent and accountable systems

For more information, see:
- [DAID Core README](../README.md)
- [DAID Specification](../DAID.md)
- [Publishing Guide](../PUBLISHING.md)
```
