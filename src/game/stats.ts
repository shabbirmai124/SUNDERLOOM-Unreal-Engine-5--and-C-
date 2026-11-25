import type {
  EStatType,
  FDamageResult,
  FHealthState,
  FLoomRelicData,
  FStatBlock,
} from './types';

// All 15 Starter Loom Relics matching Content/Data/DT_LoomRelics.csv
export const STARTER_LOOM_RELICS: FLoomRelicData[] = [
  { id: 'Relic_ObsidianHeart', displayName: 'Obsidian Heart', description: '+25 Maximum Health', rarity: 'Common', targetStat: 'MaxHealth', modifierType: 'FlatAdd', modifierValue: 25 },
  { id: 'Relic_ForgeEdge', displayName: 'Tempered Forge Edge', description: '+6 Base Melee Damage', rarity: 'Common', targetStat: 'MeleeDamage', modifierType: 'FlatAdd', modifierValue: 6 },
  { id: 'Relic_AetherQuiver', displayName: 'Aether Prism', description: '+5 Base Ranged Damage', rarity: 'Common', targetStat: 'RangedDamage', modifierType: 'FlatAdd', modifierValue: 5 },
  { id: 'Relic_QuicksilverGreaves', displayName: 'Quicksilver Greaves', description: '+10% Movement Speed', rarity: 'Common', targetStat: 'MoveSpeed', modifierType: 'PercentMult', modifierValue: 0.1 },
  { id: 'Relic_KeenedSpindle', displayName: 'Keened Spindle', description: '+12% Attack Speed', rarity: 'Common', targetStat: 'AttackSpeed', modifierType: 'PercentMult', modifierValue: 0.12 },
  { id: 'Relic_EyeOfTheWeave', displayName: 'Eye of the Weave', description: '+8% Critical Chance', rarity: 'Common', targetStat: 'CritChance', modifierType: 'FlatAdd', modifierValue: 0.08 },
  { id: 'Relic_ThreadStep', displayName: 'Phase-Thread Buckle', description: '-12% Phase Step Cooldown', rarity: 'Common', targetStat: 'DodgeCooldown', modifierType: 'PercentMult', modifierValue: -0.12 },
  { id: 'Relic_RunicAegis', displayName: 'Runic Aegis Plate', description: '+50 Maximum Health', rarity: 'Rare', targetStat: 'MaxHealth', modifierType: 'FlatAdd', modifierValue: 50 },
  { id: 'Relic_SunderingCleaver', displayName: 'Sundering Rune Edge', description: '+22% Melee Damage', rarity: 'Rare', targetStat: 'MeleeDamage', modifierType: 'PercentMult', modifierValue: 0.22 },
  { id: 'Relic_LanceAmplifier', displayName: 'Resonant Lance Core', description: '+25% Ranged Damage', rarity: 'Rare', targetStat: 'RangedDamage', modifierType: 'PercentMult', modifierValue: 0.25 },
  { id: 'Relic_WhirlwindSpool', displayName: 'Whirlwind Spool', description: '+20% Attack Speed', rarity: 'Rare', targetStat: 'AttackSpeed', modifierType: 'PercentMult', modifierValue: 0.2 },
  { id: 'Relic_PhantomStride', displayName: 'Phantom Loom Stride', description: '-22% Phase Step Cooldown', rarity: 'Rare', targetStat: 'DodgeCooldown', modifierType: 'PercentMult', modifierValue: -0.22 },
  { id: 'Relic_HeartOfTheVault', displayName: 'Heart of the Shifting Vault', description: '+35% Maximum Health', rarity: 'Epic', targetStat: 'MaxHealth', modifierType: 'PercentMult', modifierValue: 0.35 },
  { id: 'Relic_ApexWeaverFang', displayName: 'Apex Weaver Fang', description: '+38% Melee Damage', rarity: 'Epic', targetStat: 'MeleeDamage', modifierType: 'PercentMult', modifierValue: 0.38 },
  { id: 'Relic_SovereignLens', displayName: 'Sovereign Aether Lens', description: '+20% Critical Chance', rarity: 'Epic', targetStat: 'CritChance', modifierType: 'FlatAdd', modifierValue: 0.2 },
];

export const BASE_WARDEN_STATS: FStatBlock = {
  MaxHealth: 120,
  MoveSpeed: 600,
  MeleeDamage: 24,
  RangedDamage: 18,
  AttackSpeed: 1.0,
  CritChance: 0.1,
  DodgeCooldown: 0.9,
};

/**
 * Deterministic UStatsComponent formula strictly enforced:
 * FinalStat = (BaseStat + Sum of Flat Additions) * (1.0 + Sum of Percentage Multipliers)
 */
