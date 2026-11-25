import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  DEFAULT_GAME_SETTINGS,
  type CameraPreset,
  type GameSettings,
  type GraphicsQuality,
} from '../game/settings';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdate: (next: GameSettings) => void;
  onClose: () => void;
}

type SettingsTab = 'video' | 'audio' | 'controls';

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
  const [tab, setTab] = useState<SettingsTab>('video');

  const patch = (partial: Partial<GameSettings>) => {
    onUpdate({ ...settings, ...partial });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B0908]/88 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="w-full max-w-2xl bg-[#151210] border border-[#45392C] shadow-[0_24px_64px_rgba(0,0,0,0.94)] flex flex-col max-h-[88vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2C241D]">
          <div>
            <h2
              id="settings-modal-title"
              className="font-display text-xl font-bold tracking-[0.2em] text-[#EAE3D5]"
            >
              SETTINGS
            </h2>
            <p className="text-xs text-[#A69B8D] mt-0.5">
              Display, Camera Follow, Audio &amp; Controls
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Settings"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-[#45392C] text-[#C5B9A7] hover:text-white hover:border-[#C89B54] rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-4 border-b border-[#2C241D]">
          {(
            [
              ['video', 'Display & Camera'],
              ['audio', 'Audio & Feel'],
              ['controls', 'Controls'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                tab === id
                  ? 'border-[#C89B54] text-[#EAE3D5]'
                  : 'border-transparent text-[#8F8374] hover:text-[#EAE3D5]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto sunderloom-scroll space-y-5 flex-1">
          {tab === 'video' && (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Graphics Quality</div>
                  <div className="text-xs text-[#A69B8D]">
                    Render resolution scale and PBR post-processing fidelity.
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#100D0C] p-1 border border-[#342B22] rounded-sm">
                  {(['Ultra', 'High', 'Performance'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => patch({ graphicsQuality: q })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors cursor-pointer ${
                        settings.graphicsQuality === q
                          ? 'bg-[#C89B54] text-[#0E0B0A] font-semibold'
                          : 'text-[#B5A998] hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Camera View Mode (V)</div>
                  <div className="text-xs text-[#A69B8D]">
                    Choose 3rd Person (Running), First Person (FPS / Valorant), Top-Down, or Cinematic.
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 bg-[#100D0C] p-1 border border-[#342B22] rounded-sm">
                  {(
                    [
                      ['ThirdPerson', '3rd Person'],
                      ['FirstPerson', 'FPS (Valorant)'],
                      ['TopDown', 'Top-Down'],
                      ['Cinematic', 'Cinematic'],
                    ] as Array<[CameraPreset, string]>
                  ).map(([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => patch({ cameraPreset: preset })}
                      className={`px-2 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap text-center cursor-pointer ${
                        settings.cameraPreset === preset
                          ? 'bg-[#C89B54] text-[#0E0B0A] font-semibold'
                          : 'text-[#B5A998] hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Battlefield Clear Room View</div>
                  <div className="text-xs text-[#A69B8D]">
                    Automatically lowers obstructing walls and widens framing inside enemy combat rooms.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ battlefieldClearView: !settings.battlefieldClearView })}
                  className={`px-4 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                    settings.battlefieldClearView
                      ? 'bg-[#C89B54]/20 border-[#C89B54] text-[#E0B46A]'
                      : 'bg-[#100D0C] border-[#382E25] text-[#A69B8D]'
                  }`}
                >
                  {settings.battlefieldClearView ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Auto-Follow Travel View</div>
                  <div className="text-xs text-[#A69B8D]">
                    Camera smoothly turns behind the direction you are walking.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ autoFollowCamera: !settings.autoFollowCamera })}
                  className={`px-4 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                    settings.autoFollowCamera
                      ? 'bg-[#C89B54]/20 border-[#C89B54] text-[#E0B46A]'
                      : 'bg-[#100D0C] border-[#382E25] text-[#A69B8D]'
                  }`}
                >
                  {settings.autoFollowCamera ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Field of View</div>
                  <div className="text-xs text-[#A69B8D]">Camera perspective lens angle.</div>
                </div>
                <div className="flex items-center gap-3 w-52">
                  <input
                    type="range"
                    aria-label="Field of View"
                    min={40}
                    max={90}
                    step={1}
                    value={settings.fov}
                    onChange={(e) => patch({ fov: Number(e.target.value) })}
                    className="flex-1 accent-[#C89B54] cursor-pointer"
                  />
                  <span className="w-10 text-right text-xs font-mono-tabular text-[#E0B46A]">
                    {settings.fov}°
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Dynamic Shadows</div>
                  <div className="text-xs text-[#A69B8D]">Real-time soft shadows for characters &amp; vault pillars.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ shadowsEnabled: !settings.shadowsEnabled })}
                  className={`px-4 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                    settings.shadowsEnabled
                      ? 'bg-[#C89B54]/20 border-[#C89B54] text-[#E0B46A]'
                      : 'bg-[#100D0C] border-[#382E25] text-[#A69B8D]'
                  }`}
                >
                  {settings.shadowsEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Natural Emissive Bloom</div>
                  <div className="text-xs text-[#A69B8D]">Subtle glow on braziers, forged embers, and Sunder Nova.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ bloomEnabled: !settings.bloomEnabled })}
                  className={`px-4 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                    settings.bloomEnabled
                      ? 'bg-[#C89B54]/20 border-[#C89B54] text-[#E0B46A]'
                      : 'bg-[#100D0C] border-[#382E25] text-[#A69B8D]'
                  }`}
                >
                  {settings.bloomEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </>
          )}

          {tab === 'audio' && (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Master Volume</div>
                  <div className="text-xs text-[#A69B8D]">Combat strikes, bolt impacts, and dungeon acoustics.</div>
                </div>
                <div className="flex items-center gap-3 w-52">
                  <input
                    type="range"
                    aria-label="Master Volume"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(settings.masterVolume * 100)}
                    onChange={(e) => patch({ masterVolume: Number(e.target.value) / 100 })}
                    className="flex-1 accent-[#C89B54] cursor-pointer"
                  />
                  <span className="w-10 text-right text-xs font-mono-tabular text-[#E0B46A]">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Mute Audio</div>
                  <div className="text-xs text-[#A69B8D]">Silence all audio effects immediately.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ muted: !settings.muted })}
                  className={`px-4 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                    settings.muted
                      ? 'bg-[#B82C26]/20 border-[#C4342D] text-[#F08882]'
                      : 'bg-[#100D0C] border-[#382E25] text-[#D6CCBE]'
                  }`}
                >
                  {settings.muted ? 'Muted' : 'Active'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Combat Camera Shake</div>
                  <div className="text-xs text-[#A69B8D]">Impact feedback on heavy cleaves &amp; Sunder Nova.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ screenShake: !settings.screenShake })}
                  className={`px-4 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                    settings.screenShake
                      ? 'bg-[#C89B54]/20 border-[#C89B54] text-[#E0B46A]'
                      : 'bg-[#100D0C] border-[#382E25] text-[#A69B8D]'
                  }`}
                >
                  {settings.screenShake ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#26201A]">
                <div>
                  <div className="text-sm font-medium text-[#EAE3D5]">Vault Minimap</div>
                  <div className="text-xs text-[#A69B8D]">Show corner dungeon map indicator (Tab expands full map).</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ showMinimap: !settings.showMinimap })}
                  className={`px-4 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                    settings.showMinimap
                      ? 'bg-[#C89B54]/20 border-[#C89B54] text-[#E0B46A]'
                      : 'bg-[#100D0C] border-[#382E25] text-[#A69B8D]'
                  }`}
                >
                  {settings.showMinimap ? 'Shown' : 'Hidden'}
                </button>
              </div>
            </>
          )}

          {tab === 'controls' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                ['W / A / S / D', 'Move Warden (Camera-Relative)'],
                ['Mouse Cursor', 'Aim Runeblade & Ranged Shots'],
                ['Left Click', 'Sword Slice (3-Hit Melee Combo)'],
                ['Right Click', 'Shoot Rune Lance Projectile'],
                ['R / F', 'Unleash Sunder Nova Super'],
                ['Space / Shift', 'Phase Step (I-Frames)'],
                ['V', 'Cycle Camera View (3P / FPS / Top / Cin)'],
                ['Z / C', 'Orbit Camera Left / Right'],
                ['Tab', 'Expand Full Vault Map'],
                ['E', 'Claim Relic / Enter Portal'],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-[#100D0C] border border-[#2C241D] px-3.5 py-2.5 rounded-sm"
                >
                  <span className="text-[#D6CCBE]">{desc}</span>
                  <span className="font-mono-tabular text-[#E0B46A] font-semibold">{key}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#2C241D] bg-[#100D0C]">
          <button
            type="button"
            onClick={() => onUpdate({ ...DEFAULT_GAME_SETTINGS })}
            className="text-xs text-[#A69B8D] hover:text-[#EAE3D5] transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#C89B54] text-[#0E0B0A] text-xs font-semibold rounded-sm hover:bg-[#DBA95F] transition-colors cursor-pointer"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
