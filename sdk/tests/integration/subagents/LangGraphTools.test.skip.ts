/**
 * LangGraph Tool Integration Tests
 *
 * Tests integration between Schillinger SDK and LangGraph tools
 * Validates subagent coordination and tool functionality
 *
 * Note: This test suite requires @langchain/langgraph to be installed.
 * If the package is not available, these tests are skipped.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Try to import LangGraph dependencies
// If not available, skip the entire test suite
let Graph: any, StateGraph: any, START: any, END: any;
let Tool: any, ToolExecutor: any;
let HumanMessage: any, AIMessage: any;
let SchillingerSDK: any;
let AcknowledgeManager: any;
let HardwareSimulator: any;

let langGraphAvailable = false;

try {
  const langgraph = require("@langchain/langgraph");
  Graph = langgraph.Graph;
  StateGraph = langgraph.StateGraph;
  START = langgraph.START;
  END = langgraph.END;

  const core = require("@langchain/core/tools");
  Tool = core.Tool;
  ToolExecutor = core.ToolExecutor;

  const messages = require("@langchain/core/messages");
  HumanMessage = messages.HumanMessage;
  AIMessage = messages.AIMessage;

  SchillingerSDK = require("../../../packages/core/src/client").SchillingerSDK;
  AcknowledgeManager = require("../../../packages/core/src/collaboration").AcknowledgeManager;
  HardwareSimulator = require("../../hardware/setup").HardwareSimulator;

  langGraphAvailable = true;
} catch (e) {
  // @langchain/langgraph not available, tests will be skipped
  langGraphAvailable = false;
}

describe.skipIf(!langGraphAvailable)("LangGraph Tool Integration Tests", () => {

// Test interfaces for LangGraph integration
interface SchillingerGraphState {
  messages: any[];
  composition: any;
  analysis: any;
  currentStep: string;
  parameters: Record<string, any>;
  errors: string[];
  metadata: Record<string, any>;
}

interface SubagentCapabilities {
  name: string;
  tools: Tool[];
  description: string;
  canHandle: string[];
  priority: number;
}

/**
 * Schillinger Tool implementations for LangGraph
 */
class GenerateCounterpointTool extends Tool {
  name = "generate_counterpoint";
  description = "Generate counterpoint using Schillinger system theory";
  sdk: SchillingerSDK;

  constructor(sdk: SchillingerSDK) {
    super();
    this.sdk = sdk;
  }

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { cantusFirmus, species, constraints } = params;

      const counterpoint = await this.sdk.counterpoint.generateCounterpoint(
        cantusFirmus,
        {
          species,
          constraints: constraints || {
            maxMelodicInterval: 8,
            maxHarmonicInterval: 12,
            forbiddenIntervals: [],
            requiredIntervals: [],
            parallelMovementLimit: 3,
            voiceCrossing: false,
          },
          cantusFirmusRange: [48, 72],
          counterpointRange: [60, 84],
        },
      );

