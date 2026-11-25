import * as THREE from 'three';
import type { EEnemyArchetype } from './types';
import type { SunderloomTextureSuite } from './threeTextures';

export interface WardenRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  swordArm: THREE.Group;
  offArm: THREE.Group;
  cloak: THREE.Group;
  iFrameAura: THREE.Mesh;
  slashArc: THREE.Mesh;
  slashMat: THREE.MeshBasicMaterial;
  armorMaterials: THREE.MeshStandardMaterial[];
  baseArmorColors: THREE.Color[];
}

export interface EnemyRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  weaponPivot: THREE.Group;
  limbA: THREE.Group;
  limbB: THREE.Group;
  accentMeshes: THREE.Mesh[];
  telegraphRing: THREE.Mesh;
  telegraphMat: THREE.MeshBasicMaterial;
  armorMaterials: THREE.MeshStandardMaterial[];
  baseColors: THREE.Color[];
}

export interface PedestalRig {
  root: THREE.Group;
  crystal: THREE.Mesh;
  halo: THREE.Mesh;
}

export interface PortalRig {
  root: THREE.Group;
  outerRing: THREE.Mesh;
  innerRing: THREE.Mesh;
  vortex: THREE.Mesh;
}

export interface SharedRigMaterials {
  blackenedSteel: THREE.MeshStandardMaterial;
  forgedIron: THREE.MeshStandardMaterial;
  antiqueGold: THREE.MeshStandardMaterial;
  charredCloth: THREE.MeshStandardMaterial;
  crimsonCloth: THREE.MeshStandardMaterial;
  emberGlow: THREE.MeshStandardMaterial;
  goldGlow: THREE.MeshStandardMaterial;
  crimsonGlow: THREE.MeshStandardMaterial;
  spectralGlow: THREE.MeshStandardMaterial;
  contactShadowMat: THREE.MeshBasicMaterial;
  fireFlameMat: THREE.MeshBasicMaterial;
  bossFireFlameMat: THREE.MeshBasicMaterial;
  coalBedMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createSharedRigMaterials(textures: SunderloomTextureSuite): SharedRigMaterials {
  // Matte weathered blackened Damascus steel (zero shiny plastic look)
  const blackenedSteel = new THREE.MeshStandardMaterial({
    color: 0x4b4845,
    map: textures.metalAlbedo,
    roughnessMap: textures.metalRoughness,
    metalness: 0.78,
    roughness: 0.48,
  });

  const forgedIron = new THREE.MeshStandardMaterial({
    color: 0x33302d,
    map: textures.metalAlbedo,
    roughnessMap: textures.metalRoughness,
    metalness: 0.72,
    roughness: 0.56,
  });

  // Tarnished hammered antique bronze/gold trim
  const antiqueGold = new THREE.MeshStandardMaterial({
    color: 0xc2954e,
    roughnessMap: textures.metalRoughness,
    metalness: 0.86,
    roughness: 0.34,
  });

  const charredCloth = new THREE.MeshStandardMaterial({
    color: 0x1d1917,
    roughness: 0.94,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  const crimsonCloth = new THREE.MeshStandardMaterial({
    color: 0x5c1a18,
    roughness: 0.88,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });

  // Authentic AAA Dark-Fantasy Emissive Accents (Forge Ember, Tarnished Gold, Blood Crimson, Pale Silver)
  const emberGlow = new THREE.MeshStandardMaterial({
    color: 0xf59e42,
    emissive: 0xd96b27,
    emissiveIntensity: 2.0,
    roughness: 0.25,
    metalness: 0.15,
  });

  const goldGlow = new THREE.MeshStandardMaterial({
    color: 0xf0cf8e,
    emissive: 0xc89b54,
    emissiveIntensity: 1.9,
    roughness: 0.22,
    metalness: 0.3,
  });

  const crimsonGlow = new THREE.MeshStandardMaterial({
    color: 0xe6493e,
    emissive: 0xb8241d,
    emissiveIntensity: 2.1,
    roughness: 0.25,
    metalness: 0.15,
  });

  const spectralGlow = new THREE.MeshStandardMaterial({
    color: 0xeae3d5,
    emissive: 0xc9b99b,
    emissiveIntensity: 1.5,
    roughness: 0.22,
    metalness: 0.2,
  });

  const contactShadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });

  const fireFlameMat = new THREE.MeshBasicMaterial({
    map: textures.fireSprite,
    color: 0xffb35c,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const bossFireFlameMat = new THREE.MeshBasicMaterial({
    map: textures.fireSprite,
    color: 0xff5a36,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const coalBedMat = new THREE.MeshStandardMaterial({
    map: textures.coalBed,
    emissive: 0xd94e14,
    emissiveMap: textures.coalBed,
    emissiveIntensity: 1.45,
    roughness: 0.9,
  });

  return {
    blackenedSteel,
    forgedIron,
    antiqueGold,
    charredCloth,
    crimsonCloth,
    emberGlow,
    goldGlow,
    crimsonGlow,
    spectralGlow,
    contactShadowMat,
    fireFlameMat,
    bossFireFlameMat,
    coalBedMat,
    dispose: () => {
      blackenedSteel.dispose();
      forgedIron.dispose();
      antiqueGold.dispose();
      charredCloth.dispose();
      crimsonCloth.dispose();
      emberGlow.dispose();
      goldGlow.dispose();
      crimsonGlow.dispose();
      spectralGlow.dispose();
      contactShadowMat.dispose();
      fireFlameMat.dispose();
      bossFireFlameMat.dispose();
      coalBedMat.dispose();
    },
  };
}

function addContactShadow(parent: THREE.Object3D, radius: number, mat: THREE.MeshBasicMaterial): THREE.Mesh {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.025;
  plane.renderOrder = 1;
  parent.add(plane);
  return plane;
}

function setShadowFlags(obj: THREE.Object3D, cast: boolean, receive: boolean): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

/**
 * Multi-layered organic volumetric flame cluster (crossed additive fire tongues + ember coal disc).
 */
export function createOrganicFireCluster(
  mats: SharedRigMaterials,
  isBoss: boolean,
  scale = 1.0,
): THREE.Group {
  const fireGroup = new THREE.Group();
  const flameMat = isBoss ? mats.bossFireFlameMat : mats.fireFlameMat;

  // Glowing hot coal bed inside brazier bowl
  const coals = new THREE.Mesh(new THREE.CylinderGeometry(0.36 * scale, 0.28 * scale, 0.08 * scale, 10), mats.coalBedMat);
  fireGroup.add(coals);

  // 4 crossed offset flame planes for realistic 360-degree volumetric fire silhouette
  const planeGeo = new THREE.PlaneGeometry(0.66 * scale, 0.96 * scale);
  planeGeo.translate(0, 0.44 * scale, 0);
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(planeGeo, flameMat);
    f.rotation.y = (i / 4) * Math.PI;
    f.position.set(
      Math.cos(i * 1.9) * 0.05 * scale,
      0.02 * scale,
      Math.sin(i * 1.9) * 0.05 * scale,
    );
    f.scale.set(0.88 + (i % 2) * 0.18, 0.85 + ((i + 1) % 3) * 0.14, 1);
    fireGroup.add(f);
  }
  return fireGroup;
}

/**
 * Sculpted 18-part Gothic Armored Unbound Warden (Elden Ring / Dark Souls silhouette, grounded at y = 0).
 */
export function createWardenRig(mats: SharedRigMaterials): WardenRig {
  const root = new THREE.Group();
  addContactShadow(root, 0.95, mats.contactShadowMat);

  const armorMat = mats.blackenedSteel.clone();
  const trimMat = mats.antiqueGold.clone();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // 1. Articulated armored legs with poleyn knee guards & sabaton boots
  const makeLeg = (xOffset: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(xOffset, 0.82, 0);
    const cuisse = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.115, 0.4, 8), mats.charredCloth);
    cuisse.position.y = -0.2;
    const knee = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), armorMat);
    knee.position.set(0, -0.4, 0.07);
    knee.scale.set(1.0, 1.15, 0.75);
    const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.44, 8), armorMat);
    greave.position.y = -0.58;
    const sabaton = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.13, 0.34), armorMat);
    sabaton.position.set(0, -0.75, 0.06);
    leg.add(cuisse, knee, greave, sabaton);
    return leg;
  };
  const leftLeg = makeLeg(-0.18);
  const rightLeg = makeLeg(0.18);
  bodyPivot.add(leftLeg, rightLeg);

  // 2. Layered leather/iron waist belt + hanging armor tassets (faulds skirt)
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.15, 10), trimMat);
  belt.position.y = 0.88;
  bodyPivot.add(belt);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.05), armorMat);
    tasset.position.set(Math.cos(a) * 0.24, 0.72, Math.sin(a) * 0.24);
    tasset.rotation.y = -a + Math.PI / 2;
    tasset.rotation.x = 0.14;
    bodyPivot.add(tasset);
  }
  const tabard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 0.04), mats.crimsonCloth);
  tabard.position.set(0, 0.62, 0.26);
  bodyPivot.add(tabard);

  // 3. Sculpted fluted gothic breastplate with central ridge & ember chest reliquary
  const cuirass = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.24, 0.64, 6), armorMat);
  cuirass.position.y = 1.26;
  cuirass.rotation.y = Math.PI / 6;
  const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.16, 8), trimMat);
  gorget.position.y = 1.56;
  const chestSigil = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), mats.emberGlow);
  chestSigil.position.set(0, 1.34, 0.29);
  chestSigil.scale.set(0.75, 1.35, 0.4);
  bodyPivot.add(cuirass, gorget, chestSigil);

  // 4. Layered Angular Winged Gothic Pauldrons (Zero spherical balls!)
  for (const side of [-1, 1]) {
    const pGroup = new THREE.Group();
    pGroup.position.set(side * 0.42, 1.52, 0);
    pGroup.rotation.z = -side * 0.36;

    const plateTop = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.38), armorMat);
    const plateMid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.34), armorMat);
    plateMid.position.set(side * 0.05, -0.1, 0);
    plateMid.rotation.z = -side * 0.18;
    const goldEdge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.4), trimMat);
    goldEdge.position.y = 0.06;
    const ridgeFin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 4), trimMat);
    ridgeFin.position.set(side * 0.04, 0.16, -0.02);
    ridgeFin.rotation.z = -side * 0.25;
    pGroup.add(plateTop, plateMid, goldEdge, ridgeFin);
    bodyPivot.add(pGroup);
  }

  // 5. Sculpted Gothic Barbute Helmet + Hooded Cloak Mantle + Smoldering Visor
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.76, 0.02);
  const helmDome = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.32, 6), armorMat);
  const helmCrown = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 6), armorMat);
  helmCrown.position.y = 0.24;
  const browTrim = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.28), trimMat);
  browTrim.position.set(0, 0.07, 0.06);
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.52, 7), mats.charredCloth);
  hood.position.set(0, 0.1, -0.09);
  hood.rotation.x = -0.4;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.042, 0.06), mats.emberGlow);
  visor.position.set(0, 0.01, 0.18);
  headGroup.add(helmDome, helmCrown, browTrim, hood, visor);
  bodyPivot.add(headGroup);

  // 6. Multi-panel Flowing Tattered Dark-Crimson & Charred War Cloak
  const cloak = new THREE.Group();
  cloak.position.set(0, 1.54, -0.24);
  const outerCapeGeo = new THREE.PlaneGeometry(0.76, 1.24, 2, 3);
  outerCapeGeo.translate(0, -0.62, 0);
  const outerCape = new THREE.Mesh(outerCapeGeo, mats.charredCloth);
  const innerCapeGeo = new THREE.PlaneGeometry(0.64, 1.12, 2, 2);
  innerCapeGeo.translate(0, -0.56, 0.02);
  const innerCape = new THREE.Mesh(innerCapeGeo, mats.crimsonCloth);
  cloak.add(outerCape, innerCape);
  cloak.rotation.x = 0.24;
  bodyPivot.add(cloak);

  // 7. Left off-arm with armored vambrace & hand
  const offArm = new THREE.Group();
  offArm.position.set(-0.44, 1.42, 0);
  const leftUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.078, 0.34, 8), mats.charredCloth);
  leftUpper.position.y = -0.16;
  const leftVambrace = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.068, 0.3, 6), armorMat);
  leftVambrace.position.set(0, -0.44, 0.04);
  const leftCuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.14), trimMat);
  leftCuff.position.set(0, -0.54, 0.04);
  offArm.add(leftUpper, leftVambrace, leftCuff);
  bodyPivot.add(offArm);

  // 8. Right sword arm gripping long Forged Obsidian Runeblade
  const swordArm = new THREE.Group();
  swordArm.position.set(0.44, 1.42, 0);
  const rightUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.34, 8), mats.charredCloth);
  rightUpper.position.y = -0.16;
  const rightVambrace = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.3, 6), armorMat);
  rightVambrace.position.set(0, -0.44, 0.04);
  swordArm.add(rightUpper, rightVambrace);

  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(0.02, -0.56, 0.16);
  bladeGroup.rotation.x = Math.PI * 0.45;
  const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), trimMat);
  pommel.position.y = -0.22;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.36, 8), mats.crimsonCloth);
  const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.075, 0.11), trimMat);
  crossguard.position.y = 0.19;
  const bladeSteel = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.5, 0.032), armorMat);
  bladeSteel.position.y = 0.96;
  const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.3, 4), armorMat);
  bladeTip.position.y = 1.85;
  bladeTip.rotation.y = Math.PI / 4;
  const emberFuller = new THREE.Mesh(new THREE.BoxGeometry(0.034, 1.36, 0.046), mats.emberGlow);
  emberFuller.position.y = 0.94;
  bladeGroup.add(pommel, grip, crossguard, bladeSteel, bladeTip, emberFuller);
  swordArm.add(bladeGroup);
  bodyPivot.add(swordArm);

  setShadowFlags(bodyPivot, true, true);

  // Subtle Spectral-Gold Phase Step I-Frame Ward Shell
  const iFrameAura = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.0, 1),
    new THREE.MeshBasicMaterial({
      color: 0xe0b46a,
      transparent: true,
      opacity: 0.26,
      wireframe: true,
      depthWrite: false,
    }),
  );
  iFrameAura.position.y = 1.05;
  iFrameAura.visible = false;
  root.add(iFrameAura);

  // 3D Crescent Forged Ember Blade Sweep Arc
  const slashMat = new THREE.MeshBasicMaterial({
    color: 0xe0b46a,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const slashGeo = new THREE.RingGeometry(0.78, 2.05, 24, 1, -Math.PI * 0.44, Math.PI * 0.88);
  const slashArc = new THREE.Mesh(slashGeo, slashMat);
  slashArc.rotation.x = -Math.PI / 2;
  slashArc.rotation.z = -Math.PI / 2;
  slashArc.position.y = 1.08;
  slashArc.visible = false;
  root.add(slashArc);

  return {
    root,
    bodyPivot,
    leftLeg,
    rightLeg,
    swordArm,
    offArm,
    cloak,
    iFrameAura,
    slashArc,
    slashMat,
    armorMaterials: [armorMat, trimMat],
    baseArmorColors: [armorMat.color.clone(), trimMat.color.clone()],
  };
}

/**
 * Ultra-Detailed Menacing 3D Loomborn Enemies (4 Distinct Dark-Fantasy Sculpted Silhouettes).
 */
export function createEnemyRig(archetype: EEnemyArchetype, mats: SharedRigMaterials): EnemyRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  const weaponPivot = new THREE.Group();
  const limbA = new THREE.Group();
  const limbB = new THREE.Group();
  const accentMeshes: THREE.Mesh[] = [];
  const armorMaterials: THREE.MeshStandardMaterial[] = [];

  const bodyMat = mats.forgedIron.clone();
  armorMaterials.push(bodyMat);

  if (archetype === 'ThreadlingRusher') {
    // Segmented chitinous dark-iron arachnid-stalker with glowing furnace core & jointed razor legs
    bodyMat.color.setHex(0x2e211f);
    bodyMat.roughness = 0.44;
    addContactShadow(root, 0.82, mats.contactShadowMat);

    const abdomen = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), bodyMat);
    abdomen.position.set(0, 0.58, -0.22);
    abdomen.scale.set(0.95, 0.75, 1.42);
    const dorsalPlate1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.36), mats.blackenedSteel);
    dorsalPlate1.position.set(0, 0.82, -0.18);
    dorsalPlate1.rotation.x = -0.22;
    const thorax = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.52, 6), bodyMat);
    thorax.rotation.x = Math.PI / 2;
    thorax.position.set(0, 0.54, 0.24);
    const furnaceSpine = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), mats.crimsonGlow);
    furnaceSpine.position.set(0, 0.92, -0.05);
    accentMeshes.push(furnaceSpine);

    // 4 glowing predator eyes + serrated curved iron mandibles
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), mats.emberGlow);
      eye.position.set(s * 0.11, 0.62, 0.46);
      const fangUpper = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 5), mats.antiqueGold);
      fangUpper.rotation.x = Math.PI * 0.68;
      fangUpper.rotation.z = s * 0.22;
      fangUpper.position.set(s * 0.15, 0.46, 0.56);
      bodyPivot.add(eye, fangUpper);
    }

    // 6 jointed two-segment spider-stalker iron legs
    for (let i = 0; i < 3; i++) {
      const zOff = 0.18 - i * 0.25;
      for (const side of [-1, 1]) {
        const legUnit = new THREE.Group();
        const femur = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.065, 0.075), bodyMat);
        femur.position.set(side * 0.34, 0.62, zOff);
        femur.rotation.z = side * 0.38;
        const tibia = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.62, 5), mats.blackenedSteel);
        tibia.position.set(side * 0.58, 0.32, zOff);
        tibia.rotation.z = Math.PI + side * 0.2;
        legUnit.add(femur, tibia);
        if ((i + (side > 0 ? 1 : 0)) % 2 === 0) limbA.add(legUnit);
        else limbB.add(legUnit);
      }
    }

    bodyPivot.add(abdomen, dorsalPlate1, thorax, furnaceSpine, limbA, limbB, weaponPivot);
  } else if (archetype === 'SpireArcanist') {
    // Levitating Cathedral Ash-Cultist Mage draped in tattered crimson/charcoal vestments & iron halo
    bodyMat.color.setHex(0x2a1b19);
    bodyMat.roughness = 0.78;
    bodyMat.metalness = 0.18;
    addContactShadow(root, 0.85, mats.contactShadowMat);

    const innerRobe = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.56, 8), bodyMat);
    innerRobe.position.y = 1.04;
    const crimsonStole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.32, 0.06), mats.crimsonCloth);
    crimsonStole.position.set(0, 1.08, 0.32);
    const ironYoke = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.065, 6, 8), mats.blackenedSteel);
    ironYoke.rotation.x = Math.PI / 2;
    ironYoke.position.y = 1.66;
    const crownHalo = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.032, 6, 16), mats.antiqueGold);
    crownHalo.position.set(0, 1.98, -0.18);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.52, 7), mats.charredCloth);
    hood.position.set(0, 1.96, -0.02);
    const maskFace = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.06), mats.antiqueGold);
    maskFace.position.set(0, 1.82, 0.16);
    const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.07), mats.emberGlow);
    eyeSlit.position.set(0, 1.84, 0.17);
    accentMeshes.push(eyeSlit);

    // Orbiting iron-bound ember reliquary shards + staff
    weaponPivot.position.set(0, 1.42, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mats.emberGlow);
      shard.position.set(Math.cos(a) * 0.68, 0.15 * Math.sin(a * 2), Math.sin(a) * 0.68);
      shard.scale.set(0.6, 1.7, 0.6);
      weaponPivot.add(shard);
      accentMeshes.push(shard);
    }

    bodyPivot.add(innerRobe, crimsonStole, ironYoke, crownHalo, hood, maskFace, eyeSlit, weaponPivot, limbA, limbB);
  } else if (archetype === 'IroncladLoomguard') {
    // Towering Cathedral Siege Juggernaut with horned greathelm, spiked pauldrons, tower shield & war-mace
    bodyMat.color.setHex(0x3a342e);
    bodyMat.metalness = 0.82;
    bodyMat.roughness = 0.42;
    addContactShadow(root, 1.35, mats.contactShadowMat);

    for (const [side, grp] of [
      [-1, limbA],
      [1, limbB],
    ] as const) {
      grp.position.set(side * 0.3, 0.96, 0);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.94, 7), bodyMat);
      leg.position.y = -0.47;
      const knee = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.24), mats.antiqueGold);
      knee.position.set(0, -0.38, 0.1);
      grp.add(leg, knee);
    }

    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.44, 0.98, 6), bodyMat);
    chest.position.y = 1.46;
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.48), mats.blackenedSteel);
    chestPlate.position.set(0, 1.52, 0.18);
    const beltSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 0.42, 8), mats.crimsonCloth);
    beltSkirt.position.y = 0.92;

    // Horned Cathedral Greathelm + Spiked Pauldrons
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.46, 6), bodyMat);
    helm.position.y = 2.16;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.065, 0.08), mats.emberGlow);
    visor.position.set(0, 2.16, 0.24);
    accentMeshes.push(visor);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.38, 5), mats.antiqueGold);
      horn.position.set(s * 0.22, 2.38, 0);
      horn.rotation.z = -s * 0.55;
      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.48), bodyMat);
      pauldron.position.set(s * 0.68, 1.82, 0);
      pauldron.rotation.z = -s * 0.32;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.34, 4), mats.antiqueGold);
      spike.position.set(s * 0.78, 2.04, 0);
      spike.rotation.z = -s * 0.45;
      bodyPivot.add(horn, pauldron, spike);
    }

    // Riveted Obsidian Greatshield on left side
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.52, 0.92), mats.blackenedSteel);
    shield.position.set(-0.72, 1.28, 0.28);
    const shieldBorder = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.58, 0.12), mats.antiqueGold);
    shieldBorder.position.set(-0.72, 1.28, 0.7);
    const shieldEmblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mats.antiqueGold);
    shieldEmblem.position.set(-0.82, 1.34, 0.28);

    // Colossal Flanged Siege War-Mace
    weaponPivot.position.set(0.74, 1.72, 0);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.05, 8), mats.forgedIron);
    shaft.position.set(0, -0.32, 0.4);
    shaft.rotation.x = Math.PI * 0.32;
    const maceHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), mats.antiqueGold);
    maceHead.position.set(0, 0.28, 1.15);
    const maceCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mats.emberGlow);
    maceCore.position.set(0, 0.28, 1.15);
    weaponPivot.add(shaft, maceHead, maceCore);

    bodyPivot.add(limbA, limbB, chest, chestPlate, beltSkirt, helm, visor, shield, shieldBorder, shieldEmblem, weaponPivot);
  } else {
    // WeaverWardenBoss — Towering 3.6m Horned Obsidian Sovereign Boss
    bodyMat.color.setHex(0x281c1a);
    bodyMat.metalness = 0.86;
    bodyMat.roughness = 0.36;
    addContactShadow(root, 2.25, mats.contactShadowMat);

    for (const [side, grp] of [
      [-1, limbA],
      [1, limbB],
    ] as const) {
      grp.position.set(side * 0.5, 1.36, 0);
      const pillarLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 1.36, 7), bodyMat);
      pillarLeg.position.y = -0.68;
      const kneePlate = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.38, 4), mats.antiqueGold);
      kneePlate.position.set(0, -0.52, 0.2);
      kneePlate.rotation.x = Math.PI * 0.2;
      grp.add(pillarLeg, kneePlate);
    }

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.56, 1.56, 7), bodyMat);
    torso.position.y = 2.12;
    const ribCage = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.88, 0.72), mats.blackenedSteel);
    ribCage.position.set(0, 2.18, 0.14);
    const furnaceHeart = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mats.crimsonGlow);
    furnaceHeart.position.set(0, 2.18, 0.58);
    accentMeshes.push(furnaceHeart);

    // Tattered royal crimson cape behind boss
    const bossCape = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 2.65), mats.crimsonCloth);
    bossCape.position.set(0, 1.65, -0.68);
    bossCape.rotation.x = 0.18;

    // Crowned Horned Sovereign Greathelm
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.62, 6), bodyMat);
    head.position.y = 3.18;
    const crownVisor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.09, 0.1), mats.crimsonGlow);
    crownVisor.position.set(0, 3.18, 0.34);
    accentMeshes.push(crownVisor);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.96, 6), mats.antiqueGold);
      horn.position.set(s * 0.42, 3.55, -0.05);
      horn.rotation.z = -s * 0.48;
      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 0.72), bodyMat);
      pauldron.position.set(s * 1.12, 2.68, 0);
      pauldron.rotation.z = -s * 0.3;
      const paulTrim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.76), mats.antiqueGold);
      paulTrim.position.set(s * 1.12, 2.94, 0);
      paulTrim.rotation.z = -s * 0.3;
      bodyPivot.add(horn, pauldron, paulTrim);
    }

    // Broken Antique-Gold Sovereign Astrolabe Halo
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.065, 8, 28), mats.antiqueGold);
    halo.position.set(0, 2.72, -0.52);
    accentMeshes.push(halo);

    // Colossal Double-Bladed Volcanic Halberd
    weaponPivot.position.set(1.18, 2.42, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 3.1, 8), mats.antiqueGold);
    pole.rotation.x = Math.PI * 0.4;
    pole.position.set(0, -0.35, 0.72);
    const halberdAxe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.52), mats.blackenedSteel);
    halberdAxe.position.set(0, 0.25, 1.95);
    const halberdEdge = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.18, 4), mats.crimsonGlow);
    halberdEdge.rotation.x = Math.PI * 0.4;
    halberdEdge.position.set(0, 0.34, 2.1);
    weaponPivot.add(pole, halberdAxe, halberdEdge);
    accentMeshes.push(halberdEdge);

    bodyPivot.add(limbA, limbB, torso, ribCage, furnaceHeart, bossCape, head, crownVisor, halo, weaponPivot);
  }

  setShadowFlags(bodyPivot, true, true);
  root.add(bodyPivot);

  // Ground attack telegraph warning ring (Blood Crimson)
  const telegraphMat = new THREE.MeshBasicMaterial({
    color: 0xc4342d,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(new THREE.RingGeometry(0.35, 1.0, 28), telegraphMat);
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.05;
  telegraphRing.visible = false;
  root.add(telegraphRing);

  return {
    root,
    bodyPivot,
    weaponPivot,
    limbA,
    limbB,
    accentMeshes,
    telegraphRing,
    telegraphMat,
    armorMaterials,
    baseColors: armorMaterials.map((m) => m.color.clone()),
  };
}

export function createPedestalRig(rarity: 'Common' | 'Rare' | 'Epic', mats: SharedRigMaterials): PedestalRig {
  const root = new THREE.Group();
  addContactShadow(root, 0.9, mats.contactShadowMat);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.78, 0.24, 8), mats.forgedIron);
  base.position.y = 0.12;
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.72, 8), mats.blackenedSteel);
  plinth.position.y = 0.58;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.4, 0.14, 8), mats.antiqueGold);
  collar.position.y = 0.96;

  const gemMat =
    rarity === 'Epic'
      ? mats.emberGlow
      : rarity === 'Rare'
        ? mats.goldGlow
        : mats.spectralGlow;

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), gemMat);
  crystal.position.y = 1.56;
  crystal.scale.set(0.75, 1.38, 0.75);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.03, 6, 20), gemMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.12;

  root.add(base, plinth, collar, crystal, halo);
  setShadowFlags(root, true, true);
  return { root, crystal, halo };
}

export function createPortalRig(mats: SharedRigMaterials): PortalRig {
  const root = new THREE.Group();
  addContactShadow(root, 1.85, mats.contactShadowMat);

  const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.82, 0.3, 12), mats.forgedIron);
  dais.position.y = 0.15;

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.18, 10, 28), mats.blackenedSteel);
  outerRing.position.y = 1.7;

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.065, 8, 24), mats.antiqueGold);
  innerRing.position.y = 1.7;

  const vortex = new THREE.Mesh(
    new THREE.CircleGeometry(1.14, 24),
    new THREE.MeshBasicMaterial({
      color: 0xe0b46a,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  vortex.position.y = 1.7;

  root.add(dais, outerRing, innerRing, vortex);
  setShadowFlags(dais, true, true);
  setShadowFlags(outerRing, true, true);
  return { root, outerRing, innerRing, vortex };
}
