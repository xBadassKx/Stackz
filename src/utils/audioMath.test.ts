import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePlaybackRate,
  semitonesToPitchRatio,
  filterSamples,
  isHarmonicallyCompatible,
} from './audioMath.ts';
import type { SampleMeta } from './audioMath.ts';

const mockSamples: SampleMeta[] = [
  {
    id: 's1',
    name: '808 Sub Boom',
    bpm: 140,
    key: 'C min',
    tags: ['trap', 'bass', '808'],
    category: 'bass',
    durationSec: 4.0,
  },
  {
    id: 's2',
    name: 'Vintage Vinyl Break',
    bpm: 90,
    key: 'Eb maj',
    tags: ['lofi', 'drums', 'break'],
    category: 'drums',
    durationSec: 8.0,
  },
  {
    id: 's3',
    name: 'Neon Arp Synth',
    bpm: 128,
    key: 'A min',
    tags: ['synth', 'lead', 'melodic'],
    category: 'melodic',
    durationSec: 4.0,
  },
  {
    id: 's4',
    name: 'Chop Soul Vocal',
    bpm: 120,
    key: 'C min',
    tags: ['vocal', 'soul', 'hook'],
    category: 'vocal',
    durationSec: 2.0,
  },
];

test('calculatePlaybackRate correctly scales sample BPM to host project BPM', () => {
  // Sample 120, Host 120 -> 1.0
  assert.equal(calculatePlaybackRate(120, 120), 1.0);

  // Sample 120, Host 144 -> 1.2
  assert.equal(calculatePlaybackRate(120, 144), 1.2);

  // Half-time multiplier (0.5x)
  assert.equal(calculatePlaybackRate(120, 120, 0.5), 0.5);

  // Double-time multiplier (2.0x)
  assert.equal(calculatePlaybackRate(120, 120, 2.0), 2.0);

  // Clamped bounds test
  assert.equal(calculatePlaybackRate(10, 1000), 4.0);
  assert.equal(calculatePlaybackRate(1000, 10), 0.25);
});

test('semitonesToPitchRatio calculates correct 12-TET intervals', () => {
  // 0 semitones -> 1.0
  assert.equal(semitonesToPitchRatio(0), 1.0);

  // +12 semitones (one octave up) -> 2.0
  assert.equal(semitonesToPitchRatio(12), 2.0);

  // -12 semitones (one octave down) -> 0.5
  assert.equal(semitonesToPitchRatio(-12), 0.5);

  // +7 semitones (perfect fifth) ~ 1.4983
  const fifthRatio = semitonesToPitchRatio(7);
  assert.ok(Math.abs(fifthRatio - 1.498307) < 0.001);
});

test('filterSamples filters by search query and category', () => {
  const result = filterSamples(mockSamples, { query: 'vinyl' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 's2');

  const drumsResult = filterSamples(mockSamples, { selectedCategory: 'drums' });
  assert.equal(drumsResult.length, 1);
  assert.equal(drumsResult[0].name, 'Vintage Vinyl Break');
});

test('filterSamples filters by BPM range', () => {
  const result = filterSamples(mockSamples, { minBpm: 125, maxBpm: 150 });
  assert.equal(result.length, 2); // 128 and 140
  assert.ok(result.some((s) => s.id === 's1'));
  assert.ok(result.some((s) => s.id === 's3'));
});

test('filterSamples filters by musical key', () => {
  const result = filterSamples(mockSamples, { selectedKey: 'C min' });
  assert.equal(result.length, 2); // s1 and s4
});

test('filterSamples filters by favorites', () => {
  const favSet = new Set(['s1', 's3']);
  const result = filterSamples(mockSamples, {
    onlyFavorites: true,
    favoriteIds: favSet,
  });
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 's1');
  assert.equal(result[1].id, 's3');
});

test('isHarmonicallyCompatible checks circle of fifths compatibility', () => {
  // Same key
  assert.equal(isHarmonicallyCompatible('C min', 'C min'), true);

  // C min (5A) and Eb maj (5B) are relative minor/major
  assert.equal(isHarmonicallyCompatible('C min', 'Eb maj'), true);

  // C min (5A) and F min (4A) are adjacent fifths
  assert.equal(isHarmonicallyCompatible('C min', 'F min'), true);

  // C min (5A) and G min (6A) are adjacent fifths
  assert.equal(isHarmonicallyCompatible('C min', 'G min'), true);

  // C min (5A) and B min (10A) are distant/clashing
  assert.equal(isHarmonicallyCompatible('C min', 'B min'), false);
});
