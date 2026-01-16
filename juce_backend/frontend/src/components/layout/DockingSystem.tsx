import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/utils';
import ResizablePanel from './ResizablePanel';
import type { LayoutConfig, PanelConfig } from './DAWLayout';

export interface DockingSystemProps {
  layout: LayoutConfig;
  onLayoutChange: (layout: LayoutConfig) => void;
  onPanelResize: (panelId: string, size: number) => void;
  onPanelToggle: (panelId: string) => void;
  onPanelVisibility: (panelId: string, visible: boolean) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  focusedPanel: string | null;
  onPanelFocus: (panelId: string | null) => void;
}

interface DragState {
  isDragging: boolean;
  draggedPanel: string | null;
  dragOverZone: string | null;
  dragOffset: { x: number; y: number };
}

const DockingSystem: React.FC<DockingSystemProps> = ({
  layout,
  onLayoutChange,
  onPanelResize,
  onPanelToggle,

  onDragStart,
  onDragEnd,
  focusedPanel,
  onPanelFocus,
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedPanel: null,
    dragOverZone: null,
    dragOffset: { x: 0, y: 0 },
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Get panels by position
  const getPanelsByPosition = (position: string) => {
    return layout.panels.filter(panel => 
      panel.position === position && panel.visible && panel.docked
    );
  };

  const leftPanels = getPanelsByPosition('left');
  const rightPanels = getPanelsByPosition('right');
  const topPanels = getPanelsByPosition('top');
  const bottomPanels = getPanelsByPosition('bottom');
  const centerPanels = getPanelsByPosition('center');

  // Handle panel drag start
  const handlePanelDragStart = useCallback((panelId: string, event: React.DragEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setDragState({
      isDragging: true,
      draggedPanel: panelId,
      dragOverZone: null,
      dragOffset: offset,
    });

    onDragStart();
    
    // Set drag data
    event.dataTransfer.setData('text/plain', panelId);
    event.dataTransfer.effectAllowed = 'move';
  }, [onDragStart]);

  // Handle drag over drop zones
  const handleDragOver = useCallback((event: React.DragEvent, zone: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    setDragState(prev => ({
      ...prev,
      dragOverZone: zone,
    }));
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      dragOverZone: null,
    }));
  }, []);

  // Handle panel drop
  const handlePanelDrop = useCallback((event: React.DragEvent, targetZone: string) => {
    event.preventDefault();
    
    const panelId = event.dataTransfer.getData('text/plain');
    if (!panelId || !dragState.draggedPanel) return;

    // Update panel position
    const newLayout = {
      ...layout,
      panels: layout.panels.map(panel =>
        panel.id === panelId
          ? { ...panel, position: targetZone as PanelConfig['position'] }
          : panel
      ),
    };

    onLayoutChange(newLayout);
    
    setDragState({
      isDragging: false,
      draggedPanel: null,
      dragOverZone: null,
      dragOffset: { x: 0, y: 0 },
    });

    onDragEnd();
  }, [layout, onLayoutChange, dragState.draggedPanel, onDragEnd]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedPanel: null,
      dragOverZone: null,
      dragOffset: { x: 0, y: 0 },
    });
    onDragEnd();
  }, [onDragEnd]);

  // Render panel component
  const renderPanel = useCallback((panel: PanelConfig) => {
    const PanelComponent = panel.component;
    
    return (
      <ResizablePanel
        key={panel.id}
        title={panel.title}
        defaultSize={panel.defaultSize}
        minSize={panel.minSize}
        maxSize={panel.maxSize}
        position={panel.position}
        collapsed={panel.collapsed}
        focused={focusedPanel === panel.id}
        onResize={(size) => onPanelResize(panel.id, size)}
        onToggleCollapse={() => onPanelToggle(panel.id)}
        onFocus={() => onPanelFocus(panel.id)}
        className={cn(
          dragState.draggedPanel === panel.id && 'opacity-50',
          'transition-opacity duration-200'
        )}
      >
        <div
          draggable
          onDragStart={(e) => handlePanelDragStart(panel.id, e)}
          onDragEnd={handleDragEnd}
          className="h-full"
          role="button"
          tabIndex={0}
          aria-label={`Drag ${panel.title} panel`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              // Handle keyboard-based panel movement
            }
          }}
        >
          <PanelComponent />
        </div>
      </ResizablePanel>
    );
  }, [
    focusedPanel,
    onPanelResize,
    onPanelToggle,
    onPanelFocus,
    dragState.draggedPanel,
    handlePanelDragStart,
    handleDragEnd,
  ]);

  // Render drop zone
  const renderDropZone = useCallback((zone: string, className: string) => {
    const isActive = dragState.dragOverZone === zone;
    const isDragging = dragState.isDragging;
    
    return (
      <div
        className={cn(
          'absolute pointer-events-none transition-all duration-200',
          isDragging && 'pointer-events-auto',
          isActive && 'bg-daw-accent-primary bg-opacity-30 border-2 border-daw-accent-primary',
          !isActive && isDragging && 'bg-daw-surface-tertiary bg-opacity-20 border border-daw-surface-tertiary border-dashed',
          className
        )}
        onDragOver={(e) => handleDragOver(e, zone)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handlePanelDrop(e, zone)}
        role="region"
        aria-label={`Drop zone for ${zone} position`}
      />
    );
  }, [dragState, handleDragOver, handleDragLeave, handlePanelDrop]);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col relative">
      {/* Top Panels */}
      {topPanels.length > 0 && (
        <div className="flex border-b border-daw-surface-tertiary">
          {topPanels.map(renderPanel)}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* Left Panels */}
        {leftPanels.length > 0 && (
          <div className="flex flex-col border-r border-daw-surface-tertiary" style={{ width: '25%', minWidth: '200px', flexShrink: 0 }}>
            {leftPanels.map(renderPanel)}
          </div>
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col relative">
          {centerPanels.map(renderPanel)}
          
          {/* Drop Zones */}
          {dragState.isDragging && (
            <>
              {renderDropZone('left', 'left-0 top-0 w-16 h-full')}
              {renderDropZone('right', 'right-0 top-0 w-16 h-full')}
              {renderDropZone('top', 'left-0 top-0 w-full h-16')}
              {renderDropZone('bottom', 'left-0 bottom-0 w-full h-16')}
              {renderDropZone('center', 'left-16 top-16 right-16 bottom-16')}
            </>
          )}
        </div>

        {/* Right Panels */}
        {rightPanels.length > 0 && (
          <div className="flex flex-col border-l border-daw-surface-tertiary" style={{ width: 'auto', minWidth: 0, flexShrink: 0 }}>
            {rightPanels.map(renderPanel)}
          </div>
        )}
      </div>

      {/* Bottom Panels */}
      {bottomPanels.length > 0 && (
        <div className="flex border-t border-daw-surface-tertiary">
          {bottomPanels.map(renderPanel)}
        </div>
      )}

      {/* Floating Panels (undocked) */}
      {layout.panels
        .filter(panel => panel.visible && !panel.docked)
        .map(panel => (
          <div
            key={`floating-${panel.id}`}
            className="absolute bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg shadow-lg"
            style={{
              top: '10%',
              left: '10%',
              width: '300px',
              height: '200px',
              zIndex: focusedPanel === panel.id ? 1000 : 999,
            }}
          >
            {renderPanel(panel)}
          </div>
        ))}
    </div>
  );
};

export default DockingSystem;
