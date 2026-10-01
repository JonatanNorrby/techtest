// Extra environmental detail, generated locally. No external assets or loaders.
const B = window.BABYLON;
const rng = (seed) => () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const v = (x, y, z) => new B.Vector3(x, y, z);

function makeMat(scene, name, color, glow = null, alpha = 1) {
  const m = new B.StandardMaterial(name, scene);
  m.diffuseColor = B.Color3.FromHexString(color);
  m.specularColor = B.Color3.FromHexString("#241810").scale(.12);
  if (glow) m.emissiveColor = B.Color3.FromHexString(glow);
  m.alpha = alpha;
  m.backFaceCulling = alpha === 1;
  return m;
}
function box(scene, name, material, x, y, z, sx, sy, sz, yaw = 0) {
  const m = B.MeshBuilder.CreateBox(name, { width:sx, height:sy, depth:sz }, scene);
  m.position.set(x,y,z); m.rotation.y = yaw; m.material=material;
  return m;
}
function rock(scene, material, x,y,z, sx,sy,sz, yaw=0) {
  const m = B.MeshBuilder.CreatePolyhedron("hand-chipped-stone", { type:1,size:1 }, scene);
  m.position.set(x,y,z); m.scaling.set(sx,sy,sz); m.rotation.y=yaw; m.material=material;
  return m;
}
function line(scene,name,points,color) {
  const m = B.MeshBuilder.CreateLines(name,{points},scene);
  m.color = B.Color3.FromHexString(color); m.isPickable=false;
  return m;
}
function circle(scene,name,x,z,r,y,color,segments=80,start=0,end=2*Math.PI) {
  const pts=[];
  for(let i=0;i<=segments;i++){
    const t=start+(end-start)*i/segments;
    pts.push(v(x+Math.cos(t)*r,y,z+Math.sin(t)*r));
  }
  return line(scene,name,pts,color);
}
function tile(scene, material, coordinates, y) {
  const mesh = new B.Mesh("carved-sandstone-paver",scene);
  const positions=[];
  for(const [x,z] of coordinates) positions.push(x,y,z);
  const vd = new B.VertexData();
  vd.positions=positions; vd.indices=[0,1,2,0,2,3]; vd.normals=[];
  B.VertexData.ComputeNormals(vd.positions,vd.indices,vd.normals); vd.applyToMesh(mesh);
  mesh.material=material;
  return mesh;
}

