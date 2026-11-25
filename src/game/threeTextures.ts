import * as THREE from 'three';

export interface SunderloomTextureSuite {
  floorAlbedo: THREE.CanvasTexture;
  floorBump: THREE.CanvasTexture;
  floorRoughness: THREE.CanvasTexture;
  wallAlbedo: THREE.CanvasTexture;
  wallBump: THREE.CanvasTexture;
  wallRoughness: THREE.CanvasTexture;
  metalAlbedo: THREE.CanvasTexture;
  metalRoughness: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  fireSprite: THREE.CanvasTexture;
  coalBed: THREE.CanvasTexture;
  sigilStart: THREE.CanvasTexture;
  sigilTreasure: THREE.CanvasTexture;
  sigilBoss: THREE.CanvasTexture;
  dispose: () => void;
}

function seededNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Weathered volcanic basalt flagstones in warm charred-ash dark fantasy tones (Elden Ring / Diablo IV style).
 */
function createObsidianFloorMaps(anisotropy: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  albedoCanvas.width = bumpCanvas.width = roughCanvas.width = size;
  albedoCanvas.height = bumpCanvas.height = roughCanvas.height = size;

  const aCtx = albedoCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;
  const rCtx = roughCanvas.getContext('2d')!;

  // Deep charred mortar bed
  aCtx.fillStyle = '#120f0d';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#151515';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#e5e5e5';
  rCtx.fillRect(0, 0, size, size);

  const tiles = 4;
  const tileSize = size / tiles;
  const mortar = 7;

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const offset = ty % 2 === 1 ? tileSize * 0.5 : 0;
      const baseX = (tx * tileSize + offset) % size;
      const baseY = ty * tileSize;
      const shade = seededNoise(tx, ty, 11);

      const drawStone = (ox: number) => {
        const x = ox + mortar * 0.5;
        const y = baseY + mortar * 0.5;
        const w = tileSize - mortar;
        const h = tileSize - mortar;

        // Warm weathered basalt / ironstone tones (no artificial blue tint)
        const r = Math.round(42 + shade * 18);
        const g = Math.round(38 + shade * 16);
        const b = Math.round(35 + shade * 14);
        const grad = aCtx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, `rgb(${r + 10}, ${g + 9}, ${b + 8})`);
        grad.addColorStop(0.55, `rgb(${r}, ${g}, ${b})`);
        grad.addColorStop(1, `rgb(${Math.max(15, r - 9)}, ${Math.max(13, g - 9)}, ${Math.max(12, b - 8)})`);
        aCtx.fillStyle = grad;
        aCtx.fillRect(x, y, w, h);

        // Chiseled stone bevel edge
        aCtx.strokeStyle = 'rgba(186, 170, 148, 0.14)';
        aCtx.lineWidth = 2;
        aCtx.strokeRect(x + 2, y + 2, w - 4, h - 4);

        bCtx.fillStyle = `rgb(${Math.round(170 + shade * 45)}, ${Math.round(170 + shade * 45)}, ${Math.round(170 + shade * 45)})`;
        bCtx.fillRect(x + 3, y + 3, w - 6, h - 6);
        bCtx.strokeStyle = '#606060';
        bCtx.lineWidth = 4;
        bCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);

        // Damp vs dry stone roughness variation
        const roughVal = Math.round(115 + shade * 70);
        rCtx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
        rCtx.fillRect(x + 2, y + 2, w - 4, h - 4);

        // Micro stone fissures, soot patches & mineral pitting
        for (let k = 0; k < 28; k++) {
          const px = x + 6 + seededNoise(tx * 31 + k, ty * 17, 3) * (w - 12);
          const py = y + 6 + seededNoise(tx * 13, ty * 29 + k, 7) * (h - 12);
          const rad = 1.5 + seededNoise(k, tx, 21) * 7;
          aCtx.fillStyle = k % 3 === 0 ? 'rgba(175, 162, 142, 0.06)' : 'rgba(10, 8, 7, 0.18)';
          aCtx.beginPath();
          aCtx.arc(px, py, rad, 0, Math.PI * 2);
          aCtx.fill();

          bCtx.fillStyle = k % 2 === 0 ? 'rgba(55, 55, 55, 0.42)' : 'rgba(225, 225, 225, 0.2)';
          bCtx.beginPath();
          bCtx.arc(px, py, rad * 0.85, 0, Math.PI * 2);
          bCtx.fill();

          rCtx.fillStyle = k % 4 === 0 ? 'rgba(52, 52, 52, 0.35)' : 'rgba(195, 195, 195, 0.25)';
          rCtx.beginPath();
          rCtx.arc(px, py, rad * 1.4, 0, Math.PI * 2);
          rCtx.fill();
        }
      };

      drawStone(baseX);
      if (baseX + tileSize > size) drawStone(baseX - size);
    }
  }

  // Tarnished antique bronze hairline expansion seam
  aCtx.strokeStyle = 'rgba(168, 128, 72, 0.26)';
  aCtx.lineWidth = 3;
  aCtx.strokeRect(2, 2, size - 4, size - 4);
  rCtx.strokeStyle = '#505050';
  rCtx.lineWidth = 4;
  rCtx.strokeRect(2, 2, size - 4, size - 4);

  return {
    albedo: configureTexture(albedoCanvas, true, anisotropy),
    bump: configureTexture(bumpCanvas, false, anisotropy),
    roughness: configureTexture(roughCanvas, false, anisotropy),
  };
}

