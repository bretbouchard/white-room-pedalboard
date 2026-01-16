/**
 * React hooks for UI telemetry tracking
 *
 * Provides easy integration with React components for tracking:
 * - Focus changes
 * - Parameter adjustments
 * - Control interactions
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  UITelemetryRecorder,
  UIInteractionEvent,
  UIControlMetrics,
  getTelemetryRecorder,
} from './UITelemetryRecorder';

//==============================================================================
// Types
//==============================================================================

export interface UseTelemetryOptions {
  controlID: string;
  enabled?: boolean;
  onInteractionEnd?: (event: UIInteractionEvent) => void;
}

//==============================================================================
// Hooks
//==============================================================================

/**
 * Hook for tracking control interactions (knobs, sliders, etc.)
 *
 * Usage:
 * ```tsx
 * function MySlider({ value, onChange, controlID }) {
 *   const { trackInteraction, trackValueChange, endInteraction } = useControlTelemetry(controlID);
 *
 *   return (
 *     <input
 *       type="range"
 *       value={value}
 *       onChange={(e) => {
 *         trackValueChange(Number(e.target.value));
 *         onChange(e);
 *       }}
 *       onMouseDown={() => trackInteraction(value)}
 *       onMouseUp={() => endInteraction(value)}
 *     />
 *   );
 * }
 * ```
 */
export function useControlTelemetry(options: UseTelemetryOptions) {
  const { controlID, enabled = true, onInteractionEnd } = options;
  const recorder = getTelemetryRecorder();
  const initialValueRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  const trackInteraction = useCallback((value: number) => {
    if (!enabled || !recorder) return;

    initialValueRef.current = value;
    isActiveRef.current = true;
    recorder.startInteraction(controlID, value);
  }, [controlID, enabled, recorder]);

  const trackValueChange = useCallback((value: number) => {
    if (!enabled || !isActiveRef.current || !recorder) return;

    recorder.recordValueChange(controlID, value);
  }, [controlID, enabled, recorder]);

  const endInteraction = useCallback((finalValue: number, abandoned: boolean = false) => {
    if (!enabled || !isActiveRef.current || !recorder) return;

    isActiveRef.current = false;
    recorder.endInteraction(controlID, finalValue, abandoned);
  }, [controlID, enabled, recorder]);

  return {
    trackInteraction,
    trackValueChange,
    endInteraction,
  };
}

/**
 * Hook for tracking focus changes
 *
 * Usage:
 * ```tsx
 * function MyControl() {
 *   const trackFocus = useFocusTelemetry();
 *
 *   return (
 *     <div
 *       onFocus={() => trackFocus('previousControl', 'myControl')}
 *       onBlur={() => trackFocus('myControl', 'nextControl')}
 *     >
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTelemetry(enabled: boolean = true) {
  const recorder = getTelemetryRecorder();

  const trackFocus = useCallback((fromControl: string, toControl: string) => {
    if (!enabled || !recorder) return;

    recorder.recordFocusChange(fromControl, toControl);
  }, [enabled, recorder]);

  return trackFocus;
}

/**
 * Hook for tracking button presses
 *
 * Usage:
 * ```tsx
 * function MyButton({ onClick, controlID }) {
 *   const trackButtonPress = useButtonTelemetry(controlID);
 *
 *   return (
 *     <button
 *       onClick={(e) => {
 *         trackButtonPress();
 *         onClick(e);
 *       }}
 *     >
 *       Click Me
 *     </button>
 *   );
 * }
 * ```
 */
export function useButtonTelemetry(controlID: string, enabled: boolean = true) {
  const recorder = getTelemetryRecorder();

  const trackButtonPress = useCallback(() => {
    if (!enabled || !recorder) return;

    // Button press is an instant interaction with delta = 1
    recorder.endInteraction(controlID, 1.0, false);
  }, [controlID, enabled, recorder]);

  return trackButtonPress;
}

/**
 * Hook for automatic session lifecycle management
 *
 * Usage:
 * ```tsx
 * function App() {
 *   useTelemetrySession();
 *
 *   return <MyApp />;
 * }
 * ```
 */
export function useTelemetrySession() {
  useEffect(() => {
    const recorder = getTelemetryRecorder();

    // Session automatically started in recorder constructor

    return () => {
      // End session when component unmounts
      recorder.endSession();
    };
  }, []);
}

/**
 * Hook for tracking time to first sound
 *
 * Usage:
 * ```tsx
 * function AudioEngine() {
 *   const { markFirstSound } = useTimeToFirstSound();
 *
 *   useEffect(() => {
 *     // When audio starts
 *     markFirstSound();
 *   }, []);
 * }
 * ```
 */
export function useTimeToFirstSound(enabled: boolean = true) {
  const recorder = getTelemetryRecorder();
  const markedRef = useRef(false);

  const markFirstSound = useCallback(() => {
    if (!enabled || !recorder || markedRef.current) return;

    // This would update the session's time_to_first_sound_ms
    // For now, it's calculated automatically in endSession()
    markedRef.current = true;
  }, [enabled, recorder]);

  return { markFirstSound };
}

//==============================================================================
// HOC for Component-Level Telemetry
//==============================================================================

/**
 * Higher-order component that adds telemetry tracking to a control
 *
 * Usage:
 * ```tsx
 * const TelemetrySlider = withControlTelemetry('my-slider')(Slider);
 * ```
 */
export function withControlTelemetry<P extends object>(
  controlID: string,
  options: Partial<UseTelemetryOptions> = {}
) {
  return (Component: React.ComponentType<P>) => {
    return function TelemetryWrapped(props: P) {
      const { trackInteraction, trackValueChange, endInteraction } =
        useControlTelemetry({
          controlID,
          ...options,
        });

      const initialValueRef = useRef<any>(undefined);
      const isActiveRef = useRef(false);

      // Enhanced onChange handler
      const handleChange = useCallback((...args: any[]) => {
        // Call original onChange if it exists
        if (typeof props === 'object' && props && 'onChange' in props) {
          (props as any).onChange?.(...args);
        }

        // Track value change
        const newValue = args[0]; // Assuming first arg is new value
        if (isActiveRef.current && initialValueRef.current !== undefined) {
          trackValueChange(newValue);
        }
      }, [props, trackValueChange]);

      // Enhanced event handlers for mouse/touch
      const enhancedProps: any = {
        ...props,
        onChange: handleChange,
        onMouseDown: (e: any) => {
          props.onMouseDown?.(e);
          initialValueRef.current = e.target.value;
          isActiveRef.current = true;
          trackInteraction(e.target.value);
        },
        onMouseUp: (e: any) => {
          props.onMouseUp?.(e);
          if (isActiveRef.current) {
            endInteraction(e.target.value);
            isActiveRef.current = false;
          }
        },
        onBlur: (e: any) => {
          props.onBlur?.(e);
          // Treat blur as abandon if interaction was active
          if (isActiveRef.current) {
            endInteraction(e.target.value, true);
            isActiveRef.current = false;
          }
        },
      };

      return React.createElement(Component, enhancedProps);
    };
  };
}