export function recalculateWardenStats(
  relics: FLoomRelicData[],
  permanentHealthRank = 0,
  permanentDamageRank = 0,
  base: FStatBlock = BASE_WARDEN_STATS,
): FStatBlock {
  const effectiveBase: FStatBlock = {
    ...base,
    MaxHealth: base.MaxHealth + permanentHealthRank * 15,
    MeleeDamage: base.MeleeDamage + permanentDamageRank * 3,
    RangedDamage: base.RangedDamage + permanentDamageRank * 2,
  };

  const statKeys: EStatType[] = [
    'MaxHealth',
    'MoveSpeed',
    'MeleeDamage',
    'RangedDamage',
    'AttackSpeed',
    'CritChance',
    'DodgeCooldown',
  ];

  const result = { ...effectiveBase };

  for (const stat of statKeys) {
    let sumFlat = 0;
    let sumPercent = 0;
    for (const relic of relics) {
      if (relic.targetStat === stat) {
        if (relic.modifierType === 'FlatAdd') {
          sumFlat += relic.modifierValue;
        } else {
          sumPercent += relic.modifierValue;
        }
      }
    }

    let finalVal = (effectiveBase[stat] + sumFlat) * Math.max(0.15, 1.0 + sumPercent);
    if (stat === 'CritChance') {
      finalVal = Math.min(0.95, Math.max(0, finalVal));
    } else if (stat === 'DodgeCooldown') {
      finalVal = Math.max(0.25, finalVal);
    }
    result[stat] = Number(finalVal.toFixed(4));
  }

  return result;
}

/**
 * Exact UHealthComponent::ApplyUnifiedDamage pipeline:
 * Reject if Dead or Invulnerable -> Absorb Shield first -> Subtract remainder -> Clamp -> Single Death
 */
export function applyUnifiedDamage(state: FHealthState, rawDamage: number): FDamageResult {
  if (state.isDead || state.isInvulnerable || rawDamage <= 0) {
    return { applied: false, damageDealt: 0, shieldAbsorbed: 0, killed: false };
  }

  let remaining = rawDamage;
  let shieldAbsorbed = 0;

  if (state.currentShield > 0) {
    shieldAbsorbed = Math.min(state.currentShield, remaining);
    state.currentShield -= shieldAbsorbed;
    remaining -= shieldAbsorbed;
  }

  const prevHealth = state.currentHealth;
  state.currentHealth = Math.max(0, Math.min(state.maxHealth, state.currentHealth - remaining));
  const actualDamage = prevHealth - state.currentHealth;

  let killed = false;
  if (state.currentHealth <= 0) {
    state.isDead = true;
    killed = true;
  }

  return {
    applied: true,
    damageDealt: actualDamage + shieldAbsorbed,
    shieldAbsorbed,
    killed,
  };
}

/**
 * Roll 3 strictly unique rarity-weighted Loom Relics (higher floor boosts Rare/Epic odds).
 */
export function rollThreeUniqueRelics(floorNumber: number, rng: () => number = Math.random): FLoomRelicData[] {
  const pool = [...STARTER_LOOM_RELICS];
  const picked: FLoomRelicData[] = [];
  const rareBonus = Math.min(18, (floorNumber - 1) * 4);
  const epicBonus = Math.min(14, (floorNumber - 1) * 3);

  const weightOf = (r: FLoomRelicData): number => {
    if (r.rarity === 'Common') return Math.max(28, 60 - rareBonus - epicBonus);
    if (r.rarity === 'Rare') return 30 + rareBonus;
    return 10 + epicBonus;
  };

  const count = Math.min(3, pool.length);
  for (let i = 0; i < count; i++) {
    let total = 0;
    for (const item of pool) total += weightOf(item);
    let roll = rng() * total;
    let chosenIdx = 0;
    for (let j = 0; j < pool.length; j++) {
      roll -= weightOf(pool[j]);
      if (roll <= 0) {
        chosenIdx = j;
        break;
      }
    }
    picked.push(pool[chosenIdx]);
    pool.splice(chosenIdx, 1);
  }
  return picked;
}

/**
 * CurveTable mirror of Content/Data/CT_FloorScaling.csv
 */
export function getFloorScaling(floorNumber: number): {
  enemyHealthMult: number;
  enemyDamageMult: number;
  targetRoomCount: number;
  waveEnemyCount: number;
} {
  const f = Math.max(1, Math.floor(floorNumber));
  return {
    enemyHealthMult: Number((1.0 + (f - 1) * 0.35 + Math.pow(f - 1, 1.35) * 0.08).toFixed(2)),
    enemyDamageMult: Number((1.0 + (f - 1) * 0.22 + (f - 1) * 0.02).toFixed(2)),
    targetRoomCount: Math.min(22, 12 + (f - 1) * 3),
    waveEnemyCount: Math.min(8, 3 + Math.floor((f - 1) * 0.8)),
  };
}
