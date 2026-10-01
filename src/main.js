import { createWorld } from "./world.js?v=3";
import { Player } from "./player.js?v=3";

const canvas = document.getElementById("renderCanvas");
const coordinateLabel = document.getElementById("coords");
const fpsLabel = document.getElementById("fps");
const stateLabel = document.getElementById("state-label");

function startGame() {
  if (!window.BABYLON) throw new Error("Babylon.js could not be loaded from the CDN");
  const B = window.BABYLON;
  if (!B.Engine.isSupported()) throw new Error("WebGL is unavailable in this browser");

  const engine = new B.Engine(canvas, true, { stencil: true }, false);
  const scene = new B.Scene(engine);
  const world = createWorld(scene);
  const player = new Player(scene, world);

  // Fixed, high three-quarter orthographic camera: low-poly raid-game silhouette.
  // It follows the Mage, but does not bob up/down during a jump.
  const offset = new B.Vector3(0, 35, -26);
  const focus = new B.Vector3(player.root.position.x, 0, player.root.position.z);
  const camera = new B.FreeCamera("three-quarter-camera", focus.add(offset), scene);
  camera.setTarget(focus);
  camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 0.1;
  camera.maxZ = 170;
  scene.activeCamera = camera;

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
    "ShiftLeft", "ShiftRight", "Space", "KeyR"
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
  engine.runRenderLoop(() => {
    try {
      const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
      player.update(dt, held, pressed);
      pressed.clear();
      world.update(dt);

      const goal = new B.Vector3(player.root.position.x, 0, player.root.position.z);
      B.Vector3.LerpToRef(focus, goal, Math.min(1, dt * 4.3), focus);
      camera.position.copyFrom(focus.add(offset));
      camera.setTarget(focus);
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
        stateLabel.textContent = player.height > 0 ? "JUMPING" :
          player.isSprinting ? "SPRINTING" : player.isMoving ? "WALKING" : "IDLE";
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
