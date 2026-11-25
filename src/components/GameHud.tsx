import React, { useEffect, useRef } from 'react';
import type { HudSnapshot } from '../game/engine';
import type { CameraPreset } from '../game/settings';
import type { GeneratedDungeon } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  dungeon: GeneratedDungeon;
  playerPos: { x: number; y: number };
  cameraPreset: CameraPreset;
  muted: boolean;
  showMinimap: boolean;
  mapExpanded: boolean;
  floorBanner: { floor: number; seed: number } | null;
  onCycleCamera: () => void;
  onToggleMapExpanded: () => void;
  onTriggerSuper: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  dungeon,
  playerPos,
  cameraPreset,
  muted,
  showMinimap,
  mapExpanded,
  floorBanner,
  onCycleCamera,
  onToggleMapExpanded,
  onTriggerSuper,
  onToggleMute,
  onOpenSettings,
  onPause,
}) => {
  const trailRef = useRef<HTMLDivElement | null>(null);
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const superReady = hud.superCharge >= 100;

  useEffect(() => {
    const el = trailRef.current;
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.style.width = `${hpPct}%`;
    }, 180);
    return () => window.clearTimeout(timer);
  }, [hpPct]);

  // Compute minimap viewport transform
  const { minX, minY, maxX, maxY } = dungeon.bounds;
  const spanX = Math.max(1, maxX - minX + 500);
  const spanY = Math.max(1, maxY - minY + 500);

  const renderVaultMapSvg = (mapW: number, mapH: number) => {
    const mapScale = Math.min((mapW - 20) / spanX, (mapH - 20) / spanY);
    const mapOffX = (mapW - spanX * mapScale) / 2 - (minX - 250) * mapScale;
    const mapOffY = (mapH - spanY * mapScale) / 2 - (minY - 250) * mapScale;

    return (
      <svg width={mapW} height={mapH} viewBox={`0 0 ${mapW} ${mapH}`} aria-label="Dungeon map">
        {dungeon.rooms.map((r) => {
          const rx = r.x * mapScale + mapOffX;
          const ry = r.y * mapScale + mapOffY;
          const rw = Math.max(4, r.width * mapScale);
          const rh = Math.max(4, r.height * mapScale);
          const fill =
            r.type === 'Boss'
              ? '#4A1917'
              : r.type === 'Treasure'
                ? '#453219'
                : r.state === 'Cleared'
                  ? '#28221D'
                  : '#181412';
          const stroke =
            r.type === 'Boss'
              ? '#C4342D'
              : r.type === 'Treasure'
                ? '#E0B46A'
                : r.runicGatesLocked
                  ? '#D96B27'
                  : '#574A3D';
          return (
            <rect
              key={r.id}
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              fill={fill}
              stroke={stroke}
              strokeWidth={mapW > 220 ? 1.8 : 1.15}
            />
          );
        })}
        <circle
          cx={playerPos.x * mapScale + mapOffX}
          cy={playerPos.y * mapScale + mapOffY}
          r={mapW > 220 ? 5.2 : 3.4}
          fill="#EAE3D5"
          stroke="#D96B27"
          strokeWidth={1.5}
        />
      </svg>
    );
  };

  const viewLabel =
    cameraPreset === 'ThirdPerson'
      ? '3rd Person'
      : cameraPreset === 'FirstPerson'
        ? 'FPS'
        : cameraPreset === 'TopDown'
          ? 'Top-Down'
          : 'Cinematic';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Crisp Minimal Tactical FPS Crosshair (Valorant-style) exclusively in First-Person View */}
      {cameraPreset === 'FirstPerson' && !mapExpanded && (
        <div
          aria-hidden="true"
          data-testid="fps-crosshair"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <line x1="13" y1="3" x2="13" y2="9" stroke="#EAE3D5" strokeWidth="1.8" />
            <line x1="13" y1="17" x2="13" y2="23" stroke="#EAE3D5" strokeWidth="1.8" />
            <line x1="3" y1="13" x2="9" y2="13" stroke="#EAE3D5" strokeWidth="1.8" />
            <line x1="17" y1="13" x2="23" y2="13" stroke="#EAE3D5" strokeWidth="1.8" />
            <circle cx="13" cy="13" r="1.4" fill="#E0B46A" />
          </svg>
        </div>
      )}
      {/* Top-Left Perimeter Cluster: Warden Vitality + Phase Step + Sunder Nova Super + Floor Record */}
      <div className="absolute top-5 left-5 flex flex-col gap-2 max-w-[460px]">
        <div className="flex items-baseline justify-between gap-4 w-[276px]">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold tracking-widest text-[#A69B8D]">HP</span>
            <span
              data-testid="hud-hp"
              className="text-2xl font-bold text-[#EAE3D5] hud-numeral font-mono-tabular leading-none"
            >
              {hud.hp}
            </span>
            <span className="text-xs text-[#A69B8D] font-mono-tabular">/ {hud.maxHp}</span>
          </div>
          <span className="text-[11px] font-mono-tabular text-[#E0B46A] whitespace-nowrap">
            {hud.isInvulnerable ? 'PHASE WARD' : hud.dodgeReadyRatio >= 0.99 ? 'STEP READY' : 'RECHARGING'}
          </span>
        </div>

        {/* Blood-Crimson Vitality Bar with bone-ivory delayed chip-damage bar */}
        <div className="w-[276px] h-3 bg-[#120F0D]/92 border border-[#473B2F] overflow-hidden relative shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <div
            ref={trailRef}
            className="absolute inset-y-0 left-0 bg-[#EAE3D5]/75 transition-[width] duration-300"
            style={{ width: `${hpPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-[#B82C26] transition-[width] duration-100"
            style={{ width: `${hpPct}%` }}
          />
        </div>

        {/* Twin Compact Gauges: Phase Step Cooldown + Sunder Nova Super */}
        <div className="flex items-center gap-2.5 w-[276px]">
          <div className="flex-1 h-1.5 bg-[#120F0D]/92 border border-[#382E25] overflow-hidden">
            <div
              className="h-full bg-[#C89B54]"
              style={{ width: `${Math.round(hud.dodgeReadyRatio * 100)}%` }}
            />
          </div>
          <button
            type="button"
            tabIndex={-1}
            disabled={!superReady}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerSuper();
            }}
            className={`pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono-tabular border rounded-sm transition-colors ${
              superReady
                ? 'bg-[#C89B54] text-[#0E0B0A] border-[#F0CF8E] font-bold cursor-pointer'
                : 'bg-[#14110F]/90 text-[#A69B8D] border-[#382E25] cursor-default'
            }`}
          >
            <span>{superReady ? 'R · NOVA READY' : `NOVA ${hud.superCharge}%`}</span>
          </button>
        </div>

        {/* Clean unboxed single-line tabular run metadata */}
        <div className="flex items-center gap-2.5 text-xs font-mono-tabular text-[#D6CCBE] whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
          <span data-testid="hud-floor">Floor {hud.floor}</span>
          <span aria-hidden="true" className="text-[#6E6254]">·</span>
          <span>Rooms {hud.roomsCleared}/{hud.totalCombatRooms}</span>
          <span aria-hidden="true" className="text-[#6E6254]">·</span>
          <span className="text-[#E0B46A]">{hud.aetherThreads} Aether</span>
          <span aria-hidden="true" className="text-[#6E6254]">·</span>
          <span>Relics {hud.relicCount}</span>
        </div>
      </div>

      {/* Top-Center: Floor Boss Health Bar (visible strictly during Boss encounter) */}
      {hud.bossName && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[min(460px,52vw)] flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-between w-full text-xs">
            <span className="font-display font-bold tracking-widest text-[#EAE3D5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {hud.bossName}
            </span>
            <span className="font-mono-tabular text-[#E0B46A]">
              Phase {hud.bossPhase} · {hud.bossHp} / {hud.bossMaxHp}
            </span>
          </div>
          <div className="w-full h-3.5 bg-[#110D0C]/95 border border-[#6E2622] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            <div
              className="h-full bg-[#B82C26] transition-[width] duration-100"
              style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Top-Right Perimeter Cluster: Camera View Toggle (V), Settings, Audio, Pause + Clickable Minimap */}
      <div className="absolute top-5 right-5 flex flex-col items-end gap-2.5">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Switch Camera View"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCamera();
            }}
            className="h-9 px-3 bg-[#151210]/92 border border-[#42362A] text-xs font-medium text-[#EAE3D5] hover:border-[#C89B54] hover:text-white rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            View: {viewLabel} (V)
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Settings"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="w-9 h-9 flex items-center justify-center bg-[#151210]/92 border border-[#42362A] text-[#EAE3D5] hover:border-[#C89B54] hover:text-white rounded-sm transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-9 h-9 flex items-center justify-center bg-[#151210]/92 border border-[#42362A] text-[#EAE3D5] hover:border-[#C89B54] rounded-sm transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              {muted ? (
                <>
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              ) : (
                <>
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </>
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause game"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="w-9 h-9 flex items-center justify-center bg-[#151210]/92 border border-[#42362A] text-[#EAE3D5] hover:border-[#C89B54] rounded-sm transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </button>
        </div>

        {/* Clickable Live Stitched Dungeon Minimap */}
        {showMinimap && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle Full Dungeon Map"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMapExpanded();
            }}
            className="pointer-events-auto bg-[#110E0C]/92 border border-[#3E3328] hover:border-[#C89B54] p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.8)] transition-colors cursor-pointer text-left"
          >
            {renderVaultMapSvg(164, 124)}
            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-[#A69B8D] mt-1 px-0.5">
              <span>Tab · {dungeon.rooms.length} Rooms</span>
              <span className="text-[#E0B46A]">{hud.activeRoomLocked ? 'LOCKED' : hud.activeRoomType}</span>
            </div>
          </button>
        )}
      </div>

      {/* Expanded Full-Vault Map Overlay (Tab or Click Minimap) */}
      {mapExpanded && (
        <div className="fixed inset-0 z-25 flex items-center justify-center bg-[#0C0A09]/82 pointer-events-auto p-6">
          <div className="bg-[#14110F] border border-[#4B3D2E] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.92)] flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <div>
                <div className="font-display text-lg font-bold tracking-[0.2em] text-[#EAE3D5]">
                  THE SHIFTING VAULT · FLOOR {hud.floor}
                </div>
                <div className="text-xs font-mono-tabular text-[#A69B8D]">
                  {dungeon.rooms.length} Interconnected Chambers · Press Tab to Close
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleMapExpanded}
                className="px-3 py-1.5 bg-[#211B17] border border-[#4B3D2E] text-xs text-[#EAE3D5] hover:border-[#C89B54] rounded-sm cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="bg-[#0D0B0A] border border-[#2F261E] p-3">
              {renderVaultMapSvg(540, 380)}
            </div>
            <div className="flex items-center gap-6 text-xs font-mono-tabular text-[#B5A998] mt-3">
              <span>Ivory Dot: Warden</span>
              <span className="text-[#E0B46A]">Gold: Treasure Reliquary</span>
              <span className="text-[#C4342D]">Crimson: Boss Citadel</span>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Bottom-Center Interaction Plaque (Upgrade Pedestal or Descent Portal) */}
      {hud.promptText && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#14100E]/95 border border-[#C89B54]/80 px-5 py-2.5 text-center shadow-[0_6px_22px_rgba(0,0,0,0.9)]">
          <div className="text-sm font-semibold text-[#EAE3D5]">{hud.promptText}</div>
          {hud.promptSubtext && (
            <div className="text-xs font-mono-tabular text-[#E0B46A] mt-0.5">{hud.promptSubtext}</div>
          )}
        </div>
      )}

      {/* Brief Floor Transition Banner */}
      {floorBanner && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center">
          <div className="font-display text-2xl font-bold tracking-[0.25em] text-[#EAE3D5] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            FLOOR {floorBanner.floor}
          </div>
          <div className="text-xs font-mono-tabular text-[#C89B54] mt-1">
            The Obsidian Weave · {dungeon.rooms.length} Chambers
          </div>
        </div>
      )}
    </div>
  );
};
