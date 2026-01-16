/**
 * Performance Tester Component
 * React Flow performance testing and benchmarking utilities
 */

import React, { useState, useCallback, useRef } from 'react';
import performanceService, {
  WorkflowOptimizationRequest,
  BenchmarkResult
} from '../../services/performanceService';

interface PerformanceTestConfig {
  nodeCount: number;
  edgeCount: number;
  testIterations: number;
  zoomLevel: number;
  viewportWidth: number;
  viewportHeight: number;
}

interface TestResult {
  testName: string;
  duration: number;
  success: boolean;
  error?: string;
  details?: any;
}

interface PerformanceMetrics {
  fps: number;
  memoryUsed: number;
  renderTime: number;
  nodeCount: number;
  visibleNodes: number;
}

export const PerformanceTester: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [testConfig, setTestConfig] = useState<PerformanceTestConfig>({
    nodeCount: 1000,
    edgeCount: 2000,
    testIterations: 5,
    zoomLevel: 1.0,
    viewportWidth: 1920,
    viewportHeight: 1080
  });
  const [realTimeMetrics, setRealTimeMetrics] = useState<PerformanceMetrics | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult | null>(null);

  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsArrayRef = useRef<number[]>([]);

  // Generate test data
  const generateTestData = useCallback((config: PerformanceTestConfig) => {
    const nodes = [];
    const edges = [];

    // Generate nodes in a grid pattern
    const cols = Math.ceil(Math.sqrt(config.nodeCount));

    for (let i = 0; i < config.nodeCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      nodes.push({
        id: `test_node_${i}`,
        type: ['default', 'input', 'output', 'processor'][i % 4],
        position: {
          x: col * 200,
          y: row * 150
        },
        data: {
          label: `Test Node ${i}`,
          width: 150,
          height: 80,
          color: `hsl(${(i * 360) / config.nodeCount}, 70%, 50%)`,
          complexData: new Array(100).fill(0).map((_, j) => `data_${i}_${j}`)
        }
      });
    }

    // Generate edges
    for (let i = 0; i < Math.min(config.edgeCount, config.nodeCount * 2); i++) {
      const sourceIdx = Math.floor(Math.random() * config.nodeCount);
      let targetIdx = Math.floor(Math.random() * config.nodeCount);

      // Ensure no self-loops
      while (targetIdx === sourceIdx) {
        targetIdx = Math.floor(Math.random() * config.nodeCount);
      }

      edges.push({
        id: `test_edge_${i}`,
        source: `test_node_${sourceIdx}`,
        target: `test_node_${targetIdx}`,
        type: ['default', 'smoothstep', 'bezier'][i % 3],
        animated: i % 10 === 0
      });
    }

    return { nodes, edges };
  }, []);

  // Measure FPS
  const measureFPS = useCallback(() => {
    const currentTime = performance.now();

    if (lastFrameTimeRef.current > 0) {
      const deltaTime = currentTime - lastFrameTimeRef.current;
      const fps = 1000 / deltaTime;

      fpsArrayRef.current.push(fps);

      // Keep only last 60 frames (1 second at 60fps)
      if (fpsArrayRef.current.length > 60) {
        fpsArrayRef.current.shift();
      }

      // Update real-time metrics
      if (fpsArrayRef.current.length > 0) {
        const avgFPS = fpsArrayRef.current.reduce((a, b) => a + b, 0) / fpsArrayRef.current.length;
        const memoryUsed = (performance as any).memory ?
          (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0;

        setRealTimeMetrics({
          fps: avgFPS,
          memoryUsed,
          renderTime: deltaTime,
          nodeCount: testConfig.nodeCount,
          visibleNodes: Math.min(testConfig.nodeCount, 1000) // Approximate visible count
        });
      }
    }

    lastFrameTimeRef.current = currentTime;
    animationFrameRef.current = requestAnimationFrame(measureFPS);
  }, [testConfig.nodeCount]);

  // Start real-time monitoring
  const startMonitoring = useCallback(() => {
    fpsArrayRef.current = [];
    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(measureFPS);
  }, [measureFPS]);

  // Stop real-time monitoring
  const stopMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  // Run individual test
  const runTest = useCallback(async (testName: string, testFn: () => Promise<any>): Promise<TestResult> => {
    const startTime = performance.now();
    setCurrentTest(testName);

    try {
      const result = await testFn();
      const duration = performance.now() - startTime;

      return {
        testName,
        duration,
        success: true,
        details: result
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        testName,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, []);

  // Run comprehensive performance tests
  const runPerformanceTests = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestResults([]);
    startMonitoring();

    try {
      const results: TestResult[] = [];

      // Test 1: Data Generation Performance
      const dataGenResult = await runTest('Data Generation', async () => {
        const start = performance.now();
        const testData = generateTestData(testConfig);
        const duration = performance.now() - start;

        return {
          nodeCount: testData.nodes.length,
          edgeCount: testData.edges.length,
          generationTime: duration
        };
      });
      results.push(dataGenResult);

      // Get generated data for subsequent tests
      const testData = generateTestData(testConfig);

      // Test 2: Workflow Optimization
      const optimizeResult = await runTest('Workflow Optimization', async () => {
        const workflowData: WorkflowOptimizationRequest = {
          nodes: testData.nodes,
          viewport: {
            x: 0,
            y: 0,
            width: testConfig.viewportWidth,
            height: testConfig.viewportHeight,
            zoom: testConfig.zoomLevel
          },
          edges: testData.edges
        };

        return await performanceService.optimizeWorkflow(workflowData);
      });
      results.push(optimizeResult);

      // Test 3: Caching Performance
      const cacheResult = await runTest('Caching Performance', async () => {
        const workflowData: WorkflowOptimizationRequest = {
          nodes: testData.nodes,
          viewport: {
            x: 0,
            y: 0,
            width: testConfig.viewportWidth,
            height: testConfig.viewportHeight,
            zoom: testConfig.zoomLevel
          },
          edges: testData.edges
        };

        const cacheStart = performance.now();
        await performanceService.cacheWorkflow('perf_test', workflowData, 60);
        const cacheTime = performance.now() - cacheStart;

        const retrieveStart = performance.now();
        const cachedData = await performanceService.getCachedWorkflow('perf_test');
        const retrieveTime = performance.now() - retrieveStart;

        return {
          cacheTime,
          retrieveTime,
          totalCacheTime: cacheTime + retrieveTime,
          cacheHit: cachedData !== null
        };
      });
      results.push(cacheResult);

      // Test 4: Memory Usage Test
      const memoryResult = await runTest('Memory Usage Analysis', async () => {
        const initialMemory = (performance as any).memory ?
          (performance as any).memory.usedJSHeapSize : 0;

        // Create multiple large objects
        const largeObjects = [];
        for (let i = 0; i < 100; i++) {
          largeObjects.push(new Array(10000).fill(i).map(j => ({
            id: `${i}_${j}`,
            data: new Array(100).fill(`test_data_${i}_${j}`),
            timestamp: Date.now(),
            metadata: {
              type: 'test',
              size: 100,
              complex: true
            }
          })));
        }

        const finalMemory = (performance as any).memory ?
          (performance as any).memory.usedJSHeapSize : 0;

        // Clean up
        largeObjects.length = 0;

        if (typeof gc !== 'undefined') {
          gc(); // Force garbage collection if available
        }

        return {
          initialMemoryMB: initialMemory / 1024 / 1024,
          finalMemoryMB: finalMemory / 1024 / 1024,
          memoryIncreaseMB: (finalMemory - initialMemory) / 1024 / 1024,
          objectsCreated: 100,
          objectSize: '10KB each'
        };
      });
      results.push(memoryResult);

      // Test 5: Rendering Performance
      const renderResult = await runTest('Rendering Performance', async () => {
        const renderTimes = [];

        for (let i = 0; i < 10; i++) {
          const start = performance.now();

          // Simulate rendering work
          const nodes = testData.nodes.slice(0, Math.min(1000, testData.nodes.length));
          nodes.forEach(node => {
            // Simulate DOM operations
            const element = document.createElement('div');
            element.textContent = node.data.label;
            element.style.width = `${node.data.width}px`;
            element.style.height = `${node.data.height}px`;
            element.style.transform = `translate(${node.position.x}px, ${node.position.y}px)`;
          });

          const renderTime = performance.now() - start;
          renderTimes.push(renderTime);
        }

        return {
          averageRenderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
          minRenderTime: Math.min(...renderTimes),
          maxRenderTime: Math.max(...renderTimes),
          samples: renderTimes.length
        };
      });
      results.push(renderResult);

      // Test 6: Stress Test
      const stressResult = await runTest('Stress Test', async () => {
        const stressResults = [];

        for (let iteration = 0; iteration < 3; iteration++) {
          const start = performance.now();

          // Perform intensive operations
          const promises = [];
          for (let i = 0; i < 50; i++) {
            promises.push(new Promise(resolve => {
              setTimeout(() => {
                // Simulate heavy computation
                let result = 0;
                for (let j = 0; j < 100000; j++) {
                  result += Math.sqrt(j);
                }
                resolve(result);
              }, 1);
            }));
          }

          await Promise.all(promises);
          const duration = performance.now() - start;
          stressResults.push(duration);
        }

        return {
          iterations: stressResults.length,
          averageTime: stressResults.reduce((a, b) => a + b, 0) / stressResults.length,
          times: stressResults
        };
      });
      results.push(stressResult);

      setTestResults(results);

    } finally {
      setCurrentTest('');
      setIsRunning(false);

      // Keep monitoring running for a bit to show final results
      setTimeout(() => {
        stopMonitoring();
      }, 2000);
    }
  }, [isRunning, testConfig, generateTestData, runTest, startMonitoring, stopMonitoring]);

  // Run benchmark
  const runBenchmark = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setCurrentTest('Running Benchmark...');

    try {
      const testData = generateTestData(testConfig);
      const workflowData: WorkflowOptimizationRequest = {
        nodes: testData.nodes,
        viewport: {
          x: 0,
          y: 0,
          width: testConfig.viewportWidth,
          height: testConfig.viewportHeight,
          zoom: testConfig.zoomLevel
        },
        edges: testData.edges
      };

      const benchmark = await performanceService.benchmarkWorkflow(workflowData, testConfig.testIterations);
      setBenchmarkResults(benchmark);

      setTestResults([{
        testName: 'Comprehensive Benchmark',
        duration: benchmark.optimization_performance.avg_time_ms,
        success: true,
        details: benchmark
      }]);

    } catch (error) {
      setTestResults([{
        testName: 'Comprehensive Benchmark',
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Benchmark failed'
      }]);
    } finally {
      setCurrentTest('');
      setIsRunning(false);
    }
  }, [isRunning, testConfig, generateTestData]);

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Format memory
  const formatMemory = (mb: number): string => {
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className={`performance-tester p-6 bg-white rounded-lg shadow ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Performance Tester</h2>
        <div className="flex space-x-2">
          <button
            onClick={runPerformanceTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isRunning && currentTest ? currentTest : 'Run Tests'}
          </button>
          <button
            onClick={runBenchmark}
            disabled={isRunning}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Run Benchmark
          </button>
          <button
            onClick={() => {
              setTestResults([]);
              setBenchmarkResults(null);
              setRealTimeMetrics(null);
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Test Configuration */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Test Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nodes</label>
            <input
              type="number"
              value={testConfig.nodeCount}
              onChange={(e) => setTestConfig(prev => ({ ...prev, nodeCount: parseInt(e.target.value) || 100 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="10"
              max="10000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Edges</label>
            <input
              type="number"
              value={testConfig.edgeCount}
              onChange={(e) => setTestConfig(prev => ({ ...prev, edgeCount: parseInt(e.target.value) || 200 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              max="20000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Iterations</label>
            <input
              type="number"
              value={testConfig.testIterations}
              onChange={(e) => setTestConfig(prev => ({ ...prev, testIterations: parseInt(e.target.value) || 5 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zoom Level</label>
            <input
              type="number"
              value={testConfig.zoomLevel}
              onChange={(e) => setTestConfig(prev => ({ ...prev, zoomLevel: parseFloat(e.target.value) || 1.0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0.1"
              max="5"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Viewport Width</label>
            <input
              type="number"
              value={testConfig.viewportWidth}
              onChange={(e) => setTestConfig(prev => ({ ...prev, viewportWidth: parseInt(e.target.value) || 1920 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="800"
              max="3840"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Viewport Height</label>
            <input
              type="number"
              value={testConfig.viewportHeight}
              onChange={(e) => setTestConfig(prev => ({ ...prev, viewportHeight: parseInt(e.target.value) || 1080 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="600"
              max="2160"
            />
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
      {realTimeMetrics && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800">Real-time Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-gray-600">FPS</div>
              <div className={`text-lg font-bold ${realTimeMetrics.fps >= 50 ? 'text-green-600' : realTimeMetrics.fps >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                {realTimeMetrics.fps.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Memory</div>
              <div className="text-lg font-bold text-blue-600">
                {formatMemory(realTimeMetrics.memoryUsed)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Render Time</div>
              <div className="text-lg font-bold text-purple-600">
                {realTimeMetrics.renderTime.toFixed(2)}ms
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Nodes</div>
              <div className="text-lg font-bold text-gray-600">
                {realTimeMetrics.nodeCount.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Visible Nodes</div>
              <div className="text-lg font-bold text-green-600">
                {realTimeMetrics.visibleNodes.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Test Results</h3>
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <h4 className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.testName}
                  </h4>
                  <span className={`text-sm font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {formatDuration(result.duration)}
                  </span>
                </div>

                {result.error && (
                  <p className="text-red-600 text-sm mt-1">{result.error}</p>
                )}

                {result.details && (
                  <div className="mt-2 text-sm">
                    {Object.entries(result.details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="font-medium">
                          {typeof value === 'number' && key.toLowerCase().includes('time')
                            ? formatDuration(value)
                            : typeof value === 'number' && key.toLowerCase().includes('memory')
                            ? formatMemory(value)
                            : typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmark Results */}
      {benchmarkResults && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-purple-800">Benchmark Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-purple-700 mb-2">Performance</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Time:</span>
                  <span className="font-medium">{formatDuration(benchmarkResults.optimization_performance.avg_time_ms)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min Time:</span>
                  <span className="font-medium">{formatDuration(benchmarkResults.optimization_performance.min_time_ms)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Time:</span>
                  <span className="font-medium">{formatDuration(benchmarkResults.optimization_performance.max_time_ms)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Std Dev:</span>
                  <span className="font-medium">{formatDuration(benchmarkResults.optimization_performance.std_time_ms)}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-purple-700 mb-2">Rendering</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Visible:</span>
                  <span className="font-medium">{benchmarkResults.rendering_performance.avg_visible_nodes.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Culled:</span>
                  <span className="font-medium">{benchmarkResults.rendering_performance.avg_culled_nodes.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Iterations:</span>
                  <span className="font-medium">{benchmarkResults.iterations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Nodes:</span>
                  <span className="font-medium">{benchmarkResults.workflow_stats.total_nodes.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Guidelines */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-3">Performance Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-green-700 mb-2">Good Performance Indicators</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• FPS ≥ 60 for smooth animations</li>
              <li>• Memory usage &lt; 500MB for large workflows</li>
              <li>• Optimization time &lt; 100ms</li>
              <li>• Cache hit rate ≥ 80%</li>
              <li>• Render time &lt; 16ms per frame</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Performance Issues</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• FPS &lt; 30 indicates rendering bottleneck</li>
              <li>• Memory usage &gt; 1GB may cause crashes</li>
              <li>• Optimization time &gt; 1s needs attention</li>
              <li>• Cache hit rate &lt; 50% inefficient caching</li>
              <li>• Render time &gt; 33ms causes stuttering</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTester;