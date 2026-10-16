import React, { useEffect, useState } from 'react';
import { midiService } from '../services/midiService';
import { audioEngine } from '../services/audioEngine';
import { SampleItem } from '../types/sample';
import { Sliders, Activity, Radio, X, Check, Keyboard, Disc } from 'lucide-react';

interface MidiControllerModalProps {
  isOpen: boolean;
  onClose: () => void;
  samples: SampleItem[];
}

export const MidiControllerModal: React.FC<MidiControllerModalProps> = ({
  isOpen,
  onClose,
  samples,
}) => {
  const [learningAction, setLearningAction] = useState<string | null>(null);
  const [lastMidiEvent, setLastMidiEvent] = useState<string>('Listening for MIDI input...');
  const [activePad, setActivePad] = useState<number | null>(null);
  const [mappings, setMappings] = useState(midiService.mappings);

  useEffect(() => {
    const unsubState = midiService.onStateChange(() => {
      setLearningAction(midiService.learningAction);
      setMappings([...midiService.mappings]);
    });

    const unsubEvents = midiService.subscribe((data) => {
      setLastMidiEvent(
        `MIDI ${data.type.toUpperCase()}: Ch ${data.channel} | ${
          data.type === 'note' ? 'Note ' : 'CC #'
        }${data.noteOrCc} | Val ${data.value}`
      );

      // Trigger audition if mapped
      if (data.type === 'note' && data.value > 0) {
        // Pad 1-4 triggers
        if (data.noteOrCc >= 36 && data.noteOrCc <= 39) {
          const padIdx = data.noteOrCc - 36;
          triggerPad(padIdx);
        }
      } else if (data.type === 'cc') {
        if (data.noteOrCc === 7) {
          // Volume
          audioEngine.setVolume(data.value / 127);
        } else if (data.noteOrCc === 74) {
          // Filter Cutoff
          const freq = 200 * Math.pow(100, data.value / 127);
          audioEngine.setFilterCutoff(freq);
        } else if (data.noteOrCc === 1) {
          // Pitch
          const semi = Math.round((data.value / 127) * 24 - 12);
          audioEngine.setPitchShift(semi);
        }
      }
    });

    return () => {
      unsubState();
      unsubEvents();
    };
  }, [samples]);

  if (!isOpen) return null;

  const triggerPad = (padIdx: number) => {
    setActivePad(padIdx);
    setTimeout(() => setActivePad(null), 150);

    // Pick sample corresponding to pad
    const sample = samples[padIdx % samples.length];
    if (sample) {
      audioEngine.playSample(sample);
    }
  };

  const handleStartLearn = (actionName: string) => {
    if (learningAction === actionName) {
      midiService.cancelLearn();
    } else {
      midiService.startLearn(actionName);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#181920] border border-white/15 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#1f2029] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 className="font-mono text-sm font-semibold text-white">
              MIDI Hardware Mapping & Pad Controller
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6 overflow-y-auto max-h-[80vh]">
          {/* Status bar */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Radio
                className={`w-4 h-4 ${
                  midiService.isConnected ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'
                }`}
              />
              <span className="text-neutral-300">
                {midiService.isConnected
                  ? `Hardware Connected (${midiService.deviceNames.join(', ') || 'USB MIDI Class'})`
                  : 'Web MIDI API Ready (Connect any USB/Bluetooth MIDI keyboard or pads)'}
              </span>
            </div>
            <span className="text-[11px] text-blue-400 truncate max-w-xs">{lastMidiEvent}</span>
          </div>

          {/* 16-Pad Performance Drum Controller */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-blue-400" />
                MPC 16-Pad Performance Trigger Grid
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                Click pads or press keys [1-4, Q-R, A-F, Z-V]
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 bg-black/50 p-4 rounded-xl border border-white/10">
              {Array.from({ length: 16 }).map((_, i) => {
                const sample = samples[i % samples.length];
                const isLit = activePad === i;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      triggerPad(i);
                      // Also broadcast virtual MIDI event for learning
                      midiService.triggerVirtualEvent('note', 36 + i, 127);
                    }}
                    className={`h-16 rounded-lg p-2 flex flex-col justify-between text-left transition-all relative overflow-hidden border ${
                      isLit
                        ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/40 scale-95'
                        : 'bg-[#22242e] hover:bg-[#2b2e3b] text-neutral-300 border-white/10 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-[10px] font-bold text-neutral-400">
                        PAD {i + 1}
                      </span>
                      <span className="text-[9px] font-mono opacity-60">N#{36 + i}</span>
                    </div>
                    <span className="text-[11px] font-medium truncate w-full">
                      {sample ? sample.name : `Sample ${i + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MIDI CC Knobs & Sliders */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Master Gain (CC 7)</span>
                <span className="text-white font-bold">{Math.round(audioEngine.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={audioEngine.volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  audioEngine.setVolume(val);
                  midiService.triggerVirtualEvent('cc', 7, Math.round(val * 127));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Cutoff (CC 74)</span>
                <span className="text-white font-bold">{Math.round(audioEngine.filterCutoff)}Hz</span>
              </div>
              <input
                type="range"
                min="200"
                max="20000"
                step="50"
                value={audioEngine.filterCutoff}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  audioEngine.setFilterCutoff(val);
                  midiService.triggerVirtualEvent('cc', 74, Math.round((val / 20000) * 127));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Pitch Transpose (CC 1)</span>
                <span className="text-white font-bold">
                  {audioEngine.pitchShiftSemitones > 0 ? `+${audioEngine.pitchShiftSemitones}` : audioEngine.pitchShiftSemitones} st
                </span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={audioEngine.pitchShiftSemitones}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  audioEngine.setPitchShift(val);
                  midiService.triggerVirtualEvent('cc', 1, Math.round(((val + 12) / 24) * 127));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Mappings Table with MIDI Learn */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Hardware Controller MIDI Map
            </span>
            <div className="border border-white/10 rounded-lg overflow-hidden bg-black/30 text-xs">
              <table className="w-full text-left font-mono">
                <thead className="bg-white/5 border-b border-white/10 text-neutral-400 text-[11px]">
                  <tr>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Channel</th>
                    <th className="p-2.5">Note / CC</th>
                    <th className="p-2.5 text-right">MIDI Learn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mappings.map((m) => {
                    const isLearning = learningAction === m.action;
                    return (
                      <tr key={m.action} className="hover:bg-white/[0.03]">
                        <td className="p-2.5 text-white font-medium">{m.label}</td>
                        <td className="p-2.5 uppercase text-neutral-400">{m.midiType}</td>
                        <td className="p-2.5 text-neutral-300">Ch {m.channel}</td>
                        <td className="p-2.5 text-blue-400 font-bold">
                          {m.midiType === 'note' ? `Note ${m.noteOrCc}` : `CC #${m.noteOrCc}`}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleStartLearn(m.action)}
                            className={`px-3 py-1 rounded text-[11px] font-sans font-medium transition-all ${
                              isLearning
                                ? 'bg-amber-500 text-black animate-pulse font-bold'
                                : 'bg-white/10 hover:bg-white/15 text-neutral-200'
                            }`}
                          >
                            {isLearning ? 'Touch Controller...' : 'Learn'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
