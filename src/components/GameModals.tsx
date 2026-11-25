import React from 'react';
import type { FRunSummarySnapshot, FSaveProfile } from '../game/types';

interface PauseModalProps {
  profile: FSaveProfile;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  profile,
  onResume,
  onRestart,
  onOpenSettings,
  onReturnTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#07090C]/82 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
        className="w-full max-w-md bg-[#0E131B] border border-[#263142] p-7 shadow-[0_16px_48px_rgba(0,0,0,0.85)]"
      >
        <h2
          id="pause-modal-title"
          className="font-display text-2xl font-bold tracking-widest text-slate-100 mb-1"
        >
          PAUSED
        </h2>
        <p className="text-xs text-slate-400 font-mono-tabular mb-6">
          Highest Floor {profile.highestFloorReached} · {profile.totalAetherThreads} Aether Threads Banked
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 px-4 bg-[#22D3EE] text-[#07090C] font-semibold text-sm rounded hover:bg-[#38BDF8] transition-colors cursor-pointer"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 bg-[#161D29] text-slate-100 border border-[#2A3649] text-sm font-medium rounded hover:border-[#22D3EE]/70 transition-colors cursor-pointer"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 bg-[#161D29] text-slate-200 border border-[#2A3649] text-sm font-medium rounded hover:border-[#22D3EE]/70 transition-colors cursor-pointer"
          >
            Restart Run
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 px-4 text-slate-400 text-sm hover:text-slate-100 transition-colors cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};

interface RunSummaryModalProps {
  summary: FRunSummarySnapshot;
  profile: FSaveProfile;
  onStartNewRun: () => void;
  onBuyPermanentUpgrade: (kind: 'health' | 'damage') => void;
  onReturnTitle: () => void;
}

export const RunSummaryModal: React.FC<RunSummaryModalProps> = ({
  summary,
  profile,
  onStartNewRun,
  onBuyPermanentUpgrade,
  onReturnTitle,
}) => {
  const hpCost = 40 + profile.permanentHealthRank * 35;
  const dmgCost = 50 + profile.permanentDamageRank * 40;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#07090C]/86 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-modal-title"
        className="w-full max-w-lg bg-[#0E131B] border border-[#2D384B] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
      >
        <h2
          id="summary-modal-title"
          className="font-display text-2xl font-bold tracking-widest text-slate-100"
        >
          {summary.victory ? 'VAULT CONQUERED' : 'WARDEN FALLEN'}
        </h2>
        <p className="text-xs font-mono-tabular text-slate-400 mt-1 mb-6">
          Run Seed {summary.seed} · Profile Saved Asynchronously
        </p>

        {/* 3 Tabular Run Metrics */}
        <div className="grid grid-cols-3 gap-4 border-y border-[#1F2937] py-4 mb-6">
          <div>
            <div className="text-[11px] text-slate-400">Floor Reached</div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-100 mt-1">
              {summary.floorReached}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Loomborn Slain</div>
            <div className="text-2xl font-bold font-mono-tabular text-slate-100 mt-1">
              {summary.enemiesSlain}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Aether Banked</div>
            <div className="text-2xl font-bold font-mono-tabular text-amber-400 mt-1">
              +{summary.aetherEarned}
            </div>
          </div>
        </div>

        {/* Permanent Meta-Progression Forge Spend */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2.5">
            <span className="font-semibold text-slate-200">Permanent Forge Traits</span>
            <span className="font-mono-tabular text-amber-400">
              {profile.totalAetherThreads} Aether Available
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={profile.totalAetherThreads < hpCost}
              onClick={() => onBuyPermanentUpgrade('health')}
              className="p-3 text-left bg-[#131924] border border-[#263142] rounded hover:border-[#22D3EE]/70 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-slate-100">
                Obsidian Vitality (Rank {profile.permanentHealthRank})
              </div>
              <div className="text-[11px] font-mono-tabular text-slate-400 mt-1">
                +15 Base Max HP · Cost {hpCost}
              </div>
            </button>
            <button
              type="button"
              disabled={profile.totalAetherThreads < dmgCost}
              onClick={() => onBuyPermanentUpgrade('damage')}
              className="p-3 text-left bg-[#131924] border border-[#263142] rounded hover:border-[#22D3EE]/70 disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-slate-100">
                Runic Tempering (Rank {profile.permanentDamageRank})
              </div>
              <div className="text-[11px] font-mono-tabular text-slate-400 mt-1">
                +3 Melee / +2 Ranged · Cost {dmgCost}
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStartNewRun}
            className="flex-1 py-2.5 px-5 bg-[#22D3EE] text-[#07090C] font-semibold text-sm rounded hover:bg-[#38BDF8] transition-colors cursor-pointer"
          >
            Start New Run
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="py-2.5 px-5 bg-[#161D29] text-slate-200 border border-[#263142] text-sm font-medium rounded hover:border-slate-500 transition-colors cursor-pointer"
          >
            Title
          </button>
        </div>
      </div>
    </div>
  );
};
