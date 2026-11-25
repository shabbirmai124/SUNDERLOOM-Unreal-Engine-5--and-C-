import { getFloorScaling } from './stats';
import type {
  CardinalDir,
  DoorwaySocket,
  ERoomType,
  GeneratedDungeon,
  GeneratedRoom,
  StressTestReport,
} from './types';

// Locked SUNDERLOOM modular grid metrics (centimeters)
export const GRID_UNIT_CM = 400;
export const DOORWAY_WIDTH_CM = 300;
export const OVERLAP_SHRINK_MARGIN_CM = 15;
export const NAVMESH_BUFFER_CM = 500;

interface RoomTemplate {
  name: string;
  type: ERoomType;
  width: number;  // Multiple of 400cm
  height: number; // Multiple of 400cm
  weight: number;
  /** Doorways defined in local coordinates relative to room top-left (0,0) */
  doors: Array<{ localX: number; localY: number; dir: CardinalDir }>;
}

// Deterministic Mulberry32 PRNG mirroring UE5 FRandomStream
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const START_TEMPLATE: RoomTemplate = {
  name: 'Obsidian Atrium',
  type: 'Start',
  width: 1200,
  height: 1200,
  weight: 1,
  doors: [
    { localX: 1200, localY: 600, dir: 0 }, // East
    { localX: 600, localY: 1200, dir: 1 }, // South
    { localX: 0, localY: 600, dir: 2 },    // West
    { localX: 600, localY: 0, dir: 3 },    // North
  ],
};

const HALLWAY_TEMPLATES: RoomTemplate[] = [
  {
    name: 'Straight Corridor H',
    type: 'Hallway',
    width: 800,
    height: 400,
    weight: 2.0,
    doors: [
      { localX: 800, localY: 200, dir: 0 },
      { localX: 0, localY: 200, dir: 2 },
    ],
  },
  {
    name: 'Straight Corridor V',
    type: 'Hallway',
    width: 400,
    height: 800,
    weight: 2.0,
    doors: [
      { localX: 200, localY: 800, dir: 1 },
      { localX: 200, localY: 0, dir: 3 },
    ],
  },
  {
    name: 'Loom Junction Cross',
    type: 'Hallway',
    width: 800,
    height: 800,
    weight: 1.5,
    doors: [
      { localX: 800, localY: 400, dir: 0 },
      { localX: 400, localY: 800, dir: 1 },
      { localX: 0, localY: 400, dir: 2 },
      { localX: 400, localY: 0, dir: 3 },
    ],
  },
];

const COMBAT_TEMPLATES: RoomTemplate[] = [
  {
    name: 'Forge Crucible',
    type: 'Combat',
    width: 1200,
    height: 1200,
    weight: 2.2,
    doors: [
      { localX: 1200, localY: 600, dir: 0 },
      { localX: 600, localY: 1200, dir: 1 },
      { localX: 0, localY: 600, dir: 2 },
      { localX: 600, localY: 0, dir: 3 },
    ],
  },
  {
    name: 'Grand Cathedral Nave',
    type: 'Combat',
    width: 1600,
    height: 1600,
    weight: 1.8,
    doors: [
      { localX: 1600, localY: 800, dir: 0 },
      { localX: 800, localY: 1600, dir: 1 },
      { localX: 0, localY: 800, dir: 2 },
      { localX: 800, localY: 0, dir: 3 },
    ],
  },
  {
    name: 'Runic Gallery Wide',
    type: 'Combat',
    width: 1600,
    height: 1200,
    weight: 1.6,
    doors: [
      { localX: 1600, localY: 600, dir: 0 },
      { localX: 800, localY: 1200, dir: 1 },
      { localX: 0, localY: 600, dir: 2 },
      { localX: 800, localY: 0, dir: 3 },
    ],
  },
  {
    name: 'Obsidian Cistern Tall',
    type: 'Combat',
    width: 1200,
    height: 1600,
    weight: 1.6,
    doors: [
      { localX: 1200, localY: 800, dir: 0 },
      { localX: 600, localY: 1600, dir: 1 },
      { localX: 0, localY: 800, dir: 2 },
      { localX: 600, localY: 0, dir: 3 },
    ],
  },
];

const TREASURE_TEMPLATE: RoomTemplate = {
  name: 'Relic Vault',
  type: 'Treasure',
  width: 800,
  height: 800,
  weight: 1,
  doors: [
    { localX: 800, localY: 400, dir: 0 },
    { localX: 400, localY: 800, dir: 1 },
    { localX: 0, localY: 400, dir: 2 },
    { localX: 400, localY: 0, dir: 3 },
  ],
};

