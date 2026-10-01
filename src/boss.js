// Ravengar's first real mechanics. Collision math is kept independent from Babylon
// so every attack can be tested without a browser or WebGL context.
export const BOSS_POSITION = Object.freeze({ x: 0, z: 4.1 });
export const ATTACKS = Object.freeze([
  { id: "eruption", name: "Molten Eruption", hint: "MOVE OUT OF THE ORANGE CIRCLES", cast: 1.9, damage: 25 },
  { id: "cleave", name: "Ashen Cleave", hint: "STEP OUT OF THE CONE", cast: 1.75, damage: 32 },
  { id: "shockwave", name: "Seismic Shockwave", hint: "JUMP OVER THE SHOCKWAVE (SPACE)", cast: 2.0, damage: 35 }
]);

const PLAYER_RADIUS = 0.35;
const TWO_PI = Math.PI * 2;
const distance = (x1, z1, x2, z2) => Math.hypot(x1 - x2, z1 - z2);

// Each attack resolves ONCE after its telegraph. Only the shockwave can be
// jumped; the eruption and cleave check the player's horizontal footprint.
export function attackHits(attack, player) {
  if (!attack || !player) return false;
  const x = player.x, z = player.z;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (attack.id === "eruption") {
    return attack.circles.some(c => distance(x, z, c.x, c.z) <= c.radius + PLAYER_RADIUS);
  }
  const dist = distance(x, z, BOSS_POSITION.x, BOSS_POSITION.z);
  if (attack.id === "cleave") {
    if (dist > attack.radius + PLAYER_RADIUS) return false;
    const angle = Math.atan2(z - BOSS_POSITION.z, x - BOSS_POSITION.x);
    const delta = Math.atan2(Math.sin(angle - attack.angle), Math.cos(angle - attack.angle));
    return Math.abs(delta) <= attack.halfAngle + Math.asin(Math.min(1, PLAYER_RADIUS / Math.max(dist, PLAYER_RADIUS)));
  }
  if (attack.id === "shockwave") {
    return dist + PLAYER_RADIUS >= attack.inner &&
      dist - PLAYER_RADIUS <= attack.outer &&
      (player.y || 0) < 0.65;
  }
  return false;
}

export function makeAttack(id, player) {
  const definition = ATTACKS.find(entry => entry.id === id);
  if (!definition) throw new Error("Unknown boss attack: " + id);
  const attack = { ...definition };
  if (id === "eruption") {
    const primary = { x: player.x, z: player.z, radius: 2.05 };
    // Second eruption is offset, not a perfect overlap with the first.
    const alternate = {
      x: Math.max(-17, Math.min(17, player.x + (player.x > 0 ? -3.8 : 3.8))),
      z: Math.max(-11, Math.min(11, player.z + (player.z > 0 ? -2.6 : 2.6))),
      radius: 1.6
    };
    attack.circles = [primary, alternate];
  } else if (id === "cleave") {
    attack.angle = Math.atan2(player.z - BOSS_POSITION.z, player.x - BOSS_POSITION.x);
    attack.radius = 19;
    attack.halfAngle = 0.48;
  } else {
    attack.inner = 3.8;
    attack.outer = 13.2;
  }
  return attack;
}

function groundMaterial(B, scene, name, hex, alpha) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = B.Color3.FromHexString(hex);
  material.emissiveColor = B.Color3.FromHexString(hex).scale(0.34);
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.alpha = alpha;
  material.zOffset = -2;
  return material;
}

function arc(B, scene, name, radius, start = 0, end = TWO_PI, count = 80) {
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const angle = start + (end - start) * i / count;
    pts.push(new B.Vector3(Math.cos(angle) * radius, 0.19, Math.sin(angle) * radius));
  }
  const line = B.MeshBuilder.CreateLines(name, { points: pts }, scene);
  line.color = B.Color3.FromHexString("#ffb16a");
  line.isPickable = false;
  return line;
}

