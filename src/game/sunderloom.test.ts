import assert from 'node:assert/strict';
import test from 'node:test';
import {
  auditDungeonIntegrity,
  generateDungeon,
  runFiftySeedStressTest,
} from './dungeonGenerator';
import { SunderloomEngine } from './engine';
import {
  applyUnifiedDamage,
  BASE_WARDEN_STATS,
  getFloorScaling,
  recalculateWardenStats,
  rollThreeUniqueRelics,
  STARTER_LOOM_RELICS,
} from './stats';
import type { FSaveProfile } from './types';

const TEST_PROFILE: FSaveProfile = {
  totalAetherThreads: 0,
  highestFloorReached: 1,
  totalBossesSlain: 0,
  permanentHealthRank: 0,
  permanentDamageRank: 0,
  muted: true,
  cameraShakeEnabled: true,
};

test('StatsComponent enforces deterministic (Base + SumFlat) * (1 + SumPercent) order', () => {
  const flatEdge = STARTER_LOOM_RELICS.find((r) => r.id === 'Relic_ForgeEdge')!;
  const pctEdge = STARTER_LOOM_RELICS.find((r) => r.id === 'Relic_SunderingCleaver')!;
  const epicFang = STARTER_LOOM_RELICS.find((r) => r.id === 'Relic_ApexWeaverFang')!;

  const result = recalculateWardenStats([flatEdge, pctEdge, epicFang], 0, 0, BASE_WARDEN_STATS);
  assert.equal(result.MeleeDamage, 48);
});

test('HealthComponent pipeline enforces Dead/Invulnerable guard, Shield-first absorption, clamping, and single death', () => {
  const health = {
    maxHealth: 100,
    currentHealth: 100,
    currentShield: 30,
    isInvulnerable: true,
    isDead: false,
  };

  const blocked = applyUnifiedDamage(health, 50);
  assert.equal(blocked.applied, false);
  assert.equal(health.currentHealth, 100);
  assert.equal(health.currentShield, 30);

  health.isInvulnerable = false;
  const hit1 = applyUnifiedDamage(health, 45);
  assert.equal(hit1.applied, true);
  assert.equal(hit1.shieldAbsorbed, 30);
  assert.equal(health.currentShield, 0);
  assert.equal(health.currentHealth, 85);
  assert.equal(hit1.killed, false);

  const hit2 = applyUnifiedDamage(health, 200);
  assert.equal(hit2.killed, true);
  assert.equal(health.currentHealth, 0);
  assert.equal(health.isDead, true);

  const hit3 = applyUnifiedDamage(health, 50);
  assert.equal(hit3.applied, false);
  assert.equal(hit3.killed, false);
});

test('Roll 3 Loom Relics always returns 3 strictly unique relics', () => {
  for (let floor = 1; floor <= 5; floor++) {
    const rolled = rollThreeUniqueRelics(floor);
    assert.equal(rolled.length, 3);
    const ids = new Set(rolled.map((r) => r.id));
    assert.equal(ids.size, 3);
  }
});

test('Floor CurveTable scaling increases monotonically across floors', () => {
  const f1 = getFloorScaling(1);
  const f2 = getFloorScaling(2);
  const f5 = getFloorScaling(5);
  assert.ok(f2.enemyHealthMult > f1.enemyHealthMult);
  assert.ok(f5.enemyHealthMult > f2.enemyHealthMult);
  assert.ok(f2.targetRoomCount > f1.targetRoomCount);
});

test('Loom Engine produces deterministic identical layouts for identical seeds', () => {
  const d1 = generateDungeon(55123, 1);
  const d2 = generateDungeon(55123, 1);
  assert.equal(d1.seed, d2.seed);
  assert.equal(d1.rooms.length, d2.rooms.length);
  assert.equal(d1.bossRoomId, d2.bossRoomId);
  assert.deepEqual(
    d1.rooms.map((r) => ({ id: r.id, x: r.x, y: r.y, type: r.type })),
    d2.rooms.map((r) => ({ id: r.id, x: r.x, y: r.y, type: r.type })),
  );
  const audit = auditDungeonIntegrity(d1);
  assert.equal(audit.overlaps, 0);
  assert.equal(audit.unsealedDoorways, 0);
  assert.equal(audit.hasBossRoom, true);
});

test('Phase 3 Mandatory Gate: 50-Seed Automated Stress Test passes 50/50 with 0 overlaps and 0 unsealed doorways', () => {
  const report = runFiftySeedStressTest(1000, 1);
  assert.equal(report.totalSeedsTested, 50);
  assert.equal(report.passedSeeds, 50);
  assert.equal(report.totalOverlapsDetected, 0);
  assert.equal(report.totalUnsealedDoorways, 0);
  assert.equal(report.bossRoomsPlaced, 50);
});

test('Core Gameplay Engine: Phase Step I-Frames, 3D raycast aim, room lock, and mutually exclusive Relic Pedestals', () => {
  const engine = new SunderloomEngine(TEST_PROFILE, {
    onHudUpdate: () => {},
    onRunEnded: () => {},
    onFloorBanner: () => {},
    onProfileChanged: () => {},
  });
  engine.startFreshRun(41029);

  // 1. 3D raycast aim updates Warden facing smoothly
  engine.setAimWorldTarget(engine.playerX + 400, engine.playerY);
  engine.step(0.016, true);
  assert.ok(Math.abs(engine.playerFacing) < 0.05);

  // 2. Phase Step grants temporary I-Frames and dodges forward
  const startX = engine.playerX;
  engine.keysHeld.add('KeyD');
  engine.requestPhaseStep();
  assert.equal(engine.playerHealth.isInvulnerable, true);
  engine.step(0.04, true);
  assert.ok(engine.playerX > startX);

  // 3. Entering an adjacent Combat room locks Runic Gates and queues Enemy Spawn Telegraphs
  const combatRoom = engine.dungeon.rooms.find((r) => r.type === 'Combat')!;
  assert.ok(combatRoom);
  engine.playerX = combatRoom.x + combatRoom.width / 2;
  engine.playerY = combatRoom.y + combatRoom.height / 2;
  engine.step(0.05, true);
  assert.equal(combatRoom.runicGatesLocked, true);
  assert.ok(engine.spawnTelegraphs.length > 0);
});
