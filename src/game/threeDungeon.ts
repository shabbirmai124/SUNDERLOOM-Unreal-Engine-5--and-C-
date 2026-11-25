import * as THREE from 'three';
import { DOORWAY_WIDTH_CM } from './dungeonGenerator';
import type { CardinalDir, GeneratedDungeon, GeneratedRoom } from './types';
import type { SunderloomTextureSuite } from './threeTextures';
import { createOrganicFireCluster, type SharedRigMaterials } from './threeModels';

export const CM_TO_M = 0.01;
const WALL_HEIGHT_M = 4.3;
const WALL_THICK_M = 0.68;

export interface BrazierAnchor {
  x: number;
  y: number;
  z: number;
  isBoss: boolean;
  fireGroup: THREE.Group;
  phase: number;
}

export interface RunicGateEntry {
  roomId: number;
  mesh: THREE.Mesh;
}

export interface CutawayWallGroup {
  roomId: number;
  dir: CardinalDir; // 0: East (+X), 1: South (+Z), 2: West (-X), 3: North (-Z)
  group: THREE.Group;
  currentScaleY: number;
}

export interface BuiltThreeDungeon {
  group: THREE.Group;
  braziers: BrazierAnchor[];
  runicGates: RunicGateEntry[];
  wallGroups: CutawayWallGroup[];
  dispose: () => void;
}

/**
 * Builds the massive, detailed 3D PBR Obsidian Cathedral Dungeon with:
 * - Textured weathered ashlar stone walls, cornices, gothic pilasters, & carved sealed alcoves
 * - Smart Cutaway Wall Groups (per room/side) so foreground walls NEVER block the camera
 * - Standing forged-iron cage braziers with multi-plane volumetric organic fire
 * - Shattered basalt debris clusters, rune obelisks, and deep subterranean abyss bed
 */
