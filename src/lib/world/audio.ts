/**
 * Generated ambience, no audio files: a slow gliding pad, soft wind, the odd
 * pentatonic pluck through a delay, and short UI blips. The AudioContext is
 * only created from a user gesture (browser autoplay rules).
 */
export type Sound = {
  readonly on: boolean;
  setOn: (on: boolean) => void;
  blip: (kind: 'hover' | 'open' | 'close') => void;
  thunder: (strength: number) => void;
  screech: () => void;
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
// A minor colours: Am(add9), Fmaj7, G6/9, Em7
const CHORDS = [
  [45, 52, 59, 60],
  [41, 48, 57, 64],
  [43, 50, 57, 62],
  [40, 47, 55, 62],
];
const PLUCK = [69, 72, 74, 76, 79, 81];

export function createSound(): Sound {
  let ctx: AudioContext | null = null;
  let master: GainNode;
  let fx: GainNode;
  let voices: OscillatorNode[][] = [];
  let noiseBuf: AudioBuffer;
  let chordTimer = 0;
  let pluckTimer = 0;
  let on = false;

  function init() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);

    // Shared echo for plucks and blips
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.38;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    fx = ctx.createGain();
    fx.connect(master);
    fx.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(master);

    // Pad: four voices (triangle + detuned sine) that glide between chords
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 320;
    lfo.connect(lfoAmt).connect(filter.frequency);
    lfo.start();
    const pad = ctx.createGain();
    pad.gain.value = 0.09;
    filter.connect(pad).connect(master);
    voices = CHORDS[0].map((m) =>
      (['triangle', 'sine'] as const).map((type, i) => {
        const o = ctx!.createOscillator();
        o.type = type;
        o.frequency.value = hz(m);
        o.detune.value = i ? 7 : -5;
        o.connect(filter);
        o.start();
        return o;
      })
    );

    // Wind: looped noise through a wandering band-pass
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 520;
    band.Q.value = 0.7;
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.08;
    const gustAmt = ctx.createGain();
    gustAmt.gain.value = 260;
    gust.connect(gustAmt).connect(band.frequency);
    gust.start();
    const wind = ctx.createGain();
    wind.gain.value = 0.035;
    noise.connect(band).connect(wind).connect(master);
    noise.start();
  }

  function tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = 'sine') {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(fx);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  function schedule() {
    let chord = 0;
    chordTimer = window.setInterval(() => {
      if (!ctx) return;
      chord = (chord + 1) % CHORDS.length;
      CHORDS[chord].forEach((m, i) => voices[i].forEach((o) => o.frequency.setTargetAtTime(hz(m), ctx!.currentTime, 1.2)));
    }, 9000);
    const pluck = () => {
      if (ctx) tone(hz(PLUCK[Math.floor(Math.random() * PLUCK.length)]), ctx.currentTime, 2.2, 0.05);
      pluckTimer = window.setTimeout(pluck, 3000 + Math.random() * 4000);
    };
    pluckTimer = window.setTimeout(pluck, 2000);
  }

  return {
    get on() {
      return on;
    },
    setOn(next) {
      if (next === on) return;
      on = next;
      if (on) {
        if (!ctx) init();
        void ctx!.resume();
        master.gain.setTargetAtTime(0.55, ctx!.currentTime, 0.6);
        schedule();
      } else if (ctx) {
        clearInterval(chordTimer);
        clearTimeout(pluckTimer);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        const c = ctx;
        window.setTimeout(() => !on && void c.suspend(), 900);
      }
    },
    /** Distant rumble: low-passed noise swelling in and rolling off over a few seconds */
    thunder(strength) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      src.playbackRate.value = 0.5;
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.setValueAtTime(260, t);
      low.frequency.exponentialRampToValueAtTime(90, t + 4);
      const g = ctx.createGain();
      const peak = 0.5 * strength;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.25);
      g.gain.setTargetAtTime(peak * 0.55, t + 0.6, 0.4);
      g.gain.setTargetAtTime(0.0001, t + 1.6, 1.1);
      src.connect(low).connect(g).connect(master);
      src.start(t);
      src.stop(t + 6);
    },
    /** Phoenix cry: a gliding, rasped tone with a breathy hiss, rising then falling */
    screech() {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(2300, t + 0.18);
      o.frequency.exponentialRampToValueAtTime(1100, t + 0.75);
      const vib = ctx.createOscillator();
      vib.frequency.value = 28;
      const vibAmt = ctx.createGain();
      vibAmt.gain.value = 70;
      vib.connect(vibAmt).connect(o.frequency);
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2000;
      band.Q.value = 1.4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      o.connect(band).connect(g).connect(fx);
      // Breath: high-passed noise riding along
      const n = ctx.createBufferSource();
      n.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3000;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.05, t + 0.04);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      n.connect(hp).connect(ng).connect(fx);
      [o, vib, n].forEach((s) => (s.start(t), s.stop(t + 0.9)));
    },
    blip(kind) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      if (kind === 'hover') tone(1320, t, 0.09, 0.035, 'triangle');
      else if (kind === 'open') (tone(660, t, 0.25, 0.06, 'triangle'), tone(990, t + 0.07, 0.35, 0.05, 'triangle'));
      else (tone(990, t, 0.2, 0.05, 'triangle'), tone(660, t + 0.06, 0.3, 0.045, 'triangle'));
    },
  };
}
