/**
 * Audio Visualizer Component
 * Provides real-time audio visualization with spectrum and waveform displays
 * Integrates with the audio engine for analysis data
 */

import React, { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3, Waves } from 'lucide-react';
import { useAudioEngineStore } from '@/lib/audio-engine/AudioEngineStore';

interface AudioVisualizerProps {
  nodeId?: string;
  type?: 'spectrum' | 'waveform' | 'both';
  width?: number;
  height?: number;
  className?: string;
  showControls?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  nodeId = 'master_output',
  type = 'both',
  width = 300,
  height = 150,
  className = '',
  showControls = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const engineStore = useAudioEngineStore();

  const [visualizationType, setVisualizationType] = useState<'spectrum' | 'waveform' | 'both'>(
    type
  );

  const analysisData = nodeId ? engineStore.getNodeAnalysis(nodeId) : null;

  useEffect(() => {
    const animate = () => {
      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      // Clear canvas
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, width, height);

      if (analysisData) {
        if (visualizationType === 'spectrum' || visualizationType === 'both') {
          drawSpectrum(ctx, analysisData.spectrum, width, height / 2);
        }

        if (visualizationType === 'waveform' || visualizationType === 'both') {
          const yOffset = visualizationType === 'both' ? height / 2 : 0;
          drawWaveform(ctx, analysisData.waveform, width, height / 2, yOffset);
        }
      } else {
        // Draw placeholder
        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No audio data', width / 2, height / 2);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analysisData, visualizationType]);

  const drawSpectrum = (
    ctx: CanvasRenderingContext2D,
    spectrum: Float32Array,
    width: number,
    height: number
  ) => {
    if (!spectrum || spectrum.length === 0) return;

    const barWidth = width / spectrum.length;
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.5, '#10b981');
    gradient.addColorStop(1, '#f59e0b');

    ctx.fillStyle = gradient;

    for (let i = 0; i < spectrum.length; i++) {
      const barHeight = (spectrum[i] + 80) * (height / 80); // Normalize to 0-1 range
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    // Draw frequency labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';

    const sampleRate = 44100;
    const nyquist = sampleRate / 2;
    const frequencies = [100, 1000, 10000];

    frequencies.forEach(freq => {
      const x = (freq / nyquist) * width;
      ctx.fillText(`${freq}Hz`, x, height - 5);
    });
  };

  const drawWaveform = (
    ctx: CanvasRenderingContext2D,
    waveform: Uint8Array,
    width: number,
    height: number,
    yOffset: number = 0
  ) => {
    if (!waveform || waveform.length === 0) return;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const sliceWidth = width / waveform.length;
    let x = 0;

    for (let i = 0; i < waveform.length; i++) {
      const v = waveform[i] / 128.0;
      const y = yOffset + (v * height / 2);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yOffset + height / 2);
    ctx.lineTo(width, yOffset + height / 2);
    ctx.stroke();
  };

  const handleExportData = () => {
    if (!analysisData) return;

    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `audio-analysis-${nodeId}-${Date.now()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900">Audio Visualizer</span>
          {nodeId && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {nodeId}
            </span>
          )}
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setVisualizationType('spectrum')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  visualizationType === 'spectrum'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setVisualizationType('waveform')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  visualizationType === 'waveform'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Waves className="w-3 h-3" />
              </button>
              <button
                onClick={() => setVisualizationType('both')}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  visualizationType === 'both'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Both
              </button>
            </div>

            <button
              onClick={handleExportData}
              disabled={!analysisData}
              className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Analysis Data"
            >
              <Activity className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Visualization */}
      <div className="p-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={width}
            height={type === 'both' ? height * 2 : height}
            className="w-full h-auto border border-gray-200 rounded"
            style={{ maxHeight: type === 'both' ? height * 2 : height }}
          />

          {!analysisData && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-center">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Waiting for audio data...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Level Display */}
      {analysisData && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="text-gray-500">Peak</div>
              <div className="font-medium text-gray-900">
                {analysisData.levels.peak.toFixed(1)} dB
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">RMS</div>
              <div className="font-medium text-gray-900">
                {analysisData.levels.rms.toFixed(1)} dB
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">LUFS</div>
              <div className="font-medium text-gray-900">
                {analysisData.levels.lufs.toFixed(1)} LUFS
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioVisualizer;