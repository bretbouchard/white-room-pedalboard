import React, { useCallback, useMemo } from 'react';
import { cn } from '@/utils';
import { useDJStore } from '@/stores/djStore';
import Button from '@/components/ui/Button';
import Knob from '@/components/ui/Knob';
import type { DJEffect } from '@/types';
import { useButtonTelemetry, useControlTelemetry } from '@/telemetry/useTelemetry';

export interface DJEffectsProps {
  deckId: 'A' | 'B';
  className?: string;
  showPerformancePads?: boolean;
  maxEffects?: number;
}

const DJEffects: React.FC<DJEffectsProps> = ({
  deckId,
  className,
  showPerformancePads = true,
  maxEffects = 4,
}) => {
  const deck = useDJStore(state => deckId === 'A' ? state.deckA : state.deckB);
  const {
    addEffect,
    removeEffect,
    toggleEffect,
    setEffectParameter,
    setEffectWet,
  } = useDJStore();

  // Telemetry hooks for effect slots
  const effectTelemetry = useMemo(() => {
    const telemetry: Record<string, {
      toggle: ReturnType<typeof useButtonTelemetry>;
      remove: ReturnType<typeof useButtonTelemetry>;
      wet: ReturnType<typeof useControlTelemetry>;
      params: Record<string, ReturnType<typeof useControlTelemetry>>;
    }> = {};

    deck.effects.forEach((effect, index) => {
      const slotId = `${deckId}-slot-${index}`;
      telemetry[effect.id] = {
        toggle: useButtonTelemetry(`${slotId}-toggle`),
        remove: useButtonTelemetry(`${slotId}-remove`),
        wet: useControlTelemetry({ controlID: `${slotId}-wet` }),
        params: {
          delay: useControlTelemetry({ controlID: `${slotId}-param-delay` }),
          feedback: useControlTelemetry({ controlID: `${slotId}-param-feedback` }),
          rate: useControlTelemetry({ controlID: `${slotId}-param-rate` }),
          depth: useControlTelemetry({ controlID: `${slotId}-param-depth` }),
          roomSize: useControlTelemetry({ controlID: `${slotId}-param-roomSize` }),
          bits: useControlTelemetry({ controlID: `${slotId}-param-bits` }),
          cutoff: useControlTelemetry({ controlID: `${slotId}-param-cutoff` }),
          resonance: useControlTelemetry({ controlID: `${slotId}-param-resonance` }),
        },
      };
    });

    return telemetry;
  }, [deckId, deck.effects]);

  // Telemetry for performance pads
  const performancePadsTelemetry = useMemo(() => {
    const telemetry: ReturnType<typeof useButtonTelemetry>[] = [];
    for (let i = 0; i < 8; i++) {
      telemetry.push(useButtonTelemetry(`${deckId}-pad-${i}`));
    }
    return telemetry;
  }, [deckId]);

  // Telemetry for quick actions
  const toggleAllTelemetry = useButtonTelemetry(`${deckId}-toggle-all`);
  const clearAllTelemetry = useButtonTelemetry(`${deckId}-clear-all`);

  // Effect presets for different types
  const effectPresets = {
    echo: {
      name: 'Echo',
      parameters: {
        delay: 0.25, // seconds
        feedback: 0.3,
        highCut: 0.8,
        lowCut: 0.2,
      },
      beatSyncOptions: [1/8, 1/4, 1/2, 1, 2], // beat divisions
    },
    flanger: {
      name: 'Flanger',
      parameters: {
        rate: 0.5, // Hz
        depth: 0.7,
        feedback: 0.4,
        mix: 0.5,
      },
      beatSyncOptions: [1/4, 1/2, 1, 2, 4], // beat divisions
    },
    phaser: {
      name: 'Phaser',
      parameters: {
        rate: 0.3,
        depth: 0.6,
        stages: 4,
        feedback: 0.3,
      },
      beatSyncOptions: [1/4, 1/2, 1, 2, 4],
    },
    reverb: {
      name: 'Reverb',
      parameters: {
        roomSize: 0.5,
        damping: 0.3,
        width: 1.0,
        predelay: 0.02,
      },
      beatSyncOptions: [],
    },
    bitcrusher: {
      name: 'Bitcrusher',
      parameters: {
        bits: 8,
        sampleRate: 0.5,
        drive: 0.3,
        mix: 0.7,
      },
      beatSyncOptions: [],
    },
    filter: {
      name: 'Filter',
      parameters: {
        cutoff: 0.5,
        resonance: 0.3,
        type: 0, // 0=lowpass, 1=highpass, 2=bandpass
        drive: 0.1,
      },
      beatSyncOptions: [],
    },
  };

  const availableEffectTypes = Object.keys(effectPresets) as Array<keyof typeof effectPresets>;

  const handleAddEffect = useCallback((effectType: DJEffect['type']) => {
    if (deck.effects.length < maxEffects) {
      const effectId = addEffect(deckId, effectType);
      const preset = effectPresets[effectType];
      
      // Apply preset parameters
      Object.entries(preset.parameters).forEach(([param, value]) => {
        setEffectParameter(deckId, effectId, param, value);
      });
    }
  }, [deckId, deck.effects.length, maxEffects, addEffect, setEffectParameter]);

  const handleRemoveEffect = useCallback((effectId: string) => {
    effectTelemetry[effectId]?.remove();
    removeEffect(deckId, effectId);
  }, [deckId, removeEffect, effectTelemetry]);

  const handleToggleEffect = useCallback((effectId: string) => {
    effectTelemetry[effectId]?.toggle();
    toggleEffect(deckId, effectId);
  }, [deckId, toggleEffect, effectTelemetry]);

  const handleParameterChange = useCallback((effectId: string, parameter: string, value: number) => {
    const telemetry = effectTelemetry[effectId]?.params[parameter];
    if (telemetry) {
      telemetry.trackValueChange(value);
    }
    setEffectParameter(deckId, effectId, parameter, value);
  }, [deckId, setEffectParameter, effectTelemetry]);

  const handleWetChange = useCallback((effectId: string, wet: number) => {
    const telemetry = effectTelemetry[effectId]?.wet;
    if (telemetry) {
      telemetry.trackValueChange(wet);
    }
    setEffectWet(deckId, effectId, wet);
  }, [deckId, setEffectWet, effectTelemetry]);

  const handlePerformancePad = useCallback((padNumber: number) => {
    // Track performance pad press
    performancePadsTelemetry[padNumber]?.();

    // Performance pad actions - can be customized
    const actions = [
      () => handleAddEffect('filter'),
      () => handleAddEffect('echo'),
      () => handleAddEffect('flanger'),
      () => handleAddEffect('reverb'),
      () => {
        // Toggle all effects
        deck.effects.forEach(effect => handleToggleEffect(effect.id));
      },
      () => {
        // Clear all effects
        deck.effects.forEach(effect => handleRemoveEffect(effect.id));
      },
      () => {
        // Increase wet mix on all effects
        deck.effects.forEach(effect => {
          const newWet = Math.min(1, effect.wet + 0.2);
          handleWetChange(effect.id, newWet);
        });
      },
      () => {
        // Decrease wet mix on all effects
        deck.effects.forEach(effect => {
          const newWet = Math.max(0, effect.wet - 0.2);
          handleWetChange(effect.id, newWet);
        });
      },
    ];

    if (actions[padNumber]) {
      actions[padNumber]();
    }
  }, [deck.effects, handleAddEffect, handleToggleEffect, handleRemoveEffect, handleWetChange, performancePadsTelemetry]);

  const containerClasses = cn(
    'bg-daw-surface-secondary border border-daw-surface-tertiary rounded-lg p-4 space-y-4',
    className
  );

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-daw-text-primary">
          Deck {deckId} Effects
        </h3>
        <div className="text-xs text-daw-text-secondary">
          {deck.effects.length}/{maxEffects} slots
        </div>
      </div>

      {/* Effect Slots */}
      <div className="space-y-3">
        {Array.from({ length: maxEffects }, (_, index) => {
          const effect = deck.effects[index];
          const isEmpty = !effect;
          
          return (
            <div
              key={index}
              className={cn(
                'border rounded-lg p-3 transition-colors duration-150',
                isEmpty 
                  ? 'border-dashed border-daw-surface-tertiary bg-daw-surface-primary'
                  : effect.enabled
                  ? 'border-daw-accent-primary bg-daw-surface-primary'
                  : 'border-daw-surface-tertiary bg-daw-surface-primary opacity-60'
              )}
            >
              {isEmpty ? (
                /* Empty Slot */
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xs text-daw-text-tertiary">Empty Slot {index + 1}</span>
                  <select
                    onChange={(e) => e.target.value && handleAddEffect(e.target.value as DJEffect['type'])}
                    value=""
                    className="px-2 py-1 text-xs bg-daw-surface-secondary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
                  >
                    <option value="">Add Effect...</option>
                    {availableEffectTypes.map(type => (
                      <option key={type} value={type}>
                        {effectPresets[type].name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Effect Controls */
                <div className="space-y-3">
                  {/* Effect Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleToggleEffect(effect.id)}
                        variant={effect.enabled ? 'accent' : 'secondary'}
                        size="sm"
                        className="text-xs px-2 py-1"
                      >
                        {effectPresets[effect.type]?.name || effect.type}
                      </Button>
                      {effect.beatSync && (
                        <div className="text-xs text-daw-accent-primary font-medium">
                          SYNC
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleRemoveEffect(effect.id)}
                      variant="danger"
                      size="sm"
                      className="text-xs px-2 py-1"
                    >
                      ×
                    </Button>
                  </div>

                  {/* Effect Parameters */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Wet/Dry Mix */}
                    <div className="space-y-1">
                      <Knob
                        value={effect.wet}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => handleWetChange(effect.id, value)}
                        label="Mix"
                      />
                    </div>

                    {/* Main Parameter (varies by effect type) */}
                    <div className="space-y-1">
                      {effect.type === 'echo' && (
                        <Knob
                          value={effect.parameters.delay || 0.25}
                          min={0.01}
                          max={2}
                          step={0.01}
                          onChange={(value) => handleParameterChange(effect.id, 'delay', value)}
                          label="Delay"
                          unit="s"
                        />
                      )}
                      {effect.type === 'flanger' && (
                        <Knob
                          value={effect.parameters.rate || 0.5}
                          min={0.1}
                          max={10}
                          step={0.1}
                          onChange={(value) => handleParameterChange(effect.id, 'rate', value)}
                          label="Rate"
                          unit="Hz"
                        />
                      )}
                      {effect.type === 'phaser' && (
                        <Knob
                          value={effect.parameters.rate || 0.3}
                          min={0.1}
                          max={10}
                          step={0.1}
                          onChange={(value) => handleParameterChange(effect.id, 'rate', value)}
                          label="Rate"
                          unit="Hz"
                        />
                      )}
                      {effect.type === 'reverb' && (
                        <Knob
                          value={effect.parameters.roomSize || 0.5}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(value) => handleParameterChange(effect.id, 'roomSize', value)}
                          label="Room"
                        />
                      )}
                      {effect.type === 'bitcrusher' && (
                        <Knob
                          value={effect.parameters.bits || 8}
                          min={1}
                          max={16}
                          step={1}
                          onChange={(value) => handleParameterChange(effect.id, 'bits', value)}
                          label="Bits"
                        />
                      )}
                      {effect.type === 'filter' && (
                        <Knob
                          value={effect.parameters.cutoff || 0.5}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={(value) => handleParameterChange(effect.id, 'cutoff', value)}
                          label="Cutoff"
                        />
                      )}
                    </div>
                  </div>

                  {/* Additional Parameters */}
                  {effect.type === 'echo' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Knob
                        value={effect.parameters.feedback || 0.3}
                        min={0}
                        max={0.95}
                        step={0.01}
                        onChange={(value) => handleParameterChange(effect.id, 'feedback', value)}
                        label="Feedback"
                      />
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={effect.beatSync}
                          onChange={(e) => {
                            // Toggle beat sync - would need to implement in store
                            console.log('Toggle beat sync:', e.target.checked);
                          }}
                          className="rounded"
                        />
                        <span className="text-xs text-daw-text-secondary">Beat Sync</span>
                      </div>
                    </div>
                  )}

                  {(effect.type === 'flanger' || effect.type === 'phaser') && (
                    <div className="grid grid-cols-2 gap-3">
                      <Knob
                        value={effect.parameters.depth || 0.6}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => handleParameterChange(effect.id, 'depth', value)}
                        label="Depth"
                      />
                      <Knob
                        value={effect.parameters.feedback || 0.3}
                        min={0}
                        max={0.95}
                        step={0.01}
                        onChange={(value) => handleParameterChange(effect.id, 'feedback', value)}
                        label="Feedback"
                      />
                    </div>
                  )}

                  {effect.type === 'filter' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Knob
                        value={effect.parameters.resonance || 0.3}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(value) => handleParameterChange(effect.id, 'resonance', value)}
                        label="Resonance"
                      />
                      <select
                        value={effect.parameters.type || 0}
                        onChange={(e) => handleParameterChange(effect.id, 'type', parseInt(e.target.value))}
                        className="px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
                      >
                        <option value={0}>Low Pass</option>
                        <option value={1}>High Pass</option>
                        <option value={2}>Band Pass</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Performance Pads */}
      {showPerformancePads && (
        <div className="space-y-3 pt-3 border-t border-daw-surface-tertiary">
          <div className="text-xs font-medium text-daw-text-secondary text-center">
            Performance Pads
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }, (_, index) => {
              const padLabels = [
                'FILTER', 'ECHO', 'FLANGER', 'REVERB',
                'ALL ON/OFF', 'CLEAR', 'WET+', 'WET-'
              ];
              
              return (
                <Button
                  key={index}
                  onClick={() => handlePerformancePad(index)}
                  variant="secondary"
                  size="sm"
                  className="text-xs h-12 flex flex-col items-center justify-center"
                >
                  <div className="font-bold">{index + 1}</div>
                  <div className="text-xs opacity-75">{padLabels[index]}</div>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-daw-surface-tertiary">
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              toggleAllTelemetry();
              deck.effects.forEach(effect => handleToggleEffect(effect.id));
            }}
            variant="secondary"
            size="sm"
            className="text-xs"
          >
            Toggle All
          </Button>
          <Button
            onClick={() => {
              clearAllTelemetry();
              deck.effects.forEach(effect => handleRemoveEffect(effect.id));
            }}
            variant="danger"
            size="sm"
            className="text-xs"
          >
            Clear All
          </Button>
        </div>

        <div className="text-xs text-daw-text-tertiary">
          {deck.effects.filter(e => e.enabled).length} active
        </div>
      </div>
    </div>
  );
};

export default DJEffects;