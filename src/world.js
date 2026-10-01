import { mat, adventurer, sentinel } from "./actors.js?v=4";
import { addHighDetail } from "./detail.js?v=4";

const B = window.BABYLON;
function seededRandom(seed) {
  let n = seed >>> 0;
  return () => ((n = (1664525 * n + 1013904223) >>> 0) / 4294967296);
}
function mesh(scene, name, kind, options, material, x, y, z) {
  const m = B.MeshBuilder[kind](name, options, scene);
  m.position.set(x, y, z);
  m.material = material;
  return m;
}
function flatRock(scene, name, material, x, z, sx, sy, sz, angle = 0) {
  const rock = mesh(scene, name, "CreatePolyhedron", { type: 1, size: 1 }, material, x, sy * 0.62, z);
  rock.scaling.set(sx, sy, sz);
  rock.rotation.y = angle;
  return rock;
}
function spot(scene, name, x, z, diameter, material, y = 0.012) {
  const m = mesh(scene, name, "CreateDisc", { radius: diameter / 2, tessellation: 18, sideOrientation: B.Mesh.DOUBLESIDE },
    material, x, y, z);
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function createWorld(scene) {
  const random = seededRandom(8762);
  const colliders = [];
  const animations = [];
  let elapsed = 0;
  let playable = null;

  scene.clearColor = B.Color4.FromHexString("#402d23ff");
  scene.ambientColor = B.Color3.FromHexString("#423127");
  scene.fogMode = B.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0025;
  scene.fogColor = B.Color3.FromHexString("#402d23");

  const sky = new B.HemisphericLight("ambient-amber", new B.Vector3(0, 1, 0), scene);
  sky.intensity = 0.92;
  sky.groundColor = B.Color3.FromHexString("#3e2922");
  const sun = new B.DirectionalLight("warm-sun", new B.Vector3(-0.45, -0.85, 0.30), scene);
  sun.intensity = 1.0;
  sun.diffuse = B.Color3.FromHexString("#ffdfb9");

  const soil = mat(scene, "ochre-packed-earth", "#75513b");
  const edge = mat(scene, "arena-edge", "#4d3428");
  const under = mat(scene, "outside-rock", "#30231c");
  const dust = mat(scene, "dust-patches", "#79563f");
  const darkDust = mat(scene, "dark-soil-patches", "#674732");
  const rock = mat(scene, "angular-boulders", "#655044");
  const rockLite = mat(scene, "boulder-highlights", "#73594a");
  const rockDark = mat(scene, "masonry", "#49382f");
  const face = mat(scene, "pillar-tops", "#5c493c");
  const shadow = mat(scene, "soft-contact-shadows", "#261c18");
  shadow.alpha = 0.14;
  shadow.disableLighting = true;
  shadow.backFaceCulling = false;
  const rust = mat(scene, "broken-pots", "#855240");
  const torchBase = mat(scene, "torch-recess", "#423028");
  const flameInner = mat(scene, "flame-inner", "#ffdf74", "#ffc258");
  const flameOuter = mat(scene, "flame-outer", "#e85c2e", "#c13e1c");
  const rune = mat(scene, "ground-runes", "#aa5540", "#692c23");
  rune.alpha = 0.72;
  rune.backFaceCulling = false;

  // A hand-shaped, faceted arena silhouette rather than a perfect rectangular ground mesh.
  const points = [
    [-26.6, -11.7], [-22.3, -16.0], [-14.2, -17.8], [-4.9, -18.2],
    [5.2, -17.7], [15.4, -17.1], [23.0, -14.2], [26.8, -7.0],
    [27.1, 2.1], [25.4, 9.8], [21.7, 15.0], [11.3, 17.7],
    [1.2, 18.3], [-9.0, 17.6], [-18.8, 15.7], [-25.5, 9.6], [-27.2, 1.1]
  ];
  const positions = [0, 0.02, 0];
  for (const [x, z] of points) positions.push(x, 0.02, z);
  const indices = [];
  for (let i = 0; i < points.length; i++) indices.push(0, (i + 1) % points.length + 1, i + 1);
  const ground = new B.Mesh("angular-arena-floor", scene);
  const topData = new B.VertexData();
  topData.positions = positions;
  // Map the world-space ground polygon into the generated 1024px sandstone texture.
  topData.uvs = [];
  for (let n = 0; n < positions.length; n += 3) {
    topData.uvs.push((positions[n] + 28) / 56, (positions[n + 2] + 19) / 38);
  }
  topData.indices = indices;
  topData.normals = [];
  B.VertexData.ComputeNormals(positions, indices, topData.normals);
  topData.applyToMesh(ground);
  ground.material = soil;

  const wallPositions = [], wallIndices = [];
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i], [x2, z2] = points[(i + 1) % points.length];
    const offset = wallPositions.length / 3;
    wallPositions.push(x1, 0, z1, x2, 0, z2, x1 * 1.014, -1.10, z1 * 1.014, x2 * 1.014, -1.10, z2 * 1.014);
    wallIndices.push(offset, offset + 2, offset + 1, offset + 1, offset + 2, offset + 3);
  }
  const walls = new B.Mesh("faceted-arena-sides", scene);
  const sideData = new B.VertexData();
  sideData.positions = wallPositions;
  sideData.indices = wallIndices;
  sideData.normals = [];
  B.VertexData.ComputeNormals(wallPositions, wallIndices, sideData.normals);
  sideData.applyToMesh(walls);
  walls.material = edge;
  mesh(scene, "dark-surround", "CreateGround", { width: 180, height: 180 }, under, 0, -1.35, 0);

  function inside(x, z, margin = 0) {
    // Slightly inset ellipse keeps the player away from jagged perimeter points.
    return ((x * x) / ((25.1 - margin) ** 2) + (z * z) / ((16.45 - margin) ** 2)) < 1;
  }
  function free(x, z, clearance = 1) {
    if (!inside(x, z, clearance)) return false;
    if (Math.hypot(x + 5.7, z + 8) < 4.2) return false; // player spawn
    if (Math.hypot(x, z - 4.1) < 6.2) return false;     // central sentinel
    const npcs = [[-10, 1.6], [7.4, 1.5], [8.7, -7.1]];
    if (npcs.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.7)) return false;
    return colliders.every(c => Math.hypot(x - c.x, z - c.z) >= c.radius + clearance);
  }

  // Flat blotches, fissures and scattered pebbles add subtle detail without photo textures.
  for (let i = 0; i < 34; i++) {
    const x = (random() - 0.5) * 47, z = (random() - 0.5) * 29;
    if (!inside(x, z, 0.9)) continue;
    const stain = spot(scene, "earth-patch", x, z, 0.7 + random() * 2.0, random() > 0.42 ? dust : darkDust, 0.028);
    stain.scaling.y = 0.6 + random() * 0.8;
    stain.rotation.y = random() * Math.PI;
  }
  for (let i = 0; i < 55; i++) {
    const x = (random() - 0.5) * 48, z = (random() - 0.5) * 30;
    if (!free(x, z, 0.15)) continue;
    const s = 0.12 + random() * 0.22;
    flatRock(scene, "loose-stone", random() > 0.45 ? rock : rockDark,
      x, z, s, s * 0.38, s * 0.8, random() * 6.28);
  }
  for (let i = 0; i < 23; i++) {
    const x = (random() - 0.5) * 47, z = (random() - 0.5) * 27;
    if (!free(x, z, 1.0)) continue;
    const s = 0.35 + random() * 0.7;
    spot(scene, "boulder-contact-shadow", x + .12, z + .22, s * 2.3, shadow);
    flatRock(scene, "faceted-scatter-rock", random() > 0.45 ? rock : rockLite,
      x, z, s, s * 0.56, s * (0.85 + random() * .4), random() * 6.28);
    colliders.push({ x, z, radius: s * 0.72 });
  }

  function pillar(x, z, height = 2.35) {
    spot(scene, "pillar-shadow", x + 0.2, z + 0.18, 3.3, shadow);
    const body = mesh(scene, "broken-sandstone-pillar", "CreateBox",
      { width: 1.85, height, depth: 1.65 }, rockDark, x, height / 2 + 0.06, z);
    body.rotation.y = random() * 0.1;
    const cap = mesh(scene, "worn-pillar-cap", "CreateBox",
      { width: 1.91, height: 0.26, depth: 1.73 }, face, x, height + .10, z);
    cap.rotation.y = body.rotation.y;
    colliders.push({ x, z, radius: 1.33 });
  }
  pillar(-15.8, 4.7, 2.45);
  pillar(15.9, 3.7, 2.55);
  pillar(-15.2, -10.4, 1.88);
  pillar(17.2, -9.6, 2.06);

  function torch(x, z) {
    spot(scene, "torch-shadow", x + 0.22, z + 0.18, 2.5, shadow);
    mesh(scene, "stone-brazier", "CreateBox",
      { width: 1.33, height: 0.44, depth: 1.11 }, torchBase, x, 0.26, z);
    mesh(scene, "brazier-ledge", "CreateBox",
      { width: 1.17, height: 0.1, depth: .94 }, rockLite, x, 0.51, z);
    const flame = mesh(scene, "orange-low-poly-fire", "CreateCylinder",
      { height: 0.88, diameterTop: 0.04, diameterBottom: 0.64, tessellation: 5 },
      flameOuter, x, 0.99, z);
    flame.rotation.z = .10;
    const core = mesh(scene, "gold-fire-core", "CreateCylinder",
      { height: 0.54, diameterTop: 0.02, diameterBottom: 0.31, tessellation: 5 },
      flameInner, x, 0.94, z + 0.04);
    const light = new B.PointLight("brazier-warm-light", new B.Vector3(x, 1.65, z), scene);
    light.diffuse = B.Color3.FromHexString("#ff8e4c");
    light.intensity = 3;
    light.range = 9;
    const phase = random() * 6.28;
    animations.push(() => {
      const flicker = Math.sin(elapsed * 8 + phase) * 0.07;
      flame.scaling.y = 1 + flicker;
      core.scaling.y = 1 - flicker * .5;
      light.intensity = 2.8 + Math.sin(elapsed * 10 + phase) * 0.25;
    });
    colliders.push({ x, z, radius: .93 });
  }
  torch(-23.3, -0.5);
  torch(23.0, 0.4);

  // Framing boulders echo the screenshot's angular, oversized scenery.
  for (const [x, z, sx, sy, sz] of [
    [-20.9, 12.4, 2.45, 1.85, 2.3], [21.3, -12.7, 2.2, 1.5, 2.0],
    [-20.7, -13.0, 1.8, 1.1, 1.72], [21.9, 12.5, 1.4, 1.0, 1.6]
  ]) {
    spot(scene, "large-rock-shadow", x + 0.2, z + 0.3, sx * 2.2, shadow);
    flatRock(scene, "arena-boulder", rock, x, z, sx, sy, sz, random() * 2);
    colliders.push({ x, z, radius: Math.max(sx, sz) * 0.65 });
  }

  const boss = sentinel(scene, 0, 4.1);
  animations.push(dt => boss.update(dt, elapsed));
  colliders.push({ x: 0, z: 4.1, radius: 2.85 });
  const npcSpawns = [
    ["Priest", -10, 1.6, 0.85], ["Warrior", 7.4, 1.5, -1.4], ["Shaman", 8.7, -7.1, -1.05]
  ];
  for (const [role, x, z, yaw] of npcSpawns) {
    const unit = adventurer(scene, role, true);
    unit.root.position.set(x, 0.01, z);
    unit.visual.rotation.y = yaw;
    colliders.push({ x, z, radius: 0.6 });
    animations.push(() => { unit.visual.position.y = Math.sin(elapsed * 2.1 + x) * 0.025; });
  }

  // A translucent orange practice wedge, visually echoing raid encounter telegraphs.
  // It is a visual demonstration only, not a damaging area or real attack.
  const warningMat = mat(scene, "practice-warning", "#c8583c", "#6c281d");
  warningMat.alpha = 0.27;
  warningMat.backFaceCulling = false;
  const telegraphPositions = [0, 0.056, 4.1];
  const telegraphIndices = [];
  const edgePoints = [];
  const arcCount = 20;
  for (let i = 0; i <= arcCount; i++) {
    const a = (-0.45 + i * (0.90 / arcCount));
    const px = Math.cos(a) * 16.25;
    const pz = 4.1 + Math.sin(a) * 16.25;
    telegraphPositions.push(px, .056, pz);
    edgePoints.push(new B.Vector3(px, .067, pz));
    if (i > 0) telegraphIndices.push(0, i + 1, i);
  }
  const wedge = new B.Mesh("decorative-training-cone", scene);
  const wedgeData = new B.VertexData();
  wedgeData.positions = telegraphPositions;
  wedgeData.indices = telegraphIndices;
  wedgeData.normals = [];
  B.VertexData.ComputeNormals(telegraphPositions, telegraphIndices, wedgeData.normals);
  wedgeData.applyToMesh(wedge);
  wedge.material = warningMat;
  const edgeLine = B.MeshBuilder.CreateLines("practice-cone-edge", { points: edgePoints }, scene);
  edgeLine.color = B.Color3.FromHexString("#f17b56");
  edgeLine.alpha = 0.72;

  // Warm gold and electric-blue spell trails demonstrate the art style, not combat.
  function spellTrail(name, fromSource, to, tint, glowTint, phase) {
    const light = mat(scene, name + "-beam", tint, glowTint);
    const halo = mat(scene, name + "-halo", tint, glowTint);
    halo.alpha = .19;
    halo.backFaceCulling = false;
    const getFrom = typeof fromSource === "function" ? fromSource : () => fromSource;
    const point = (t, time, from) => new B.Vector3(
      from[0] + (to[0] - from[0]) * t + Math.sin(t * 21 + time * 6 + phase) * .045,
      1.38 + Math.sin(t * Math.PI) * .47 + Math.sin(t * 16 - time * 5 + phase) * .07,
      from[1] + (to[1] - from[1]) * t + Math.cos(t * 23 - time * 4) * .045
    );
    const initial = getFrom();
    const path = Array.from({length:23}, (_,i) => point(i/22,0,initial));
    let beam = B.MeshBuilder.CreateTube(name+"-luminous-core",
      {path,radius:.072,tessellation:6,updatable:true},scene);
    beam.material=light;
    let surround=B.MeshBuilder.CreateTube(name+"-outer-halo",
      {path,radius:.21,tessellation:7,updatable:true},scene);
    surround.material=halo;
    const orbs = Array.from({length:16},(_,i)=>{
      const t=i/15;
      const orb=mesh(scene,name+"-magic-spark","CreateSphere",
        {diameter:i===15?.43:.07+t*.12,segments:7},light,0,0,0);
      return {orb,t};
    });
    animations.push(() => {
      const from=getFrom();
      const points=path.map((_,i)=>point(i/22,elapsed,from));
      beam=B.MeshBuilder.CreateTube(name+"-luminous-core",
        {path:points,radius:.072,tessellation:6,instance:beam},scene);
      surround=B.MeshBuilder.CreateTube(name+"-outer-halo",
        {path:points,radius:.21,tessellation:7,instance:surround},scene);
      for(const {orb,t} of orbs){
        orb.position.copyFrom(point(t,elapsed,from));
        orb.scaling.setAll(.72+.30*Math.sin(elapsed*8-t*17+phase));
      }
    });
  }
  spellTrail("priest-healing-light",[-10,1.6],[-2.35,4.0],"#f6e68a","#b69740",0);
  spellTrail("shaman-lightning",[8.7,-7.1],[2.2,3.0],"#84cfff","#347abb",1.8);
  spellTrail("mage-arcane",()=>playable?
    [playable.root.position.x,playable.root.position.z]:[-5.7,-8],
    [-.85,3.1],"#bd84ff","#7639bc",3.0);

  // Floor accent under the boss. Purely decorative — no combat system is implied.
  const decal = spot(scene, "ritual-marking", 0, 4.1, 7.15, rune, .031);
  decal.visibility = 0.065;

  const detail = addHighDetail(scene, ground, soil, random);
  return {
    colliders,
    inside,
    lighting: { sun, ground },
    setPlayer(player) { playable = player; },
    update(dt) {
      elapsed += dt;
      for (const animate of animations) animate(dt);
      detail.update(dt, elapsed);
    }
  };
}
