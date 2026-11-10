import React, { useState } from 'react';
import { RankData } from '../game/types';
import { INITIAL_RIVALS, TIER_CONFIG } from '../game/ranked';
import { CLASSES } from '../game/classes';
import { sound } from '../game/audio';
import { X, Trophy, Swords, History, Award, Shield } from 'lucide-react';

interface RankedModalProps {
  rankData: RankData;
  onClose: () => void;
}

export const RankedModal: React.FC<RankedModalProps> = ({ rankData, onClose }) => {
  const [tab, setTab] = useState<'ladder' | 'history' | 'classes'>('ladder');

  const totalMatches = rankData.wins + rankData.losses;
  const winRate = totalMatches > 0 ? Math.round((rankData.wins / totalMatches) * 100) : 0;
  const tierCfg = TIER_CONFIG[rankData.tier];

  // Build combined ladder including player
  const playerGladiator = {
    id: 'player',
    name: 'YOU (Champion)',
    title: `${rankData.tier} Contender`,
    tier: rankData.tier,
    rating: rankData.ratingPoints,
    preferredClass: 'knight' as const,
    isPlayer: true,
  };

  const combinedLadder = [...INITIAL_RIVALS, playerGladiator].sort((a, b) => b.rating - a.rating);
  const playerRankIndex = combinedLadder.findIndex((c) => 'isPlayer' in c && c.isPlayer) + 1;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-stone-950/85 pointer-events-auto overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 p-5 sm:p-7 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col gap-4 my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-pixel text-sm sm:text-base text-white tracking-wider">
              COMPETITIVE RANKED ARENA
            </h2>
          </div>
          <button
            onClick={() => {
              sound.playButton();
              onClose();
            }}
            className="p-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Ranked Ladder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Profile Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs bg-stone-950/80 p-3 rounded-lg border border-stone-800">
          <div className="flex flex-col">
            <span className="text-stone-400 text-[10px]">CURRENT RANK</span>
            <span className="font-pixel text-xs font-bold" style={{ color: tierCfg.color }}>
              {rankData.tier} {rankData.tier !== 'Master' && rankData.tier !== 'Grandmaster' ? rankData.division : ''}
            </span>
            <span className="text-[10px] text-stone-400 tabular-nums">{rankData.ratingPoints} RP</span>
          </div>

          <div className="flex flex-col">
            <span className="text-stone-400 text-[10px]">LADDER RANKING</span>
            <span className="font-pixel text-xs text-amber-400">#{playerRankIndex}</span>
            <span className="text-[10px] text-stone-400">of {combinedLadder.length} Gladiators</span>
          </div>

          <div className="flex flex-col">
            <span className="text-stone-400 text-[10px]">WIN RATE</span>
            <span className="font-pixel text-xs text-emerald-400">{winRate}%</span>
            <span className="text-[10px] text-stone-400 tabular-nums">{rankData.wins}W - {rankData.losses}L</span>
          </div>

          <div className="flex flex-col">
            <span className="text-stone-400 text-[10px]">CURRENT STREAK</span>
            <span className="font-pixel text-xs text-amber-300">
              {rankData.winStreak > 0 ? `+${rankData.winStreak} WINS` : '0'}
            </span>
            <span className="text-[10px] text-stone-400">Peak: {rankData.bestTier}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
          <button
            onClick={() => {
              sound.playButton();
              setTab('ladder');
            }}
            className={`px-3 py-1.5 rounded font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'ladder'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>SEASON LADDER</span>
          </button>

          <button
            onClick={() => {
              sound.playButton();
              setTab('history');
            }}
            className={`px-3 py-1.5 rounded font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'history'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>MATCH HISTORY</span>
          </button>

          <button
            onClick={() => {
              sound.playButton();
              setTab('classes');
            }}
            className={`px-3 py-1.5 rounded font-pixel text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'classes'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>CLASS MASTERY</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-80 pr-1">
          {tab === 'ladder' && (
            <div className="flex flex-col gap-1.5">
              {combinedLadder.map((gladiator, index) => {
                const rankNum = index + 1;
                const isPlayer = 'isPlayer' in gladiator && gladiator.isPlayer;
                const gTierCfg = TIER_CONFIG[gladiator.tier];

                return (
                  <div
                    key={gladiator.id}
                    className={`flex items-center justify-between p-2.5 rounded border font-mono text-xs ${
                      isPlayer
                        ? 'bg-amber-500/15 border-amber-400/80 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                        : 'bg-stone-950/60 border-stone-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-pixel text-[11px] w-6 text-center tabular-nums ${
                          rankNum === 1
                            ? 'text-amber-400 font-bold'
                            : rankNum === 2
                            ? 'text-slate-300'
                            : rankNum === 3
                            ? 'text-amber-600'
                            : 'text-stone-400'
                        }`}
                      >
                        {rankNum}
                      </span>
                      <div
                        className="w-7 h-7 rounded border flex items-center justify-center font-pixel text-[9px]"
                        style={{
                          borderColor: gTierCfg.color,
                          backgroundColor: `${gTierCfg.color}15`,
                          color: gTierCfg.color,
                        }}
                      >
                        {gladiator.tier[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-pixel text-[10px] ${isPlayer ? 'text-amber-300 font-bold' : 'text-stone-200'}`}>
                            {gladiator.name}
                          </span>
                          {isPlayer && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-stone-950 font-pixel text-[8px]">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400">{gladiator.title}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-pixel text-xs text-white tabular-nums">{gladiator.rating} RP</span>
                      <span className="block text-[10px]" style={{ color: gTierCfg.color }}>
                        {gladiator.tier}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'history' && (
            <div className="flex flex-col gap-2">
              {rankData.history.length === 0 ? (
                <div className="text-center py-10 text-stone-400 font-mono text-xs">
                  No ranked matches recorded yet. Complete an arena brawl to view match logs!
                </div>
              ) : (
                rankData.history.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-2.5 rounded border font-mono text-xs ${
                      m.won
                        ? 'bg-emerald-950/20 border-emerald-800/40'
                        : 'bg-red-950/20 border-red-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-pixel text-[10px] px-2 py-0.5 rounded ${
                          m.won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {m.won ? 'VICTORY' : 'DEFEAT'}
                      </span>
                      <div>
                        <span className="font-pixel text-[9px] text-stone-200">
                          {m.mode} · {CLASSES[m.playerClass]?.name || m.playerClass}
                        </span>
                        <span className="block text-[10px] text-stone-400">
                          Score: {m.score} · {m.kills} Kills · {m.damage} Dmg
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-pixel text-xs tabular-nums ${
                          m.ratingDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {m.ratingDelta >= 0 ? `+${m.ratingDelta}` : m.ratingDelta} RP
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'classes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(rankData.classStats).map(([clsKey, stats]) => {
                const clsDef = CLASSES[clsKey as keyof typeof CLASSES];
                if (!clsDef) return null;
                const winPct = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

                return (
                  <div
                    key={clsKey}
                    className="p-3 rounded-lg bg-stone-950/70 border border-stone-800 font-mono text-xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-[10px] text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: clsDef.primaryColor }} />
                        {clsDef.name}
                      </span>
                      <span className="text-stone-400 text-[10px]">{clsDef.role}</span>
                    </div>
                    <div className="flex justify-between items-center text-stone-300">
                      <span>Matches: {stats.matches}</span>
                      <span className="text-emerald-400 font-pixel text-[10px]">{winPct}% Win</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${winPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
