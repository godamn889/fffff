import React, { useEffect } from 'react';
import { RankData } from '../game/types';
import { TIER_CONFIG, getRankProgress } from '../game/ranked';
import { sound } from '../game/audio';
import { Volume2, VolumeX, Trophy, Shield, Play, HelpCircle } from 'lucide-react';

interface TitleScreenProps {
  rankData: RankData;
  onStartGame: () => void;
  onOpenRanked: () => void;
  onOpenHelp: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  rankData,
  onStartGame,
  onOpenRanked,
  onOpenHelp,
  isMuted,
  onToggleMute,
}) => {
  const tierCfg = TIER_CONFIG[rankData.tier];
  const progress = getRankProgress(rankData.ratingPoints);

  // Keyboard shortcut: Enter or Space to immediately start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 md:p-10 pointer-events-auto bg-stone-950/85">
      {/* Top Bar: Title & Utility controls */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/20 border border-amber-500/50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <span className="font-pixel text-xs text-amber-400 tracking-wider">SEASON 1 RANKED ARENA</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playButton();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2.5 rounded bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/50 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Hero Centerpiece: Bespoke SVG Title Lockup & Emblem */}
      <div className="flex flex-col items-center justify-center text-center my-auto max-w-3xl mx-auto">
        {/* Custom SVG Title Emblem */}
        <div className="mb-4 relative">
          <svg className="w-64 h-24 md:w-80 md:h-28" viewBox="0 0 320 100" fill="none">
            {/* Outer decorative pixel wings */}
            <path d="M10 50 L40 20 L60 30 L45 55 L70 55 L40 85 Z" fill="#38bdf8" fillOpacity="0.8" />
            <path d="M310 50 L280 20 L260 30 L275 55 L250 55 L280 85 Z" fill="#ef4444" fillOpacity="0.8" />
            {/* Center Crown / Shield Emblem */}
            <polygon points="160,10 190,30 180,65 160,85 140,65 130,30" fill="#f59e0b" stroke="#78350f" strokeWidth="3" />
            <circle cx="160" cy="45" r="10" fill="#fef08a" />
            {/* Crossed Greatswords silhouette */}
            <line x1="120" y1="20" x2="200" y2="80" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
            <line x1="200" y1="20" x2="120" y2="80" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Title Text */}
        <h1 className="font-pixel text-2xl sm:text-4xl md:text-5xl tracking-tight text-white mb-3 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
          PIXEL ARENA
        </h1>
        <div className="font-retro text-amber-400 text-sm sm:text-lg md:text-xl tracking-widest uppercase mb-6 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-amber-500"></span>
          <span>Ranked Champions 1v1 · 2v2 · 3v3</span>
          <span className="w-6 h-0.5 bg-amber-500"></span>
        </div>

        {/* Player Rank Badge Tile */}
        <div className="inline-flex items-center gap-4 px-5 py-2.5 rounded-lg bg-stone-900/90 border border-stone-800 shadow-xl mb-8">
          <div
            className="w-10 h-10 rounded-md border flex items-center justify-center font-pixel text-xs font-bold shadow-inner"
            style={{
              borderColor: tierCfg.color,
              backgroundColor: `${tierCfg.color}22`,
              color: tierCfg.color,
            }}
          >
            {rankData.tier[0]}
            {rankData.tier !== 'Master' && rankData.tier !== 'Grandmaster' ? rankData.division : ''}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-pixel text-xs font-bold" style={{ color: tierCfg.color }}>
                {rankData.tier} {rankData.tier !== 'Master' && rankData.tier !== 'Grandmaster' ? rankData.division : ''}
              </span>
              <span className="text-xs text-stone-400 font-mono tabular-nums">{rankData.ratingPoints} RP</span>
            </div>
            {/* Progress bar to next rank */}
            <div className="w-40 h-1.5 bg-stone-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress.percent}%`, backgroundColor: tierCfg.color }}
              />
            </div>
          </div>
          <div className="pl-3 border-l border-stone-800 text-xs text-stone-400 font-mono">
            {rankData.wins}W - {rankData.losses}L
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            data-start="true"
            onClick={() => {
              sound.playButton();
              onStartGame();
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-pixel text-sm sm:text-base tracking-wide font-bold shadow-lg shadow-amber-500/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>PLAY RANKED ARENA</span>
          </button>

          <button
            onClick={() => {
              sound.playButton();
              onOpenRanked();
            }}
            className="w-full sm:w-auto px-6 py-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700/80 font-pixel text-xs tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>RANK LADDER</span>
          </button>

          <button
            onClick={() => {
              sound.playButton();
              onOpenHelp();
            }}
            className="w-full sm:w-auto px-4 py-4 rounded-lg bg-stone-900/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="View Controls and Rules"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Flat Control Hints Footer (< 15% footprint) */}
      <div className="w-full text-center">
        <p className="font-mono text-xs text-stone-400 tracking-wide">
          WASD Move · Click Attack · Space Skill 1 · E Skill 2 · Esc Pause · F/C/V Team Pings
        </p>
      </div>
    </div>
  );
};
