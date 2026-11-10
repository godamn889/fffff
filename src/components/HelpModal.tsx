import React from 'react';
import { sound } from '../game/audio';
import { X, Keyboard, Shield, Zap, Target } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-stone-950/85 pointer-events-auto overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl max-w-lg w-full shadow-2xl flex flex-col gap-4 text-left my-auto">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h2 className="font-pixel text-sm text-white tracking-wider">ARENA CONTROLS & RULES</h2>
          </div>
          <button
            onClick={() => {
              sound.playButton();
              onClose();
            }}
            className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
            aria-label="Close Help"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 font-mono text-xs text-stone-300">
          <div className="bg-stone-950/70 p-3 rounded border border-stone-800">
            <span className="font-pixel text-[10px] text-amber-400 block mb-1">KEYBOARD & MOUSE CONTROLS:</span>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-stone-300">
              <p><span className="text-stone-400">WASD / Arrows:</span> Move</p>
              <p><span className="text-stone-400">Mouse Cursor:</span> Aim</p>
              <p><span className="text-stone-400">Left Click:</span> Attack</p>
              <p><span className="text-stone-400">Space / RMB:</span> Skill 1</p>
              <p><span className="text-stone-400">E:</span> Skill 2 (Ultimate)</p>
              <p><span className="text-stone-400">Esc / P:</span> Pause</p>
              <p><span className="text-stone-400">[F] Key:</span> Focus Ping</p>
              <p><span className="text-stone-400">[C] Key:</span> Rally Ping</p>
              <p><span className="text-stone-400">[V] Key:</span> Retreat Ping</p>
              <p><span className="text-stone-400">[M] Key:</span> Toggle Audio</p>
            </div>
          </div>

          <div className="bg-stone-950/70 p-3 rounded border border-stone-800">
            <span className="font-pixel text-[10px] text-sky-400 block mb-1">COMPETITIVE ARENA RULES:</span>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-300">
              <li>First team to win 2 rounds wins the match (Best of 3).</li>
              <li>Eliminate all enemy gladiators to score a round win.</li>
              <li>Powerups spawn in the arena: Green (Health), Yellow (Cooldown Reset), Cyan (Haste Speed), Red (Power Shield).</li>
              <li>Winning matches awards Rating Points (RP) and climbs the competitive ladder from Bronze to Grandmaster!</li>
              <li>Earn win streaks and match MVP honors for bonus RP!</li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playButton();
            onClose();
          }}
          className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-pixel text-xs font-bold transition-colors cursor-pointer mt-1"
        >
          GOT IT, LET'S BRAWL!
        </button>
      </div>
    </div>
  );
};
