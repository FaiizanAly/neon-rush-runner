(function () {
  "use strict";

  const root = window.NeonRush || {};

  class Game {
    constructor() {
      this.state = "boot";
      this.viewport = document.getElementById("gameViewport");
      this.audio = new root.GameAudio();
      this.ui = new root.UI({
        play: () => this.start(),
        pause: () => this.togglePause(),
        resume: () => this.resume(),
        restart: () => this.restart(),
        menu: () => this.quitToMenu(),
        settings: () => this.openSettings(),
        closeSettings: () => this.closeSettings(),
        toggleSound: () => this.toggleSound(),
        toggleQuality: () => this.toggleQuality(),
        fullscreen: () => this.fullscreen(),
        daily: () => this.claimDaily(),
        character: (name) => this.setCharacter(name)
      });

      this.tips = [
        "Charging rails...",
        "Syncing city lights...",
        "Spinning hoverboards...",
        "Tuning neon bass..."
      ];

      this.world = null;
      this.player = null;
      this.effects = null;
      this.controls = null;
      this.lastTime = performance.now();
      this.distance = 0;
      this.score = 0;
      this.coins = 0;
      this.combo = 0;
      this.multiplier = 1;
      this.powerupsCollected = 0;
      this.baseSpeed = 19;
      this.currentSpeed = this.baseSpeed;
      this.gameOverPending = false;
      this.resizeHandler = () => this.resize();
      window.addEventListener("resize", this.resizeHandler);
      this.boot();
    }

    boot() {
      if (!window.THREE) {
        this.ui.showLoading(100, "Three.js failed to load.");
        this.ui.toast("Three.js CDN is unavailable.");
        return;
      }

      let progress = 0;
      const interval = window.setInterval(() => {
        progress += 7 + Math.random() * 10;
        const tip = this.tips[Math.floor((progress / 100) * this.tips.length) % this.tips.length];
        this.ui.showLoading(Math.min(100, progress), tip);
        if (progress >= 100) {
          window.clearInterval(interval);
          this.initWorld();
          window.setTimeout(() => {
            this.state = "menu";
            this.ui.showMenu();
            this.loop(performance.now());
          }, 350);
        }
      }, 110);
    }

    initWorld() {
      this.world = new root.World(this.viewport);
      this.player = new root.Player(this.world.scene, this.world.lanes);
      this.effects = new root.EffectsManager(this.world.scene, this.world.camera);
      this.controls = new root.Controls(document.getElementById("gameRoot"), {
        left: () => this.playerAction("left"),
        right: () => this.playerAction("right"),
        jump: () => this.playerAction("jump"),
        slide: () => this.playerAction("slide"),
        pause: () => this.togglePause()
      });
      this.controls.setEnabled(false);
      this.world.setQuality(this.ui.qualityLow);
    }

    start() {
      if (!this.world) {
        return;
      }
      this.audio.init().then(() => this.audio.startMusic());
      this.resetRun();
      this.state = "playing";
      this.controls.setEnabled(true);
      this.ui.showHUD();
      this.ui.toast("Go");
    }

    resetRun() {
      this.distance = 0;
      this.score = 0;
      this.coins = 0;
      this.combo = 0;
      this.multiplier = 1;
      this.powerupsCollected = 0;
      this.baseSpeed = 19;
      this.currentSpeed = this.baseSpeed;
      this.gameOverPending = false;
      this.world.reset();
      this.player.reset();
      this.lastTime = performance.now();
    }

    restart() {
      this.audio.click();
      this.start();
    }

    quitToMenu() {
      this.audio.click();
      this.state = "menu";
      this.controls.setEnabled(false);
      this.audio.stopMusic();
      this.ui.showMenu();
    }

    togglePause() {
      if (this.state === "playing") {
        this.pause();
      } else if (this.state === "paused") {
        this.resume();
      }
    }

    pause() {
      this.audio.click();
      this.state = "paused";
      this.controls.setEnabled(false);
      this.ui.showPause();
    }

    resume() {
      this.audio.click();
      this.state = "playing";
      this.lastTime = performance.now();
      this.controls.setEnabled(true);
      this.ui.hidePause();
    }

    openSettings() {
      this.audio.click();
      this.ui.showSettings();
    }

    closeSettings() {
      this.audio.click();
      this.ui.closeSettings();
    }

    toggleSound() {
      const muted = this.audio.toggleMuted();
      this.ui.updateSoundState(muted);
      if (!muted && this.state === "playing") {
        this.audio.init().then(() => this.audio.startMusic());
      }
    }

    toggleQuality() {
      this.audio.click();
      const low = this.ui.toggleQualityState();
      if (this.world) {
        this.world.setQuality(low);
      }
    }

    fullscreen() {
      this.audio.click();
      const rootElement = document.documentElement;
      if (!document.fullscreenElement && rootElement.requestFullscreen) {
        rootElement.requestFullscreen().catch(() => {});
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    claimDaily() {
      this.audio.click();
      const amount = this.ui.claimDailyReward();
      if (amount) {
        this.ui.toast(`+${amount} coins`);
        this.audio.coin();
      }
    }

    setCharacter(name) {
      this.audio.click();
      if (this.player) {
        this.player.setCharacter(name);
      } else {
        try {
          localStorage.setItem("nr.character", name);
        } catch (error) {
          // Non-critical.
        }
      }
    }

    playerAction(action) {
      if (this.state !== "playing") {
        return;
      }

      let success = false;
      if (action === "left") {
        success = this.player.move(-1);
      } else if (action === "right") {
        success = this.player.move(1);
      } else if (action === "jump") {
        success = this.player.jump();
        if (success) {
          this.audio.jump();
        }
      } else if (action === "slide") {
        success = this.player.slide();
        if (success) {
          this.audio.slide();
        }
      }

      if (success && (action === "left" || action === "right")) {
        this.audio.playTone(280 + this.player.laneIndex * 90, 0.05, "triangle", 0.035);
      }
    }

    loop(now) {
      requestAnimationFrame((time) => this.loop(time));
      const rawDt = Math.min(0.045, (now - this.lastTime) / 1000 || 0);
      this.lastTime = now;
      const dt = this.state === "playing" ? this.timeScale(rawDt) : rawDt;

      if (this.state === "playing") {
        this.update(dt, rawDt);
      } else if (this.world) {
        this.effects.update(rawDt, 12, this.player ? this.player.group.position : null);
        this.world.render(this.effects, rawDt, this.player);
      }
    }

    timeScale(dt) {
      if (this.player && this.player.hasPowerup("slowmo")) {
        return dt * 0.58;
      }
      return dt;
    }

    update(dt, rawDt) {
      const speedRamp = Math.min(18, this.distance / 430);
      const boost = this.player.hasPowerup("boost") ? 9 : 0;
      this.currentSpeed = this.baseSpeed + speedRamp + boost;
      this.distance += this.currentSpeed * rawDt;
      this.multiplier = 1 + Math.min(8, Math.floor(this.combo / 12));
      this.score += (this.currentSpeed * rawDt * 9 + this.multiplier * 0.8) * this.multiplier;

      this.player.update(rawDt, this.currentSpeed, this.effects);
      const events = this.world.update(dt, this.currentSpeed, this.player, this.effects);
      this.effects.update(rawDt, this.currentSpeed, this.player.group.position.clone().add(new THREE.Vector3(0, 0.9, 0)));
      this.handleEvents(events);

      this.combo = Math.max(0, this.combo - rawDt * 1.8);
      this.ui.updateHUD({
        score: this.score,
        coins: this.coins,
        distance: this.distance,
        multiplier: this.multiplier,
        powerups: this.player.activePowerups,
        boosting: this.player.hasPowerup("boost")
      });

      this.world.render(this.effects, rawDt, this.player);
    }

    handleEvents(events) {
      for (let i = 0; i < events.length; i += 1) {
        const event = events[i];
        if (event.type === "coin") {
          const amount = this.player.hasPowerup("doubleCoins") ? 2 : 1;
          this.coins += amount;
          this.score += 25 * amount * this.multiplier;
          this.combo += 1.4 * amount;
          this.audio.coin();
          if (this.combo > 0 && Math.floor(this.combo) % 18 === 0) {
            this.ui.toast(`${Math.floor(this.combo)} combo`);
          }
        } else if (event.type === "powerup") {
          this.powerupsCollected += 1;
          this.combo += 5;
          this.score += 450 * this.multiplier;
          this.audio.powerup();
          this.ui.toast(event.label);
        } else if (event.type === "dodge") {
          this.combo += 0.8;
          this.score += 80 * this.multiplier;
        } else if (event.type === "blocked") {
          this.audio.shieldBreak();
          this.combo = Math.max(0, this.combo - 4);
          this.ui.toast(event.protection === "shield" ? "Shield saved" : "Board saved");
        } else if (event.type === "hit") {
          this.crash(event);
        }
      }
    }

    crash(event) {
      if (this.gameOverPending) {
        return;
      }
      this.gameOverPending = true;
      this.player.die();
      this.audio.crash();
      this.audio.stopMusic();
      this.effects.screenShake(0.8, 0.48);
      if (event.position) {
        this.effects.emitBurst(event.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 0xff5269, 34, 9);
      }
      window.setTimeout(() => this.gameOver(), 760);
    }

    gameOver() {
      if (this.state !== "playing") {
        return;
      }

      this.state = "gameover";
      this.controls.setEnabled(false);
      const finalScore = Math.floor(this.score);
      const previousBest = Number(this.read("nr.highScore") || 0);
      const best = Math.max(previousBest, finalScore);
      const totalCoins = Number(this.read("nr.totalCoins") || 0) + this.coins;
      this.write("nr.highScore", String(best));
      this.write("nr.totalCoins", String(totalCoins));

      const achievements = this.ui.recordRun({
        score: finalScore,
        coins: this.coins,
        distance: this.distance,
        powerups: this.powerupsCollected
      });

      this.ui.showGameOver({
        score: finalScore,
        coins: this.coins,
        best,
        distance: this.distance
      });

      if (finalScore > previousBest && finalScore > 0) {
        this.ui.toast("New best");
        this.audio.achievement();
      }

      achievements.forEach((achievement, index) => {
        window.setTimeout(() => {
          this.ui.toast(achievement.name);
          this.audio.achievement();
        }, 500 + index * 400);
      });
    }

    read(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    }

    write(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        // Non-critical.
      }
    }

    resize() {
      if (this.world) {
        this.world.resize();
      }
    }
  }

  window.addEventListener("load", () => {
    window.neonRushGame = new Game();
  });
})();
