import { MidiMapping } from '../types/sample';

type MidiListener = (data: { type: 'note' | 'cc'; channel: number; noteOrCc: number; value: number }) => void;

class MidiService {
  public isSupported: boolean = false;
  public isConnected: boolean = false;
  public deviceNames: string[] = [];
  public learningAction: string | null = null;
  public mappings: MidiMapping[] = [
    { action: 'audition', label: 'Play / Stop Audition', midiType: 'note', channel: 1, noteOrCc: 60 },
    { action: 'tempo_sync', label: 'Toggle Tempo Sync', midiType: 'note', channel: 1, noteOrCc: 62 },
    { action: 'volume', label: 'Master Volume', midiType: 'cc', channel: 1, noteOrCc: 7 },
    { action: 'filter', label: 'Filter Cutoff', midiType: 'cc', channel: 1, noteOrCc: 74 },
    { action: 'pitch', label: 'Pitch Transpose', midiType: 'cc', channel: 1, noteOrCc: 1 },
    { action: 'prev_sample', label: 'Previous Sample', midiType: 'note', channel: 1, noteOrCc: 58 },
    { action: 'next_sample', label: 'Next Sample', midiType: 'note', channel: 1, noteOrCc: 59 },
    { action: 'trigger_pad_1', label: 'Pad 1 (Kick/Sample)', midiType: 'note', channel: 1, noteOrCc: 36 },
    { action: 'trigger_pad_2', label: 'Pad 2 (Snare)', midiType: 'note', channel: 1, noteOrCc: 38 },
    { action: 'trigger_pad_3', label: 'Pad 3 (Hi-Hat)', midiType: 'note', channel: 1, noteOrCc: 42 },
    { action: 'trigger_pad_4', label: 'Pad 4 (Chop/Lead)', midiType: 'note', channel: 1, noteOrCc: 46 },
  ];

  private listeners: Set<MidiListener> = new Set();
  private stateChangeListeners: Set<() => void> = new Set();

  constructor() {
    this.loadMappings();
    this.initMidi();
  }

  private loadMappings() {
    try {
      const saved = localStorage.getItem('sample_stakz_midi_mappings');
      if (saved) {
        this.mappings = JSON.parse(saved);
      }
    } catch {
      // ignore
    }
  }

  public saveMappings() {
    try {
      localStorage.setItem('sample_stakz_midi_mappings', JSON.stringify(this.mappings));
    } catch {
      // ignore
    }
    this.notifyState();
  }

  public subscribe(fn: MidiListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public onStateChange(fn: () => void): () => void {
    this.stateChangeListeners.add(fn);
    return () => this.stateChangeListeners.delete(fn);
  }

  private notifyState() {
    this.stateChangeListeners.forEach((fn) => fn());
  }

  public async initMidi() {
    if (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator) {
      this.isSupported = true;
      try {
        const nav = navigator as unknown as {
          requestMIDIAccess: () => Promise<{
            inputs: Map<string, { name?: string; onmidimessage: ((msg: { data?: Uint8Array | number[] }) => void) | null }>;
            onstatechange: ((e: unknown) => void) | null;
          }>;
        };
        const midiAccess = await nav.requestMIDIAccess();
        this.deviceNames = [];
        
        if (midiAccess && midiAccess.inputs) {
          midiAccess.inputs.forEach((input: { name?: string; onmidimessage: ((msg: { data?: Uint8Array | number[] }) => void) | null }) => {
            if (input.name) this.deviceNames.push(input.name);
            input.onmidimessage = (msg: { data?: Uint8Array | number[] }) => this.handleMidiMessage(msg);
          });
        }

        this.isConnected = this.deviceNames.length > 0;
        this.notifyState();

        midiAccess.onstatechange = () => {
          this.deviceNames = [];
          if (midiAccess.inputs) {
            midiAccess.inputs.forEach((inp: { name?: string }) => {
              if (inp.name) this.deviceNames.push(inp.name);
            });
          }
          this.isConnected = this.deviceNames.length > 0;
          this.notifyState();
        };
      } catch {
        // MIDI access denied or unavailable in sandbox
        this.isConnected = false;
        this.notifyState();
      }
    } else {
      this.isSupported = false;
      this.notifyState();
    }
  }

  private handleMidiMessage(event: { data?: Uint8Array | number[] }) {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const byte1 = data[1];
    const byte2 = data[2];

    const command = status >> 4;
    const channel = (status & 0xf) + 1;

    let midiType: 'note' | 'cc' | null = null;
    let value = byte2;

    if (command === 9 && byte2 > 0) {
      midiType = 'note';
    } else if (command === 8 || (command === 9 && byte2 === 0)) {
      midiType = 'note';
      value = 0; // note off
    } else if (command === 11) {
      midiType = 'cc';
    }

    if (!midiType) return;

    // If learning, bind to current learning action
    if (this.learningAction && value > 0) {
      const existing = this.mappings.find((m) => m.action === this.learningAction);
      if (existing) {
        existing.midiType = midiType;
        existing.channel = channel;
        existing.noteOrCc = byte1;
      }
      this.learningAction = null;
      this.saveMappings();
      return;
    }

    // Broadcast to listeners
    this.listeners.forEach((listener) => {
      listener({ type: midiType!, channel, noteOrCc: byte1, value });
    });
  }

  /**
   * Simulate a virtual hardware MIDI trigger (e.g. from UI pad or computer keyboard)
   */
  public triggerVirtualEvent(type: 'note' | 'cc', noteOrCc: number, value: number, channel = 1) {
    if (this.learningAction && value > 0) {
      const existing = this.mappings.find((m) => m.action === this.learningAction);
      if (existing) {
        existing.midiType = type;
        existing.channel = channel;
        existing.noteOrCc = noteOrCc;
      }
      this.learningAction = null;
      this.saveMappings();
      return;
    }

    this.listeners.forEach((listener) => {
      listener({ type, channel, noteOrCc, value });
    });
  }

  public startLearn(actionName: string) {
    this.learningAction = actionName;
    this.notifyState();
  }

  public cancelLearn() {
    this.learningAction = null;
    this.notifyState();
  }
}

export const midiService = new MidiService();
