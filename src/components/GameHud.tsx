import React, { useEffect, useRef } from 'react';
import type { HudSnapshot } from '../game/engine';
import type { GeneratedDungeon } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  dungeon: GeneratedDungeon;
  playerPos: { x: number; y: number };
  muted: boolean;
  showMinimap: boolean;
  floorBanner: { floor: number; seed: number } | null;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  dungeon,
  playerPos,
  muted,
  showMinimap,
  floorBanner,
  onToggleMute,
  onOpenSettings,
  onPause,
}) => {
  const trailRef = useRef<HTMLDivElement | null>(null);
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));

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
  const spanX = Math.max(1, maxX - minX + 400);
  const spanY = Math.max(1, maxY - minY + 400);
  const mapW = 148;
  const mapH = 112;
  const mapScale = Math.min((mapW - 16) / spanX, (mapH - 16) / spanY);
  const mapOffX = (mapW - spanX * mapScale) / 2 - (minX - 200) * mapScale;
  const mapOffY = (mapH - spanY * mapScale) / 2 - (minY - 200) * mapScale;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Top-Left Perimeter Cluster: Warden Vitality + Floor Record */}
      <div className="absolute top-5 left-5 flex flex-col gap-2.5 max-w-[440px]">
        <div className="flex items-baseline justify-between gap-4 w-[264px]">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold tracking-widest text-slate-400">HP</span>
            <span
              data-testid="hud-hp"
              className="text-2xl font-bold text-slate-100 hud-numeral font-mono-tabular leading-none"
            >
              {hud.hp}
            </span>
            <span className="text-xs text-slate-400 font-mono-tabular">/ {hud.maxHp}</span>
          </div>
          <span className="text-xs font-mono-tabular text-cyan-300 whitespace-nowrap">
            {hud.isInvulnerable ? 'PHASE I-FRAME' : hud.dodgeReadyRatio >= 0.99 ? 'STEP READY' : 'RECHARGING'}
          </span>
        </div>

        {/* Obsidian Vitality Bar with delayed chip-damage ghost bar */}
        <div className="w-[264px] h-3 bg-[#090B0E]/90 border border-[#2D384B] overflow-hidden relative shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
          <div
            ref={trailRef}
            className="absolute inset-y-0 left-0 bg-slate-200/75 transition-[width] duration-300"
            style={{ width: `${hpPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-[#DC2626] transition-[width] duration-100"
            style={{ width: `${hpPct}%` }}
          />
        </div>

        {/* Phase Step cooldown thin bar */}
        <div className="w-[180px] h-1.5 bg-[#090B0E]/90 border border-[#232D3D] overflow-hidden">
          <div
            className="h-full bg-[#22D3EE]"
            style={{ width: `${Math.round(hud.dodgeReadyRatio * 100)}%` }}
          />
        </div>

        {/* Clean unboxed single-line tabular run metadata */}
        <div className="flex items-center gap-2.5 text-xs font-mono-tabular text-slate-300 whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
          <span data-testid="hud-floor">Floor {hud.floor}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>Rooms {hud.roomsCleared}/{hud.totalCombatRooms}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="text-amber-400">{hud.aetherThreads} Aether</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>Relics {hud.relicCount}</span>
        </div>
      </div>

      {/* Top-Center: Floor Boss Health Bar (visible strictly during Boss encounter) */}
      {hud.bossName && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[min(460px,52vw)] flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-between w-full text-xs">
            <span className="font-display font-bold tracking-widest text-slate-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {hud.bossName}
            </span>
            <span className="font-mono-tabular text-amber-400">
              Phase {hud.bossPhase} · {hud.bossHp} / {hud.bossMaxHp}
            </span>
          </div>
          <div className="w-full h-3.5 bg-[#090B0E]/95 border border-[#7F1D1D] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            <div
              className="h-full bg-[#EF4444] transition-[width] duration-100"
              style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Top-Right Perimeter Cluster: Settings, Audio, Pause + Geometric Dungeon Minimap */}
      <div className="absolute top-5 right-5 flex flex-col items-end gap-2.5">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Settings"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenSettings();
            }}
            className="w-9 h-9 flex items-center justify-center bg-[#0E131B]/92 border border-[#263142] text-slate-200 hover:border-[#22D3EE] hover:text-white rounded transition-colors cursor-pointer"
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
            className="w-9 h-9 flex items-center justify-center bg-[#0E131B]/92 border border-[#263142] text-slate-200 hover:border-[#22D3EE] rounded transition-colors cursor-pointer"
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
            className="w-9 h-9 flex items-center justify-center bg-[#0E131B]/92 border border-[#263142] text-slate-200 hover:border-[#22D3EE] rounded transition-colors cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>
          </button>
        </div>

        {/* Live Stitched Dungeon Minimap */}
        {showMinimap && (
          <div className="bg-[#090C11]/92 border border-[#243040] p-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.75)]">
            <svg width={mapW} height={mapH} viewBox={`0 0 ${mapW} ${mapH}`} aria-label="Dungeon minimap">
              {dungeon.rooms.map((r) => {
                const rx = r.x * mapScale + mapOffX;
                const ry = r.y * mapScale + mapOffY;
                const rw = Math.max(4, r.width * mapScale);
                const rh = Math.max(4, r.height * mapScale);
                const fill =
                  r.type === 'Boss'
                    ? '#451A1F'
                    : r.type === 'Treasure'
                      ? '#3D2E12'
                      : r.state === 'Cleared'
                        ? '#1B2736'
                        : '#121822';
                const stroke =
                  r.type === 'Boss'
                    ? '#EF4444'
                    : r.type === 'Treasure'
                      ? '#F59E0B'
                      : r.runicGatesLocked
                        ? '#22D3EE'
                        : '#334155';
                return (
                  <rect
                    key={r.id}
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1.2}
                  />
                );
              })}
              {/* Live Warden position */}
              <circle
                cx={playerPos.x * mapScale + mapOffX}
                cy={playerPos.y * mapScale + mapOffY}
                r={3.2}
                fill="#22D3EE"
              />
            </svg>
            <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-400 mt-1 px-0.5">
              <span>Floor {hud.floor}</span>
              <span>{hud.activeRoomLocked ? 'LOCKED' : hud.activeRoomType}</span>
            </div>
          </div>
        )}
      </div>

      {/* Contextual Bottom-Center Interaction Plaque (Upgrade Pedestal or Descent Portal) */}
      {hud.promptText && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0B0F16]/95 border border-[#22D3EE]/70 px-5 py-2.5 text-center shadow-[0_6px_20px_rgba(0,0,0,0.85)]">
          <div className="text-sm font-semibold text-slate-100">{hud.promptText}</div>
          {hud.promptSubtext && (
            <div className="text-xs font-mono-tabular text-amber-300 mt-0.5">{hud.promptSubtext}</div>
          )}
        </div>
      )}

      {/* Brief Floor Transition Banner */}
      {floorBanner && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center">
          <div className="font-display text-2xl font-bold tracking-[0.25em] text-slate-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            FLOOR {floorBanner.floor}
          </div>
          <div className="text-xs font-mono-tabular text-slate-400 mt-1">
            The Obsidian Weave · Seed {floorBanner.seed}
          </div>
        </div>
      )}
    </div>
  );
};