export function buildThreeDungeon(
  dungeon: GeneratedDungeon,
  textures: SunderloomTextureSuite,
  rigMats: SharedRigMaterials,
): BuiltThreeDungeon {
  const group = new THREE.Group();
  const braziers: BrazierAnchor[] = [];
  const runicGates: RunicGateEntry[] = [];
  const wallGroups: CutawayWallGroup[] = [];
  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMats.push(m);
    return m;
  };

  // Strictly matte weathered ashlar stone for all walls AND trim cornices (crisp readability, zero glare)
  const wallBaseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xa89f94,
      map: textures.wallAlbedo,
      bumpMap: textures.wallBump,
      bumpScale: 0.1,
      roughnessMap: textures.wallRoughness,
      roughness: 0.92,
      metalness: 0.04,
      envMapIntensity: 0.25,
    }),
  );

  const darkCarvedTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x696058,
      map: textures.wallAlbedo,
      bumpMap: textures.wallBump,
      bumpScale: 0.08,
      roughness: 0.9,
      metalness: 0.06,
      envMapIntensity: 0.25,
    }),
  );

  const gateMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xd97a29,
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );

  // Reusable architectural prop geometries
  const pillarShaftGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.42, WALL_HEIGHT_M + 0.15, 8));
  const pillarCapGeo = trackGeo(new THREE.BoxGeometry(1.04, 0.34, 1.04));
  const brazierLegGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.055, 0.98, 6));
  const brazierBowlGeo = trackGeo(new THREE.CylinderGeometry(0.46, 0.24, 0.32, 8));
  const archJambGeo = trackGeo(new THREE.BoxGeometry(0.56, WALL_HEIGHT_M + 0.05, 0.96));
  const rubbleGeo = trackGeo(new THREE.DodecahedronGeometry(0.24, 0));

  const doorSpanM = DOORWAY_WIDTH_CM * CM_TO_M;

  // Vast charred volcanic subterranean abyss beneath the entire dungeon (zero empty black void)
  const abyssW = (dungeon.bounds.maxX - dungeon.bounds.minX) * CM_TO_M + 90;
  const abyssD = (dungeon.bounds.maxY - dungeon.bounds.minY) * CM_TO_M + 90;
  const abyssCx = ((dungeon.bounds.minX + dungeon.bounds.maxX) / 2) * CM_TO_M;
  const abyssCz = ((dungeon.bounds.minY + dungeon.bounds.maxY) / 2) * CM_TO_M;
  const abyssFloor = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(abyssW, abyssD)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x120d0b,
        roughness: 0.96,
        metalness: 0.03,
        envMapIntensity: 0.15,
      }),
    ),
  );
  abyssFloor.rotation.x = -Math.PI / 2;
  abyssFloor.position.set(abyssCx, -3.2, abyssCz);
  group.add(abyssFloor);

  for (const room of dungeon.rooms) {
    const rx = room.x * CM_TO_M;
    const rz = room.y * CM_TO_M;
    const rw = room.width * CM_TO_M;
    const rd = room.height * CM_TO_M;
    const cx = rx + rw / 2;
    const cz = rz + rd / 2;

    // 1. Textured Matte PBR Basalt Flagstone Floor Slab + Carved Deep Sub-Foundation Skirt
    const floorAlbedo = textures.floorAlbedo.clone();
    const floorBump = textures.floorBump.clone();
    const floorRough = textures.floorRoughness.clone();
    floorAlbedo.repeat.set(rw / 4, rd / 4);
    floorBump.repeat.set(rw / 4, rd / 4);
    floorRough.repeat.set(rw / 4, rd / 4);
    floorAlbedo.needsUpdate = floorBump.needsUpdate = floorRough.needsUpdate = true;

    const floorTint =
      room.type === 'Boss'
        ? 0xa68680
        : room.type === 'Treasure'
          ? 0xb5a891
          : 0xa8a095;

    const floorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: floorTint,
        map: floorAlbedo,
        bumpMap: floorBump,
        bumpScale: 0.08,
        roughnessMap: floorRough,
        roughness: 0.9,
        metalness: 0.04,
        envMapIntensity: 0.24,
      }),
    );

    const floorMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(rw, 0.44, rd)), floorMat);
    floorMesh.position.set(cx, -0.22, cz);
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // 2. Room-specific Engraved Runic Floor Sigil Decal
    if (room.type === 'Start' || room.type === 'Treasure' || room.type === 'Boss') {
      const sigilTex =
        room.type === 'Boss'
          ? textures.sigilBoss
          : room.type === 'Treasure'
            ? textures.sigilTreasure
            : textures.sigilStart;
      const sigilRadius = room.type === 'Boss' ? 7.4 : 4.4;
      const sigilMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: sigilTex,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
          blending: THREE.AdditiveBlending,
        }),
      );
      const sigilPlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(sigilRadius, sigilRadius)), sigilMat);
      sigilPlane.rotation.x = -Math.PI / 2;
      sigilPlane.position.set(cx, 0.024, cz);
      group.add(sigilPlane);
    }

    // 3. Build all 4 Perimeter Vault Walls grouped per side for Smart Dynamic Wall Cutaway!
    buildSegmentedWallsForRoom(
      room,
      group,
      wallBaseMat,
      darkCarvedTrimMat,
      rigMats.antiqueGold,
      gateMat,
      archJambGeo,
      doorSpanM,
      runicGates,
      wallGroups,
      trackGeo,
    );

    // 4. Fluted Cathedral Corner Columns + Tripod Forged-Iron Braziers with Volumetric Organic Fire + Stone Debris
    const cornerOffset = 0.6;
    const brazierInset = 1.65;
    const corners: Array<[number, number, number, number]> = [
      [rx + cornerOffset, rz + cornerOffset, rx + brazierInset, rz + brazierInset],
      [rx + rw - cornerOffset, rz + cornerOffset, rx + rw - brazierInset, rz + brazierInset],
      [rx + cornerOffset, rz + rd - cornerOffset, rx + brazierInset, rz + rd - brazierInset],
      [rx + rw - cornerOffset, rz + rd - cornerOffset, rx + rw - brazierInset, rz + rd - brazierInset],
    ];

    corners.forEach(([px, pz, bx, bz], idx) => {
      // Corner column base plinth (always visible) + upper shaft
      const plinth = new THREE.Mesh(pillarCapGeo, darkCarvedTrimMat);
      plinth.position.set(px, 0.17, pz);
      plinth.receiveShadow = true;
      const shaft = new THREE.Mesh(pillarShaftGeo, wallBaseMat);
      shaft.position.set(px, WALL_HEIGHT_M / 2, pz);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      const band = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.45, 0.45, 0.16, 8)),
        rigMats.antiqueGold,
      );
      band.position.set(px, 2.35, pz);
      group.add(plinth, shaft, band);

      // Wrought-Iron Tripod Standing Forge Brazier with Ribbed Fire Cage & Organic Volumetric Fire
      const brazierGroup = new THREE.Group();
      brazierGroup.position.set(bx, 0, bz);
      for (let legIdx = 0; legIdx < 3; legIdx++) {
        const a = (legIdx / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(brazierLegGeo, rigMats.forgedIron);
        leg.position.set(Math.cos(a) * 0.24, 0.48, Math.sin(a) * 0.24);
        leg.rotation.z = Math.cos(a) * 0.18;
        leg.rotation.x = -Math.sin(a) * 0.18;
        leg.castShadow = true;
        brazierGroup.add(leg);
      }

      const bowl = new THREE.Mesh(brazierBowlGeo, rigMats.blackenedSteel);
      bowl.position.y = 1.02;
      bowl.castShadow = true;
      const rim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.46, 0.042, 6, 12)),
        rigMats.antiqueGold,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.18;
      brazierGroup.add(bowl, rim);

      const isBoss = room.type === 'Boss';
      const fireGroup = createOrganicFireCluster(rigMats, isBoss, 1.05);
      fireGroup.position.y = 1.16;
      brazierGroup.add(fireGroup);
      group.add(brazierGroup);

      braziers.push({
        x: bx,
        y: 1.95,
        z: bz,
        isBoss,
        fireGroup,
        phase: room.id * 1.7 + idx * 2.1,
      });

      // Scattered weathered basalt rubble rocks beside columns for organic AAA dungeon detail
      if ((room.id + idx) % 2 === 0) {
        const rock = new THREE.Mesh(rubbleGeo, darkCarvedTrimMat);
        rock.position.set(
          px + (px < cx ? 0.65 : -0.65),
          0.12,
          pz + (pz < cz ? 0.55 : -0.55),
        );
        rock.scale.set(1.2, 0.58, 0.9);
        rock.rotation.set(0.3, idx * 1.3, 0.2);
        rock.receiveShadow = true;
        group.add(rock);
      }
    });

    // 5. Grand Cathedral Interior Stone Pillars in wide/grand 16m+ Combat & Boss halls
    if (rw >= 15.5 && rd >= 15.5) {
      const innerSpan = room.type === 'Boss' ? 5.2 : 4.2;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const ix = cx + sx * innerSpan;
          const iz = cz + sz * innerSpan;
          const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 0.4, 1.15)), darkCarvedTrimMat);
          base.position.set(ix, 0.2, iz);
          base.receiveShadow = true;
          const col = new THREE.Mesh(pillarShaftGeo, wallBaseMat);
          col.position.set(ix, WALL_HEIGHT_M / 2, iz);
          col.castShadow = true;
          col.receiveShadow = true;
          const ring = new THREE.Mesh(
            trackGeo(new THREE.TorusGeometry(0.42, 0.045, 6, 12)),
            rigMats.antiqueGold,
          );
          ring.rotation.x = Math.PI / 2;
          ring.position.set(ix, 1.85, iz);
          group.add(base, col, ring);
        }
      }
    }
  }

  return {
    group,
    braziers,
    runicGates,
    wallGroups,
    dispose: () => {
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
    },
  };
}

