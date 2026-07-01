(function () {
  "use strict";

  const root = (window.NeonRush = window.NeonRush || {});

  class Controls {
    constructor(target, callbacks) {
      this.target = target || window;
      this.callbacks = callbacks || {};
      this.touchStart = null;
      this.swipeThreshold = 28;
      this.enabled = true;
      this.boundKeyDown = this.handleKeyDown.bind(this);
      this.boundTouchStart = this.handleTouchStart.bind(this);
      this.boundTouchEnd = this.handleTouchEnd.bind(this);
      this.boundPointerDown = this.handlePointerButton.bind(this);
      this.bind();
    }

    bind() {
      window.addEventListener("keydown", this.boundKeyDown, { passive: false });
      this.target.addEventListener("touchstart", this.boundTouchStart, { passive: false });
      this.target.addEventListener("touchend", this.boundTouchEnd, { passive: false });
      document.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("pointerdown", this.boundPointerDown);
      });
    }

    destroy() {
      window.removeEventListener("keydown", this.boundKeyDown);
      this.target.removeEventListener("touchstart", this.boundTouchStart);
      this.target.removeEventListener("touchend", this.boundTouchEnd);
      document.querySelectorAll("[data-action]").forEach((button) => {
        button.removeEventListener("pointerdown", this.boundPointerDown);
      });
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
    }

    fire(action) {
      if (!this.enabled && action !== "pause") {
        return;
      }
      const handler = this.callbacks[action];
      if (typeof handler === "function") {
        handler();
      }
    }

    handleKeyDown(event) {
      const key = event.key.toLowerCase();
      const actions = {
        arrowleft: "left",
        a: "left",
        arrowright: "right",
        d: "right",
        arrowup: "jump",
        w: "jump",
        " ": "jump",
        arrowdown: "slide",
        s: "slide",
        escape: "pause",
        p: "pause"
      };

      const action = actions[key];
      if (!action) {
        return;
      }

      event.preventDefault();
      this.fire(action);
    }

    handleTouchStart(event) {
      if (!event.changedTouches || event.changedTouches.length === 0) {
        return;
      }

      const touch = event.changedTouches[0];
      this.touchStart = {
        x: touch.clientX,
        y: touch.clientY,
        time: performance.now()
      };
    }

    handleTouchEnd(event) {
      if (!this.touchStart || !event.changedTouches || event.changedTouches.length === 0) {
        return;
      }

      const touch = event.changedTouches[0];
      const dx = touch.clientX - this.touchStart.x;
      const dy = touch.clientY - this.touchStart.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      this.touchStart = null;

      if (Math.max(absX, absY) < this.swipeThreshold) {
        return;
      }

      event.preventDefault();
      if (absX > absY) {
        this.fire(dx > 0 ? "right" : "left");
      } else {
        this.fire(dy > 0 ? "slide" : "jump");
      }
    }

    handlePointerButton(event) {
      const action = event.currentTarget.getAttribute("data-action");
      if (action) {
        event.preventDefault();
        this.fire(action);
      }
    }
  }

  root.Controls = Controls;
})();
