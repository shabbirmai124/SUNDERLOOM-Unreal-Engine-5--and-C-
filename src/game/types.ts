export type EFactionID = 'Player' | 'Loomborn' | 'NeutralProp';

export type ECombatState =
  | 'Idle'
  | 'Windup'
  | 'Active'
  | 'Recovery'
  | 'Dodging'
  | 'Staggered'
  | 'Dead';

export type ERoomType = 'Start' | 'Hallway' | 'Combat' | 'Treasure' | 'Boss';
export type ERoomState = 'Dormant' | 'LockedCombat' | 'Cleared';

export type EEnemyArchetype =
  | 'ThreadlingRusher'
  | 'SpireArcanist'
  | 'IroncladLoomguard'
  | 'WeaverWardenBoss';

export type EStatType =
  | 'MaxHealth'
  | 'MoveSpeed'
  | 'MeleeDamage'
  | 'RangedDamage'
  | 'AttackSpeed'
  | 'CritChance'
  | 'DodgeCooldown';

export type EModifierType = 'FlatAdd' | 'PercentMult';
export type ERelicRarity = 'Common' | 'Rare' | 'Epic';

export interface FLoomRelicData {
  id: string;
  displayName: string;
  description: string;
  rarity: ERelicRarity;
  targetStat: EStatType;
  modifierType: EModifierType;
  modifierValue: number;
}

export interface FStatBlock {
  MaxHealth: number;
  MoveSpeed: number;
  MeleeDamage: number;
  RangedDamage: number;
  AttackSpeed: number;
  CritChance: number;
  DodgeCooldown: number;
}

export interface FHealthState {
  maxHealth: number;
  currentHealth: number;
  currentShield: number;
  isInvulnerable: boolean;
  isDead: boolean;
}

export interface FDamageResult {
  applied: boolean;
  damageDealt: number;
  shieldAbsorbed: number;
  killed: boolean;
}

export interface FSaveProfile {
  saveVersion: number;
  totalAetherThreads: number;
  unlockedWeapons: string[];
  permanentHealthRank: number;
  permanentDamageRank: number;
  highestFloorReached: number;
  totalBossesSlain: number;
  cameraShakeEnabled: boolean;
  muted: boolean;
}

export interface FRunSummarySnapshot {
  victory: boolean;
  floorReached: number;
  enemiesSlain: number;
  aetherEarned: number;
  relicsCollected: number;
  seed: number;
}

export type CardinalDir = 0 | 1 | 2 | 3; // 0: East (+X), 1: South (+Y), 2: West (-X), 3: North (-Y)

export interface DoorwaySocket {
  id: string;
  roomId: number;
  /** World center position in cm (400cm grid units) */
  x: number;
  y: number;
  /** Outward-facing cardinal direction */
  dir: CardinalDir;
  connectedToRoomId: number | null;
  sealedWithWallCap: boolean;
  hasRunicGate: boolean;
}

export interface GeneratedRoom {
  id: number;
  type: ERoomType;
  state: ERoomState;
  graphDepth: number;
  /** World AABB in cm */
  x: number;
  y: number;
  width: number;
  height: number;
  doorways: DoorwaySocket[];
  runicGatesLocked: boolean;
  waveSpawned: boolean;
  telegraphTimer: number;
}

export interface GeneratedDungeon {
  seed: number;
  baseSeed: number;
  healAttempts: number;
  floorNumber: number;
  rooms: GeneratedRoom[];
  wallCapsCount: number;
  runicGatesCount: number;
  bossRoomId: number;
  treasureRoomId: number | null;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface StressTestReport {
  totalSeedsTested: number;
  passedSeeds: number;
  totalOverlapsDetected: number;
  totalUnsealedDoorways: number;
  bossRoomsPlaced: number;
  averageRoomCount: number;
  durationMs: number;
  sampleSeeds: Array<{
    seed: number;
    resolvedSeed: number;
    rooms: number;
    maxDepth: number;
    bossPlaced: boolean;
    wallCaps: number;
  }>;
}
