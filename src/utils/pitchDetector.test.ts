import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectFundamentalFrequency,
  computeChromagram,
  estimateKeyFromChroma,
  analyzeAudioBufferPitch,
  NOTE_NAMES,
} from './pitchDetector.ts';

// Helper to generate synthetic audio tones
function generateSineWave(freq: number, durationSec = 0.5, sampleRate = 44100): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return buffer;
}

// Helper to generate synthetic chord
function generateChordWave(freqs: number[], durationSec = 0.5, sampleRate = 44100): Float32Array {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    let val = 0;
    freqs.forEach((f) => {
      val += Math.sin((2 * Math.PI * f * i) / sampleRate);
    });
    buffer[i] = val / freqs.length;
  }
  return buffer;
}

test('detectFundamentalFrequency detects 440Hz A4 pitch', () => {
  const a4Buffer = generateSineWave(440, 0.2, 44100);
  const { freqHz, confidence } = detectFundamentalFrequency(a4Buffer, 44100);

  assert.ok(Math.abs(freqHz - 440) < 5, `Expected ~440Hz, got ${freqHz}`);
  assert.ok(confidence > 0.8, `Expected high confidence, got ${confidence}`);
});

test('detectFundamentalFrequency detects 130.8Hz C3 sub pitch', () => {
  const c3Buffer = generateSineWave(130.81, 0.25, 44100);
  const { freqHz, confidence } = detectFundamentalFrequency(c3Buffer, 44100);

  assert.ok(Math.abs(freqHz - 130.81) < 4, `Expected ~130.8Hz, got ${freqHz}`);
  assert.ok(confidence > 0.7, `Expected high confidence, got ${confidence}`);
});

test('estimateKeyFromChroma correctly identifies C minor triad', () => {
  // C (index 0), Eb (index 3), G (index 7)
  const chroma = new Array(12).fill(0.1);
  chroma[0] = 1.0; // C
  chroma[3] = 0.85; // Eb
  chroma[7] = 0.9; // G

  const result = estimateKeyFromChroma(chroma);
  assert.equal(result.key, 'C min');
  assert.equal(result.isMinor, true);
  assert.equal(result.camelot, '5A');
  assert.ok(result.confidence > 0.7);
});

test('estimateKeyFromChroma correctly identifies A minor triad', () => {
  // A (index 9), C (index 0), E (index 4)
  const chroma = new Array(12).fill(0.08);
  chroma[9] = 1.0; // A
  chroma[0] = 0.85; // C
  chroma[4] = 0.9; // E

  const result = estimateKeyFromChroma(chroma);
  assert.equal(result.key, 'A min');
  assert.equal(result.isMinor, true);
  assert.equal(result.camelot, '8A');
});

test('estimateKeyFromChroma correctly identifies Eb major triad', () => {
  // Eb (index 3), G (index 7), Bb (index 10)
  const chroma = new Array(12).fill(0.08);
  chroma[3] = 1.0; // Eb
  chroma[7] = 0.85; // G
  chroma[10] = 0.9; // Bb

  const result = estimateKeyFromChroma(chroma);
  assert.equal(result.key, 'Eb maj');
  assert.equal(result.isMinor, false);
  assert.equal(result.camelot, '5B');
});

test('analyzeAudioBufferPitch end-to-end analyzes audio buffer and produces chromagram & key', () => {
  // C minor chord frequencies: C3 (130.81), Eb3 (155.56), G3 (196.00)
  const chord = generateChordWave([130.81, 155.56, 196.00], 0.3, 44100);
  const analysis = analyzeAudioBufferPitch(chord, 44100);

  assert.equal(analysis.chromagram.length, 12);
  assert.ok(analysis.confidence > 0.5);
  assert.ok(typeof analysis.key === 'string');
  assert.ok(typeof analysis.camelot === 'string');
});
