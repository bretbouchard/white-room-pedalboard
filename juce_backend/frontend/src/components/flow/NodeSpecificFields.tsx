import React, { useState } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { useWebSocketAck } from '@/hooks/useWebSocket';
import type { FlowNodeType } from '@/types/flow';
import type { PluginInstance } from '@/types/plugins';

interface NodeSpecificFieldsProps {
  nodeType: FlowNodeType;
  data: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export default function NodeSpecificFields({ nodeType, data, onUpdate }: NodeSpecificFieldsProps) {
  const pluginStore = usePluginStore();
  const { sendWithAck } = useWebSocketAck();
  const [attaching, setAttaching] = useState(false);

  switch (nodeType) {
    case 'song':
      return (
        <div className="grid grid-cols-2 gap-2 text-xs text-daw-text-secondary">
          <label className="flex flex-col">
            Tempo
            <input
              type="number"
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.tempo as number) ?? 120}
              onChange={event => onUpdate({ tempo: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col">
            Key
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.key as string) ?? 'C Major'}
              onChange={event => onUpdate({ key: event.target.value })}
            />
          </label>
          <label className="flex flex-col col-span-2">
            Time Signature
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.timeSignature as string) ?? '4/4'}
              onChange={event => onUpdate({ timeSignature: event.target.value })}
            />
          </label>
        </div>
      );
    case 'section':
      return (
        <div className="grid grid-cols-2 gap-2 text-xs text-daw-text-secondary">
          <label className="flex flex-col">
            Type
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.sectionType as string) ?? 'custom'}
              onChange={event => onUpdate({ sectionType: event.target.value })}
            />
          </label>
          <label className="flex flex-col">
            Start Bar
            <input
              type="number"
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.startBar as number) ?? 1}
              onChange={event => onUpdate({ startBar: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col">
            Length (bars)
            <input
              type="number"
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.lengthBars as number) ?? 8}
              onChange={event => onUpdate({ lengthBars: Number(event.target.value) })}
            />
          </label>
        </div>
      );
    case 'track':
      return (
        <div className="grid grid-cols-2 gap-2 text-xs text-daw-text-secondary">
          <label className="flex flex-col">
            Type
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.trackType as string) ?? 'audio'}
              onChange={event => onUpdate({ trackType: event.target.value })}
            />
          </label>
          <label className="flex flex-col">
            Instrument
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.instrument as string) ?? ''}
              onChange={event => onUpdate({ instrument: event.target.value })}
            />
          </label>
        </div>
      );
    case 'effect':
      {
        const instanceId = (data.plugin_instance_id as string) || undefined;
        if (instanceId) {
          const instance = pluginStore.pluginInstances[instanceId];
          if (instance) {
            return (
              <div className="space-y-2">
                {}
                <div>Plugin control</div>
              </div>
            );
          }
        }

        const available = pluginStore.availablePlugins || [];
        return (
          <div className="space-y-2 text-xs text-daw-text-secondary">
            <label className="flex flex-col">
              Plugin Name
              <input
                className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
                value={(data.pluginName as string) ?? ''}
                onChange={e => onUpdate({ pluginName: e.target.value })}
              />
            </label>
            <label className="flex flex-col">
              Mix
              <input
                type="number"
                className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
                value={(data.mix as number) ?? 100}
                onChange={e => onUpdate({ mix: Number(e.target.value) })}
              />
            </label>

            <div className="space-y-1">
              <label className="block text-xs text-daw-text-secondary">Attach Plugin</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded border border-daw-border bg-daw-surface px-2 py-1 text-sm"
                  defaultValue={''}
                  id={`effect-plugin-select-${Math.random().toString(36).slice(2,6)}`}
                >
                  <option value="">Select plugin...</option>
                  {available.map(p => (
                    <option key={p.unique_id} value={p.unique_id}>{p.name} — {p.manufacturer}</option>
                  ))}
                </select>
                <button
                  disabled={attaching}
                  onClick={async () => {
                    const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[];
                    const sel = selects.find(s => s.id.startsWith('effect-plugin-select-'));
                    if (!sel) return;
                    const pluginUniqueId = sel.value;
                    if (!pluginUniqueId) return;
                    setAttaching(true);

                    const metadata = available.find(p => p.unique_id === pluginUniqueId);
                    if (!metadata) {
                      setAttaching(false);
                      return;
                    }
                    const now = new Date().toISOString();
                    const newInstanceId = `inst_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
                    const instance = {
                      instance_id: newInstanceId,
                      plugin_metadata: metadata,
                      state: 'loading',
                      is_bypassed: false,
                      parameters: {},
                      current_preset: undefined,
                      available_presets: [],
                      cpu_usage: 0,
                      processing_time_ms: 0,
                      created_at: now,
                      last_used: now,
                      is_active: true,
                      latency_ms: (metadata.latency_samples || 0) / 44.1,
                    } as unknown as PluginInstance;

                    const trackId = (data.targetTrackId as string) ?? '';
                    pluginStore.addPluginInstance(trackId, instance);
                    onUpdate({ plugin_instance_id: newInstanceId, pluginName: metadata.name });

                    try {
                      const ack = await sendWithAck('plugin.add', {
                        track_id: trackId,
                        plugin_id: metadata.unique_id,
                        plugin_name: metadata.name,
                        plugin_format: metadata.format,
                        position: 0,
                      }, 5000);

                      const ackObj = (ack as unknown) as { data?: Record<string, unknown> } | undefined;
                      const ackData = ackObj?.data ?? {};

                      pluginStore.updatePluginInstance(newInstanceId, { state: 'loaded' } as Partial<PluginInstance>);

                      if (ackData && 'plugin_id' in ackData) {
                        const canonicalId = String((ackData as Record<string, unknown>)['plugin_id']);
                        if (canonicalId && canonicalId !== newInstanceId) {
                          const existing = pluginStore.pluginInstances[newInstanceId];
                          if (existing) {
                            const canonicalInstance = { ...existing, instance_id: canonicalId } as PluginInstance;

                            pluginStore.addPluginInstance(trackId, canonicalInstance);
                            pluginStore.removePluginInstance(trackId, newInstanceId);

                            onUpdate({ plugin_instance_id: canonicalId });
                          }
                        }
                      }

                      if (ackData && 'parameters' in ackData) {
                        const params = (ackData as Record<string, unknown>)['parameters'] as Record<string, unknown> | undefined;
                        if (params) {
                          const targetId = ('plugin_id' in ackData) ? String((ackData as Record<string, unknown>)['plugin_id']) : newInstanceId;
                          const typedParams = params as unknown as Record<string, import('@/types/plugins').PluginParameter>;
                          pluginStore.updatePluginInstance(targetId, { parameters: typedParams } as Partial<PluginInstance>);
                        }
                      }

                    } catch (err) {
                      console.error('plugin.add failed:', err);
                      pluginStore.updatePluginInstance(newInstanceId, { state: 'error' } as Partial<PluginInstance>);
                    } finally {
                      setAttaching(false);
                    }
                  }}
                  className="rounded bg-daw-accent-primary px-3 py-1 text-sm text-white disabled:opacity-60"
                >
                  Attach
                </button>
              </div>
            </div>
          </div>
        );
      }
    case 'theory_concept':
      return (
        <div className="space-y-2 text-xs text-daw-text-secondary">
          <label className="flex flex-col">
            Concept Name
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.conceptName as string) ?? ''}
              onChange={e => onUpdate({ conceptName: e.target.value })}
            />
          </label>
          <label className="flex flex-col">
            Description
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.description as string) ?? ''}
              onChange={e => onUpdate({ description: e.target.value })}
            />
          </label>
        </div>
      );
    case 'chord':
      return (
        <div className="space-y-2 text-xs text-daw-text-secondary">
          <label className="flex flex-col">
            Chord Name
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.chordName as string) ?? ''}
              onChange={e => onUpdate({ chordName: e.target.value })}
            />
          </label>
          <label className="flex flex-col">
            Notes (comma separated)
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={Array.isArray(data.notes) ? (data.notes as string[]).join(',') : ''}
              onChange={e => onUpdate({ notes: e.target.value.split(',').map(s => s.trim()) })}
            />
          </label>
        </div>
      );
    case 'scale':
      return (
        <div className="space-y-2 text-xs text-daw-text-secondary">
          <label className="flex flex-col">
            Scale Name
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.scaleName as string) ?? ''}
              onChange={e => onUpdate({ scaleName: e.target.value })}
            />
          </label>
          <label className="flex flex-col">
            Notes (comma separated)
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={Array.isArray(data.notes) ? (data.notes as string[]).join(',') : ''}
              onChange={e => onUpdate({ notes: e.target.value.split(',').map(s => s.trim()) })}
            />
          </label>
        </div>
      );
    case 'motif':
      return (
        <div className="space-y-2 text-xs text-daw-text-secondary">
          <label className="flex flex-col">
            Motif Pattern
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={(data.motifPattern as string) ?? ''}
              onChange={e => onUpdate({ motifPattern: e.target.value })}
            />
          </label>
        </div>
      );
    case 'progression':
      return (
        <div className="space-y-2 text-xs text-daw-text-secondary">
          <label className="flex flex-col">
            Progression (comma separated)
            <input
              className="mt-1 rounded border border-daw-border bg-daw-surface px-2 py-1"
              value={Array.isArray(data.progression) ? (data.progression as string[]).join(',') : ''}
              onChange={e => onUpdate({ progression: e.target.value.split(',').map(s => s.trim()) })}
            />
          </label>
        </div>
      );
    default:
      return <></>;
  }
}
