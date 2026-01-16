import React, { useRef, useEffect, useCallback } from 'react';
import { cn, formatFrequency } from '@/utils';
import type { SpectrumData } from '@/types';

interface SpectrumAnalyzerProps {
  data: SpectrumData;
  width: number;
  height: number;
  className?: string;
  minDb?: number;
  maxDb?: number;
  showGrid?: boolean;
  showLabels?: boolean;
}

const SpectrumAnalyzer: React.FC<SpectrumAnalyzerProps> = ({
  data,
  width,
  height,
  className,
  minDb = -60,
  maxDb = 0,
  showGrid = true,
  showLabels = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawSpectrum = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.magnitudes.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = 1;

      // Horizontal grid lines (dB levels)
      const dbStep = 10;
      for (let db = minDb; db <= maxDb; db += dbStep) {
        const y = height - ((db - minDb) / (maxDb - minDb)) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // dB labels
        if (showLabels) {
          ctx.fillStyle = '#999999';
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${db}dB`, 4, y - 2);
        }
      }

      // Vertical grid lines (frequency)
      const freqMarkers = [100, 1000, 10000];
      freqMarkers.forEach(freq => {
        // Convert frequency to bin index (assuming 44.1kHz sample rate)
        const nyquist = 22050;
        const binIndex = (freq / nyquist) * data.binCount;
        const x = (binIndex / data.binCount) * width;

        if (x > 0 && x < width) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();

          // Frequency labels
          if (showLabels) {
            ctx.fillStyle = '#999999';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(formatFrequency(freq), x, height - 4);
          }
        }
      });
    }

    // Draw spectrum
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(0.3, '#ffff00');
    gradient.addColorStop(0.7, '#00ff00');
    gradient.addColorStop(1, '#00ff88');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, height);

    // Draw spectrum curve
    for (let i = 0; i < data.magnitudes.length; i++) {
      const x = (i / data.magnitudes.length) * width;

      // Convert magnitude to dB
      const magnitude = data.magnitudes[i] ?? 0;
      const db = magnitude > 0 ? 20 * Math.log10(magnitude) : minDb;
      const clampedDb = Math.max(minDb, Math.min(maxDb, db));

      // Convert dB to y position
      const y = height - ((clampedDb - minDb) / (maxDb - minDb)) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Close the path and fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Draw the outline
    ctx.beginPath();
    for (let i = 0; i < data.magnitudes.length; i++) {
      const x = (i / data.magnitudes.length) * width;
      const magnitude = data.magnitudes[i] ?? 0;
      const db = magnitude > 0 ? 20 * Math.log10(magnitude) : minDb;
      const clampedDb = Math.max(minDb, Math.min(maxDb, db));
      const y = height - ((clampedDb - minDb) / (maxDb - minDb)) * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }, [data, width, height, minDb, maxDb, showGrid, showLabels]);

  useEffect(() => {
    drawSpectrum();
  }, [drawSpectrum]);

  const containerClasses = cn(
    'relative border border-daw-surface-tertiary rounded overflow-hidden bg-daw-bg-primary',
    className
  );

  return (
    <div className={containerClasses}>
      <canvas ref={canvasRef} width={width} height={height} className="block" />
    </div>
  );
};

export default SpectrumAnalyzer;