function annulus(B, scene, name, inner, outer, start = 0, end = TWO_PI, segments = 84) {
  const mesh = new B.Mesh(name, scene);
  const vertices = [], indices = [];
  for (let i = 0; i <= segments; i++) {
    const angle = start + (end - start) * i / segments;
    const c = Math.cos(angle), s = Math.sin(angle);
    vertices.push(c * inner, .155, s * inner, c * outer, .155, s * outer);
    if (i < segments) {
      const j = i * 2;
      indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  const data = new B.VertexData();
  data.positions = vertices;
  data.indices = indices;
  data.normals = [];
  B.VertexData.ComputeNormals(vertices, indices, data.normals);
  data.applyToMesh(mesh);
  mesh.isPickable = false;
  return mesh;
}

export class BossEncounter {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.delay = 1.25;
    this.index = 0;
    this.state = "idle";
    this.time = 0;
    this.active = null;
    this.lastHit = null;
    this.graphics = [];
    this.B = window.BABYLON;
    this.warningMaterial = groundMaterial(this.B, scene, "boss-warning-area", "#ee6735", .25);
    this.impactMaterial = groundMaterial(this.B, scene, "boss-impact-area", "#ffb15c", .68);
    this.statusText = "Boss preparing...";
    this.progress = 0;
  }

  clearGraphics() {
    for (const mesh of this.graphics) mesh.dispose();
    this.graphics.length = 0;
  }

  reset() {
    this.clearGraphics();
    this.index = 0;
    this.delay = 1.25;
    this.state = "idle";
    this.time = 0;
    this.active = null;
    this.lastHit = null;
    this.statusText = "Boss preparing...";
    this.progress = 0;
  }

  track(mesh, material) {
    if (material) mesh.material = material;
    mesh.isPickable = false;
    this.graphics.push(mesh);
    return mesh;
  }

  draw(attack) {
    const B = this.B, scene = this.scene;
    if (attack.id === "eruption") {
      for (const c of attack.circles) {
        const disc = this.track(B.MeshBuilder.CreateDisc("eruption-target",
          { radius: c.radius, tessellation: 64, sideOrientation: B.Mesh.DOUBLESIDE }, scene), this.warningMaterial);
        disc.rotation.x = -Math.PI / 2;
        disc.position.set(c.x, .165, c.z);
        const border = this.track(arc(B, scene, "eruption-border", c.radius));
        border.position.set(c.x, 0, c.z);
      }
    } else if (attack.id === "cleave") {
      const half = attack.halfAngle, radius = attack.radius;
      const wedge = this.track(annulus(B, scene, "cleave-telegraph",
        0, radius, -half, half, 48), this.warningMaterial);
      wedge.position.set(BOSS_POSITION.x, 0, BOSS_POSITION.z);
      wedge.rotation.y = -attack.angle;
      // Babylon's positive Y rotation points +X toward -Z.
      for (const side of [-half, half]) {
        const end = new B.Vector3(Math.cos(side) * radius, .19, Math.sin(side) * radius);
        const border = this.track(B.MeshBuilder.CreateLines("cleave-edge",
          { points: [new B.Vector3(0, .19, 0), end] }, scene));
        border.color = B.Color3.FromHexString("#ffb16a");
        border.position.set(BOSS_POSITION.x, 0, BOSS_POSITION.z);
        border.rotation.y = -attack.angle;
      }
      const rim = this.track(arc(B, scene, "cleave-outer-arc", radius, -half, half, 45));
      rim.position.set(BOSS_POSITION.x, 0, BOSS_POSITION.z);
      rim.rotation.y = -attack.angle;
    } else if (attack.id === "shockwave") {
      const ring = this.track(annulus(B, scene, "shockwave-warning",
        attack.inner, attack.outer), this.warningMaterial);
      ring.position.set(BOSS_POSITION.x, 0, BOSS_POSITION.z);
      for (const r of [attack.inner, attack.outer]) {
        const edge = this.track(arc(B, scene, "shockwave-edge", r));
        edge.position.set(BOSS_POSITION.x, 0, BOSS_POSITION.z);
      }
    }
  }

  begin() {
    const def = ATTACKS[this.index % ATTACKS.length];
    const location = this.player.root.position;
    this.active = makeAttack(def.id, { x: location.x, z: location.z });
    this.index++;
    this.state = "warning";
    this.time = this.active.cast;
    this.statusText = this.active.hint;
    this.progress = 0;
    this.draw(this.active);
  }

  resolve() {
    this.state = "impact";
    this.time = .30;
    this.progress = 1;
    for (const mesh of this.graphics) {
      if (mesh.material === this.warningMaterial) mesh.material = this.impactMaterial;
    }
    const location = this.player.root.position;
    const hit = attackHits(this.active, { x: location.x, y: location.y, z: location.z });
    if (hit && this.player.takeDamage(this.active.damage, this.active.name)) {
      this.lastHit = { name: this.active.name, damage: this.active.damage };
      this.statusText = this.active.name + " hit!";
    } else {
      this.lastHit = null;
      this.statusText = this.active.name + " dodged";
    }
  }

  update(dt) {
    if (this.player.dead) {
      this.clearGraphics();
      this.active = null;
      this.state = "defeated";
      this.statusText = "DEFEATED — PRESS R TO RETRY";
      this.progress = 0;
      return;
    }
    if (this.state === "idle") {
      this.delay -= dt;
      if (this.delay <= 0) this.begin();
    } else if (this.state === "warning") {
      this.time -= dt;
      this.progress = Math.min(1, Math.max(0, 1 - this.time / this.active.cast));
      // Reuse the meshes: only opacity pulses during the cast.
      this.warningMaterial.alpha = .18 + this.progress * .22 +
        Math.sin(this.progress * Math.PI * 13) * .035;
      if (this.time <= 0) this.resolve();
    } else if (this.state === "impact") {
      this.time -= dt;
      if (this.time <= 0) {
        this.clearGraphics();
        this.state = "idle";
        this.delay = 1.0;
        this.active = null;
        this.progress = 0;
      }
    }
  }
}
