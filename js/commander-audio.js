/* RIFTBOUND — COMMANDER ABILITY SOUND DESIGN
   Six original, synthesised ability cues. No external audio files required.
   Audio is created only after a player activates an ability (browser gesture).
*/
(() => {
  "use strict";
  let audioContext = null;
  let master = null;

  function getAudio() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioContext) {
      audioContext = new AudioCtor();
      master = audioContext.createGain();
      master.gain.value = 0.72;
      master.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    return audioContext;
  }

  function voice(ctx, { wave = "sine", start = 0, end = 0.1, from = 440, to = from, gain = 0.12, attack = 0.015, release = 0.2, filter = 9000, pan = 0 } = {}) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const low = ctx.createBiquadFilter();
    const stereo = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const t = ctx.currentTime + start;
    osc.type = wave;
    osc.frequency.setValueAtTime(Math.max(20, from), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + Math.max(0.025, end));
    low.type = "lowpass";
    low.frequency.setValueAtTime(filter, t);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + end + release);
    osc.connect(low); low.connect(amp);
    if (stereo) { stereo.pan.value = pan; amp.connect(stereo); stereo.connect(master); }
    else amp.connect(master);
    osc.start(t); osc.stop(t + end + release + 0.03);
  }

  function noise(ctx, { start = 0, duration = 0.2, gain = 0.1, low = 180, high = 5000, pan = 0 } = {}) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const fade = Math.pow(1 - i / length, 2);
      data[i] = (Math.random() * 2 - 1) * fade;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    const stereo = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const t = ctx.currentTime + start;
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime((low + high) / 2, t);
    filter.Q.value = 0.65;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter); filter.connect(amp);
    if (stereo) { stereo.pan.value = pan; amp.connect(stereo); stereo.connect(master); }
    else amp.connect(master);
    source.start(t);
  }

  const cues = {
    warden(ctx) {
      voice(ctx, { wave: "sawtooth", from: 95, to: 310, end: .48, gain: .16, filter: 1100, release: .45 });
      voice(ctx, { wave: "sine", start: .08, from: 220, to: 660, end: .7, gain: .13, release: .65 });
      voice(ctx, { wave: "triangle", start: .12, from: 880, to: 440, end: .5, gain: .07, release: .8 });
      [0, .13, .26, .39].forEach((t, i) => voice(ctx, { wave: "sine", start: t, from: 1250 + i * 180, to: 720 + i * 90, end: .16, gain: .045, release: .25 }));
      noise(ctx, { start: .03, duration: .55, gain: .09, low: 350, high: 1800 });
    },
    arcanist(ctx) {
      voice(ctx, { wave: "sine", from: 1200, to: 85, end: .62, gain: .16, release: .55, filter: 4200 });
      voice(ctx, { wave: "triangle", start: .05, from: 260, to: 1450, end: .38, gain: .11, release: .45 });
      voice(ctx, { wave: "sine", start: .2, from: 1800, to: 420, end: .52, gain: .09, release: .55 });
      noise(ctx, { start: .14, duration: .36, gain: .12, low: 900, high: 6200 });
      [0, .11, .22].forEach((t, i) => voice(ctx, { wave: "square", start: t, from: 1600 - i * 230, to: 500 + i * 80, end: .07, gain: .025, release: .12, filter: 3000 }));
    },
    huntmaster(ctx) {
      voice(ctx, { wave: "triangle", from: 520, to: 1120, end: .19, gain: .11, release: .3 });
      voice(ctx, { wave: "sine", start: .1, from: 1480, to: 980, end: .26, gain: .08, release: .4 });
      voice(ctx, { wave: "sawtooth", start: .17, from: 190, to: 72, end: .22, gain: .1, release: .22, filter: 750 });
      noise(ctx, { start: .13, duration: .16, gain: .12, low: 1800, high: 7000 });
      voice(ctx, { wave: "sine", start: .32, from: 880, to: 1320, end: .16, gain: .045, release: .25 });
    },
    treasurer(ctx) {
      voice(ctx, { wave: "sine", from: 420, to: 840, end: .2, gain: .11, release: .35 });
      [0, .09, .18, .27, .36].forEach((t, i) => voice(ctx, { wave: "triangle", start: t, from: 980 + i * 170, to: 1480 + i * 110, end: .11, gain: .055, release: .28, pan: (i - 2) * .22 }));
      voice(ctx, { wave: "sine", start: .2, from: 660, to: 1760, end: .42, gain: .08, release: .55 });
      noise(ctx, { start: .06, duration: .28, gain: .045, low: 2500, high: 8500 });
    },
    pyromancer(ctx) {
      noise(ctx, { start: 0, duration: .78, gain: .2, low: 90, high: 1800 });
      voice(ctx, { wave: "sawtooth", from: 72, to: 38, end: .56, gain: .2, release: .5, filter: 420 });
      voice(ctx, { wave: "sawtooth", start: .04, from: 180, to: 920, end: .34, gain: .12, release: .38, filter: 1700 });
      voice(ctx, { wave: "triangle", start: .18, from: 1100, to: 240, end: .45, gain: .07, release: .5 });
      [0, .16, .32].forEach((t, i) => noise(ctx, { start: t, duration: .18, gain: .065, low: 1200 + i * 300, high: 4800 }));
    },
    necromancer(ctx) {
      voice(ctx, { wave: "sine", from: 72, to: 210, end: .72, gain: .15, release: .65, filter: 900 });
      voice(ctx, { wave: "triangle", start: .12, from: 440, to: 110, end: .8, gain: .12, release: .7 });
      voice(ctx, { wave: "sine", start: .2, from: 880, to: 330, end: .72, gain: .075, release: .8 });
      [0, .19, .38].forEach((t, i) => {
        voice(ctx, { wave: "sine", start: t, from: 720 + i * 180, to: 240 + i * 40, end: .34, gain: .055, release: .42, pan: (i - 1) * .48 });
        noise(ctx, { start: t + .05, duration: .25, gain: .035, low: 500, high: 2200, pan: (i - 1) * .5 });
      });
    }
  };

  window.riftboundPlayCommanderSfx = function (commanderId) {
    const ctx = getAudio();
    const cue = cues[commanderId];
    if (!ctx || !cue) return;
    const settings = window.riftboundSettings || {};
    const volume = Math.max(0, Math.min(1, (Number(settings.masterVolume ?? 100) / 100) * (Number(settings.sfxVolume ?? 80) / 100)));
    master.gain.setTargetAtTime(volume * 0.72, ctx.currentTime, 0.025);
    cue(ctx);
  };
})();
