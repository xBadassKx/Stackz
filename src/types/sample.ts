export type SampleCategory = 'all' | 'drums' | 'melodic' | 'bass' | 'fx' | 'vocal';

export interface SampleItem {
  id: string;
  name: string;
  category: 'drums' | 'melodic' | 'bass' | 'fx' | 'vocal';
  bpm: number;
  key: string;
  durationSec: number;
  tags: string[];
  isLoop: boolean;
  peaks: number[]; // Normalized waveform peak heights (0.0 to 1.0)
  rating: number; // 1-5
  isFavorite: boolean;
  offlineCached: boolean;
  cloudSynced: boolean;
  fileSizeKb: number;
  audioType: 'kick' | 'snare' | 'hihat' | 'percloop' | 'synthchord' | '808' | 'guitar' | 'vocal' | 'riser' | 'breakbeat';
  detectedPitchHz?: number;
  pitchConfidencePercent?: number;
  chromagram?: number[];
  camelot?: string;
}

export interface LogicTrackRegion {
  id: string;
  sampleId: string;
  sampleName: string;
  startBar: number; // e.g. 1, 2, 3, 5
  lengthBars: number;
  color: string;
  waveformPeaks: number[];
  category: string;
}

export interface LogicTrack {
  id: string;
  name: string;
  type: 'audio' | 'midi' | 'aux';
  volume: number; // 0 to 1
  pan: number; // -1 to +1
  isMuted: boolean;
  isSoloed: boolean;
  color: string;
  regions: LogicTrackRegion[];
}

export type ThemeType = 'logic-dark' | 'ableton-slate' | 'cyber-metal' | 'obsidian-gold';

export interface MidiMapping {
  action: 'audition' | 'stop' | 'tempo_sync' | 'volume' | 'filter' | 'pitch' | 'prev_sample' | 'next_sample' | 'trigger_pad_1' | 'trigger_pad_2' | 'trigger_pad_3' | 'trigger_pad_4';
  label: string;
  midiType: 'note' | 'cc';
  channel: number;
  noteOrCc: number;
}
