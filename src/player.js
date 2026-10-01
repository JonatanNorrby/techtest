import { adventurer, mat } from "./actors.js?v=4";

const B = window.BABYLON;
const SPAWN = { x: -5.7, y: 0, z: -8 };
const WALK_SPEED = 5.1;
const SPRINT_SPEED = 8.4;
const BODY_RADIUS = 0.40;

export class Player {
  constructor(scene, world) {
    this.world = world;
    const model = adventurer(scene, "Mage", true);
    this.root = model.root;
    this.visual = model.visual;
    this.legs = model.legs;
    this.root.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
    this.height = 0;
    this.verticalSpeed = 0;
    this.walkTime = 0;
    this.isMoving = false;
    this.isSprinting = false;
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.dead = false;
    this.hurtFlash = 0;
    this.lastDamage = null;
    this.shield = 0;
    this.shieldTime = 0;
    this.castAnimation = 0;

    const shade = mat(scene, "mage-contact-shadow", "#211610");
    shade.alpha = 0.2;
    shade.disableLighting = true;
    shade.backFaceCulling = false;
    this.shadow = B.MeshBuilder.CreateDisc("mage-shadow",
      { radius: 0.58, tessellation: 18, sideOrientation: B.Mesh.DOUBLESIDE }, scene);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = .035;
    this.shadow.material = shade;
  }

  reset() {
    this.root.position.set(SPAWN.x, SPAWN.y, SPAWN.z);
    this.height = 0;
    this.verticalSpeed = 0;
    this.walkTime = 0;
    this.visual.rotation.y = 0;
    this.visual.position.y = 0;
    this.hp = this.maxHp;
    this.dead = false;
    this.hurtFlash = 0;
    this.lastDamage = null;
    this.shield = 0;
    this.shieldTime = 0;
    this.castAnimation = 0;
    this.visual.scaling.setAll(1);
    this.visual.rotation.z = 0;
    this.isMoving = false;
    this.isSprinting = false;
  }

  grantShield(amount, duration) {
    if (this.dead || amount <= 0 || duration <= 0) return false;
    this.shield = amount;
    this.shieldTime = duration;
    return true;
  }

  triggerCastAnimation() {
    if (!this.dead) this.castAnimation = .32;
  }

  takeDamage(amount, source) {
    if (this.dead || !Number.isFinite(amount) || amount <= 0) return false;
    const absorbed = Math.min(amount, this.shield);
    this.shield = Math.max(0, this.shield - absorbed);
    if (this.shield === 0) this.shieldTime = 0;
    const healthDamage = amount - absorbed;
    this.hp = Math.max(0, this.hp - healthDamage);
    this.dead = this.hp === 0;
    this.hurtFlash = healthDamage > 0 ? 0.45 : .12;
    this.lastDamage = { amount: healthDamage, absorbed, source };
    this.isMoving = false;
    this.isSprinting = false;
    return true;
  }

  canOccupy(x, z) {
    return this.world.inside(x, z, BODY_RADIUS + 0.35) &&
      this.world.colliders.every(c => Math.hypot(x - c.x, z - c.z) >= c.radius + BODY_RADIUS);
  }

  update(dt, held, pressed) {
    if (pressed.has("KeyR")) this.reset();
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.shieldTime = Math.max(0, this.shieldTime - dt);
    if (this.shieldTime === 0) this.shield = 0;
    this.castAnimation = Math.max(0, this.castAnimation - dt);
    const anim = this.castAnimation > 0 ? Math.sin((.32 - this.castAnimation) / .32 * Math.PI) : 0;
    this.visual.scaling.setAll(1 + anim * .055);
    this.visual.rotation.z = -anim * .085;
    if (this.dead) return;
    const x = Number(held.has("KeyD") || held.has("ArrowRight")) -
      Number(held.has("KeyA") || held.has("ArrowLeft"));
    const z = Number(held.has("KeyW") || held.has("ArrowUp")) -
      Number(held.has("KeyS") || held.has("ArrowDown"));
    const magnitude = Math.hypot(x, z);
    this.isMoving = magnitude > 0;
    this.isSprinting = this.isMoving && (held.has("ShiftLeft") || held.has("ShiftRight"));

    if (this.isMoving) {
      const dx = x / magnitude, dz = z / magnitude;
      const step = (this.isSprinting ? SPRINT_SPEED : WALK_SPEED) * dt;
      const nextX = this.root.position.x + dx * step;
      const nextZ = this.root.position.z + dz * step;
      if (this.canOccupy(nextX, this.root.position.z)) this.root.position.x = nextX;
      if (this.canOccupy(this.root.position.x, nextZ)) this.root.position.z = nextZ;

      const desired = Math.atan2(dx, dz);
      const delta = Math.atan2(Math.sin(desired - this.visual.rotation.y),
        Math.cos(desired - this.visual.rotation.y));
      this.visual.rotation.y += delta * Math.min(1, dt * 14);
      this.walkTime += dt * (this.isSprinting ? 15 : 10.5);
    }

    if (pressed.has("Space") && this.height <= 0) this.verticalSpeed = 6.8;
    if (this.verticalSpeed !== 0 || this.height > 0) {
      this.height += this.verticalSpeed * dt;
      this.verticalSpeed -= 18.5 * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.verticalSpeed = 0;
      }
    }
    this.root.position.y = this.height;
    const gait = this.isMoving ? Math.sin(this.walkTime) * 0.045 : 0;
    this.visual.position.y = this.height === 0 ? Math.abs(gait) : 0;
    this.legs[0].position.z = 0.09 + gait;
    this.legs[1].position.z = 0.09 - gait;
    this.shadow.position.x = this.root.position.x;
    this.shadow.position.z = this.root.position.z;
    const scale = Math.max(0.57, 1 - this.height * 0.14);
    this.shadow.scaling.set(scale, scale, scale);
  }
}
