// Shared, texture-free low-poly character models for the style study.
const B = window.BABYLON;

export function mat(scene, name, color, emissive = null) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor = B.Color3.FromHexString(color);
  m.specularColor = B.Color3.FromHexString("#21150f").scale(0.06);
  if (emissive) m.emissiveColor = B.Color3.FromHexString(emissive);
  return m;
}

function part(scene, parent, name, kind, options, material, x, y, z) {
  const mesh = B.MeshBuilder[kind](name, options, scene);
  mesh.parent = parent;
  mesh.position.set(x, y, z);
  mesh.material = material;
  return mesh;
}

function circle(scene, parent, name, radius, color, y = 0.045) {
  const m = mat(scene, name + "-material", color, color);
  m.alpha = 0.86;
  const ring = part(scene, parent, name, "CreateTorus",
    { diameter: radius * 2, thickness: 0.055, tessellation: 40 }, m, 0, y, 0);
  return ring;
}

export function nameplate(scene, parent, title, color) {
  // Real 3D nameplate: stays readable when the camera follows the character.
  const tex = new B.DynamicTexture(title + "-label", { width: 384, height: 128 }, scene, false);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 384, 128);
  ctx.fillStyle = "rgba(28, 18, 15, 0.85)";
  ctx.fillRect(15, 62, 354, 45);
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(25, 76, 334, 18);
  ctx.fillStyle = color;
  ctx.fillRect(28, 79, 278, 12);
  ctx.font = "bold 37px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff0d8";
  ctx.shadowColor = "#21130d";
  ctx.shadowBlur = 5;
  ctx.fillText(title, 192, 53);
  tex.update();

  const labelMat = new B.StandardMaterial(title + "-plate-material", scene);
  labelMat.diffuseTexture = tex;
  labelMat.useAlphaFromDiffuseTexture = true;
  labelMat.disableLighting = true;
  labelMat.emissiveColor = B.Color3.White();
  labelMat.backFaceCulling = false;
  const label = part(scene, parent, title + "-nameplate", "CreatePlane",
    { width: 2.45, height: 0.81 }, labelMat, 0, 2.54, 0);
  label.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
  label.isPickable = false;
  return label;
}

