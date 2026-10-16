/**
 * folderScanner.ts
 * Pure decoupled logic for scanning multi-drive folder locations,
 * extracting BPM, Key, and audio Type from filenames and directory structures,
 * and automatically organizing libraries into Type, BPM, and Key trees.
 */

export interface FolderLocation {
  id: string;
  driveName: string;
  path: string;
  enabled: boolean;
  sampleCount: number;
  lastScanned?: string;
}

export interface ScannedSample {
  id: string;
  name: string;
  folderPath: string;
  driveName: string;
  category: 'drums' | 'melodic' | 'bass' | 'vocal' | 'fx';
  subType: string;
  bpm: number;
  key: string;
  durationSec: number;
  tags: string[];
  isLoop: boolean;
  peaks: number[];
  rating: number;
  isFavorite: boolean;
  offlineCached: boolean;
  cloudSynced: boolean;
  fileSizeKb: number;
  audioType: 'kick' | 'snare' | 'hihat' | 'percloop' | 'synthchord' | '808' | 'guitar' | 'vocal' | 'riser' | 'breakbeat';
}

/**
 * Extract BPM from a filename or folder path using strict musical regex patterns.
 */
export function extractBpmFromPath(text: string, defaultBpm = 128): number {
  // Matches "140bpm", "140_bpm", "140 bpm", "bpm_140", "140-bpm", "140.0bpm"
  const bpmMatch = text.match(/(?:^|[\s_\-\[])(\d{2,3}(?:\.\d+)?)\s*(?:bpm|tempo)(?:[\s_\-\]\.]|$)/i);
  if (bpmMatch) {
    const val = parseFloat(bpmMatch[1]);
    if (val >= 50 && val <= 250) return Math.round(val);
  }

  // Matches standalone 2-3 digit numbers in reasonable musical range like "_140_" or "- 128 -"
  const numMatches = text.match(/(?:[\s_\-\[])(\d{2,3})(?:[\s_\-\]\.])/g);
  if (numMatches) {
    for (const match of numMatches) {
      const cleanNum = parseInt(match.replace(/[^0-9]/g, ''), 10);
      if (cleanNum >= 65 && cleanNum <= 180) {
        return cleanNum;
      }
    }
  }

  return defaultBpm;
}

/**
 * Extract Musical Key from a filename or folder path.
 */
