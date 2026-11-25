import React from 'react';
import type { FSaveProfile } from '../game/types';

interface TitleScreenProps {
  profile: FSaveProfile;
  onStartPlay: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  profile,
  onStartPlay,
  onOpenSettings,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-8 md:p-14 pointer-events-none select-none">
      {/* Warm charred-basalt vignette on left flank only so the live 3D Warden & Forge shine */}
      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 w-[52vw] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(12,10,9,0.88) 0%, rgba(12,10,9,0.52) 56%, rgba(12,10,9,0) 100%)',
        }}
      />

      {/* Top quiet Warden vault record — bone ivory & antique gold */}
      <div className="relative flex items-center justify-end text-xs text-[#C5B9A7] font-mono-tabular drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
        <div className="flex items-center gap-4">
          <span>Highest Floor {profile.highestFloorReached}</span>
          <span aria-hidden="true" className="text-[#6E6254]">·</span>
          <span className="text-[#E0B46A]">{profile.totalAetherThreads} Aether Threads</span>
          <span aria-hidden="true" className="text-[#6E6254]">·</span>
          <span>{profile.totalBossesSlain} Bosses Slain</span>
        </div>
      </div>

      {/* Left-third negative space AAA Dark-Fantasy Title Lockup */}
      <div className="relative max-w-xl pointer-events-auto my-auto">
        <svg
          viewBox="0 0 540 126"
          className="w-full max-w-[465px] h-auto mb-4 drop-shadow-[0_8px_22px_rgba(0,0,0,0.95)]"
          role="img"
          aria-label="SUNDERLOOM: The Shifting Vault"
        >
          {/* Forged iron & tarnished gold sigil crest */}
          <g transform="translate(36, 56)">
            <polygon
              points="0,-34 28,-16 28,16 0,34 -28,16 -28,-16"
              fill="#171311"
              stroke="#C89B54"
              strokeWidth="2.2"
            />
            <polygon
              points="0,-20 14,0 0,20 -14,0"
              fill="none"
              stroke="#D96B27"
              strokeWidth="1.8"
            />
            <circle cx="0" cy="0" r="4" fill="#E0B46A" />
          </g>
          <text
            x="84"
            y="64"
            fill="#EAE3D5"
            fontFamily="Cinzel, Georgia, serif"
            fontSize="46"
            fontWeight="700"
            letterSpacing="5"
          >
            SUNDERLOOM
          </text>
          <line x1="86" y1="78" x2="494" y2="78" stroke="#3B3127" strokeWidth="1.5" />
          <line x1="86" y1="78" x2="210" y2="78" stroke="#C89B54" strokeWidth="2.2" />
          <text
            x="86"
            y="102"
            fill="#B5A998"
            fontFamily="Manrope, sans-serif"
            fontSize="14"
            fontWeight="500"
            letterSpacing="4.5"
          >
            THE SHIFTING VAULT
          </text>
        </svg>

        <div className="flex flex-wrap items-center gap-3.5 mt-9">
          <button
            type="button"
            data-start="true"
            onClick={onStartPlay}
            className="px-8 py-3.5 bg-[#C89B54] text-[#0E0B0A] font-semibold text-sm tracking-wider uppercase rounded-sm hover:bg-[#DBA95F] border border-[#E7C280]/50 shadow-[0_6px_22px_rgba(200,155,84,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0B46A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Enter the Vault
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-6 py-3.5 bg-[#181412]/92 text-[#EAE3D5] border border-[#45392C] font-medium text-sm tracking-wide rounded-sm hover:border-[#C89B54] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B54] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Bottom borderless single-line control hint */}
      <div className="relative text-xs text-[#B5A998] font-mono-tabular tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
        WASD Move · LMB Sword Slash · RMB Shoot · R Super Nova · Space Phase Step · V Camera · Tab Map · E Interact
      </div>
    </div>
  );
};
