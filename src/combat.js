// Small, allocation-light Mage combat kit. Babylon meshes are created only on
// casts/impacts; all spell geometry is animated in place and cleaned up.
import { BOSS_POSITION } from "./boss.js?v=7";

export const SPELLS = Object.freeze([
  { id: "bolt", key: "Digit1", label: "Arcane Bolt", damage: 12, cooldown: .65, range: 19, description: "Fast homing bolt · 12 damage" },
  { id: "fireball", key: "Digit2", label: "Fireball", damage: 28, cooldown: 3.2, range: 18, description: "Heavy projectile · 28 damage" },
  { id: "nova", key: "Digit3", label: "Arcane Nova", damage: 24, cooldown: 6.5, range: 7.5, description: "Close-range pulse · 24 damage" },
  { id: "barrier", key: "Digit4", label: "Arcane Barrier", damage: 0, cooldown: 10, range: Infinity, description: "Absorb 40 damage for 4 seconds" }
]);
export const BOSS_RADIUS = 2.85;

// Pure math so combat ranges can be regression-tested without rendering.
export function canCastAt(spell, player, target = BOSS_POSITION) {
  if (!spell || !player || !Number.isFinite(player.x) || !Number.isFinite(player.z)) return false;
  if (spell.id === "barrier") return true;
  const dist = Math.hypot(player.x - target.x, player.z - target.z);
  return dist <= spell.range + BOSS_RADIUS;
}

function spellMaterial(B, scene, name, color, opacity = 1) {
  const material = new B.StandardMaterial(name, scene);
  material.diffuseColor = B.Color3.FromHexString(color);
  material.emissiveColor = B.Color3.FromHexString(color).scale(.8);
  material.specularColor = B.Color3.Black();
  material.alpha = opacity;
  material.backFaceCulling = false;
  material.disableLighting = true;
  return material;
}

export class MageCombat {
  constructor(scene, player, encounter) {
    this.scene = scene;
    this.player = player;
    this.encounter = encounter;
    this.B = window.BABYLON;
    this.cooldowns = Object.fromEntries(SPELLS.map(s => [s.id, 0]));
    this.globalCooldown = 0;
    this.projectiles = [];
    this.effects = [];
    this.lastCast = null;
    this.feedback = "";
    this.feedbackTime = 0;
    const B = this.B;
    this.arcane = spellMaterial(B, scene, "player-arcane-core", "#cf9bff");
    this.arcaneHalo = spellMaterial(B, scene, "player-arcane-halo", "#8651d3", .34);
    this.fire = spellMaterial(B, scene, "player-fire-core", "#ffcc71");
    this.fireHalo = spellMaterial(B, scene, "player-fire-halo", "#f46f32", .32);
    this.shieldMaterial = spellMaterial(B, scene, "player-barrier-glow", "#78d0ff", .18);
    this.shieldTrim = spellMaterial(B, scene, "player-barrier-ring", "#b5e9ff", .75);
    // Create shield visual only once; it follows the existing player root.
    this.shieldMesh = B.MeshBuilder.CreateSphere("player-barrier-aura",
      { diameter: 2.15, segments: 12 }, scene);
    this.shieldMesh.parent = player.root;
    this.shieldMesh.position.y = 1.02;
    this.shieldMesh.material = this.shieldMaterial;
    this.shieldMesh.isPickable = false;
    this.shieldMesh.setEnabled(false);
    this.shieldRing = B.MeshBuilder.CreateTorus("player-barrier-ring",
      { diameter: 1.72, thickness: .055, tessellation: 32 }, scene);
    this.shieldRing.parent = player.root;
    this.shieldRing.position.y = .15;
    this.shieldRing.material = this.shieldTrim;
    this.shieldRing.isPickable = false;
    this.shieldRing.setEnabled(false);
  }

  reset() {
    for (const entry of this.projectiles) {
      entry.core.dispose();
      entry.halo.dispose();
    }
    for (const effect of this.effects) effect.mesh.dispose();
    this.projectiles.length = 0;
    this.effects.length = 0;
    for (const spell of SPELLS) this.cooldowns[spell.id] = 0;
    this.globalCooldown = 0;
    this.lastCast = null;
    this.feedback = "";
    this.feedbackTime = 0;
    this.shieldMesh.setEnabled(false);
    this.shieldRing.setEnabled(false);
  }

  pulse(x, y, z, color, radius = 1, duration = .35) {
    const B = this.B;
    const material = color === "fire" ? this.fire : this.arcane;
    const mesh = B.MeshBuilder.CreateTorus("player-spell-impact-ring",
      { diameter: 1, thickness: .09, tessellation: 32 }, this.scene);
    // CreateTorus lies in the ground (XZ) plane by default.
    mesh.position.set(x, y, z);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.scaling.setAll(.15);
    this.effects.push({ mesh, elapsed: 0, duration, radius });
  }

