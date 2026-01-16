import { AGUIEvent } from './agui-bridge';

export interface CopilotKitAction {
  name: string;
  parameters: Record<string, any>;
}

export interface CopilotKitReadable {
  description: string;
  value: any;
}

export type MappedCopilotKitEntity = CopilotKitAction | CopilotKitReadable;

export type AGUIEventMapper = (event: AGUIEvent) => MappedCopilotKitEntity | null;

// Registry for event mappers, now supporting versions: Map<eventType, Map<version, mapper>>
const eventMappers = new Map<string, Map<string | undefined, AGUIEventMapper>>();

/**
 * Registers an AG-UI event mapper for a specific event type and optional version.
 * If a mapper for the given event type and version already exists, it will be overwritten.
 * @param eventType The type of the AG-UI event (e.g., 'tool_call', 'state_patch').
 * @param mapper The function that maps the AG-UI event to a CopilotKit entity.
 * @param version Optional: The version of the AG-UI event schema. If not provided, registers as a default mapper for the event type.
 */
export function registerAGUIEventMapper(eventType: string, mapper: AGUIEventMapper, version?: string): void {
  if (!eventMappers.has(eventType)) {
    eventMappers.set(eventType, new Map<string | undefined, AGUIEventMapper>());
  }
  eventMappers.get(eventType)?.set(version, mapper);
  console.log(`AG-UI Mapping: Registered mapper for event type: ${eventType}${version ? ` (version: ${version})` : ' (default)'}`);
}

/**
 * Translates AG-UI events into CopilotKit APIs (actions or readable state) using registered mappers.
 * Attempts to find a version-specific mapper first, then falls back to a default mapper for the event type.
 * @param event The incoming AG-UI event.
 * @returns A mapped CopilotKit action or readable state, or null if not applicable.
 */
export function mapAGUIEventToCopilotKit(event: AGUIEvent): MappedCopilotKitEntity | null {
  const versionedMappers = eventMappers.get(event.type);
  if (versionedMappers) {
    // Try to find a version-specific mapper first
    if (event.version && versionedMappers.has(event.version)) {
      return versionedMappers.get(event.version)!(event);
    }
    // Fallback to default mapper if no version or no version-specific mapper found
    if (versionedMappers.has(undefined)) {
      return versionedMappers.get(undefined)!(event);
    }
  }

  // Default handling for unmapped event types (if no mapper is found at all)
  switch (event.type) {
    case 'message':
      console.log('AG-UI Mapping: Received generic message', event.payload);
      return null;
    case 'ready':
      console.log('AG-UI Mapping: System ready event', event.payload);
      return null;
    case 'error':
      console.error('AG-UI Mapping: Received error event', event.payload);
      return null;
    default:
      console.warn('AG-UI Mapping: Unhandled event type', event.type, event);
      return null;
  }
}

// You might also want to define schema validation functions here
export function validateToolCallSchema(payload: any): boolean {
  return typeof payload === 'object' && payload !== null &&
         typeof payload.name === 'string' &&
         typeof payload.parameters === 'object';
}

export function validateStatePatchSchema(payload: any): boolean {
  return typeof payload === 'object' && payload !== null &&
         typeof payload.description === 'string' &&
         payload.value !== undefined;
}

// Register default mappers (now without explicit version, making them default for their type)
registerAGUIEventMapper('tool_call', (event: AGUIEvent) => {
  if (event.payload && event.payload.name && event.payload.parameters) {
    return {
      name: event.payload.name,
      parameters: event.payload.parameters,
    };
  }
  console.warn('AG-UI Mapping: Invalid tool_call event payload', event);
  return null;
});

registerAGUIEventMapper('state_patch', (event: AGUIEvent) => {
  if (event.payload && event.payload.description && event.payload.value) {
    return {
      description: event.payload.description,
      value: event.payload.value,
    };
  }
  console.warn('AG-UI Mapping: Invalid state_patch event payload', event);
  return null;
});
