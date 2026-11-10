/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ClassType, GameMode, MapId, RankData, RankTier } from './game/types';
import { CLASSES } from './game/classes';
import { GameEngine, HudData, MatchResult } from './game/engine';
import { loadRankData, recordMatchResult } from './game/ranked';
import { calculateRatingDelta } from './game/rules';
import { sound } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { GameHud } from './components/GameHud';
import { PauseModal } from './components/PauseModal';
import { MatchEndModal } from './components/MatchEndModal';
import { RankedModal } from './components/RankedModal';
import { HelpModal } from './components/HelpModal';

export default function App() {
  // Navigation & Shell State
  const [gameState, setGameState] = useState<'title' | 'lobby' | 'playing' | 'paused' | 'gameover'>('title');
  const [showRankedModal, setShowRankedModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Match Configuration
  const [currentMode, setCurrentMode] = useState<GameMode>('3v3');
  const [currentMap, setCurrentMap] = useState<MapId>('courtyard');
  const [playerClass, setPlayerClass] = useState<ClassType>('knight');
  const [blueBots, setBlueBots] = useState<ClassType[]>(['ranger', 'paladin']);
  const [redBots, setRedBots] = useState<ClassType[]>(['pyromancer', 'assassin', 'cryomancer']);

  // Persistent Rank Progression
  const [rankData, setRankData] = useState<RankData>(() => loadRankData());

  // Post-match rank progression state
  const [lastMatchResult, setLastMatchResult] = useState<MatchResult | null>(null);
  const [ratingDelta, setRatingDelta] = useState<number>(0);
  const [oldRating, setOldRating] = useState<number>(650);
  const [newRating, setNewRating] = useState<number>(650);
  const [oldTier, setOldTier] = useState<RankTier>('Bronze');
  const [newTier, setNewTier] = useState<RankTier>('Bronze');
  const [tierChanged, setTierChanged] = useState<boolean>(false);

  // Live HUD Data from Engine
  const [hudData, setHudData] = useState<HudData | null>(null);

  // Refs for Canvas and Engine
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Sync document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Audio mute toggle
  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Keyboard 'M' listener to toggle mute
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleToggleMute]);

  // Launch into Playing
  const launchMatch = useCallback(
    (
      mode: GameMode,
      mapId: MapId,
      pClass: ClassType,
      bBots: ClassType[],
      rBots: ClassType[]
    ) => {
      setCurrentMode(mode);
      setCurrentMap(mapId);
      setPlayerClass(pClass);
      setBlueBots(bBots);
      setRedBots(rBots);

      // Clean up previous engine instance
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }

      if (!canvasRef.current) return;

      const engine = new GameEngine(
        canvasRef.current,
        mapId,
        mode,
        pClass,
        bBots,
        rBots,
        {
          onHudUpdate: (hud) => {
            setHudData(hud);
          },
          onRoundChange: (round, blueW, redW) => {
            // Can be used for discrete round fanfare
          },
          onMatchComplete: (result) => {
            setLastMatchResult(result);
            setGameState('gameover');

            // Calculate competitive Elo RP delta
            const isMvp = result.mvp?.isPlayer ?? false;
            const avgEnemyRating = 1200; // standard baseline or enemy MMR
            const delta = calculateRatingDelta(
              rankData.ratingPoints,
              avgEnemyRating,
              result.playerWon,
              isMvp,
              rankData.winStreak
            );

            // Record into persistent rank profile
            const historyItem = {
              id: `match-${Date.now()}`,
              timestamp: Date.now(),
              mode,
              mapId,
              playerClass: pClass,
              won: result.playerWon,
              score: `${result.blueScore} - ${result.redScore}`,
              ratingDelta: delta,
              kills: result.playerStats.kills,
              deaths: result.playerStats.deaths,
              damage: result.playerStats.damageDealt,
              isMvp,
            };

            const record = recordMatchResult(rankData, historyItem);
            setRankData(record.updated);
            setRatingDelta(delta);
            setOldRating(record.oldRating);
            setNewRating(record.newRating);
            setOldTier(record.oldTier);
            setNewTier(record.newTier);
            setTierChanged(record.tierChanged);
          },
        }
      );

      engineRef.current = engine;
      engine.start();
      setGameState('playing');
    },
    [rankData]
  );

  // Support ?autostart=1 query parameter (Ultra mode requirement)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      launchMatch('3v3', 'courtyard', 'knight', ['ranger', 'paladin'], ['pyromancer', 'assassin', 'cryomancer']);
    }
  }, [launchMatch]);

  // Clean up engine on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-stone-950 text-stone-100 flex items-center justify-center">
      {/* 2D Canvas Viewport Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1000}
          height={700}
          className="pixelated max-w-full max-h-full object-contain border border-stone-800 shadow-2xl bg-stone-950"
          data-testid="game-canvas"
        />

        {/* Scanlines overlay (subtle retro CRT feel) */}
        <div className="scanlines absolute inset-0 pointer-events-none opacity-40" />
      </div>

      {/* Screen 1: Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          rankData={rankData}
          onStartGame={() => setGameState('lobby')}
          onOpenRanked={() => setShowRankedModal(true)}
          onOpenHelp={() => setShowHelpModal(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen 2: Match Setup / Lobby Screen */}
      {gameState === 'lobby' && (
        <LobbyScreen
          onBack={() => setGameState('title')}
          onLaunchGame={(mode, mapId, pClass, bBots, rBots) => {
            launchMatch(mode, mapId, pClass, bBots, rBots);
          }}
        />
      )}

      {/* Screen 3: Playing HUD */}
      {(gameState === 'playing' || gameState === 'paused') && hudData && (
        <GameHud
          hud={hudData}
          playerClassDef={CLASSES[playerClass]}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={() => {
            if (engineRef.current) {
              const paused = engineRef.current.togglePause();
              setGameState(paused ? 'paused' : 'playing');
            }
          }}
          onPing={(type) => {
            if (engineRef.current) {
              engineRef.current.triggerTacticalPing(type);
            }
          }}
        />
      )}

      {/* Screen 4: Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => {
            if (engineRef.current) {
              engineRef.current.setPaused(false);
              setGameState('playing');
            }
          }}
          onRestart={() => {
            launchMatch(currentMode, currentMap, playerClass, blueBots, redBots);
          }}
          onLobby={() => {
            if (engineRef.current) {
              engineRef.current.destroy();
              engineRef.current = null;
            }
            setGameState('lobby');
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen 5: Match Victory / Defeat Modal */}
      {gameState === 'gameover' && lastMatchResult && (
        <MatchEndModal
          result={lastMatchResult}
          rankData={rankData}
          ratingDelta={ratingDelta}
          oldRating={oldRating}
          newRating={newRating}
          oldTier={oldTier}
          newTier={newTier}
          tierChanged={tierChanged}
          onPlayAgain={() => {
            launchMatch(currentMode, currentMap, playerClass, blueBots, redBots);
          }}
          onReturnLobby={() => {
            if (engineRef.current) {
              engineRef.current.destroy();
              engineRef.current = null;
            }
            setGameState('lobby');
          }}
        />
      )}

      {/* Screen 6: Ranked Ladder & Career Statistics Modal */}
      {showRankedModal && (
        <RankedModal
          rankData={rankData}
          onClose={() => setShowRankedModal(false)}
        />
      )}

      {/* Screen 7: Controls & Arena Help Modal */}
      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </main>
  );
}
