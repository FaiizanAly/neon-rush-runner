(function () {
  "use strict";

  const root = (window.NeonRush = window.NeonRush || {});

  const SKINS = {
    pulse: {
      primary: 0x27f4ff,
      secondary: 0xff3fd1,
      suit: 0x101b2f
    },
    nova: {
      primary: 0xffd55a,
      secondary: 0x5dff9d,
      suit: 0x1c1730
    },
    flux: {
      primary: 0xff3fd1,
      secondary: 0x27f4ff,
      suit: 0x171326
    }
  };

  class Player {
    constructor(scene, lanePositions) {
      this.scene = scene;
      this.lanes = lanePositions;
      this.group = new THREE.Group();
      this.group.position.set(0, 0, 4);
      this.scene.add(this.group);

      this.groundY = 0;
      this.verticalVelocity = 0;
      this.gravity = 34;
      this.jumpVelocity = 14.6;
      this.maxJumps = 2;
      this.jumpsRemaining = this.maxJumps;
      this.laneIndex = 1;
      this.targetLane = 1;
      this.targetX = this.lanes[this.laneIndex];
      this.slideTimer = 0;
      this.hitTimer = 0;
      this.deathTimer = 0;
      this.runPhase = 0;
      this.state = "idle";
      this.activePowerups = {};
      this.skinName = "pulse";
      this.colors = SKINS.pulse;

      this.materials = {};
      this.parts = {};
      this.createMeshes();
      this.setCharacter(this.readCharacter());
    }

    readCharacter() {
      try {
        return localStorage.getItem("nr.character") || "pulse";
      } catch (error) {
        return "pulse";
      }
    }

    createMeshes() {
      this.materials.suit = new THREE.MeshStandardMaterial({
        color: 0x101b2f,
        roughness: 0.36,
        metalness: 0.18
      });
      this.materials.primary = new THREE.MeshStandardMaterial({
        color: 0x27f4ff,
        emissive: 0x27f4ff,
        emissiveIntensity: 0.85,
        roughness: 0.28,
        metalness: 0.35
      });
      this.materials.secondary = new THREE.MeshStandardMaterial({
        color: 0xff3fd1,
        emissive: 0xff3fd1,
        emissiveIntensity: 0.55,
        roughness: 0.24,
        metalness: 0.28
      });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 1.15, 16), this.materials.suit);
      body.position.y = 1.25;
      body.castShadow = true;
      this.group.add(body);
      this.parts.body = body;

      const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.18, 0.12), this.materials.primary);
      chest.position.set(0, 1.42, -0.42);
      this.group.add(chest);
      this.parts.chest = chest;

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 18), this.materials.primary);
      head.position.y = 2.04;
      head.castShadow = true;
      this.group.add(head);
      this.parts.head = head;

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.08), this.materials.secondary);
      visor.position.set(0, 2.08, -0.3);
      this.group.add(visor);
      this.parts.visor = visor;

      this.parts.leftArm = this.createLimb(-0.56, 1.34, this.materials.primary);
      this.parts.rightArm = this.createLimb(0.56, 1.34, this.materials.primary);
      this.parts.leftLeg = this.createLimb(-0.22, 0.55, this.materials.secondary, 0.64);
      this.parts.rightLeg = this.createLimb(0.22, 0.55, this.materials.secondary, 0.64);

      const board = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.14, 0.52), this.materials.primary);
      board.position.y = 0.14;
      board.visible = false;
      board.castShadow = true;
      this.group.add(board);
      this.parts.board = board;

      const shield = new THREE.Mesh(
        new THREE.SphereGeometry(1.18, 32, 16),
        new THREE.MeshBasicMaterial({
          color: 0x5dff9d,
          transparent: true,
          opacity: 0.18,
          wireframe: true
        })
      );
      shield.position.y = 1.12;
      shield.visible = false;
      this.group.add(shield);
      this.parts.shield = shield;

      const magnetRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.84, 0.025, 8, 34),
        new THREE.MeshBasicMaterial({
          color: 0xff5269,
          transparent: true,
          opacity: 0.7
        })
      );
      magnetRing.rotation.x = Math.PI / 2;
      magnetRing.position.y = 1.17;
      magnetRing.visible = false;
      this.group.add(magnetRing);
      this.parts.magnet = magnetRing;
    }

    createLimb(x, y, material, length) {
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, length || 0.74, 10), material);
      limb.position.set(x, y, 0);
      limb.castShadow = true;
      this.group.add(limb);
      return limb;
    }

    setCharacter(name) {
      const skin = SKINS[name] || SKINS.pulse;
      this.skinName = SKINS[name] ? name : "pulse";
      this.colors = skin;
      this.materials.suit.color.set(skin.suit);
      this.materials.primary.color.set(skin.primary);
      this.materials.primary.emissive.set(skin.primary);
      this.materials.secondary.color.set(skin.secondary);
      this.materials.secondary.emissive.set(skin.secondary);
      try {
        localStorage.setItem("nr.character", this.skinName);
      } catch (error) {
        // Non-critical.
      }
    }

    reset() {
      this.group.position.set(0, this.groundY, 4);
      this.group.rotation.set(0, 0, 0);
      this.verticalVelocity = 0;
      this.jumpsRemaining = this.maxJumps;
      this.laneIndex = 1;
      this.targetLane = 1;
      this.targetX = this.lanes[this.laneIndex];
      this.slideTimer = 0;
      this.hitTimer = 0;
      this.deathTimer = 0;
      this.runPhase = 0;
      this.state = "run";
      this.activePowerups = {};
      this.parts.board.visible = false;
      this.parts.shield.visible = false;
      this.parts.magnet.visible = false;
      this.group.visible = true;
      this.group.scale.set(1, 1, 1);
    }

    move(direction) {
      if (this.state === "death") {
        return false;
      }
      const nextLane = THREE.MathUtils.clamp(this.targetLane + direction, 0, this.lanes.length - 1);
      if (nextLane === this.targetLane) {
        return false;
      }
      this.targetLane = nextLane;
      this.laneIndex = nextLane;
      this.targetX = this.lanes[nextLane];
      return true;
    }

    jump() {
      if (this.state === "death" || this.slideTimer > 0.08 || this.jumpsRemaining <= 0) {
        return false;
      }
      this.verticalVelocity = this.jumpVelocity * (this.jumpsRemaining === this.maxJumps ? 1 : 0.86);
      this.jumpsRemaining -= 1;
      this.state = "jump";
      return true;
    }

    slide() {
      if (this.state === "death" || this.group.position.y > 0.1) {
        return false;
      }
      this.slideTimer = 0.72;
      this.state = "slide";
      return true;
    }

    activatePowerup(type, duration) {
      this.activePowerups[type] = Math.max(this.activePowerups[type] || 0, duration);
      if (type === "hoverboard") {
        this.parts.board.visible = true;
      }
      if (type === "shield") {
        this.parts.shield.visible = true;
      }
      if (type === "magnet") {
        this.parts.magnet.visible = true;
      }
    }

    consumeProtection() {
      if (this.activePowerups.shield > 0) {
        this.activePowerups.shield = 0;
        this.parts.shield.visible = false;
        this.hitTimer = 0.35;
        return "shield";
      }
      if (this.activePowerups.hoverboard > 0) {
        this.activePowerups.hoverboard = 0;
        this.parts.board.visible = false;
        this.hitTimer = 0.35;
        return "hoverboard";
      }
      return null;
    }

    die() {
      this.state = "death";
      this.deathTimer = 0.9;
      this.hitTimer = 0.8;
      this.group.rotation.x = -0.45;
    }

    isSliding() {
      return this.slideTimer > 0;
    }

    isJumping() {
      return this.group.position.y > 0.18;
    }

    hasPowerup(type) {
      return (this.activePowerups[type] || 0) > 0;
    }

    getMagnetRadius() {
      return this.hasPowerup("magnet") ? 8.4 : 0;
    }

    getCollisionProfile() {
      return {
        lane: this.laneIndex,
        x: this.group.position.x,
        y: this.group.position.y,
        z: this.group.position.z,
        width: this.isSliding() ? 0.95 : 1.05,
        height: this.isSliding() ? 0.82 : 1.9,
        sliding: this.isSliding(),
        jumping: this.isJumping()
      };
    }

    update(dt, speed, effects) {
      this.updatePowerups(dt);
      this.updateMovement(dt);
      this.updateAnimation(dt, speed);
      this.updateVisualPowerups(dt);

      if (effects && (this.hasPowerup("boost") || this.hasPowerup("hoverboard"))) {
        const trailPosition = this.group.position.clone();
        trailPosition.y += 0.55;
        effects.emitTrail(trailPosition, this.colors.primary);
      }
    }

    updatePowerups(dt) {
      Object.keys(this.activePowerups).forEach((type) => {
        this.activePowerups[type] = Math.max(0, this.activePowerups[type] - dt);
        if (this.activePowerups[type] === 0) {
          if (type === "hoverboard") {
            this.parts.board.visible = false;
          }
          if (type === "shield") {
            this.parts.shield.visible = false;
          }
          if (type === "magnet") {
            this.parts.magnet.visible = false;
          }
        }
      });
    }

    updateMovement(dt) {
      const xDelta = this.targetX - this.group.position.x;
      this.group.position.x += xDelta * Math.min(1, dt * 12.5);
      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -xDelta * 0.075, dt * 8);

      if (this.group.position.y > this.groundY || this.verticalVelocity > 0) {
        this.verticalVelocity -= this.gravity * dt;
        this.group.position.y += this.verticalVelocity * dt;
        if (this.group.position.y <= this.groundY) {
          this.group.position.y = this.groundY;
          this.verticalVelocity = 0;
          this.jumpsRemaining = this.maxJumps;
          if (this.state !== "death" && this.slideTimer <= 0) {
            this.state = "run";
          }
        }
      }

      if (this.slideTimer > 0) {
        this.slideTimer -= dt;
        this.group.scale.y = THREE.MathUtils.lerp(this.group.scale.y, 0.55, dt * 16);
        this.group.scale.x = THREE.MathUtils.lerp(this.group.scale.x, 1.08, dt * 12);
        if (this.slideTimer <= 0) {
          this.group.scale.set(1, 1, 1);
          if (this.state !== "death") {
            this.state = this.group.position.y > 0 ? "jump" : "run";
          }
        }
      } else if (this.state !== "death") {
        this.group.scale.x = THREE.MathUtils.lerp(this.group.scale.x, 1, dt * 10);
        this.group.scale.y = THREE.MathUtils.lerp(this.group.scale.y, 1, dt * 10);
      }

      if (this.hitTimer > 0) {
        this.hitTimer -= dt;
      }
    }

    updateAnimation(dt, speed) {
      this.runPhase += dt * (7 + speed * 0.17);
      const stride = Math.sin(this.runPhase);
      const counter = Math.cos(this.runPhase);
      const running = this.state === "run" || this.state === "slide";
      const jumpPose = this.state === "jump";
      const hitFlash = this.hitTimer > 0 ? Math.sin(this.hitTimer * 70) * 0.12 : 0;

      if (running) {
        this.parts.leftArm.rotation.x = stride * 0.82;
        this.parts.rightArm.rotation.x = -stride * 0.82;
        this.parts.leftLeg.rotation.x = -stride * 0.92;
        this.parts.rightLeg.rotation.x = stride * 0.92;
        this.parts.body.position.y = 1.25 + Math.abs(counter) * 0.045;
      } else if (jumpPose) {
        this.parts.leftArm.rotation.x = -1.05;
        this.parts.rightArm.rotation.x = -0.78;
        this.parts.leftLeg.rotation.x = 0.45;
        this.parts.rightLeg.rotation.x = -0.45;
      }

      if (this.state === "death") {
        this.deathTimer -= dt;
        this.group.rotation.z += dt * 2.8;
        this.group.position.y = Math.max(-0.35, this.group.position.y - dt * 0.4);
      }

      this.parts.head.rotation.y = Math.sin(this.runPhase * 0.38) * 0.06;
      this.parts.visor.scale.x = 1 + hitFlash;
      this.parts.board.rotation.y += dt * 2.6;
    }

    updateVisualPowerups(dt) {
      this.parts.shield.visible = this.hasPowerup("shield");
      this.parts.magnet.visible = this.hasPowerup("magnet");
      this.parts.board.visible = this.hasPowerup("hoverboard");
      this.parts.shield.rotation.y += dt * 1.4;
      this.parts.shield.rotation.z -= dt * 0.8;
      this.parts.magnet.rotation.z += dt * 3.6;
      this.parts.magnet.scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.08);
    }
  }

  root.Player = Player;
})();
