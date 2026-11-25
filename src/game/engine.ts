import { gameAudio } from './audio';
import { DOORWAY_WIDTH_CM, generateDungeon } from './dungeonGenerator';
import {
  applyUnifiedDamage,
  getFloorScaling,
  recalculateWardenStats,
  rollThreeUniqueRelics,
} from './stats';
import type {
  ECombatState,
  EEnemyArchetype,
  EFactionID,
  FHealthState,
  FLoomRelicData,
  FRunSummarySnapshot,
  FSaveProfile,
  FStatBlock,
  GeneratedDungeon,
  GeneratedRoom,
} from './types';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface FloatingDamage {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  value: number;
  crit: boolean;
  life: number;
  maxLife: number;
  color: string;
}

export interface ProjectileEntity {
  id: number;
  faction: EFactionID;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  color: string;
}

export interface HazardZone {
  x: number;
  y: number;
  radius: number;
  telegraphTimer: number;
  maxTelegraph: number;
  damage: number;
  detonated: boolean;
  fadeTimer: number;
}

export interface EnemyEntity {
  id: number;
  roomId: number;
  archetype: EEnemyArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facingAngle: number;
  radius: number;
  speed: number;
  preferredRange: number;
  health: FHealthState;
  poise: number;
  maxPoise: number;
  combatState: ECombatState;
  stateTimer: number;
  telegraphDuration: number;
  telegraphTargetX: number;
  telegraphTargetY: number;
  attackCooldown: number;
  hitFlash: number;
  koTimer: number;
  bossPhase: 1 | 2;
  bossRoarTimer: number;
  bossHazardCooldown: number;
  damage: number;
  threadReward: number;
  flankSlotAngle: number;
  alerted: boolean;
}

export interface PedestalEntity {
  id: number;
  roomId: number;
  x: number;
  y: number;
  relic: FLoomRelicData;
  consumed: boolean;
}

export interface PortalEntity {
  x: number;
  y: number;
  active: boolean;
}

export interface SpawnTelegraph {
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  archetype: EEnemyArchetype;
  roomId: number;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  shield: number;
  floor: number;
  seed: number;
  roomsCleared: number;
  totalCombatRooms: number;
  aetherThreads: number;
  kills: number;
  relicCount: number;
  comboStep: number;
  dodgeReadyRatio: number;
  isInvulnerable: boolean;
  superCharge: number; // 0..100
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: number;
  promptText: string | null;
  promptSubtext: string | null;
  promptRarity: string | null;
  activeRoomType: string;
  activeRoomLocked: boolean;
  debugOverlay: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onRunEnded: (summary: FRunSummarySnapshot) => void;
  onFloorBanner: (floor: number, seed: number) => void;
  onProfileChanged: (profile: FSaveProfile) => void;
}

const PARTICLE_POOL_SIZE = 180;
const DAMAGE_POOL_SIZE = 32;
const PLAYER_RADIUS_CM = 42;

export class SunderloomEngine {
  public dungeon: GeneratedDungeon;
  public profile: FSaveProfile;
  public stats: FStatBlock;
  public relics: FLoomRelicData[] = [];

  // Warden state
  public playerX = 0;
  public playerY = 0;
  public playerVx = 0;
  public playerVy = 0;
  public playerFacing = 0;
  public playerHealth: FHealthState = {
    maxHealth: 120,
    currentHealth: 120,
    currentShield: 0,
    isInvulnerable: false,
    isDead: false,
  };
  public combatState: ECombatState = 'Idle';
  public comboStep = 0;
  public comboBuffered = false;
  public currentAttackHeavy = false;
  public attackTimer = 0;
  public attackDuration = 0;
  public activeSweepArc = 0;
  public hitActorsThisSwing = new Set<number>();

  public dodgeTimer = 0;
  public dodgeIFrameTimer = 0;
  public dodgeCooldownTimer = 0;
  public dodgeDirX = 1;
  public dodgeDirY = 0;
  public runeLanceCooldown = 0;
  public superCharge = 35; // Starts partially primed; fills to 100 from hits & kills
  public superNovaTimer = 0;
  public superNovaX = 0;
  public superNovaY = 0;
  public playerHitFlash = 0;
  public walkCycle = 0;

  // Entities
  public enemies: EnemyEntity[] = [];
  public projectiles: ProjectileEntity[] = [];
  public pedestals: PedestalEntity[] = [];
  public hazards: HazardZone[] = [];
  public spawnTelegraphs: SpawnTelegraph[] = [];
  public portal: PortalEntity | null = null;

  // Pooled zero-GC VFX buffers
  public particles: Particle[] = [];
  public floatingDamages: FloatingDamage[] = [];
  private particleCursor = 0;
  private damageCursor = 0;

  // Camera & Juice
  public camX = 0;
  public camY = 0;
  public trauma = 0;
  public hitstopTimer = 0;
  public ambientTime = 0;
  public debugOverlay = false;

  // Run counters
  public currentFloor = 1;
  public pendingAetherThreads = 0;
  public runKills = 0;
  public runEnded = false;
  public deathBeatTimer = 0;

  // Input & 3D Camera Orientation
  public keysHeld = new Set<string>();
  public mouseScreenX = 0;
  public mouseScreenY = 0;
  public aimWorldX: number | null = null;
  public aimWorldY: number | null = null;
  public cameraYaw = 0;
  public canvasWidth = 1280;
  public canvasHeight = 720;

  private nextEntityId = 1;
  private callbacks: EngineCallbacks;
  private lastHudPush = 0;