/**
 * Heavy weathered cathedral ashlar stone walls with soot gradients & carved bronze relief molding.
 */
function createVaultWallMaps(anisotropy: number): {
  albedo: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  albedoCanvas.width = bumpCanvas.width = roughCanvas.width = size;
  albedoCanvas.height = bumpCanvas.height = roughCanvas.height = size;

  const aCtx = albedoCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;
  const rCtx = roughCanvas.getContext('2d')!;

  aCtx.fillStyle = '#14110f';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#1c1c1c';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#dadada';
  rCtx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 4;
  const rowH = size / rows;
  const colW = size / cols;

  for (let row = 0; row < rows; row++) {
    const shift = (row % 2) * (colW * 0.5);
    for (let col = 0; col < cols; col++) {
      const shade = seededNoise(col, row, 47);
      const drawBlock = (bx: number) => {
        const x = bx + 3;
        const y = row * rowH + 3;
        const w = colW - 6;
        const h = rowH - 6;

        const heightTone = 0.68 + (row / rows) * 0.38;
        const r = Math.round((48 + shade * 20) * heightTone);
        const g = Math.round((43 + shade * 17) * heightTone);
        const b = Math.round((39 + shade * 14) * heightTone);
        aCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        aCtx.fillRect(x, y, w, h);

        aCtx.fillStyle = 'rgba(205, 190, 168, 0.12)';
        aCtx.fillRect(x, y, w, 3);
        aCtx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        aCtx.fillRect(x, y + h - 5, w, 5);

        const bVal = Math.round(158 + shade * 58);
        bCtx.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
        bCtx.fillRect(x + 2, y + 2, w - 4, h - 4);

        const rVal = Math.round(150 + shade * 60);
        rCtx.fillStyle = `rgb(${rVal}, ${rVal}, ${rVal})`;
        rCtx.fillRect(x + 2, y + 2, w - 4, h - 4);
      };

      const bx = (col * colW + shift) % size;
      drawBlock(bx);
      if (bx + colW > size) drawBlock(bx - size);
    }
  }

  // Tarnished hammered bronze architectural frieze band
  aCtx.fillStyle = '#473620';
  aCtx.fillRect(0, 34, size, 16);
  aCtx.fillStyle = '#8c693b';
  aCtx.fillRect(0, 39, size, 6);
  rCtx.fillStyle = '#606060';
  rCtx.fillRect(0, 34, size, 16);

  return {
    albedo: configureTexture(albedoCanvas, true, anisotropy),
    bump: configureTexture(bumpCanvas, false, anisotropy),
    roughness: configureTexture(roughCanvas, false, anisotropy),
  };
}

/**
 * Weathered blackened Damascus steel & forged armor texture (matte realism, never plastic gloss).
 */
