(function () {
  "use strict";

  const root = (window.NeonRush = window.NeonRush || {});

  class EffectsManager {
    constructor(scene, camera) {
      this.scene = scene;
      this.camera = camera;
      this.particles = [];
      this.speedLines = [];
      this.rain = [];
      this.shakeTime = 0;
      this.shakeStrength = 0;
      this.cameraOffset = new THREE.Vector3();
      this.tempVector = new THREE.Vector3();
      this.poolSize = 180;
      this.createParticlePool();
      this.createSpeedLines();
      this.createRain();
    }

    createParticlePool() {
      const geometry = new THREE.SphereGeometry(0.08, 8, 8);
      for (let i = 0; i < this.poolSize; i += 1) {
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        this.scene.add(mesh);
        this.particles.push({
          mesh,
          velocity: new THREE.Vector3(),
          life: 0,
          maxLife: 1
        });
      }
    }

    createSpeedLines() {
      const material = new THREE.MeshBasicMaterial({
        color: 0x77f8ff,
        transparent: true,
        opacity: 0.35
      });
      const geometry = new THREE.BoxGeometry(0.035, 0.035, 5.5);
      for (let i = 0; i < 70; i += 1) {
        const line = new THREE.Mesh(geometry, material.clone());
        line.position.set((Math.random() - 0.5) * 18, Math.random() * 7 + 0.5, -Math.random() * 82 - 8);
        line.visible = true;
        this.scene.add(line);
        this.speedLines.push(line);
      }
    }

    createRain() {
      const material = new THREE.MeshBasicMaterial({
        color: 0x9defff,
        transparent: true,
        opacity: 0.24
      });
      const geometry = new THREE.BoxGeometry(0.025, 0.82, 0.025);
      for (let i = 0; i < 120; i += 1) {
        const drop = new THREE.Mesh(geometry, material);
        drop.rotation.z = -0.42;
        drop.position.set((Math.random() - 0.5) * 24, Math.random() * 12 + 2, -Math.random() * 120);
        this.scene.add(drop);
        this.rain.push(drop);
      }
    }

    getParticle() {
      for (let i = 0; i < this.particles.length; i += 1) {
        if (this.particles[i].life <= 0) {
          return this.particles[i];
        }
      }
      return this.particles[0];
    }

    emitBurst(position, color, count, strength) {
      for (let i = 0; i < count; i += 1) {
        const particle = this.getParticle();
        particle.life = particle.maxLife = 0.42 + Math.random() * 0.42;
        particle.mesh.visible = true;
        particle.mesh.position.copy(position);
        particle.mesh.material.color.set(color);
        particle.mesh.material.opacity = 1;
        particle.mesh.scale.setScalar(0.65 + Math.random() * 1.2);
        particle.velocity.set(
          (Math.random() - 0.5) * strength,
          Math.random() * strength * 0.85,
          (Math.random() - 0.35) * strength
        );
      }
    }

    emitTrail(position, color) {
      const particle = this.getParticle();
      particle.life = particle.maxLife = 0.28;
      particle.mesh.visible = true;
      particle.mesh.position.copy(position);
      particle.mesh.material.color.set(color || 0x27f4ff);
      particle.mesh.material.opacity = 0.7;
      particle.mesh.scale.setScalar(0.8);
      particle.velocity.set((Math.random() - 0.5) * 0.45, 0.45 + Math.random() * 0.35, 7 + Math.random() * 4);
    }

    screenShake(strength, duration) {
      this.shakeStrength = Math.max(this.shakeStrength, strength);
      this.shakeTime = Math.max(this.shakeTime, duration);
    }

    update(dt, speed, playerPosition) {
      this.updateParticles(dt);
      this.updateSpeedLines(dt, speed);
      this.updateRain(dt, speed);
      if (playerPosition && speed > 25) {
        this.emitTrail(playerPosition, speed > 34 ? 0xffd55a : 0x27f4ff);
      }
    }

    updateParticles(dt) {
      for (let i = 0; i < this.particles.length; i += 1) {
        const particle = this.particles[i];
        if (particle.life <= 0) {
          continue;
        }
        particle.life -= dt;
        particle.velocity.y -= 8 * dt;
        particle.mesh.position.addScaledVector(particle.velocity, dt);
        const ratio = Math.max(0, particle.life / particle.maxLife);
        particle.mesh.material.opacity = ratio;
        particle.mesh.scale.multiplyScalar(1 - dt * 0.75);
        if (particle.life <= 0) {
          particle.mesh.visible = false;
        }
      }
    }

    updateSpeedLines(dt, speed) {
      const intensity = Math.max(0, Math.min(1, (speed - 20) / 16));
      for (let i = 0; i < this.speedLines.length; i += 1) {
        const line = this.speedLines[i];
        line.material.opacity = 0.06 + intensity * 0.38;
        line.position.z += (speed * 2.15 + i % 5) * dt;
        if (line.position.z > 12) {
          line.position.z = -96 - Math.random() * 24;
          line.position.x = (Math.random() - 0.5) * (12 + intensity * 12);
          line.position.y = Math.random() * 7 + 0.5;
        }
      }
    }

    updateRain(dt, speed) {
      for (let i = 0; i < this.rain.length; i += 1) {
        const drop = this.rain[i];
        drop.position.y -= (15 + speed * 0.18) * dt;
        drop.position.z += (speed * 0.65) * dt;
        drop.position.x -= 4.2 * dt;
        if (drop.position.y < -1 || drop.position.z > 12) {
          drop.position.set((Math.random() - 0.5) * 24, 9 + Math.random() * 7, -90 - Math.random() * 40);
        }
      }
    }

    applyCameraShake(basePosition, baseRotation, dt) {
      if (this.shakeTime <= 0) {
        this.camera.position.copy(basePosition);
        this.camera.rotation.set(baseRotation.x, baseRotation.y, baseRotation.z);
        return;
      }

      this.shakeTime -= dt;
      const amount = this.shakeStrength * (this.shakeTime / Math.max(0.001, this.shakeTime + dt));
      this.cameraOffset.set(
        (Math.random() - 0.5) * amount,
        (Math.random() - 0.5) * amount,
        (Math.random() - 0.5) * amount * 0.35
      );
      this.camera.position.copy(basePosition).add(this.cameraOffset);
      this.camera.rotation.set(
        baseRotation.x + (Math.random() - 0.5) * amount * 0.02,
        baseRotation.y + (Math.random() - 0.5) * amount * 0.016,
        baseRotation.z + (Math.random() - 0.5) * amount * 0.025
      );

      if (this.shakeTime <= 0) {
        this.shakeStrength = 0;
      }
    }
  }

  root.EffectsManager = EffectsManager;
})();