export function adventurer(scene, role = "Mage", label = true) {
  const schemes = {
    Mage:    { robe: "#60418e", light: "#9368c3", dark: "#352743", rune: "#bd7aff", skin: "#e2ab85" },
    Priest:  { robe: "#c8a965", light: "#efcf7c", dark: "#765a37", rune: "#ffe68e", skin: "#e7b58e" },
    Warrior: { robe: "#754035", light: "#a9604a", dark: "#362c2a", rune: "#df7957", skin: "#e0a681" },
    Shaman:  { robe: "#376e86", light: "#5aa3bd", dark: "#284051", rune: "#69d3ee", skin: "#d6a782" }
  };
  const p = schemes[role] || schemes.Mage;
  const root = new B.TransformNode(role + "-root", scene);
  const visual = new B.TransformNode(role + "-visual", scene);
  visual.parent = root;
  const robe = mat(scene, role + "-robe", p.robe);
  const accent = mat(scene, role + "-accent", p.light);
  const leather = mat(scene, role + "-leather", p.dark);
  const face = mat(scene, role + "-face", p.skin);
  const magic = mat(scene, role + "-magic", p.rune, p.rune);
  const metal = mat(scene, role + "-metal", "#b99a72");

  const legs = [];
  for (const x of [-0.23, 0.23]) {
    const leg = part(scene, visual, role + "-boot", "CreateBox",
      { width: 0.34, height: 0.45, depth: 0.48 }, leather, x, 0.24, 0.09);
    legs.push(leg);
  }
  part(scene, visual, role + "-robe-base", "CreateCylinder",
    { height: 1.05, diameterTop: 0.62, diameterBottom: 1.03, tessellation: 7 }, robe, 0, 0.91, 0);
  part(scene, visual, role + "-collar", "CreateCylinder",
    { height: 0.22, diameter: 0.76, tessellation: 8 }, accent, 0, 1.39, 0);
  part(scene, visual, role + "-hood", "CreateSphere",
    { diameter: 0.77, segments: 7 }, robe, 0, 1.69, 0);
  part(scene, visual, role + "-face", "CreateSphere",
    { diameter: 0.56, segments: 8 }, face, 0, 1.66, 0.19);
  part(scene, visual, role + "-brow", "CreateBox",
    { width: 0.58, height: 0.14, depth: 0.37 }, accent, 0, 1.87, 0.16);
  for (const x of [-0.43, 0.43]) {
    part(scene, visual, role + "-sleeve", "CreateSphere",
      { diameter: 0.35, segments: 7 }, robe, x, 1.17, 0.03);
    part(scene, visual, role + "-hand", "CreateSphere",
      { diameter: 0.22, segments: 7 }, face, x * 1.18, 0.96, 0.18);
  }
  if (role === "Warrior") {
    const sword = part(scene, visual, "training-sword", "CreateBox",
      { width: 0.14, height: 0.91, depth: 0.12 }, metal, 0.61, 1.25, 0.32);
    sword.rotation.z = 0.34;
    part(scene, visual, "sword-guard", "CreateBox",
      { width: 0.48, height: 0.12, depth: 0.17 }, accent, 0.59, 0.88, 0.32);
    const shield = part(scene, visual, "training-shield", "CreateCylinder",
      { diameter: 0.72, height: 0.16, tessellation: 6 }, leather, -0.60, 1.09, 0.30);
    shield.rotation.x = Math.PI / 2;
    part(scene, visual, "shield-mark", "CreateSphere",
      { diameter: 0.19, segments: 7 }, accent, -0.60, 1.09, 0.45);
  } else {
    const staff = part(scene, visual, role + "-staff", "CreateCylinder",
      { height: 1.69, diameter: 0.095, tessellation: 6 }, metal, 0.61, 1.19, 0.21);
    staff.rotation.z = -0.15;
    part(scene, visual, role + "-staff-core", "CreatePolyhedron",
      { type: 1, size: 0.21 }, magic, 0.75, 2.05, 0.21);
    part(scene, visual, role + "-staff-flame", "CreateSphere",
      { diameter: 0.16, segments: 8 }, magic, 0.75, 2.08, 0.21);
  }
  // Distinctive high-detail silhouette: raised shoulder pauldrons, facemask,
  // cuff trim, buckled belt, layered cape, boot armor and tiny faceted gems.
  const metalBright = mat(scene, role + "-etched-metal", "#d5b47a");
  const innerGlow = mat(scene, role + "-eye-glow", p.rune, p.rune);
  const cloth = mat(scene, role + "-lower-cloak", p.dark);
  part(scene, visual, role + "-cape", "CreateBox",
    {width:.72,height:.98,depth:.14},cloth,0,.93,-.40);
  part(scene, visual, role + "-waist-band", "CreateCylinder",
    {height:.17,diameter:.83,tessellation:10},leather,0,.87,0);
  part(scene, visual, role + "-buckle", "CreateBox",
    {width:.23,height:.16,depth:.07},metalBright,0,.87,.43);
  part(scene, visual, role + "-chest-emblem", "CreatePolyhedron",
    {type:1,size:.14},metalBright,0,1.19,.43);
  for (const side of [-1,1]) {
    const armor=part(scene, visual, role + "-pauldron", "CreatePolyhedron",
      {type:1,size:.37},accent,side*.47,1.37,.02);
    armor.scaling.set(1.25,.62,1.05);
    part(scene, visual, role + "-arm-cuff", "CreateCylinder",
      {height:.18,diameter:.27,tessellation:8},metalBright,side*.53,.96,.16);
    part(scene, visual, role + "-boot-cuff", "CreateBox",
      {width:.38,height:.09,depth:.43},metalBright,side*.40,.40,.10);
    part(scene, visual, role + "-eye", "CreateSphere",
      {diameter:.072,segments:7},innerGlow,side*.13,1.71,.457);
  }
  part(scene, visual, role + "-hood-jewel", "CreatePolyhedron",
    {type:1,size:.10},magic,0,1.97,.18);
  for (let i=0;i<8;i++) {
    const angle=2*Math.PI*i/8;
    const chip=part(scene,root,role+"-rune-tick","CreateBox",
      {width:.075,height:.016,depth:.24},magic,
      Math.sin(angle)*.85,.044,Math.cos(angle)*.85);
    chip.rotation.y=angle;
  }
  circle(scene, root, role + "-inner-sigil-ring", .55, p.rune, .048);
  circle(scene, root, role + "-selection-ring", 0.72, p.rune);
  if (label) nameplate(scene, root, role, p.rune);
  return { root, visual, legs, color: p.rune };
}

