// All demo scenery is built from Babylon.js primitives — no model downloads needed.
const B = window.BABYLON;

function material(scene, name, color, glow = null) {
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = B.Color3.FromHexString(color);
  mat.specularColor = B.Color3.FromHexString("#263b3b").scale(0.15);
  if (glow) mat.emissiveColor = B.Color3.FromHexString(glow);
  return mat;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createWorld(scene) {
  const random = seededRandom(2701);
  const colliders = [];
  const animations = [];

  scene.clearColor = new B.Color4(0.65, 0.79, 0.82, 1);
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.006;
  scene.fogColor = new B.Color3(0.65, 0.79, 0.82);

  const ambient = new B.HemisphericLight("sky-light", new B.Vector3(0, 1, 0), scene);
  ambient.intensity = 0.82;
  ambient.groundColor = B.Color3.FromHexString("#617266");
  const sun = new B.DirectionalLight("sun", new B.Vector3(-0.6, -1, 0.45), scene);
  sun.intensity = 1.05;
  sun.diffuse = B.Color3.FromHexString("#ffe4b4");

  const grass = material(scene, "grass", "#84aa78");
  const side = material(scene, "earth", "#4d6155");
  const dirt = material(scene, "trail", "#b4ad82");
  const grassPatch = material(scene, "grass-patches", "#779c70");
  const trunk = material(scene, "bark", "#705d4a");
  const leaves = [
    material(scene, "leaf-dark", "#386d5a"),
    material(scene, "leaf-mid", "#497f63"),
    material(scene, "leaf-light", "#669773"),
  ];
  const stone = material(scene, "stones", "#879995");
  const stoneLight = material(scene, "light-stones", "#a4b1a3");
  const wood = material(scene, "crate-wood", "#9b7656");
  const trim = material(scene, "crate-trim", "#564d47");
  const crystalMat = material(scene, "crystal", "#4aceb9", "#16847a");
  const portalMat = material(scene, "portal-frame", "#9782c6", "#6444b8");
  const portalFieldMat = material(scene, "portal-field", "#7864c6", "#5443a8");
  portalFieldMat.alpha = 0.52;
  portalFieldMat.backFaceCulling = false;

  const foundation = B.MeshBuilder.CreateBox("island-base", { width: 80, depth: 80, height: 0.7 }, scene);
  foundation.position.y = -0.39;
  foundation.material = side;
  const ground = B.MeshBuilder.CreateGround("ground", { width: 80, height: 80 }, scene);
  ground.position.y = -0.02;
  ground.material = grass;

  // A clearly visible diagonal trail leads from the spawn to the portal.
  for (let i = 0; i < 19; i++) {
    const t = i / 18;
    const tile = B.MeshBuilder.CreateDisc("trail-stone", { radius: 0.76 + random() * 0.2, tessellation: 7 }, scene);
    tile.rotation.x = Math.PI / 2;
    tile.rotation.z = random() * Math.PI;
    tile.position.set(t * 14, 0.005 + i * 0.0001, t * 14);
    tile.material = dirt;
  }

  for (let i = 0; i < 24; i++) {
    const patch = B.MeshBuilder.CreateDisc("ground-patch", { radius: 1 + random() * 2, tessellation: 12 }, scene);
    patch.rotation.x = Math.PI / 2;
    patch.position.set((random() - 0.5) * 73, -0.005, (random() - 0.5) * 73);
    patch.scaling.x = 0.5 + random();
    patch.material = grassPatch;
  }

  function placeable(x, z) {
    if (Math.hypot(x, z) < 6) return false;
    if (Math.hypot(x - 14, z - 14) < 6.2) return false;
    if (x > -1 && z > -1 && x < 17 && z < 17 && Math.abs(x - z) < 2.6) return false;
    return !colliders.some(c => Math.hypot(c.x - x, c.z - z) < c.radius + 2.3);
  }

  function positionForModel() {
    for (let attempts = 0; attempts < 90; attempts++) {
      const x = (random() - 0.5) * 69;
      const z = (random() - 0.5) * 69;
      if (placeable(x, z)) return { x, z };
    }
    return null;
  }

  function makeTree(x, z, scale) {
    const stem = B.MeshBuilder.CreateCylinder("tree-trunk", { height: 1.55 * scale, diameterTop: 0.29 * scale, diameterBottom: 0.51 * scale, tessellation: 7 }, scene);
    stem.position.set(x, 0.775 * scale, z);
    stem.material = trunk;
    for (let i = 0; i < 3; i++) {
      const crown = B.MeshBuilder.CreateSphere("tree-foliage", { diameter: (2.1 - i * 0.25) * scale, segments: 8 }, scene);
      crown.position.set(x + (i - 1) * 0.21 * scale, (1.85 + i * 0.46) * scale, z + (i % 2 ? 0.12 : -0.12) * scale);
      crown.scaling.y = 0.85;
      crown.material = leaves[i];
    }
    colliders.push({ x, z, radius: 0.57 * scale });
  }

  function makeRock(x, z, scale) {
    const rock = B.MeshBuilder.CreatePolyhedron("rock", { type: 1, size: scale }, scene);
    rock.position.set(x, 0.54 * scale, z);
    rock.rotation.set(random() * 0.4, random() * Math.PI, random() * 0.4);
    rock.scaling.set(1.18, 0.63, 0.85);
    rock.material = random() > 0.5 ? stone : stoneLight;
    colliders.push({ x, z, radius: 0.75 * scale });
  }

  function makeCrate(x, z) {
    const crate = B.MeshBuilder.CreateBox("supply-crate", { size: 1.6 }, scene);
    crate.position.set(x, 0.8, z);
    crate.rotation.y = random() * Math.PI;
    crate.material = wood;
    const cap = B.MeshBuilder.CreateBox("crate-lid", { width: 1.68, height: 0.14, depth: 1.68 }, scene);
    cap.position.set(x, 1.59, z);
    cap.rotation.y = crate.rotation.y;
    cap.material = trim;
    colliders.push({ x, z, radius: 1.04 });
  }

  function makeCrystal(x, z) {
    const base = B.MeshBuilder.CreateCylinder("crystal-base", { height: 0.33, diameterTop: 1.25, diameterBottom: 1.45, tessellation: 7 }, scene);
    base.position.set(x, 0.16, z);
    base.material = stone;
    const crystal = B.MeshBuilder.CreatePolyhedron("glowing-crystal", { type: 1, size: 0.92 }, scene);
    crystal.position.set(x, 1.28, z);
    crystal.scaling.y = 1.45;
    crystal.material = crystalMat;
    animations.push(dt => {
      crystal.rotation.y += dt * 0.8;
      crystal.position.y = 1.28 + Math.sin(performance.now() * 0.0017 + x) * 0.12;
    });
    colliders.push({ x, z, radius: 0.72 });
  }

  // A fixed seed means the "random" testing area stays the same on each reload.
  for (let i = 0; i < 36; i++) {
    const pos = positionForModel();
    if (pos) makeTree(pos.x, pos.z, 0.83 + random() * 0.55);
  }
  for (let i = 0; i < 22; i++) {
    const pos = positionForModel();
    if (pos) makeRock(pos.x, pos.z, 0.65 + random() * 0.85);
  }
  for (let i = 0; i < 7; i++) {
    const pos = positionForModel();
    if (pos) makeCrate(pos.x, pos.z);
  }
  for (let i = 0; i < 7; i++) {
    const pos = positionForModel();
    if (pos) makeCrystal(pos.x, pos.z);
  }

  // A small glowing landmark, assembled entirely from meshes.
  const platform = B.MeshBuilder.CreateCylinder("portal-platform", { diameter: 6.7, height: 0.45, tessellation: 32 }, scene);
  platform.position.set(14, 0.19, 14);
  platform.material = stone;
  const ring = B.MeshBuilder.CreateTorus("portal-ring", { diameter: 5.05, thickness: 0.36, tessellation: 48 }, scene);
  ring.position.set(14, 3.2, 14);
  ring.rotation.x = Math.PI / 2;
  ring.material = portalMat;
  const field = B.MeshBuilder.CreateDisc("portal-glow", { radius: 2.25, tessellation: 48, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
  field.position.set(14, 3.2, 14);
  field.material = portalFieldMat;
  const portalLight = new B.PointLight("portal-light", new B.Vector3(14, 3.5, 14), scene);
  portalLight.diffuse = B.Color3.FromHexString("#a898ff");
  portalLight.intensity = 7;
  portalLight.range = 14;
  animations.push(dt => {
    ring.rotation.z += dt * 0.09;
    const pulse = 1 + Math.sin(performance.now() * 0.002) * 0.035;
    field.scaling.set(pulse, pulse, 1);
  });
  colliders.push({ x: 14, z: 14, radius: 2.85 });

  return { colliders, bounds: 38, update(dt) { for (const animate of animations) animate(dt); } };
}