export function addHighDetail(scene, ground, soil, randomSource) {
  const rand=rng(95277);
  const updates=[];
  const basalt=makeMat(scene,"ruin-basalt","#3e332c");
  const carved=makeMat(scene,"ruin-carved","#76604b");
  const stoneTop=makeMat(scene,"ruin-stone-faces","#8a7158");
  const stoneDark=makeMat(scene,"deep-paver","#624e3f");
  const stoneMid=makeMat(scene,"mid-paver","#80664e");
  const stoneLight=makeMat(scene,"light-paver","#9a7959");
  const grout=makeMat(scene,"grout","#48382e");
  const bronze=makeMat(scene,"gold-leaf","#a6814c");
  const banner=makeMat(scene,"burgundy-banner","#653126");
  const bannerGold=makeMat(scene,"banner-crest","#cc985b", "#241406");
  const leaf=makeMat(scene,"ash-leaf","#6a5b30");
  const leafLight=makeMat(scene,"warm-leaf","#8b773b");
  const branch=makeMat(scene,"branches","#50402a");
  const ember=makeMat(scene,"detail-embers","#ffaf57","#c65a1c");
  const molten=makeMat(scene,"hot-cracks","#e55a2d","#c94018");
  const hot=makeMat(scene,"hot-runes","#ff9d4b","#e46b24");
  const sigil=makeMat(scene,"etched-lines","#b08b60");
  const centerX=0,centerZ=0;

  // Draw high-res hand-authored-looking rough sandstone, no network texture.
  const texture=new B.DynamicTexture("sandstone-1024",{width:1024,height:1024},scene,false);
  const ctx=texture.getContext();
  ctx.fillStyle="#876a53"; ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<3100;i++){
    const x=rand()*1024,y=rand()*1024,s=1+rand()*9;
    ctx.fillStyle=rand()>.5?"rgba(236,194,142,.055)":"rgba(43,27,19,.08)";
    ctx.fillRect(x,y,s,s*(.35+rand()));
  }
  for(let i=0;i<95;i++){
    const x=rand()*1024,y=rand()*1024,len=12+rand()*77;
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.lineTo(x+len*.5,y+len*(rand()-.5));
    ctx.lineTo(x+len,y+(rand()-.5)*len);
    ctx.strokeStyle="rgba(40,28,22,.13)";ctx.lineWidth=.8+rand()*1.4;ctx.stroke();
  }
  texture.update();
  soil.diffuseTexture=texture;
  soil.diffuseColor=B.Color3.FromHexString("#fff1de");
  // Ground mesh in world.js provides matching UVs for this generated texture.
  const tileMaterials=[stoneDark,stoneMid,stoneLight,carved];

  // Fine individual 3D stone slabs arranged in annular bands. Each has unique skew and tone.
  const bands=[
    [3.6,4.65,42],[4.86,6.15,55],[6.35,7.85,68],
    [8.12,9.63,78],[9.87,11.35,91],[11.57,13.22,104]
  ];
  for(let b=0;b<bands.length;b++){
    const [inner,outer,count]=bands[b], drift=b%2 ? .011 : 0;
    for(let k=0;k<count;k++){
      const a0=2*Math.PI*(k+drift)/count+.008;
      const a1=2*Math.PI*(k+1+drift)/count-.008;
      const innerVariation=(rand()-.5)*.065,outerVariation=(rand()-.5)*.065;
      const proj=(a,r)=>[Math.cos(a)*r*1.17,Math.sin(a)*r*.99];
      const quad=[
        proj(a0,inner+.055+innerVariation),proj(a1,inner+.055+innerVariation),
        proj(a1,outer-.05+outerVariation),proj(a0,outer-.05+outerVariation)
      ];
      const material=tileMaterials[Math.floor(rand()*tileMaterials.length)];
      tile(scene,material,quad,.041+b*.0005);
    }
    circle(scene,"engraved-masonry-ring",centerX,centerZ,outer*1.01,.048,"#a18465",112);
    circle(scene,"deep-carving",centerX,centerZ,inner*.98,.048,"#4d3729",112);
  }
  // More distinct brass-inlaid concentric runic line work.
  for (const r of [2.7,3.08,7.95,13.53]){
    circle(scene,"brass-arena-inlay",0,0,r,.065,"#b28b52",144);
  }
  for(let i=0;i<36;i++){
    const a=i*2*Math.PI/36;
    const r=3.14+(i%3)*.16;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const icon=box(scene,"carved-rune-chip",i%3===0?bronze:stoneTop,x,.067,z,.07,.008,.24,-a);
    icon.isPickable=false;
  }
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12;
    const r=7.95;
    const begin=v(Math.cos(a)*r,.067,Math.sin(a)*r);
    const end=v(Math.cos(a)*(r+.43),.067,Math.sin(a)*(r+.43));
    line(scene,"radial-engraving",[begin,end],"#d1a76b");
  }
  // Scatter narrow fractures and broken paver chips across the playable space.
  for(let i=0;i<95;i++){
    const a=rand()*Math.PI*2,r=5+rand()*12;
    const x=Math.cos(a)*r*1.16,z=Math.sin(a)*r;
    if(x*x/(25*25)+z*z/(16.3*16.3)>1) continue;
    const p0=v(x,.07,z),p1=v(x+(rand()-.5)*.45,.07,z+(rand()-.5)*.42);
    line(scene,"fine-tile-crack",[p0,p1],"#493326");
    if(i%3===0) rock(scene,rand()>.5?carved:basalt,x,.095,z,.09+rand()*.14,.1,.09,rand()*Math.PI);
  }

  // Layered square temple ruins around the arena border, with iron-banded banners.
  function ruinPillar(x,z,h,angle=0,withBanner=false) {
    const root=new B.TransformNode("carved-boundary-pillar",scene);
    root.position.set(x,0,z);root.rotation.y=angle;
    function member(n,ma,px,py,pz,sx,sy,sz) {
      const mesh=box(scene,n,ma,px,py,pz,sx,sy,sz); mesh.parent=root;return mesh;
    }
    member("foundation",basalt,0,.28,0,2.95,.57,2.95);
    member("carved-base",carved,0,.56,0,2.52,.35,2.55);
    member("granite-shaft",stoneDark,0,h/2+.61,0,1.82,h,1.83);
    for(const cornerX of [-.85,.85])for(const cornerZ of [-.85,.85]){
      member("raised-masonry-edge",carved,cornerX,h/2+.6,cornerZ,.17,h,.17);
    }
    member("column-collar",stoneTop,0,h+.54,0,2.23,.23,2.28);
    member("column-cornice",basalt,0,h+.79,0,2.70,.31,2.7);
    member("broken-cap",stoneTop,-.12,h+.99,0,2.45,.17,2.46);
    rock(scene,carved,x-.25,h+1.22,z,.63,.23,.5,angle+.25);
    if(withBanner){
      member("banner-crossbar",bronze,0,h+.15,1.03,1.68,.105,.18);
      const cloth=member("embroidered-war-banner",banner,0,h-1.1,1.08,1.4,2.35,.065);
      const crest=member("banner-gold-crest",bannerGold,0,h-.75,1.134,.66,.60,.012);
      crest.rotation.z=Math.PI/4;
      member("banner-tip",bronze,0,h-2.22,1.095,.20,.21,.08);
    }
  }
  [
    [-24.5,  10.8,4.6,.18,true], [23.6,10.4,5.1,-.16,true],
    [-24.0,-11.4,4.2,.13,true], [23.6,-12.5,4.6,-.15,true],
    [-9.5,  17.1,3.1,.04,false], [11.4,16.7,3.5,-.08,false]
  ].forEach(p=>ruinPillar(...p));

  function shrub(x,z,scale) {
    const stalk=box(scene,"twig",branch,x,.40*scale,z,.12*scale,.65*scale,.12*scale);
    for(let i=0;i<5;i++){
      const a=i*2.4;
      rock(scene,i%2?leaf:leafLight,x+Math.sin(a)*.3*scale,.65*scale+(i%2)*.12,z+Math.cos(a)*.28*scale,.36*scale,.34*scale,.35*scale,a);
    }
  }
  [
    [-23,13.2,1.7],[-22,8.5,1.1],[-25,-10,1.8],[-18,-15.5,1.0],
    [21.5,13,1.7],[25.0,9.0,1.15],[24.2,-10,1.3],[13,15.2,.8],
    [-11.5,16.2,1.1],[6.8,16.0,.9],[-20,-13,1.0],[18.2,-14,.95]
  ].forEach(s=>shrub(...s));

  // Damage indicators are now owned by BossEncounter, and only appear during a cast.

  // A few floating embers around braziers, all low-overhead animated meshes.
  const sparks=[];
  for(const [x,z] of [[-23.3,-.5],[23,.4]]){
    for(let i=0;i<20;i++){
      const a=rand()*6.283, dist=rand()*.43;
      const m=B.MeshBuilder.CreateSphere("ember-particle",{diameter:.048+rand()*.055,segments:4},scene);
      m.material=i%4?ember:hot;
      m.position.set(x+Math.cos(a)*dist,.7+rand()*1.5,z+Math.sin(a)*dist);
      sparks.push({mesh:m,x,z,seed:rand()*11,speed:.6+rand()*.95,angle:a,dist});
    }
  }
  updates.push((dt,t)=>{
    for(const p of sparks){
      p.mesh.position.x=p.x+Math.cos(p.angle+t*1.4)*p.dist;
      p.mesh.position.y=.65+((t*p.speed+p.seed)%2.3);
      p.mesh.position.z=p.z+Math.sin(p.angle+t*1.1)*p.dist;
    }
  });
  return {update(dt,t){for(const cb of updates)cb(dt,t);}};
}
