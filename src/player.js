const B = window.BABYLON;
const SPAWN = { x: 0, y: 0, z: 0 };
const WALK_SPEED = 5.4;
const RUN_SPEED = 9.1;
const PLAYER_RADIUS = 0.43;

function makeMaterial(scene, name, color) {
  const mat = new B.StandardMaterial(name, scene);
  mat.diffuseColor = B.Color3.FromHexString(color);
  mat.specularColor = B.Color3.Black();
  return mat;
}

export class Player {
  constructor(scene, world) {
    this.world = world;
    this.root = new B.TransformNode("player-root", scene);
    this.root.position.copyFrom(SPAWN);
    this.visual = new B.TransformNode("player-visual", scene);
    this.visual.parent = this.root;
    this.height = 0;
    this.verticalSpeed = 0;
    this.walkTime = 0;

    const coat = makeMaterial(scene, "player-coat", "#e3a252");
    const darkCoat = makeMaterial(scene, "player-vest", "#425e5b");
    const skin = makeMaterial(scene, "player-skin", "#f1ce9d");
    const boots = makeMaterial(scene, "player-boots", "#3b4b47");
    const eye = makeMaterial(scene, "player-eyes", "#25373b");
    const scarf = makeMaterial(scene, "player-scarf", "#e9d99c");

    const attach = (mesh, mat, x, y, z) => {
      mesh.parent = this.visual;
      mesh.position.set(x, y, z);
      mesh.material = mat;
      return mesh;
    };
    attach(B.MeshBuilder.CreateCylinder("torso", { height: 0.95, diameterTop: 0.72, diameterBottom: 0.87, tessellation: 10 }, scene), coat, 0, 0.98, 0);
    attach(B.MeshBuilder.CreateBox("backpack", { width: 0.68, height: 0.79, depth: 0.28 }, scene), darkCoat, 0, 1.04, -0.43);
    attach(B.MeshBuilder.CreateSphere("head", { diameter: 0.69, segments: 12 }, scene), skin, 0, 1.72, 0.05);
    attach(B.MeshBuilder.CreateCylinder("neck-scarf", { height: 0.17, diameter: 0.66, tessellation: 12 }, scene), scarf, 0, 1.44, 0.01);
    for (const x of [-0.14, 0.14]) {
      attach(B.MeshBuilder.CreateSphere("eye", { diameter: 0.07, segments: 8 }, scene), eye, x, 1.76, 0.355);
      attach(B.MeshBuilder.CreateBox("boot", { width: 0.31, height: 0.43, depth: 0.48 }, scene), boots, x * 1.75, 0.23, 0.12);
      attach(B.MeshBuilder.CreateSphere("hand", { diameter: 0.25, segments: 8 }, scene), skin, x < 0 ? -0.48 : 0.48, 1.00, 0.15);
    }
    const shadow = B.MeshBuilder.CreateDisc("player-shadow", { radius: 0.53, tessellation: 24 }, scene);
    shadow.rotation.x = Math.PI / 2;
    shadow.position.y = 0.018;
    const shadowMat = new B.StandardMaterial("player-shadow-mat", scene);
    shadowMat.diffuseColor = B.Color3.Black();
    shadowMat.emissiveColor = B.Color3.Black();
    shadowMat.alpha = 0.21;
    shadowMat.disableLighting = true;
    shadow.material = shadowMat;
    this.shadow = shadow;
  }

  reset() {
    this.root.position.copyFrom(SPAWN);
    this.height = 0;
    this.verticalSpeed = 0;
    this.visual.rotation.y = 0;
  }

  canOccupy(x, z) {
    if (Math.abs(x) > this.world.bounds - PLAYER_RADIUS || Math.abs(z) > this.world.bounds - PLAYER_RADIUS) return false;
    return this.world.colliders.every(c => Math.hypot(x - c.x, z - c.z) >= c.radius + PLAYER_RADIUS);
  }

  update(dt, held, pressed) {
    if (pressed.has("KeyR")) this.reset();
    const axisX = Number(held.has("KeyD") || held.has("ArrowRight")) - Number(held.has("KeyA") || held.has("ArrowLeft"));
    const axisZ = Number(held.has("KeyW") || held.has("ArrowUp")) - Number(held.has("KeyS") || held.has("ArrowDown"));
    const length = Math.hypot(axisX, axisZ);
    const moving = length > 0;

    if (moving) {
      const dx = axisX / length;
      const dz = axisZ / length;
      const sprinting = held.has("ShiftLeft") || held.has("ShiftRight");
      const step = (sprinting ? RUN_SPEED : WALK_SPEED) * dt;
      const x = this.root.position.x + dx * step;
      const z = this.root.position.z + dz * step;
      // Sliding along obstacles rather than getting stuck on diagonal contact.
      if (this.canOccupy(x, this.root.position.z)) this.root.position.x = x;
      if (this.canOccupy(this.root.position.x, z)) this.root.position.z = z;

      const desired = Math.atan2(dx, dz);
      const current = this.visual.rotation.y;
      const shortestAngle = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
      this.visual.rotation.y += shortestAngle * Math.min(1, dt * 13);
      this.walkTime += dt * (sprinting ? 18 : 12);
    }

    if ((pressed.has("Space") || pressed.has("KeyJ")) && this.height === 0) this.verticalSpeed = 7.3;
    if (this.verticalSpeed !== 0 || this.height > 0) {
      this.height += this.verticalSpeed * dt;
      this.verticalSpeed -= 19 * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.verticalSpeed = 0;
      }
    }
    this.root.position.y = this.height;
    this.visual.position.y = this.height === 0 && moving ? Math.abs(Math.sin(this.walkTime)) * 0.055 : 0;
    this.shadow.position.x = this.root.position.x;
    this.shadow.position.z = this.root.position.z;
    this.shadow.scaling.setAll(Math.max(0.58, 1 - this.height * 0.1));
  }
}
