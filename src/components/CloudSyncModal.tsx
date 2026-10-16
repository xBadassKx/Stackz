import React, { useState } from 'react';
import { SampleItem } from '../types/sample';
import { Cloud, CloudCheck, HardDrive, RefreshCw, X, ShieldCheck, Download, Check } from 'lucide-react';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleItem[];
  onSyncAll: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  samples,
  onSyncAll,
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('Everything is up-to-date and stored locally.');
  const [offlineMode, setOfflineMode] = useState<boolean>(true);

  if (!isOpen) return null;

  const totalSizeMb = (
    samples.reduce((acc, s) => acc + s.fileSizeKb, 0) / 1024
  ).toFixed(2);

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncStatus('Synchronizing cloud stakz library...');
    setTimeout(() => {
      onSyncAll();
      setIsSyncing(false);
      setSyncStatus(`Successfully synced ${samples.length} items with Cloud Stakz storage.`);
    }, 1200);
  };

  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(samples, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'sample_stakz_library_backup.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#181920] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#1f2029] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-400" />
            <h3 className="font-mono text-sm font-semibold text-white">
              Cloud Stakz Synchronization & Offline Storage
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
        <div className="p-5 flex flex-col gap-5">
          {/* Status Box */}
          <div className="p-4 rounded-lg bg-black/40 border border-white/10 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-medium text-sm text-white">100% Offline Ready</span>
              <p className="text-xs text-neutral-400 leading-relaxed">
                All sample waveforms, metadata, and audio synthesis presets are cached in local browser storage. No internet connection is required during live DAW production.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-1">
              <span className="text-neutral-500">Local Cache Storage</span>
              <span className="text-white text-base font-bold">{totalSizeMb} MB</span>
              <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                <Check className="w-3 h-3" /> IndexedDB / Cache API
              </span>
            </div>

            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-1">
              <span className="text-neutral-500">Cloud Synced Assets</span>
              <span className="text-white text-base font-bold">
                {samples.filter((s) => s.cloudSynced).length} / {samples.length} Loops
              </span>
              <span className="text-blue-400 text-[11px]">Personal Encrypted Stak</span>
            </div>
          </div>

          {/* Offline Sync Controls */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">Enable Full Offline Caching</span>
                <span className="text-[11px] text-neutral-400">Pre-buffer all PCM stems for zero latency</span>
              </div>
              <input
                type="checkbox"
                checked={offlineMode}
                onChange={(e) => setOfflineMode(e.target.checked)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="text-xs text-blue-300 font-mono text-center min-h-[1.5rem]">
              {syncStatus}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing with Remote...' : 'Sync with Cloud Stakz'}
              </button>

              <button
                onClick={handleExportBackup}
                className="py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-neutral-200 font-medium text-xs flex items-center justify-center gap-2 transition-all"
                title="Download JSON backup of sample tags & metadata"
              >
                <Download className="w-3.5 h-3.5" />
                Backup Library
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
