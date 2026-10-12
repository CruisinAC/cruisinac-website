// Arcade menu sound effects, synthesised live with the Web Audio API: no audio files.
//
// Browsers only allow sound after the visitor has clicked, tapped or pressed a key on the
// page, so nothing here can play during the automatic boot intro. The first such input
// calls Sfx.unlock(); until then every sound call is silently skipped (rather than queued
// up and all fired at once when audio is finally allowed).
//
// Everything runs through one master volume (Sfx.setVolume, from the Effects slider in the
// site's Sound panel) and a short slapback echo, the "big cabinet in an arcade" sheen.
// Mute All in that panel silences it.
//
// The user plans to adjust or replace some of these sounds later; keep them all wired in.

const Sfx = (() => {
  let ctx = null;
  let master = null;
  let volume = 0.35; // replaced by setVolume before any sound plays
  let bus = null; // dry signal -> master
  let reverbIn = null; // send into the reverb (a big-hall tail)
  let echoIn = null; // send into the echo
  let noiseBuffer = null;

  const muted = () => {
    try { return window.sessionStorage.getItem('cruisinAcMuted') === '1'; } catch { return false; }
  };

  const build = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();

    // master: volume -> soft top-end roll-off -> limiter, so stacked sounds never clip
    master = ctx.createGain();
    master.gain.value = volume;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 7500;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 12;
    master.connect(tone).connect(limiter).connect(ctx.destination);

    bus = ctx.createGain();
    bus.connect(master);

    // slapback echo: 95 ms, a few darkening repeats
    echoIn = ctx.createGain();
    echoIn.gain.value = 0.32;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.095;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const darken = ctx.createBiquadFilter();
    darken.type = 'lowpass';
    darken.frequency.value = 2800;
    echoIn.connect(delay).connect(darken).connect(feedback).connect(delay);
    darken.connect(master);

    // reverb: a convolver fed a generated impulse, 2.2 s of stereo noise fading out, which
    // sounds like a large hall. Darkened so the tail sits behind the sound, not on top of it.
    const reverb = ctx.createConvolver();
    const length = Math.floor(ctx.sampleRate * 2.2);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    reverb.buffer = impulse;
    reverbIn = ctx.createGain();
    reverbIn.gain.value = 0.6;
    const reverbTone = ctx.createBiquadFilter();
    reverbTone.type = 'lowpass';
    reverbTone.frequency.value = 3200;
    reverbIn.connect(reverb).connect(reverbTone).connect(master);

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    return true;
  };

  // Called from the first click / tap / key press; creating or resuming the audio
  // context is only allowed inside such an input.
  // ---- Recorded sounds (assets/audio), for the Cruisin AC intro ----
  // Downloaded as soon as the page loads (no press needed for that), decoded once sound is
  // unlocked. They go through the same master volume as everything else, so the Effects
  // slider and Mute All apply.
  const SAMPLE_FILES = {
    surf: 'assets/audio/the-cries-of-seagulls-and-the-sound-of-the-surf.mp3',
    flicker: 'assets/audio/vadim_makes_sound-cyberpunk-neon-sign-flicker-and-electric-buzz-546577.mp3',
    crash: 'assets/audio/freesound_community-car-accident-with-squeal-and-crash-6054.mp3',
  };
  const sampleBytes = {}; // name -> Promise<ArrayBuffer | null>
  const sampleBuffers = {}; // name -> Promise<AudioBuffer | null>

  Object.entries(SAMPLE_FILES).forEach(([name, url]) => {
    sampleBytes[name] = fetch(url)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
  });

  const decodeSample = (name) => {
    if (!sampleBuffers[name]) {
      sampleBuffers[name] = sampleBytes[name].then((bytes) => (bytes && ctx
        ? ctx.decodeAudioData(bytes.slice(0)).catch(() => null)
        : null));
    }
    return sampleBuffers[name];
  };

  const unlock = () => {
    if (!ctx && !build()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    Object.keys(SAMPLE_FILES).forEach(decodeSample);
  };

  // Play a recorded sound now. Options: gain, fadeIn / fadeOut (seconds), duration (play only
  // this much of it, then fade out). Returns { stop(fadeSeconds) }. If the file is still
  // decoding it starts as soon as it is ready, skipped ahead by the time lost, so it stays
  // in step with the animation it belongs to.
  const playSample = (name, { gain = 1, fadeIn = 0.02, fadeOut = 0.15, duration = null } = {}) => {
    const requested = now();
    let source = null;
    let amp = null;
    let stopped = false;
    if (requested === null || !sampleBuffers[name]) return { stop() {} };

    sampleBuffers[name].then((buffer) => {
      if (!buffer || stopped || muted()) return;
      const t = ctx.currentTime + 0.005;
      const late = Math.max(0, t - requested);
      if (late >= buffer.duration) return;
      source = ctx.createBufferSource();
      source.buffer = buffer;
      amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + Math.max(0.005, fadeIn));
      source.connect(amp).connect(bus);
      source.start(t, late); // before any stop(): browsers reject stop() on an unstarted source
      if (duration !== null) {
        const end = t + Math.max(0.05, duration - late);
        amp.gain.setValueAtTime(gain, Math.max(t + fadeIn, end - fadeOut));
        amp.gain.exponentialRampToValueAtTime(0.0001, end);
        source.stop(end + 0.05);
      }
    });

    return {
      stop(fade = 0.5) {
        stopped = true;
        if (!source || !amp) return;
        const t = ctx.currentTime;
        amp.gain.cancelScheduledValues(t);
        amp.gain.setValueAtTime(Math.max(amp.gain.value, 0.0001), t);
        amp.gain.exponentialRampToValueAtTime(0.0001, t + fade);
        try { source.stop(t + fade + 0.05); } catch { /* already stopped */ }
      },
    };
  };

  // Start time for a sound, or null when sound is not available / muted.
  const now = () => (ctx && !muted() ? ctx.currentTime + 0.005 : null);

  // Attack, optional hold, exponential decay to silence by `end`.
  const envelope = (param, t, peak, attack, hold, end) => {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    if (hold > 0) param.setValueAtTime(peak, t + attack + hold);
    param.exponentialRampToValueAtTime(0.0001, end);
  };

  // One oscillator note. `to` glides the pitch; `out` replaces the default bus (e.g. a filter).
  const note = (t, {
    type = 'square', freq, to = null, glide = null, dur, gain = 0.12,
    attack = 0.003, hold = 0, detune = 0, echo = false, reverb = false, out = null,
  }) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + (glide ?? dur));
    const amp = ctx.createGain();
    envelope(amp.gain, t, gain, attack, hold, t + dur);
    osc.connect(amp).connect(out || bus);
    if (echo) amp.connect(echoIn);
    if (reverb) amp.connect(reverbIn);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    return osc;
  };

  // Filtered white noise: hiss, whooshes, impacts.
  const noise = (t, {
    dur, gain = 0.1, filter = 'bandpass', freq = 1000, to = null, q = 1,
    attack = 0.003, hold = 0, echo = false, reverb = false, out = null,
  }) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const shape = ctx.createBiquadFilter();
    shape.type = filter;
    shape.Q.value = q;
    shape.frequency.setValueAtTime(freq, t);
    if (to) shape.frequency.exponentialRampToValueAtTime(to, t + dur);
    const amp = ctx.createGain();
    envelope(amp.gain, t, gain, attack, hold, t + dur);
    src.connect(shape).connect(amp).connect(out || bus);
    if (echo) amp.connect(echoIn);
    if (reverb) amp.connect(reverbIn);
    src.start(t);
    src.stop(t + dur + 0.05);
  };

  // A lowpass whose cutoff falls from `from` to `to`: the "brass stab" filter sweep.
  const sweepFilter = (t, from, to, dur, q = 4) => {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.connect(bus);
    f.connect(echoIn);
    return f;
  };

  const sounds = {
    // Cursor moved: a short two-layer blip, a touch higher going up than going down.
    move(direction = 1) {
      const t = now(); if (t === null) return;
      const f = direction < 0 ? 1568 : 1319;
      note(t, { type: 'square', freq: f, dur: 0.055, gain: 0.07, echo: true });
      note(t, { type: 'triangle', freq: f / 2, dur: 0.06, gain: 0.12 });
    },

    // Small control flicked (tabs, Score/Time, pager, car filter).
    tick() {
      const t = now(); if (t === null) return;
      note(t, { type: 'triangle', freq: 2093, to: 1760, dur: 0.035, gain: 0.12 });
      noise(t, { dur: 0.02, gain: 0.05, filter: 'highpass', freq: 6000 });
    },

    // Confirm: a fast rising E major arpeggio that rings out.
    select() {
      const t = now(); if (t === null) return;
      [659.25, 830.61, 987.77].forEach((f, i) => {
        note(t + i * 0.042, { type: 'square', freq: f, dur: 0.07, gain: 0.08, echo: true });
      });
      const last = t + 3 * 0.042;
      note(last, { type: 'square', freq: 1318.51, dur: 0.32, hold: 0.04, gain: 0.08, echo: true });
      note(last, { type: 'triangle', freq: 659.25, dur: 0.3, hold: 0.04, gain: 0.14 });
    },

    // Back out: two notes falling, softer than confirm.
    back() {
      const t = now(); if (t === null) return;
      note(t, { type: 'square', freq: 987.77, dur: 0.06, gain: 0.07 });
      note(t + 0.06, { type: 'square', freq: 659.25, to: 622.25, dur: 0.14, gain: 0.07, echo: true });
      note(t + 0.06, { type: 'triangle', freq: 329.63, dur: 0.14, gain: 0.1 });
    },

    // Not allowed (offline level, Options): a low double buzz.
    denied() {
      const t = now(); if (t === null) return;
      [0, 0.11].forEach((offset) => {
        note(t + offset, { type: 'square', freq: 110, dur: 0.085, hold: 0.04, gain: 0.09 });
        note(t + offset, { type: 'sawtooth', freq: 116.5, dur: 0.085, hold: 0.04, gain: 0.06 });
      });
    },

    // Coin dropping into the cabinet: two quick notes. Played on the landing screen's
    // PRESS ENTER TO START.
    coin() {
      const t = now(); if (t === null) return;
      note(t, { type: 'square', freq: 987.77, dur: 0.07, hold: 0.05, gain: 0.08 });
      note(t + 0.07, { type: 'square', freq: 1318.51, dur: 0.4, hold: 0.06, gain: 0.08, echo: true });
    },

    // The coin, then a whoosh rising underneath and a big synth-brass stab. Not used at the
    // moment (the landing screen plays just the coin); kept for later.
    start() {
      const t = now(); if (t === null) return;
      // coin
      note(t, { type: 'square', freq: 987.77, dur: 0.07, hold: 0.05, gain: 0.08 });
      note(t + 0.07, { type: 'square', freq: 1318.51, dur: 0.4, hold: 0.06, gain: 0.08, echo: true });
      // riser
      noise(t + 0.08, { dur: 0.55, gain: 0.12, freq: 300, to: 4200, q: 1.4, attack: 0.4 });
      note(t + 0.08, { type: 'sawtooth', freq: 196, to: 784, dur: 0.52, gain: 0.04, attack: 0.4 });
      // stab: A major spread wide, two slightly detuned saws per note, filter swept closed
      const hit = t + 0.6;
      const stab = sweepFilter(hit, 6000, 700, 1.1, 3);
      [220, 277.18, 329.63, 440, 554.37, 659.25].forEach((f) => {
        note(hit, { type: 'sawtooth', freq: f, dur: 1.1, hold: 0.08, gain: 0.035, detune: -8, out: stab });
        note(hit, { type: 'sawtooth', freq: f, dur: 1.1, hold: 0.08, gain: 0.035, detune: 8, out: stab });
      });
      // sub drop + crash of noise under the stab
      note(hit, { type: 'sine', freq: 110, to: 45, dur: 0.5, gain: 0.35 });
      noise(hit, { dur: 0.6, gain: 0.07, filter: 'highpass', freq: 5000, echo: true });
    },

    // A thud and a dusty crack ringing out in the reverb. Not played: it was the title logo
    // landing sound until the music start was moved to the logo, which now does that job.
    thump() {
      const t = now(); if (t === null) return;
      // deep drop (mostly felt; small speakers barely play it)
      note(t, { type: 'sine', freq: 150, to: 38, dur: 0.38, gain: 0.45, reverb: true });
      // knock: the audible body of the hit, in the range every speaker plays
      note(t, { type: 'triangle', freq: 320, to: 90, dur: 0.14, gain: 0.3, attack: 0.001, reverb: true });
      noise(t, { dur: 0.18, gain: 0.22, filter: 'lowpass', freq: 1800, to: 300, reverb: true });
      noise(t, { dur: 0.08, gain: 0.06, filter: 'highpass', freq: 4000, reverb: true });
    },

  };

  // 0-1, applied smoothly so dragging the slider does not click.
  const setVolume = (value) => {
    volume = value;
    if (master) master.gain.setTargetAtTime(Math.max(value, 0.0001), ctx.currentTime, 0.02);
  };

  return { unlock, setVolume, playSample, ...sounds };
})();
