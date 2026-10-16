import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractBpmFromPath,
  extractKeyFromPath,
  classifyAudioType,
  groupSamplesByType,
  groupSamplesByBpm,
  groupSamplesByKey,
} from './folderScanner.ts';
import type { ScannedSample } from './folderScanner.ts';

test('extractBpmFromPath extracts BPM from various file and folder formats', () => {
  assert.equal(extractBpmFromPath('Trap_Heat_140bpm_Loop.wav'), 140);
  assert.equal(extractBpmFromPath('/Volumes/T7/Drums/Break_92_BPM_Clean.wav'), 92);
  assert.equal(extractBpmFromPath('Disco_Groove_126.0bpm.wav'), 126);
  assert.equal(extractBpmFromPath('DnB_Amen_174_Stereo.wav'), 174);
  // Default fallback when no BPM found
  assert.equal(extractBpmFromPath('Random_Sound_Effect.wav', 128), 128);
});

test('extractKeyFromPath extracts musical keys and Camelot notations', () => {
  // Standard Minor/Major notation
  assert.equal(extractKeyFromPath('Synth_Lead_Cmin_128.wav'), 'C min');
  assert.equal(extractKeyFromPath('Rhodes_Eb_maj_Loop.wav'), 'Eb maj');
  assert.equal(extractKeyFromPath('Bass_F#m_130.wav'), 'F# min');
  assert.equal(extractKeyFromPath('Chords_Am_85bpm.wav'), 'A min');

  // Camelot notation
  assert.equal(extractKeyFromPath('Melody_5A_Chords.wav'), 'C min');
  assert.equal(extractKeyFromPath('Pad_8B_Warm.wav'), 'C maj');
  assert.equal(extractKeyFromPath('Riff_11A_Groove.wav'), 'F# min');
});

test('classifyAudioType categorizes audio stems by keywords', () => {
  const kick = classifyAudioType('Hard_Punch_Kick_OneShot.wav');
  assert.equal(kick.category, 'drums');
  assert.equal(kick.subType, 'Kick');
  assert.equal(kick.isLoop, false);

  const breakbeat = classifyAudioType('Liquid_Jungle_Amen_Break_Loop_174.wav');
  assert.equal(breakbeat.category, 'drums');
  assert.equal(breakbeat.subType, 'Breakbeat Loop');
  assert.equal(breakbeat.isLoop, true);

  const sub808 = classifyAudioType('Heavy_Drill_808_Slide_C.wav');
  assert.equal(sub808.category, 'bass');
  assert.equal(sub808.audioType, '808');

  const vocal = classifyAudioType('Soul_Vocal_Chop_Phrase_Cm.wav');
  assert.equal(vocal.category, 'vocal');

  const riser = classifyAudioType('Hyper_Laser_Riser_Build.wav');
  assert.equal(riser.category, 'fx');
});

test('groupSamplesByType, groupSamplesByBpm, and groupSamplesByKey accurately categorize collections', () => {
  const samples: ScannedSample[] = [
    {
      id: '1',
      name: 'Trap Kick',
      folderPath: '/Volumes/SSD/Drums',
      driveName: 'External SSD',
      category: 'drums',
      subType: 'Kick',
      bpm: 140,
      key: 'C min',
      durationSec: 0.5,
      tags: ['Kick'],
      isLoop: false,
      peaks: [0.9],
      rating: 5,
      isFavorite: false,
      offlineCached: true,
      cloudSynced: true,
      fileSizeKb: 100,
      audioType: 'kick',
    },
    {
      id: '2',
      name: 'Rhodes Chords',
      folderPath: '/Volumes/SSD/Keys',
      driveName: 'External SSD',
      category: 'melodic',
      subType: 'Keys Loop',
      bpm: 120,
      key: 'Eb maj',
      durationSec: 4.0,
      tags: ['Keys'],
      isLoop: true,
      peaks: [0.5],
      rating: 5,
      isFavorite: false,
      offlineCached: true,
      cloudSynced: true,
      fileSizeKb: 600,
      audioType: 'synthchord',
    },
    {
      id: '3',
      name: 'Fast DnB Break',
      folderPath: '/Volumes/HD/Breaks',
      driveName: 'Backup HD',
      category: 'drums',
      subType: 'Breakbeat Loop',
      bpm: 174,
      key: 'D min',
      durationSec: 2.7,
      tags: ['Break'],
      isLoop: true,
      peaks: [0.8],
      rating: 5,
      isFavorite: true,
      offlineCached: true,
      cloudSynced: true,
      fileSizeKb: 750,
      audioType: 'breakbeat',
    },
  ];

  // Group by Type
  const byType = groupSamplesByType(samples);
  assert.equal(byType['Drums: Kicks & Snares'].length, 1);
  assert.equal(byType['Melodic: Keys & Chords'].length, 1);
  assert.equal(byType['Drums: Loops & Breaks'].length, 1);

  // Group by BPM
  const byBpm = groupSamplesByBpm(samples);
  assert.equal(byBpm['116-128 BPM (House / Disco / Club)'].length, 1);
  assert.equal(byBpm['129-145 BPM (Trap / Drill / Dubstep)'].length, 1);
  assert.equal(byBpm['146-180+ BPM (Jungle / D&B / Fast)'].length, 1);

  // Group by Key
  const byKey = groupSamplesByKey(samples);
  assert.equal(byKey['C min'].length, 1);
  assert.equal(byKey['Eb maj'].length, 1);
  assert.equal(byKey['D min'].length, 1);
});
