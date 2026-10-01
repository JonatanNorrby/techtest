import { createWorld } from "./world.js?v=7";
import { BossEncounter } from "./boss.js?v=7";
import { MageCombat, SPELLS } from "./combat.js?v=7";
import { Player } from "./player.js?v=7";

const canvas = document.getElementById("renderCanvas");
const coordinateLabel = document.getElementById("coords");
const fpsLabel = document.getElementById("fps");
const stateLabel = document.getElementById("state-label");
const healthFill = document.getElementById("mage-health-fill");
const healthText = document.getElementById("mage-hp");
const castFill = document.getElementById("boss-cast-fill");
const castState = document.getElementById("boss-phase");
const castValue = document.getElementById("boss-value");
const castInstruction = document.getElementById("boss-mechanic");
const damageFlash = document.getElementById("damage-flash");
const hitNotice = document.getElementById("hit-notice");
const defeatOverlay = document.getElementById("defeat-overlay");
const victoryOverlay = document.getElementById("victory-overlay");
const bossHealthFill = document.getElementById("boss-health-fill");
const bossHealthValue = document.getElementById("boss-health-value");
const shieldFill = document.getElementById("mage-shield-fill");
const shieldValue = document.getElementById("mage-shield-value");
const castNotice = document.getElementById("cast-notice");
const abilityButtons = Object.fromEntries(SPELLS.map(spell => [
  spell.id, document.querySelector('[data-spell="' + spell.id + '"]')
]));
const abilityCooldowns = Object.fromEntries(SPELLS.map(spell => [
  spell.id, document.getElementById("cooldown-" + spell.id)
]));

