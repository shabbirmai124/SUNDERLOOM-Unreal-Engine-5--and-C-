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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0C0A09]/84 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-modal-title"
        className="w-full max-w-md bg-[#151210] border border-[#45392C] p-7 shadow-[0_18px_52px_rgba(0,0,0,0.9)]"
      >
        <h2
          id="pause-modal-title"
          className="font-display text-2xl font-bold tracking-widest text-[#EAE3D5] mb-1"
        >
          PAUSED
        </h2>
        <p className="text-xs text-[#A69B8D] font-mono-tabular mb-6">
          Highest Floor {profile.highestFloorReached} · {profile.totalAetherThreads} Aether Threads Banked
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 px-4 bg-[#C89B54] text-[#0E0B0A] font-semibold text-sm rounded-sm hover:bg-[#DBA95F] transition-colors cursor-pointer"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 bg-[#1E1916] text-[#EAE3D5] border border-[#45392C] text-sm font-medium rounded-sm hover:border-[#C89B54] transition-colors cursor-pointer"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 px-4 bg-[#1E1916] text-[#D6CCBE] border border-[#3B3127] text-sm font-medium rounded-sm hover:border-[#C89B54] transition-colors cursor-pointer"
          >
            Restart Run
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2.5 px-4 text-[#A69B8D] text-sm hover:text-[#EAE3D5] transition-colors cursor-pointer"
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0B0908]/88 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-modal-title"
        className="w-full max-w-lg bg-[#151210] border border-[#4A3D2F] p-8 shadow-[0_22px_64px_rgba(0,0,0,0.94)]"
      >
        <h2
          id="summary-modal-title"
          className="font-display text-2xl font-bold tracking-widest text-[#EAE3D5]"
        >
          {summary.victory ? 'VAULT CONQUERED' : 'WARDEN FALLEN'}
        </h2>
        <p className="text-xs font-mono-tabular text-[#A69B8D] mt-1 mb-6">
          Vault Chronicle Saved · Floor {summary.floorReached}
        </p>

        <div className="grid grid-cols-3 gap-4 border-y border-[#2E261F] py-4 mb-6">
          <div>
            <div className="text-[11px] text-[#A69B8D]">Floor Reached</div>
            <div className="text-2xl font-bold font-mono-tabular text-[#EAE3D5] mt-1">
              {summary.floorReached}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#A69B8D]">Loomborn Slain</div>
            <div className="text-2xl font-bold font-mono-tabular text-[#EAE3D5] mt-1">
              {summary.enemiesSlain}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#A69B8D]">Aether Banked</div>
            <div className="text-2xl font-bold font-mono-tabular text-[#E0B46A] mt-1">
              +{summary.aetherEarned}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2.5">
            <span className="font-semibold text-[#EAE3D5]">Permanent Forge Traits</span>
            <span className="font-mono-tabular text-[#E0B46A]">
              {profile.totalAetherThreads} Aether Available
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={profile.totalAetherThreads < hpCost}
              onClick={() => onBuyPermanentUpgrade('health')}
              className="p-3 text-left bg-[#1C1714] border border-[#3E3328] rounded-sm hover:border-[#C89B54] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-[#EAE3D5]">
                Obsidian Vitality (Rank {profile.permanentHealthRank})
              </div>
              <div className="text-[11px] font-mono-tabular text-[#A69B8D] mt-1">
                +15 Base Max HP · Cost {hpCost}
              </div>
            </button>
            <button
              type="button"
              disabled={profile.totalAetherThreads < dmgCost}
              onClick={() => onBuyPermanentUpgrade('damage')}
              className="p-3 text-left bg-[#1C1714] border border-[#3E3328] rounded-sm hover:border-[#C89B54] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <div className="text-xs font-semibold text-[#EAE3D5]">
                Runic Tempering (Rank {profile.permanentDamageRank})
              </div>
              <div className="text-[11px] font-mono-tabular text-[#A69B8D] mt-1">
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
            className="flex-1 py-2.5 px-5 bg-[#C89B54] text-[#0E0B0A] font-semibold text-sm rounded-sm hover:bg-[#DBA95F] transition-colors cursor-pointer"
          >
            Start New Run
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="py-2.5 px-5 bg-[#1D1815] text-[#EAE3D5] border border-[#42362A] text-sm font-medium rounded-sm hover:border-[#C89B54] transition-colors cursor-pointer"
          >
            Title
          </button>
        </div>
      </div>
    </div>
  );
};
