export type GraphicsQuality = 'Ultra' | 'High' | 'Performance';
export type CameraPreset = 'ThirdPerson' | 'Cinematic' | 'Tactical';

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  shadowsEnabled: boolean;
  bloomEnabled: boolean;
  cameraPreset: CameraPreset;
  autoFollowCamera: boolean;
  fov: number;
  masterVolume: number;
  muted: boolean;
  screenShake: boolean;
  showMinimap: boolean;
}

const SETTINGS_KEY = 'sunderloom_settings_v2';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  graphicsQuality: 'Ultra',
  shadowsEnabled: true,
  bloomEnabled: true,
  cameraPreset: 'ThirdPerson',
  autoFollowCamera: true,
  fov: 52,
  masterVolume: 0.8,
  muted: false,
  screenShake: true,
  showMinimap: true,
};

export function loadGameSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_GAME_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      graphicsQuality:
        parsed.graphicsQuality === 'Ultra' ||
        parsed.graphicsQuality === 'High' ||
        parsed.graphicsQuality === 'Performance'
          ? parsed.graphicsQuality
          : DEFAULT_GAME_SETTINGS.graphicsQuality,
      shadowsEnabled:
        typeof parsed.shadowsEnabled === 'boolean'
          ? parsed.shadowsEnabled
          : DEFAULT_GAME_SETTINGS.shadowsEnabled,
      bloomEnabled:
        typeof parsed.bloomEnabled === 'boolean'
          ? parsed.bloomEnabled
          : DEFAULT_GAME_SETTINGS.bloomEnabled,
      cameraPreset:
        parsed.cameraPreset === 'ThirdPerson' ||
        parsed.cameraPreset === 'Cinematic' ||
        parsed.cameraPreset === 'Tactical'
          ? parsed.cameraPreset
          : DEFAULT_GAME_SETTINGS.cameraPreset,
      autoFollowCamera:
        typeof parsed.autoFollowCamera === 'boolean'
          ? parsed.autoFollowCamera
          : DEFAULT_GAME_SETTINGS.autoFollowCamera,
      fov:
        typeof parsed.fov === 'number'
          ? Math.max(40, Math.min(72, Math.round(parsed.fov)))
          : DEFAULT_GAME_SETTINGS.fov,
      masterVolume:
        typeof parsed.masterVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.masterVolume))
          : DEFAULT_GAME_SETTINGS.masterVolume,
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_GAME_SETTINGS.muted,
      screenShake:
        typeof parsed.screenShake === 'boolean'
          ? parsed.screenShake
          : DEFAULT_GAME_SETTINGS.screenShake,
      showMinimap:
        typeof parsed.showMinimap === 'boolean'
          ? parsed.showMinimap
          : DEFAULT_GAME_SETTINGS.showMinimap,
    };
  } catch {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveGameSettings(settings: GameSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore restricted storage contexts
  }
}
