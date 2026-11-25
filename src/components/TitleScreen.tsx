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
      {/* Subtle dark atmospheric gradient on left side only so live 3D Warden & Sanctuary shine unobstructed */}
      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 w-[52vw] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(6,8,13,0.86) 0%, rgba(6,8,13,0.52) 58%, rgba(6,8,13,0) 100%)',
        }}
      />

      {/* Top quiet Warden vault record — clean unboxed typography */}
      <div className="relative flex items-center justify-end text-xs text-slate-300 font-mono-tabular drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
        <div className="flex items-center gap-4">
          <span>Highest Floor {profile.highestFloorReached}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="text-amber-400">{profile.totalAetherThreads} Aether Threads</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span>{profile.totalBossesSlain} Bosses Slain</span>
        </div>
      </div>

      {/* Left-third negative space AAA Game Title Lockup + Pure Game Actions */}
      <div className="relative max-w-xl pointer-events-auto my-auto">
        <svg
          viewBox="0 0 540 126"
          className="w-full max-w-[460px] h-auto mb-4 drop-shadow-[0_6px_18px_rgba(0,0,0,0.9)]"
          role="img"
          aria-label="SUNDERLOOM: The Shifting Vault"
        >
          {/* Forged obsidian runic crest */}
          <g transform="translate(36, 56)">
            <polygon
              points="0,-34 28,-16 28,16 0,34 -28,16 -28,-16"
              fill="#0E131D"
              stroke="#22D3EE"
              strokeWidth="2.2"
            />
            <polygon
              points="0,-20 14,0 0,20 -14,0"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.8"
            />
            <circle cx="0" cy="0" r="4" fill="#22D3EE" />
          </g>
          {/* Monumental title typography */}
          <text
            x="84"
            y="64"
            fill="#F8FAFC"
            fontFamily="Cinzel, Georgia, serif"
            fontSize="46"
            fontWeight="700"
            letterSpacing="5"
          >
            SUNDERLOOM
          </text>
          <line x1="86" y1="78" x2="494" y2="78" stroke="#334155" strokeWidth="1.5" />
          <line x1="86" y1="78" x2="196" y2="78" stroke="#22D3EE" strokeWidth="2.2" />
          <text
            x="86"
            y="102"
            fill="#CBD5E1"
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
            className="px-8 py-3.5 bg-[#22D3EE] text-[#06080D] font-semibold text-sm tracking-wider uppercase rounded hover:bg-[#38BDF8] shadow-[0_6px_24px_rgba(34,211,238,0.28)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22D3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Enter the Vault
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-6 py-3.5 bg-[#0F141E]/92 text-[#E6EBF2] border border-[#2C394E] font-medium text-sm tracking-wide rounded hover:border-[#22D3EE]/70 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22D3EE] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Bottom borderless single-line control hint */}
      <div className="relative text-xs text-slate-300 font-mono-tabular tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
        WASD Move · Mouse Aim · LMB 3-Hit Combo · RMB Rune Lance · Space Phase Step · E Interact · Esc Pause
      </div>
    </div>
  );
};
