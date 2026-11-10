/**
 * Core type definitions for Pixel Arena: Ranked Champions
 */

export type ClassType = 'knight' | 'ranger' | 'pyromancer' | 'assassin' | 'paladin' | 'cryomancer';
export type Team = 'blue' | 'red';
export type GameMode = '1v1' | '2v2' | '3v3';
export type TacticalPing = 'focus' | 'rally' | 'retreat';
export type MapId = 'courtyard' | 'cavern' | 'foundry' | 'grove';

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster';

export interface ClassSkill {
  name: string;
  cooldown: number; // in seconds
  description: string;
  keyHint: string;
}

export interface CharacterClass {
  id: ClassType;
  name: string;
  title: string;
  role: 'Tank' | 'Marksman' | 'Mage' | 'Assassin' | 'Support' | 'Crowd Control';
  description: string;
  baseHp: number;
  armor: number; // percentage damage mitigation (0-40)
  speed: number; // pixels per second
  attackDamage: number;
  attackCooldown: number; // seconds between attacks
  attackRange: number;
  attackType: 'melee' | 'projectile';
  skill1: ClassSkill; // usually mobility or defensive
  skill2: ClassSkill; // ultimate or high-impact ability
  passive: {
    name: string;
    description: string;
  };
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface StatusEffect {
  type: 'burning' | 'chilled' | 'stunned' | 'invisible' | 'shielded' | 'haste';
  duration: number; // remaining seconds
  intensity?: number;
  sourceId?: string;
}

export interface EntityStats {
  kills: number;
  deaths: number;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
}

export interface Entity {
  id: string;
  team: Team;
  isPlayer: boolean;
  classType: ClassType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facingAngle: number;
  currentHp: number;
  maxHp: number;
  currentEnergy: number;
  maxEnergy: number;
  armor: number;
  speed: number;
  attackCooldownTimer: number;
  skill1CooldownTimer: number;
  skill2CooldownTimer: number;
  isAttacking: boolean;
  attackPhaseTimer: number;
  isDashing: boolean;
  dashTimer: number;
  statusEffects: StatusEffect[];
  stats: EntityStats;
  targetId: string | null;
  aiState?: 'patrol' | 'approach' | 'kite' | 'flank' | 'retreat' | 'support';
  aiDecisionTimer?: number;
  walkCycle: number;
  isDead: boolean;
  deathTimer: number;
}

export interface Projectile {
  id: string;
  ownerId: string;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  element: 'physical' | 'fire' | 'ice' | 'holy' | 'shadow';
  rangeRemaining: number;
  piercing: boolean;
  isSplash: boolean;
  splashRadius: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  shape?: 'square' | 'circle' | 'spark' | 'smoke';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  scale: number;
}

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: 'health' | 'energy' | 'haste' | 'damage';
  active: boolean;
  respawnTimer: number;
  radius: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'wall' | 'pillar' | 'water' | 'crystal' | 'crate';
  health?: number; // for destructible crates
  maxHealth?: number;
}

export interface ArenaMap {
  id: MapId;
  name: string;
  description: string;
  width: number;
  height: number;
  floorColor: string;
  floorPatternColor: string;
  wallColor: string;
  accentColor: string;
  obstacles: Obstacle[];
  spawns: {
    blue: { x: number; y: number }[];
    red: { x: number; y: number }[];
  };
  powerUps: PowerUp[];
}

export interface MatchHistoryItem {
  id: string;
  timestamp: number;
  mode: GameMode;
  mapId: MapId;
  playerClass: ClassType;
  won: boolean;
  score: string; // e.g. "2 - 1"
  ratingDelta: number;
  kills: number;
  deaths: number;
  damage: number;
  isMvp: boolean;
}

export interface RankData {
  ratingPoints: number; // MMR (e.g. 1000 - 3000+)
  tier: RankTier;
  division: 1 | 2 | 3;
  wins: number;
  losses: number;
  winStreak: number;
  bestTier: RankTier;
  bestRating: number;
  history: MatchHistoryItem[];
  classStats: Record<ClassType, { matches: number; wins: number }>;
}

export interface RivalGladiator {
  id: string;
  name: string;
  title: string;
  tier: RankTier;
  rating: number;
  preferredClass: ClassType;
  avatarSeed: number;
}
