import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Slider from '@/components/ui/Slider';
import Knob from '@/components/ui/Knob';
import LevelMeter from '@/components/ui/LevelMeter';
import Waveform from '@/components/ui/Waveform';
import SpectrumAnalyzer from '@/components/ui/SpectrumAnalyzer';
import Panel from '@/components/layout/Panel';
import { Grid, GridItem } from '@/components/layout/Grid';
import Flex from '@/components/layout/Flex';
import DAWLayout from '@/components/layout/DAWLayout';
import AuthBar from '@/components/auth/AuthBar';
import NavigationControls from '@/components/layout/NavigationControls';
import { AccessibilityProvider } from '@/components/layout/AccessibilityProvider';
import { DAIDProvider } from '@/lib/daid';
import DAIDTracker from '@/components/daid/DAIDTracker';
import {
  useTransport,
  useMixer,
  useAudioAnalysis,
  useWebSocket,
  useRealTimeAudioLevels,
  useRealTimeSpectrum,
} from '@/hooks/useAudio';
import type { WaveformData } from '@/types';
import type { LayoutConfig } from '@/components/layout/DAWLayout';

const ComponentLibraryPage = () => {
  const [sliderValue, setSliderValue] = useState(50);
  const [knobValue, setKnobValue] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  // Navigation state
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime] = useState(180); // 3 minutes
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState(180);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridSize, setGridSize] = useState(0.25);

  // State management hooks
  const transport = useTransport();
  const mixer = useMixer();
  const analysis = useAudioAnalysis();
  const webSocket = useWebSocket();

  // Real-time data hooks
  useRealTimeAudioLevels();
  useRealTimeSpectrum();

  // Generate mock waveform data
  const mockWaveformData: WaveformData = {
    peaks: new Float32Array(1000).map(
      (_, i) =>
        Math.sin(i * 0.1) * Math.exp(-i * 0.001) * (Math.random() * 0.5 + 0.5)
    ),
    length: 1000,
    sampleRate: 44100,
  };

  // Handle layout changes
  const handleLayoutChange = (layout: LayoutConfig) => {
    console.log('Layout changed:', layout);
  };

  // Handle navigation
  const handleSeek = (time: number) => {
    setCurrentTime(time);
    transport.seek?.(time);
  };

  const handleViewChange = (start: number, end: number) => {
    setViewStart(start);
    setViewEnd(end);
  };

  return (
    <DAIDProvider
      config={{
        agentId: 'audio-agent-frontend',
        baseUrl: 'http://localhost:8081',
        timeout: 5000,
        autoTrack: true,
        trackPageViews: true,
        trackUserActions: true,
      }}
    >
      <AccessibilityProvider>
        <AuthBar />

        {/* Main Content Area */}
        <div className="min-h-screen bg-daw-bg-primary text-daw-text-primary p-4 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              <header className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2 text-daw-accent-primary">
                  DAW UI Component Library
                </h1>
                <p className="text-daw-text-secondary">
                  Professional audio interface components built with React & Tailwind
                </p>
              </header>

              <Grid cols={12} gap="lg">
                {/* Basic Components */}
                <GridItem colSpan={6}>
                  <Panel title="Basic Components">
                    <Flex direction="col" gap="lg">
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-daw-text-secondary">
                          Buttons
                        </h4>
                        <Flex gap="md" wrap="wrap">
                          <Button variant="primary">Primary</Button>
                          <Button variant="secondary">Secondary</Button>
                          <Button variant="accent">Accent</Button>
                          <Button variant="danger">Danger</Button>
                          <Button loading>Loading</Button>
                        </Flex>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-daw-text-secondary">
                          Input Field
                        </h4>
                        <Input
                          label="Track Name"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder="Enter track name..."
                          helperText="This will be the display name for your track"
                        />
                      </div>
                    </Flex>
                  </Panel>
                </GridItem>

                {/* Audio Controls */}
                <GridItem colSpan={6}>
                  <Panel title="Audio Controls">
                    <Flex direction="col" gap="lg">
                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-daw-text-secondary">
                          Slider Control
                        </h4>
                        <Slider
                          label="Volume"
                          value={sliderValue}
                          onChange={setSliderValue}
                          min={0}
                          max={100}
                        />
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold mb-3 text-daw-text-secondary">
                          Knob Controls
                        </h4>
                        <Flex gap="lg" justify="center">
                          <Knob
                            label="Gain"
                            value={knobValue}
                            onChange={setKnobValue}
                            min={-20}
                            max={20}
                            unit="dB"
                          />
                          <Knob
                            label="Pan"
                            value={0}
                            onChange={() => {}}
                            min={-100}
                            max={100}
                            unit="%"
                          />
                          <Knob
                            label="Send"
                            value={25}
                            onChange={() => {}}
                            min={0}
                            max={100}
                            unit="%"
                          />
                        </Flex>
                      </div>
                    </Flex>
                  </Panel>
                </GridItem>

                {/* Level Meters */}
                <GridItem colSpan={4}>
                  <Panel title="Level Meters">
                    <Flex direction="col" gap="md" align="center">
                      <h4 className="text-sm font-semibold text-daw-text-secondary">
                        Vertical Meters
                      </h4>
                      <Flex gap="md" justify="center">
                        <LevelMeter level={analysis.masterLevel} height={120} />
                        {Object.entries(analysis.trackLevels)
                          .slice(0, 2)
                          .map(([trackId, level]) => (
                            <LevelMeter key={trackId} level={level} height={120} />
                          ))}
                      </Flex>
                    </Flex>
                  </Panel>
                </GridItem>

                {/* Collapsible Panel */}
                <GridItem colSpan={8}>
                  <Panel
                    title="Collapsible Panel"
                    collapsible
                    collapsed={panelCollapsed}
                    onToggleCollapse={() => setPanelCollapsed(!panelCollapsed)}
                    actions={
                      <Button size="sm" variant="secondary">
                        Action
                      </Button>
                    }
                  >
                    <p className="text-daw-text-secondary">
                      This panel can be collapsed to save space in the interface.
                      Click the header to toggle visibility.
                    </p>
                  </Panel>
                </GridItem>

                {/* Waveform Display */}
                <GridItem colSpan={8}>
                  <Panel title="Waveform Display">
                    <Waveform
                      data={mockWaveformData}
                      width={600}
                      height={120}
                      playheadPosition={0.3}
                      onSeek={(position) => console.log('Seek to:', position)}
                    />
                  </Panel>
                </GridItem>

                {/* Spectrum Analyzer */}
                <GridItem colSpan={4}>
                  <Panel title="Spectrum Analyzer">
                    <SpectrumAnalyzer
                      data={
                        analysis.spectrumData || {
                          frequencies: new Float32Array(512),
                          magnitudes: new Float32Array(512),
                          binCount: 512,
                        }
                      }
                      width={300}
                      height={200}
                      showGrid
                      showLabels
                    />
                  </Panel>
                </GridItem>

                {/* Transport Controls */}
                <GridItem colSpan={6}>
                  <Panel title="Transport Controls">
                    <Flex direction="col" gap="md">
                      <Flex gap="md" justify="center">
                        <Button
                          variant={transport.isPlaying ? 'accent' : 'primary'}
                          onClick={transport.play}
                          disabled={transport.isPlaying}
                        >
                          Play
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={transport.stop}
                          disabled={!transport.isPlaying && !transport.isRecording}
                        >
                          Stop
                        </Button>
                        <Button
                          variant={transport.isRecording ? 'danger' : 'primary'}
                          onClick={transport.record}
                          disabled={transport.isRecording}
                        >
                          Record
                        </Button>
                      </Flex>

                      <div>
                        <Slider
                          label={`Tempo: ${transport.tempo || 120} BPM`}
                          value={transport.tempo || 120}
                          onChange={transport.setTempo}
                          min={60}
                          max={200}
                        />
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-daw-text-secondary">
                          Time: {transport.currentTime?.toFixed(2) || '0.00'}s
                        </p>
                        <p className="text-sm text-daw-text-secondary">
                          WebSocket:{' '}
                          <span
                            className={
                              webSocket.isConnected ? 'text-green-400' : 'text-red-400'
                            }
                          >
                            {webSocket.status}
                          </span>
                        </p>
                      </div>
                    </Flex>
                  </Panel>
                </GridItem>

                {/* Mixer Controls */}
                <GridItem colSpan={6}>
                  <Panel title="Mixer Controls">
                    <Flex direction="col" gap="md">
                      <Flex gap="md" justify="center">
                        <Button onClick={() => mixer.addTrack('audio')}>
                          Add Audio Track
                        </Button>
                        <Button onClick={() => mixer.addTrack('midi')}>
                          Add MIDI Track
                        </Button>
                        <Button onClick={() => mixer.addTrack('instrument')}>
                          Add Instrument
                        </Button>
                      </Flex>

                      <div>
                        <Slider
                          label={`Master Volume: ${Math.round((mixer.masterVolume || 0.8) * 100)}%`}
                          value={(mixer.masterVolume || 0.8) * 100}
                          onChange={(value) => mixer.setMasterVolume(value / 100)}
                          min={0}
                          max={100}
                        />
                      </div>

                      <div className="text-center">
                        <p className="text-sm text-daw-text-secondary">
                          Tracks: {Object.keys(mixer.tracks).length}
                        </p>
                        <p className="text-sm text-daw-text-secondary">
                          Selected:{' '}
                          {mixer.selectedTrackId
                            ? mixer.tracks[mixer.selectedTrackId]?.name
                            : 'None'}
                        </p>
                      </div>
                    </Flex>
                  </Panel>
                </GridItem>

                {/* Status Panel */}
                <GridItem colSpan={12}>
                  <Panel title="Development Status">
                    <Grid cols={3} gap="md">
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-daw-accent-primary">
                          ✅ Completed
                        </h4>
                        <ul className="space-y-1 text-sm text-daw-text-secondary">
                          <li>• React + TypeScript + Vite setup</li>
                          <li>• Tailwind CSS with DAW design system</li>
                          <li>• ESLint + Prettier configuration</li>
                          <li>• Path aliases and build optimization</li>
                          <li>• Core UI component library</li>
                          <li>• Audio-specific components</li>
                          <li>• Layout components (Panel, Grid, Flex)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-yellow-400">
                          🚧 In Progress
                        </h4>
                        <ul className="space-y-1 text-sm text-daw-text-secondary">
                          <li>• Responsive behavior testing</li>
                          <li>• Accessibility features</li>
                          <li>• Component documentation</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-daw-text-tertiary">
                          📋 Next Steps
                        </h4>
                        <ul className="space-y-1 text-sm text-daw-text-secondary">
                          <li>• State management setup</li>
                          <li>• WebSocket integration</li>
                          <li>• Testing infrastructure</li>
                          <li>• Storybook documentation</li>
                        </ul>
                      </div>
                    </Grid>
                  </Panel>
                </GridItem>

                {/* DAID Tracking Demo */}
                <GridItem colSpan={1}>
                  <DAIDTracker className="h-full" />
                </GridItem>
              </Grid>
            </div>
        </div>
      </AccessibilityProvider>
    </DAIDProvider>
  );
};

export default ComponentLibraryPage;
