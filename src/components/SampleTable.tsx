import React, { useState } from 'react';
import { SampleItem, ThemeType } from '../types/sample';
import { audioEngine } from '../services/audioEngine';
import { isHarmonicallyCompatible } from '../utils/audioMath';
import {
  Play,
  Pause,
  Star,
  Download,
  GripVertical,
  CheckCircle2,
  CloudCheck,
  Plus,
  Tag as TagIcon,
  Check,
  Volume2,
} from 'lucide-react';

interface SampleTableProps {
  samples: SampleItem[];
  selectedSample: SampleItem | null;
  isPlaying: boolean;
  playingSampleId: string | null;
  hostBpm: number;
  hostKey: string;
  theme: ThemeType;
  autoAudition: boolean;
  onSelectSample: (sample: SampleItem) => void;
  onToggleFavorite: (id: string) => void;
  onAddTag: (id: string, tag: string) => void;
  onDragStartSample: (e: React.DragEvent, sample: SampleItem) => void;
  onInsertToTrack?: (sample: SampleItem) => void;
}

export const SampleTable: React.FC<SampleTableProps> = ({
  samples,
  selectedSample,
  isPlaying,
  playingSampleId,
  hostBpm,
  hostKey,
  theme,
  autoAudition,
  onSelectSample,
  onToggleFavorite,
  onAddTag,
  onDragStartSample,
  onInsertToTrack,
}) => {
  const [addingTagSampleId, setAddingTagSampleId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState<string>('');
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleRowClick = (sample: SampleItem) => {
    onSelectSample(sample);
    if (autoAudition) {
      audioEngine.playSample(sample);
    }
  };

  const handlePlayToggle = (e: React.MouseEvent, sample: SampleItem) => {
    e.stopPropagation();
    if (playingSampleId === sample.id && isPlaying) {
      audioEngine.stop();
    } else {
      onSelectSample(sample);
      audioEngine.playSample(sample);
    }
  };

  const handleExportWav = async (e: React.MouseEvent, sample: SampleItem) => {
    e.stopPropagation();
    try {
      setExportingId(sample.id);
      const { blob, filename } = await audioEngine.exportSampleWav(sample);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setExportingId(null);
    }
  };

  const handleSaveNewTag = (sampleId: string) => {
    if (newTagText.trim()) {
      onAddTag(sampleId, newTagText.trim());
      setNewTagText('');
    }
    setAddingTagSampleId(null);
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto border border-white/10 rounded-lg bg-[#141519] custom-scrollbar">
      <table className="w-full min-w-[700px] text-left text-xs border-collapse">
        {/* Table Header */}
        <thead className="sticky top-0 z-10 bg-[#1a1b22] border-b border-white/10 text-neutral-400 font-mono uppercase text-[11px] tracking-wider">
          <tr>
            <th className="py-2.5 px-3 w-10 text-center">Drag</th>
            <th className="py-2.5 px-3 w-12 text-center">Play</th>
            <th className="py-2.5 px-3">Name & Waveform</th>
            <th className="py-2.5 px-3 w-24">Type</th>
            <th className="py-2.5 px-3 w-28">BPM</th>
            <th className="py-2.5 px-3 w-24">Key</th>
            <th className="py-2.5 px-3">Tags</th>
            <th className="py-2.5 px-3 w-14 text-center">Fav</th>
            <th className="py-2.5 px-3 w-16 text-center">Export</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-white/5">
          {samples.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-12 text-center text-neutral-500 font-mono">
                No samples match your current BPM / Key / Tag filters.
              </td>
            </tr>
          ) : (
            samples.map((sample) => {
              const isSelected = selectedSample?.id === sample.id;
              const isCurrentlyPlaying = playingSampleId === sample.id && isPlaying;
              const isKeyMatched = isHarmonicallyCompatible(sample.key, hostKey);
              const isBpmMatched = Math.abs(sample.bpm - hostBpm) <= 4;

              return (
                <tr
                  key={sample.id}
                  onClick={() => handleRowClick(sample)}
                  className={`group transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Drag Handle */}
                  <td
                    className="py-2 px-3 text-center"
                    draggable
                    onDragStart={(e) => onDragStartSample(e, sample)}
                  >
                    <div
                      className="inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500 text-blue-300 hover:text-white cursor-grab active:cursor-grabbing border border-blue-500/20 transition-all shadow-sm"
                      title="Drag directly into Logic Pro audio track"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-mono font-bold hidden group-hover:inline">
                        DRAG
                      </span>
                    </div>
                  </td>

                  {/* Play Button & Quick Insert Button */}
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => handlePlayToggle(e, sample)}
                        aria-label={isCurrentlyPlaying ? `Stop ${sample.name}` : `Play ${sample.name}`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                          isCurrentlyPlaying
                            ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-400/50'
                            : 'bg-white/5 text-neutral-300 group-hover:bg-white/15 group-hover:text-white'
                        }`}
                        title="Audition Sample (Snapped to Project Tempo)"
                      >
                        {isCurrentlyPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      {onInsertToTrack && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertToTrack(sample);
                          }}
                          className="hidden group-hover:flex p-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white transition-all text-[9px] font-mono font-bold"
                          title="Instant 1-Click: Insert into Logic Pro audio track at playhead"
                        >
                          +TRK
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Name & Mini Waveform Preview */}
                  <td className="py-2 px-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium text-sm truncate max-w-xs ${
                            isSelected ? 'text-white' : 'text-neutral-200'
                          }`}
                        >
                          {sample.name}
                        </span>
                        {sample.isLoop && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                            LOOP
                          </span>
                        )}
                        {sample.offlineCached && (
                          <span
                            className="text-emerald-400"
                            title="Available offline in local storage cache"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* Mini Waveform visualization bars */}
                      <div className="flex items-center gap-[2px] h-3.5 w-44">
                        {sample.peaks.slice(0, 24).map((peak, idx) => (
                          <div
                            key={idx}
                            className={`w-1 rounded-sm transition-all ${
                              isCurrentlyPlaying
                                ? 'bg-blue-400'
                                : isSelected
                                ? 'bg-blue-300/60'
                                : 'bg-neutral-600/50 group-hover:bg-neutral-500'
                            }`}
                            style={{ height: `${Math.max(20, peak * 100)}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Category Pill */}
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded capitalize font-mono text-[11px] bg-white/5 text-neutral-300 border border-white/5">
                      {sample.category}
                    </span>
                  </td>

                  {/* BPM & Snapped Tempo Calculation */}
                  <td className="py-2 px-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-medium text-neutral-200">
                          {sample.bpm}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono border border-emerald-500/30">
                          → {hostBpm} BPM
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-neutral-400">
                        {((hostBpm / sample.bpm)).toFixed(2)}x Snapped
                      </span>
                    </div>
                  </td>

                  {/* Key */}
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-neutral-200">{sample.key}</span>
                      {isKeyMatched && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono border border-amber-500/30"
                          title="Harmonically compatible with project key (Circle of Fifths)"
                        >
                          HARM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Tags & Tag Editor */}
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {sample.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 text-[10px] hover:bg-white/10 hover:text-white"
                        >
                          {tag}
                        </span>
                      ))}

                      {/* Add Tag Inline Form */}
                      {addingTagSampleId === sample.id ? (
                        <div
                          className="flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5 border border-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            placeholder="Tag..."
                            value={newTagText}
                            onChange={(e) => setNewTagText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveNewTag(sample.id);
                              if (e.key === 'Escape') setAddingTagSampleId(null);
                            }}
                            autoFocus
                            className="w-16 bg-transparent text-[10px] text-white outline-none"
                          />
                          <button
                            onClick={() => handleSaveNewTag(sample.id)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingTagSampleId(sample.id);
                            setNewTagText('');
                          }}
                          className="p-1 rounded hover:bg-white/10 text-neutral-500 hover:text-neutral-300 transition-colors"
                          title="Add custom tag"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Favorite Star */}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(sample.id);
                      }}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      title={sample.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          sample.isFavorite
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-neutral-600 hover:text-neutral-400'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Export WAV Button */}
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={(e) => handleExportWav(e, sample)}
                      disabled={exportingId === sample.id}
                      className="p-1 rounded hover:bg-blue-500/20 text-neutral-400 hover:text-blue-300 transition-colors"
                      title="Export high-resolution 16-bit 48kHz WAV audio file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