  projectile(spell) {
    const B = this.B;
    const fireball = spell.id === "fireball";
    const core = B.MeshBuilder.CreateSphere("player-" + spell.id + "-projectile",
      { diameter: fireball ? .57 : .37, segments: 9 }, this.scene);
    const halo = B.MeshBuilder.CreateSphere("player-" + spell.id + "-halo",
      { diameter: fireball ? .99 : .71, segments: 9 }, this.scene);
    core.material = fireball ? this.fire : this.arcane;
    halo.material = fireball ? this.fireHalo : this.arcaneHalo;
    core.isPickable = halo.isPickable = false;
    const position = this.player.root.position;
    const start = new B.Vector3(position.x, position.y + 1.55, position.z);
    core.position.copyFrom(start);
    halo.position.copyFrom(start);
    const target = new B.Vector3(BOSS_POSITION.x, 2.25, BOSS_POSITION.z);
    const distance = B.Vector3.Distance(start, target);
    this.projectiles.push({
      core, halo, target, start, elapsed: 0,
      duration: Math.max(.18, distance / (fireball ? 13 : 21)),
      damage: spell.damage, color: fireball ? "fire" : "arcane"
    });
  }

  cast(spellId) {
    const spell = SPELLS.find(s => s.id === spellId);
    if (!spell || this.player.dead || this.encounter.defeated) return false;
    if (this.globalCooldown > 0 || this.cooldowns[spell.id] > 0) return false;
    const { x, z } = this.player.root.position;
    if (!canCastAt(spell, { x, z })) {
      this.feedback = spell.label + ": move closer";
      this.feedbackTime = 1.1;
      return false;
    }
    this.cooldowns[spell.id] = spell.cooldown;
    this.globalCooldown = .25;
    this.lastCast = spell.id;
    this.player.triggerCastAnimation();
    if (spell.id === "barrier") {
      this.player.grantShield(40, 4);
      this.shieldMesh.setEnabled(true);
      this.shieldRing.setEnabled(true);
      this.feedback = "Arcane Barrier: +40 shield";
    } else if (spell.id === "nova") {
      // The boss has an actual radius; Nova checks the same distance that
      // causes the button to be in range. Damage applies only once.
      this.encounter.takeDamage(spell.damage);
      this.pulse(x, .22, z, "arcane", spell.range * 2, .46);
      this.feedback = "Arcane Nova: -" + spell.damage;
    } else {
      this.projectile(spell);
      this.feedback = spell.label;
    }
    this.feedbackTime = .85;
    return true;
  }

  update(dt) {
    for (const spell of SPELLS) this.cooldowns[spell.id] = Math.max(0, this.cooldowns[spell.id] - dt);
    this.globalCooldown = Math.max(0, this.globalCooldown - dt);
    this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    if (this.player.dead || this.encounter.defeated) {
      // On victory/defeat, remove projectiles without any further damage.
      for (const shot of this.projectiles) { shot.core.dispose(); shot.halo.dispose(); }
      this.projectiles.length = 0;
    } else {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const shot = this.projectiles[i];
        shot.elapsed += dt;
        const t = Math.min(1, shot.elapsed / shot.duration);
        const ease = t * t * (3 - 2 * t);
        const x = shot.start.x + (shot.target.x - shot.start.x) * ease;
        const y = shot.start.y + (shot.target.y - shot.start.y) * ease +
          Math.sin(t * Math.PI) * .32;
        const z = shot.start.z + (shot.target.z - shot.start.z) * ease;
        shot.core.position.set(x, y, z);
        shot.halo.position.copyFrom(shot.core.position);
        shot.halo.scaling.setAll(.92 + Math.sin(shot.elapsed * 22) * .08);
        if (t >= 1) {
          shot.core.dispose();
          shot.halo.dispose();
          this.projectiles.splice(i, 1);
          this.encounter.takeDamage(shot.damage);
          this.pulse(shot.target.x, 1.45, shot.target.z, shot.color,
            shot.color === "fire" ? 3.0 : 1.9, .35);
        }
      }
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.elapsed += dt;
      const phase = Math.min(1, fx.elapsed / fx.duration);
      fx.mesh.scaling.setAll(.15 + phase * fx.radius);
      fx.mesh.visibility = 1 - phase;
      if (phase >= 1) { fx.mesh.dispose(); this.effects.splice(i, 1); }
    }
    const shielding = this.player.shield > 0 && this.player.shieldTime > 0 && !this.player.dead;
    this.shieldMesh.setEnabled(shielding);
    this.shieldRing.setEnabled(shielding);
    if (shielding) {
      this.shieldMesh.rotation.y += dt * .28;
      this.shieldRing.rotation.y += dt * 1.3;
    }
  }
}
