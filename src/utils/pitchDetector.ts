/**
 * pitchDetector.ts
 * Pure decoupled automatic pitch and musical key detection engine.
 * Implements:
 * 1. Time-Domain Normalized Autocorrelation (ACF) for fundamental frequency ($f_0$) pitch detection.
 * 2. 12-Pitch Class Profile (PCP / Chromagram) energy extraction.
 * 3. Krumhansl-Schmuckler Key-Finding Algorithm using standard Cognitive Key Profiles
 *    for automatic Major and Minor key classification.
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

// Krumhansl-Kessler Key Profiles for 12 pitch classes relative to the tonic
const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export interface PitchAnalysisResult {
  key: string; // e.g. "C min", "A min", "Eb maj"
  confidence: number; // 0 to 1 (e.g. 0.94 = 94%)
  fundamentalHz: number; // Detected fundamental frequency
  dominantNote: string; // e.g. "C", "A", "Eb"
  isMinor: boolean;
  chromagram: number[]; // 12-bin normalized pitch class energy (0.0 to 1.0)
  camelot: string; // e.g. "5A", "8A", "2B"
}

/**
 * Autocorrelation algorithm to detect fundamental frequency (f0)
 */
export function detectFundamentalFrequency(
  buffer: Float32Array,
  sampleRate: number = 44100
): { freqHz: number; confidence: number } {
  const size = Math.min(buffer.length, 4096);
  if (size < 256) return { freqHz: 0, confidence: 0 };

  // Calculate RMS energy first
  let sumSquares = 0;
  for (let i = 0; i < size; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / size);
  if (rms < 0.005) {
    return { freqHz: 0, confidence: 0 };
  }

  // Pitch search bounds (40 Hz = sub bass, 1200 Hz = high vocal/lead)
  const minLag = Math.floor(sampleRate / 1200);
  const maxLag = Math.floor(sampleRate / 40);

  let bestLag = -1;
  let maxCorr = -1;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < size - lag; i++) {
      corr += buffer[i] * buffer[i + lag];
    }
    // Normalize correlation
    const normCorr = corr / (sumSquares + 1e-9);
    if (normCorr > maxCorr) {
      maxCorr = normCorr;
      bestLag = lag;
    }
  }

  if (bestLag > 0 && maxCorr > 0.35) {
    const freq = sampleRate / bestLag;
    return { freqHz: Number(freq.toFixed(1)), confidence: Math.min(1.0, maxCorr) };
  }

  return { freqHz: 0, confidence: 0 };
}

/**
 * Compute 12-bin Chromagram (Pitch Class Profile) from audio signal
 * Returns energy across [C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B]
 */
export function computeChromagram(
  buffer: Float32Array,
  sampleRate: number = 44100
): number[] {
  const chroma = new Array(12).fill(0);
  const size = Math.min(buffer.length, 8192);
  const step = Math.max(1, Math.floor(size / 2048));

  // DFT Goertzel-style evaluation at musical pitches across 3 octaves (C2 to B4: ~65 Hz to ~500 Hz)
  const a4Freq = 440;
  for (let noteIdx = 0; noteIdx < 12; noteIdx++) {
    // Test across octave 2, 3, 4
    let noteEnergy = 0;
    for (let octave = 2; octave <= 4; octave++) {
      const midi = (octave + 1) * 12 + noteIdx;
      const targetFreq = a4Freq * Math.pow(2, (midi - 69) / 12);
      const omega = (2 * Math.PI * targetFreq) / sampleRate;

      let real = 0;
      let imag = 0;
      for (let i = 0; i < size; i += step) {
        const angle = omega * i;
        real += buffer[i] * Math.cos(angle);
        imag -= buffer[i] * Math.sin(angle);
      }
      noteEnergy += Math.sqrt(real * real + imag * imag);
    }
    chroma[noteIdx] = noteEnergy;
  }

  // Normalize chromagram to [0, 1]
  const maxVal = Math.max(...chroma);
  if (maxVal > 0) {
    for (let i = 0; i < 12; i++) {
      chroma[i] = Number((chroma[i] / maxVal).toFixed(3));
    }
  }

  return chroma;
}

/**
 * Krumhansl-Schmuckler Key Finding Algorithm
 * Correlates Chromagram with 12 Major and 12 Minor key profile vectors
 */
export function estimateKeyFromChroma(chroma: number[]): {
  key: string;
  confidence: number;
  dominantNote: string;
  isMinor: boolean;
  camelot: string;
} {
  let bestScore = -Infinity;
  let bestTonicIdx = 0;
  let bestIsMinor = true;

  // Pearson Correlation between chroma and rotated profile
  for (let tonic = 0; tonic < 12; tonic++) {
    // Major correlation
    const majorProfile = rotateArray(KRUMHANSL_MAJOR, tonic);
    const scoreMaj = pearsonCorrelation(chroma, majorProfile);
    if (scoreMaj > bestScore) {
      bestScore = scoreMaj;
      bestTonicIdx = tonic;
      bestIsMinor = false;
    }

    // Minor correlation
    const minorProfile = rotateArray(KRUMHANSL_MINOR, tonic);
    const scoreMin = pearsonCorrelation(chroma, minorProfile);
    if (scoreMin > bestScore) {
      bestScore = scoreMin;
      bestTonicIdx = tonic;
      bestIsMinor = true;
    }
  }

  const rootNote = NOTE_NAMES[bestTonicIdx];
  const modeStr = bestIsMinor ? 'min' : 'maj';
  const keyName = `${rootNote} ${modeStr}`;
  const confidence = Math.max(0.6, Math.min(0.99, Number(((bestScore + 1) / 2).toFixed(2))));

  // Lookup Camelot code
  const camelot = CAMELOT_KEY_MAP[keyName] || '5A';

  return {
    key: keyName,
    confidence,
    dominantNote: rootNote,
    isMinor: bestIsMinor,
    camelot,
  };
}

/**
 * Full automatic pitch and key detection on an audio channel buffer
 */
export function analyzeAudioBufferPitch(
  channelData: Float32Array,
  sampleRate: number = 44100
): PitchAnalysisResult {
  const { freqHz } = detectFundamentalFrequency(channelData, sampleRate);
  const chromagram = computeChromagram(channelData, sampleRate);
  const keyResult = estimateKeyFromChroma(chromagram);

  return {
    key: keyResult.key,
    confidence: keyResult.confidence,
    fundamentalHz: freqHz,
    dominantNote: keyResult.dominantNote,
    isMinor: keyResult.isMinor,
    chromagram,
    camelot: keyResult.camelot,
  };
}

function rotateArray(arr: number[], shift: number): number[] {
  const len = arr.length;
  const result = new Array(len);
  for (let i = 0; i < len; i++) {
    result[(i + shift) % len] = arr[i];
  }
  return result;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  let sumXY = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
    sumXY += x[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return num / den;
}

export const CAMELOT_KEY_MAP: Record<string, string> = {
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
