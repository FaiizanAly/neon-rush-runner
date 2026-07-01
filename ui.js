(function () {
  "use strict";

  const root = (window.NeonRush = window.NeonRush || {});

  const ACHIEVEMENTS = [
    { id: "first_run", name: "First Run", test: (stats) => stats.runs >= 1 },
    { id: "coin_50", name: "Coin Spark", test: (stats) => stats.bestCoins >= 50 },
    { id: "distance_1000", name: "Kilometer Club", test: (stats) => stats.bestDistance >= 1000 },
    { id: "power_6", name: "Charged", test: (stats) => stats.bestPowerups >= 6 },
    { id: "score_25000", name: "Neon Legend", test: (stats) => stats.bestScore >= 25000 }
  ];

  class UI {
    constructor(handlers) {
      this.handlers = handlers || {};
      this.elements = this.collectElements();
      this.achievementState = this.readJSON("nr.achievements", {});
      this.runStats = this.readJSON("nr.runStats", {
        runs: 0,
        bestCoins: 0,
        bestDistance: 0,
        bestPowerups: 0,
        bestScore: 0
      });
      this.qualityLow = this.read("nr.quality") === "low";
      this.bind();
      this.renderAchievements();
      this.updateMenu();
      this.updateSoundState(this.read("nr.muted") === "1");
      this.updateQualityState();
    }

    collectElements() {
      const ids = [
        "loadingScreen", "loadingProgress", "loadingPercent", "loadingTip",
        "mainMenu", "settingsPanel", "hud", "scoreValue", "coinValue",
        "distanceValue", "multiplierValue", "powerupBar", "pauseMenu",
        "gameOverScreen", "finalScore", "finalCoins", "finalBest",
        "finalDistance", "menuBest", "menuBank", "toastStack", "dailyReward",
        "dailyRewardText", "claimDailyBtn", "achievementList", "soundState",
        "qualityState", "speedOverlay"
      ];
      return ids.reduce((map, id) => {
        map[id] = document.getElementById(id);
        return map;
      }, {});
    }

    bind() {
      this.bindButton("playBtn", "play");
      this.bindButton("pauseBtn", "pause");
      this.bindButton("resumeBtn", "resume");
      this.bindButton("restartBtn", "restart");
      this.bindButton("restartPauseBtn", "restart");
      this.bindButton("menuBtn", "menu");
      this.bindButton("quitPauseBtn", "menu");
      this.bindButton("settingsBtn", "settings");
      this.bindButton("closeSettingsBtn", "closeSettings");
      this.bindButton("soundToggleBtn", "toggleSound");
      this.bindButton("qualityToggleBtn", "toggleQuality");
      this.bindButton("fullscreenBtn", "fullscreen");
      this.bindButton("claimDailyBtn", "daily");

      document.querySelectorAll(".avatar-button").forEach((button) => {
        button.addEventListener("click", () => {
          document.querySelectorAll(".avatar-button").forEach((item) => item.classList.remove("is-selected"));
          button.classList.add("is-selected");
          this.emit("character", button.dataset.character);
        });
      });

      const selected = this.read("nr.character") || "pulse";
      document.querySelectorAll(".avatar-button").forEach((button) => {
        button.classList.toggle("is-selected", button.dataset.character === selected);
      });
    }

    bindButton(id, eventName) {
      const element = document.getElementById(id);
      if (!element) {
        return;
      }
      element.addEventListener("click", () => this.emit(eventName));
    }

    emit(name, payload) {
      const handler = this.handlers[name];
      if (typeof handler === "function") {
        handler(payload);
      }
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
        // Game continues without persistence.
      }
    }

    readJSON(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch (error) {
        return fallback;
      }
    }

    writeJSON(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // Non-critical.
      }
    }

    showOnly(screen) {
      ["loadingScreen", "mainMenu", "settingsPanel", "pauseMenu", "gameOverScreen"].forEach((id) => {
        this.elements[id].classList.toggle("is-active", id === screen);
      });
      this.elements.hud.classList.toggle("is-active", screen === null);
    }

    showLoading(progress, tip) {
      this.showOnly("loadingScreen");
      this.elements.loadingProgress.style.width = `${Math.round(progress)}%`;
      this.elements.loadingPercent.textContent = `${Math.round(progress)}%`;
      if (tip) {
        this.elements.loadingTip.textContent = tip;
      }
    }

    showMenu() {
      this.showOnly("mainMenu");
      this.updateMenu();
      this.checkDailyReward();
    }

    showSettings() {
      this.elements.settingsPanel.classList.add("is-active");
    }

    closeSettings() {
      this.elements.settingsPanel.classList.remove("is-active");
    }

    showHUD() {
      this.showOnly(null);
    }

    showPause() {
      this.elements.pauseMenu.classList.add("is-active");
      this.elements.hud.classList.remove("is-active");
    }

    hidePause() {
      this.elements.pauseMenu.classList.remove("is-active");
      this.elements.hud.classList.add("is-active");
    }

    showGameOver(result) {
      this.elements.finalScore.textContent = this.formatNumber(result.score);
      this.elements.finalCoins.textContent = this.formatNumber(result.coins);
      this.elements.finalBest.textContent = this.formatNumber(result.best);
      this.elements.finalDistance.textContent = `${Math.floor(result.distance)} m`;
      this.showOnly("gameOverScreen");
    }

    updateHUD(stats) {
      this.elements.scoreValue.textContent = this.formatNumber(stats.score);
      this.elements.coinValue.textContent = this.formatNumber(stats.coins);
      this.elements.distanceValue.textContent = `${Math.floor(stats.distance)} m`;
      this.elements.multiplierValue.textContent = stats.multiplier;
      this.renderPowerups(stats.powerups || {});
      this.elements.speedOverlay.classList.toggle("is-active", stats.boosting);
    }

    renderPowerups(powerups) {
      const active = Object.keys(powerups).filter((key) => powerups[key] > 0);
      this.elements.powerupBar.innerHTML = "";
      active.forEach((key) => {
        const data = root.POWERUPS[key] || { label: key, color: 0x27f4ff };
        const chip = document.createElement("div");
        chip.className = "power-chip";
        chip.style.setProperty("--power-color", `#${data.color.toString(16).padStart(6, "0")}`);
        chip.innerHTML = `<span>${data.label}</span><strong>${Math.ceil(powerups[key])}</strong>`;
        this.elements.powerupBar.appendChild(chip);
      });
    }

    updateMenu() {
      const best = Number(this.read("nr.highScore") || 0);
      const bank = Number(this.read("nr.totalCoins") || 0);
      this.elements.menuBest.textContent = this.formatNumber(best);
      this.elements.menuBank.textContent = this.formatNumber(bank);
      this.renderAchievements();
      this.checkDailyReward();
    }

    updateSoundState(muted) {
      this.elements.soundState.textContent = muted ? "Off" : "On";
    }

    toggleQualityState() {
      this.qualityLow = !this.qualityLow;
      this.write("nr.quality", this.qualityLow ? "low" : "high");
      this.updateQualityState();
      return this.qualityLow;
    }

    updateQualityState() {
      this.elements.qualityState.textContent = this.qualityLow ? "Low" : "High";
    }

    checkDailyReward() {
      const today = new Date().toISOString().slice(0, 10);
      const last = this.read("nr.lastRewardDate");
      const canClaim = last !== today;
      this.elements.dailyReward.classList.toggle("is-claimed", !canClaim);
      this.elements.claimDailyBtn.disabled = !canClaim;
      this.elements.claimDailyBtn.textContent = canClaim ? "Claim" : "Done";
      this.elements.dailyRewardText.textContent = canClaim ? "150 coins" : "Collected";
      return canClaim;
    }

    claimDailyReward() {
      if (!this.checkDailyReward()) {
        return 0;
      }
      const today = new Date().toISOString().slice(0, 10);
      const total = Number(this.read("nr.totalCoins") || 0) + 150;
      this.write("nr.totalCoins", String(total));
      this.write("nr.lastRewardDate", today);
      this.updateMenu();
      return 150;
    }

    recordRun(result) {
      this.runStats.runs += 1;
      this.runStats.bestCoins = Math.max(this.runStats.bestCoins, result.coins);
      this.runStats.bestDistance = Math.max(this.runStats.bestDistance, Math.floor(result.distance));
      this.runStats.bestPowerups = Math.max(this.runStats.bestPowerups, result.powerups);
      this.runStats.bestScore = Math.max(this.runStats.bestScore, result.score);
      this.writeJSON("nr.runStats", this.runStats);
      return this.checkAchievements();
    }

    checkAchievements() {
      const unlocked = [];
      ACHIEVEMENTS.forEach((achievement) => {
        if (!this.achievementState[achievement.id] && achievement.test(this.runStats)) {
          this.achievementState[achievement.id] = true;
          unlocked.push(achievement);
        }
      });
      this.writeJSON("nr.achievements", this.achievementState);
      this.renderAchievements();
      return unlocked;
    }

    renderAchievements() {
      this.elements.achievementList.innerHTML = "";
      ACHIEVEMENTS.forEach((achievement) => {
        const item = document.createElement("div");
        const unlocked = Boolean(this.achievementState[achievement.id]);
        item.className = `achievement-item${unlocked ? " is-unlocked" : ""}`;
        item.innerHTML = `<span>${achievement.name}</span><strong>${unlocked ? "Unlocked" : "Locked"}</strong>`;
        this.elements.achievementList.appendChild(item);
      });
    }

    toast(message) {
      const toast = document.createElement("div");
      toast.className = "toast";
      toast.textContent = message;
      this.elements.toastStack.appendChild(toast);
      window.setTimeout(() => toast.remove(), 1900);
    }

    formatNumber(value) {
      return Math.floor(value).toLocaleString("en-US");
    }
  }

  root.UI = UI;
})();
