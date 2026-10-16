import React, { useState } from 'react';
import { ThemeType } from '../types/sample';
import {
  Sliders,
  Cloud,
  Maximize2,
  Minimize2,
  Cpu,
  Palette,
  ZoomIn,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Check,
} from 'lucide-react';

interface PluginHeaderProps {
  isBypassed: boolean;
  onToggleBypass: () => void;
  isCompareActive: boolean;
  onToggleCompare: () => void;
  uiScale: number;
  onScaleChange: (scale: number) => void;
  theme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  isDawMode: boolean;
  onToggleDawMode: () => void;
  onOpenMidiModal: () => void;
  onOpenCloudModal: () => void;
  onOpenDspModal: () => void;
  onOpenFolderManager?: () => void;
}

export const PluginHeader: React.FC<PluginHeaderProps> = ({
  isBypassed,
  onToggleBypass,
  isCompareActive,
  onToggleCompare,
  uiScale,
  onScaleChange,
  theme,
  onThemeChange,
  isDawMode,
  onToggleDawMode,
  onOpenMidiModal,
  onOpenCloudModal,
  onOpenDspModal,
  onOpenFolderManager,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('Default Stakz');
  const [selectedSidechain, setSelectedSidechain] = useState<string>('None');

  const presets = [
    'Default Stakz',
    'Trap Heat 140BPM Stak',
    'Lo-Fi Nostalgia Kit',
    'Liquid Drum & Bass Rollers',
    'French Touch House Pack',
    'User Custom Stak',
  ];

  return (
    <div className="min-h-10 h-auto sm:h-10 bg-[#24252e] border-b border-black/70 px-3 flex items-center justify-between text-xs text-neutral-300 shrink-0 select-none overflow-x-auto custom-scrollbar gap-2 py-1 sm:py-0">
      {/* Left: macOS Window Traffic Lights & Plugin Name */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]" />
        </div>

        <div className="flex items-center gap-2 pl-1 border-l border-white/10">
          <span className="font-bold font-mono tracking-wider text-white text-[13px]">
            SAMPLE STAKZ
          </span>
          <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono text-[9px] border border-blue-500/30">
            AUv3 / VST3
          </span>
        </div>
      </div>

      {/* Middle: Logic Pro AU Top Bar Controls */}
      <div className="hidden lg:flex items-center gap-3 font-mono text-[11px] shrink-0">
        {/* Side Chain dropdown */}
        <div className="flex items-center gap-1 bg-black/30 rounded px-2 py-0.5 border border-white/5">
          <span className="text-[10px] text-neutral-500">Side Chain:</span>
          <select
            value={selectedSidechain}
            onChange={(e) => setSelectedSidechain(e.target.value)}
            className="bg-transparent text-neutral-200 outline-none cursor-pointer"
          >
            <option value="None" className="bg-[#1e1f26]">None</option>
            <option value="Track 1: Vocals" className="bg-[#1e1f26]">Track 1: Vocals</option>
            <option value="Track 2: Drums" className="bg-[#1e1f26]">Track 2: Drums</option>
            <option value="Bus 1" className="bg-[#1e1f26]">Bus 1</option>
          </select>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1 bg-black/40 rounded px-2.5 py-0.5 border border-white/10">
          <span className="text-[10px] text-neutral-500">Preset:</span>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="bg-transparent text-white font-medium outline-none cursor-pointer"
          >
            {presets.map((p) => (
              <option key={p} value={p} className="bg-[#1e1f26]">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Compare Button */}
        <button
          onClick={onToggleCompare}
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all border ${
            isCompareActive
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-white/5 text-neutral-400 hover:text-white border-white/5'
          }`}
          title="A/B Compare Settings"
        >
          Compare
        </button>

        {/* Bypass Button with LED */}
        <button
          onClick={onToggleBypass}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all border ${
            isBypassed
              ? 'bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-500/40'
              : 'bg-white/5 text-neutral-400 hover:text-white border-white/5'
          }`}
          title="Bypass Plugin Processing"
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isBypassed ? 'bg-white shadow-[0_0_6px_#ffffff]' : 'bg-neutral-600'
            }`}
          />
          <span>Bypass</span>
        </button>
      </div>

      {/* Right: UI Scale, Theme, Metal DSP, MIDI, Cloud Sync */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Metal GPU Accel Button */}
        <button
          onClick={onOpenDspModal}
          className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[10px] font-mono transition-colors"
          title="View Metal 3 Acceleration & Multi-Threading DSP Engine"
        >
          <Cpu className="w-3 h-3" />
          <span>Metal 3</span>
        </button>

        {/* MIDI Hardware mapping button */}
        <button
          onClick={onOpenMidiModal}
          className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
          title="MIDI Controller & Pad Mapping"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Multi-Drive Folder Manager button */}
        {onOpenFolderManager && (
          <button
            onClick={onOpenFolderManager}
            className="p-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white transition-colors border border-emerald-500/30"
            title="Multi-Drive Folder Location Manager & Auto-Sorter"
          >
            <Cpu className="hidden" />
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold">
              📁 Drives
            </span>
          </button>
        )}

        {/* Cloud Sync button */}
        <button
          onClick={onOpenCloudModal}
          className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
          title="Cloud Stakz Synchronization & Offline Storage"
        >
          <Cloud className="w-3.5 h-3.5" />
        </button>

        {/* Theme Picker */}
        <div className="flex items-center bg-black/40 rounded px-1.5 py-0.5 border border-white/5">
          <Palette className="w-3 h-3 text-neutral-400 mr-1" />
          <select
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as ThemeType)}
            className="bg-transparent text-[10px] font-mono text-neutral-300 outline-none cursor-pointer"
          >
            <option value="logic-dark" className="bg-[#1e1f26]">Logic Space Grey</option>
            <option value="ableton-slate" className="bg-[#1e1f26]">Ableton Slate</option>
            <option value="cyber-metal" className="bg-[#1e1f26]">Cyber Metal</option>
            <option value="obsidian-gold" className="bg-[#1e1f26]">Obsidian Gold</option>
          </select>
        </div>

        {/* Scalable Layout Engine (Zoom 75% to 150%) */}
        <div className="flex items-center bg-black/40 rounded px-1.5 py-0.5 border border-white/5">
          <ZoomIn className="w-3 h-3 text-neutral-400 mr-1" />
          <select
            value={uiScale}
            onChange={(e) => onScaleChange(parseFloat(e.target.value))}
            className="bg-transparent text-[10px] font-mono text-neutral-300 outline-none cursor-pointer"
            title="Scalable Layout Engine for 1080p, 4K Retina and Ultrawide displays"
          >
            <option value="0.75" className="bg-[#1e1f26]">Scale 75%</option>
            <option value="0.9" className="bg-[#1e1f26]">Scale 90%</option>
            <option value="1.0" className="bg-[#1e1f26]">Scale 100%</option>
            <option value="1.15" className="bg-[#1e1f26]">Scale 115%</option>
            <option value="1.25" className="bg-[#1e1f26]">Scale 125%</option>
            <option value="1.5" className="bg-[#1e1f26]">Scale 150%</option>
          </select>
        </div>

        {/* Logic Pro Full Host View vs Focused AU Window */}
        <button
          onClick={onToggleDawMode}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
            isDawMode
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
              : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
          title="Toggle between Full Logic Pro Host view and Standalone AU Plugin Window"
        >
          {isDawMode ? (
            <>
              <Minimize2 className="w-3 h-3" />
              <span>AU Only</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3 h-3" />
              <span>Logic DAW</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
