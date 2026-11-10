import React from 'react';
import { sound } from '../game/audio';
import { Play, RotateCcw, Home, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onLobby: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onLobby,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-stone-950/80 pointer-events-auto">
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center">
        <h2 className="font-pixel text-lg text-amber-400 tracking-wider">GAME PAUSED</h2>

        <div className="flex flex-col gap-2.5 my-2">
          <button
            onClick={() => {
              sound.playButton();
              onResume();
            }}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-pixel text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME [ESC]</span>
          </button>

          <button
            onClick={() => {
              sound.playButton();
              onRestart();
            }}
            className="w-full py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-pixel text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART MATCH</span>
          </button>

          <button
            onClick={() => {
              sound.playButton();
              onLobby();
            }}
            className="w-full py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-pixel text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO LOBBY</span>
          </button>
        </div>

        {/* Audio Mute */}
        <div className="flex items-center justify-between border-t border-stone-800 pt-3">
          <span className="font-mono text-xs text-stone-400">AUDIO SOUND EFFECTS</span>
          <button
            onClick={() => {
              sound.playButton();
              onToggleMute();
            }}
            className="p-2 rounded bg-stone-950 border border-stone-800 text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Controls reference */}
        <div className="text-[10px] text-stone-400 font-mono bg-stone-950/60 p-2.5 rounded border border-stone-800/80 text-left">
          <p className="text-stone-300 font-pixel text-[9px] mb-1">QUICK CONTROLS:</p>
          <p>WASD / Arrows: Movement</p>
          <p>Mouse Cursor: Aim</p>
          <p>Left Click: Primary Attack</p>
          <p>Space / RMB: Class Skill 1</p>
          <p>E: Class Skill 2 (Ultimate)</p>
          <p>F / C / V: Tactical Team Pings</p>
        </div>
      </div>
    </div>
  );
};