export function sentinel(scene, x = 0, z = 4.1) {
  const root = new B.TransformNode("stone-sentinel", scene);
  root.position.set(x, 0, z);
  const rock = mat(scene, "sentinel-ochre-stone", "#50352a");
  const shadow = mat(scene, "sentinel-dark-stone", "#35231d");
  const ridge = mat(scene, "sentinel-highlight", "#6a4231");
  const ember = mat(scene, "sentinel-ember", "#ff793e", "#df3d15");
  const hotCore = mat(scene, "sentinel-core", "#ffc574", "#ff8a30");
  const armor = mat(scene, "sentinel-bronze", "#a57b4e");
  const charcoal = mat(scene, "sentinel-charcoal", "#241b1a");
  const stonePlate = mat(scene, "sentinel-layered-armor", "#60493c");

  function poly(name, m, x, y, z, sx, sy, sz, ry = 0) {
    const mesh = part(scene, root, name, "CreatePolyhedron", { type: 1, size: 1 }, m, x, y, z);
    mesh.scaling.set(sx, sy, sz);
    mesh.rotation.y = ry;
    return mesh;
  }
  circle(scene, root, "sentinel-warning-ring", 2.53, "#e87551");
  const base = part(scene, root, "sentinel-plinth", "CreateCylinder",
    { height: 0.26, diameter: 4.45, tessellation: 12 }, shadow, 0, 0.14, 0);
  base.scaling.z = 0.94;
  poly("sentinel-left-foot", shadow, -0.92, 0.64, 0.51, 0.67, 0.69, 0.91, 0.3);
  poly("sentinel-right-foot", shadow, 0.94, 0.64, 0.51, 0.67, 0.69, 0.91, -0.3);
  poly("sentinel-left-leg", rock, -0.70, 1.22, 0.12, 0.71, 0.87, 0.79, 0.2);
  poly("sentinel-right-leg", rock, 0.70, 1.22, 0.12, 0.71, 0.87, 0.79, -0.2);
  poly("sentinel-torso", rock, 0, 2.56, -0.05, 1.73, 1.56, 1.12);
  poly("sentinel-left-shoulder", ridge, -1.58, 3.01, -0.06, 0.9, 0.82, 0.96);
  poly("sentinel-right-shoulder", ridge, 1.58, 3.01, -0.06, 0.9, 0.82, 0.96);
  poly("sentinel-left-arm", rock, -1.93, 2.12, 0.29, 0.72, 1.03, 0.7, -0.28);
  poly("sentinel-right-arm", rock, 1.93, 2.12, 0.29, 0.72, 1.03, 0.7, 0.28);
  poly("sentinel-left-fist", shadow, -2.10, 1.39, 0.66, 0.57, 0.49, 0.59);
  poly("sentinel-right-fist", shadow, 2.10, 1.39, 0.66, 0.57, 0.49, 0.59);
  poly("sentinel-head", shadow, 0, 3.44, 0.57, 1.00, 0.77, 0.81);
  for (const side of [-1, 1]) {
    const horn = part(scene, root, "sentinel-horn", "CreateCylinder",
      { height: 0.74, diameterTop: 0.03, diameterBottom: 0.43, tessellation: 4 },
      shadow, side * 0.77, 4.02, 0.38);
    horn.rotation.z = side * -0.35;
    poly("sentinel-shoulder-rune", ember, side * 1.30, 3.28, 0.70, 0.15, 0.41, 0.13);
    poly("sentinel-eye", ember, side * 0.38, 3.49, 1.23, 0.24, 0.10, 0.11);
    poly("sentinel-brow", ridge, side * 0.39, 3.65, 1.16, 0.31, 0.09, 0.14);
  }
  poly("sentinel-heart", hotCore, 0, 2.63, 1.14, .34,.38,.18);
  // Armored ash titan: overlapping faceted plates, molten seams and floating shale.
  poly("sentinel-breastplate",stonePlate,0,2.93,.81,1.05,.55,.30);
  poly("sentinel-collar-armor",armor,0,3.45,.40,.83,.18,.32);
  poly("sentinel-jaw",charcoal,0,3.17,1.03,.77,.26,.40);
  for (const side of [-1,1]) {
    const s=side;
    poly("sentinel-armor-shoulder",stonePlate,s*1.62,3.24,.35,.92,.60,.80,s*.24);
    poly("sentinel-shoulder-gilt",armor,s*1.76,3.39,.75,.62,.13,.13,s*.25);
    poly("sentinel-armor-arm",stonePlate,s*1.99,2.41,.64,.62,.71,.31,s*.22);
    poly("sentinel-gauntlet",charcoal,s*2.17,1.28,.95,.72,.58,.66,s*.1);
    poly("sentinel-kneeplate",stonePlate,s*.79,1.29,.71,.49,.41,.31,s*.15);
    poly("sentinel-footplate",armor,s*.95,.44,.85,.58,.13,.65,s*.12);
    for(let j=0;j<3;j++){
      const spike=part(scene,root,"sentinel-spined-shoulder","CreateCylinder",
        {height:.78+j*.17,diameterTop:0,diameterBottom:.34,tessellation:4},
        charcoal,s*(1.32+j*.36),3.78+(j%2)*.11,-.12-j*.12);
      spike.rotation.z=s*(-.20-j*.18);
      poly("sentinel-split-claw",charcoal,s*(2.0+j*.21),1.04,1.33,.19,.29,.43,s*.12);
    }
  }
  function moltenSeam(name, coords, radius=.056, hot=false) {
    const path=coords.map(([x,y,z])=>new B.Vector3(x,y,z));
    const mesh=B.MeshBuilder.CreateTube(name,{path,radius,tessellation:5},scene);
    mesh.parent=root; mesh.material=hot?hotCore:ember; return mesh;
  }
  [
    [[-.90,3.02,1.13],[-.58,2.78,1.31],[-.36,2.49,1.27]],
    [[.77,3.19,1.04],[.43,2.91,1.25],[.24,2.66,1.25]],
    [[-.13,2.96,1.18],[.09,2.77,1.25],[-.06,2.48,1.33]],
    [[-1.72,3.03,.82],[-1.94,2.68,1.03],[-1.91,2.17,.94]],
    [[1.75,3.01,.82],[1.95,2.63,1.03],[2.06,2.03,.96]],
    [[-.75,1.58,.64],[-.81,1.14,.77],[-.99,.79,.93]],
    [[.62,1.67,.67],[.87,1.29,.81],[.86,.83,.96]]
  ].forEach((coords,i)=>moltenSeam("sentinel-glowing-lava-fissure",coords,i===2?.09:.065,i===2));
  for(const side of [-1,1]){
    poly("sentinel-glowing-jaw",ember,side*.27,3.18,1.43,.13,.075,.09);
    poly("sentinel-bronze-forearm-rivet",armor,side*1.97,2.61,1.01,.10,.13,.09);
  }
  const shards=[];
  for (let i=0;i<16;i++) {
    const a=i*Math.PI*2/16,dist=2.52+(i%4)*.24;
    const piece=poly("sentinel-orbiting-broken-shale",i%5===0?ember:(i%2?ridge:charcoal),
      Math.cos(a)*dist,1.2+(i%5)*.6,Math.sin(a)*dist,
      .13+(i%3)*.11,.22+(i%4)*.10,.18+(i%3)*.08,a);
    shards.push({piece,a,dist,y:piece.position.y,phase:i*.71});
  }
  const eyeLight = new B.PointLight("sentinel-blazing-face",new B.Vector3(x,3.40,z+1.2),scene);
  eyeLight.diffuse=B.Color3.FromHexString("#ff692f");
  eyeLight.intensity=.65;eyeLight.range=7.5;
  const fire = new B.PointLight("sentinel-heartlight", new B.Vector3(x, 3.15, z + 1.1), scene);
  fire.diffuse = B.Color3.FromHexString("#e85b38");
  fire.intensity = 0.5;
  fire.range = 7;
  return {root,update(dt,elapsed) {
    const pulse=Math.sin(elapsed*2.5);
    fire.intensity=.52+pulse*.14;
    eyeLight.intensity=.65+pulse*.12;
    root.rotation.y=Math.sin(elapsed*.45)*.025;
    for(const shard of shards){
      shard.piece.position.x=Math.cos(shard.a+elapsed*.24)*shard.dist;
      shard.piece.position.z=Math.sin(shard.a+elapsed*.24)*shard.dist;
      shard.piece.position.y=shard.y+Math.sin(elapsed*1.7+shard.phase)*.17;
      shard.piece.rotation.y+=dt*.21;
    }
  }};
}
