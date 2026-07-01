(function () {
  "use strict";

  const root = (window.NeonRush = window.NeonRush || {});

  class GameAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.musicTimer = null;
      this.musicStep = 0;
      this.muted = this.readMuted();
      this.ready = false;
    }

    readMuted() {
      try {
        return localStorage.getItem("nr.muted") === "1";
      } catch (error) {
        return false;
      }
    }

    init() {
      if (this.ready || this.muted) {
        return Promise.resolve();
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        return Promise.resolve();
      }

      this.context = this.context || new AudioContext();
      if (this.context.state === "suspended") {
        return this.context.resume().then(() => this.createGraph());
      }

      this.createGraph();
      return Promise.resolve();
    }

    createGraph() {
      if (this.ready || !this.context) {
        return;
      }

      this.master = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 0.78;
      this.musicGain.gain.value = 0.23;
      this.sfxGain.gain.value = 0.72;
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.master.connect(this.context.destination);
      this.ready = true;
    }

    setMuted(isMuted) {
      this.muted = Boolean(isMuted);
      try {
        localStorage.setItem("nr.muted", this.muted ? "1" : "0");
      } catch (error) {
        // Storage can fail in private contexts; audio still works.
      }

      if (!this.context || !this.master) {
        return;
      }

      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.78, this.context.currentTime, 0.03);
      if (this.muted) {
        this.stopMusic();
      }
    }

    toggleMuted() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    startMusic() {
      if (this.muted) {
        return;
      }

      this.init();
      if (!this.context || this.musicTimer) {
        return;
      }

      const notes = [110, 146.8, 164.8, 196, 220, 196, 164.8, 146.8];
      this.musicStep = 0;
      this.musicTimer = window.setInterval(() => {
        if (this.muted || !this.context) {
          return;
        }

        const now = this.context.currentTime;
        const bass = notes[this.musicStep % notes.length];
        const lead = notes[(this.musicStep + 3) % notes.length] * 2;
        this.playTone(bass, 0.13, "sawtooth", 0.05, this.musicGain, now);
        if (this.musicStep % 2 === 0) {
          this.playTone(lead, 0.08, "triangle", 0.035, this.musicGain, now + 0.04);
        }
        this.musicStep += 1;
      }, 255);
    }

    stopMusic() {
      if (this.musicTimer) {
        window.clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    }

    playTone(frequency, duration, type, volume, target, startTime) {
      if (this.muted) {
        return;
      }

      this.init();
      if (!this.context || !this.ready) {
        return;
      }

      const ctx = this.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = startTime || ctx.currentTime;
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume || 0.08), t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(target || this.sfxGain);
      osc.start(t);
      osc.stop(t + duration + 0.025);
    }

    playNoise(duration, volume, filterFrequency) {
      if (this.muted) {
        return;
      }

      this.init();
      if (!this.context || !this.ready) {
        return;
      }

      const ctx = this.context;
      const size = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < size; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = filterFrequency || 680;
      gain.gain.setValueAtTime(volume || 0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      source.start();
    }

    click() {
      this.playTone(520, 0.045, "triangle", 0.05);
    }

    coin() {
      this.playTone(880, 0.06, "sine", 0.08);
      this.playTone(1320, 0.08, "sine", 0.05, this.sfxGain, this.context ? this.context.currentTime + 0.045 : undefined);
    }

    jump() {
      this.playTone(340, 0.08, "triangle", 0.08);
      this.playTone(540, 0.11, "triangle", 0.05, this.sfxGain, this.context ? this.context.currentTime + 0.035 : undefined);
    }

    slide() {
      this.playNoise(0.16, 0.11, 420);
    }

    crash() {
      this.playNoise(0.32, 0.24, 180);
      this.playTone(86, 0.22, "sawtooth", 0.18);
    }

    powerup() {
      this.playTone(660, 0.09, "square", 0.07);
      this.playTone(990, 0.12, "triangle", 0.08, this.sfxGain, this.context ? this.context.currentTime + 0.06 : undefined);
    }

    shieldBreak() {
      this.playNoise(0.18, 0.15, 1200);
      this.playTone(260, 0.12, "sawtooth", 0.08);
    }

    achievement() {
      this.playTone(740, 0.1, "triangle", 0.07);
      this.playTone(1110, 0.13, "triangle", 0.07, this.sfxGain, this.context ? this.context.currentTime + 0.08 : undefined);
      this.playTone(1480, 0.16, "sine", 0.06, this.sfxGain, this.context ? this.context.currentTime + 0.16 : undefined);
    }
  }

  root.GameAudio = GameAudio;
})();
