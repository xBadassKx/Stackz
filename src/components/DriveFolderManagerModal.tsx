import React, { useState } from 'react';
import { FolderLocation, ScannedSample, extractBpmFromPath, extractKeyFromPath, classifyAudioType } from '../utils/folderScanner';
import { analyzeAudioBufferPitch } from '../utils/pitchDetector';
import { SampleItem } from '../types/sample';
import {
  HardDrive,
  Folder,
  FolderPlus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  X,
  Plus,
  Check,
  Disc,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

interface DriveFolderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderLocations: FolderLocation[];
  onAddFolder: (folder: FolderLocation) => void;
  onRemoveFolder: (id: string) => void;
  onToggleFolder: (id: string) => void;
  onScanComplete: (newSamples: SampleItem[]) => void;
}

export const DriveFolderManagerModal: React.FC<DriveFolderManagerModalProps> = ({
  isOpen,
  onClose,
  folderLocations,
  onAddFolder,
  onRemoveFolder,
  onToggleFolder,
  onScanComplete,
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStepText, setScanStepText] = useState<string>('');
  const [newDriveName, setNewDriveName] = useState<string>('Samsung T7 Shield (USB 3.2)');
  const [newFolderPath, setNewFolderPath] = useState<string>('/Volumes/Samsung_T7/Samples/Trap_Breaks_2026');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  if (!isOpen) return null;

  // Preset Connected Drives for fast 1-click addition
  const connectedDrivePresets = [
    { driveName: 'Macintosh HD (System)', path: '~/Music/Logic/Audio Music Apps/Samples' },
    { driveName: 'Samsung T7 Shield 2TB (USB 3.2)', path: '/Volumes/Samsung_T7/Splice_Vault/Drums' },
    { driveName: 'LaCie Rugged 4TB (Thunderbolt)', path: '/Volumes/LaCie_4TB/Producer_Master_Staks' },
    { driveName: 'Crucial X8 SSD 1TB (USB-C)', path: '/Volumes/Crucial_X8/Melodic_Guitars_Rhodes' },
  ];

  // Perform Simulated Deep Scan with Real Metadata Extraction
  const handleStartScan = () => {
    setIsScanning(true);
    setScanProgress(10);
    setScanStepText('Mounting active disk locations...');

    setTimeout(() => {
      setScanProgress(35);
      setScanStepText('Enumerating directories and audio files (.wav, .aiff, .mp3)...');

      setTimeout(() => {
        setScanProgress(65);
        setScanStepText('Analyzing peak transients, BPM tempo signatures & root pitch...');

        setTimeout(() => {
          setScanProgress(90);
          setScanStepText('Sorting stems into Type, BPM, and Musical Key indices...');

          setTimeout(() => {
            setScanProgress(100);

            // Generate synthetic scanned samples from active folder locations
            const generated: SampleItem[] = [];
            const activeLocations = folderLocations.filter((f) => f.enabled);

            activeLocations.forEach((loc, locIdx) => {
              const fileTemplates = [
                { name: `Sub_808_Slide_${locIdx + 1}_130BPM_Cmin.wav`, baseType: '808' },
                { name: `Neon_Synth_Chords_${locIdx + 1}_124BPM_Ebmaj.wav`, baseType: 'synthchord' },
                { name: `Punch_Tape_Kick_${locIdx + 1}_128BPM_C.wav`, baseType: 'kick' },
                { name: `Jungle_Amen_Break_${locIdx + 1}_174BPM_Dmin.wav`, baseType: 'breakbeat' },
                { name: `Soul_Vocal_Chop_${locIdx + 1}_120BPM_Fmin.wav`, baseType: 'vocal' },
                { name: `LoFi_Tape_Guitar_${locIdx + 1}_85BPM_Amin.wav`, baseType: 'guitar' },
              ];

              fileTemplates.forEach((tpl, i) => {
                const bpm = extractBpmFromPath(tpl.name, 128);
                const pathKey = extractKeyFromPath(tpl.name, 'C min');
                const { category, subType, audioType, isLoop } = classifyAudioType(tpl.name);

                // Run automatic pitch & chromagram key detection algorithm
                const sampleRate = 44100;
                const testBuffer = new Float32Array(4096);
                let basePitch = 130.81; // C3
                if (tpl.baseType === '808') basePitch = 65.41; // C2
                else if (tpl.baseType === 'synthchord') basePitch = 155.56; // Eb3
                else if (tpl.baseType === 'vocal') basePitch = 174.61; // F3
                else if (tpl.baseType === 'guitar') basePitch = 220.0; // A3

                for (let s = 0; s < testBuffer.length; s++) {
                  testBuffer[s] =
                    Math.sin((2 * Math.PI * basePitch * s) / sampleRate) * 0.7 +
                    Math.sin((2 * Math.PI * basePitch * 1.5 * s) / sampleRate) * 0.3;
                }

                const pitchAnalysis = analyzeAudioBufferPitch(testBuffer, sampleRate);
                const finalKey = pathKey || pitchAnalysis.key;

                generated.push({
                  id: `scanned-${loc.id}-${i}-${Date.now()}`,
                  name: tpl.name.replace('.wav', ''),
                  category,
                  bpm,
                  key: finalKey,
                  durationSec: isLoop ? 4.0 : 0.8,
                  tags: [loc.driveName.split(' ')[0], subType, `${bpm} BPM`, finalKey],
                  isLoop,
                  peaks: Array.from({ length: 36 }, () => Number((0.15 + Math.random() * 0.75).toFixed(2))),
                  rating: 5,
                  isFavorite: false,
                  offlineCached: true,
                  cloudSynced: true,
                  fileSizeKb: Math.round(300 + Math.random() * 500),
                  audioType,
                  detectedPitchHz: pitchAnalysis.fundamentalHz || Math.round(basePitch),
                  pitchConfidencePercent: Math.round(pitchAnalysis.confidence * 100),
                  chromagram: pitchAnalysis.chromagram,
                  camelot: pitchAnalysis.camelot,
                });
              });
            });

            onScanComplete(generated);
            setIsScanning(false);
            setTimeout(() => {
              onClose();
            }, 600);
          }, 400);
        }, 500);
      }, 500);
    }, 400);
  };

  const handleAddLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderPath.trim()) return;

    onAddFolder({
      id: `loc-${Date.now()}`,
      driveName: newDriveName.trim() || 'External Hard Drive',
      path: newFolderPath.trim(),
      enabled: true,
      sampleCount: 0,
      lastScanned: 'Never',
    });

    setShowAddForm(false);
    setNewFolderPath('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#181920] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#1f2029] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-sm font-semibold text-white">
              Multi-Drive Location Manager & Auto-Sorter
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[80vh] text-xs">
          {/* Explanation Banner */}
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <div className="p-2 rounded bg-emerald-500/20 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-white font-bold">
                Automatic Drive Scanning & Tri-Fold Organization
              </span>
              <p className="text-neutral-300 leading-relaxed font-sans">
                Set folder locations across any internal or external hard drive (USB, Thunderbolt, SSD). When scanned, Sample Stakz analyzes all audio files and automatically sorts them into <strong>Type</strong> (Drums, Melodic, Bass, Vocal, FX), <strong>BPM Buckets</strong>, and <strong>Musical Key</strong>.
              </p>
            </div>
          </div>

          {/* Connected Drive Folder Locations List */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono uppercase tracking-wider text-neutral-400 text-[11px] font-semibold">
                Configured Drive Paths ({folderLocations.length})
              </span>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Folder Path</span>
              </button>
            </div>

            {/* List */}
            <div className="border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5 bg-black/40">
              {folderLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={loc.enabled}
                      onChange={() => onToggleFolder(loc.id)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                      title="Include in automatic scan"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-medium text-white text-[13px]">{loc.driveName}</span>
                        {loc.sampleCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 font-mono text-[10px]">
                            {loc.sampleCount} Stakz
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-neutral-400 truncate">
                        {loc.path}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-neutral-500">
                      Scanned: {loc.lastScanned || 'Ready'}
                    </span>
                    <button
                      onClick={() => onRemoveFolder(loc.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Remove folder location"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Folder Location Drawer/Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddLocationSubmit}
              className="p-4 rounded-lg bg-[#22232c] border border-blue-500/40 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Add External or Local Drive Folder</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono uppercase text-neutral-400">
                  Quick Select Connected Drive Presets:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {connectedDrivePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewDriveName(preset.driveName);
                        setNewFolderPath(preset.path);
                      }}
                      className="px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 text-left truncate text-[11px] border border-white/5"
                    >
                      {preset.driveName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono text-neutral-400">Drive Label</label>
                <input
                  type="text"
                  value={newDriveName}
                  onChange={(e) => setNewDriveName(e.target.value)}
                  placeholder="e.g. Samsung T7 Shield (USB 3.2)"
                  className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono text-neutral-400">Absolute Folder Path</label>
                <input
                  type="text"
                  value={newFolderPath}
                  onChange={(e) => setNewFolderPath(e.target.value)}
                  placeholder="e.g. /Volumes/LaCie_Rugged/Samples/Drums"
                  className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-600/30"
                >
                  Save Location
                </button>
              </div>
            </form>
          )}

          {/* Scanner Action & Live Progress */}
          <div className="p-4 rounded-lg bg-black/40 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-white text-sm">Deep Audio Analysis Engine</span>
                <span className="text-[11px] text-neutral-400 font-sans">
                  Scans directories, estimates BPM transients, calculates harmonic root keys, and auto-sorts.
                </span>
              </div>
              <button
                onClick={handleStartScan}
                disabled={isScanning || folderLocations.filter((f) => f.enabled).length === 0}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Scan All Folders'}</span>
              </button>
            </div>

            {/* Progress Bar */}
            {isScanning && (
              <div className="flex flex-col gap-1.5 pt-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300">
                  <span>{scanStepText}</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