export function extractKeyFromPath(text: string, defaultKey = 'C min'): string {
  // Check Camelot notation e.g. 5A, 8B, 11A
  const camelotMatch = text.match(/(?:^|[\s_\-\[])([1-9]|1[0-2])([AB])(?:[\s_\-\]\.]|$)/i);
  if (camelotMatch) {
    const camelotKey = `${camelotMatch[1]}${camelotMatch[2].toUpperCase()}`;
    const reverseCamelot: Record<string, string> = {
      '1A': 'Ab min', '1B': 'B maj',
      '2A': 'Eb min', '2B': 'F# maj',
      '3A': 'Bb min', '3B': 'Db maj',
      '4A': 'F min', '4B': 'Ab maj',
      '5A': 'C min', '5B': 'Eb maj',
      '6A': 'G min', '6B': 'Bb maj',
      '7A': 'D min', '7B': 'F maj',
      '8A': 'A min', '8B': 'C maj',
      '9A': 'E min', '9B': 'G maj',
      '10A': 'B min', '10B': 'D maj',
      '11A': 'F# min', '11B': 'A maj',
      '12A': 'Db min', '12B': 'E maj',
    };
    if (reverseCamelot[camelotKey]) return reverseCamelot[camelotKey];
  }

  // Check traditional Key naming: "Cmin", "C min", "C_minor", "F#maj", "Eb_maj", "Am", "F#m"
  const keyPattern = /(?:^|[\s_\-\[])([A-G][#b]?)(?:[\s_\-]*)(min|maj|minor|major|m)(?:[\s_\-\]\.]|$)/i;
  const match = text.match(keyPattern);
  if (match) {
    let note = match[1].toUpperCase();
    if (match[1].length > 1) {
      note = `${match[1][0].toUpperCase()}${match[1][1].toLowerCase()}`;
    }
    const mode = match[2].toLowerCase();
    const isMinor = mode === 'min' || mode === 'minor' || mode === 'm';
    return `${note} ${isMinor ? 'min' : 'maj'}`;
  }

  return defaultKey;
}

/**
 * Classify audio type and subcategory from filename and path keywords.
 */
export function classifyAudioType(text: string): {
  category: 'drums' | 'melodic' | 'bass' | 'vocal' | 'fx';
  subType: string;
  audioType: 'kick' | 'snare' | 'hihat' | 'percloop' | 'synthchord' | '808' | 'guitar' | 'vocal' | 'riser' | 'breakbeat';
  isLoop: boolean;
} {
  const lower = text.toLowerCase();

  const isLoop =
    lower.includes('loop') ||
    lower.includes('break') ||
    lower.includes('groove') ||
    lower.includes('bpm') ||
    lower.includes('riff') ||
    lower.includes('chord');

  // 1. Drums
  if (
    lower.includes('kick') ||
    lower.includes('bd') ||
    lower.includes('snare') ||
    lower.includes('clap') ||
    lower.includes('hihat') ||
    lower.includes('hat') ||
    lower.includes('cymbal') ||
    lower.includes('drum') ||
    lower.includes('perc') ||
    lower.includes('break')
  ) {
    if (lower.includes('kick') || lower.includes('bd')) {
      return { category: 'drums', subType: 'Kick', audioType: 'kick', isLoop: false };
    }
    if (lower.includes('snare') || lower.includes('clap') || lower.includes('rim')) {
      return { category: 'drums', subType: 'Snare/Clap', audioType: 'snare', isLoop: false };
    }
    if (lower.includes('break') || lower.includes('amen') || lower.includes('jungle')) {
      return { category: 'drums', subType: 'Breakbeat Loop', audioType: 'breakbeat', isLoop: true };
    }
    return {
      category: 'drums',
      subType: isLoop ? 'Drum Loop' : 'Percussion',
      audioType: 'percloop',
      isLoop,
    };
  }

  // 2. Bass & 808
  if (
    lower.includes('bass') ||
    lower.includes('808') ||
    lower.includes('sub') ||
    lower.includes('reese') ||
    lower.includes('303')
  ) {
    return {
      category: 'bass',
      subType: lower.includes('808') ? '808 Sub' : 'Synth Bass',
      audioType: '808',
      isLoop,
    };
  }

  // 3. Vocals
  if (
    lower.includes('vocal') ||
    lower.includes('vox') ||
    lower.includes('acapella') ||
    lower.includes('chant') ||
    lower.includes('adlib')
  ) {
    return { category: 'vocal', subType: 'Vocal Hook/Chop', audioType: 'vocal', isLoop };
  }

  // 4. FX
  if (
    lower.includes('fx') ||
    lower.includes('riser') ||
    lower.includes('sweep') ||
    lower.includes('downlifter') ||
    lower.includes('impact') ||
    lower.includes('transition')
  ) {
    return { category: 'fx', subType: 'Riser/Transition', audioType: 'riser', isLoop: false };
  }

  // 5. Melodic
  if (lower.includes('guitar') || lower.includes('acoustic')) {
    return { category: 'melodic', subType: 'Guitar Loop', audioType: 'guitar', isLoop: true };
  }

  return {
    category: 'melodic',
    subType: isLoop ? 'Synth/Keys Loop' : 'Melodic One-Shot',
    audioType: 'synthchord',
    isLoop,
  };
}

/**
 * Group samples into Type hierarchy:
 * Drums -> Breaks, Kicks, Snares
 * Melodic -> Chords, Guitars, Synths
 * Bass -> 808s, Subs
 * Vocal
 * FX
 */
export function groupSamplesByType(samples: ScannedSample[]): Record<string, ScannedSample[]> {
  const grouped: Record<string, ScannedSample[]> = {
    'Drums: Loops & Breaks': [],
    'Drums: Kicks & Snares': [],
    'Melodic: Keys & Chords': [],
    'Melodic: Guitars & Leads': [],
    'Bass & 808s': [],
    'Vocal Staks': [],
    'FX & Transitions': [],
  };

  for (const s of samples) {
    if (s.category === 'drums') {
      if (s.isLoop || s.subType.includes('Break') || s.subType.includes('Loop')) {
        grouped['Drums: Loops & Breaks'].push(s);
      } else {
        grouped['Drums: Kicks & Snares'].push(s);
      }
    } else if (s.category === 'melodic') {
      if (s.subType.includes('Guitar')) {
        grouped['Melodic: Guitars & Leads'].push(s);
      } else {
        grouped['Melodic: Keys & Chords'].push(s);
      }
    } else if (s.category === 'bass') {
      grouped['Bass & 808s'].push(s);
    } else if (s.category === 'vocal') {
      grouped['Vocal Staks'].push(s);
    } else {
      grouped['FX & Transitions'].push(s);
    }
  }

  return grouped;
}

/**
 * Group samples into standard DAW BPM ranges:
 * 60-90 (Lo-Fi / Boom Bap / Slow R&B)
 * 91-115 (Pop / Downtempo / Funk)
 * 116-128 (House / Disco / Techno)
 * 129-145 (Trap / Drill / Dubstep)
 * 146-180+ (Jungle / Drum & Bass / Hyperpop)
 */
export function groupSamplesByBpm(samples: ScannedSample[]): Record<string, ScannedSample[]> {
  const groups: Record<string, ScannedSample[]> = {
    '60-90 BPM (Lo-Fi / Hip-Hop)': [],
    '91-115 BPM (Groove / Funk / Pop)': [],
    '116-128 BPM (House / Disco / Club)': [],
    '129-145 BPM (Trap / Drill / Dubstep)': [],
    '146-180+ BPM (Jungle / D&B / Fast)': [],
  };

  for (const s of samples) {
    if (s.bpm <= 90) {
      groups['60-90 BPM (Lo-Fi / Hip-Hop)'].push(s);
    } else if (s.bpm <= 115) {
      groups['91-115 BPM (Groove / Funk / Pop)'].push(s);
    } else if (s.bpm <= 128) {
      groups['116-128 BPM (House / Disco / Club)'].push(s);
    } else if (s.bpm <= 145) {
      groups['129-145 BPM (Trap / Drill / Dubstep)'].push(s);
    } else {
      groups['146-180+ BPM (Jungle / D&B / Fast)'].push(s);
    }
  }

  return groups;
}

/**
 * Group samples by Musical Key.
 */
export function groupSamplesByKey(samples: ScannedSample[]): Record<string, ScannedSample[]> {
  const groups: Record<string, ScannedSample[]> = {};
  for (const s of samples) {
    if (!groups[s.key]) {
      groups[s.key] = [];
    }
    groups[s.key].push(s);
  }
  return groups;
}