function startGame() {
  if (!window.BABYLON) throw new Error("Babylon.js could not be loaded from the CDN");
  const B = window.BABYLON;
  if (!B.Engine.isSupported()) throw new Error("WebGL is unavailable in this browser");

  const engine = new B.Engine(canvas, true, { stencil: true, preserveDrawingBuffer: false }, true);
  // Aim for crisp rendering on dense displays, capped for reasonable GPU load.
  engine.setHardwareScalingLevel(Math.max(1, (window.devicePixelRatio || 1) / 1.5));
  const scene = new B.Scene(engine);
  // The demo has no pointer picking; skip unnecessary per-frame hit tests.
  scene.skipPointerMovePicking = true;
  const world = createWorld(scene);
  const player = new Player(scene, world);
  world.setPlayer(player);
  const encounter = new BossEncounter(scene, player);
  const combat = new MageCombat(scene, player, encounter);
  for (const spell of SPELLS) {
    abilityButtons[spell.id].addEventListener("click", () => combat.cast(spell.id));
  }

  // Fixed, high three-quarter orthographic camera: low-poly raid-game silhouette.
  // It follows the Mage, but does not bob up/down during a jump.
  const offset = new B.Vector3(0, 35, -26);
  const focus = new B.Vector3(player.root.position.x, 0, player.root.position.z);
  const goal = new B.Vector3(focus.x, 0, focus.z);
  const camera = new B.FreeCamera("three-quarter-camera", focus.add(offset), scene);
  camera.setTarget(focus);
  camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 170;
  scene.activeCamera = camera;

  // These optional visual passes are isolated so unsupported GPU features
  // cannot prevent movement or leave the test as a static HTML page.
  try {
    const settings = scene.imageProcessingConfiguration;
    settings.contrast = 1.15;
    settings.exposure = 1.08;
    settings.toneMappingEnabled = true;
    if (B.DefaultRenderingPipeline) {
      const pipeline = new B.DefaultRenderingPipeline("cinematic-fantasy", true, scene, [camera]);
      pipeline.fxaaEnabled = true;
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = .68;
      pipeline.bloomWeight = .22;
      pipeline.bloomKernel = 48;
    }
  } catch (e) { console.warn("Optional post-processing unavailable:", e); }
  try {
    if (B.GlowLayer) {
      const glow = new B.GlowLayer("lava-and-magic-glow", scene, { blurKernelSize: 32 });
      glow.intensity = .31;
      for (const mesh of scene.meshes) {
        if (/lava|ember|hot|eye-glow|flame|spark|core|magic|beam|halo|warning|rune-tick|staff-flame|fissure/i.test(mesh.name)) {
          glow.addIncludedOnlyMesh(mesh);
        }
      }
    }
  } catch (e) { console.warn("Optional glow unavailable:", e); }
  try {
    if (B.ShadowGenerator) {
      const shadows = new B.ShadowGenerator(1024, world.lighting.sun);
      shadows.useBlurExponentialShadowMap = true;
      shadows.blurKernel = 14;
      for (const mesh of scene.meshes) {
        if (/^(sentinel-|Mage-|Priest-|Warrior-|Shaman-)/.test(mesh.name) &&
            !/plate-material|nameplate|selection|rune-tick|eye|fissure|heart|magic|spark|glow/.test(mesh.name)) {
          shadows.addShadowCaster(mesh);
        }
        if (/paver|arena-floor/.test(mesh.name)) mesh.receiveShadows = true;
      }
      world.lighting.ground.receiveShadows = true;
    }
  } catch (e) { console.warn("Optional shadows unavailable:", e); }

  let halfHeight = 16.5;
  function sizeCamera() {
    engine.resize();
    const ratio = Math.max(0.5, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    const height = window.innerWidth < 690 ? Math.max(18.5, halfHeight) : halfHeight;
    camera.orthoTop = height;
    camera.orthoBottom = -height;
    camera.orthoLeft = -height * ratio;
    camera.orthoRight = height * ratio;
  }
  sizeCamera();
  window.addEventListener("resize", sizeCamera);

  const held = new Set();
  const pressed = new Set();
  const controlled = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "ShiftLeft", "ShiftRight", "Space", "KeyR",
    ...SPELLS.map(spell => spell.key)
  ]);
  window.addEventListener("keydown", event => {
    if (!controlled.has(event.code)) return;
    event.preventDefault();
    held.add(event.code);
    if (!event.repeat) pressed.add(event.code);
  });
  window.addEventListener("keyup", event => held.delete(event.code));
  function clearKeys() { held.clear(); pressed.clear(); }
  window.addEventListener("blur", clearKeys);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearKeys(); });
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    halfHeight = Math.max(11.5, Math.min(21.5, halfHeight + Math.sign(event.deltaY) * 1.0));
    sizeCamera();
  }, { passive: false });

  let hudTime = 0;
  let noticeTime = 0;
  let lastDamage = null;
  engine.runRenderLoop(() => {
    try {
      const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
      // R restarts both the player's health and the boss's attack sequence.
      if (pressed.has("KeyR")) {
        encounter.reset();
        combat.reset();
        lastDamage = null;
        noticeTime = 0;
        hitNotice.classList.remove("visible");
      }
      player.update(dt, held, pressed);
      for (const spell of SPELLS) {
        if (pressed.has(spell.key)) combat.cast(spell.id);
      }
      pressed.clear();
      world.update(dt);
      combat.update(dt);
      encounter.update(dt);
      damageFlash.style.opacity = String(Math.min(.8, player.hurtFlash * 1.5));
      defeatOverlay.hidden = !player.dead;
      victoryOverlay.hidden = !encounter.defeated;
      if (player.lastDamage && player.lastDamage !== lastDamage) {
        lastDamage = player.lastDamage;
        hitNotice.textContent = lastDamage.amount > 0
          ? "-" + lastDamage.amount + " HP · " + lastDamage.source +
            (lastDamage.absorbed ? " (" + lastDamage.absorbed + " blocked)" : "")
          : "BLOCKED " + lastDamage.absorbed + " · " + lastDamage.source;
        hitNotice.classList.add("visible");
        noticeTime = 1.2;
      }
      noticeTime = Math.max(0, noticeTime - dt);
      if (!noticeTime) hitNotice.classList.remove("visible");

      goal.set(player.root.position.x, 0, player.root.position.z);
      B.Vector3.LerpToRef(focus, goal, Math.min(1, dt * 4.3), focus);
      // Orthographic view has a fixed angle: translating the camera with
      // the player is enough; recalculating rotation each frame is redundant.
      camera.position.set(focus.x + offset.x, focus.y + offset.y, focus.z + offset.z);
      scene.render();

      if (!window.techtestReady) {
        window.techtestReady = true;
        document.body.classList.add("is-ready");
        document.getElementById("boot-status").textContent = "LIVE";
        document.getElementById("error").hidden = true;
      }

      hudTime += dt;
      if (hudTime >= 0.12) {
        hudTime = 0;
        coordinateLabel.textContent =
          "X: " + player.root.position.x.toFixed(1) +
          "   Y: " + player.root.position.y.toFixed(1) +
          "   Z: " + player.root.position.z.toFixed(1);
        fpsLabel.textContent = Math.round(engine.getFps()) + " FPS";
        healthText.textContent = player.hp + " / " + player.maxHp + " HP";
        healthFill.style.width = (player.hp / player.maxHp * 100) + "%";
        shieldFill.style.width = (player.shield / 40 * 100) + "%";
        shieldValue.textContent = "SHIELD " + Math.ceil(player.shield);
        bossHealthFill.style.width = (encounter.hp / encounter.maxHp * 100) + "%";
        bossHealthValue.textContent = encounter.hp + " / " + encounter.maxHp + " HP";
        stateLabel.textContent = encounter.defeated ? "VICTORY · PRESS R" :
          player.dead ? "DEFEATED · PRESS R" :
          player.height > 0 ? "JUMPING" :
          player.isSprinting ? "SPRINTING" : player.isMoving ? "WALKING" : "IDLE";
        castInstruction.textContent = encounter.statusText;
        castFill.style.width = (encounter.progress * 100) + "%";
        castState.textContent = encounter.state === "warning" ? encounter.active.name.toUpperCase() :
          encounter.state === "impact" ? "IMPACT" :
          encounter.defeated ? "RAVENGAR DEFEATED" :
          encounter.state === "defeated" ? "ENCOUNTER FAILED" : "RECOVERING";
        castValue.textContent = encounter.state === "warning" ?
          Math.max(0, encounter.time).toFixed(1) + "s" : encounter.state === "impact" ?
          "HIT!" : encounter.defeated ? "WIN" :
          encounter.state === "defeated" ? "0 HP" : "READY";
        castNotice.textContent = combat.feedback;
        castNotice.classList.toggle("visible",
          combat.feedbackTime > 0 && !player.dead && !encounter.defeated);
        for (const spell of SPELLS) {
          const remaining = combat.cooldowns[spell.id];
          const overlay = abilityCooldowns[spell.id];
          overlay.hidden = remaining <= 0;
          overlay.textContent = remaining >= 10 ? Math.ceil(remaining) : remaining.toFixed(1);
          abilityButtons[spell.id].disabled = player.dead || encounter.defeated ||
            remaining > 0 || combat.globalCooldown > 0;
        }
      }
    } catch (error) {
      engine.stopRenderLoop();
      window.techtestReady = false;
      window.techtestError("Render loop: " + (error.message || String(error)));
      console.error(error);
    }
  });
}

try {
  startGame();
} catch (error) {
  console.error("3D playground startup failed:", error);
  window.techtestError(error.message || String(error));
}