const BOSS_TEMPLATE: RoomTemplate = {
  name: 'Weaver-Warden Sanctum',
  type: 'Boss',
  width: 2000,
  height: 2000,
  weight: 1,
  doors: [
    { localX: 2000, localY: 1000, dir: 0 },
    { localX: 1000, localY: 2000, dir: 1 },
    { localX: 0, localY: 1000, dir: 2 },
    { localX: 1000, localY: 0, dir: 3 },
  ],
};

function oppositeDir(dir: CardinalDir): CardinalDir {
  return ((dir + 2) % 4) as CardinalDir;
}

export function boxesOverlapWithMargin(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  shrinkMargin = OVERLAP_SHRINK_MARGIN_CM,
): boolean {
  const aMinX = a.x + shrinkMargin;
  const aMaxX = a.x + a.width - shrinkMargin;
  const aMinY = a.y + shrinkMargin;
  const aMaxY = a.y + a.height - shrinkMargin;

  const bMinX = b.x + shrinkMargin;
  const bMaxX = b.x + b.width - shrinkMargin;
  const bMinY = b.y + shrinkMargin;
  const bMaxY = b.y + b.height - shrinkMargin;

  return aMinX < bMaxX && aMaxX > bMinX && aMinY < bMaxY && aMaxY > bMinY;
}

function pickWeightedTemplate(pool: RoomTemplate[], rng: () => number): RoomTemplate {
  let total = 0;
  for (const t of pool) total += t.weight;
  let roll = rng() * total;
  for (const t of pool) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return pool[0];
}