      return JSON.stringify({
        success: true,
        counterpoint,
        metadata: {
          species,
          noteCount: counterpoint.notes.length,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

class AnalyzeHarmonyTool extends Tool {
  name = "analyze_harmony";
  description = "Analyze harmonic structure of musical composition";
  sdk: SchillingerSDK;

  constructor(sdk: SchillingerSDK) {
    super();
    this.sdk = sdk;
  }

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { composition, analysisDepth = "standard" } = params;

      const analysis = await this.sdk.harmony.analyze(composition, {
        includeVoiceLeading: true,
        includeCadences: true,
        includeModulations: true,
        depth: analysisDepth,
      });

      return JSON.stringify({
        success: true,
        analysis: {
          harmonicProgression: analysis.progression,
          key: analysis.key,
          modulations: analysis.modulations,
          voiceLeadingIssues: analysis.voiceLeadingIssues,
          cadences: analysis.cadences,
          complexity: analysis.complexity,
        },
        metadata: {
          analysisDepth,
          analyzedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

class GenerateRhythmTool extends Tool {
  name = "generate_rhythm";
  description = "Generate rhythmic patterns using Schillinger resultant theory";
  sdk: SchillingerSDK;

  constructor(sdk: SchillingerSDK) {
    super();
    this.sdk = sdk;
  }

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const {
        basePattern,
        resultantPattern,
        complexity = 1,
        style = "schillinger",
      } = params;

      const rhythms = this.sdk.rhythm.generateResultants(
        basePattern,
        resultantPattern,
        {
          complexity,
          style,
          variations: true,
          syncopations: true,
        },
      );

      return JSON.stringify({
        success: true,
        rhythms,
        metadata: {
          basePattern,
          resultantPattern,
          complexity,
          style,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

class ControlHardwareTool extends Tool {
  name = "control_hardware";
  description = "Control ACK05 hardware and retrieve sensor data";
  hardware: HardwareSimulator;

  constructor(hardware: HardwareSimulator) {
    super();
    this.hardware = hardware;
  }

  async _call(input: string): Promise<string> {
    try {
      const params = JSON.parse(input);
      const { action, device, parameters } = params;

      let result: any = {};

      switch (action) {
        case "connect":
          result.connected = await this.hardware.connect();
          break;

        case "set_fader":
          await this.hardware.setFader(parameters.index, parameters.value);
          result.success = true;
          break;

        case "set_knob":
          await this.hardware.setKnob(parameters.index, parameters.value);
          result.success = true;
          break;

        case "get_state":
          result.state = this.hardware.getState();
          break;

        case "calibrate":
          result.calibrated = await this.hardware.calibrate();
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return JSON.stringify({
        success: true,
        result,
        action,
        device,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

describe("LangGraph Tool Integration", () => {
  let sdk: SchillingerSDK;
  let hardware: HardwareSimulator;
  let tools: Tool[];
  let toolExecutor: ToolExecutor;

  beforeEach(async () => {
    // Initialize SDK
    sdk = new SchillingerSDK({
      endpoint: "ws://localhost:8080",
      reconnect: false,
    });

    // Initialize hardware simulator
    hardware = new HardwareSimulator({
      mockHardware: true,
      enableRealHardware: false,
      responseDelayMs: 1,
      failureRate: 0,
    });

    // Initialize tools
    tools = [
      new GenerateCounterpointTool(sdk),
      new AnalyzeHarmonyTool(sdk),
      new GenerateRhythmTool(sdk),
      new ControlHardwareTool(hardware),
    ];

    toolExecutor = new ToolExecutor({ tools });
  });

  afterEach(async () => {
    if (hardware && hardware.getState().connected) {
      await hardware.disconnect();
    }
  });

  describe("Tool Functionality", () => {
    it("should execute counterpoint generation tool", async () => {
      const input = JSON.stringify({
        cantusFirmus: {
          notes: [
            { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
            { midi: 62, velocity: 80, duration: 1, pitch: "D4" },
            { midi: 64, velocity: 80, duration: 1, pitch: "E4" },
          ],
          name: "Test Cantus",
          range: [60, 64],
        },
        species: 1,
        constraints: {
          maxMelodicInterval: 8,
          maxHarmonicInterval: 12,
          forbiddenIntervals: [],
          requiredIntervals: [],
          parallelMovementLimit: 3,
          voiceCrossing: false,
        },
      });

      const tool = tools.find((t) => t.name === "generate_counterpoint")!;
      const result = await tool._call(input);

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.counterpoint).toBeDefined();
      expect(parsed.counterpoint.notes).toHaveLength(3);
      expect(parsed.metadata.species).toBe(1);
    });

    it("should execute harmony analysis tool", async () => {
      const input = JSON.stringify({
        composition: {
          notes: [
            { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
            { midi: 64, velocity: 80, duration: 1, pitch: "E4" },
            { midi: 67, velocity: 80, duration: 1, pitch: "G4" },
          ],
          key: "C",
          timeSignature: [4, 4],
        },
        analysisDepth: "standard",
      });

      const tool = tools.find((t) => t.name === "analyze_harmony")!;
      const result = await tool._call(input);

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.analysis).toBeDefined();
      expect(parsed.analysis.harmonicProgression).toBeDefined();
    });

    it("should execute rhythm generation tool", async () => {
      const input = JSON.stringify({
        basePattern: [1, 0, 1, 0, 1, 0],
        resultantPattern: [1, 1, 0, 1, 0, 1],
        complexity: 2,
        style: "schillinger",
      });

      const tool = tools.find((t) => t.name === "generate_rhythm")!;
      const result = await tool._call(input);

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.rhythms).toBeDefined();
    });

    it("should execute hardware control tool", async () => {
      // Connect to hardware
      await hardware.connect();

      const input = JSON.stringify({
        action: "set_fader",
        device: "ack05",
        parameters: { index: 0, value: 100 },
      });

      const tool = tools.find((t) => t.name === "control_hardware")!;
      const result = await tool._call(input);

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.result.success).toBe(true);

      // Verify hardware state
      const state = hardware.getState();
      expect(state.faders[0]).toBe(100);
    });
  });

  describe("LangGraph State Management", () => {
    it("should maintain state across tool executions", async () => {
      const workflow = new StateGraph<SchillingerGraphState>({
        messages: {
          value: (x: any[], y: any[]) => x.concat(y),
          default: () => [],
        },
        composition: { value: (x, y) => ({ ...x, ...y }), default: () => ({}) },
        analysis: { value: (x, y) => ({ ...x, ...y }), default: () => ({}) },
        currentStep: { value: (x, y) => y, default: () => "start" },
        parameters: { value: (x, y) => ({ ...x, ...y }), default: () => ({}) },
        errors: { value: (x, y) => x.concat(y), default: () => [] },
        metadata: { value: (x, y) => ({ ...x, ...y }), default: () => ({}) },
      });

      // Define workflow nodes
      async function generateCounterpoint(
        state: SchillingerGraphState,
      ): Promise<Partial<SchillingerGraphState>> {
        const tool = tools.find((t) => t.name === "generate_counterpoint")!;
        const input = JSON.stringify(state.parameters);
        const result = await tool._call(input);

        return {
          messages: [new AIMessage(result)],
          composition: JSON.parse(result).counterpoint,
          currentStep: "analyze",
        };
      }

      async function analyzeHarmony(
        state: SchillingerGraphState,
      ): Promise<Partial<SchillingerGraphState>> {
        const tool = tools.find((t) => t.name === "analyze_harmony")!;
        const input = JSON.stringify({ composition: state.composition });
        const result = await tool._call(input);

        return {
          messages: [new AIMessage(result)],
          analysis: JSON.parse(result).analysis,
          currentStep: "complete",
        };
      }

      async function handleErrors(
        state: SchillingerGraphState,
      ): Promise<Partial<SchillingerGraphState>> {
        return {
          errors:
            state.errors.length > 0
              ? [...state.errors, "Workflow completed with errors"]
              : [],
          currentStep: "complete",
        };
      }

      // Build workflow
      workflow.addNode("generate", generateCounterpoint);
      workflow.addNode("analyze", analyzeHarmony);
      workflow.addNode("error", handleErrors);

      workflow.addConditionalEdges(
        "generate",
        (state) => (state.errors.length > 0 ? "error" : "analyze"),
        {
          analyze: "analyze",
          error: "error",
        },
      );

      workflow.addEdge("analyze", END);
      workflow.addEdge("error", END);
      workflow.addEdge(START, "generate");

      // Compile and run workflow
      const app = workflow.compile();

      const initialState: SchillingerGraphState = {
        messages: [new HumanMessage("Generate counterpoint for C-D-E")],
        composition: {},
        analysis: {},
        currentStep: "start",
        parameters: {
          cantusFirmus: {
            notes: [
              { midi: 60, velocity: 80, duration: 1, pitch: "C4" },
              { midi: 62, velocity: 80, duration: 1, pitch: "D4" },
              { midi: 64, velocity: 80, duration: 1, pitch: "E4" },
            ],
            name: "Test Cantus",
            range: [60, 64],
          },
          species: 1,
        },
        errors: [],
        metadata: {},
      };

      const result = await app.invoke(initialState);

      expect(result.currentStep).toBe("complete");
      expect(result.composition).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.messages).toHaveLength(3); // Human + AI + AI
    });
  });

  describe("Subagent Coordination", () => {
    it("should coordinate multiple subagents", async () => {
      // Define subagent capabilities
      const subagents: SubagentCapabilities[] = [
        {
          name: "harmony-expert",
          tools: [tools.find((t) => t.name === "analyze_harmony")!],
          description: "Expert in harmonic analysis",
          canHandle: ["harmonic-analysis", "progression", "modulation"],
          priority: 1,
        },
        {
          name: "rhythm-expert",
          tools: [tools.find((t) => t.name === "generate_rhythm")!],
          description: "Expert in rhythmic patterns",
          canHandle: ["rhythm-generation", "pattern-analysis", "timing"],
          priority: 2,
        },
        {
          name: "counterpoint-expert",
          tools: [tools.find((t) => t.name === "generate_counterpoint")!],
          description: "Expert in counterpoint generation",
          canHandle: ["counterpoint", "voice-leading", "species"],
          priority: 1,
        },
        {
          name: "hardware-operator",
          tools: [tools.find((t) => t.name === "control_hardware")!],
          description: "Controls ACK05 hardware",
          canHandle: ["hardware-control", "sensor-data", "midi-io"],
          priority: 3,
        },
      ];

      // Test subagent selection
      function selectSubagents(task: string): SubagentCapabilities[] {
        return subagents
          .filter((agent) =>
            agent.canHandle.some((capability) => task.includes(capability)),
          )
          .sort((a, b) => a.priority - b.priority);
      }

      // Test different task types
      const harmonyTask = "Analyze harmonic structure";
      const rhythmTask = "Generate rhythmic patterns";
      const counterpointTask = "Create counterpoint";
      const hardwareTask = "Control fader 0";

      expect(selectSubagents(harmonyTask)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "harmony-expert" }),
        ]),
      );

      expect(selectSubagents(rhythmTask)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "rhythm-expert" }),
        ]),
      );

      expect(selectSubagents(counterpointTask)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "counterpoint-expert" }),
        ]),
      );

      expect(selectSubagents(hardwareTask)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "hardware-operator" }),
        ]),
      );
    });

    it("should handle subagent task delegation", async () => {
      const taskQueue: Array<{
        task: string;
        priority: number;
        agent: string;
      }> = [];

      // Mock subagent task processing
      async function processTask(
        task: string,
        agent: SubagentCapabilities,
      ): Promise<any> {
        const tool = agent.tools[0];
        const input = JSON.stringify({ task, parameters: {} });
        return await tool._call(input);
      }

      // Test task delegation workflow
      const tasks = [
        { task: "analyze harmony", agent: "harmony-expert", priority: 1 },
        { task: "generate rhythm", agent: "rhythm-expert", priority: 2 },
        { task: "control hardware", agent: "hardware-operator", priority: 3 },
      ];

      // Sort by priority
      tasks.sort((a, b) => a.priority - b.priority);

      const results = [];
      for (const taskSpec of tasks) {
        const agent = subagents.find((a) => a.name === taskSpec.agent);
        if (agent) {
          const result = await processTask(taskSpec.task, agent);
          results.push({ task: taskSpec.task, result });
        }
      }

      expect(results).toHaveLength(3);
      results.forEach(({ result }) => {
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
      });
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle tool execution failures gracefully", async () => {
      const tool = tools.find((t) => t.name === "generate_counterpoint")!;

      // Test with invalid input
      const invalidInput = JSON.stringify({
        cantusFirmus: null, // Invalid input
        species: 1,
      });

      const result = await tool._call(invalidInput);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBeDefined();
    });

    it("should retry failed operations", async () => {
      // Mock unreliable hardware
      const unreliableHardware = new HardwareSimulator({
        mockHardware: true,
        enableRealHardware: false,
        responseDelayMs: 10,
        failureRate: 0.3, // 30% failure rate
      });

      const tool = new ControlHardwareTool(unreliableHardware);
      await unreliableHardware.connect();

      const input = JSON.stringify({
        action: "set_fader",
        device: "ack05",
        parameters: { index: 0, value: 75 },
      });

      // Retry up to 3 times
      let success = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!success && attempts < maxAttempts) {
        const result = await tool._call(input);
        const parsed = JSON.parse(result);

        if (parsed.success) {
          success = true;
        } else {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, 50)); // Brief delay
        }
      }

      expect(success).toBe(true);
      await unreliableHardware.disconnect();
    });
  });

  describe("Performance Integration", () => {
    it("should execute tools within performance constraints", async () => {
      const startTime = performance.now();

      // Execute all tools
      const toolPromises = tools.map(async (tool) => {
        const input = JSON.stringify({ test: true });
        return await tool._call(input);
      });

      const results = await Promise.all(toolPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      // Should complete all tools within 100ms
      expect(totalTime).toBeLessThan(100);

      // All tools should return valid responses
      results.forEach((result) => {
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
        expect("success" in parsed).toBe(true);
      });
    });

    it("should handle concurrent tool execution", async () => {
      const concurrentExecutions = 10;
      const tool = tools.find((t) => t.name === "generate_rhythm")!;

      const input = JSON.stringify({
        basePattern: [1, 0, 1, 0],
        resultantPattern: [1, 1, 0, 1],
        complexity: 1,
      });

      const promises = Array.from({ length: concurrentExecutions }, () =>
        tool._call(input),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentExecutions);
      results.forEach((result) => {
        const parsed = JSON.parse(result);
        expect(parsed).toBeDefined();
      });
    });
  });
});

