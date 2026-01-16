import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/utils';
import type { WaveformData, BeatInfo, CuePoint, LoopRegion } from '@/types';

export interface DJWaveformProps {
  waveformData: WaveformData | null;
  beatInfo: BeatInfo | null;
  cuePoints: CuePoint[];
  activeLoop: LoopRegion | null;
  currentPosition: number; // in seconds
  duration: number; // in seconds
  onSeek: (position: number) => void;
  onAddCuePoint: (position: number) => void;
  onSetLoop: (startTime: number, endTime: number) => void;
  className?: string;
  height?: number;
  showBeatGrid?: boolean;
  showCuePoints?: boolean;
  showLoop?: boolean;
  zoomLevel?: number; // 1 = full track, higher = more zoomed in
}

const DJWaveform: React.FC<DJWaveformProps> = ({
  waveformData,
  beatInfo,
  cuePoints,
  activeLoop,
  currentPosition,
  duration,
  onSeek,
  onAddCuePoint,
  onSetLoop,
  className,
  height = 120,
  showBeatGrid = true,
  showCuePoints = true,
  showLoop = true,
  zoomLevel = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoopSelecting, setIsLoopSelecting] = useState(false);
  const [loopStart, setLoopStart] = useState<number | null>(null);

  // Calculate visible time range based on zoom
  const visibleDuration = duration / zoomLevel;
  const startTime = Math.max(0, currentPosition - visibleDuration / 2);
  const endTime = Math.min(duration, startTime + visibleDuration);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    ctx.clearRect(0, 0, width, canvasHeight);

    // Calculate samples per pixel
    const samplesPerPixel = waveformData.peaks.length / width;

    // Draw waveform
    ctx.fillStyle = '#4a90e2';
    ctx.strokeStyle = '#2c5aa0';
    ctx.lineWidth = 1;

    for (let x = 0; x < width; x++) {
      const sampleIndex = Math.floor(x * samplesPerPixel);
      if (sampleIndex < waveformData.peaks.length) {
        const amplitude = waveformData.peaks[sampleIndex];
        const barHeight = Math.abs(amplitude) * (canvasHeight / 2);
        
        // Draw positive and negative parts
        ctx.fillRect(x, canvasHeight / 2 - barHeight, 1, barHeight);
        ctx.fillRect(x, canvasHeight / 2, 1, barHeight);
      }
    }

    // Draw beat grid
    if (showBeatGrid && beatInfo) {
      ctx.strokeStyle = '#ffffff40';
      ctx.lineWidth = 1;
      
      beatInfo.beatPositions.forEach((beatTime) => {
        if (beatTime >= startTime && beatTime <= endTime) {
          const x = ((beatTime - startTime) / visibleDuration) * width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight);
          ctx.stroke();
        }
      });

      // Draw downbeats (stronger lines)
      ctx.strokeStyle = '#ffffff80';
      ctx.lineWidth = 2;
      
      beatInfo.downbeats.forEach((downbeatTime) => {
        if (downbeatTime >= startTime && downbeatTime <= endTime) {
          const x = ((downbeatTime - startTime) / visibleDuration) * width;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight);
          ctx.stroke();
        }
      });
    }

    // Draw cue points
    if (showCuePoints) {
      cuePoints.forEach((cuePoint) => {
        if (cuePoint.time >= startTime && cuePoint.time <= endTime) {
          const x = ((cuePoint.time - startTime) / visibleDuration) * width;
          
          // Draw cue point marker
          ctx.fillStyle = cuePoint.color;
          ctx.fillRect(x - 2, 0, 4, canvasHeight);
          
          // Draw hot cue number if available
          if (cuePoint.hotCueNumber) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
              cuePoint.hotCueNumber.toString(),
              x,
              15
            );
          }
        }
      });
    }

    // Draw loop region
    if (showLoop && activeLoop && activeLoop.enabled) {
      const loopStartX = ((activeLoop.startTime - startTime) / visibleDuration) * width;
      const loopEndX = ((activeLoop.endTime - startTime) / visibleDuration) * width;
      
      if (loopStartX < width && loopEndX > 0) {
        // Draw loop background
        ctx.fillStyle = '#00ff8840';
        ctx.fillRect(
          Math.max(0, loopStartX),
          0,
          Math.min(width, loopEndX) - Math.max(0, loopStartX),
          canvasHeight
        );
        
        // Draw loop boundaries
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        
        if (loopStartX >= 0 && loopStartX <= width) {
          ctx.beginPath();
          ctx.moveTo(loopStartX, 0);
          ctx.lineTo(loopStartX, canvasHeight);
          ctx.stroke();
        }
        
        if (loopEndX >= 0 && loopEndX <= width) {
          ctx.beginPath();
          ctx.moveTo(loopEndX, 0);
          ctx.lineTo(loopEndX, canvasHeight);
          ctx.stroke();
        }
      }
    }

    // Draw playhead
    const playheadX = ((currentPosition - startTime) / visibleDuration) * width;
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvasHeight);
      ctx.stroke();
      
      // Draw playhead triangle
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX - 5, 10);
      ctx.lineTo(playheadX + 5, 10);
      ctx.closePath();
      ctx.fill();
    }
  }, [
    waveformData,
    beatInfo,
    cuePoints,
    activeLoop,
    currentPosition,
    duration,
    startTime,
    endTime,
    visibleDuration,
    showBeatGrid,
    showCuePoints,
    showLoop,
  ]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = height;
      drawWaveform();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [height, drawWaveform]);

  // Redraw when dependencies change
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  const getTimeFromX = useCallback((x: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    
    const rect = canvas.getBoundingClientRect();
    const relativeX = x - rect.left;
    const percentage = relativeX / rect.width;
    return startTime + (percentage * visibleDuration);
  }, [startTime, visibleDuration]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const time = getTimeFromX(event.clientX);
    
    if (event.shiftKey) {
      // Start loop selection
      setIsLoopSelecting(true);
      setLoopStart(time);
    } else if (event.altKey) {
      // Add cue point
      onAddCuePoint(time);
    } else {
      // Seek to position
      setIsDragging(true);
      onSeek(time);
    }
  }, [getTimeFromX, onAddCuePoint, onSeek]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isDragging) {
      const time = getTimeFromX(event.clientX);
      onSeek(time);
    }
  }, [isDragging, getTimeFromX, onSeek]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (isLoopSelecting && loopStart !== null) {
      const loopEnd = getTimeFromX(event.clientX);
      onSetLoop(Math.min(loopStart, loopEnd), Math.max(loopStart, loopEnd));
      setIsLoopSelecting(false);
      setLoopStart(null);
    }
    setIsDragging(false);
  }, [isLoopSelecting, loopStart, getTimeFromX, onSetLoop]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        onSeek(Math.max(0, currentPosition - 1));
        break;
      case 'ArrowRight':
        event.preventDefault();
        onSeek(Math.min(duration, currentPosition + 1));
        break;
      case 'Home':
        event.preventDefault();
        onSeek(0);
        break;
      case 'End':
        event.preventDefault();
        onSeek(duration);
        break;
    }
  }, [currentPosition, duration, onSeek]);

  const containerClasses = cn(
    'relative bg-daw-surface-primary border border-daw-surface-tertiary rounded overflow-hidden',
    'cursor-crosshair select-none',
    className
  );

  return (
    <div className="space-y-2">
      {/* Waveform Info */}
      <div className="flex items-center justify-between text-xs text-daw-text-secondary">
        <div className="flex items-center space-x-4">
          {beatInfo && (
            <>
              <div>BPM: {beatInfo.bpm.toFixed(1)}</div>
              <div>Confidence: {(beatInfo.confidence * 100).toFixed(0)}%</div>
              <div>Key: {beatInfo.timeSignature[0]}/{beatInfo.timeSignature[1]}</div>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div>Zoom: {zoomLevel.toFixed(1)}x</div>
          <div>{Math.floor(currentPosition / 60)}:{(currentPosition % 60).toFixed(1).padStart(4, '0')}</div>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div
        ref={containerRef}
        className={containerClasses}
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          className="w-full h-full"
        />
        
        {/* Overlay for instructions */}
        {!waveformData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-daw-text-tertiary">
              <div className="text-sm mb-1">No waveform data</div>
              <div className="text-xs">Load a track to see waveform</div>
            </div>
          </div>
        )}
      </div>

      {/* Controls and Instructions */}
      <div className="text-xs text-daw-text-tertiary space-y-1">
        <div>Click to seek • Alt+Click to add cue point • Shift+Drag to set loop</div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-1 bg-daw-accent-primary"></div>
            <span>Playhead</span>
          </div>
          {showBeatGrid && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 bg-white opacity-40"></div>
              <span>Beats</span>
            </div>
          )}
          {showCuePoints && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 bg-yellow-500"></div>
              <span>Cue Points</span>
            </div>
          )}
          {showLoop && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 bg-green-500"></div>
              <span>Loop</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DJWaveform;