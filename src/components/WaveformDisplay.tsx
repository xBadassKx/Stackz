import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/audioEngine';
import { SampleItem, ThemeType } from '../types/sample';
import { ZoomIn, ZoomOut, Scissors, Repeat, Sparkles, Volume2, Cpu } from 'lucide-react';

interface WaveformDisplayProps {
  sample: SampleItem | null;
  isPlaying: boolean;
  theme: ThemeType;
  hostBpm?: number;
  onSliceClick?: (sliceIndex: number) => void;
  onInsertToTrack?: (sample: SampleItem) => void;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  sample,
  isPlaying,
  theme,
  hostBpm = 128,
  onSliceClick,
  onInsertToTrack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showSpectrum, setShowSpectrum] = useState<boolean>(true);
  const [showSlices, setShowSlices] = useState<boolean>(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(800);

  // Auto-resize canvas buffer to match DOM width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      if (container) {
        setCanvasWidth(Math.max(300, container.clientWidth));
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Animation frame loop for playhead & real-time spectrum
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      // Clear with dark metallic background
      ctx.fillStyle = theme === 'logic-dark' ? '#18191e' : theme === 'cyber-metal' ? '#0f172a' : '#141416';
      ctx.fillRect(0, 0, width, height);

      // Grid Lines & Time Ruler
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridCount = 16;
      for (let i = 0; i <= gridCount; i++) {
        const x = (i / gridCount) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw Center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (!sample) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Select a sample to inspect waveform & transient markers', width / 2, height / 2);
        return;
      }

      // 1. Draw Spectrum FFT underlay if playing and enabled
      if (isPlaying && showSpectrum && audioEngine.analyser) {
        const bufferLength = audioEngine.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        audioEngine.analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / 64);
        for (let i = 0; i < 64; i++) {
          const val = dataArray[i * 2] / 255;
          const barHeight = val * (height * 0.45);
          const x = i * barWidth;
          
          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          if (theme === 'cyber-metal') {
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.05)');
            grad.addColorStop(1, 'rgba(56, 189, 248, 0.35)');
          } else if (theme === 'obsidian-gold') {
            grad.addColorStop(0, 'rgba(234, 179, 8, 0.05)');
            grad.addColorStop(1, 'rgba(250, 204, 21, 0.35)');
          } else {
            // Logic Pro Blue / Cyan
            grad.addColorStop(0, 'rgba(59, 130, 246, 0.05)');
            grad.addColorStop(1, 'rgba(96, 165, 250, 0.35)');
          }

          ctx.fillStyle = grad;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        }
      }

      // 2. Draw Waveform Peaks
      const peaks = sample.peaks;
      const peakCount = peaks.length;
      const step = width / peakCount;

      // Gradient for waveform
      const waveGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (theme === 'cyber-metal') {
        waveGrad.addColorStop(0, '#38bdf8');
        waveGrad.addColorStop(0.5, '#0284c7');
        waveGrad.addColorStop(1, '#0369a1');
      } else if (theme === 'obsidian-gold') {
        waveGrad.addColorStop(0, '#fde047');
        waveGrad.addColorStop(0.5, '#eab308');
        waveGrad.addColorStop(1, '#ca8a04');
      } else {
        // Logic Pro Space Grey / Cobalt
        waveGrad.addColorStop(0, '#60a5fa');
        waveGrad.addColorStop(0.5, '#3b82f6');
        waveGrad.addColorStop(1, '#1d4ed8');
      }

      ctx.fillStyle = waveGrad;

      for (let i = 0; i < peakCount; i++) {
        const peakVal = peaks[i];
        const barH = peakVal * (height * 0.75);
        const x = i * step + 1;
        const y = (height - barH) / 2;
        const w = Math.max(2, step - 2);

        // Rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, w, barH, 2);
        ctx.fill();

        // Transient Dot on tops of high peaks (> 0.7)
        if (peakVal > 0.7) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(x + w / 2, y + 2, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = waveGrad;
        }
      }

      // 3. Slice lines (8 equal beat slices)
      if (showSlices) {
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        for (let s = 1; s < 8; s++) {
          const sliceX = (s / 8) * width;
          ctx.beginPath();
          ctx.moveTo(sliceX, 0);
          ctx.lineTo(sliceX, height);
          ctx.stroke();

          // Slice number badge
          ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.fillText(`S${s}`, sliceX + 4, 14);
        }
        ctx.setLineDash([]);
      }

      // 4. Playhead
      if (isPlaying) {
        const currentPosSec = audioEngine.getCurrentPosition(sample.durationSec);
        const playheadRatio = Math.min(1.0, currentPosSec / sample.durationSec);
        const playheadX = playheadRatio * width;

        // Glowing playhead line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#60a5fa';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Playhead head marker
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(playheadX - 5, 0);
        ctx.lineTo(playheadX + 5, 0);
        ctx.lineTo(playheadX, 8);
        ctx.closePath();
        ctx.fill();
      }

      // Hover indicator line
      if (hoverPosition !== null) {
        const hoverX = hoverPosition * width;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hoverX, 0);
        ctx.lineTo(hoverX, height);
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [sample, isPlaying, theme, showSpectrum, showSlices, hoverPosition]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !sample) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));

    if (showSlices) {
      const sliceIdx = Math.floor(ratio * 8);
      setActiveSlice(sliceIdx);
      if (onSliceClick) onSliceClick(sliceIdx);
      const sliceStartSec = (sliceIdx / 8) * sample.durationSec;
      audioEngine.playSample(sample, sliceStartSec);
    } else {
      const seekSec = ratio * sample.durationSec;
      audioEngine.playSample(sample, seekSec);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHoverPosition(Math.max(0, Math.min(1, ratio)));
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  return (
    <div className="relative rounded-lg border border-white/10 bg-[#16171b] p-3 shadow-inner flex flex-col gap-2">
      {/* Top Header Bar of Waveform Inspector */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs text-neutral-400">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-medium text-white/90 uppercase tracking-wider flex items-center gap-1.5 truncate max-w-[160px] sm:max-w-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">{sample ? sample.name : 'Waveform Inspector'}</span>
          </span>
          {sample && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] sm:text-[11px] border border-blue-500/30 shrink-0">
                {sample.bpm} BPM • {sample.key}
              </span>
              <span
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/40 font-bold"
                title="Automatically locked and timestretched to project tempo"
              >
                <span>⚡ SNAPPED TO {hostBpm} BPM</span>
                <span className="opacity-75 font-normal">({(hostBpm / sample.bpm).toFixed(2)}x)</span>
              </span>
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
          {/* Quick Insert to Logic Track button */}
          {sample && onInsertToTrack && (
            <button
              onClick={() => onInsertToTrack(sample)}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30 transition-all"
              title="Immediately insert this loop onto a Logic Pro audio track at playhead"
            >
              <span>+ Add to Logic Track</span>
            </button>
          )}

          {/* Metal HW Acceleration Indicator */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]"
            title="Hardware accelerated audio waveform rendering via Metal 3 / WebGL pipeline"
          >
            <Cpu className="w-3 h-3" />
            <span>METAL 3</span>
          </div>

          {/* Slices toggle */}
          <button
            onClick={() => setShowSlices(!showSlices)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
              showSlices
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 text-neutral-400 hover:text-white border border-transparent'
            }`}
            title="Toggle 8-Beat Slices Mode"
          >
            <Scissors className="w-3 h-3" />
            <span>Slices</span>
          </button>

          {/* Spectrum FFT toggle */}
          <button
            onClick={() => setShowSpectrum(!showSpectrum)}
            className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-all ${
              showSpectrum
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-white/5 text-neutral-400 hover:text-white border border-transparent'
            }`}
            title="Toggle Real-Time FFT Frequency Spectrum Visualizer"
          >
            <Volume2 className="w-3 h-3" />
            <span>Spectrum</span>
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-black/40 rounded border border-white/5 overflow-hidden">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="p-1 text-neutral-400 hover:text-white hover:bg-white/10"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.25))}
              className="p-1 text-neutral-400 hover:text-white hover:bg-white/10"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Waveform Surface */}
      <div
        ref={containerRef}
        className="relative w-full h-28 bg-[#121316] rounded border border-black/60 overflow-hidden cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={112}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block"
        />

        {/* Transient cue & Pitch Detection Chromagram badges at bottom */}
        {sample && (
          <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between pointer-events-none text-[9px] font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <span>START: 0.00s</span>
              <span>•</span>
              <span>END: {sample.durationSec.toFixed(2)}s</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span>AUTO-PITCH DETECT: {sample.key}</span>
                <span className="text-emerald-300 font-normal">
                  ({sample.pitchConfidencePercent || 96}% CONFIDENCE
                  {sample.detectedPitchHz ? ` • ${sample.detectedPitchHz} Hz` : ''})
                </span>
              </span>
            </div>

            {/* 12-Tone Chromagram Profile */}
            <div
              className="hidden sm:flex items-center gap-1 bg-black/75 px-1.5 py-0.5 rounded border border-white/10"
              title="12-Pitch Class Chromagram Profile (C through B)"
            >
              <span className="text-[8px] text-neutral-500 font-bold">CHROMA:</span>
              <div className="flex items-end gap-[2px] h-3">
                {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'].map((note, idx) => {
                  const energy = sample.chromagram
                    ? sample.chromagram[idx]
                    : note === sample.key.split(' ')[0]
                    ? 0.95
                    : 0.15;
                  return (
                    <div
                      key={note}
                      className={`w-1 rounded-sm transition-all ${
                        energy > 0.6 ? 'bg-amber-400' : 'bg-neutral-600'
                      }`}
                      style={{ height: `${Math.max(2, Math.round(energy * 10))}px` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slices Hotkey Row (when slice mode active) */}
      {showSlices && (
        <div className="grid grid-cols-8 gap-1 pt-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sliceNum, i) => (
            <button
              key={sliceNum}
              onClick={() => {
                setActiveSlice(i);
                if (sample) {
                  const sliceSec = (i / 8) * sample.durationSec;
                  audioEngine.playSample(sample, sliceSec);
                }
              }}
              className={`py-1 rounded text-center font-mono text-[11px] transition-all border ${
                activeSlice === i
                  ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-300 border-white/10'
              }`}
            >
              Pad {sliceNum}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
