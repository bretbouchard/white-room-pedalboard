import React, { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/utils';
import type { WaveformData } from '@/types';

interface WaveformProps {
  data: WaveformData;
  width: number;
  height: number;
  className?: string;
  color?: string;
  backgroundColor?: string;
  playheadPosition?: number; // 0-1
  onSeek?: (position: number) => void;
  zoom?: number;
  offset?: number;
}

const Waveform: React.FC<WaveformProps> = ({
  data,
  width,
  height,
  className,
  color = '#00ff88',
  backgroundColor = '#2a2a2a',
  playheadPosition = 0,
  onSeek,
  zoom = 1,
  offset = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.peaks.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate visible range based on zoom and offset
    const samplesPerPixel = Math.max(
      1,
      Math.floor((data.peaks.length * zoom) / width)
    );
    const startSample = Math.floor(offset * data.peaks.length);
    const endSample = Math.min(
      data.peaks.length,
      startSample + width * samplesPerPixel
    );

    // Draw waveform
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const centerY = height / 2;
    const amplitude = height / 2;

    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const sampleIndex = startSample + x * samplesPerPixel;

      if (sampleIndex >= endSample) break;

      // Get peak value for this pixel (may need to average multiple samples)
      let peak = 0;
      const samplesToAverage = Math.min(
        samplesPerPixel,
        endSample - sampleIndex
      );

      for (let i = 0; i < samplesToAverage; i++) {
        const sample = data.peaks[Math.floor(sampleIndex + i)];
        if (sample !== undefined) {
          peak = Math.max(peak, Math.abs(sample));
        }
      }

      const y1 = centerY - peak * amplitude;
      const y2 = centerY + peak * amplitude;

      // Draw vertical line for this pixel
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }

    ctx.stroke();

    // Draw playhead
    if (playheadPosition > 0) {
      const playheadX = ((playheadPosition - offset) * width) / zoom;
      if (playheadX >= 0 && playheadX <= width) {
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
      }
    }
  }, [
    data,
    width,
    height,
    color,
    backgroundColor,
    playheadPosition,
    zoom,
    offset,
  ]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!onSeek) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const position = (x / width) * zoom + offset;

      onSeek(Math.max(0, Math.min(1, position)));
    },
    [onSeek, width, zoom, offset]
  );

  const containerClasses = cn(
    'relative border border-daw-surface-tertiary rounded overflow-hidden',
    onSeek && 'cursor-pointer',
    className
  );

  return (
    <div className={containerClasses}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleClick}
        className="block"
      />

      {/* Overlay for additional UI elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Time markers could go here */}
      </div>
    </div>
  );
};

export default Waveform;
