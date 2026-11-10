import React from 'react';
import { HudData } from '../game/engine';
import { CharacterClass } from '../game/types';
import { sound } from '../game/audio';
import { Volume2, VolumeX, Pause, Shield, Zap, Target, Users, AlertTriangle } from 'lucide-react';

interface GameHudProps {
  hud: HudData;
  playerClassDef: CharacterClass;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onPing: (type: 'focus' | 'rally' | 'retreat') => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  playerClassDef,
  isMuted,
  onToggleMute,
  onPause,
  onPing,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (hud.playerHp / hud.playerMaxHp) * 100));
  const isCriticalHp = hpPercent < 25 && hud.playerHp > 0;

  const s1CooldownPercent =
    hud.skill1CooldownRemaining > 0
      ? (hud.skill1CooldownRemaining / hud.skill1CooldownMax) * 100
      : 0;

  const s2CooldownPercent =
    hud.skill2CooldownRemaining > 0
      ? (hud.skill2CooldownRemaining / hud.skill2CooldownMax) * 100
      : 0;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 select-none font-mono">
      {/* Critical Low Health Peripheral Screen Vignette */}
      {isCriticalHp && (
        <div className="absolute inset-0 pointer-events-none border-4 sm:border-8 border-red-600/40 animate-pulse" />
      )}

      {/* TOP BAR CLUSTER */}
      <div className="flex items-start justify-between w-full">
        {/* Top Left: Blue Team Roster Status */}
        <div className="flex flex-col gap-1.5 w-48 sm:w-56">
          <div className="flex items-center gap-1.5 text-sky-400 font-pixel text-[10px] mb-0.5">
            <Shield className="w-3.5 h-3.5" />
            <span>BLUE SQUAD</span>
          </div>
          {hud.blueRoster.map((ent) => {
            const entHpPct = Math.max(0, Math.min(100, (ent.hp / ent.maxHp) * 100));
            return (
              <div
                key={ent.id}
                className={`px-2 py-1 rounded bg-stone-950/80 border text-[10px] ${
                  ent.isDead
                    ? 'border-stone-800/60 opacity-50'
                    : ent.isPlayer
                    ? 'border-sky-500/80 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                    : 'border-stone-800/80'
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className={`font-pixel text-[9px] ${ent.isPlayer ? 'text-amber-300' : 'text-stone-300'}`}>
                    {ent.name} {ent.isPlayer ? '(YOU)' : ''}
                  </span>
                  <span className="text-stone-400 tabular-nums text-[9px]">
                    {ent.isDead ? 'DEAD' : `${ent.hp}/${ent.maxHp}`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      ent.isPlayer ? 'bg-sky-400' : 'bg-sky-500/80'
                    }`}
                    style={{ width: `${entHpPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Top Center: Round & Match Scoreboard Display */}
        <div className="flex flex-col items-center">
          <div className="px-5 py-2 rounded-lg bg-stone-950/90 border border-stone-800 shadow-xl flex items-center gap-4">
            {/* Blue Score */}
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-xs text-sky-400">BLUE</span>
              <span className="font-pixel text-xl text-sky-400 tabular-nums">{hud.blueScore}</span>
            </div>

            {/* Match / Timer Center */}
            <div className="flex flex-col items-center border-x border-stone-800 px-3">
              <span className="font-pixel text-[9px] text-stone-400">ROUND {hud.roundNumber}</span>
              <span className="font-pixel text-sm text-amber-300 tabular-nums">
                {Math.floor(hud.roundTimeRemaining / 60)}:
                {(hud.roundTimeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Red Score */}
            <div className="flex items-center gap-1.5">
              <span className="font-pixel text-xl text-red-400 tabular-nums">{hud.redScore}</span>
              <span className="font-pixel text-xs text-red-400">RED</span>
            </div>
          </div>

          {/* Active Tactical Ping Notification */}
          {hud.activePing && (
            <div className="mt-2 px-3 py-1 rounded bg-amber-500/20 border border-amber-500/60 font-pixel text-[10px] text-amber-300 shadow-md animate-bounce">
              {hud.activePing.text}
            </div>
          )}
        </div>

        {/* Top Right: Red Team Roster + Utility Controls */}
        <div className="flex flex-col items-end gap-2 w-48 sm:w-56">
          {/* Pause & Mute buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => {
                sound.playButton();
                onToggleMute();
              }}
              aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-2 rounded bg-stone-950/90 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                sound.playButton();
                onPause();
              }}
              aria-label="Pause Game"
              className="p-2 rounded bg-stone-950/90 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Red Team Roster */}
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-end gap-1.5 text-red-400 font-pixel text-[10px] mb-0.5">
              <span>RED ENEMY SQUAD</span>
              <Shield className="w-3.5 h-3.5" />
            </div>
            {hud.redRoster.map((ent) => {
              const entHpPct = Math.max(0, Math.min(100, (ent.hp / ent.maxHp) * 100));
              return (
                <div
                  key={ent.id}
                  className={`px-2 py-1 rounded bg-stone-950/80 border text-[10px] text-right ${
                    ent.isDead ? 'border-stone-800/60 opacity-50' : 'border-stone-800/80'
                  }`}
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-stone-400 tabular-nums text-[9px]">
                      {ent.isDead ? 'DEAD' : `${ent.hp}/${ent.maxHp}`}
                    </span>
                    <span className="font-pixel text-[9px] text-red-300">{ent.name}</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all duration-150 ml-auto"
                      style={{ width: `${entHpPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM CLUSTER: Player Vitality & Cooldown Slots + Tactical Pings */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom Left: Player Health Bar & Vitality */}
        <div className="flex flex-col gap-1.5 w-64 sm:w-80 pointer-events-auto">
          <div className="px-4 py-3 rounded-lg bg-stone-950/90 border border-stone-800 shadow-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-pixel text-[11px] text-white flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: playerClassDef.primaryColor }} />
                {playerClassDef.name}
              </span>
              <span className="font-pixel text-xs text-emerald-400 tabular-nums">
                {hud.playerHp} / {hud.playerMaxHp} HP
              </span>
            </div>

            {/* Health Bar with Ghost delay & highlight */}
            <div className="w-full h-3 bg-stone-900 rounded border border-stone-800 overflow-hidden relative">
              <div
                className={`h-full transition-all duration-150 ${
                  isCriticalHp ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-stone-400 mt-1 font-mono">
              <span>{playerClassDef.role}</span>
              <span>{playerClassDef.passive.name}</span>
            </div>
          </div>
        </div>

        {/* Bottom Center: Action & Ability Cooldown Tiles */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Primary Attack Slot */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-lg bg-stone-950/90 border border-stone-700 flex flex-col items-center justify-center p-1 shadow-lg relative group">
              <span className="font-pixel text-[9px] text-stone-300 text-center leading-tight">ATTACK</span>
              <span className="font-mono text-[9px] text-amber-400 mt-1">LMB</span>
            </div>
            <span className="font-pixel text-[8px] text-stone-400 mt-1">Basic</span>
          </div>

          {/* Skill 1 Slot */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-lg bg-stone-950/90 border border-stone-700 flex flex-col items-center justify-center p-1 shadow-lg relative overflow-hidden">
              {/* Cooldown overlay */}
              {hud.skill1CooldownRemaining > 0 && (
                <div
                  className="absolute inset-0 bg-stone-950/85 flex items-center justify-center font-pixel text-xs text-amber-400 z-10"
                  style={{ top: `${100 - s1CooldownPercent}%` }}
                >
                  {hud.skill1CooldownRemaining.toFixed(1)}
                </div>
              )}
              <Zap className="w-4 h-4 text-amber-400 mb-0.5" />
              <span className="font-pixel text-[8px] text-stone-200 text-center truncate w-full">
                {playerClassDef.skill1.name.split(' ')[0]}
              </span>
              <span className="font-mono text-[9px] text-amber-400">SPACE</span>
            </div>
            <span className="font-pixel text-[8px] text-stone-400 mt-1">Skill 1</span>
          </div>

          {/* Skill 2 / Ultimate Slot */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-lg bg-stone-950/90 border border-stone-700 flex flex-col items-center justify-center p-1 shadow-lg relative overflow-hidden">
              {/* Cooldown overlay */}
              {hud.skill2CooldownRemaining > 0 && (
                <div
                  className="absolute inset-0 bg-stone-950/85 flex items-center justify-center font-pixel text-xs text-sky-400 z-10"
                  style={{ top: `${100 - s2CooldownPercent}%` }}
                >
                  {hud.skill2CooldownRemaining.toFixed(1)}
                </div>
              )}
              <Zap className="w-4 h-4 text-sky-400 mb-0.5" />
              <span className="font-pixel text-[8px] text-stone-200 text-center truncate w-full">
                {playerClassDef.skill2.name.split(' ')[0]}
              </span>
              <span className="font-mono text-[9px] text-sky-400">E</span>
            </div>
            <span className="font-pixel text-[8px] text-stone-400 mt-1">Skill 2</span>
          </div>
        </div>

        {/* Bottom Right: Tactical Team Pings */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <span className="font-pixel text-[9px] text-stone-400 text-right">TACTICAL PINGS</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPing('focus')}
              className="px-2.5 py-1.5 rounded bg-stone-950/90 border border-stone-800 hover:border-amber-400 text-amber-300 font-pixel text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Ping closest enemy for team to focus"
            >
              <Target className="w-3 h-3 text-amber-400" />
              <span>[F] FOCUS</span>
            </button>

            <button
              onClick={() => onPing('rally')}
              className="px-2.5 py-1.5 rounded bg-stone-950/90 border border-stone-800 hover:border-sky-400 text-sky-300 font-pixel text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Rally teammates to your position"
            >
              <Users className="w-3 h-3 text-sky-400" />
              <span>[C] RALLY</span>
            </button>

            <button
              onClick={() => onPing('retreat')}
              className="px-2.5 py-1.5 rounded bg-stone-950/90 border border-stone-800 hover:border-red-400 text-red-300 font-pixel text-[9px] flex items-center gap-1 transition-colors cursor-pointer"
              title="Order bot allies to retreat"
            >
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span>[V] RETREAT</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
