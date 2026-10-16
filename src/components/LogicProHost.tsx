import React, { useState, useEffect } from 'react';
import { LogicTrack, LogicTrackRegion, SampleItem } from '../types/sample';
import { audioEngine } from '../services/audioEngine';
import {
  Play,
  Pause,
  Square,
  RotateCw,
  Sliders,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Clock,
  Layers,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface LogicProHostProps {
  hostBpm: number;
  onBpmChange: (newBpm: number) => void;
  hostKey: string;
  onKeyChange: (newKey: string) => void;
  draggedSample: SampleItem | null;
  insertedSample?: SampleItem | null;
  onSampleInserted?: () => void;
  children: React.ReactNode;
}

export const LogicProHost: React.FC<LogicProHostProps> = ({
  hostBpm,
  onBpmChange,
  hostKey,
  onKeyChange,
  draggedSample,
  insertedSample,
  onSampleInserted,
  children,
}) => {
  const [isPlayingDaw, setIsPlayingDaw] = useState<boolean>(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(true);
  const [isCycleActive, setIsCycleActive] = useState<boolean>(true);
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [dragOverBar, setDragOverBar] = useState<number>(1);

  // Simulated initial Logic Pro tracks
  const [tracks, setTracks] = useState<LogicTrack[]>([
    {
      id: 'trk-1',
      name: 'Audio 1 - Vocals',
      type: 'audio',
      volume: 0.8,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      color: '#3b82f6',
      regions: [
        {
          id: 'reg-1',
          sampleId: 'stak-05',
          sampleName: 'Ethereal Cloud Vocal Chant',
          startBar: 1,
          lengthBars: 2,
          color: '#3b82f6',
          waveformPeaks: [0.3, 0.6, 0.8, 0.5, 0.7, 0.4, 0.9, 0.3],
          category: 'vocal',
        },
      ],
    },
    {
      id: 'trk-2',
      name: 'Audio 2 - Lead & Keys',
      type: 'audio',
      volume: 0.75,
      pan: -0.2,
      isMuted: false,
      isSoloed: false,
      color: '#8b5cf6',
      regions: [
        {
          id: 'reg-2',
          sampleId: 'stak-02',
          sampleName: 'Analog Sunset Rhodes',
          startBar: 1,
          lengthBars: 4,
          color: '#8b5cf6',
          waveformPeaks: [0.4, 0.7, 0.5, 0.8, 0.6, 0.7, 0.5, 0.6],
          category: 'melodic',
        },
      ],
    },
    {
      id: 'trk-3',
      name: 'Audio 3 - Drum Session',
      type: 'audio',
      volume: 0.9,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      color: '#f59e0b',
      regions: [
        {
          id: 'reg-3',
          sampleId: 'stak-01',
          sampleName: 'Midnight Cyber Trap Break',
          startBar: 1,
          lengthBars: 4,
          color: '#f59e0b',
          waveformPeaks: [0.9, 0.4, 0.8, 0.5, 0.9, 0.4, 0.8, 0.5],
          category: 'drums',
        },
      ],
    },
    {
      id: 'trk-4',
      name: 'Audio 4 - Sub Bass & 808',
      type: 'audio',
      volume: 0.85,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      color: '#10b981',
      regions: [],
    },
  ]);

  // Timeline transport ticker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingDaw) {
      // 16th note interval at current BPM
      const intervalMs = (60 / hostBpm / 4) * 1000;
      let tick = 0;

      timer = setInterval(() => {
        tick++;
        const beatInBar = Math.floor((tick / 4) % 4) + 1;
        const barNumber = Math.floor(tick / 16) + 1;

        setCurrentBeat(beatInBar);
        if (barNumber > 8 && isCycleActive) {
          setCurrentBar(1);
          tick = 0;
        } else {
          setCurrentBar(barNumber);
        }
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlayingDaw, hostBpm, isCycleActive]);

  // Handle direct 1-click sample insertion
  useEffect(() => {
    if (!insertedSample) return;

    // Pick best matching track based on category
    let targetTrackId = 'trk-1';
    if (insertedSample.category === 'vocal') targetTrackId = 'trk-1';
    else if (insertedSample.category === 'melodic') targetTrackId = 'trk-2';
    else if (insertedSample.category === 'drums') targetTrackId = 'trk-3';
    else if (insertedSample.category === 'bass') targetTrackId = 'trk-4';

    const newRegion: LogicTrackRegion = {
      id: `reg-${Date.now()}`,
      sampleId: insertedSample.id,
      sampleName: insertedSample.name,
      startBar: currentBar,
      lengthBars: insertedSample.isLoop ? 2 : 1,
      color:
        insertedSample.category === 'drums'
          ? '#f59e0b'
          : insertedSample.category === 'melodic'
          ? '#8b5cf6'
          : insertedSample.category === 'bass'
          ? '#10b981'
          : insertedSample.category === 'vocal'
          ? '#3b82f6'
          : '#ef4444',
      waveformPeaks: insertedSample.peaks.slice(0, 16),
      category: insertedSample.category,
    };

    setTracks((prev) =>
      prev.map((trk) => {
        if (trk.id === targetTrackId) {
          return {
            ...trk,
            regions: [...trk.regions, newRegion],
          };
        }
        return trk;
      })
    );

    if (onSampleInserted) {
      onSampleInserted();
    }
  }, [insertedSample, currentBar, onSampleInserted]);

  const handleDragOverTrack = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // 8 bars across width
    const barWidth = rect.width / 8;
    const bar = Math.max(1, Math.min(8, Math.floor(x / barWidth) + 1));

    setDragOverTrackId(trackId);
    setDragOverBar(bar);
  };

  const handleDragLeaveTrack = () => {
    setDragOverTrackId(null);
  };

  const handleDropOnTrack = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const sampleDataStr = e.dataTransfer.getData('application/json');
    let sample: SampleItem | null = draggedSample;

    if (!sample && sampleDataStr) {
      try {
        sample = JSON.parse(sampleDataStr);
      } catch {
        // ignore
      }
    }

    if (!sample) return;

    const newRegion: LogicTrackRegion = {
      id: `reg-${Date.now()}`,
      sampleId: sample.id,
      sampleName: sample.name,
      startBar: dragOverBar,
      lengthBars: sample.isLoop ? 2 : 1,
      color:
        sample.category === 'drums'
          ? '#f59e0b'
          : sample.category === 'melodic'
          ? '#8b5cf6'
          : sample.category === 'bass'
          ? '#10b981'
          : sample.category === 'vocal'
          ? '#3b82f6'
          : '#ef4444',
      waveformPeaks: sample.peaks.slice(0, 16),
      category: sample.category,
    };

    setTracks((prev) =>
      prev.map((trk) => {
        if (trk.id === trackId) {
          return {
            ...trk,
            regions: [...trk.regions, newRegion],
          };
        }
        return trk;
      })
    );

    setDragOverTrackId(null);
  };

  const handleDeleteRegion = (trackId: string, regionId: string) => {
    setTracks((prev) =>
      prev.map((trk) => {
        if (trk.id === trackId) {
          return {
            ...trk,
            regions: trk.regions.filter((r) => r.id !== regionId),
          };
        }
        return trk;
      })
    );
  };

  const toggleTrackMute = (trackId: string) => {
    setTracks((prev) =>
      prev.map((trk) =>
        trk.id === trackId ? { ...trk, isMuted: !trk.isMuted } : trk
      )
    );
  };

  const toggleTrackSolo = (trackId: string) => {
    setTracks((prev) =>
      prev.map((trk) =>
        trk.id === trackId ? { ...trk, isSoloed: !trk.isSoloed } : trk
      )
    );
  };

  const handleAddTrack = () => {
    const nextNum = tracks.length + 1;
    const colors = ['#06b6d4', '#ec4899', '#84cc16', '#f97316'];
    const newTrack: LogicTrack = {
      id: `trk-${Date.now()}`,
      name: `Audio ${nextNum} - Track`,
      type: 'audio',
      volume: 0.8,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      color: colors[nextNum % colors.length],
      regions: [],
    };
    setTracks([...tracks, newTrack]);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#1b1c22] text-neutral-300 select-none">
      {/* Logic Pro Top Main Menubar */}
      <div className="h-6 bg-[#2d2e37] border-b border-black/40 px-3 flex items-center justify-between text-[11px] font-sans text-neutral-300">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white tracking-wide">Logic Pro</span>
          <span className="hover:text-white cursor-default">File</span>
          <span className="hover:text-white cursor-default">Edit</span>
          <span className="hover:text-white cursor-default">Track</span>
          <span className="hover:text-white cursor-default">Navigate</span>
          <span className="hover:text-white cursor-default">Record</span>
          <span className="hover:text-white cursor-default">Mix</span>
          <span className="hover:text-white cursor-default">View</span>
          <span className="hover:text-white cursor-default">Window</span>
          <span className="hover:text-white cursor-default">Help</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
          <span>Project: Cinematic Trap Stakz</span>
          <span>•</span>
          <span className="text-emerald-400">Audio: 48.0 kHz 24-Bit</span>
        </div>
      </div>

      {/* Logic Pro Control Bar & Transport LCD */}
      <div className="min-h-12 h-auto sm:h-12 bg-[#25262f] border-b border-black/60 px-3 sm:px-4 flex items-center justify-between shadow-md overflow-x-auto custom-scrollbar gap-2 py-1 sm:py-0">
        {/* Left Toolbar Icons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAddTrack}
            className="px-2 py-1 rounded bg-[#32343f] hover:bg-[#3d3f4d] text-neutral-200 text-xs font-medium flex items-center gap-1 border border-white/5"
            title="Create New Audio Track"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>New Track</span>
          </button>
        </div>

        {/* Center: Iconic Logic Pro LCD Display */}
        <div className="flex items-center bg-[#101115] rounded-md border border-white/10 px-3 py-1 shadow-inner font-mono text-center shrink-0">
          {/* Bar / Beat / Tick */}
          <div className="flex flex-col px-3 border-r border-white/10">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500">Position</span>
            <span className="text-sm font-bold text-blue-400">
              00{currentBar}.0{currentBeat}.01.000
            </span>
          </div>

          {/* Project Tempo BPM */}
          <div className="flex flex-col px-3 border-r border-white/10">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500">Tempo (BPM)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="60"
                max="220"
                value={hostBpm}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val > 0) {
                    onBpmChange(val);
                    audioEngine.setHostBpm(val);
                  }
                }}
                className="w-14 bg-transparent text-sm font-bold text-white text-center outline-none"
              />
              <span className="text-[10px] text-neutral-500">/ 4/4</span>
            </div>
          </div>

          {/* Project Musical Key */}
          <div className="flex flex-col px-3 border-r border-white/10">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500">Key Signature</span>
            <select
              value={hostKey}
              onChange={(e) => onKeyChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-amber-400 outline-none cursor-pointer"
            >
              <option value="C min" className="bg-[#181920] text-white">C min</option>
              <option value="Eb maj" className="bg-[#181920] text-white">Eb maj</option>
              <option value="F min" className="bg-[#181920] text-white">F min</option>
              <option value="G min" className="bg-[#181920] text-white">G min</option>
              <option value="A min" className="bg-[#181920] text-white">A min</option>
              <option value="D min" className="bg-[#181920] text-white">D min</option>
            </select>
          </div>

          {/* CPU / Metal DSP Load */}
          <div className="hidden sm:flex flex-col px-3">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500">DSP / Metal</span>
            <div className="flex items-center gap-1.5 pt-0.5">
              <div className="w-10 h-2 bg-neutral-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${isPlayingDaw ? 28 : 12}%` }}
                />
              </div>
              <span className="text-[9px] text-emerald-400 font-bold">1.2ms</span>
            </div>
          </div>
        </div>

        {/* Right: Transport Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cycle / Loop */}
          <button
            onClick={() => setIsCycleActive(!isCycleActive)}
            className={`p-1.5 rounded transition-all ${
              isCycleActive
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-white/5 text-neutral-400 hover:text-white'
            }`}
            title="Cycle Mode (Loop Bars 1-8)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Play / Stop */}
          <button
            onClick={() => {
              if (isPlayingDaw) {
                setIsPlayingDaw(false);
                audioEngine.stop();
              } else {
                setIsPlayingDaw(true);
              }
            }}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 font-bold text-xs shadow-md transition-all ${
              isPlayingDaw
                ? 'bg-blue-600 text-white shadow-blue-600/30 ring-1 ring-blue-400'
                : 'bg-[#353744] hover:bg-[#404353] text-white'
            }`}
          >
            {isPlayingDaw ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Metronome */}
          <button
            onClick={() => setIsMetronomeActive(!isMetronomeActive)}
            className={`p-1.5 rounded text-xs transition-all ${
              isMetronomeActive
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'bg-white/5 text-neutral-400 hover:text-white'
            }`}
            title="Click Track Metronome"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Work Area: Top Tracks Area (Logic Pro Session) + Bottom Embedded Plugin Window */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Logic Pro Arrangement Tracks & Timeline Grid */}
        <div className="h-44 flex flex-col bg-[#16171d] border-b border-black/80 shrink-0">
          {/* Timeline Bar Header (1 to 8 bars) */}
          <div className="h-6 bg-[#202129] border-b border-black/40 flex items-center font-mono text-[10px] text-neutral-400">
            <div className="w-48 px-3 border-r border-black/60 shrink-0 font-sans font-medium text-neutral-300">
              Track List
            </div>
            <div className="flex-1 grid grid-cols-8 h-full divide-x divide-white/5 relative">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                <div key={bar} className="px-2 flex items-center text-neutral-400">
                  <span>Bar {bar}</span>
                </div>
              ))}

              {/* Playhead Vertical Line */}
              {isPlayingDaw && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-400 shadow-md shadow-blue-400/80 z-20 pointer-events-none transition-all duration-75"
                  style={{
                    left: `${((currentBar - 1 + (currentBeat - 1) / 4) / 8) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Tracks List */}
          <div className="flex-1 overflow-y-auto divide-y divide-black/40 custom-scrollbar">
            {tracks.map((track) => {
              const isOverThisTrack = dragOverTrackId === track.id;

              return (
                <div key={track.id} className="h-9 flex items-center bg-[#1a1b22] hover:bg-[#1d1e26]">
                  {/* Track Header (Mute, Solo, Volume, Name) */}
                  <div className="w-48 h-full px-2.5 flex items-center justify-between border-r border-black/60 shrink-0 bg-[#22232c]">
                    <div className="flex items-center gap-1.5 truncate">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: track.color }}
                      />
                      <span className="text-xs font-medium text-neutral-200 truncate">
                        {track.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleTrackMute(track.id)}
                        className={`w-4 h-4 rounded text-[9px] font-bold font-mono ${
                          track.isMuted
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                        title="Mute Track"
                      >
                        M
                      </button>
                      <button
                        onClick={() => toggleTrackSolo(track.id)}
                        className={`w-4 h-4 rounded text-[9px] font-bold font-mono ${
                          track.isSoloed
                            ? 'bg-amber-500 text-black'
                            : 'bg-white/5 text-neutral-400 hover:text-white'
                        }`}
                        title="Solo Track"
                      >
                        S
                      </button>
                    </div>
                  </div>

                  {/* Track Audio Lane Grid (Interactive Drop Zone) */}
                  <div
                    onDragOver={(e) => handleDragOverTrack(e, track.id)}
                    onDragLeave={handleDragLeaveTrack}
                    onDrop={(e) => handleDropOnTrack(e, track.id)}
                    className={`flex-1 h-full grid grid-cols-8 divide-x divide-white/[0.03] relative transition-colors ${
                      isOverThisTrack ? 'bg-blue-500/15 ring-1 ring-inset ring-blue-500/40' : ''
                    }`}
                  >
                    {/* Render Audio Regions */}
                    {track.regions.map((region) => {
                      const leftPercent = ((region.startBar - 1) / 8) * 100;
                      const widthPercent = (region.lengthBars / 8) * 100;

                      return (
                        <div
                          key={region.id}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: `${region.color}25`,
                            borderColor: region.color,
                          }}
                          className="absolute top-1 bottom-1 rounded border px-1.5 py-0.5 flex items-center justify-between overflow-hidden shadow-sm z-10 group"
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[10px] font-mono font-medium truncate text-white">
                              {region.sampleName}
                            </span>
                          </div>

                          {/* Mini Waveform preview inside region */}
                          <div className="flex items-center gap-[1px] h-3 opacity-60">
                            {region.waveformPeaks.map((p, i) => (
                              <div
                                key={i}
                                className="w-0.5 bg-white rounded-full"
                                style={{ height: `${p * 100}%` }}
                              />
                            ))}
                          </div>

                          {/* Delete region icon on hover */}
                          <button
                            onClick={() => handleDeleteRegion(track.id, region.id)}
                            className="hidden group-hover:flex p-0.5 rounded bg-black/60 hover:bg-red-500/80 text-white"
                            title="Remove region from track"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Drag preview ghost when dragging a sample */}
                    {isOverThisTrack && (
                      <div
                        style={{
                          left: `${((dragOverBar - 1) / 8) * 100}%`,
                          width: `${(2 / 8) * 100}%`,
                        }}
                        className="absolute top-1 bottom-1 rounded border-2 border-dashed border-blue-400 bg-blue-500/30 flex items-center justify-center font-mono text-[10px] text-blue-200 z-10 animate-pulse pointer-events-none"
                      >
                        Drop at Bar {dragOverBar}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Area: Sample Stakz Plugin Window */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#121316]">
          {children}
        </div>
      </div>
    </div>
  );
};