  constructor(profile: FSaveProfile, callbacks: EngineCallbacks) {
    this.profile = { ...profile };
    this.callbacks = callbacks;
    this.stats = recalculateWardenStats([], this.profile.permanentHealthRank, this.profile.permanentDamageRank);

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 4, color: '#22D3EE' });
    }
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
      this.floatingDamages.push({ active: false, x: 0, y: 0, vy: -80, value: 0, crit: false, life: 0, maxLife: 0.7, color: '#F8FAFC' });
    }

    this.dungeon = generateDungeon(41029, 1);
    this.resetFloorEntities();
  }

  public startFreshRun(optionalSeed?: number): void {
    this.relics = [];
    this.currentFloor = 1;
    this.pendingAetherThreads = 0;
    this.runKills = 0;
    this.runEnded = false;
    this.deathBeatTimer = 0;

    this.stats = recalculateWardenStats(
      this.relics,
      this.profile.permanentHealthRank,
      this.profile.permanentDamageRank,
    );
    this.playerHealth = {
      maxHealth: this.stats.MaxHealth,
      currentHealth: this.stats.MaxHealth,
      currentShield: 0,
      isInvulnerable: false,
      isDead: false,
    };

    const seed = optionalSeed && optionalSeed > 0 ? optionalSeed : Math.floor(10000 + Math.random() * 890000);
    this.dungeon = generateDungeon(seed, this.currentFloor);
    this.resetFloorEntities();
    this.callbacks.onFloorBanner(this.currentFloor, this.dungeon.seed);
    this.pushHudSnapshot(true);
  }

  public advanceToNextFloor(): void {
    this.currentFloor += 1;
    if (this.currentFloor > this.profile.highestFloorReached) {
      this.profile.highestFloorReached = this.currentFloor;
      this.callbacks.onProfileChanged({ ...this.profile });
    }
    // Preserve remaining HP (plus small 20% forge respite heal) and all acquired Loom Relics
    this.playerHealth.currentHealth = Math.min(
      this.playerHealth.maxHealth,
      this.playerHealth.currentHealth + this.playerHealth.maxHealth * 0.2,
    );
    this.dungeon = generateDungeon(this.dungeon.seed + 7919, this.currentFloor);
    this.resetFloorEntities();
    gameAudio.playRoomClear();
    this.callbacks.onFloorBanner(this.currentFloor, this.dungeon.seed);
    this.pushHudSnapshot(true);
  }

  private resetFloorEntities(): void {
    const startRoom = this.dungeon.rooms[0];
    this.playerX = startRoom.x + startRoom.width / 2;
    this.playerY = startRoom.y + startRoom.height / 2;
    this.camX = this.playerX;
    this.camY = this.playerY;
    this.playerVx = 0;
    this.playerVy = 0;
    this.combatState = 'Idle';
    this.comboStep = 0;
    this.comboBuffered = false;
    this.attackTimer = 0;
    this.dodgeTimer = 0;
    this.dodgeIFrameTimer = 0;
    this.dodgeCooldownTimer = 0;
    this.runeLanceCooldown = 0;
    this.playerHealth.isInvulnerable = false;

    this.enemies = [];
    this.projectiles = [];
    this.pedestals = [];
    this.hazards = [];
    this.spawnTelegraphs = [];
    this.portal = null;
    this.hitstopTimer = 0;
    this.trauma = 0;
  }

  public clearInputs(): void {
    this.keysHeld.clear();
  }

  public toggleDebugOverlay(): void {
    this.debugOverlay = !this.debugOverlay;
    this.pushHudSnapshot(true);
  }

  public requestLightAttack(): void {
    if (this.playerHealth.isDead || this.combatState === 'Staggered' || this.combatState === 'Dodging') {
      return;
    }
    if (this.combatState === 'Active' || this.combatState === 'Recovery') {
      this.comboBuffered = true;
      return;
    }
    if (this.combatState === 'Idle') {
      this.comboStep = 0;
      this.beginMeleeSwing(false);
    }
  }

  public requestHeavyAttack(): void {
    if (this.playerHealth.isDead || this.combatState !== 'Idle') return;
    this.comboStep = 2;
    this.beginMeleeSwing(true);
  }

  private beginMeleeSwing(heavy: boolean): void {
    this.comboBuffered = false;
    this.currentAttackHeavy = heavy || this.comboStep >= 2;
    this.hitActorsThisSwing.clear();
    const speed = Math.max(0.5, this.stats.AttackSpeed);
    this.attackDuration = (this.currentAttackHeavy ? 0.42 : 0.28) / speed;
    this.attackTimer = this.attackDuration;
    this.combatState = 'Windup';
    this.activeSweepArc = 0;
    this.updateAimFacing();
    gameAudio.playSwing(this.comboStep);
  }

  public requestAetherSuper(): void {
    if (this.playerHealth.isDead || this.superCharge < 100) return;

    this.superCharge = 0;
    this.superNovaTimer = 0.72;
    this.superNovaX = this.playerX;
    this.superNovaY = this.playerY;
    this.dodgeIFrameTimer = Math.max(this.dodgeIFrameTimer, 0.65);
    this.playerHealth.isInvulnerable = true;
    this.addTrauma(0.75);
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.06);

    // Massive Sunder Nova blast wave damaging all Loomborn enemies within 720cm radius
    const blastRadius = 720;
    const baseNovaDmg = Math.round((this.stats.MeleeDamage + this.stats.RangedDamage) * 2.65);

    for (const enemy of this.enemies) {
      if (enemy.health.isDead) continue;
      const dist = Math.hypot(enemy.x - this.playerX, enemy.y - this.playerY);
      if (dist <= blastRadius + enemy.radius) {
        const res = applyUnifiedDamage(enemy.health, baseNovaDmg);
        if (res.applied) {
          enemy.hitFlash = 1.0;
          enemy.alerted = true;
          const pushAng = Math.atan2(enemy.y - this.playerY, enemy.x - this.playerX);
          enemy.vx += Math.cos(pushAng) * 520;
          enemy.vy += Math.sin(pushAng) * 520;
          this.spawnFloatingDamage(enemy.x, enemy.y - enemy.radius, Math.round(res.damageDealt), true, '#E0B46A');
          this.spawnParticles(enemy.x, enemy.y, 16, '#E0B46A', 340);
          if (res.killed) {
            this.handleEnemyKilled(enemy);
          }
        }
      }
    }

    // Ring of radiant Solar-Gold Aether bolts
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.projectiles.push({
        id: this.nextEntityId++,
        faction: 'Player',
        x: this.playerX + Math.cos(a) * 55,
        y: this.playerY + Math.sin(a) * 55,
        vx: Math.cos(a) * 1450,
        vy: Math.sin(a) * 1450,
        radius: 18,
        damage: Math.round(this.stats.RangedDamage * 1.4),
        life: 1.5,
        color: '#E0B46A',
      });
    }
    this.spawnParticles(this.playerX, this.playerY, 34, '#E0B46A', 420);
    this.spawnParticles(this.playerX, this.playerY, 24, '#D96B27', 320);
    gameAudio.playBossRoar();
    this.pushHudSnapshot(true);
  }

  public requestRuneLance(): void {
    if (this.playerHealth.isDead || this.combatState === 'Staggered' || this.combatState === 'Dodging') return;
    if (this.runeLanceCooldown > 0) return;

    this.updateAimFacing();
    this.runeLanceCooldown = 0.48 / Math.max(0.6, this.stats.AttackSpeed);
    const speed = 1550;
    const vx = Math.cos(this.playerFacing) * speed;
    const vy = Math.sin(this.playerFacing) * speed;

    this.projectiles.push({
      id: this.nextEntityId++,
      faction: 'Player',
      x: this.playerX + Math.cos(this.playerFacing) * 48,
      y: this.playerY + Math.sin(this.playerFacing) * 48,
      vx,
      vy,
      radius: 16,
      damage: this.stats.RangedDamage,
      life: 2.2,
      color: '#22D3EE',
    });

    this.spawnParticles(this.playerX + Math.cos(this.playerFacing) * 46, this.playerY + Math.sin(this.playerFacing) * 46, 6, '#22D3EE', 180);
    gameAudio.playRuneLance();
  }

  public requestPhaseStep(): void {
    if (this.playerHealth.isDead || this.combatState === 'Staggered' || this.combatState === 'Dodging') return;
    if (this.dodgeCooldownTimer > 0) return;
    // Dodge-canceling permitted out of Idle or Recovery
    if (this.combatState !== 'Idle' && this.combatState !== 'Recovery') return;

    const move = this.getMoveInputVector();
    if (Math.hypot(move.x, move.y) > 0.1) {
      this.dodgeDirX = move.x;
      this.dodgeDirY = move.y;
      this.playerFacing = Math.atan2(move.y, move.x);
    } else {
      this.dodgeDirX = Math.cos(this.playerFacing);
      this.dodgeDirY = Math.sin(this.playerFacing);
    }

    this.combatState = 'Dodging';
    this.comboBuffered = false;
    this.comboStep = 0;
    this.dodgeTimer = 0.28;
    this.dodgeIFrameTimer = 0.22;
    this.dodgeCooldownTimer = this.stats.DodgeCooldown;
    this.playerHealth.isInvulnerable = true;

    this.spawnParticles(this.playerX, this.playerY, 10, '#38BDF8', 240);
    gameAudio.playPhaseStep();
  }

  public requestInteract(): void {
    if (this.playerHealth.isDead) return;

    // 1. Check Descent Portal first
    if (this.portal && this.portal.active) {
      const dist = Math.hypot(this.portal.x - this.playerX, this.portal.y - this.playerY);
      if (dist <= 165) {
        this.advanceToNextFloor();
        return;
      }
    }

    // 2. Check closest unclaimed Upgrade Pedestal
    let closest: PedestalEntity | null = null;
    let bestDist = 170;
    for (const p of this.pedestals) {
      if (p.consumed) continue;
      const d = Math.hypot(p.x - this.playerX, p.y - this.playerY);
      if (d < bestDist) {
        bestDist = d;
        closest = p;
      }
    }

    if (closest) {
      closest.consumed = true;
      // Mutual exclusion: dissolve sibling pedestals in the same room
      for (const other of this.pedestals) {
        if (other.roomId === closest.roomId && other.id !== closest.id) {
          other.consumed = true;
          this.spawnParticles(other.x, other.y, 10, '#64748B', 140);
        }
      }
      this.pedestals = this.pedestals.filter((p) => !p.consumed);

      const prevMax = this.stats.MaxHealth;
      this.relics.push(closest.relic);
      this.stats = recalculateWardenStats(
        this.relics,
        this.profile.permanentHealthRank,
        this.profile.permanentDamageRank,
      );
      const hpDelta = Math.max(0, this.stats.MaxHealth - prevMax);
      this.playerHealth.maxHealth = this.stats.MaxHealth;
      this.playerHealth.currentHealth = Math.min(
        this.playerHealth.maxHealth,
        this.playerHealth.currentHealth + hpDelta + 15,
      );

      this.spawnParticles(closest.x, closest.y, 20, closest.relic.rarity === 'Epic' ? '#F59E0B' : '#22D3EE', 280);
      gameAudio.playRelicClaim();
      this.pushHudSnapshot(true);
    }
  }

  private getMoveInputVector(): { x: number; y: number } {
    let right = 0;
    let forward = 0;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) forward += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) forward -= 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) right -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) right += 1;
    const len = Math.hypot(right, forward);
    if (len <= 0) return { x: 0, y: 0 };
    const nr = right / len;
    const nf = forward / len;
    // Camera forward vector on ground plane for cameraYaw (0 = looking -Z / North):
    // forwardDir = (-sin(yaw), -cos(yaw)), rightDir = (cos(yaw), -sin(yaw))
    const sinY = Math.sin(this.cameraYaw);
    const cosY = Math.cos(this.cameraYaw);
    return {
      x: nr * cosY - nf * sinY,
      y: -nr * sinY - nf * cosY,
    };
  }

  public setCameraYaw(yaw: number): void {
    this.cameraYaw = yaw;
  }

  public setAimWorldTarget(worldX: number, worldY: number): void {
    this.aimWorldX = worldX;
    this.aimWorldY = worldY;
  }

  private updateAimFacing(): void {
    let targetX: number;
    let targetY: number;
    if (this.aimWorldX !== null && this.aimWorldY !== null) {
      targetX = this.aimWorldX;
      targetY = this.aimWorldY;
    } else {
      const worldScale = 0.55;
      targetX = this.camX + (this.mouseScreenX - this.canvasWidth / 2) / worldScale;
      targetY = this.camY + (this.mouseScreenY - this.canvasHeight / 2) / worldScale;
    }
    const dx = targetX - this.playerX;
    const dy = targetY - this.playerY;
    if (Math.hypot(dx, dy) > 6) {
      this.playerFacing = Math.atan2(dy, dx);
    }
  }

  public step(rawDt: number, isPlaying: boolean): void {
    const dt = Math.min(rawDt, 0.05);
    this.ambientTime += dt;

    // Real-time juice updates (camera shake, hit flash, super nova wave, particles) continue smoothly
    this.trauma = Math.max(0, this.trauma - dt * 2.4);
    this.playerHitFlash = Math.max(0, this.playerHitFlash - dt / 0.12);
    this.superNovaTimer = Math.max(0, this.superNovaTimer - dt);
    this.updateParticles(dt);
    this.updateFloatingDamages(dt);

    if (!isPlaying) return;

    if (this.playerHealth.isDead) {
      if (!this.runEnded) {
        this.deathBeatTimer -= dt;
        if (this.deathBeatTimer <= 0) {
          this.runEnded = true;
          this.profile.totalAetherThreads += this.pendingAetherThreads;
          if (this.currentFloor > this.profile.highestFloorReached) {
            this.profile.highestFloorReached = this.currentFloor;
          }
          this.callbacks.onProfileChanged({ ...this.profile });
          this.callbacks.onRunEnded({
            victory: false,
            floorReached: this.currentFloor,
            enemiesSlain: this.runKills,
            aetherEarned: this.pendingAetherThreads,
            relicsCollected: this.relics.length,
            seed: this.dungeon.seed,
          });
        }
      }
      return;
    }

    // Sim-level Hit-Stop freeze (45ms heavy strike / 70ms killing blow)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    this.updatePlayer(dt);
    this.updateRoomsAndEncounters(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateHazards(dt);

    // Smooth camera spring-arm lag
    const lagAlpha = 1 - Math.exp(-10 * dt);
    this.camX += (this.playerX - this.camX) * lagAlpha;
    this.camY += (this.playerY - this.camY) * lagAlpha;

    this.lastHudPush += dt;
    if (this.lastHudPush >= 0.08) {
      this.lastHudPush = 0;
      this.pushHudSnapshot(false);
    }
  }

  private updatePlayer(dt: number): void {
    this.dodgeCooldownTimer = Math.max(0, this.dodgeCooldownTimer - dt);
    this.runeLanceCooldown = Math.max(0, this.runeLanceCooldown - dt);

    if (this.dodgeIFrameTimer > 0) {
      this.dodgeIFrameTimer -= dt;
      if (this.dodgeIFrameTimer <= 0) {
        this.playerHealth.isInvulnerable = false;
      }
    }

    if (this.combatState === 'Dodging') {
      this.dodgeTimer -= dt;
      const dodgeSpeed = 1280;
      this.moveEntityWithDungeonCollision(
        this.dodgeDirX * dodgeSpeed * dt,
        this.dodgeDirY * dodgeSpeed * dt,
      );
      if (this.dodgeTimer <= 0) {
        this.combatState = 'Idle';
        this.playerHealth.isInvulnerable = false;
      }
      return;
    }

    if (this.combatState === 'Windup' || this.combatState === 'Active' || this.combatState === 'Recovery') {
      this.attackTimer -= dt;
      const progress = 1 - this.attackTimer / Math.max(0.01, this.attackDuration);

      if (progress < 0.25) {
        this.combatState = 'Windup';
      } else if (progress <= 0.65) {
        this.combatState = 'Active';
        this.activeSweepArc = (progress - 0.25) / 0.4;
        this.performAntiTunnelingMeleeSweep();
      } else {
        if (this.combatState === 'Active') {
          this.combatState = 'Recovery';
          // Combo Window Notify check
          if (this.comboBuffered && this.comboStep < 2) {
            this.comboStep += 1;
            this.beginMeleeSwing(false);
            return;
          }
        }
      }

      // Slight forward lunge during melee swing
      const move = this.getMoveInputVector();
      const slowSpeed = this.stats.MoveSpeed * 0.28;
      this.moveEntityWithDungeonCollision(move.x * slowSpeed * dt, move.y * slowSpeed * dt);

      if (this.attackTimer <= 0) {
        this.combatState = 'Idle';
        this.comboStep = 0;
        this.comboBuffered = false;
      }
      return;
    }

    // Normal responsive movement
    const move = this.getMoveInputVector();
    this.playerVx = move.x * this.stats.MoveSpeed;
    this.playerVy = move.y * this.stats.MoveSpeed;
    if (Math.hypot(move.x, move.y) > 0.05) {
      this.walkCycle += Math.hypot(this.playerVx, this.playerVy) * dt * 0.025;
      this.playerFacing = Math.atan2(move.y, move.x);
    } else {
      this.updateAimFacing();
    }
    this.moveEntityWithDungeonCollision(this.playerVx * dt, this.playerVy * dt);
  }

  private performAntiTunnelingMeleeSweep(): void {
    const reach = this.currentAttackHeavy ? 175 : 145;
    const halfArc = this.currentAttackHeavy ? 1.25 : 0.95;

    for (const enemy of this.enemies) {
      if (enemy.health.isDead || this.hitActorsThisSwing.has(enemy.id)) continue;

      const dx = enemy.x - this.playerX;
      const dy = enemy.y - this.playerY;
      const dist = Math.hypot(dx, dy);
      if (dist > reach + enemy.radius) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      let angleDiff = angleToEnemy - this.playerFacing;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= halfArc) {
        this.hitActorsThisSwing.add(enemy.id);
        this.dealDamageToEnemy(enemy, this.stats.MeleeDamage * (this.currentAttackHeavy ? 1.45 : 1.0), this.currentAttackHeavy);
      }
    }
  }

  private dealDamageToEnemy(enemy: EnemyEntity, baseDamage: number, isHeavy: boolean): void {
    const crit = Math.random() < this.stats.CritChance;
    const finalDmg = Math.round(baseDamage * (crit ? 1.75 : 1.0));
    const res = applyUnifiedDamage(enemy.health, finalDmg);
    if (!res.applied) return;

    // Damage Sense: immediately alert enemy even if struck from behind
    enemy.alerted = true;
    enemy.hitFlash = 1.0;

    const dirX = enemy.x - this.playerX;
    const dirY = enemy.y - this.playerY;
    const len = Math.max(1, Math.hypot(dirX, dirY));
    const nx = dirX / len;
    const ny = dirY / len;

    // Poise & Stagger check
    const poiseDmg = isHeavy ? 42 : 16;
    enemy.poise -= poiseDmg;
    if (enemy.poise <= 0 && !enemy.health.isDead && enemy.bossRoarTimer <= 0) {
      enemy.poise = enemy.maxPoise;
      enemy.combatState = 'Staggered';
      enemy.stateTimer = 0.55;
      enemy.vx = nx * 460;
      enemy.vy = ny * 460;
    } else if (!enemy.health.isDead) {
      enemy.vx += nx * (isHeavy ? 280 : 120);
      enemy.vy += ny * (isHeavy ? 280 : 120);
    }

    // Weaver-Warden Boss Phase 2 transition at <= 50% HP (2s invulnerable roar)
    if (
      enemy.archetype === 'WeaverWardenBoss' &&
      enemy.bossPhase === 1 &&
      !enemy.health.isDead &&
      enemy.health.currentHealth / enemy.health.maxHealth <= 0.5
    ) {
      enemy.bossPhase = 2;
      enemy.bossRoarTimer = 2.0;
      enemy.health.isInvulnerable = true;
      enemy.speed *= 1.24;
      enemy.combatState = 'Idle';
      this.addTrauma(0.65);
      this.spawnParticles(enemy.x, enemy.y, 28, '#F59E0B', 380);
      gameAudio.playBossRoar();
    }

    this.superCharge = Math.min(100, this.superCharge + (res.killed ? 20 : 8));
    this.spawnFloatingDamage(enemy.x, enemy.y - enemy.radius - 12, res.damageDealt, crit, crit ? '#E0B46A' : '#EAE3D5');
    this.spawnParticles(enemy.x, enemy.y, res.killed ? 22 : isHeavy || crit ? 14 : 7, crit ? '#E0B46A' : '#D96B27', res.killed ? 340 : 220);
    gameAudio.playHit(isHeavy || res.killed, crit);

    if (res.killed) {
      this.handleEnemyKilled(enemy);
    } else if (isHeavy || crit) {
      this.hitstopTimer = 0.045; // 45ms heavy strike Hit-Stop
      this.addTrauma(crit ? 0.35 : 0.25);
    } else {
      this.addTrauma(0.12);
    }

    this.pushHudSnapshot(true);
  }

  private handleEnemyKilled(enemy: EnemyEntity): void {
    enemy.combatState = 'Dead';
    enemy.koTimer = 0.42;
    this.hitstopTimer = 0.07; // 70ms killing blow Hit-Stop
    this.addTrauma(0.5);
    this.runKills += 1;
    this.pendingAetherThreads += enemy.threadReward;

    if (enemy.archetype === 'WeaverWardenBoss') {
      this.profile.totalBossesSlain += 1;
      this.callbacks.onProfileChanged({ ...this.profile });
      this.portal = { x: enemy.x, y: enemy.y, active: true };
      this.spawnParticles(enemy.x, enemy.y, 36, '#E0B46A', 420);
    }

    this.checkRoomCleared(enemy.roomId);
  }

  private damagePlayer(rawDamage: number, sourceX: number, sourceY: number): void {
    const res = applyUnifiedDamage(this.playerHealth, rawDamage);
    if (!res.applied) return;

    this.playerHitFlash = 1.0;
    this.addTrauma(0.55);
    this.hitstopTimer = 0.04;
    this.spawnFloatingDamage(this.playerX, this.playerY - 56, res.damageDealt, false, '#EF4444');
    this.spawnParticles(this.playerX, this.playerY, 14, '#EF4444', 260);
    gameAudio.playPlayerHurt();

    // Small knockback
    const dx = this.playerX - sourceX;
    const dy = this.playerY - sourceY;
    const len = Math.max(1, Math.hypot(dx, dy));
    this.moveEntityWithDungeonCollision((dx / len) * 55, (dy / len) * 55);

    if (res.killed) {
      this.combatState = 'Dead';
      this.deathBeatTimer = 0.55;
      this.hitstopTimer = 0.07;
      gameAudio.playDefeat();
    }

    this.pushHudSnapshot(true);
  }

  private updateRoomsAndEncounters(dt: number): void {
    const currentRoom = this.findRoomContaining(this.playerX, this.playerY);
    if (currentRoom && currentRoom.state === 'Dormant') {
      // Recessed inner trigger (120cm inside doorway walls)
      const margin = 120;
      const insideTrigger =
        this.playerX > currentRoom.x + margin &&
        this.playerX < currentRoom.x + currentRoom.width - margin &&
        this.playerY > currentRoom.y + margin &&
        this.playerY < currentRoom.y + currentRoom.height - margin;

      if (insideTrigger) {
        if (currentRoom.type === 'Treasure') {
          currentRoom.state = 'Cleared';
          this.spawnThreeRelicPedestalsInRoom(currentRoom);
          gameAudio.playRoomClear();
          this.pushHudSnapshot(true);
        } else if (currentRoom.type === 'Combat' || currentRoom.type === 'Boss') {
          currentRoom.state = 'LockedCombat';
          currentRoom.runicGatesLocked = true;
          currentRoom.telegraphTimer = 1.0; // 1.0s portal telegraph
          this.queueRoomWaveTelegraphs(currentRoom);
          gameAudio.playRoomLock();
          this.pushHudSnapshot(true);
        }
      }
    }

    // Advance 1.0s portal spawn telegraphs
    for (let i = this.spawnTelegraphs.length - 1; i >= 0; i--) {
      const t = this.spawnTelegraphs[i];
      t.timer -= dt;
      if (t.timer <= 0) {
        this.spawnEnemy(t.archetype, t.x, t.y, t.roomId);
        this.spawnParticles(t.x, t.y, 12, '#A855F7', 220);
        this.spawnTelegraphs.splice(i, 1);
      }
    }
  }

  private queueRoomWaveTelegraphs(room: GeneratedRoom): void {
    const scaling = getFloorScaling(this.currentFloor);
    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;

    if (room.type === 'Boss') {
      this.spawnTelegraphs.push({
        x: cx,
        y: cy,
        timer: 1.0,
        maxTimer: 1.0,
        archetype: 'WeaverWardenBoss',
        roomId: room.id,
      });
      return;
    }

    const archetypes: EEnemyArchetype[] = ['ThreadlingRusher', 'SpireArcanist', 'IroncladLoomguard'];
    const count = scaling.waveEnemyCount;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + 0.35;
      const dist = Math.min(room.width, room.height) * 0.28;
      let sx = cx + Math.cos(angle) * dist;
      let sy = cy + Math.sin(angle) * dist;
      // Ensure spawns stay safely away from player
      if (Math.hypot(sx - this.playerX, sy - this.playerY) < 220) {
        sx = cx - Math.cos(angle) * dist;
        sy = cy - Math.sin(angle) * dist;
      }
      this.spawnTelegraphs.push({
        x: sx,
        y: sy,
        timer: 1.0,
        maxTimer: 1.0,
        archetype: archetypes[i % archetypes.length],
        roomId: room.id,
      });
    }
  }

  private spawnEnemy(archetype: EEnemyArchetype, x: number, y: number, roomId: number): void {
    const scaling = getFloorScaling(this.currentFloor);
    const baseCfg = {
      ThreadlingRusher: { hp: 52, speed: 410, radius: 34, range: 120, poise: 28, telegraph: 0.44, dmg: 12, reward: 12 },
      SpireArcanist: { hp: 64, speed: 270, radius: 36, range: 640, poise: 34, telegraph: 0.58, dmg: 14, reward: 18 },
      IroncladLoomguard: { hp: 118, speed: 215, radius: 48, range: 175, poise: 78, telegraph: 0.74, dmg: 22, reward: 26 },
      WeaverWardenBoss: { hp: 420, speed: 300, radius: 66, range: 210, poise: 140, telegraph: 0.62, dmg: 26, reward: 120 },
    }[archetype];

    const scaledHp = Math.round(baseCfg.hp * scaling.enemyHealthMult);
    const scaledDmg = Math.round(baseCfg.dmg * scaling.enemyDamageMult);

    this.enemies.push({
      id: this.nextEntityId++,
      roomId,
      archetype,
      x,
      y,
      vx: 0,
      vy: 0,
      facingAngle: Math.atan2(this.playerY - y, this.playerX - x),
      radius: baseCfg.radius,
      speed: baseCfg.speed,
      preferredRange: baseCfg.range,
      health: {
        maxHealth: scaledHp,
        currentHealth: scaledHp,
        currentShield: 0,
        isInvulnerable: false,
        isDead: false,
      },
      poise: baseCfg.poise,
      maxPoise: baseCfg.poise,
      combatState: 'Idle',
      stateTimer: 0,
      telegraphDuration: baseCfg.telegraph,
      telegraphTargetX: this.playerX,
      telegraphTargetY: this.playerY,
      attackCooldown: 0.6 + Math.random() * 0.5,
      hitFlash: 0,
      koTimer: 0,
      bossPhase: 1,
      bossRoarTimer: 0,
      bossHazardCooldown: 2.6,
      damage: scaledDmg,
      threadReward: baseCfg.reward,
      flankSlotAngle: (this.enemies.length * 2.39996) % (Math.PI * 2), // Golden-angle EQS ring spread
      alerted: true,
    });
  }

  private checkRoomCleared(roomId: number): void {
    const room = this.dungeon.rooms.find((r) => r.id === roomId);
    if (!room || room.state !== 'LockedCombat') return;

    const alive = this.enemies.some((e) => e.roomId === roomId && !e.health.isDead);
    const pending = this.spawnTelegraphs.some((t) => t.roomId === roomId);
    if (!alive && !pending) {
      room.state = 'Cleared';
      room.runicGatesLocked = false;
      gameAudio.playRoomClear();
      if (room.type === 'Combat') {
        this.spawnThreeRelicPedestalsInRoom(room);
      }
      this.pushHudSnapshot(true);
    }
  }

  private spawnThreeRelicPedestalsInRoom(room: GeneratedRoom): void {
    const rolled = rollThreeUniqueRelics(this.currentFloor);
    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;
    for (let i = 0; i < rolled.length; i++) {
      this.pedestals.push({
        id: this.nextEntityId++,
        roomId: room.id,
        x: cx + (i - 1) * 210,
        y: cy,
        relic: rolled[i],
        consumed: false,
      });
    }
  }

  private updateEnemies(dt: number): void {
    // Attack token pool: at most 2 concurrent attackers in a room for readable combat
    let activeAttackers = this.enemies.filter(
      (e) => !e.health.isDead && (e.combatState === 'Windup' || e.combatState === 'Active'),
    ).length;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hitFlash = Math.max(0, e.hitFlash - dt / 0.12);

      if (e.health.isDead) {
        e.koTimer -= dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= Math.exp(-8 * dt);
        e.vy *= Math.exp(-8 * dt);
        if (e.koTimer <= 0) {
          this.enemies.splice(i, 1);
        }
        continue;
      }

      // Boss Phase 2 invulnerable roar
      if (e.bossRoarTimer > 0) {
        e.bossRoarTimer -= dt;
        if (e.bossRoarTimer <= 0) {
          e.health.isInvulnerable = false;
        }
        continue;
      }

      // Boss Phase 2 periodic floor rune hazards
      if (e.archetype === 'WeaverWardenBoss' && e.bossPhase >= 2) {
        e.bossHazardCooldown -= dt;
        if (e.bossHazardCooldown <= 0) {
          e.bossHazardCooldown = 3.2;
          this.hazards.push({
            x: this.playerX + (Math.random() - 0.5) * 90,
            y: this.playerY + (Math.random() - 0.5) * 90,
            radius: 135,
            telegraphTimer: 0.85,
            maxTelegraph: 0.85,
            damage: Math.round(e.damage * 0.9),
            detonated: false,
            fadeTimer: 0.35,
          });
          gameAudio.playTelegraph();
        }
      }

      // Dampen knockback velocity
      e.vx *= Math.exp(-9 * dt);
      e.vy *= Math.exp(-9 * dt);

      if (e.combatState === 'Staggered') {
        e.stateTimer -= dt;
        this.moveEnemyWithinRoom(e, e.vx * dt, e.vy * dt);
        if (e.stateTimer <= 0) e.combatState = 'Idle';
        continue;
      }

      e.attackCooldown = Math.max(0, e.attackCooldown - dt);

      const dx = this.playerX - e.x;
      const dy = this.playerY - e.y;
      const dist = Math.hypot(dx, dy);

      if (e.combatState === 'Windup') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          this.executeEnemyStrike(e);
          e.combatState = 'Recovery';
          e.stateTimer = 0.35;
          e.attackCooldown = e.archetype === 'WeaverWardenBoss' && e.bossPhase >= 2 ? 0.95 : 1.45;
        }
        continue;
      }

      if (e.combatState === 'Recovery') {
        e.stateTimer -= dt;
        this.moveEnemyWithinRoom(e, e.vx * dt, e.vy * dt);
        if (e.stateTimer <= 0) e.combatState = 'Idle';
        continue;
      }

      e.facingAngle = Math.atan2(dy, dx);

      // Priority 2: Execute attack when inside preferred range & attack token available
      const canTakeToken = e.archetype === 'WeaverWardenBoss' || activeAttackers < 2;
      if (dist <= e.preferredRange && e.attackCooldown <= 0 && canTakeToken) {
        activeAttackers++;
        e.combatState = 'Windup';
        const phaseMult = e.archetype === 'WeaverWardenBoss' && e.bossPhase >= 2 ? 0.78 : 1.0;
        e.stateTimer = e.telegraphDuration * phaseMult;
        e.telegraphTargetX = this.playerX;
        e.telegraphTargetY = this.playerY;
        gameAudio.playTelegraph();
        continue;
      }

      // EQS Anti-Clumping Ring Positioning
      let goalX = this.playerX;
      let goalY = this.playerY;

      if (e.archetype === 'SpireArcanist') {
        // Ranged kiter: maintain 460–680cm ring, retreat if player closes within 340cm
        if (dist < 340) {
          const awayAngle = Math.atan2(e.y - this.playerY, e.x - this.playerX);
          goalX = e.x + Math.cos(awayAngle) * 260;
          goalY = e.y + Math.sin(awayAngle) * 260;
        } else {
          const orbitAngle = e.flankSlotAngle + this.ambientTime * 0.35;
          goalX = this.playerX + Math.cos(orbitAngle) * 520;
          goalY = this.playerY + Math.sin(orbitAngle) * 520;
        }
      } else {
        // Melee flankers spread along golden-angle EQS ring around player
        const ringRadius = e.preferredRange * 0.82;
        const slotAngle = e.flankSlotAngle + (e.attackCooldown > 0 ? this.ambientTime * 0.65 : 0);
        goalX = this.playerX + Math.cos(slotAngle) * ringRadius;
        goalY = this.playerY + Math.sin(slotAngle) * ringRadius;
      }

      // Pairwise teammate separation force (EQS anti-stacking)
      let sepX = 0;
      let sepY = 0;
      for (const other of this.enemies) {
        if (other.id === e.id || other.health.isDead) continue;
        const ox = e.x - other.x;
        const oy = e.y - other.y;
        const od = Math.hypot(ox, oy);
        const minSpace = e.radius + other.radius + 55;
        if (od > 0.1 && od < minSpace) {
          const push = (minSpace - od) / minSpace;
          sepX += (ox / od) * push * 260;
          sepY += (oy / od) * push * 260;
        }
      }

      const gx = goalX - e.x;
      const gy = goalY - e.y;
      const gLen = Math.hypot(gx, gy);
      const moveX = (gLen > 12 ? (gx / gLen) * e.speed : 0) + sepX + e.vx;
      const moveY = (gLen > 12 ? (gy / gLen) * e.speed : 0) + sepY + e.vy;

      this.moveEnemyWithinRoom(e, moveX * dt, moveY * dt);
    }
  }

  private executeEnemyStrike(e: EnemyEntity): void {
    if (e.archetype === 'SpireArcanist') {
      const ang = Math.atan2(e.telegraphTargetY - e.y, e.telegraphTargetX - e.x);
      const speed = 780;
      this.projectiles.push({
        id: this.nextEntityId++,
        faction: 'Loomborn',
        x: e.x + Math.cos(ang) * 42,
        y: e.y + Math.sin(ang) * 42,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        radius: 18,
        damage: e.damage,
        life: 2.6,
        color: '#EF4444',
      });
      this.spawnParticles(e.x + Math.cos(ang) * 42, e.y + Math.sin(ang) * 42, 8, '#EF4444', 180);
      return;
    }

    if (e.archetype === 'IroncladLoomguard') {
      // Ground shockwave AoE slam
      const slamDist = Math.hypot(this.playerX - e.x, this.playerY - e.y);
      this.spawnParticles(e.x, e.y, 18, '#F59E0B', 320);
      this.addTrauma(0.28);
      if (slamDist <= e.preferredRange + PLAYER_RADIUS_CM) {
        this.damagePlayer(e.damage, e.x, e.y);
      }
      return;
    }

    if (e.archetype === 'WeaverWardenBoss') {
      // Sweeping melee strike + 3-bolt arcane fan
      const dist = Math.hypot(this.playerX - e.x, this.playerY - e.y);
      if (dist <= e.preferredRange + PLAYER_RADIUS_CM) {
        this.damagePlayer(e.damage, e.x, e.y);
      }
      const baseAng = Math.atan2(e.telegraphTargetY - e.y, e.telegraphTargetX - e.x);
      const fanCount = e.bossPhase >= 2 ? 5 : 3;
      const spread = 0.28;
      for (let k = 0; k < fanCount; k++) {
        const ang = baseAng + (k - (fanCount - 1) / 2) * spread;
        this.projectiles.push({
          id: this.nextEntityId++,
          faction: 'Loomborn',
          x: e.x + Math.cos(ang) * 60,
          y: e.y + Math.sin(ang) * 60,
          vx: Math.cos(ang) * 760,
          vy: Math.sin(ang) * 760,
          radius: 18,
          damage: Math.round(e.damage * 0.72),
          life: 2.4,
          color: '#F59E0B',
        });
      }
      this.addTrauma(0.32);
      return;
    }

    // Threadling Rusher quick lunge slash
    const ang = Math.atan2(e.telegraphTargetY - e.y, e.telegraphTargetX - e.x);
    this.moveEnemyWithinRoom(e, Math.cos(ang) * 95, Math.sin(ang) * 95);
    const dist = Math.hypot(this.playerX - e.x, this.playerY - e.y);
    if (dist <= e.preferredRange + PLAYER_RADIUS_CM) {
      this.damagePlayer(e.damage, e.x, e.y);
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0 || !this.isPointInsideWalkableDungeon(p.x, p.y, 12)) {
        this.spawnParticles(p.x, p.y, 6, p.color, 160);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.faction === 'Player') {
        let hit = false;
        for (const e of this.enemies) {
          if (e.health.isDead) continue;
          if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + p.radius) {
            this.dealDamageToEnemy(e, p.damage, false);
            hit = true;
            break;
          }
        }
        if (hit) {
          this.projectiles.splice(i, 1);
        }
      } else {
        if (Math.hypot(this.playerX - p.x, this.playerY - p.y) <= PLAYER_RADIUS_CM + p.radius) {
          this.damagePlayer(p.damage, p.x, p.y);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private updateHazards(dt: number): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (!h.detonated) {
        h.telegraphTimer -= dt;
        if (h.telegraphTimer <= 0) {
          h.detonated = true;
          this.spawnParticles(h.x, h.y, 16, '#EF4444', 280);
          this.addTrauma(0.25);
          if (Math.hypot(this.playerX - h.x, this.playerY - h.y) <= h.radius) {
            this.damagePlayer(h.damage, h.x, h.y);
          }
        }
      } else {
        h.fadeTimer -= dt;
        if (h.fadeTimer <= 0) {
          this.hazards.splice(i, 1);
        }
      }
    }
  }

  private moveEnemyWithinRoom(e: EnemyEntity, dx: number, dy: number): void {
    const room = this.dungeon.rooms.find((r) => r.id === e.roomId);
    if (!room) return;
    const pad = e.radius + 36;
    e.x = Math.max(room.x + pad, Math.min(room.x + room.width - pad, e.x + dx));
    e.y = Math.max(room.y + pad, Math.min(room.y + room.height - pad, e.y + dy));
  }

  private moveEntityWithDungeonCollision(dx: number, dy: number): void {
    const nx = this.playerX + dx;
    if (this.isPointInsideWalkableDungeon(nx, this.playerY, PLAYER_RADIUS_CM)) {
      this.playerX = nx;
    }
    const ny = this.playerY + dy;
    if (this.isPointInsideWalkableDungeon(this.playerX, ny, PLAYER_RADIUS_CM)) {
      this.playerY = ny;
    }
  }

  public isPointInsideWalkableDungeon(x: number, y: number, radius: number): boolean {
    const wallPad = 32 + radius;
    const halfDoor = DOORWAY_WIDTH_CM / 2 - radius * 0.75;

    // 1. Inside any room's interior floor (if locked combat room exists, stay inside locked room)
    const lockedRoom = this.dungeon.rooms.find((r) => r.runicGatesLocked);
    if (lockedRoom) {
      return (
        x >= lockedRoom.x + wallPad &&
        x <= lockedRoom.x + lockedRoom.width - wallPad &&
        y >= lockedRoom.y + wallPad &&
        y <= lockedRoom.y + lockedRoom.height - wallPad
      );
    }

    for (const r of this.dungeon.rooms) {
      if (
        x >= r.x + wallPad &&
        x <= r.x + r.width - wallPad &&
        y >= r.y + wallPad &&
        y <= r.y + r.height - wallPad
      ) {
        return true;
      }

      // 2. Inside any open connected doorway corridor seam
      for (const d of r.doorways) {
        if (d.connectedToRoomId === null || d.sealedWithWallCap) continue;
        if (d.dir === 0 || d.dir === 2) {
          if (Math.abs(x - d.x) <= wallPad + 24 && Math.abs(y - d.y) <= halfDoor) {
            return true;
          }
        } else {
          if (Math.abs(y - d.y) <= wallPad + 24 && Math.abs(x - d.x) <= halfDoor) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public findRoomContaining(x: number, y: number): GeneratedRoom | null {
    for (const r of this.dungeon.rooms) {
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        return r;
      }
    }
    return null;
  }

  private addTrauma(amount: number): void {
    if (!this.profile.cameraShakeEnabled) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  private spawnParticles(x: number, y: number, count: number, color: string, speedMax: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const ang = Math.random() * Math.PI * 2;
      const spd = speedMax * (0.3 + Math.random() * 0.7);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.life = 0.25 + Math.random() * 0.28;
      p.maxLife = p.life;
      p.size = 4 + Math.random() * 6;
      p.color = color;
    }
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-5 * dt);
      p.vy *= Math.exp(-5 * dt);
    }
  }

  private spawnFloatingDamage(x: number, y: number, value: number, crit: boolean, color: string): void {
    const f = this.floatingDamages[this.damageCursor];
    this.damageCursor = (this.damageCursor + 1) % DAMAGE_POOL_SIZE;
    f.active = true;
    f.x = x + (Math.random() - 0.5) * 26;
    f.y = y;
    f.vy = crit ? -130 : -95;
    f.value = Math.round(value);
    f.crit = crit;
    f.life = crit ? 0.85 : 0.65;
    f.maxLife = f.life;
    f.color = color;
  }

  private updateFloatingDamages(dt: number): void {
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
      const f = this.floatingDamages[i];
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.active = false;
        continue;
      }
      f.y += f.vy * dt;
      f.vy *= Math.exp(-2.8 * dt);
    }
  }

  public pushHudSnapshot(force: boolean): void {
    if (!force && this.playerHealth.isDead) return;

    const activeBoss = this.enemies.find((e) => e.archetype === 'WeaverWardenBoss' && !e.health.isDead);
    const activeRoom = this.findRoomContaining(this.playerX, this.playerY);
    const combatRooms = this.dungeon.rooms.filter((r) => r.type === 'Combat' || r.type === 'Boss');
    const clearedRooms = combatRooms.filter((r) => r.state === 'Cleared').length;

    let promptText: string | null = null;
    let promptSubtext: string | null = null;
    let promptRarity: string | null = null;

    if (this.portal && this.portal.active && Math.hypot(this.portal.x - this.playerX, this.portal.y - this.playerY) <= 185) {
      promptText = 'Press E — Enter Descent Portal';
      promptSubtext = `Descend to Floor ${this.currentFloor + 1} (keeps active relics)`;
      promptRarity = 'Epic';
    } else {
      for (const p of this.pedestals) {
        if (!p.consumed && Math.hypot(p.x - this.playerX, p.y - this.playerY) <= 175) {
          promptText = `Press E — Claim ${p.relic.displayName}`;
          promptSubtext = `${p.relic.rarity} Loom Relic · ${p.relic.description}`;
          promptRarity = p.relic.rarity;
          break;
        }
      }
    }

    const dodgeCd = Math.max(0.25, this.stats.DodgeCooldown);
    const dodgeReadyRatio = 1 - Math.min(1, this.dodgeCooldownTimer / dodgeCd);

    this.callbacks.onHudUpdate({
      hp: Math.round(this.playerHealth.currentHealth),
      maxHp: Math.round(this.playerHealth.maxHealth),
      shield: Math.round(this.playerHealth.currentShield),
      floor: this.currentFloor,
      seed: this.dungeon.seed,
      roomsCleared: clearedRooms,
      totalCombatRooms: combatRooms.length,
      aetherThreads: this.pendingAetherThreads,
      kills: this.runKills,
      relicCount: this.relics.length,
      comboStep: this.comboStep,
      dodgeReadyRatio,
      isInvulnerable: this.playerHealth.isInvulnerable,
      superCharge: Math.round(this.superCharge),
      bossName: activeBoss ? 'The Weaver-Warden' : null,
      bossHp: activeBoss ? Math.round(activeBoss.health.currentHealth) : 0,
      bossMaxHp: activeBoss ? Math.round(activeBoss.health.maxHealth) : 1,
      bossPhase: activeBoss ? activeBoss.bossPhase : 1,
      promptText,
      promptSubtext,
      promptRarity,
      activeRoomType: activeRoom ? activeRoom.type : 'Corridor',
      activeRoomLocked: Boolean(activeRoom?.runicGatesLocked),
      debugOverlay: this.debugOverlay,
    });
  }
}