function trySingleDungeonAttempt(
  seed: number,
  floorNumber: number,
  targetRoomCount: number,
  minRoomCount: number,
): GeneratedDungeon | null {
  const rng = createSeededRng(seed);
  const rooms: GeneratedRoom[] = [];
  const openQueue: DoorwaySocket[] = [];
  let nextRoomId = 0;
  let runicGatesCount = 0;

  const instantiateRoom = (
    template: RoomTemplate,
    worldX: number,
    worldY: number,
    depth: number,
    connectedDoorLocalIdx: number | null,
    parentRoomId: number | null,
  ): GeneratedRoom => {
    const id = nextRoomId++;
    const doorways: DoorwaySocket[] = template.doors.map((d, idx) => ({
      id: `R${id}_D${idx}`,
      roomId: id,
      x: worldX + d.localX,
      y: worldY + d.localY,
      dir: d.dir,
      connectedToRoomId: idx === connectedDoorLocalIdx ? parentRoomId : null,
      sealedWithWallCap: false,
      hasRunicGate: idx === connectedDoorLocalIdx && (template.type === 'Combat' || template.type === 'Boss'),
    }));

    return {
      id,
      type: template.type,
      state: template.type === 'Start' || template.type === 'Hallway' ? 'Cleared' : 'Dormant',
      graphDepth: depth,
      x: worldX,
      y: worldY,
      width: template.width,
      height: template.height,
      doorways,
      runicGatesLocked: false,
      waveSpawned: false,
      telegraphTimer: 0,
    };
  };

  // 1. Anchor Spawn: Start Room centered around world origin (0,0)
  const startRoom = instantiateRoom(
    START_TEMPLATE,
    -START_TEMPLATE.width / 2,
    -START_TEMPLATE.height / 2,
    0,
    null,
    null,
  );
  rooms.push(startRoom);
  for (const d of startRoom.doorways) {
    openQueue.push(d);
  }

  const tryAttach = (
    targetDoor: DoorwaySocket,
    template: RoomTemplate,
    parentDepth: number,
  ): GeneratedRoom | null => {
    // 180-degree opposite doorway alignment
    const requiredDir = oppositeDir(targetDoor.dir);
    const matchingIdx = template.doors.findIndex((d) => d.dir === requiredDir);
    if (matchingIdx === -1) return null;

    const matchDoor = template.doors[matchingIdx];
    const proposedX = targetDoor.x - matchDoor.localX;
    const proposedY = targetDoor.y - matchDoor.localY;

    const candidateBox = {
      x: proposedX,
      y: proposedY,
      width: template.width,
      height: template.height,
    };

    // 15cm shrink-margin overlap verification against every placed room
    for (const placed of rooms) {
      if (boxesOverlapWithMargin(candidateBox, placed, OVERLAP_SHRINK_MARGIN_CM)) {
        return null;
      }
    }

    const created = instantiateRoom(
      template,
      proposedX,
      proposedY,
      parentDepth + 1,
      matchingIdx,
      targetDoor.roomId,
    );

    targetDoor.connectedToRoomId = created.id;
    const parentRoom = rooms.find((r) => r.id === targetDoor.roomId);
    if (
      created.type === 'Combat' ||
      created.type === 'Boss' ||
      parentRoom?.type === 'Combat' ||
      parentRoom?.type === 'Boss'
    ) {
      targetDoor.hasRunicGate = true;
      created.doorways[matchingIdx].hasRunicGate = true;
      runicGatesCount += 1;
    }

    rooms.push(created);

    // Push remaining unconnected doorways (except Boss/Treasure dead-ends which seal cleanly)
    if (template.type !== 'Boss' && template.type !== 'Treasure') {
      for (let i = 0; i < created.doorways.length; i++) {
        if (i !== matchingIdx) {
          openQueue.push(created.doorways[i]);
        }
      }
    }

    return created;
  };

  // 2. Controlled Expansion Loop (blended front/back selection)
  const failedSockets: DoorwaySocket[] = [];
  let iterations = 0;
  while (rooms.length < targetRoomCount - 2 && openQueue.length > 0 && iterations < 180) {
    iterations++;
    const pickFront = rng() < 0.6;
    const idx = pickFront ? 0 : openQueue.length - 1;
    const targetDoor = openQueue.splice(idx, 1)[0];
    const parentRoom = rooms.find((r) => r.id === targetDoor.roomId);
    const parentDepth = parentRoom ? parentRoom.graphDepth : 0;

    const preferHallway = parentRoom?.type === 'Combat' || rooms.length % 2 === 1;
    let attached = false;

    for (let retry = 0; retry < 10 && !attached; retry++) {
      const useHall = retry < 5 ? preferHallway : !preferHallway;
      const template = pickWeightedTemplate(useHall ? HALLWAY_TEMPLATES : COMBAT_TEMPLATES, rng);
      if (tryAttach(targetDoor, template, parentDepth)) {
        attached = true;
      }
    }

    if (!attached) {
      failedSockets.push(targetDoor);
    }
  }

  // Merge remaining open sockets for Boss/Treasure selection
  const candidateEndSockets = [...openQueue, ...failedSockets].filter(
    (d) => d.connectedToRoomId === null,
  );

  if (rooms.length < minRoomCount - 1) {
    return null;
  }

  // 3. Guaranteed Boss Room at deepest Graph Depth open doorway
  candidateEndSockets.sort((a, b) => {
    const depthA = rooms.find((r) => r.id === a.roomId)?.graphDepth ?? 0;
    const depthB = rooms.find((r) => r.id === b.roomId)?.graphDepth ?? 0;
    return depthB - depthA;
  });

  let bossRoom: GeneratedRoom | null = null;
  for (let i = 0; i < candidateEndSockets.length; i++) {
    const sock = candidateEndSockets[i];
    const parentDepth = rooms.find((r) => r.id === sock.roomId)?.graphDepth ?? 0;
    const created = tryAttach(sock, BOSS_TEMPLATE, parentDepth);
    if (created) {
      bossRoom = created;
      candidateEndSockets.splice(i, 1);
      break;
    }
  }

  if (!bossRoom) {
    return null;
  }

  // 4. Mid-Depth Treasure Room Placement
  let treasureRoomId: number | null = null;
  if (candidateEndSockets.length > 0) {
    const midIdx = Math.floor(candidateEndSockets.length / 2);
    for (let offset = 0; offset < candidateEndSockets.length; offset++) {
      const idx = (midIdx + offset) % candidateEndSockets.length;
      const sock = candidateEndSockets[idx];
      const parentDepth = rooms.find((r) => r.id === sock.roomId)?.graphDepth ?? 0;
      const created = tryAttach(sock, TREASURE_TEMPLATE, parentDepth);
      if (created) {
        treasureRoomId = created.id;
        candidateEndSockets.splice(idx, 1);
        break;
      }
    }
  }

  // 5. Watertight Sealing: cap every remaining unconnected doorway across all rooms
  let wallCapsCount = 0;
  for (const room of rooms) {
    for (const door of room.doorways) {
      if (door.connectedToRoomId === null) {
        door.sealedWithWallCap = true;
        wallCapsCount++;
      }
    }
  }

  // 6. Compute unified dungeon bounding box (for Dynamic NavMesh volume)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rooms) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.width > maxX) maxX = r.x + r.width;
    if (r.y + r.height > maxY) maxY = r.y + r.height;
  }

  return {
    seed,
    baseSeed: seed,
    healAttempts: 0,
    floorNumber,
    rooms,
    wallCapsCount,
    runicGatesCount,
    bossRoomId: bossRoom.id,
    treasureRoomId,
    bounds: { minX, minY, maxX, maxY },
  };
}