function buildSegmentedWallsForRoom(
  room: GeneratedRoom,
  parentGroup: THREE.Group,
  wallMat: THREE.Material,
  trimMat: THREE.Material,
  goldMat: THREE.Material,
  gateMat: THREE.Material,
  archJambGeo: THREE.BufferGeometry,
  doorSpanM: number,
  runicGates: RunicGateEntry[],
  wallGroups: CutawayWallGroup[],
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): void {
  const rx = room.x * CM_TO_M;
  const rz = room.y * CM_TO_M;
  const rw = room.width * CM_TO_M;
  const rd = room.height * CM_TO_M;
  const halfDoor = doorSpanM / 2;

  const sides: Array<{
    dir: CardinalDir;
    horizontal: boolean;
    fixedCoord: number;
    minSpan: number;
    maxSpan: number;
  }> = [
    { dir: 3, horizontal: true, fixedCoord: rz + WALL_THICK_M / 2, minSpan: rx, maxSpan: rx + rw },
    { dir: 1, horizontal: true, fixedCoord: rz + rd - WALL_THICK_M / 2, minSpan: rx, maxSpan: rx + rw },
    { dir: 2, horizontal: false, fixedCoord: rx + WALL_THICK_M / 2, minSpan: rz, maxSpan: rz + rd },
    { dir: 0, horizontal: false, fixedCoord: rx + rw - WALL_THICK_M / 2, minSpan: rz, maxSpan: rz + rd },
  ];

  for (const side of sides) {
    // Dedicated side container anchored at y = 0 so Smart Wall Cutaway smoothly scales height down cleanly!
    const sideGroup = new THREE.Group();
    parentGroup.add(sideGroup);
    wallGroups.push({
      roomId: room.id,
      dir: side.dir,
      group: sideGroup,
      currentScaleY: 1.0,
    });

    const addWallSegment = (
      cx: number,
      cz: number,
      lenX: number,
      lenZ: number,
      height = WALL_HEIGHT_M,
      baseY = 0,
    ) => {
      if (lenX < 0.1 || lenZ < 0.1) return;
      const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(lenX, height, lenZ)), wallMat);
      mesh.position.set(cx, baseY + height / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      sideGroup.add(mesh);

      if (baseY === 0) {
        // Textured dark weathered stone coping cornice + antique bronze trim molding
        const cornice = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(lenX + 0.08, 0.24, lenZ + 0.08)),
          trimMat,
        );
        cornice.position.set(cx, height + 0.08, cz);
        sideGroup.add(cornice);

        const basePlinth = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(lenX + 0.06, 0.34, lenZ + 0.14)),
          trimMat,
        );
        basePlinth.position.set(cx, 0.17, cz);
        basePlinth.receiveShadow = true;
        sideGroup.add(basePlinth);
      }
    };

    const connected = room.doorways
      .filter((d) => d.dir === side.dir && d.connectedToRoomId !== null)
      .map((d) => (side.horizontal ? d.x * CM_TO_M : d.y * CM_TO_M))
      .sort((a, b) => a - b);

    let cursor = side.minSpan;
    for (const doorCenter of connected) {
      const gapStart = Math.max(side.minSpan, doorCenter - halfDoor);
      const gapEnd = Math.min(side.maxSpan, doorCenter + halfDoor);

      if (gapStart > cursor + 0.05) {
        const segLen = gapStart - cursor;
        const segMid = cursor + segLen / 2;
        if (side.horizontal) {
          addWallSegment(segMid, side.fixedCoord, segLen, WALL_THICK_M);
        } else {
          addWallSegment(side.fixedCoord, segMid, WALL_THICK_M, segLen);
        }
      }

      // Sculpted Gothic Stone Archway overhead lintel + keystone + flanking jambs
      const lintelH = 1.0;
      const archClearH = WALL_HEIGHT_M - lintelH;
      if (side.horizontal) {
        addWallSegment(doorCenter, side.fixedCoord, doorSpanM + 0.3, WALL_THICK_M + 0.16, lintelH, archClearH);
        const keystone = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.56, 1.05)), goldMat);
        keystone.position.set(doorCenter, archClearH + 0.25, side.fixedCoord);
        sideGroup.add(keystone);

        for (const s of [-1, 1]) {
          const jamb = new THREE.Mesh(archJambGeo, trimMat);
          jamb.position.set(doorCenter + s * (halfDoor + 0.14), WALL_HEIGHT_M / 2, side.fixedCoord);
          jamb.castShadow = true;
          jamb.receiveShadow = true;
          const accent = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.62, 1.02)), goldMat);
          accent.position.set(doorCenter + s * (halfDoor + 0.14), 2.35, side.fixedCoord);
          sideGroup.add(jamb, accent);
        }

        const gate = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(doorSpanM, archClearH)), gateMat);
        gate.position.set(doorCenter, archClearH / 2, side.fixedCoord);
        gate.visible = false;
        parentGroup.add(gate);
        runicGates.push({ roomId: room.id, mesh: gate });
      } else {
        addWallSegment(side.fixedCoord, doorCenter, WALL_THICK_M + 0.16, doorSpanM + 0.3, lintelH, archClearH);
        const keystone = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.05, 0.56, 0.45)), goldMat);
        keystone.position.set(side.fixedCoord, archClearH + 0.25, doorCenter);
        sideGroup.add(keystone);

        for (const s of [-1, 1]) {
          const jamb = new THREE.Mesh(archJambGeo, trimMat);
          jamb.rotation.y = Math.PI / 2;
          jamb.position.set(side.fixedCoord, WALL_HEIGHT_M / 2, doorCenter + s * (halfDoor + 0.14));
          jamb.castShadow = true;
          jamb.receiveShadow = true;
          const accent = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.02, 0.62, 0.16)), goldMat);
          accent.position.set(side.fixedCoord, 2.35, doorCenter + s * (halfDoor + 0.14));
          sideGroup.add(jamb, accent);
        }

        const gate = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(doorSpanM, archClearH)), gateMat);
        gate.rotation.y = Math.PI / 2;
        gate.position.set(side.fixedCoord, archClearH / 2, doorCenter);
        gate.visible = false;
        parentGroup.add(gate);
        runicGates.push({ roomId: room.id, mesh: gate });
      }

      cursor = gapEnd;
    }

    if (side.maxSpan > cursor + 0.05) {
      const segLen = side.maxSpan - cursor;
      const segMid = cursor + segLen / 2;
      if (side.horizontal) {
        addWallSegment(segMid, side.fixedCoord, segLen, WALL_THICK_M);
      } else {
        addWallSegment(side.fixedCoord, segMid, WALL_THICK_M, segLen);
      }
    }

    // Textured carved arched stone shrine alcove at sealed Wall Cap sockets
    const sealed = room.doorways.filter((d) => d.dir === side.dir && d.sealedWithWallCap);
    for (const d of sealed) {
      const insetShift = side.dir === 3 ? 0.34 : side.dir === 1 ? -0.34 : side.dir === 2 ? 0.34 : -0.34;
      const rxPos = side.horizontal ? d.x * CM_TO_M : side.fixedCoord + insetShift;
      const rzPos = side.horizontal ? side.fixedCoord + insetShift : d.y * CM_TO_M;

      const relief = new THREE.Mesh(
        trackGeo(
          side.horizontal
            ? new THREE.BoxGeometry(doorSpanM * 0.68, 2.85, 0.22)
            : new THREE.BoxGeometry(0.22, 2.85, doorSpanM * 0.68),
        ),
        trimMat,
      );
      relief.position.set(rxPos, 1.5, rzPos);
      relief.receiveShadow = true;

      const bronzeSeal = new THREE.Mesh(
        trackGeo(
          side.horizontal
            ? new THREE.BoxGeometry(doorSpanM * 0.44, 0.14, 0.28)
            : new THREE.BoxGeometry(0.28, 0.14, doorSpanM * 0.44),
        ),
        goldMat,
      );
      bronzeSeal.position.set(rxPos, 2.88, rzPos);
      sideGroup.add(relief, bronzeSeal);
    }
  }
}
