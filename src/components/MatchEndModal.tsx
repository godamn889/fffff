import React, { useEffect } from 'react';
import { MatchResult } from '../game/engine';
import { RankData, RankTier } from '../game/types';
import { TIER_CONFIG, getRankProgress } from '../game/ranked';
import { sound } from '../game/audio';
import { Trophy, Award, ArrowUp, ArrowDown, RotateCcw, Home } from 'lucide-react';

interface MatchEndModalProps {
  result: MatchResult;
  rankData: RankData;
  ratingDelta: number;
  oldRating: number;
  newRating: number;
  oldTier: RankTier;
  newTier: RankTier;
  tierChanged: boolean;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  result,
  rankData,
  ratingDelta,
  oldRating,
  newRating,
  oldTier,
  newTier,
  tierChanged,
  onPlayAgain,
  onReturnLobby,
}) => {
  const isVictory = result.playerWon;
  const tierCfg = TIER_CONFIG[newTier];
  const progress = getRankProgress(newRating);

  useEffect(() => {
    if (tierChanged && isVictory) {
      sound.playRankUp();
    }
  }, [tierChanged, isVictory]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-stone-950/90 pointer-events-auto overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 p-5 sm:p-7 rounded-xl max-w-xl w-full shadow-2xl flex flex-col gap-5 my-auto">
        {/* Outcome Header */}
        <div className="text-center">
          <h2
            className={`font-pixel text-2xl sm:text-3xl mb-1 tracking-wider ${
              isVictory ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]' : 'text-red-500'
            }`}
          >
            {isVictory ? 'MATCH VICTORY!' : 'MATCH DEFEAT'}
          </h2>
          <p className="font-mono text-xs text-stone-400">
            FINAL SCORE: BLUE {result.blueScore} - {result.redScore} RED · DURATION {result.matchDuration}s
          </p>
        </div>

        {/* Competitive Rank Progression Card */}
        <div className="p-4 rounded-lg bg-stone-950/80 border border-stone-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-lg border flex items-center justify-center font-pixel text-sm font-bold shadow-md"
                style={{
                  borderColor: tierCfg.color,
                  backgroundColor: `${tierCfg.color}20`,
                  color: tierCfg.color,
                }}
              >
                {newTier[0]}
                {newTier !== 'Master' && newTier !== 'Grandmaster' ? rankData.division : ''}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-xs sm:text-sm font-bold" style={{ color: tierCfg.color }}>
                    {newTier} {newTier !== 'Master' && newTier !== 'Grandmaster' ? rankData.division : ''}
                  </span>
                  {tierChanged && isVictory && (
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-pixel text-[9px] animate-bounce">
                      RANK PROMOTED!
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-stone-400 flex items-center gap-2 mt-0.5">
                  <span className="tabular-nums">{newRating} RP</span>
                  <span
                    className={`flex items-center font-bold ${
                      ratingDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {ratingDelta >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                    {ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} RP
                  </span>
                </div>
              </div>
            </div>

            {/* Win streak info */}
            {rankData.winStreak >= 2 && (
              <div className="text-right font-mono text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                🔥 {rankData.winStreak} WIN STREAK
              </div>
            )}
          </div>

          {/* Division Progress Bar */}
          <div>
            <div className="flex justify-between text-[10px] text-stone-400 font-mono mb-1">
              <span>DIVISION PROGRESS</span>
              <span className="tabular-nums">{progress.percent}%</span>
            </div>
            <div className="w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress.percent}%`, backgroundColor: tierCfg.color }}
              />
            </div>
          </div>
        </div>

        {/* MVP Showcase */}
        {result.mvp && (
          <div className="flex items-center justify-between px-3 py-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-stone-300">MATCH MVP:</span>
              <span className="font-pixel text-[10px] text-amber-300">
                {result.mvp.name} {result.mvp.isPlayer ? '(YOU)' : ''}
              </span>
            </div>
            <span className="text-stone-400 font-pixel text-[9px]">
              {result.mvp.stats.kills} KILLS · {result.mvp.stats.damageDealt} DMG
            </span>
          </div>
        )}

        {/* Performance Scoreboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] text-stone-300 border border-stone-800 rounded overflow-hidden">
            <thead className="bg-stone-950 font-pixel text-[9px] text-stone-400 border-b border-stone-800">
              <tr>
                <th className="p-2">CHAMPION</th>
                <th className="p-2 text-center">K / D</th>
                <th className="p-2 text-right">DAMAGE</th>
                <th className="p-2 text-right">TAKEN</th>
                <th className="p-2 text-right">HEAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 bg-stone-950/60">
              {result.entities.map((ent) => {
                const isBlue = ent.team === 'blue';
                return (
                  <tr
                    key={ent.id}
                    className={ent.isPlayer ? 'bg-amber-500/10 font-bold' : ''}
                  >
                    <td className="p-2 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isBlue ? 'bg-sky-400' : 'bg-red-400'}`} />
                      <span className={ent.isPlayer ? 'text-amber-300 font-pixel text-[9px]' : ''}>
                        {ent.name} {ent.isPlayer ? '⭐' : ''}
                      </span>
                    </td>
                    <td className="p-2 text-center tabular-nums">
                      {ent.stats.kills} / {ent.stats.deaths}
                    </td>
                    <td className="p-2 text-right tabular-nums text-amber-400">
                      {ent.stats.damageDealt}
                    </td>
                    <td className="p-2 text-right tabular-nums text-stone-400">
                      {ent.stats.damageTaken}
                    </td>
                    <td className="p-2 text-right tabular-nums text-emerald-400">
                      {ent.stats.healingDone}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
          <button
            data-start="true"
            onClick={() => {
              sound.playButton();
              onPlayAgain();
            }}
            className="w-full sm:flex-1 py-3.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-pixel text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={() => {
              sound.playButton();
              onReturnLobby();
            }}
            className="w-full sm:w-auto px-5 py-3.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-pixel text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>LOBBY</span>
          </button>
        </div>
      </div>
    </div>
  );
};