function createBrushedMetalMaps(anisotropy: number): {
  albedo: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
} {
  const size = 256;
  const aCanvas = document.createElement('canvas');
  const rCanvas = document.createElement('canvas');
  aCanvas.width = rCanvas.width = size;
  aCanvas.height = rCanvas.height = size;

  const aCtx = aCanvas.getContext('2d')!;
  const rCtx = rCanvas.getContext('2d')!;

  aCtx.fillStyle = '#3b3937';
  aCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#888888';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const y = seededNoise(i, 1, 9) * size;
    const alpha = 0.04 + seededNoise(i, 2, 9) * 0.1;
    aCtx.fillStyle = i % 2 === 0 ? `rgba(215, 205, 190, ${alpha})` : `rgba(12, 10, 9, ${alpha})`;
    aCtx.fillRect(0, y, size, 1.4);

    const rv = Math.round(92 + seededNoise(i, 3, 9) * 85);
    rCtx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`;
    rCtx.fillRect(0, y, size, 1.4);
  }

  return {
    albedo: configureTexture(aCanvas, true, anisotropy),
    roughness: configureTexture(rCanvas, false, anisotropy),
  };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural organic billowing fire tongue sprite (zero solid geometric cones).
 */
function createOrganicFireTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Outer smoldering orange-red fire aura
  const outer = ctx.createRadialGradient(size * 0.5, size * 0.66, 4, size * 0.5, size * 0.56, size * 0.44);
  outer.addColorStop(0, 'rgba(255, 245, 210, 1)');
  outer.addColorStop(0.28, 'rgba(255, 175, 65, 0.92)');
  outer.addColorStop(0.62, 'rgba(218, 84, 24, 0.52)');
  outer.addColorStop(1, 'rgba(140, 28, 8, 0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.06);
  ctx.bezierCurveTo(size * 0.84, size * 0.38, size * 0.86, size * 0.78, size * 0.5, size * 0.94);
  ctx.bezierCurveTo(size * 0.14, size * 0.78, size * 0.16, size * 0.38, size * 0.5, size * 0.06);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createCoalBedTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b110d';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 65; i++) {
    const x = seededNoise(i, 1, 17) * size;
    const y = seededNoise(i, 2, 17) * size;
    const r = 4 + seededNoise(i, 3, 17) * 9;
    ctx.fillStyle = i % 3 === 0 ? '#e6641e' : i % 3 === 1 ? '#f5a631' : '#261b18';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRunicSigilTexture(primaryHex: string, secondaryHex: string, anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  ctx.clearRect(0, 0, size, size);

  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, 228, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(c, c, 206, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = secondaryHex;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(c, c, 152, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(c, c);
  for (let rot = 0; rot < 2; rot++) {
    ctx.save();
    ctx.rotate((rot * Math.PI) / 4);
    ctx.strokeStyle = rot === 0 ? primaryHex : secondaryHex;
    ctx.lineWidth = 3;
    ctx.strokeRect(-108, -108, 216, 216);
    ctx.restore();
  }

  ctx.strokeStyle = primaryHex;
  ctx.lineWidth = 2.8;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -162);
    ctx.lineTo(0, -198);
    ctx.moveTo(-8, -182);
    ctx.lineTo(8, -172);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createSunderloomTextureSuite(anisotropy: number): SunderloomTextureSuite {
  const floor = createObsidianFloorMaps(anisotropy);
  const wall = createVaultWallMaps(anisotropy);
  const metal = createBrushedMetalMaps(anisotropy);
  const contactShadow = createContactShadowTexture();
  const fireSprite = createOrganicFireTexture();
  const coalBed = createCoalBedTexture();
  // Authentic AAA Dark-Fantasy Engraved Floor Sigils (Tarnished Gold, Ember Bronze, Blood Crimson)
  const sigilStart = createRunicSigilTexture('rgba(200, 155, 84, 0.72)', 'rgba(217, 107, 39, 0.48)', anisotropy);
  const sigilTreasure = createRunicSigilTexture('rgba(224, 180, 106, 0.84)', 'rgba(242, 153, 74, 0.52)', anisotropy);
  const sigilBoss = createRunicSigilTexture('rgba(196, 52, 45, 0.85)', 'rgba(217, 107, 39, 0.58)', anisotropy);

  return {
    floorAlbedo: floor.albedo,
    floorBump: floor.bump,
    floorRoughness: floor.roughness,
    wallAlbedo: wall.albedo,
    wallBump: wall.bump,
    wallRoughness: wall.roughness,
    metalAlbedo: metal.albedo,
    metalRoughness: metal.roughness,
    contactShadow,
    fireSprite,
    coalBed,
    sigilStart,
    sigilTreasure,
    sigilBoss,
    dispose: () => {
      floor.albedo.dispose();
      floor.bump.dispose();
      floor.roughness.dispose();
      wall.albedo.dispose();
      wall.bump.dispose();
      wall.roughness.dispose();
      metal.albedo.dispose();
      metal.roughness.dispose();
      contactShadow.dispose();
      fireSprite.dispose();
      coalBed.dispose();
      sigilStart.dispose();
      sigilTreasure.dispose();
      sigilBoss.dispose();
    },
  };
}
