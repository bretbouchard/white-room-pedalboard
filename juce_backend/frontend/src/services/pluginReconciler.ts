import { useWebSocketStore, WebSocketMessage } from '@/stores/websocketStore';
import { usePluginStore } from '@/stores/pluginStore';
import { PluginParameter } from '@/types';

/**
 * pluginReconciler - subscribes to incoming websocket messages and reconciles
 * plugin instances that were created optimistically on the client.
 *
 * This file exposes an `initPluginReconciler` function which attaches a
 * persistent subscription to the websocket store. The subscription expects
 * messages of the form { type: 'ack', data: { original_message_id, success, message, data } }
 * as well as server-initiated plugin events such as 'plugin.added',
 * 'plugin.parameter', etc.
 */

export function initPluginReconciler() {
  console.log('Initializing plugin reconciler');
  const wsStore = useWebSocketStore.getState();
  const pluginStore = usePluginStore.getState();

  const unsubscribe = wsStore.subscribe((msg: WebSocketMessage) => {
    try {
      // ACK messages (server responses to client requests)
      if (msg.type === 'ack' && msg.data) {
        const ack = msg.data as {
          original_message_id?: string;
          success?: boolean;
          data?: Record<string, unknown>;
        };
        const originalId = ack.original_message_id ?? '';
        const payload = ack.data ?? {};

        if (originalId.startsWith('plugin.add')) {
          if (payload && 'plugin_id' in payload && 'plugin_unique_id' in payload) {
            const canonicalId = String(payload['plugin_id']);
            const uniqueId = String(payload['plugin_unique_id']);

            const optimisticInstance = Object.values(pluginStore.pluginInstances).find(
              (inst) => inst.plugin_metadata.unique_id === uniqueId && inst.state === 'loading'
            );

            if (optimisticInstance) {
              const trackId = Object.keys(pluginStore.trackPlugins).find(key => pluginStore.trackPlugins[key].includes(optimisticInstance.instance_id));

              if(trackId) {
                // Update the instance with the canonical ID and parameters from the server
                pluginStore.removePluginInstance(trackId, optimisticInstance.instance_id);
                const newInstance = {
                  ...optimisticInstance,
                  instance_id: canonicalId,
                  state: 'loaded' as const,
                  parameters: (payload['parameters'] as Record<string, PluginParameter>) ?? optimisticInstance.parameters,
                };
                pluginStore.addPluginInstance(trackId, newInstance);
              }
            }
          }
        }
      }

      // Server-initiated plugin parameter updates
      if (msg.type === 'plugin.parameter' && msg.data) {
        const data = msg.data as {
          plugin_id?: string;
          parameter_id?: string;
          parameter_value?: number;
        };
        const { plugin_id, parameter_id, parameter_value } = data;

        if (plugin_id && parameter_id && typeof parameter_value === 'number') {
          if (pluginStore.pluginInstances[plugin_id]) {
            pluginStore.setPluginParameter(plugin_id, parameter_id, parameter_value);
          }
        }
      }

      // Server may broadcast plugin added events
      if ((msg.type === 'plugin.added' || msg.type === 'plugin_added') && msg.data) {
        const data = msg.data as Record<string, unknown>;
        const pluginId = String(data['plugin_id'] ?? '');
        if (pluginId && !pluginStore.pluginInstances[pluginId]) {
            // In a real implementation, we would need more metadata to add a new plugin
            // For now, we'll just log it.
            console.log(`Received event for unknown plugin ${pluginId}, ignoring.`);
        }
      }
    } catch (e) {
      // swallow errors - reconciler should be best-effort
      console.error('pluginReconciler error processing message', e);
    }
  });

  return () => unsubscribe();
}

// If this file is imported for side-effects in a react app entrypoint,
// the consumer should call `initPluginReconciler()` once on startup.
