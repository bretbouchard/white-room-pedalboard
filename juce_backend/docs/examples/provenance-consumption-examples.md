# DAID Provenance Consumption Examples

This document provides practical, working examples of consuming DAID provenance data in the Audio Agent project.

## Example 1: Basic Transformation with Provenance Tracking

### Frontend Component (React)

```typescript
// src/components/ProvenanceTracker.tsx
import React, { useState } from 'react';
import { transformationService } from '@/services/transformationService';

interface ProvenanceEntry {
  id: string;
  transformation: string;
  timestamp: number;
  inputs: any;
  outputs: any;
  executionTime: number;
  user: string;
}

export const ProvenanceTracker: React.FC = () => {
  const [history, setHistory] = useState<ProvenanceEntry[]>([]);
  const [melody, setMelody] = useState([60, 62, 64, 65, 67, 69, 71, 72]);

  const analyzeMelody = async () => {
    try {
      const result = await transformationService.analyzeMelodicContour(melody);
      
      if (result.success && result.provenance) {
        const entry: ProvenanceEntry = {
          id: result.provenance.id,
          transformation: result.provenance.transformation,
          timestamp: result.provenance.timestamp,
          inputs: result.provenance.inputs,
          outputs: result.data,
          executionTime: result.execution_time_ms || 0,
          user: result.provenance.context?.user_id || 'anonymous'
        };
        
        setHistory(prev => [entry, ...prev]);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  return (
    <div className="p-4">
      <h2>Melody Analysis with Provenance</h2>
      
      <div className="mb-4">
        <label>Melody (MIDI notes):</label>
        <input 
          type="text" 
          value={melody.join(', ')}
          onChange={(e) => setMelody(e.target.value.split(',').map(n => parseInt(n.trim())))}
          className="border p-2 ml-2"
        />
        <button onClick={analyzeMelody} className="ml-2 px-4 py-2 bg-blue-500 text-white">
          Analyze
        </button>
      </div>

      <div>
        <h3>Provenance History ({history.length} entries)</h3>
        {history.map((entry, index) => (
          <div key={entry.id} className="border p-3 mb-2 bg-gray-50">
            <div className="font-bold">{entry.transformation}</div>
            <div className="text-sm text-gray-600">
              {new Date(entry.timestamp * 1000).toLocaleString()} | 
              User: {entry.user} | 
              Execution: {entry.executionTime}ms
            </div>
            <div className="mt-2">
              <strong>Input:</strong> {JSON.stringify(entry.inputs)}
            </div>
            <div>
              <strong>Output:</strong> {JSON.stringify(entry.outputs)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Example 2: Provenance Chain Analysis

### Building a Transformation Pipeline

```typescript
// src/utils/provenanceChain.ts
export class TransformationPipeline {
  private steps: ProvenanceEntry[] = [];
  
  async addMelodicAnalysis(melody: number[]) {
    const result = await transformationService.analyzeMelodicContour(melody);
    if (result.success && result.provenance) {
      this.steps.push(this.createProvenanceEntry(result));
    }
    return result;
  }
  
  async addHarmonicAnalysis(chords: string[]) {
    const result = await transformationService.analyzeProgression(chords);
    if (result.success && result.provenance) {
      this.steps.push(this.createProvenanceEntry(result));
    }
    return result;
  }
  
  async addRhythmicAnalysis(pattern: number[]) {
    const result = await transformationService.analyzeRhythmPattern(pattern);
    if (result.success && result.provenance) {
      this.steps.push(this.createProvenanceEntry(result));
    }
    return result;
  }
  
  private createProvenanceEntry(result: any): ProvenanceEntry {
    return {
      id: result.provenance.id,
      transformation: result.provenance.transformation,
      timestamp: result.provenance.timestamp,
      inputs: result.provenance.inputs,
      outputs: result.data,
      executionTime: result.execution_time_ms || 0,
      user: result.provenance.context?.user_id || 'anonymous'
    };
  }
  
  getChainSummary() {
    const totalTime = this.steps.reduce((sum, step) => sum + step.executionTime, 0);
    const transformations = this.steps.map(s => s.transformation);
    
    return {
      totalSteps: this.steps.length,
      totalExecutionTime: totalTime,
      transformationSequence: transformations,
      timespan: {
        start: Math.min(...this.steps.map(s => s.timestamp)),
        end: Math.max(...this.steps.map(s => s.timestamp))
      },
      users: [...new Set(this.steps.map(s => s.user))]
    };
  }
  
  exportToJSON(): string {
    return JSON.stringify({
      pipeline_id: `pipeline-${Date.now()}`,
      created_at: new Date().toISOString(),
      summary: this.getChainSummary(),
      steps: this.steps
    }, null, 2);
  }
}

// Usage example
const pipeline = new TransformationPipeline();

