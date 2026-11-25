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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06080D]/86 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="w-full max-w-2xl bg-[#0D1119] border border-[#273246] shadow-[0_24px_64px_rgba(0,0,0,0.92)] flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2736]">
          <div>
            <h2
              id="settings-modal-title"
              className="font-display text-xl font-bold tracking-[0.2em] text-slate-100"
            >
              SETTINGS
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Graphics, Camera, Audio &amp; Input Preferences
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Settings"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border border-[#273246] text-slate-300 hover:text-white hover:border-[#22D3EE] rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-[#1E2736]">
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
                  ? 'border-[#22D3EE] text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto sunderloom-scroll space-y-5 flex-1">
          {tab === 'video' && (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-100">Graphics Quality</div>
                  <div className="text-xs text-slate-400">
                    Controls render resolution scale and PBR post-processing fidelity.
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#121824] p-1 border border-[#232E40] rounded">
                  {(['Ultra', 'High', 'Performance'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => patch({ graphicsQuality: q })}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                        settings.graphicsQuality === q
                          ? 'bg-[#22D3EE] text-[#07090C] font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#1A2230]">
                <div>
                  <div className="text-sm font-medium text-slate-100">Camera Perspective</div>
                  <div className="text-xs text-slate-400">
                    Adjusts third-person SpringArm elevation and combat framing.
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#121824] p-1 border border-[#232E40] rounded">
                  {(['Cinematic', 'Close', 'Tactical'] as CameraPreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => patch({ cameraPreset: preset })}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                        settings.cameraPreset === preset
                          ? 'bg-[#22D3EE] text-[#07090C] font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#1A2230]">
                <div>
                  <div className="text-sm font-medium text-slate-100">Field of View</div>
                  <div className="text-xs text-slate-400">Camera perspective lens angle.</div>
                </div>
                <div className="flex items-center gap-3 w-52">
                  <input
                    type="range"
                    aria-label="Field of View"
                    min={40}
                    max={68}
                    step={1}
                    value={settings.fov}
                    onChange={(e) => patch({ fov: Number(e.target.value) })}
                    className="flex-1 accent-[#22D3EE] cursor-pointer"
                  />
                  <span className="w-10 text-right text-xs font-mono-tabular text-cyan-300">
                    {settings.fov}°
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#1A2230]">
                <div>
                  <div className="text-sm font-medium text-slate-100">Dynamic Shadows</div>
                  <div className="text-xs text-slate-400">Real-time soft shadow maps for characters &amp; vault pillars.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ shadowsEnabled: !settings.shadowsEnabled })}
                  className={`px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    settings.shadowsEnabled
                      ? 'bg-[#22D3EE]/15 border-[#22D3EE] text-cyan-300'
                      : 'bg-[#121824] border-[#263142] text-slate-400'
                  }`}
                >
                  {settings.shadowsEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#1A2230]">
                <div>
                  <div className="text-sm font-medium text-slate-100">Emissive Bloom</div>
                  <div className="text-xs text-slate-400">Luminous glow on Runeblade slashes, braziers &amp; Aether portals.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ bloomEnabled: !settings.bloomEnabled })}
                  className={`px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    settings.bloomEnabled
                      ? 'bg-[#22D3EE]/15 border-[#22D3EE] text-cyan-300'
                      : 'bg-[#121824] border-[#263142] text-slate-400'
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
                  <div className="text-sm font-medium text-slate-100">Master Volume</div>
                  <div className="text-xs text-slate-400">Combat impacts, spell audio, and vault cues.</div>
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
                    className="flex-1 accent-[#22D3EE] cursor-pointer"
                  />
                  <span className="w-10 text-right text-xs font-mono-tabular text-cyan-300">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#1A2230]">
                <div>
                  <div className="text-sm font-medium text-slate-100">Mute Audio</div>
                  <div className="text-xs text-slate-400">Silence all sound effects immediately.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ muted: !settings.muted })}
                  className={`px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    settings.muted
                      ? 'bg-red-500/15 border-red-400/60 text-red-300'
                      : 'bg-[#121824] border-[#263142] text-slate-300'
                  }`}
                >
                  {settings.muted ? 'Muted' : 'Active'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#1A2230]">
                <div>
                  <div className="text-sm font-medium text-slate-100">Combat Camera Shake</div>
                  <div className="text-xs text-slate-400">Impact trauma feedback on heavy strikes &amp; boss slams.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ screenShake: !settings.screenShake })}
                  className={`px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    settings.screenShake
                      ? 'bg-[#22D3EE]/15 border-[#22D3EE] text-cyan-300'
                      : 'bg-[#121824] border-[#263142] text-slate-400'
                  }`}
                >
                  {settings.screenShake ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#1A2230]">
                <div>
                  <div className="text-sm font-medium text-slate-100">Vault Minimap</div>
                  <div className="text-xs text-slate-400">Display dungeon layout indicator in the upper right HUD.</div>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ showMinimap: !settings.showMinimap })}
                  className={`px-4 py-1.5 text-xs font-medium rounded border transition-colors cursor-pointer ${
                    settings.showMinimap
                      ? 'bg-[#22D3EE]/15 border-[#22D3EE] text-cyan-300'
                      : 'bg-[#121824] border-[#263142] text-slate-400'
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
                ['W / A / S / D', 'Move Warden'],
                ['Mouse Cursor', 'Aim Runeblade & Spells'],
                ['Left Click', '3-Hit Melee Combo'],
                ['Q', 'Heavy Cleave Strike'],
                ['Right Click', 'Cast Rune Lance'],
                ['Space / Shift', 'Phase Step (I-Frames)'],
                ['E', 'Claim Relic / Enter Portal'],
                ['Esc / P', 'Pause Game'],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-[#121722] border border-[#1F2937] px-3.5 py-2.5 rounded"
                >
                  <span className="text-slate-300">{desc}</span>
                  <span className="font-mono-tabular text-cyan-300 font-semibold">{key}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E2736] bg-[#0A0D13]">
          <button
            type="button"
            onClick={() => onUpdate({ ...DEFAULT_GAME_SETTINGS })}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#22D3EE] text-[#07090C] text-xs font-semibold rounded hover:bg-[#38BDF8] transition-colors cursor-pointer"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
