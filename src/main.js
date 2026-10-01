import { createWorld } from "./world.js";
import { Player } from "./player.js";

const canvas = document.getElementById("renderCanvas");
const errorPanel = document.getElementById("error");
const coordinateLabel = document.getElementById("coords");
const fpsLabel = document.getElementById("fps");

function startGame() {
  if (!window.BABYLON) throw new Error("Babylon.js could not be loaded");
  const B = window.BABYLON;
  if (!B.Engine.isSupported()) throw new Error("WebGL is unavailable");

  const engine = new B.Engine(canvas, true, { stencil: true }, true);
  const scene = new B.Scene(engine);
  const world = createWorld(scene);
  const player = new Player(scene, world);

  // A fixed-angle camera keeps WASD intuitive: W moves away, D moves right.
  const camera = new B.ArcRotateCamera(
    "follow-camera",
    -Math.PI / 2,
    1.05,
    22,
    new B.Vector3(0, 1.1, 0),
    scene
  );
  camera.fov = 0.79;
  camera.minZ = 0.1;
  camera.maxZ = 160;
  scene.activeCamera = camera;

  const held = new Set();
  const pressed = new Set();
  const controlled = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight",
    "ShiftLeft", "ShiftRight", "Space", "KeyJ", "KeyR"
  ]);

  window.addEventListener("keydown", event => {
    if (!controlled.has(event.code)) return;
    event.preventDefault();
    held.add(event.code);
    if (!event.repeat) pressed.add(event.code);
  });
  window.addEventListener("keyup", event => held.delete(event.code));
  window.addEventListener("blur", () => { held.clear(); pressed.clear(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { held.clear(); pressed.clear(); }
  });
  canvas.addEventListener("wheel", event => {
    event.preventDefault();
    camera.radius = Math.min(32, Math.max(12, camera.radius + Math.sign(event.deltaY) * 1.4));
  }, { passive: false });

  let hudTimer = 0;
  engine.runRenderLoop(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    player.update(dt, held, pressed);
    pressed.clear();
    world.update(dt);

    const target = player.root.position.add(new B.Vector3(0, 1.15, 0));
    camera.target.copyFrom(B.Vector3.Lerp(camera.target, target, Math.min(1, dt * 5.5)));
    scene.render();

    hudTimer += dt;
    if (hudTimer > 0.2) {
      hudTimer = 0;
      coordinateLabel.textContent = "X: " + player.root.position.x.toFixed(1) + "   Z: " + player.root.position.z.toFixed(1);
      fpsLabel.textContent = Math.round(engine.getFps()) + " FPS";
    }
  });
  window.addEventListener("resize", () => engine.resize());
}

try {
  startGame();
} catch (error) {
  console.error("3D playground initialization failed:", error);
  errorPanel.hidden = false;
}