// Analyze a complete musical piece
await pipeline.addMelodicAnalysis([60, 64, 67, 72, 69, 65, 62, 60]);
await pipeline.addHarmonicAnalysis(['C', 'Am', 'F', 'G']);
await pipeline.addRhythmicAnalysis([1, 0, 1, 0, 1, 1, 0, 1]);

console.log('Pipeline Summary:', pipeline.getChainSummary());
console.log('Full Export:', pipeline.exportToJSON());
```

## Example 3: Real-time Provenance Dashboard

### Vue.js Dashboard Component

```vue
<!-- src/components/ProvenanceDashboard.vue -->
<template>
  <div class="provenance-dashboard">
    <h2>Real-time Transformation Monitoring</h2>
    
    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Transformations</h3>
        <div class="stat-value">{{ totalTransformations }}</div>
      </div>
      <div class="stat-card">
        <h3>Active Users</h3>
        <div class="stat-value">{{ activeUsers.length }}</div>
      </div>
      <div class="stat-card">
        <h3>Avg Execution Time</h3>
        <div class="stat-value">{{ averageExecutionTime }}ms</div>
      </div>
    </div>
    
    <!-- Live Feed -->
    <div class="live-feed">
      <h3>Live Transformation Feed</h3>
      <div class="feed-items">
        <div 
          v-for="entry in recentTransformations" 
          :key="entry.id"
          class="feed-item"
          :class="{ 'slow': entry.executionTime > 1000 }"
        >
          <div class="feed-header">
            <span class="transformation-name">{{ entry.transformation }}</span>
            <span class="timestamp">{{ formatTime(entry.timestamp) }}</span>
          </div>
          <div class="feed-details">
            User: {{ entry.user }} | {{ entry.executionTime }}ms
          </div>
        </div>
      </div>
    </div>
    
    <!-- Performance Chart -->
    <div class="performance-chart">
      <h3>Execution Time Trends</h3>
      <canvas ref="chartCanvas" width="400" height="200"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const provenanceHistory = ref<ProvenanceEntry[]>([]);
const chartCanvas = ref<HTMLCanvasElement>();

// Computed properties
const totalTransformations = computed(() => provenanceHistory.value.length);

const activeUsers = computed(() => {
  const recentEntries = provenanceHistory.value.filter(
    entry => Date.now() - (entry.timestamp * 1000) < 5 * 60 * 1000 // Last 5 minutes
  );
  return [...new Set(recentEntries.map(entry => entry.user))];
});

const averageExecutionTime = computed(() => {
  if (provenanceHistory.value.length === 0) return 0;
  const total = provenanceHistory.value.reduce((sum, entry) => sum + entry.executionTime, 0);
  return Math.round(total / provenanceHistory.value.length);
});

const recentTransformations = computed(() => {
  return provenanceHistory.value
    .slice(0, 10)
    .sort((a, b) => b.timestamp - a.timestamp);
});

// Methods
const formatTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleTimeString();
};

const addProvenanceEntry = (entry: ProvenanceEntry) => {
  provenanceHistory.value.unshift(entry);
  
  // Keep only last 100 entries
  if (provenanceHistory.value.length > 100) {
    provenanceHistory.value = provenanceHistory.value.slice(0, 100);
  }
  
  updateChart();
};

const updateChart = () => {
  if (!chartCanvas.value) return;
  
  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;
  
  // Simple line chart of execution times
  const recent = provenanceHistory.value.slice(0, 20).reverse();
  const maxTime = Math.max(...recent.map(e => e.executionTime));
  
  ctx.clearRect(0, 0, 400, 200);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  recent.forEach((entry, index) => {
    const x = (index / (recent.length - 1)) * 380 + 10;
    const y = 190 - (entry.executionTime / maxTime) * 180;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
};

// Simulate real-time updates (in real app, this would come from WebSocket or polling)
let simulationInterval: number;

onMounted(() => {
  simulationInterval = setInterval(() => {
    // Simulate a new transformation
    const mockEntry: ProvenanceEntry = {
      id: `mock-${Date.now()}`,
      transformation: ['analyzeMelodicContour', 'analyzeChord', 'analyzeRhythmPattern'][Math.floor(Math.random() * 3)],
      timestamp: Date.now() / 1000,
      inputs: { mock: 'data' },
      outputs: { result: 'mock' },
      executionTime: Math.random() * 2000 + 100,
      user: ['user-1', 'user-2', 'user-3'][Math.floor(Math.random() * 3)]
    };
    
    addProvenanceEntry(mockEntry);
  }, 3000);
});

onUnmounted(() => {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }
});
</script>

<style scoped>
.provenance-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  font-size: 2em;
  font-weight: bold;
  color: #3b82f6;
}

.live-feed {
  margin-bottom: 30px;
}

.feed-items {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.feed-item {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
  background: white;
}

.feed-item.slow {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
}

.feed-details {
  font-size: 0.9em;
  color: #6b7280;
  margin-top: 4px;
}

.performance-chart {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
}
</style>
```