/**
 * Loom Engine entry point with Automatic Self-Healing (up to 25 seed increments).
 */
export function generateDungeon(baseSeed: number, floorNumber = 1): GeneratedDungeon {
  const scaling = getFloorScaling(floorNumber);
  const targetRooms = scaling.targetRoomCount;
  const minRooms = Math.max(5, Math.min(7, targetRooms - 2));

  for (let healAttempt = 0; healAttempt < 25; healAttempt++) {
    const activeSeed = baseSeed + healAttempt;
    const attempt = trySingleDungeonAttempt(activeSeed, floorNumber, targetRooms, minRooms);
    if (attempt) {
      attempt.baseSeed = baseSeed;
      attempt.healAttempts = healAttempt;
      return attempt;
    }
  }

  // Fallback deterministic seed that is guaranteed valid
  const safe = trySingleDungeonAttempt(40421, floorNumber, 8, 5)!;
  safe.baseSeed = baseSeed;
  safe.healAttempts = 25;
  return safe;
}

/**
 * Audit helper verifying zero overlaps and zero unsealed void doorways.
 */
export function auditDungeonIntegrity(dungeon: GeneratedDungeon): {
  overlaps: number;
  unsealedDoorways: number;
  hasBossRoom: boolean;
} {
  let overlaps = 0;
  for (let i = 0; i < dungeon.rooms.length; i++) {
    for (let j = i + 1; j < dungeon.rooms.length; j++) {
      if (boxesOverlapWithMargin(dungeon.rooms[i], dungeon.rooms[j], OVERLAP_SHRINK_MARGIN_CM)) {
        overlaps++;
      }
    }
  }

  let unsealedDoorways = 0;
  for (const room of dungeon.rooms) {
    for (const d of room.doorways) {
      if (d.connectedToRoomId === null && !d.sealedWithWallCap) {
        unsealedDoorways++;
      }
    }
  }

  const hasBossRoom = dungeon.rooms.some((r) => r.type === 'Boss' && r.id === dungeon.bossRoomId);
  return { overlaps, unsealedDoorways, hasBossRoom };
}

/**
 * Phase 3 Mandatory Gate: 50-Seed Automated Stress Test.
 */
export function runFiftySeedStressTest(startingSeed = 1000, floorNumber = 1): StressTestReport {
  const start = performance.now();
  let passedSeeds = 0;
  let totalOverlapsDetected = 0;
  let totalUnsealedDoorways = 0;
  let bossRoomsPlaced = 0;
  let totalRooms = 0;
  const sampleSeeds: StressTestReport['sampleSeeds'] = [];

  for (let i = 0; i < 50; i++) {
    const seed = startingSeed + i * 37;
    const dungeon = generateDungeon(seed, floorNumber);
    const audit = auditDungeonIntegrity(dungeon);
    totalOverlapsDetected += audit.overlaps;
    totalUnsealedDoorways += audit.unsealedDoorways;
    if (audit.hasBossRoom) bossRoomsPlaced++;
    totalRooms += dungeon.rooms.length;

    const valid = audit.overlaps === 0 && audit.unsealedDoorways === 0 && audit.hasBossRoom;
    if (valid) passedSeeds++;

    if (i < 12) {
      const maxDepth = dungeon.rooms.reduce((m, r) => Math.max(m, r.graphDepth), 0);
      sampleSeeds.push({
        seed,
        resolvedSeed: dungeon.seed,
        rooms: dungeon.rooms.length,
        maxDepth,
        bossPlaced: audit.hasBossRoom,
        wallCaps: dungeon.wallCapsCount,
      });
    }
  }

  return {
    totalSeedsTested: 50,
    passedSeeds,
    totalOverlapsDetected,
    totalUnsealedDoorways,
    bossRoomsPlaced,
    averageRoomCount: Number((totalRooms / 50).toFixed(1)),
    durationMs: Number((performance.now() - start).toFixed(1)),
    sampleSeeds,
  };
}
