(function () {
  "use strict";

  const root = (window.NeonRush = window.NeonRush || {});

  const POWERUPS = {
    magnet: { label: "Magnet", color: 0xff5269, duration: 11 },
    shield: { label: "Shield", color: 0x5dff9d, duration: 12 },
    boost: { label: "Boost", color: 0xffd55a, duration: 7 },
    doubleCoins: { label: "2x Coins", color: 0x27f4ff, duration: 12 },
    hoverboard: { label: "Board", color: 0xff3fd1, duration: 10 },
    slowmo: { label: "Slow", color: 0xb7fffb, duration: 7 }
  };

  class World {
    constructor(container) {
      this.container = container;
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x060912);
      this.scene.fog = new THREE.FogExp2(0x07111c, 0.028);
      this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 220);
      this.cameraBase = {
        position: new THREE.Vector3(0, 5.45, 13.4),
        rotation: new THREE.Euler(-0.32, 0, 0)
      };
      this.camera.position.copy(this.cameraBase.position);
      this.camera.rotation.copy(this.cameraBase.rotation);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.container.appendChild(this.renderer.domElement);

      this.lanes = [-3.2, 0, 3.2];
      this.chunkLength = 24;
      this.chunkCount = 10;
      this.chunks = [];
      this.obstacles = [];
      this.coins = [];
      this.powerups = [];
      this.sideTraffic = [];
      this.elapsed = 0;
      this.nextObstacle = 0;
      this.nextCoinRow = 0;
      this.nextPowerup = 0;
      this.nextTraffic = 0;
      this.lastOpenLane = 1;
      this.lowQuality = false;

      this.materials = this.createMaterials();
      this.createLights();
      this.createSky();
      this.createChunks();
      this.createChaser();
      this.createPools();
      this.resize();
    }

    createMaterials() {
      return {
        asphalt: new THREE.MeshStandardMaterial({ color: 0x121721, roughness: 0.78, metalness: 0.08 }),
        track: new THREE.MeshStandardMaterial({ color: 0x20293a, roughness: 0.52, metalness: 0.18 }),
        rail: new THREE.MeshStandardMaterial({ color: 0x77869a, roughness: 0.25, metalness: 0.8 }),
        cyan: new THREE.MeshStandardMaterial({ color: 0x27f4ff, emissive: 0x27f4ff, emissiveIntensity: 1.1 }),
        magenta: new THREE.MeshStandardMaterial({ color: 0xff3fd1, emissive: 0xff3fd1, emissiveIntensity: 0.9 }),
        gold: new THREE.MeshStandardMaterial({ color: 0xffd55a, emissive: 0xffc641, emissiveIntensity: 0.8, metalness: 0.45, roughness: 0.18 }),
        green: new THREE.MeshStandardMaterial({ color: 0x5dff9d, emissive: 0x5dff9d, emissiveIntensity: 0.8 }),
        red: new THREE.MeshStandardMaterial({ color: 0xff5269, emissive: 0xff304c, emissiveIntensity: 0.9 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x0a101c, roughness: 0.5, metalness: 0.3 }),
        glass: new THREE.MeshStandardMaterial({ color: 0x234461, roughness: 0.2, metalness: 0.15, transparent: true, opacity: 0.72 })
      };
    }

    createLights() {
      const hemi = new THREE.HemisphereLight(0x7fdfff, 0x17111f, 1.45);
      this.scene.add(hemi);

      const moon = new THREE.DirectionalLight(0xa7d7ff, 1.15);
      moon.position.set(-7, 10, 7);
      moon.castShadow = true;
      moon.shadow.mapSize.width = 1024;
      moon.shadow.mapSize.height = 1024;
      moon.shadow.camera.near = 1;
      moon.shadow.camera.far = 54;
      moon.shadow.camera.left = -15;
      moon.shadow.camera.right = 15;
      moon.shadow.camera.top = 16;
      moon.shadow.camera.bottom = -12;
      this.scene.add(moon);

      this.neonLight = new THREE.PointLight(0xff3fd1, 1.2, 38);
      this.neonLight.position.set(4, 5, -10);
      this.scene.add(this.neonLight);

      this.runnerLight = new THREE.PointLight(0x27f4ff, 1.6, 14);
      this.runnerLight.position.set(0, 2.8, 6);
      this.scene.add(this.runnerLight);
    }

    createSky() {
      const skyGroup = new THREE.Group();
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(6, 32, 16),
        new THREE.MeshBasicMaterial({ color: 0xcdf9ff, transparent: true, opacity: 0.72 })
      );
      moon.position.set(-18, 20, -90);
      skyGroup.add(moon);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(8.2, 0.05, 10, 90),
        new THREE.MeshBasicMaterial({ color: 0xffd55a, transparent: true, opacity: 0.5 })
      );
      ring.position.copy(moon.position);
      ring.rotation.set(0.4, 0.3, 0.2);
      skyGroup.add(ring);
      this.scene.add(skyGroup);
      this.skyGroup = skyGroup;
    }

    createChunks() {
      for (let i = 0; i < this.chunkCount; i += 1) {
        const chunk = this.createChunk(i);
        chunk.position.z = -i * this.chunkLength;
        this.scene.add(chunk);
        this.chunks.push(chunk);
      }
    }

    createChunk(index) {
      const group = new THREE.Group();
      group.userData.index = index;

      const base = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.22, this.chunkLength + 0.4), this.materials.asphalt);
      base.position.y = -0.12;
      base.receiveShadow = true;
      group.add(base);

      for (let lane = 0; lane < 3; lane += 1) {
        const x = this.lanes[lane];
        const strip = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, this.chunkLength + 0.1), this.materials.track);
        strip.position.set(x, 0.02, 0);
        strip.receiveShadow = true;
        group.add(strip);

        const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, this.chunkLength), this.materials.rail);
        const rightRail = leftRail.clone();
        leftRail.position.set(x - 0.95, 0.16, 0);
        rightRail.position.set(x + 0.95, 0.16, 0);
        group.add(leftRail, rightRail);
      }

      for (let i = 0; i < 6; i += 1) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 2.2), i % 2 ? this.materials.cyan : this.materials.magenta);
        marker.position.set(i % 2 ? -1.6 : 1.6, 0.09, -this.chunkLength / 2 + i * 4 + 1.2);
        group.add(marker);
      }

      this.populateScenery(group, index);
      return group;
    }

    populateScenery(group, index) {
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 3; i += 1) {
          const height = 3.2 + ((index + i) % 5) * 1.4 + Math.random() * 1.4;
          const building = new THREE.Mesh(new THREE.BoxGeometry(2.4 + Math.random() * 1.2, height, 3.2), this.materials.dark);
          building.position.set(side * (8.4 + Math.random() * 2.8), height / 2 - 0.08, -this.chunkLength / 2 + i * 8 + Math.random() * 3);
          building.castShadow = true;
          building.receiveShadow = true;
          group.add(building);

          const signMaterial = this.makeSignMaterial(index, i, side);
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.62), signMaterial);
          sign.position.set(building.position.x - side * 1.24, Math.min(height - 0.7, 3.5 + Math.random() * 2.2), building.position.z - 0.5);
          sign.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          group.add(sign);
        }
      }
    }

    makeSignMaterial(index, offset, side) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext("2d");
      const colors = ["#27f4ff", "#ff3fd1", "#ffd55a", "#5dff9d"];
      const color = colors[(index + offset + (side > 0 ? 1 : 0)) % colors.length];
      ctx.fillStyle = "rgba(5, 10, 20, 0.92)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
      ctx.fillStyle = color;
      ctx.font = "800 32px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(["ZEN", "BYTE", "VOLT", "NOVA"][(index + offset) % 4], 128, 48);
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 2;
      return new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    }

    createChaser() {
      this.chaser = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), this.materials.red);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), this.materials.cyan);
      lens.position.set(0, 0.02, -0.38);
      const rotorGeo = new THREE.BoxGeometry(1.35, 0.04, 0.12);
      const rotorA = new THREE.Mesh(rotorGeo, this.materials.rail);
      const rotorB = new THREE.Mesh(rotorGeo, this.materials.rail);
      rotorB.rotation.y = Math.PI / 2;
      this.chaser.add(body, lens, rotorA, rotorB);
      this.chaser.position.set(0, 3.2, 8.8);
      this.scene.add(this.chaser);
      this.chaserRotors = [rotorA, rotorB];
    }

    createPools() {
      for (let i = 0; i < 36; i += 1) {
        this.coins.push(this.createCoin());
      }
      for (let i = 0; i < 18; i += 1) {
        this.obstacles.push(this.createObstacle());
      }
      for (let i = 0; i < 8; i += 1) {
        this.powerups.push(this.createPowerup());
      }
      for (let i = 0; i < 4; i += 1) {
        this.sideTraffic.push(this.createTrafficTrain());
      }
    }

    createCoin() {
      const group = new THREE.Group();
      const coin = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 10, 24), this.materials.gold);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff4a3, transparent: true, opacity: 0.18 })
      );
      group.add(coin, glow);
      group.visible = false;
      group.userData = { active: false, lane: 1, value: 1 };
      this.scene.add(group);
      return group;
    }

    createObstacle() {
      const group = new THREE.Group();
      group.visible = false;
      group.userData = {
        active: false,
        type: "barrier",
        lane: 1,
        lanes: [1],
        requirement: "jump",
        depth: 1.2,
        width: 1.2,
        height: 1.2,
        moving: false,
        phase: 0,
        passed: false
      };
      this.scene.add(group);
      return group;
    }

    createPowerup() {
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), this.materials.green);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 8, 30), this.materials.cyan);
      ring.rotation.x = Math.PI / 2;
      group.add(core, ring);
      group.visible = false;
      group.userData = { active: false, type: "magnet", lane: 1 };
      this.scene.add(group);
      return group;
    }

    createTrafficTrain() {
      const train = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.9, 9.5), this.materials.glass);
      body.position.y = 1.08;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.16, 8.8), this.materials.magenta);
      stripe.position.set(0, 1.65, -0.1);
      train.add(body, stripe);
      train.visible = false;
      train.userData = { active: false, side: 1, speed: 1 };
      this.scene.add(train);
      return train;
    }

    reset() {
      this.elapsed = 0;
      this.nextObstacle = 1.1;
      this.nextCoinRow = 0.55;
      this.nextPowerup = 5.5;
      this.nextTraffic = 1.2;
      this.lastOpenLane = 1;

      this.chunks.forEach((chunk, index) => {
        chunk.position.z = -index * this.chunkLength;
      });
      this.obstacles.forEach((item) => this.deactivate(item));
      this.coins.forEach((item) => this.deactivate(item));
      this.powerups.forEach((item) => this.deactivate(item));
      this.sideTraffic.forEach((item) => this.deactivate(item));
    }

    deactivate(object) {
      object.visible = false;
      object.userData.active = false;
    }

    setQuality(isLow) {
      this.lowQuality = Boolean(isLow);
      this.renderer.setPixelRatio(this.lowQuality ? 1 : Math.min(2, window.devicePixelRatio || 1));
      this.scene.fog.density = this.lowQuality ? 0.034 : 0.028;
    }

    update(dt, speed, player, effects) {
      this.elapsed += dt;
      const events = [];
      this.updateEnvironment(dt, speed, player);
      this.updateSpawners(dt, speed);
      this.updateObstacles(dt, speed, player, effects, events);
      this.updateCoins(dt, speed, player, effects, events);
      this.updatePowerups(dt, speed, player, effects, events);
      this.updateTraffic(dt, speed);
      return events;
    }

    updateEnvironment(dt, speed, player) {
      for (let i = 0; i < this.chunks.length; i += 1) {
        const chunk = this.chunks[i];
        chunk.position.z += speed * dt;
        if (chunk.position.z > this.chunkLength) {
          let minZ = Infinity;
          for (let j = 0; j < this.chunks.length; j += 1) {
            minZ = Math.min(minZ, this.chunks[j].position.z);
          }
          chunk.position.z = minZ - this.chunkLength;
        }
      }

      this.neonLight.position.x = Math.sin(this.elapsed * 0.8) * 5;
      this.neonLight.position.z = -15 + Math.cos(this.elapsed * 0.45) * 12;
      this.runnerLight.position.x = player ? player.group.position.x : 0;
      this.skyGroup.rotation.y += dt * 0.014;

      this.chaser.position.x = player ? THREE.MathUtils.lerp(this.chaser.position.x, player.group.position.x * 0.42, dt * 2) : this.chaser.position.x;
      this.chaser.position.y = 3.15 + Math.sin(this.elapsed * 4) * 0.14;
      this.chaserRotors[0].rotation.y += dt * 22;
      this.chaserRotors[1].rotation.y += dt * 24;
    }

    updateSpawners(dt, speed) {
      const difficulty = Math.min(1, (speed - 19) / 17);
      this.nextObstacle -= dt;
      this.nextCoinRow -= dt;
      this.nextPowerup -= dt;
      this.nextTraffic -= dt;

      if (this.nextObstacle <= 0) {
        this.spawnObstaclePattern(difficulty);
        this.nextObstacle = THREE.MathUtils.lerp(1.28, 0.62, difficulty) + Math.random() * 0.32;
      }
      if (this.nextCoinRow <= 0) {
        this.spawnCoinRow();
        this.nextCoinRow = 0.55 + Math.random() * 0.5;
      }
      if (this.nextPowerup <= 0) {
        this.spawnPowerup();
        this.nextPowerup = 8.4 + Math.random() * 7.5;
      }
      if (this.nextTraffic <= 0) {
        this.spawnTraffic();
        this.nextTraffic = 3.8 + Math.random() * 4.5;
      }
    }

    spawnObstaclePattern(difficulty) {
      const roll = Math.random();
      if (roll < 0.2 + difficulty * 0.18) {
        const blocked = this.shuffle([0, 1, 2]).slice(0, Math.random() < 0.32 + difficulty * 0.24 ? 2 : 1);
        blocked.forEach((lane, index) => {
          this.spawnObstacle(["barrier", "lowGate", "roadblock"][index % 3], lane, -105 - index * 2.4);
        });
        this.lastOpenLane = [0, 1, 2].find((lane) => blocked.indexOf(lane) === -1) || 1;
        return;
      }

      const types = ["barrier", "lowGate", "train", "laser", "wall", "movingHazard", "roadblock"];
      const type = types[Math.floor(Math.random() * (4 + Math.floor(difficulty * 3)))];
      const lane = Math.floor(Math.random() * 3);
      this.spawnObstacle(type, lane, -105);
    }

    spawnObstacle(type, lane, z) {
      const obstacle = this.getInactive(this.obstacles);
      if (!obstacle) {
        return;
      }
      this.clearGroup(obstacle);
      obstacle.visible = true;
      obstacle.userData.active = true;
      obstacle.userData.type = type;
      obstacle.userData.lane = lane;
      obstacle.userData.lanes = [lane];
      obstacle.userData.moving = false;
      obstacle.userData.phase = Math.random() * Math.PI * 2;
      obstacle.userData.passed = false;
      obstacle.position.set(this.lanes[lane], 0, z || -105);

      if (type === "barrier") {
        obstacle.userData.requirement = "jump";
        obstacle.userData.depth = 1.0;
        obstacle.userData.height = 1.0;
        this.addBarrier(obstacle);
      } else if (type === "lowGate") {
        obstacle.userData.requirement = "slide";
        obstacle.userData.depth = 1.0;
        obstacle.userData.height = 2.2;
        this.addLowGate(obstacle);
      } else if (type === "train") {
        obstacle.userData.requirement = "dodge";
        obstacle.userData.depth = 7.4;
        obstacle.userData.height = 2.4;
        this.addTrain(obstacle);
      } else if (type === "laser") {
        obstacle.userData.requirement = "slide";
        obstacle.userData.depth = 1.3;
        obstacle.userData.height = 1.9;
        this.addLaser(obstacle);
      } else if (type === "wall") {
        const openLane = Math.floor(Math.random() * 3);
        const lanes = [0, 1, 2].filter((value) => value !== openLane);
        obstacle.userData.requirement = "dodge";
        obstacle.userData.lanes = lanes;
        obstacle.userData.depth = 1.2;
        obstacle.userData.height = 2.8;
        obstacle.position.x = 0;
        this.addWall(obstacle, lanes);
      } else if (type === "movingHazard") {
        obstacle.userData.requirement = "dodge";
        obstacle.userData.depth = 1.1;
        obstacle.userData.height = 1.5;
        obstacle.userData.moving = true;
        this.addMovingHazard(obstacle);
      } else {
        obstacle.userData.requirement = "dodge";
        obstacle.userData.depth = 1.3;
        obstacle.userData.height = 1.35;
        this.addRoadblock(obstacle);
      }
    }

    addBarrier(group) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.9, 0.46), this.materials.red);
      base.position.y = 0.48;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.12, 0.55), this.materials.gold);
      cap.position.y = 0.98;
      group.add(base, cap);
      base.castShadow = true;
      cap.castShadow = true;
    }

    addLowGate(group) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.24, 0.34), this.materials.cyan);
      top.position.y = 1.7;
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.62, 0.22), this.materials.dark);
      const right = left.clone();
      left.position.set(-0.96, 0.85, 0);
      right.position.set(0.96, 0.85, 0);
      group.add(top, left, right);
    }

    addTrain(group) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.18, 2.25, 7.6), this.materials.glass);
      body.position.y = 1.18;
      const nose = new THREE.Mesh(new THREE.BoxGeometry(2.08, 1.4, 0.46), this.materials.cyan);
      nose.position.set(0, 1.2, 3.98);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.14, 6.4), this.materials.gold);
      stripe.position.set(0, 1.95, -0.28);
      group.add(body, nose, stripe);
      body.castShadow = true;
    }

    addLaser(group) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.11, 0.18), this.materials.magenta);
      beam.position.y = 1.25;
      const beam2 = beam.clone();
      beam2.position.y = 1.65;
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.05, 0.2), this.materials.dark);
      const right = left.clone();
      left.position.set(-1.03, 1.02, 0);
      right.position.set(1.03, 1.02, 0);
      group.add(beam, beam2, left, right);
    }

    addWall(group, lanes) {
      lanes.forEach((lane) => {
        const block = new THREE.Mesh(new THREE.BoxGeometry(2.22, 2.65, 0.55), this.materials.red);
        block.position.set(this.lanes[lane], 1.32, 0);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.16, 0.6), this.materials.gold);
        stripe.position.set(this.lanes[lane], 1.95, -0.02);
        group.add(block, stripe);
      });
    }

    addMovingHazard(group) {
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), this.materials.magenta);
      orb.position.y = 0.9;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.04, 8, 28), this.materials.cyan);
      ring.position.y = 0.9;
      ring.rotation.x = Math.PI / 2;
      group.add(orb, ring);
    }

    addRoadblock(group) {
      const block = new THREE.Mesh(new THREE.BoxGeometry(1.74, 1.34, 1.0), this.materials.dark);
      block.position.y = 0.72;
      const glow = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.12, 1.04), this.materials.red);
      glow.position.y = 1.22;
      group.add(block, glow);
    }

    clearGroup(group) {
      while (group.children.length) {
        const child = group.children.pop();
        if (child.geometry) {
          child.geometry.dispose();
        }
        group.remove(child);
      }
    }

    spawnCoinRow() {
      const lane = Math.random() < 0.72 ? this.lastOpenLane : Math.floor(Math.random() * 3);
      const length = 4 + Math.floor(Math.random() * 5);
      const arc = Math.random() < 0.28;
      for (let i = 0; i < length; i += 1) {
        const coin = this.getInactive(this.coins);
        if (!coin) {
          return;
        }
        coin.visible = true;
        coin.userData.active = true;
        coin.userData.lane = lane;
        coin.userData.value = 1;
        const y = arc ? 1.2 + Math.sin((i / Math.max(1, length - 1)) * Math.PI) * 1.2 : 1.25;
        coin.position.set(this.lanes[lane], y, -92 - i * 2.55);
        coin.scale.setScalar(1);
      }
    }

    spawnPowerup() {
      const types = Object.keys(POWERUPS);
      const type = types[Math.floor(Math.random() * types.length)];
      const power = this.getInactive(this.powerups);
      if (!power) {
        return;
      }
      const lane = Math.floor(Math.random() * 3);
      power.visible = true;
      power.userData.active = true;
      power.userData.type = type;
      power.userData.lane = lane;
      power.position.set(this.lanes[lane], 1.32, -112);
      const color = POWERUPS[type].color;
      power.children.forEach((child) => {
        if (child.material && child.material.color) {
          child.material.color.set(color);
          if (child.material.emissive) {
            child.material.emissive.set(color);
          }
        }
      });
    }

    spawnTraffic() {
      const train = this.getInactive(this.sideTraffic);
      if (!train) {
        return;
      }
      const side = Math.random() < 0.5 ? -1 : 1;
      train.userData.active = true;
      train.userData.side = side;
      train.userData.speed = 0.55 + Math.random() * 0.65;
      train.visible = true;
      train.position.set(side * (8 + Math.random() * 3), 0, -110 - Math.random() * 20);
    }

    updateObstacles(dt, speed, player, effects, events) {
      const profile = player.getCollisionProfile();
      for (let i = 0; i < this.obstacles.length; i += 1) {
        const obstacle = this.obstacles[i];
        if (!obstacle.userData.active) {
          continue;
        }
        obstacle.position.z += speed * dt;
        if (obstacle.userData.moving) {
          const laneFloat = 1 + Math.sin(this.elapsed * 1.8 + obstacle.userData.phase) * 1.08;
          obstacle.position.x = THREE.MathUtils.lerp(obstacle.position.x, this.lanes[Math.round(THREE.MathUtils.clamp(laneFloat, 0, 2))], dt * 2.6);
          obstacle.rotation.y += dt * 2.5;
        }
        obstacle.children.forEach((child) => {
          if (child.material && child.material.emissive) {
            child.material.emissiveIntensity = 0.7 + Math.sin(this.elapsed * 8 + i) * 0.18;
          }
        });

        if (!obstacle.userData.passed && obstacle.position.z > profile.z + obstacle.userData.depth * 0.5) {
          obstacle.userData.passed = true;
          events.push({ type: "dodge", obstacle: obstacle.userData.type });
        }

        if (this.collidesWithPlayer(obstacle, profile)) {
          const protection = player.consumeProtection();
          if (protection) {
            this.deactivate(obstacle);
            events.push({ type: "blocked", protection, position: obstacle.position.clone() });
            if (effects) {
              effects.emitBurst(obstacle.position.clone().add(new THREE.Vector3(0, 1, 0)), 0x5dff9d, 26, 8);
              effects.screenShake(0.35, 0.22);
            }
          } else {
            events.push({ type: "hit", obstacle: obstacle.userData.type, position: obstacle.position.clone() });
          }
        }

        if (obstacle.position.z > 22) {
          this.deactivate(obstacle);
        }
      }
    }

    collidesWithPlayer(obstacle, profile) {
      const data = obstacle.userData;
      const dz = Math.abs(obstacle.position.z - profile.z);
      if (dz > data.depth * 0.5 + 0.55) {
        return false;
      }

      let laneHit = false;
      if (data.moving) {
        laneHit = Math.abs(obstacle.position.x - profile.x) < 1.18;
      } else if (data.type === "wall") {
        laneHit = data.lanes.indexOf(profile.lane) !== -1;
      } else {
        laneHit = Math.abs(this.lanes[data.lane] - profile.x) < 1.08;
      }

      if (!laneHit) {
        return false;
      }

      if (data.requirement === "jump") {
        return profile.y < 1.05;
      }
      if (data.requirement === "slide") {
        return !profile.sliding;
      }
      return true;
    }

    updateCoins(dt, speed, player, effects, events) {
      const profile = player.getCollisionProfile();
      const magnetRadius = player.getMagnetRadius();
      for (let i = 0; i < this.coins.length; i += 1) {
        const coin = this.coins[i];
        if (!coin.userData.active) {
          continue;
        }
        coin.position.z += speed * dt;
        coin.rotation.y += dt * 6.4;
        coin.position.y += Math.sin(this.elapsed * 7 + i) * dt * 0.12;

        const distance = coin.position.distanceTo(player.group.position.clone().add(new THREE.Vector3(0, 1.1, 0)));
        if (magnetRadius > 0 && distance < magnetRadius) {
          coin.position.lerp(player.group.position.clone().add(new THREE.Vector3(0, 1.1, 0)), dt * 7.5);
          coin.scale.setScalar(1 + Math.sin(this.elapsed * 20) * 0.12);
        }

        if (distance < 1.08 || this.sameLaneCollect(coin, profile)) {
          this.deactivate(coin);
          events.push({ type: "coin", value: coin.userData.value, position: coin.position.clone() });
          if (effects) {
            effects.emitBurst(coin.position, 0xffd55a, 10, 3.5);
          }
        }

        if (coin.position.z > 18) {
          this.deactivate(coin);
        }
      }
    }

    sameLaneCollect(coin, profile) {
      return Math.abs(coin.position.z - profile.z) < 0.8 &&
        Math.abs(coin.position.x - profile.x) < 1.0 &&
        Math.abs(coin.position.y - (profile.y + 1.0)) < 1.25;
    }

    updatePowerups(dt, speed, player, effects, events) {
      const profile = player.getCollisionProfile();
      for (let i = 0; i < this.powerups.length; i += 1) {
        const power = this.powerups[i];
        if (!power.userData.active) {
          continue;
        }
        power.position.z += speed * dt;
        power.rotation.y += dt * 2.8;
        power.children[1].rotation.z += dt * 3.2;
        power.position.y = 1.35 + Math.sin(this.elapsed * 3 + i) * 0.16;
        if (Math.abs(power.position.z - profile.z) < 0.9 && Math.abs(power.position.x - profile.x) < 1.05) {
          const data = POWERUPS[power.userData.type];
          player.activatePowerup(power.userData.type, data.duration);
          this.deactivate(power);
          events.push({ type: "powerup", power: power.userData.type, label: data.label, position: power.position.clone() });
          if (effects) {
            effects.emitBurst(power.position, data.color, 24, 5.5);
          }
        }
        if (power.position.z > 18) {
          this.deactivate(power);
        }
      }
    }

    updateTraffic(dt, speed) {
      for (let i = 0; i < this.sideTraffic.length; i += 1) {
        const train = this.sideTraffic[i];
        if (!train.userData.active) {
          continue;
        }
        train.position.z += (speed * train.userData.speed + 11) * dt;
        train.children[1].material.emissiveIntensity = 0.55 + Math.sin(this.elapsed * 9 + i) * 0.2;
        if (train.position.z > 24) {
          this.deactivate(train);
        }
      }
    }

    getInactive(list) {
      for (let i = 0; i < list.length; i += 1) {
        if (!list[i].userData.active) {
          return list[i];
        }
      }
      return null;
    }

    shuffle(values) {
      const copy = values.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      return copy;
    }

    resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.fov = width < 620 ? 70 : 62;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    render(effects, dt, player) {
      const targetX = player ? player.group.position.x * 0.36 : 0;
      const boostTilt = player && player.hasPowerup("boost") ? 0.055 : 0;
      this.cameraBase.position.x = THREE.MathUtils.lerp(this.cameraBase.position.x, targetX, dt * 4.5);
      this.cameraBase.position.y = THREE.MathUtils.lerp(this.cameraBase.position.y, player && player.isSliding() ? 4.9 : 5.45, dt * 4);
      this.cameraBase.rotation.z = THREE.MathUtils.lerp(this.cameraBase.rotation.z, player ? -player.group.rotation.z * 0.35 - boostTilt : 0, dt * 5);
      if (effects) {
        effects.applyCameraShake(this.cameraBase.position, this.cameraBase.rotation, dt);
      } else {
        this.camera.position.copy(this.cameraBase.position);
        this.camera.rotation.copy(this.cameraBase.rotation);
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  root.World = World;
  root.POWERUPS = POWERUPS;
})();
