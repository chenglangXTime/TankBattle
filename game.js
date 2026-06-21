(() => {
  "use strict";

  const HIT_LIMIT = 15;
  const MG_LIMIT = 30;
  const GRAVITY = 410;
  const WORLD = { width: 1600, height: 860 };
  const DPR_LIMIT = 2;
  const STORAGE_KEY = "tankBattleProgressV2";

  const SCENES = {
    desert: {
      id: "desert",
      name: "沙漠",
      weatherName: "沙尘暴",
      weatherClass: "",
      weatherType: "dust",
      interval: 10,
      duration: 4.6,
      drivePenalty: 0.76,
      wind: 34,
      sky: ["#7ec7df", "#f1cc86", "#c58d4a"],
      layers: ["#dfb16a", "#c99351", "#a9723d"],
      ground: "#b98242",
      track: "rgba(255, 224, 158, 0.24)",
      cockpitTint: "#2a2a24",
      terrain: { baseOffset: 145, spacing: 210, amplitude: 72, roughness: 16, micro: 9 },
    },
    grass: {
      id: "grass",
      name: "草地",
      weatherName: "暴雨",
      weatherClass: "weather-rain",
      weatherType: "rain",
      interval: 12,
      duration: 5.2,
      drivePenalty: 0.7,
      wind: 18,
      sky: ["#8ec6d0", "#a9c988", "#5d8f4d"],
      layers: ["#9fca6e", "#7dab57", "#5c873d"],
      ground: "#5d9342",
      track: "rgba(218, 249, 166, 0.22)",
      cockpitTint: "#1f3025",
      terrain: { baseOffset: 142, spacing: 175, amplitude: 44, roughness: 12, micro: 5 },
    },
    jungle: {
      id: "jungle",
      name: "丛林",
      weatherName: "浓雾",
      weatherClass: "weather-fog",
      weatherType: "fog",
      interval: 11,
      duration: 5.8,
      drivePenalty: 0.68,
      wind: 8,
      sky: ["#6ba8aa", "#7ea56a", "#355b38"],
      layers: ["#578a52", "#3e6e3a", "#24472c"],
      ground: "#4d7140",
      track: "rgba(211, 245, 183, 0.18)",
      cockpitTint: "#183024",
      terrain: { baseOffset: 128, spacing: 135, amplitude: 74, roughness: 24, micro: 8 },
    },
    prairie: {
      id: "prairie",
      name: "草原",
      weatherName: "横风",
      weatherClass: "weather-wind",
      weatherType: "wind",
      interval: 9,
      duration: 4.8,
      drivePenalty: 0.86,
      wind: 118,
      sky: ["#86cce6", "#d9d28a", "#8caf4b"],
      layers: ["#c0cb65", "#a7b84e", "#7f9940"],
      ground: "#88a947",
      track: "rgba(245, 238, 146, 0.26)",
      cockpitTint: "#253025",
      terrain: { baseOffset: 158, spacing: 235, amplitude: 30, roughness: 8, micro: 4 },
    },
    wasteland: {
      id: "wasteland",
      name: "荒漠",
      weatherName: "热浪",
      weatherClass: "weather-heat",
      weatherType: "heat",
      interval: 13,
      duration: 5,
      drivePenalty: 0.8,
      wind: 52,
      sky: ["#b9c2b1", "#d1a66d", "#866249"],
      layers: ["#b98056", "#996445", "#674332"],
      ground: "#81543c",
      track: "rgba(255, 206, 152, 0.2)",
      cockpitTint: "#30231d",
      terrain: { baseOffset: 144, spacing: 125, amplitude: 86, roughness: 34, micro: 11 },
    },
  };

  const GEAR = {
    standard: {
      id: "standard",
      name: "标准",
      unlock: 0,
      healthBonus: 0,
      mgAmmoBonus: 0,
      shellCooldown: 0.92,
      mgCooldown: 0.105,
      shellSpread: 1,
      mgSpread: 1,
    },
    armor: {
      id: "armor",
      name: "装甲",
      unlock: 5,
      healthBonus: 3,
      mgAmmoBonus: 0,
      shellCooldown: 0.98,
      mgCooldown: 0.112,
      shellSpread: 1,
      mgSpread: 1,
    },
    scope: {
      id: "scope",
      name: "瞄具",
      unlock: 9,
      healthBonus: 0,
      mgAmmoBonus: 6,
      shellCooldown: 0.86,
      mgCooldown: 0.095,
      shellSpread: 0.72,
      mgSpread: 0.56,
    },
    rapid: {
      id: "rapid",
      name: "速射",
      unlock: 14,
      healthBonus: 1,
      mgAmmoBonus: 15,
      shellCooldown: 0.78,
      mgCooldown: 0.072,
      shellSpread: 0.88,
      mgSpread: 0.78,
    },
  };

  const canvas = document.getElementById("battlefield");
  const ctx = canvas.getContext("2d");
  const redCockpitCanvas = document.getElementById("redCockpit");
  const blueCockpitCanvas = document.getElementById("blueCockpit");
  const redCockpitCtx = redCockpitCanvas.getContext("2d");
  const blueCockpitCtx = blueCockpitCanvas.getContext("2d");

  const ui = {
    startButton: document.getElementById("startButton"),
    resetButton: document.getElementById("resetButton"),
    banner: document.getElementById("roundBanner"),
    stormStatus: document.getElementById("stormStatus"),
    redHealth: document.getElementById("redHealthFill"),
    blueHealth: document.getElementById("blueHealthFill"),
    redHits: document.getElementById("redHits"),
    blueHits: document.getElementById("blueHits"),
    redAmmo: document.getElementById("redAmmo"),
    blueAmmo: document.getElementById("blueAmmo"),
    redAngle: document.getElementById("redAngle"),
    blueAngle: document.getElementById("blueAngle"),
    redScore: document.getElementById("redScore"),
    blueScore: document.getElementById("blueScore"),
    redGearName: document.getElementById("redGearName"),
    blueGearName: document.getElementById("blueGearName"),
  };

  const keys = new Set();
  const heldActions = new Set();
  const shells = [];
  const bullets = [];
  const smoke = [];
  const sparks = [];
  const dust = [];
  const stormParticles = [];
  const powerUps = [];

  let running = false;
  let lastTime = performance.now();
  let gameTime = 0;
  let winner = null;
  let shakeTime = 0;
  let shakePower = 0;
  let audio = null;
  let currentSceneId = "desert";
  let scores = loadProgress();
  let selectedGear = { red: "standard", blue: "standard" };
  let nextSupplyAt = 8;
  let terrainProfile = null;

  const storm = {
    active: false,
    nextAt: 10,
    endsAt: 0,
    strength: 0,
  };

  const view = {
    width: 1,
    height: 1,
    scale: 1,
    ox: 0,
    oy: 0,
  };

  let redTank;
  let blueTank;

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        red: Number(saved.red) || 0,
        blue: Number(saved.blue) || 0,
      };
    } catch {
      return { red: 0, blue: 0 };
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch {
      // Progress is optional; the game still works when storage is unavailable.
    }
  }

  function activeScene() {
    return SCENES[currentSceneId] || SCENES.desert;
  }

  function gearFor(tankOrTeam) {
    const team = typeof tankOrTeam === "string" ? tankOrTeam : tankOrTeam.id;
    return GEAR[selectedGear[team]] || GEAR.standard;
  }

  function maxHealthFor(team) {
    return HIT_LIMIT + gearFor(team).healthBonus;
  }

  function maxAmmoFor(team) {
    return MG_LIMIT + gearFor(team).mgAmmoBonus;
  }

  function createTank(id, options) {
    const gear = gearFor(id);
    return {
      id,
      name: options.name,
      color: options.color,
      dark: options.dark,
      bright: options.bright,
      model: options.model || "tiger",
      x: options.x,
      facing: options.facing,
      elevation: 35,
      mgElevation: 25,
      hits: 0,
      maxHealth: HIT_LIMIT + gear.healthBonus,
      health: HIT_LIMIT + gear.healthBonus,
      maxAmmo: MG_LIMIT + gear.mgAmmoBonus,
      mgAmmo: MG_LIMIT + gear.mgAmmoBonus,
      shellCooldown: 0,
      mgCooldown: 0,
      engineBounce: Math.random() * 10,
      defeated: false,
      zone: options.zone,
    };
  }

  function resetGame(startAfterReset = false) {
    terrainProfile = createTerrainProfile(activeScene());

    redTank = createTank("red", {
      name: "红方",
      color: "#e44a3f",
      dark: "#8d2e2b",
      bright: "#ff8c65",
      model: "tiger",
      x: 270,
      facing: 1,
      zone: [80, WORLD.width - 80],
    });

    blueTank = createTank("blue", {
      name: "蓝方",
      color: "#3a8bea",
      dark: "#1f4d9b",
      bright: "#87c5ff",
      model: "panther",
      x: WORLD.width - 270,
      facing: -1,
      zone: [80, WORLD.width - 80],
    });

    shells.length = 0;
    bullets.length = 0;
    smoke.length = 0;
    sparks.length = 0;
    dust.length = 0;
    powerUps.length = 0;
    gameTime = 0;
    nextSupplyAt = 8;
    winner = null;
    shakeTime = 0;
    shakePower = 0;
    storm.active = false;
    storm.nextAt = activeScene().interval;
    storm.endsAt = 0;
    storm.strength = 0;
    running = startAfterReset;
    ui.startButton.textContent = running ? "暂停" : "开始战斗";
    ui.banner.textContent = running ? "红方 VS 蓝方" : "红方 VS 蓝方";
    ui.banner.classList.toggle("is-hidden", running);
    updateHud();
  }

  function resizeCanvas(targetCanvas, targetCtx) {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_LIMIT);
    const rect = targetCanvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    if (targetCanvas.width !== Math.floor(width * dpr) || targetCanvas.height !== Math.floor(height * dpr)) {
      targetCanvas.width = Math.floor(width * dpr);
      targetCanvas.height = Math.floor(height * dpr);
    }

    targetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function resize() {
    const size = resizeCanvas(canvas, ctx);
    view.width = size.width;
    view.height = size.height;
    view.scale = Math.min(view.width / WORLD.width, view.height / WORLD.height);
    view.ox = (view.width - WORLD.width * view.scale) * 0.5;
    view.oy = (view.height - WORLD.height * view.scale) * 0.5;
    seedStormParticles();
  }

  function seedStormParticles() {
    stormParticles.length = 0;
    const count = Math.max(90, Math.floor((view.width * view.height) / 5600));
    for (let i = 0; i < count; i += 1) {
      stormParticles.push({
        x: Math.random() * view.width,
        y: Math.random() * view.height,
        speed: 220 + Math.random() * 480,
        length: 26 + Math.random() * 110,
        alpha: 0.12 + Math.random() * 0.28,
        width: 1 + Math.random() * 2.3,
      });
    }
  }

  function createTerrainProfile(scene) {
    const config = scene.terrain || SCENES.desert.terrain;
    const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const rand = seededRandom(seed);
    const points = [];
    const startX = -config.spacing * 2;
    const endX = WORLD.width + config.spacing * 2;
    const base = WORLD.height - config.baseOffset;
    let previous = base + (rand() - 0.5) * config.amplitude;

    for (let x = startX; x <= endX; x += config.spacing) {
      const broadShape = sceneTerrainShape(scene.id, x, seed) * config.amplitude;
      const target = base + broadShape + (rand() - 0.5) * config.roughness;
      previous = previous * 0.42 + target * 0.58;
      points.push({ x, y: clamp(previous, WORLD.height - 270, WORLD.height - 84) });
    }

    return {
      seed,
      points,
      spacing: config.spacing,
      micro: config.micro,
      phaseA: rand() * Math.PI * 2,
      phaseB: rand() * Math.PI * 2,
      trackLines: createTerrainDetailLines(rand),
    };
  }

  function sceneTerrainShape(sceneId, x, seed) {
    const phase = (seed % 997) / 997;
    if (sceneId === "desert") {
      return Math.sin(x / 245 + phase * 6) * 0.5 + Math.sin(x / 430 + 1.7) * 0.22;
    }
    if (sceneId === "grass") {
      return Math.sin(x / 310 + phase * 4) * 0.34 + Math.cos(x / 180) * 0.16;
    }
    if (sceneId === "jungle") {
      return Math.sin(x / 125 + phase * 5) * 0.38 + Math.sin(x / 255 + 0.8) * 0.28;
    }
    if (sceneId === "prairie") {
      return Math.sin(x / 520 + phase * 2) * 0.28 + Math.cos(x / 330) * 0.08;
    }
    return Math.sin(x / 96 + phase * 7) * 0.28 + Math.sin(x / 210 + 2.2) * 0.32;
  }

  function createTerrainDetailLines(rand) {
    const lines = [];
    for (let x = -80; x < WORLD.width + 100; x += 115) {
      lines.push({
        x,
        yOffset: randomFrom(rand, 18, 58),
        lift: randomFrom(rand, -6, 6),
        width: randomFrom(rand, 96, 138),
      });
    }
    return lines;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomFrom(rand, min, max) {
    return min + rand() * (max - min);
  }

  function smoothStep(value) {
    return value * value * (3 - 2 * value);
  }

  function terrainY(x) {
    if (!terrainProfile) terrainProfile = createTerrainProfile(activeScene());
    const points = terrainProfile.points;
    if (!points.length) return WORLD.height - 145;

    const clampedX = clamp(x, points[0].x, points[points.length - 1].x - 0.01);
    let index = Math.floor((clampedX - points[0].x) / terrainProfile.spacing);
    index = clamp(index, 0, points.length - 2);
    const left = points[index];
    const right = points[index + 1];
    const t = smoothStep((clampedX - left.x) / (right.x - left.x));
    const large = left.y + (right.y - left.y) * t;
    const fine =
      Math.sin(clampedX / 54 + terrainProfile.phaseA) * terrainProfile.micro +
      Math.sin(clampedX / 29 + terrainProfile.phaseB) * terrainProfile.micro * 0.34;
    return large + fine;
  }

  function terrainSlope(x) {
    return Math.atan2(terrainY(x + 8) - terrainY(x - 8), 16);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function tankY(tank) {
    return terrainY(tank.x) - 29;
  }

  function barrelAngle(tank) {
    const radians = (tank.elevation * Math.PI) / 180;
    return tank.facing === 1 ? -radians : Math.PI + radians;
  }

  function machineGunAngle(tank) {
    const radians = (tank.mgElevation * Math.PI) / 180;
    return tank.facing === 1 ? -radians : Math.PI + radians;
  }

  function barrelBase(tank) {
    return {
      x: tank.x,
      y: tankY(tank) - (tank.model === "panther" ? 38 : 39),
    };
  }

  function cannonLength(tank) {
    return tank.model === "panther" ? 92 : 78;
  }

  function machineGunLength(tank) {
    return tank.model === "panther" ? 58 : 52;
  }

  function barrelMuzzle(tank) {
    const base = barrelBase(tank);
    const angle = barrelAngle(tank);
    const length = cannonLength(tank);
    return {
      x: base.x + Math.cos(angle) * length,
      y: base.y + Math.sin(angle) * length,
      angle,
    };
  }

  function machineGunMuzzle(tank) {
    const base = barrelBase(tank);
    const angle = machineGunAngle(tank);
    const length = machineGunLength(tank);
    return {
      x: base.x + Math.cos(angle) * length,
      y: base.y + 7 + Math.sin(angle) * length,
      angle,
    };
  }

  function getEnemy(tank) {
    return tank.id === "red" ? blueTank : redTank;
  }

  function actionHeld(team, action) {
    return heldActions.has(`${team}:${action}`);
  }

  function updateControls(dt) {
    updateTankFacing();

    const redLeft = keys.has("KeyA") || actionHeld("red", "left");
    const redRight = keys.has("KeyD") || actionHeld("red", "right");
    const redUp = keys.has("KeyW") || actionHeld("red", "barrelUp");
    const redDown = keys.has("KeyS") || actionHeld("red", "barrelDown");
    const redMgUp = keys.has("KeyQ") || actionHeld("red", "mgUp");
    const redMgDown = keys.has("KeyE") || actionHeld("red", "mgDown");
    const blueLeft = keys.has("ArrowLeft") || actionHeld("blue", "left");
    const blueRight = keys.has("ArrowRight") || actionHeld("blue", "right");
    const blueUp = keys.has("ArrowUp") || actionHeld("blue", "barrelUp");
    const blueDown = keys.has("ArrowDown") || actionHeld("blue", "barrelDown");
    const blueMgUp = keys.has("KeyO") || actionHeld("blue", "mgUp");
    const blueMgDown = keys.has("KeyP") || actionHeld("blue", "mgDown");

    moveTank(redTank, (redRight ? 1 : 0) - (redLeft ? 1 : 0), dt);
    moveTank(blueTank, (blueRight ? 1 : 0) - (blueLeft ? 1 : 0), dt);

    if (redUp) redTank.elevation = clamp(redTank.elevation + 45 * dt, 8, 75);
    if (redDown) redTank.elevation = clamp(redTank.elevation - 45 * dt, 8, 75);
    if (redMgUp) redTank.mgElevation = clamp(redTank.mgElevation + 58 * dt, 2, 62);
    if (redMgDown) redTank.mgElevation = clamp(redTank.mgElevation - 58 * dt, 2, 62);
    if (blueUp) blueTank.elevation = clamp(blueTank.elevation + 45 * dt, 8, 75);
    if (blueDown) blueTank.elevation = clamp(blueTank.elevation - 45 * dt, 8, 75);
    if (blueMgUp) blueTank.mgElevation = clamp(blueTank.mgElevation + 58 * dt, 2, 62);
    if (blueMgDown) blueTank.mgElevation = clamp(blueTank.mgElevation - 58 * dt, 2, 62);

    if (keys.has("KeyF") || actionHeld("red", "shell")) fireShell(redTank);
    if (keys.has("KeyG") || actionHeld("red", "mg")) fireMachineGun(redTank);
    if (keys.has("KeyL") || actionHeld("blue", "shell")) fireShell(blueTank);
    if (keys.has("KeyK") || actionHeld("blue", "mg")) fireMachineGun(blueTank);
  }

  function updateTankFacing() {
    if (!redTank || !blueTank) return;
    redTank.facing = blueTank.x >= redTank.x ? 1 : -1;
    blueTank.facing = redTank.x >= blueTank.x ? 1 : -1;
  }

  function moveTank(tank, direction, dt) {
    if (tank.defeated || direction === 0) return;
    const scene = activeScene();
    const weatherFactor = storm.active ? scene.drivePenalty : 1;
    const speed = 122 * weatherFactor;
    tank.x = clamp(tank.x + direction * speed * dt, tank.zone[0], tank.zone[1]);
    tank.engineBounce += dt * 9;

    for (let i = 0; i < 2; i += 1) {
      if (Math.random() < 0.16) {
        dust.push({
          x: tank.x - tank.facing * randomBetween(28, 52) - direction * randomBetween(10, 34),
          y: tankY(tank) + randomBetween(15, 28),
          vx: -direction * randomBetween(16, 42),
          vy: randomBetween(-28, -8),
          r: randomBetween(4, 10),
          life: randomBetween(0.32, 0.62),
          maxLife: 0.62,
        });
      }
    }
  }

  function fireShell(tank) {
    if (!running || tank.defeated || tank.shellCooldown > 0) return;
    const gear = gearFor(tank);
    const muzzle = barrelMuzzle(tank);
    const angle = muzzle.angle + randomBetween(-0.012, 0.012) * gear.shellSpread;
    const speed = 615;
    shells.push({
      x: muzzle.x,
      y: muzzle.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      owner: tank.id,
      life: 4.4,
      trail: 0,
    });
    tank.shellCooldown = gear.shellCooldown;
    addSmoke(muzzle.x - Math.cos(angle) * 18, muzzle.y - Math.sin(angle) * 18, 12, "#3f3b32");
    addShake(0.18, 7);
    playCannonSound();
  }

  function fireMachineGun(tank) {
    if (!running || tank.defeated || tank.mgCooldown > 0 || tank.mgAmmo <= 0) return;
    const gear = gearFor(tank);
    const muzzle = machineGunMuzzle(tank);
    const angle = machineGunAngle(tank) + randomBetween(-0.04, 0.04) * gear.mgSpread;
    const speed = 980;
    bullets.push({
      x: muzzle.x,
      y: muzzle.y,
      px: muzzle.x,
      py: muzzle.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      owner: tank.id,
      life: 1.35,
    });
    tank.mgAmmo -= 1;
    tank.mgCooldown = gear.mgCooldown;
    addSmoke(muzzle.x, muzzle.y, 2, "#d8c199");
    playMachineGunSound();
  }

  function addSmoke(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      smoke.push({
        x: x + randomBetween(-8, 8),
        y: y + randomBetween(-8, 8),
        vx: randomBetween(-28, 28),
        vy: randomBetween(-52, -12),
        r: randomBetween(7, 18),
        life: randomBetween(0.5, 1.1),
        maxLife: 1.1,
        color,
      });
    }
  }

  function addSparks(x, y, count, color = "#ffd679") {
    for (let i = 0; i < count; i += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(90, 280);
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomBetween(0.18, 0.55),
        maxLife: 0.55,
        color,
      });
    }
  }

  function addShake(duration, power) {
    shakeTime = Math.max(shakeTime, duration);
    shakePower = Math.max(shakePower, power);
  }

  function update(dt) {
    if (running && !winner) {
      gameTime += dt;
      updateStorm(dt);
      updateControls(dt);
      updateSupplies(dt);
      updatePowerUps(dt);

      redTank.shellCooldown = Math.max(0, redTank.shellCooldown - dt);
      blueTank.shellCooldown = Math.max(0, blueTank.shellCooldown - dt);
      redTank.mgCooldown = Math.max(0, redTank.mgCooldown - dt);
      blueTank.mgCooldown = Math.max(0, blueTank.mgCooldown - dt);

      updateShells(dt);
      updateBullets(dt);
      checkSupplyPickup(redTank);
      checkSupplyPickup(blueTank);
    } else {
      storm.strength = Math.max(0, storm.strength - dt * 1.6);
      setWindLevel(storm.strength);
    }

    updateParticles(smoke, dt, 0.96);
    updateParticles(dust, dt, 0.88);
    updateSparks(dt);
    updateStormParticles(dt);
    updateHud();

    if (shakeTime > 0) {
      shakeTime = Math.max(0, shakeTime - dt);
      shakePower *= 0.88;
    }
  }

  function updateStorm(dt) {
    const scene = activeScene();
    if (!storm.active && gameTime >= storm.nextAt) {
      storm.active = true;
      storm.endsAt = gameTime + scene.duration;
      storm.nextAt += scene.interval;
      addShake(0.35, 4);
    }

    if (storm.active && gameTime >= storm.endsAt) {
      storm.active = false;
    }

    const target = storm.active ? 1 : 0;
    storm.strength += (target - storm.strength) * Math.min(1, dt * 3.2);
    setWindLevel(storm.strength);
  }

  function updateSupplies(dt) {
    if (gameTime < nextSupplyAt || powerUps.length >= 3) return;
    nextSupplyAt = gameTime + randomBetween(10, 15);
    const types = ["repair", "ammo", "star"];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = randomBetween(170, WORLD.width - 170);
    powerUps.push({
      type,
      x,
      y: terrainY(x) - 32,
      bob: randomBetween(0, Math.PI * 2),
      life: 16,
    });
  }

  function updatePowerUps(dt) {
    for (let i = powerUps.length - 1; i >= 0; i -= 1) {
      powerUps[i].life -= dt;
      if (powerUps[i].life <= 0) powerUps.splice(i, 1);
    }
  }

  function checkSupplyPickup(tank) {
    if (tank.defeated) return;
    for (let i = powerUps.length - 1; i >= 0; i -= 1) {
      const item = powerUps[i];
      const dx = item.x - tank.x;
      const dy = item.y - tankY(tank);
      if (dx * dx + dy * dy > 72 * 72) continue;
      applySupply(tank, item.type);
      addSparks(item.x, item.y, 18, "#fff2a8");
      powerUps.splice(i, 1);
    }
  }

  function applySupply(tank, type) {
    if (type === "repair") {
      tank.health = Math.min(tank.maxHealth, tank.health + 3);
      tank.hits = Math.max(0, tank.maxHealth - tank.health);
    } else if (type === "ammo") {
      tank.mgAmmo = Math.min(tank.maxAmmo, tank.mgAmmo + 10);
    } else {
      scores[tank.id] += 1;
      saveProgress();
      refreshGearButtons();
    }
    playPickupSound();
  }

  function updateShells(dt) {
    for (let i = shells.length - 1; i >= 0; i -= 1) {
      const shell = shells[i];
      shell.life -= dt;
      shell.trail += dt;
      shell.vx += activeScene().wind * storm.strength * dt;
      shell.vy += GRAVITY * dt;
      shell.x += shell.vx * dt;
      shell.y += shell.vy * dt;

      if (shell.trail > 0.026) {
        smoke.push({
          x: shell.x - shell.vx * 0.018,
          y: shell.y - shell.vy * 0.018,
          vx: randomBetween(-8, 8),
          vy: randomBetween(-18, -4),
          r: randomBetween(3, 8),
          life: 0.45,
          maxLife: 0.45,
          color: "#4e473c",
        });
        shell.trail = 0;
      }

      const enemy = shell.owner === "red" ? blueTank : redTank;
      if (!enemy.defeated && pointHitsTank(shell.x, shell.y, enemy, 46)) {
        registerHit(enemy, shell.x, shell.y, "炮弹");
        shells.splice(i, 1);
        continue;
      }

      if (shell.y > terrainY(shell.x) || shell.x < -80 || shell.x > WORLD.width + 80 || shell.life <= 0) {
        explodeGround(shell.x, Math.min(shell.y, terrainY(clamp(shell.x, 0, WORLD.width))));
        shells.splice(i, 1);
      }
    }
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.life -= dt;
      bullet.px = bullet.x;
      bullet.py = bullet.y;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.vx += activeScene().wind * storm.strength * 0.7 * dt;
      bullet.vy += 35 * dt;

      const enemy = bullet.owner === "red" ? blueTank : redTank;
      if (!enemy.defeated && pointHitsTank(bullet.x, bullet.y, enemy, 40)) {
        registerHit(enemy, bullet.x, bullet.y, "机枪");
        bullets.splice(i, 1);
        continue;
      }

      if (bullet.y > terrainY(bullet.x) || bullet.x < -60 || bullet.x > WORLD.width + 60 || bullet.life <= 0) {
        bullets.splice(i, 1);
      }
    }
  }

  function pointHitsTank(x, y, tank, radius) {
    const tx = tank.x;
    const ty = tankY(tank) - 13;
    const dx = (x - tx) / radius;
    const dy = (y - ty) / (radius * 0.72);
    return dx * dx + dy * dy <= 1;
  }

  function registerHit(tank, x, y, weapon) {
    if (tank.defeated) return;
    tank.hits = Math.min(tank.maxHealth, tank.hits + 1);
    tank.health = Math.max(0, tank.maxHealth - tank.hits);
    addSparks(x, y, weapon === "炮弹" ? 34 : 14, weapon === "炮弹" ? "#ffd16a" : "#fff0a3");
    addSmoke(x, y, weapon === "炮弹" ? 18 : 5, weapon === "炮弹" ? "#433a32" : "#6d644c");
    addShake(weapon === "炮弹" ? 0.28 : 0.08, weapon === "炮弹" ? 11 : 3);
    playHitSound(weapon === "炮弹");

    if (tank.health <= 0) {
      tank.defeated = true;
      winner = tank.id === "red" ? blueTank : redTank;
      scores[winner.id] += 3;
      saveProgress();
      refreshGearButtons();
      running = false;
      ui.startButton.textContent = "开始战斗";
      ui.banner.textContent = `${winner.name}胜利`;
      ui.banner.classList.remove("is-hidden");
      addSparks(tank.x, tankY(tank) - 28, 90, "#ffcc63");
      addSmoke(tank.x, tankY(tank) - 26, 46, "#2d2b28");
      playVictorySound();
    }
  }

  function explodeGround(x, y) {
    addSparks(x, y, 20, "#f0bd69");
    addSmoke(x, y, 16, "#6f553a");
    for (let i = 0; i < 18; i += 1) {
      dust.push({
        x,
        y,
        vx: randomBetween(-120, 120),
        vy: randomBetween(-135, -30),
        r: randomBetween(4, 12),
        life: randomBetween(0.45, 0.95),
        maxLife: 0.95,
      });
    }
    addShake(0.16, 5);
    playDirtSound();
  }

  function updateParticles(list, dt, drag) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const p = list[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy = p.vy * drag + 18 * dt;
      p.r += dt * 12;
      if (p.life <= 0) list.splice(i, 1);
    }
  }

  function updateSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const p = sparks[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      if (p.life <= 0) sparks.splice(i, 1);
    }
  }

  function updateStormParticles(dt) {
    if (stormParticles.length === 0) return;
    const scene = activeScene();
    const force = Math.max(0.12, storm.strength);
    for (const p of stormParticles) {
      if (scene.weatherType === "rain") {
        p.x += p.speed * 0.25 * force * dt;
        p.y += p.speed * 1.35 * force * dt;
      } else if (scene.weatherType === "fog") {
        p.x += p.speed * 0.18 * force * dt;
        p.y += Math.sin(gameTime + p.x * 0.01) * force * dt * 24;
      } else if (scene.weatherType === "wind") {
        p.x += p.speed * 1.2 * force * dt;
        p.y += Math.sin(gameTime * 3 + p.x * 0.01) * 28 * force * dt;
      } else if (scene.weatherType === "heat") {
        p.x += p.speed * 0.42 * force * dt;
        p.y += Math.sin(gameTime * 5 + p.x * 0.02) * 55 * force * dt;
      } else {
        p.x += p.speed * force * dt;
        p.y += (p.speed * 0.18 + 18) * force * dt;
      }
      if (p.x > view.width + p.length || p.y > view.height + 20) {
        p.x = -p.length - Math.random() * view.width * 0.18;
        p.y = Math.random() * view.height - 20;
      }
    }
  }

  function draw() {
    const size = resizeCanvas(canvas, ctx);
    if (size.width !== view.width || size.height !== view.height) resize();

    ctx.clearRect(0, 0, view.width, view.height);
    ctx.save();

    const stormShake = storm.strength > 0.05 ? storm.strength * 2.6 : 0;
    const impactShake = shakeTime > 0 ? shakePower * (shakeTime / 0.35) : 0;
    const sx = randomBetween(-impactShake - stormShake, impactShake + stormShake);
    const sy = randomBetween(-impactShake - stormShake, impactShake + stormShake);
    ctx.translate(sx, sy);
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);

    drawWorld(ctx);
    drawAimGuides(ctx, redTank);
    drawAimGuides(ctx, blueTank);
    drawProjectiles(ctx);
    drawTank(ctx, redTank);
    drawTank(ctx, blueTank);
    drawPowerUps(ctx);
    drawWorldParticles(ctx);
    ctx.restore();

    drawStormOverlay(ctx, view.width, view.height, storm.strength, false);
    drawVignette(ctx, view.width, view.height);

    drawCockpit(redCockpitCanvas, redCockpitCtx, redTank, blueTank);
    drawCockpit(blueCockpitCanvas, blueCockpitCtx, blueTank, redTank);
  }

  function drawWorld(target) {
    const scene = activeScene();
    const sky = target.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, scene.sky[0]);
    sky.addColorStop(0.44, scene.sky[1]);
    sky.addColorStop(1, scene.sky[2]);
    target.fillStyle = sky;
    target.fillRect(0, 0, WORLD.width, WORLD.height);

    target.save();
    target.globalAlpha = 0.78;
    target.fillStyle = scene.id === "jungle" ? "rgba(255, 229, 163, 0.44)" : "#ffe5a3";
    target.beginPath();
    target.arc(1280, 118, 58, 0, Math.PI * 2);
    target.fill();
    target.restore();

    drawFarDunes(target, 520, scene.layers[0], 0.72, 0.0021);
    drawFarDunes(target, 590, scene.layers[1], 0.78, 0.0032);
    drawFarDunes(target, 670, scene.layers[2], 0.9, 0.0042);
    drawSceneDetails(target, scene);

    target.fillStyle = scene.ground;
    target.beginPath();
    target.moveTo(0, WORLD.height);
    for (let x = 0; x <= WORLD.width; x += 18) {
      target.lineTo(x, terrainY(x));
    }
    target.lineTo(WORLD.width, WORLD.height);
    target.closePath();
    target.fill();

    target.save();
    target.strokeStyle = scene.track;
    target.lineWidth = 2;
    for (const line of terrainProfile.trackLines) {
      const x = line.x;
      const y = terrainY(x) + line.yOffset;
      target.beginPath();
      target.moveTo(x, y);
      target.quadraticCurveTo(x + line.width * 0.44, y + 18 + line.lift, x + line.width, y - 4);
      target.stroke();
    }
    target.restore();
  }

  function drawSceneDetails(target, scene) {
    if (scene.id === "jungle") {
      for (let x = 40; x < WORLD.width; x += 92) {
        const h = 95 + 32 * Math.sin(x * 0.03);
        const y = terrainY(x) + 4;
        target.fillStyle = "rgba(25, 65, 36, 0.72)";
        target.fillRect(x - 4, y - h, 8, h);
        target.beginPath();
        target.arc(x, y - h * 0.92, h * 0.34, 0, Math.PI * 2);
        target.fill();
        target.fillStyle = "rgba(44, 94, 48, 0.68)";
        target.beginPath();
        target.arc(x + 22, y - h * 0.78, h * 0.25, 0, Math.PI * 2);
        target.fill();
      }
      return;
    }

    if (scene.id === "grass" || scene.id === "prairie") {
      target.save();
      target.strokeStyle = scene.id === "grass" ? "rgba(222, 246, 151, 0.35)" : "rgba(255, 235, 129, 0.28)";
      target.lineWidth = 2;
      for (let x = 20; x < WORLD.width; x += 56) {
        const y = terrainY(x) - 8;
        target.beginPath();
        target.moveTo(x, y + 12);
        target.lineTo(x + Math.sin(x) * 8, y - 18);
        target.stroke();
      }
      target.restore();
      return;
    }

    if (scene.id === "wasteland") {
      target.save();
      target.fillStyle = "rgba(70, 48, 39, 0.7)";
      for (let x = 120; x < WORLD.width; x += 260) {
        const y = terrainY(x) - 16;
        target.beginPath();
        target.moveTo(x - 38, y + 20);
        target.lineTo(x - 8, y - 34);
        target.lineTo(x + 34, y + 18);
        target.closePath();
        target.fill();
      }
      target.restore();
    }
  }

  function drawFarDunes(target, yBase, color, alpha, wave) {
    target.save();
    target.globalAlpha = alpha;
    target.fillStyle = color;
    target.beginPath();
    target.moveTo(0, WORLD.height);
    for (let x = 0; x <= WORLD.width; x += 40) {
      const y = yBase + Math.sin(x * wave + yBase) * 26 + Math.cos(x * wave * 0.72) * 16;
      target.lineTo(x, y);
    }
    target.lineTo(WORLD.width, WORLD.height);
    target.closePath();
    target.fill();
    target.restore();
  }

  function drawTank(target, tank) {
    const y = tankY(tank);
    const slope = terrainSlope(tank.x);
    const defeatedOffset = tank.defeated ? 9 : 0;
    const isPanther = tank.model === "panther";
    const trackWidth = isPanther ? 124 : 136;
    const trackHeight = isPanther ? 31 : 36;
    const wheelStart = isPanther ? -44 : -50;
    const wheelEnd = isPanther ? 44 : 50;
    const wheelStep = isPanther ? 18 : 20;

    target.save();
    target.translate(tank.x, y + defeatedOffset);
    target.rotate(slope);
    target.globalAlpha = tank.defeated ? 0.78 : 1;

    target.fillStyle = "rgba(0, 0, 0, 0.26)";
    target.beginPath();
    target.ellipse(0, 30, trackWidth * 0.55, 13, 0, 0, Math.PI * 2);
    target.fill();

    target.fillStyle = "#253136";
    roundedRect(target, -trackWidth / 2, -2, trackWidth, trackHeight, 15);
    target.fill();

    target.fillStyle = "#161d20";
    roundedRect(target, -trackWidth / 2 + 8, 9, trackWidth - 16, trackHeight - 15, 9);
    target.fill();

    for (let i = wheelStart; i <= wheelEnd; i += wheelStep) {
      target.fillStyle = "#596a6e";
      target.beginPath();
      target.arc(i, 19, isPanther ? 8 : 9, 0, Math.PI * 2);
      target.fill();
      target.fillStyle = "#1b2427";
      target.beginPath();
      target.arc(i, 19, 4, 0, Math.PI * 2);
      target.fill();
    }

    const bodyGradient = target.createLinearGradient(-40, -35, 45, 18);
    bodyGradient.addColorStop(0, tank.bright);
    bodyGradient.addColorStop(0.5, tank.color);
    bodyGradient.addColorStop(1, tank.dark);
    target.fillStyle = bodyGradient;

    if (isPanther) {
      target.beginPath();
      target.moveTo(-57, -20);
      target.lineTo(-26, -38);
      target.lineTo(38, -36);
      target.lineTo(62, -15);
      target.lineTo(49, 7);
      target.lineTo(-54, 7);
      target.closePath();
      target.fill();
      target.fillStyle = "rgba(255,255,255,0.14)";
      target.beginPath();
      target.moveTo(-28, -33);
      target.lineTo(30, -31);
      target.lineTo(43, -20);
      target.lineTo(-43, -21);
      target.closePath();
      target.fill();
      target.strokeStyle = "rgba(25, 30, 32, 0.35)";
      target.lineWidth = 3;
      target.beginPath();
      target.moveTo(-42, -19);
      target.lineTo(44, -18);
      target.stroke();
    } else {
      roundedRect(target, -58, -31, 116, 40, 4);
      target.fill();
      target.fillStyle = "rgba(255,255,255,0.15)";
      roundedRect(target, -45, -26, 68, 8, 2);
      target.fill();
      target.strokeStyle = "rgba(25, 30, 32, 0.32)";
      target.lineWidth = 3;
      target.strokeRect(-51, -26, 102, 27);
      target.fillStyle = "rgba(20, 25, 27, 0.22)";
      target.fillRect(-58, -5, 116, 9);
    }

    target.save();
    target.translate(0, isPanther ? -38 : -39);
    target.fillStyle = tank.color;
    if (isPanther) {
      target.beginPath();
      target.moveTo(-31, -14);
      target.lineTo(-11, -25);
      target.lineTo(33, -19);
      target.lineTo(38, 2);
      target.lineTo(17, 12);
      target.lineTo(-34, 9);
      target.closePath();
      target.fill();
    } else {
      roundedRect(target, -34, -19, 68, 31, 6);
      target.fill();
      target.fillStyle = "rgba(0,0,0,0.2)";
      target.fillRect(-28, -15, 56, 5);
    }
    target.fillStyle = "rgba(0,0,0,0.18)";
    target.fillRect(-21, -9, 17, 4);

    const localAngle = tank.facing === 1 ? -degToRad(tank.elevation) : Math.PI + degToRad(tank.elevation);
    target.save();
    target.rotate(localAngle);
    target.fillStyle = "#29363a";
    roundedRect(target, 8, isPanther ? -4 : -6, cannonLength(tank), isPanther ? 8 : 12, 4);
    target.fill();
    target.fillStyle = "#111719";
    roundedRect(target, cannonLength(tank) - 4, isPanther ? -6 : -8, 18, isPanther ? 12 : 16, 5);
    target.fill();
    target.restore();

    target.save();
    const mgLocalAngle = tank.facing === 1 ? -degToRad(tank.mgElevation) : Math.PI + degToRad(tank.mgElevation);
    target.rotate(mgLocalAngle);
    target.strokeStyle = "#1e292c";
    target.lineWidth = 4;
    target.beginPath();
    target.moveTo(16, 7);
    target.lineTo(machineGunLength(tank), 7);
    target.stroke();
    target.fillStyle = "#111719";
    target.beginPath();
    target.arc(machineGunLength(tank), 7, 3, 0, Math.PI * 2);
    target.fill();
    target.restore();
    target.restore();

    if (tank.defeated) {
      target.strokeStyle = "rgba(20, 20, 20, 0.72)";
      target.lineWidth = 4;
      target.beginPath();
      target.moveTo(-28, -54);
      target.bezierCurveTo(-10, -84, 14, -82, 30, -112);
      target.stroke();
    }

    target.restore();
  }

  function drawAimGuides(target, tank) {
    if (tank.defeated) return;
    target.save();
    target.setLineDash([12, 12]);
    target.lineCap = "round";

    const cannon = barrelMuzzle(tank);
    let x = cannon.x;
    let y = cannon.y;
    let vx = Math.cos(cannon.angle) * 615;
    let vy = Math.sin(cannon.angle) * 615;
    target.strokeStyle = tank.id === "red" ? "rgba(255, 213, 108, 0.48)" : "rgba(159, 217, 255, 0.48)";
    target.lineWidth = 3;
    target.beginPath();
    target.moveTo(x, y);
    for (let i = 0; i < 22; i += 1) {
      vx += activeScene().wind * storm.strength * 0.045;
      vy += GRAVITY * 0.045;
      x += vx * 0.045;
      y += vy * 0.045;
      target.lineTo(x, y);
      if (y > terrainY(x)) break;
    }
    target.stroke();

    const mg = machineGunMuzzle(tank);
    target.setLineDash([7, 10]);
    target.strokeStyle = "rgba(130, 238, 151, 0.42)";
    target.lineWidth = 2;
    target.beginPath();
    target.moveTo(mg.x, mg.y);
    target.lineTo(mg.x + Math.cos(mg.angle) * 420, mg.y + Math.sin(mg.angle) * 420);
    target.stroke();
    target.restore();
  }

  function drawPowerUps(target) {
    for (const item of powerUps) {
      const y = item.y + Math.sin(gameTime * 3 + item.bob) * 7;
      target.save();
      target.translate(item.x, y);
      target.fillStyle = item.type === "repair" ? "#6bd36c" : item.type === "ammo" ? "#e4b642" : "#f5df67";
      target.strokeStyle = "rgba(20, 26, 24, 0.65)";
      target.lineWidth = 4;
      roundedRect(target, -24, -22, 48, 38, 7);
      target.fill();
      target.stroke();
      target.strokeStyle = "#1a2527";
      target.lineWidth = 5;
      target.beginPath();
      if (item.type === "repair") {
        target.moveTo(-12, -3);
        target.lineTo(12, -3);
        target.moveTo(0, -15);
        target.lineTo(0, 9);
      } else if (item.type === "ammo") {
        target.moveTo(-12, -12);
        target.lineTo(-12, 9);
        target.moveTo(0, -12);
        target.lineTo(0, 9);
        target.moveTo(12, -12);
        target.lineTo(12, 9);
      } else {
        target.moveTo(0, -16);
        target.lineTo(6, -2);
        target.lineTo(20, -2);
        target.lineTo(9, 7);
        target.lineTo(13, 20);
        target.lineTo(0, 12);
        target.lineTo(-13, 20);
        target.lineTo(-9, 7);
        target.lineTo(-20, -2);
        target.lineTo(-6, -2);
        target.closePath();
      }
      target.stroke();
      target.restore();
    }
  }

  function drawProjectiles(target) {
    for (const shell of shells) {
      target.save();
      target.translate(shell.x, shell.y);
      target.rotate(Math.atan2(shell.vy, shell.vx));
      target.fillStyle = "#161719";
      roundedRect(target, -10, -5, 20, 10, 5);
      target.fill();
      target.fillStyle = "#e6a84b";
      target.beginPath();
      target.arc(-8, 0, 4, 0, Math.PI * 2);
      target.fill();
      target.restore();
    }

    target.save();
    target.strokeStyle = "rgba(255, 239, 168, 0.88)";
    target.lineWidth = 2.2;
    target.lineCap = "round";
    for (const bullet of bullets) {
      target.beginPath();
      target.moveTo(bullet.px, bullet.py);
      target.lineTo(bullet.x, bullet.y);
      target.stroke();
    }
    target.restore();
  }

  function drawWorldParticles(target) {
    for (const p of smoke) {
      const alpha = clamp(p.life / p.maxLife, 0, 1) * 0.45;
      target.fillStyle = colorWithAlpha(p.color, alpha);
      target.beginPath();
      target.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      target.fill();
    }

    for (const p of dust) {
      const alpha = clamp(p.life / p.maxLife, 0, 1) * 0.34;
      target.fillStyle = `rgba(230, 184, 111, ${alpha})`;
      target.beginPath();
      target.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      target.fill();
    }

    target.save();
    target.lineWidth = 3;
    target.lineCap = "round";
    for (const p of sparks) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      target.strokeStyle = colorWithAlpha(p.color, alpha);
      target.beginPath();
      target.moveTo(p.x, p.y);
      target.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
      target.stroke();
    }
    target.restore();
  }

  function drawStormOverlay(target, width, height, strength, intense) {
    if (strength <= 0.02) return;
    const scene = activeScene();
    const baseAlpha = intense ? 0.58 : 0.32;
    target.save();
    target.globalCompositeOperation = "source-over";

    const tint = target.createLinearGradient(0, 0, width, height);
    if (scene.weatherType === "rain") {
      tint.addColorStop(0, `rgba(72, 120, 153, ${0.28 * strength})`);
      tint.addColorStop(1, `rgba(18, 38, 52, ${0.24 * strength})`);
    } else if (scene.weatherType === "fog") {
      tint.addColorStop(0, `rgba(213, 226, 199, ${0.46 * strength})`);
      tint.addColorStop(1, `rgba(111, 139, 106, ${0.36 * strength})`);
    } else if (scene.weatherType === "wind") {
      tint.addColorStop(0, `rgba(235, 223, 136, ${0.22 * strength})`);
      tint.addColorStop(1, `rgba(124, 144, 78, ${0.2 * strength})`);
    } else if (scene.weatherType === "heat") {
      tint.addColorStop(0, `rgba(239, 170, 95, ${0.24 * strength})`);
      tint.addColorStop(1, `rgba(121, 73, 44, ${0.32 * strength})`);
    } else {
      tint.addColorStop(0, `rgba(216, 164, 84, ${baseAlpha * strength})`);
      tint.addColorStop(0.55, `rgba(231, 190, 117, ${baseAlpha * 0.66 * strength})`);
      tint.addColorStop(1, `rgba(108, 78, 45, ${baseAlpha * 0.42 * strength})`);
    }
    target.fillStyle = tint;
    target.fillRect(0, 0, width, height);

    target.lineCap = "round";
    for (const p of stormParticles) {
      target.globalAlpha = p.alpha * strength * (intense ? 1.55 : 1);
      target.lineWidth = p.width * (intense ? 1.4 : 1);
      if (scene.weatherType === "rain") {
        target.strokeStyle = `rgba(205, 235, 255, ${0.58 * strength})`;
      } else if (scene.weatherType === "fog") {
        target.strokeStyle = `rgba(245, 255, 231, ${0.32 * strength})`;
        target.lineWidth = p.width * 5;
      } else if (scene.weatherType === "wind") {
        target.strokeStyle = `rgba(255, 239, 177, ${0.38 * strength})`;
      } else if (scene.weatherType === "heat") {
        target.strokeStyle = `rgba(255, 202, 135, ${0.26 * strength})`;
      } else {
        target.strokeStyle = `rgba(255, 226, 157, ${0.42 * strength})`;
      }
      target.beginPath();
      target.moveTo(p.x, p.y);
      if (scene.weatherType === "rain") {
        target.lineTo(p.x - p.length * 0.16, p.y - p.length * 0.92);
      } else if (scene.weatherType === "fog") {
        target.lineTo(p.x - p.length * 0.55, p.y + Math.sin(p.x) * 6);
      } else if (scene.weatherType === "heat") {
        target.lineTo(p.x - p.length * 0.2, p.y + Math.sin(gameTime * 5 + p.x) * 14);
      } else {
        target.lineTo(p.x - p.length, p.y - p.length * 0.18);
      }
      target.stroke();
    }

    target.globalAlpha = 1;
    target.restore();
  }

  function drawVignette(target, width, height) {
    const gradient = target.createRadialGradient(
      width * 0.5,
      height * 0.48,
      width * 0.2,
      width * 0.5,
      height * 0.5,
      width * 0.82,
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.28)");
    target.fillStyle = gradient;
    target.fillRect(0, 0, width, height);
  }

  function drawCockpit(targetCanvas, targetCtx, tank, enemy) {
    const size = resizeCanvas(targetCanvas, targetCtx);
    const width = size.width;
    const height = size.height;
    const scene = activeScene();
    const shake = storm.strength * 4 + (shakeTime > 0 ? shakePower * 0.35 : 0);
    const sx = randomBetween(-shake, shake);
    const sy = randomBetween(-shake, shake);

    targetCtx.clearRect(0, 0, width, height);
    targetCtx.save();
    targetCtx.translate(sx, sy);

    const wall = targetCtx.createLinearGradient(0, 0, width, height);
    wall.addColorStop(0, "#1d292e");
    wall.addColorStop(0.45, "#0f1619");
    wall.addColorStop(1, scene.cockpitTint);
    targetCtx.fillStyle = wall;
    targetCtx.fillRect(-8, -8, width + 16, height + 16);

    const viewport = {
      x: width * 0.08,
      y: height * 0.1,
      w: width * 0.84,
      h: height * 0.43,
    };

    targetCtx.save();
    roundedRect(targetCtx, viewport.x - 12, viewport.y - 12, viewport.w + 24, viewport.h + 24, 8);
    targetCtx.fillStyle = "#2e3c3f";
    targetCtx.fill();
    targetCtx.clip();
    targetCtx.fillStyle = "#0d1214";
    targetCtx.fillRect(viewport.x - 12, viewport.y - 12, viewport.w + 24, viewport.h + 24);
    targetCtx.restore();

    targetCtx.save();
    roundedRect(targetCtx, viewport.x, viewport.y, viewport.w, viewport.h, 6);
    targetCtx.clip();
    drawPeriscopeView(targetCtx, viewport, tank, enemy);
    drawCockpitAimAssist(targetCtx, viewport, tank, enemy);
    drawStormOverlay(targetCtx, width, height, storm.strength * 1.35, true);
    targetCtx.restore();

    drawCockpitFrame(targetCtx, width, height, viewport, tank);
    targetCtx.restore();
  }

  function drawPeriscopeView(target, viewport, tank, enemy) {
    const scene = activeScene();
    const horizon = viewport.y + viewport.h * 0.56;
    const sky = target.createLinearGradient(0, viewport.y, 0, viewport.y + viewport.h);
    sky.addColorStop(0, scene.sky[0]);
    sky.addColorStop(0.58, scene.sky[1]);
    sky.addColorStop(1, scene.sky[2]);
    target.fillStyle = sky;
    target.fillRect(viewport.x, viewport.y, viewport.w, viewport.h);

    target.fillStyle = "rgba(255, 219, 144, 0.72)";
    target.beginPath();
    target.arc(viewport.x + viewport.w * 0.74, viewport.y + viewport.h * 0.2, 16, 0, Math.PI * 2);
    target.fill();

    target.fillStyle = scene.ground;
    target.beginPath();
    target.moveTo(viewport.x, viewport.y + viewport.h);
    for (let i = 0; i <= 9; i += 1) {
      const x = viewport.x + (i / 9) * viewport.w;
      const y = horizon + Math.sin(i * 0.9 + gameTime) * 8;
      target.lineTo(x, y);
    }
    target.lineTo(viewport.x + viewport.w, viewport.y + viewport.h);
    target.closePath();
    target.fill();

    const distanceAhead = (enemy.x - tank.x) * tank.facing;
    const enemyScreenX = viewport.x + viewport.w * 0.5 + distanceAhead / 5.2;
    const enemyScale = clamp(1.35 - Math.abs(distanceAhead) / 1100, 0.42, 1.05);
    if (enemyScreenX > viewport.x - 60 && enemyScreenX < viewport.x + viewport.w + 60) {
      target.save();
      target.translate(enemyScreenX, horizon - 8);
      target.scale(enemyScale, enemyScale);
      target.fillStyle = enemy.color;
      roundedRect(target, -32, -20, 64, 24, 6);
      target.fill();
      target.fillStyle = "#232b2e";
      roundedRect(target, -40, 1, 80, 16, 8);
      target.fill();
      target.fillStyle = enemy.dark;
      roundedRect(target, -18, -34, 38, 21, 10);
      target.fill();
      target.strokeStyle = "#182022";
      target.lineWidth = 5;
      target.beginPath();
      target.moveTo(enemy.facing * 8, -25);
      target.lineTo(enemy.facing * 58, -35);
      target.stroke();
      target.restore();
    }

    if (scene.id === "jungle") {
      target.fillStyle = "rgba(25, 70, 36, 0.55)";
      for (let x = viewport.x - 20; x < viewport.x + viewport.w + 20; x += 46) {
        const h = 28 + 16 * Math.sin(x * 0.04);
        target.fillRect(x, horizon - h, 7, h);
        target.beginPath();
        target.arc(x + 3, horizon - h - 8, 17, 0, Math.PI * 2);
        target.fill();
      }
    }
  }

  function drawCockpitAimAssist(target, viewport, tank, enemy) {
    const centerX = viewport.x + viewport.w * 0.5;
    const centerY = viewport.y + viewport.h * 0.5;
    const distanceAhead = (enemy.x - tank.x) * tank.facing;
    const enemyScreenX = viewport.x + viewport.w * 0.5 + distanceAhead / 5.2;

    target.save();
    target.strokeStyle = "rgba(30, 40, 37, 0.78)";
    target.lineWidth = 2;
    target.beginPath();
    target.moveTo(centerX - 30, centerY);
    target.lineTo(centerX + 30, centerY);
    target.moveTo(centerX, centerY - 22);
    target.lineTo(centerX, centerY + 22);
    target.stroke();

    target.setLineDash([7, 7]);
    target.strokeStyle = "rgba(255, 220, 111, 0.72)";
    target.beginPath();
    target.moveTo(centerX - 28, centerY + 16);
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const x = centerX - 28 + t * 110 * tank.facing;
      const y = centerY + 16 - Math.sin(t * Math.PI) * (18 + tank.elevation * 0.18) + t * t * 34;
      target.lineTo(x, y);
    }
    target.stroke();

    target.strokeStyle = "rgba(111, 232, 142, 0.72)";
    target.beginPath();
    target.moveTo(centerX - 26 * tank.facing, centerY + 24);
    target.lineTo(centerX + tank.facing * 112, centerY + 24 - tank.mgElevation * 0.68);
    target.stroke();
    target.setLineDash([]);

    if (enemyScreenX > viewport.x && enemyScreenX < viewport.x + viewport.w) {
      target.strokeStyle = "rgba(255, 92, 82, 0.72)";
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(enemyScreenX, viewport.y + 8);
      target.lineTo(enemyScreenX, viewport.y + viewport.h - 8);
      target.stroke();
      target.fillStyle = "rgba(255, 92, 82, 0.82)";
      target.beginPath();
      target.moveTo(enemyScreenX, viewport.y + 12);
      target.lineTo(enemyScreenX - 8, viewport.y + 25);
      target.lineTo(enemyScreenX + 8, viewport.y + 25);
      target.closePath();
      target.fill();
    }
    target.restore();
  }

  function drawCockpitFrame(target, width, height, viewport, tank) {
    target.strokeStyle = "rgba(0,0,0,0.58)";
    target.lineWidth = 14;
    roundedRect(target, viewport.x - 7, viewport.y - 7, viewport.w + 14, viewport.h + 14, 10);
    target.stroke();

    target.fillStyle = "#131b1e";
    roundedRect(target, width * 0.06, height * 0.62, width * 0.88, height * 0.3, 8);
    target.fill();

    target.fillStyle = "#26343a";
    roundedRect(target, width * 0.11, height * 0.68, width * 0.23, height * 0.17, 7);
    target.fill();
    drawGauge(target, width * 0.225, height * 0.765, Math.PI * (0.15 + tank.health / tank.maxHealth * 0.7), tank.color);

    target.fillStyle = "#26343a";
    roundedRect(target, width * 0.39, height * 0.68, width * 0.23, height * 0.17, 7);
    target.fill();
    drawAmmoBars(target, width * 0.425, height * 0.72, width * 0.16, height * 0.08, tank.mgAmmo / tank.maxAmmo);

    target.fillStyle = "#26343a";
    roundedRect(target, width * 0.67, height * 0.68, width * 0.22, height * 0.17, 7);
    target.fill();
    drawAngleDial(target, width * 0.78, height * 0.765, tank.elevation, tank.color);

    target.fillStyle = "rgba(255, 233, 177, 0.88)";
    target.font = "700 12px sans-serif";
    target.textAlign = "center";
    target.fillText(`${tank.health}/${tank.maxHealth}`, width * 0.225, height * 0.85);
    target.fillText(`${tank.mgAmmo}/${tank.maxAmmo}`, width * 0.505, height * 0.85);
    target.fillText(`炮${Math.round(tank.elevation)} 机${Math.round(tank.mgElevation)}`, width * 0.78, height * 0.85);

    target.fillStyle = "#38474a";
    for (let x = width * 0.09; x <= width * 0.91; x += width * 0.08) {
      target.beginPath();
      target.arc(x, height * 0.58, 3.4, 0, Math.PI * 2);
      target.fill();
    }

    target.fillStyle = "rgba(255,255,255,0.12)";
    target.fillRect(viewport.x + viewport.w * 0.08, viewport.y + 8, viewport.w * 0.26, 3);
  }

  function drawGauge(target, x, y, angle, color) {
    target.save();
    target.strokeStyle = "rgba(255,255,255,0.2)";
    target.lineWidth = 8;
    target.beginPath();
    target.arc(x, y, 25, Math.PI * 0.2, Math.PI * 0.8, false);
    target.stroke();
    target.strokeStyle = color;
    target.lineWidth = 8;
    target.beginPath();
    target.arc(x, y, 25, Math.PI * 0.8, angle, true);
    target.stroke();
    target.restore();
  }

  function drawAmmoBars(target, x, y, w, h, ratio) {
    target.fillStyle = "rgba(0,0,0,0.34)";
    roundedRect(target, x, y, w, h, 4);
    target.fill();
    target.fillStyle = ratio > 0.25 ? "#77c76b" : "#e7a931";
    roundedRect(target, x + 3, y + 3, Math.max(3, (w - 6) * ratio), h - 6, 3);
    target.fill();
  }

  function drawAngleDial(target, x, y, elevation, color) {
    target.save();
    target.strokeStyle = "rgba(255,255,255,0.2)";
    target.lineWidth = 7;
    target.beginPath();
    target.arc(x, y, 25, Math.PI * 0.85, Math.PI * 1.85);
    target.stroke();
    target.translate(x, y);
    target.rotate(-degToRad(elevation));
    target.strokeStyle = color;
    target.lineWidth = 4;
    target.beginPath();
    target.moveTo(0, 0);
    target.lineTo(28, 0);
    target.stroke();
    target.restore();
  }

  function roundedRect(target, x, y, w, h, r) {
    const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    target.beginPath();
    target.moveTo(x + radius, y);
    target.lineTo(x + w - radius, y);
    target.quadraticCurveTo(x + w, y, x + w, y + radius);
    target.lineTo(x + w, y + h - radius);
    target.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    target.lineTo(x + radius, y + h);
    target.quadraticCurveTo(x, y + h, x, y + h - radius);
    target.lineTo(x, y + radius);
    target.quadraticCurveTo(x, y, x + radius, y);
  }

  function degToRad(value) {
    return (value * Math.PI) / 180;
  }

  function colorWithAlpha(hex, alpha) {
    const normalized = hex.replace("#", "");
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function updateHud() {
    const scene = activeScene();
    ui.redHealth.style.width = `${(redTank.health / redTank.maxHealth) * 100}%`;
    ui.blueHealth.style.width = `${(blueTank.health / blueTank.maxHealth) * 100}%`;
    ui.redHits.textContent = `命中 ${redTank.hits}/${redTank.maxHealth}`;
    ui.blueHits.textContent = `命中 ${blueTank.hits}/${blueTank.maxHealth}`;
    ui.redAmmo.textContent = `机枪 ${redTank.mgAmmo}/${redTank.maxAmmo}`;
    ui.blueAmmo.textContent = `机枪 ${blueTank.mgAmmo}/${blueTank.maxAmmo}`;
    ui.redAngle.textContent = `炮 ${Math.round(redTank.elevation)}° · 机 ${Math.round(redTank.mgElevation)}°`;
    ui.blueAngle.textContent = `炮 ${Math.round(blueTank.elevation)}° · 机 ${Math.round(blueTank.mgElevation)}°`;
    ui.redScore.textContent = `积分 ${scores.red}`;
    ui.blueScore.textContent = `积分 ${scores.blue}`;
    ui.redGearName.textContent = `装备 ${gearFor("red").name}`;
    ui.blueGearName.textContent = `装备 ${gearFor("blue").name}`;

    const stormSeconds = Math.max(0, Math.ceil(storm.nextAt - gameTime));
    ui.stormStatus.classList.remove("weather-rain", "weather-fog", "weather-wind", "weather-heat");
    if (scene.weatherClass) ui.stormStatus.classList.add(scene.weatherClass);
    if (storm.active) {
      ui.stormStatus.textContent = `${scene.weatherName}来袭`;
      ui.stormStatus.classList.add("is-active");
    } else {
      ui.stormStatus.textContent = `${scene.weatherName} ${stormSeconds} 秒后`;
      ui.stormStatus.classList.remove("is-active");
    }
  }

  function refreshGearButtons() {
    document.querySelectorAll(".gear-row").forEach((row) => {
      const team = row.dataset.team;
      row.querySelectorAll("button[data-gear]").forEach((button) => {
        const gear = GEAR[button.dataset.gear];
        const locked = scores[team] < gear.unlock;
        button.classList.toggle("is-active", selectedGear[team] === gear.id);
        button.classList.toggle("is-locked", locked);
        button.disabled = locked;
        button.textContent = locked ? `${gear.name} ${gear.unlock}` : gear.name;
      });
    });
  }

  function refreshSceneButtons() {
    document.querySelectorAll(".scene-tabs button[data-scene]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.scene === currentSceneId);
    });
  }

  function selectGear(team, gearId) {
    const gear = GEAR[gearId];
    if (!gear || scores[team] < gear.unlock) return;
    selectedGear[team] = gearId;
    resetGame(running);
    refreshGearButtons();
  }

  function setScene(sceneId) {
    if (!SCENES[sceneId] || sceneId === currentSceneId) return;
    currentSceneId = sceneId;
    refreshSceneButtons();
    resetGame(running);
    seedStormParticles();
  }

  function createAudio() {
    if (audio) return audio;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.58;
    master.connect(context.destination);

    const windGain = context.createGain();
    windGain.gain.value = 0;
    const windFilter = context.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 470;
    windFilter.Q.value = 0.52;
    const windBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = windBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const windSource = context.createBufferSource();
    windSource.buffer = windBuffer;
    windSource.loop = true;
    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSource.start();

    audio = { context, master, windGain };
    return audio;
  }

  function ensureAudio() {
    const engine = createAudio();
    if (engine && engine.context.state === "suspended") {
      engine.context.resume();
    }
    return engine;
  }

  function setWindLevel(level) {
    if (!audio) return;
    const now = audio.context.currentTime;
    audio.windGain.gain.cancelScheduledValues(now);
    audio.windGain.gain.linearRampToValueAtTime(level * 0.15, now + 0.16);
  }

  function playCannonSound() {
    const engine = ensureAudio();
    if (!engine) return;
    const now = engine.context.currentTime;
    const osc = engine.context.createOscillator();
    const gain = engine.context.createGain();
    const filter = engine.context.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(86, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.18);
    filter.type = "lowpass";
    filter.frequency.value = 360;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.72, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(engine.master);
    osc.start(now);
    osc.stop(now + 0.4);
    playNoiseBurst(0.28, 0.38, 220);
  }

  function playMachineGunSound() {
    const engine = ensureAudio();
    if (!engine) return;
    const now = engine.context.currentTime;
    const osc = engine.context.createOscillator();
    const gain = engine.context.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(154, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.062);
    osc.connect(gain);
    gain.connect(engine.master);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  function playHitSound(big) {
    const engine = ensureAudio();
    if (!engine) return;
    const now = engine.context.currentTime;
    const osc = engine.context.createOscillator();
    const gain = engine.context.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(big ? 72 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(big ? 28 : 120, now + (big ? 0.22 : 0.09));
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(big ? 0.58 : 0.24, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (big ? 0.34 : 0.13));
    osc.connect(gain);
    gain.connect(engine.master);
    osc.start(now);
    osc.stop(now + (big ? 0.36 : 0.15));
    if (big) playNoiseBurst(0.18, 0.26, 520);
  }

  function playDirtSound() {
    playNoiseBurst(0.09, 0.12, 430);
  }

  function playPickupSound() {
    const engine = ensureAudio();
    if (!engine) return;
    const now = engine.context.currentTime;
    [520, 660].forEach((freq, index) => {
      const osc = engine.context.createOscillator();
      const gain = engine.context.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + index * 0.045;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
      osc.connect(gain);
      gain.connect(engine.master);
      osc.start(start);
      osc.stop(start + 0.14);
    });
  }

  function playVictorySound() {
    const engine = ensureAudio();
    if (!engine) return;
    const now = engine.context.currentTime;
    [262, 330, 392].forEach((freq, index) => {
      const osc = engine.context.createOscillator();
      const gain = engine.context.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const start = now + index * 0.13;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(engine.master);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  function playNoiseBurst(volume, duration, cutoff) {
    const engine = ensureAudio();
    if (!engine) return;
    const now = engine.context.currentTime;
    const buffer = engine.context.createBuffer(1, Math.floor(engine.context.sampleRate * duration), engine.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = engine.context.createBufferSource();
    const filter = engine.context.createBiquadFilter();
    const gain = engine.context.createGain();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(engine.master);
    source.start(now);
  }

  function toggleRunning() {
    ensureAudio();
    if (winner) {
      resetGame(true);
      return;
    }
    running = !running;
    ui.startButton.textContent = running ? "暂停" : "继续";
    ui.banner.classList.toggle("is-hidden", running);
    if (!running) ui.banner.textContent = "暂停";
  }

  function attachEvents() {
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", (event) => {
      keys.add(event.code);
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener("keyup", (event) => {
      keys.delete(event.code);
    });

    ui.startButton.addEventListener("click", toggleRunning);
    ui.resetButton.addEventListener("click", () => {
      ensureAudio();
      resetGame(true);
    });

    document.querySelectorAll(".scene-tabs button[data-scene]").forEach((button) => {
      button.addEventListener("click", () => {
        ensureAudio();
        setScene(button.dataset.scene);
      });
    });

    document.querySelectorAll(".gear-row button[data-gear]").forEach((button) => {
      const row = button.closest(".gear-row");
      button.addEventListener("click", () => {
        ensureAudio();
        selectGear(row.dataset.team, button.dataset.gear);
      });
    });

    document.querySelectorAll(".control-pad button").forEach((button) => {
      const pad = button.closest(".control-pad");
      const team = pad.dataset.team;
      const action = button.dataset.action;
      const key = `${team}:${action}`;

      const hold = (event) => {
        event.preventDefault();
        ensureAudio();
        heldActions.add(key);
        button.classList.add("is-held");
        if (action === "shell" || action === "mg") {
          fireInstantAction(team, action);
        }
      };
      const release = () => {
        heldActions.delete(key);
        button.classList.remove("is-held");
      };

      button.addEventListener("pointerdown", hold);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointerleave", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
  }

  function fireInstantAction(team, action) {
    const tank = team === "red" ? redTank : blueTank;
    if (action === "shell") fireShell(tank);
    if (action === "mg") fireMachineGun(tank);
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  attachEvents();
  resetGame(false);
  refreshSceneButtons();
  refreshGearButtons();
  resize();
  requestAnimationFrame(loop);
})();
