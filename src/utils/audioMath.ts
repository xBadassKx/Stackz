/**
 * audioMath.ts
 * Pure decoupled audio mathematical utilities for Sample Stakz.
 * Includes time stretching playback rate calculations, musical transposition,
 * harmonic key compatibility, BPM filtering, and WAV encoding.
 */

export interface SampleMeta {
  id: string;
  name: string;
  bpm: number;
  key: string; // e.g. "C min", "F# maj", "A min"
  tags: string[];
  category: 'drums' | 'melodic' | 'bass' | 'fx' | 'vocal';
  durationSec: number;
}

/**
 * Calculate playback rate needed to match sample BPM to host project BPM.
 * @param sampleBpm Original BPM of the sample
 * @param hostBpm Current BPM of the host DAW
 * @param multiplier Half-time (0.5), normal (1.0), or double-time (2.0)
 */
export function calculatePlaybackRate(
  sampleBpm: number,
  hostBpm: number,
  multiplier: number = 1.0
): number {
  if (sampleBpm <= 0 || hostBpm <= 0) return 1.0;
  const rate = (hostBpm / sampleBpm) * multiplier;
  // Clamp to reasonable musical limits (0.25x to 4.0x)
  return Math.max(0.25, Math.min(4.0, rate));
}

/**
 * Calculate pitch ratio from semitone transposition (-12 to +12)
 * Formula: 2 ^ (semitones / 12)
 */
export function semitonesToPitchRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/**
 * Filter samples by search query, BPM range, musical key, and category/tags.
 */
export function filterSamples(
  samples: SampleMeta[],
  filters: {
    query?: string;
    minBpm?: number;
    maxBpm?: number;
    selectedKey?: string;
    selectedCategory?: string;
    selectedTags?: string[];
    onlyFavorites?: boolean;
    favoriteIds?: Set<string>;
  }
): SampleMeta[] {
  const {
    query = '',
    minBpm = 0,
    maxBpm = 999,
    selectedKey = 'all',
    selectedCategory = 'all',
    selectedTags = [],
    onlyFavorites = false,
    favoriteIds = new Set(),
  } = filters;

  const normalizedQuery = query.toLowerCase().trim();

  return samples.filter((sample) => {
    // Favorites check
    if (onlyFavorites && !favoriteIds.has(sample.id)) {
      return false;
    }

    // BPM check
    if (sample.bpm < minBpm || sample.bpm > maxBpm) {
      return false;
    }

    // Key check
    if (selectedKey !== 'all' && sample.key !== selectedKey) {
      return false;
    }

    // Category check
    if (selectedCategory !== 'all' && sample.category !== selectedCategory) {
      return false;
    }

    // Tags check (all selected tags must be present)
    if (selectedTags.length > 0) {
      const sampleTagsLower = sample.tags.map((t) => t.toLowerCase());
      const hasAllTags = selectedTags.every((tag) =>
        sampleTagsLower.includes(tag.toLowerCase())
      );
      if (!hasAllTags) return false;
    }

    // Text search query
    if (normalizedQuery) {
      const matchName = sample.name.toLowerCase().includes(normalizedQuery);
      const matchKey = sample.key.toLowerCase().includes(normalizedQuery);
      const matchCategory = sample.category.toLowerCase().includes(normalizedQuery);
      const matchTags = sample.tags.some((t) =>
        t.toLowerCase().includes(normalizedQuery)
      );
      if (!matchName && !matchKey && !matchCategory && !matchTags) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Camelot Wheel / Harmonic Key Compatibility Map
 * Checks if two musical keys are harmonically compatible (same key, relative major/minor, or +1/-1 fifth)
 */
export const KEY_CAMELOT_MAP: Record<string, string> = {
  'Ab min': '1A', 'B maj': '1B',
  'Eb min': '2A', 'F# maj': '2B',
  'Bb min': '3A', 'Db maj': '3B',
  'F min': '4A', 'Ab maj': '4B',
  'C min': '5A', 'Eb maj': '5B',
  'G min': '6A', 'Bb maj': '6B',
  'D min': '7A', 'F maj': '7B',
  'A min': '8A', 'C maj': '8B',
  'E min': '9A', 'G maj': '9B',
  'B min': '10A', 'D maj': '10B',
  'F# min': '11A', 'A maj': '11B',
  'Db min': '12A', 'E maj': '12B',
};

export function isHarmonicallyCompatible(keyA: string, keyB: string): boolean {
  if (keyA === keyB) return true;
  const camA = KEY_CAMELOT_MAP[keyA];
  const camB = KEY_CAMELOT_MAP[keyB];
  if (!camA || !camB) return false;

  const numA = parseInt(camA.slice(0, -1), 10);
  const letterA = camA.slice(-1);
  const numB = parseInt(camB.slice(0, -1), 10);
  const letterB = camB.slice(-1);

  // Same number, opposite letter (relative major/minor)
  if (numA === numB) return true;

  // Adjacent number on circle of fifths with same letter
  if (letterA === letterB) {
    const diff = Math.abs(numA - numB);
    if (diff === 1 || diff === 11) return true;
  }

  return false;
}

/**
 * Generates standard 16-bit PCM WAV Blob from Float32Array channel audio data
 * Enables low-latency in-browser audio export and drag-out.
 */
export function createWavBlob(
  channelData: Float32Array[],
  sampleRate: number = 44100
): Blob {
  const numChannels = channelData.length;
  const numSamples = channelData[0].length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier 'RIFF'
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier & length itself
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type 'WAVE'
  writeString(view, 8, 'WAVE');
  // format chunk identifier 'fmt '
  writeString(view, 12, 'fmt ');
  // format chunk length 16
  view.setUint32(16, 16, true);
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate
  view.setUint32(28, byteRate, true);
  // block align
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier 'data'
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataSize, true);

  // Write interleaved 16-bit samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channelData[channel][i];
      // Clamping to [-1, 1]
      sample = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit signed integer (-32768 to 32767)
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
