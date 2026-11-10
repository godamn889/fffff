import React, { useState } from 'react';
import { ClassType, GameMode, MapId } from '../game/types';
import { CLASSES, CLASS_LIST } from '../game/classes';
import { MAP_LIST } from '../game/maps';
import { sound } from '../game/audio';
import { ArrowLeft, Play, Shield, Swords, Users, Shuffle, MapPin, Zap } from 'lucide-react';

interface LobbyScreenProps {
  onBack: () => void;
  onLaunchGame: (
    mode: GameMode,
    mapId: MapId,
    playerClass: ClassType,
    blueBots: ClassType[],
    redBots: ClassType[]
  ) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ onBack, onLaunchGame }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('3v3');
  const [selectedMap, setSelectedMap] = useState<MapId>('courtyard');
  const [selectedClass, setSelectedClass] = useState<ClassType>('knight');

  // Bot rosters
  const [blueBots, setBlueBots] = useState<ClassType[]>(['ranger', 'paladin']);
  const [redBots, setRedBots] = useState<ClassType[]>(['pyromancer', 'assassin', 'cryomancer']);

  // Handle Mode Change
  const handleModeChange = (mode: GameMode) => {
    sound.playButton();
    setSelectedMode(mode);
    if (mode === '1v1') {
      setBlueBots([]);
      setRedBots(['pyromancer']);
    } else if (mode === '2v2') {
      setBlueBots(['ranger']);
      setRedBots(['knight', 'pyromancer']);
    } else {
      setBlueBots(['ranger', 'paladin']);
      setRedBots(['pyromancer', 'assassin', 'cryomancer']);
    }
  };

  const handleRandomizeRosters = () => {
    sound.playButton();
    const all = Object.keys(CLASSES) as ClassType[];
    const rand = () => all[Math.floor(Math.random() * all.length)];

    if (selectedMode === '1v1') {
      setBlueBots([]);
      setRedBots([rand()]);
    } else if (selectedMode === '2v2') {
      setBlueBots([rand()]);
      setRedBots([rand(), rand()]);
    } else {
      setBlueBots([rand(), rand()]);
      setRedBots([rand(), rand(), rand()]);
    }
  };

  const currentClassDef = CLASSES[selectedClass];

  return (
    <div className="absolute inset-0 z-30 flex flex-col p-4 sm:p-6 md:p-8 pointer-events-auto bg-stone-950 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto mb-6">
        <button
          onClick={() => {
            sound.playButton();
            onBack();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:border-stone-700 transition-colors font-mono text-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO TITLE</span>
        </button>

        <h2 className="font-pixel text-sm sm:text-base text-amber-400 tracking-wider">
          ARENA BATTLE CONFIGURATION
        </h2>

        <button
          onClick={handleRandomizeRosters}
          className="flex items-center gap-2 px-3 py-2 rounded bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors font-mono text-xs cursor-pointer"
          title="Randomize Bot Lineups"
        >
          <Shuffle className="w-4 h-4" />
          <span className="hidden sm:inline">RANDOM BOTS</span>
        </button>
      </div>

      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto">
        {/* Left Column: Mode & Class Picker (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* 1. Mode Selector */}
          <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-lg">
            <span className="font-pixel text-xs text-stone-400 block mb-3">SELECT MATCH FORMAT</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleModeChange('1v1')}
                className={`py-3 px-2 rounded border font-pixel text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedMode === '1v1'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Swords className="w-4 h-4" />
                <span>1v1 DUEL</span>
                <span className="font-mono text-[10px] text-stone-400">Pure Solo Skill</span>
              </button>

              <button
                onClick={() => handleModeChange('2v2')}
                className={`py-3 px-2 rounded border font-pixel text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedMode === '2v2'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>2v2 CLASH</span>
                <span className="font-mono text-[10px] text-stone-400">Duo Synergy</span>
              </button>

              <button
                onClick={() => handleModeChange('3v3')}
                className={`py-3 px-2 rounded border font-pixel text-xs flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  selectedMode === '3v3'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                    : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>3v3 BRAWL</span>
                <span className="font-mono text-[10px] text-stone-400">Full Squad Arena</span>
              </button>
            </div>
          </div>

          {/* 2. Character Class Selector */}
          <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="font-pixel text-xs text-stone-400">CHOOSE YOUR CHAMPION CLASS</span>
              <span className="font-mono text-xs text-amber-400">
                {currentClassDef.role} Archetype
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CLASS_LIST.map((cls) => {
                const isSelected = selectedClass === cls.id;
                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      sound.playButton();
                      setSelectedClass(cls.id);
                    }}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-stone-800 shadow-lg'
                        : 'border-stone-800 bg-stone-950/70 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="font-pixel text-[11px] font-bold"
                        style={{ color: isSelected ? '#fde047' : cls.accentColor }}
                      >
                        {cls.name}
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.primaryColor }} />
                    </div>
                    <span className="font-mono text-[10px] text-stone-400">{cls.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Map Selector */}
          <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-lg">
            <span className="font-pixel text-xs text-stone-400 block mb-3">SELECT BATTLEGROUND MAP</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MAP_LIST.map((m) => {
                const isSelected = selectedMap === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      sound.playButton();
                      setSelectedMap(m.id);
                    }}
                    className={`p-2.5 rounded border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-stone-800 text-amber-300 shadow-md'
                        : 'border-stone-800 bg-stone-950/70 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" style={{ color: m.accentColor }} />
                      <span className="font-pixel text-[10px] truncate">{m.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Class Stats & Ability Sheet + Teams (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Class Spotlight Card */}
          <div className="bg-stone-900/90 border border-stone-800 p-5 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-3">
                <div>
                  <h3 className="font-pixel text-base text-white">{currentClassDef.name}</h3>
                  <p className="font-mono text-xs text-amber-400">{currentClassDef.title}</p>
                </div>
                <div
                  className="px-2.5 py-1 rounded font-pixel text-[10px] border"
                  style={{
                    borderColor: currentClassDef.primaryColor,
                    backgroundColor: `${currentClassDef.primaryColor}22`,
                    color: currentClassDef.accentColor,
                  }}
                >
                  {currentClassDef.role}
                </div>
              </div>

              <p className="text-xs text-stone-300 font-sans leading-relaxed mb-4">
                {currentClassDef.description}
              </p>

              {/* Stats Bars */}
              <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-xs bg-stone-950/80 p-3 rounded border border-stone-800/80">
                <div>
                  <div className="flex justify-between text-stone-400 mb-1">
                    <span>HEALTH</span>
                    <span className="text-white font-bold">{currentClassDef.baseHp}</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(currentClassDef.baseHp / 500) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-stone-400 mb-1">
                    <span>ARMOR</span>
                    <span className="text-white font-bold">{currentClassDef.armor}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: `${(currentClassDef.armor / 40) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-stone-400 mb-1">
                    <span>ATTACK</span>
                    <span className="text-white font-bold">{currentClassDef.attackDamage}</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${(currentClassDef.attackDamage / 60) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-stone-400 mb-1">
                    <span>SPEED</span>
                    <span className="text-white font-bold">{currentClassDef.speed}</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${(currentClassDef.speed / 200) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Abilities & Passive Breakdown */}
              <div className="flex flex-col gap-2.5 mb-4">
                <div className="bg-stone-950/70 p-2.5 rounded border border-stone-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-pixel text-[10px] text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      {currentClassDef.skill1.name}
                    </span>
                    <span className="font-mono text-[9px] text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">
                      {currentClassDef.skill1.keyHint}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-normal">
                    {currentClassDef.skill1.description}
                  </p>
                </div>

                <div className="bg-stone-950/70 p-2.5 rounded border border-stone-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-pixel text-[10px] text-sky-400 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" />
                      {currentClassDef.skill2.name}
                    </span>
                    <span className="font-mono text-[9px] text-stone-400 bg-stone-800 px-1.5 py-0.5 rounded">
                      {currentClassDef.skill2.keyHint}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-normal">
                    {currentClassDef.skill2.description}
                  </p>
                </div>

                <div className="bg-stone-950/70 p-2 rounded border border-stone-800/80">
                  <span className="font-pixel text-[9px] text-emerald-400 block mb-0.5">
                    PASSIVE: {currentClassDef.passive.name}
                  </span>
                  <p className="text-[10px] text-stone-400 leading-normal">
                    {currentClassDef.passive.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Launch Match Button */}
            <button
              data-start="true"
              onClick={() => {
                sound.playButton();
                onLaunchGame(selectedMode, selectedMap, selectedClass, blueBots, redBots);
              }}
              className="w-full py-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-pixel text-sm font-bold shadow-xl shadow-amber-500/20 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START ARENA MATCH</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
