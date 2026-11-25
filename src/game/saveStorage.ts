import type { FSaveProfile } from './types';

const STORAGE_KEY = 'sunderloom_warden_profile_v1';

export const DEFAULT_SAVE_PROFILE: FSaveProfile = {
  saveVersion: 1,
  totalAetherThreads: 0,
  unlockedWeapons: ['Weapon_ObsidianBlade'],
  permanentHealthRank: 0,
  permanentDamageRank: 0,
  highestFloorReached: 1,
  totalBossesSlain: 0,
  cameraShakeEnabled: true,
  muted: false,
};

export function loadSaveProfile(): FSaveProfile {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_SAVE_PROFILE };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE_PROFILE };
    const parsed = JSON.parse(raw) as Partial<FSaveProfile>;
    return {
      ...DEFAULT_SAVE_PROFILE,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_SAVE_PROFILE };
  }
}

export function saveProfileAsync(profile: FSaveProfile): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch {
        // Ignore quota errors
      }
    }, 0);
  } catch {
    // Ignore storage errors
  }
}
