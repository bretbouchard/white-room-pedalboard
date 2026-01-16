# DAID Provenance Consumption Guide

**Version**: 1.0.0  
**Date**: September 22, 2025  
**Audience**: Developers, Data Scientists, Analysts  
**Status**: Active

## Overview

This guide demonstrates how to **consume** and **analyze** DAID provenance data from transformation functions and other system operations. While the [DAID Implementation Guide](./DAID-IMPLEMENTATION-GUIDE.md) covers creating provenance, this guide focuses on reading, extracting, and utilizing provenance information for analysis, debugging, and compliance.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Reading Provenance from API Responses](#reading-provenance-from-api-responses)
3. [Extracting Provenance Chains](#extracting-provenance-chains)
4. [Analyzing Transformation History](#analyzing-transformation-history)
5. [Frontend Integration Examples](#frontend-integration-examples)
6. [Advanced Provenance Queries](#advanced-provenance-queries)
7. [Compliance and Audit Use Cases](#compliance-and-audit-use-cases)

## Quick Start

### Basic Provenance Extraction

```typescript
// From a transformation API response
const response = await fetch('/api/transformations/execute', {
  method: 'POST',
  body: JSON.stringify({
    transformation: 'analyzeMelodicContour',
    data: { melody: [60, 62, 64, 65, 67] }
  })
});

const result = await response.json();

// Extract provenance information
if (result.success && result.provenance) {
  const provenance = result.provenance;
  
  console.log('Transformation:', provenance.transformation);
  console.log('Timestamp:', provenance.timestamp);
  console.log('User:', provenance.context?.user_id);
  console.log('Inputs:', provenance.inputs);
}
```

### Python Example

```python
import requests
from datetime import datetime

# Call transformation API
response = requests.post('/api/transformations/execute', json={
    'transformation': 'analyzeChord',
    'data': {'chord': 'Cmaj7', 'key': 'C'}
})

result = response.json()

# Extract and analyze provenance
if result['success'] and 'provenance' in result:
    prov = result['provenance']
    
    # Convert timestamp to readable format
    timestamp = datetime.fromtimestamp(prov['timestamp'])
    
    print(f"Analysis performed: {prov['transformation']}")
    print(f"At: {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Input chord: {prov['inputs']['chord']}")
    print(f"Result: {result['data']}")
```

## Reading Provenance from API Responses

### Transformation API Provenance Structure

All transformation API responses include provenance data in this format:

```json
{
  "success": true,
  "data": { /* transformation results */ },
  "provenance": {
    "id": "daid:v1.0:2025-09-22T19:30:00Z:user:test-123:transformation:melodic-contour:abc123",
    "transformation": "analyzeMelodicContour",
    "timestamp": 1695408600.123,
    "inputs": {
      "melody": [60, 62, 64, 65, 67, 69, 71, 72]
    },
    "outputs": {
      "contour": {
        "overall_direction": "ascending",
        "ascending_intervals": 7,
        "descending_intervals": 0
      }
    },
    "context": {
      "user_id": "test-user-123",
      "user_email": "test@example.com",
      "session_id": "session-456",
      "api_version": "1.0.0"
    },
    "metadata": {
      "execution_time_ms": 12.5,
      "sdk_version": "1.0.0",
      "algorithm_version": "2.1.0"
    }
  },
  "execution_time_ms": 12.5
}
```

### Extracting Key Information

```typescript
interface ProvenanceData {
  id: string;
  transformation: string;
  timestamp: number;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  context: {
    user_id?: string;
    user_email?: string;
    session_id?: string;
    api_version?: string;
  };
  metadata?: Record<string, any>;
}

function extractProvenanceInfo(apiResponse: any): ProvenanceData | null {
  if (!apiResponse.success || !apiResponse.provenance) {
    return null;
  }
  
  const prov = apiResponse.provenance;
  
  return {
    id: prov.id,
    transformation: prov.transformation,
    timestamp: prov.timestamp,
    inputs: prov.inputs,
    outputs: prov.outputs,
    context: prov.context || {},
    metadata: prov.metadata || {}
  };
}

// Usage
const provenanceInfo = extractProvenanceInfo(transformationResult);
if (provenanceInfo) {
  console.log(`Transformation ${provenanceInfo.transformation} executed at ${new Date(provenanceInfo.timestamp * 1000)}`);
}
```

## Extracting Provenance Chains

### Building Transformation History

```typescript
class ProvenanceChain {
  private chain: ProvenanceData[] = [];
  
  addTransformation(provenance: ProvenanceData) {
    this.chain.push(provenance);
  }
  
  getHistory(): ProvenanceData[] {
    return [...this.chain].sort((a, b) => a.timestamp - b.timestamp);
  }
  
  getTransformationTypes(): string[] {
    return [...new Set(this.chain.map(p => p.transformation))];
  }
  
  getUsersInvolved(): string[] {
    return [...new Set(this.chain.map(p => p.context.user_id).filter(Boolean))];
  }
  
  getTotalExecutionTime(): number {
    return this.chain.reduce((total, p) => total + (p.metadata?.execution_time_ms || 0), 0);
  }
  
  generateSummary(): string {
    const history = this.getHistory();
    const types = this.getTransformationTypes();
    const users = this.getUsersInvolved();
    
    return `
Provenance Chain Summary:
- ${history.length} transformations
- Types: ${types.join(', ')}
- Users: ${users.join(', ')}
- Total execution time: ${this.getTotalExecutionTime()}ms
- Time span: ${new Date(history[0]?.timestamp * 1000)} to ${new Date(history[history.length - 1]?.timestamp * 1000)}
    `.trim();
  }
}

// Usage example
const chain = new ProvenanceChain();

// Add multiple transformation results
const melodyAnalysis = await analyzemelody([60, 64, 67, 72]);
chain.addTransformation(extractProvenanceInfo(melodyAnalysis)!);

const chordAnalysis = await analyzeChord('Cmaj7');
chain.addTransformation(extractProvenanceInfo(chordAnalysis)!);

console.log(chain.generateSummary());
```

## Analyzing Transformation History

### Pattern Detection in Provenance

```typescript
interface TransformationPattern {
  sequence: string[];
  frequency: number;
  users: string[];
  avgExecutionTime: number;
}

class ProvenanceAnalyzer {
  static findCommonPatterns(provenanceData: ProvenanceData[]): TransformationPattern[] {
    const patterns = new Map<string, TransformationPattern>();
    
    // Group by user sessions
    const sessions = this.groupBySession(provenanceData);
    
    sessions.forEach(session => {
      const sequence = session.map(p => p.transformation);
      const key = sequence.join(' -> ');
      
      if (!patterns.has(key)) {
        patterns.set(key, {
          sequence,
          frequency: 0,
          users: [],
          avgExecutionTime: 0
        });
      }
      
      const pattern = patterns.get(key)!;
      pattern.frequency++;
      
      const userId = session[0]?.context.user_id;
      if (userId && !pattern.users.includes(userId)) {
        pattern.users.push(userId);
      }
      
      const totalTime = session.reduce((sum, p) => sum + (p.metadata?.execution_time_ms || 0), 0);
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
    const transformationCounts = this.countTransformations(provenanceData);
    
    return `
Usage Analysis Report:
===================

Most Common Transformation Patterns:
${patterns.slice(0, 5).map((p, i) => 
  `${i + 1}. ${p.sequence.join(' → ')} (${p.frequency} times, ${p.users.length} users)`
).join('\n')}

Transformation Frequency:
${Object.entries(transformationCounts)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([name, count]) => `- ${name}: ${count} times`)
  .join('\n')}
    `.trim();
  }
  
  private static countTransformations(data: ProvenanceData[]): Record<string, number> {
    return data.reduce((counts, prov) => {
      counts[prov.transformation] = (counts[prov.transformation] || 0) + 1;
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
    provenanceHistory.forEach(p => chain.addTransformation(p));
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
function TransformationComponent() {
  const { provenanceHistory, addProvenance, getChainSummary } = useProvenance();

  const handleTransformation = async (type: string, data: any) => {
    const response = await fetch('/api/transformations/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transformation: type, data })
    });

    const result = await response.json();

    if (result.success && result.provenance) {
      addProvenance(extractProvenanceInfo(result)!);
    }

    return result;
  };

  return (
    <div>
      <button onClick={() => handleTransformation('analyzeMelodicContour', { melody: [60, 64, 67] })}>
        Analyze Melody
      </button>

      <div>
        <h3>Provenance History ({provenanceHistory.length} items)</h3>
        <pre>{getChainSummary()}</pre>
      </div>
    </div>
  );
}
```

### Vue.js Composition API Example

```typescript
import { ref, computed } from 'vue';

export function useProvenanceTracking() {
  const provenanceData = ref<ProvenanceData[]>([]);

  const addProvenance = (data: ProvenanceData) => {
    provenanceData.value.push(data);
  };

  const transformationTypes = computed(() => {
    return [...new Set(provenanceData.value.map(p => p.transformation))];
  });

  const totalExecutionTime = computed(() => {
    return provenanceData.value.reduce((total, p) =>
      total + (p.metadata?.execution_time_ms || 0), 0
    );
  });

  return {
    provenanceData: readonly(provenanceData),
    addProvenance,
    transformationTypes,
    totalExecutionTime
  };
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

  byTransformation(type: string): ProvenanceQuery {
    return new ProvenanceQuery(
      this.data.filter(p => p.transformation === type)
    );
  }

  byUser(userId: string): ProvenanceQuery {
    return new ProvenanceQuery(
      this.data.filter(p => p.context.user_id === userId)
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

// Find all melodic analyses by specific user in last 24 hours
const recentMelodicAnalyses = query
  .byTransformation('analyzeMelodicContour')
  .byUser('user-123')
  .byTimeRange(new Date(Date.now() - 24 * 60 * 60 * 1000), new Date())
  .sortByTimestamp(true)
  .results();

// Find slow transformations
const slowTransformations = query
  .withExecutionTimeAbove(1000) // > 1 second
  .sortByTimestamp(true)
  .results();

console.log(`Found ${recentMelodicAnalyses.length} recent melodic analyses`);
console.log(`Found ${slowTransformations.length} slow transformations`);
```

## Compliance and Audit Use Cases

### Generating Audit Reports

```typescript
interface AuditReport {
  period: { start: Date; end: Date };
  totalTransformations: number;
  uniqueUsers: number;
  transformationBreakdown: Record<string, number>;
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

    const uniqueUsers = new Set(
      periodData.map(p => p.context.user_id).filter(Boolean)
    ).size;

    const transformationBreakdown = periodData.reduce((acc, p) => {
      acc[p.transformation] = (acc[p.transformation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const complianceFlags = this.checkCompliance(periodData);
    const recommendations = this.generateRecommendations(periodData);

    return {
      period: { start: startDate, end: endDate },
      totalTransformations: periodData.length,
      uniqueUsers,
      transformationBreakdown,
      complianceFlags,
      recommendations
    };
  }

  private static checkCompliance(data: ProvenanceData[]): string[] {
    const flags: string[] = [];

    // Check for missing user context
    const missingUserContext = data.filter(p => !p.context.user_id).length;
    if (missingUserContext > 0) {
      flags.push(`${missingUserContext} transformations missing user context`);
    }

    // Check for unusually long execution times
    const slowTransformations = data.filter(p =>
      (p.metadata?.execution_time_ms || 0) > 5000
    ).length;
    if (slowTransformations > 0) {
      flags.push(`${slowTransformations} transformations exceeded 5s execution time`);
    }

    // Check for missing provenance IDs
    const missingIds = data.filter(p => !p.id).length;
    if (missingIds > 0) {
      flags.push(`${missingIds} transformations missing provenance IDs`);
    }

    return flags;
  }

  private static generateRecommendations(data: ProvenanceData[]): string[] {
    const recommendations: string[] = [];

    // Analyze usage patterns
    const transformationCounts = data.reduce((acc, p) => {
      acc[p.transformation] = (acc[p.transformation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsed = Object.entries(transformationCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostUsed && mostUsed[1] > data.length * 0.5) {
      recommendations.push(
        `Consider optimizing ${mostUsed[0]} transformation (${mostUsed[1]} uses, ${((mostUsed[1]/data.length)*100).toFixed(1)}% of total)`
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

### Export Functions for External Analysis

```typescript
class ProvenanceExporter {
  static toCSV(data: ProvenanceData[]): string {
    const headers = [
      'ID', 'Transformation', 'Timestamp', 'User ID', 'Execution Time (ms)',
      'Input Summary', 'Session ID'
    ];

    const rows = data.map(p => [
      p.id,
      p.transformation,
      new Date(p.timestamp * 1000).toISOString(),
      p.context.user_id || '',
      p.metadata?.execution_time_ms || '',
      JSON.stringify(p.inputs).substring(0, 100) + '...',
      p.context.session_id || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  static toJSON(data: ProvenanceData[]): string {
    return JSON.stringify({
      export_timestamp: new Date().toISOString(),
      total_records: data.length,
      data: data
    }, null, 2);
  }

  static downloadCSV(data: ProvenanceData[], filename = 'provenance-data.csv') {
    const csv = this.toCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }
}
```

## Best Practices

### 1. Always Check for Provenance
```typescript
// Good: Always check if provenance exists
if (result.success && result.provenance) {
  const provenance = extractProvenanceInfo(result);
  // Process provenance...
}

// Bad: Assuming provenance always exists
const provenance = result.provenance; // May be undefined
```

### 2. Handle Missing Context Gracefully
```typescript
// Good: Provide defaults for missing context
const userId = provenance.context?.user_id || 'anonymous';
const sessionId = provenance.context?.session_id || 'unknown-session';

// Bad: Direct access without checking
const userId = provenance.context.user_id; // May throw error
```

### 3. Store Provenance for Analysis
```typescript
// Good: Persist provenance for later analysis
class ProvenanceStore {
  private storage: ProvenanceData[] = [];

  add(provenance: ProvenanceData) {
    this.storage.push(provenance);
    // Optionally persist to localStorage or database
    localStorage.setItem('provenance-history', JSON.stringify(this.storage));
  }

  getAll(): ProvenanceData[] {
    return [...this.storage];
  }
}
```

### 4. Use Provenance for Debugging
```typescript
// Good: Use provenance to debug transformation issues
function debugTransformation(result: any) {
  if (!result.success && result.provenance) {
    console.error('Transformation failed:', {
      transformation: result.provenance.transformation,
      inputs: result.provenance.inputs,
      timestamp: new Date(result.provenance.timestamp * 1000),
      user: result.provenance.context?.user_id,
      error: result.error
    });
  }
}
```

## Conclusion

DAID provenance consumption enables powerful analysis, debugging, and compliance capabilities. By following the patterns and examples in this guide, you can:

- Track transformation history and user interactions
- Generate compliance and audit reports
- Analyze usage patterns and performance metrics
- Debug issues using provenance context
- Build transparent and accountable AI systems

For more information, see:
- [DAID Implementation Guide](./DAID-IMPLEMENTATION-GUIDE.md)
- [DAID Provenance Specification](./DAID-PROVENANCE-SPECIFICATION.md)
- [Transformation APIs Documentation](./transformation_apis.md)
```
