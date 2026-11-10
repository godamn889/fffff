import { ClassType, MatchHistoryItem, RankData, RankTier, RivalGladiator } from './types';
import { getRankTierAndDivision, TIER_THRESHOLDS } from './rules';

const STORAGE_KEY = 'pixel_arena_ranked_v1';

export const INITIAL_RIVALS: RivalGladiator[] = [
  { id: 'rival-1', name: 'Lord Malakor', title: 'Grand Champion', tier: 'Grandmaster', rating: 3250, preferredClass: 'knight', avatarSeed: 1 },
  { id: 'rival-2', name: 'Valkyrie Frost', title: 'Glacial Sovereign', tier: 'Grandmaster', rating: 3080, preferredClass: 'cryomancer', avatarSeed: 2 },
  { id: 'rival-3', name: 'ShadowX', title: 'Void Executioner', tier: 'Master', rating: 2840, preferredClass: 'assassin', avatarSeed: 3 },
  { id: 'rival-4', name: 'Aurelius Light', title: 'High Templar', tier: 'Master', rating: 2690, preferredClass: 'paladin', avatarSeed: 4 },
  { id: 'rival-5', name: 'Ember Queen', title: 'Infernal Archmage', tier: 'Diamond', rating: 2480, preferredClass: 'pyromancer', avatarSeed: 5 },
  { id: 'rival-6', name: 'Hawkeye Nova', title: 'Wind Warden', tier: 'Diamond', rating: 2320, preferredClass: 'ranger', avatarSeed: 6 },
  { id: 'rival-7', name: 'SteelWall', title: 'Iron Bulwark', tier: 'Platinum', rating: 2110, preferredClass: 'knight', avatarSeed: 7 },
  { id: 'rival-8', name: 'Nightshade Jr', title: 'Silent Blade', tier: 'Platinum', rating: 1950, preferredClass: 'assassin', avatarSeed: 8 },
  { id: 'rival-9', name: 'BlazeStriker', title: 'Ember Initiate', tier: 'Gold', rating: 1780, preferredClass: 'pyromancer', avatarSeed: 9 },
  { id: 'rival-10', name: 'Solaris', title: 'Dawn Disciple', tier: 'Gold', rating: 1650, preferredClass: 'paladin', avatarSeed: 10 },
  { id: 'rival-11', name: 'Frostbite', title: 'Chill Weaver', tier: 'Gold', rating: 1540, preferredClass: 'cryomancer', avatarSeed: 11 },
  { id: 'rival-12', name: 'SwiftArrow', title: 'Forest Scout', tier: 'Silver', rating: 1420, preferredClass: 'ranger', avatarSeed: 12 },
  { id: 'rival-13', name: 'Rook', title: 'Shield Bearer', tier: 'Silver', rating: 1330, preferredClass: 'knight', avatarSeed: 13 },
  { id: 'rival-14', name: 'Phantom', title: 'Shadow Initiate', tier: 'Silver', rating: 1220, preferredClass: 'assassin', avatarSeed: 14 },
  { id: 'rival-15', name: 'Cinder', title: 'Apprentice Mage', tier: 'Bronze', rating: 1050, preferredClass: 'pyromancer', avatarSeed: 15 },
  { id: 'rival-16', name: 'Cadet Leo', title: 'Squire', tier: 'Bronze', rating: 890, preferredClass: 'knight', avatarSeed: 16 },
  { id: 'rival-17', name: 'Novice Pip', title: 'Greenhorn Archer', tier: 'Bronze', rating: 740, preferredClass: 'ranger', avatarSeed: 17 },
  { id: 'rival-18', name: 'IceSprout', title: 'Frost Pupil', tier: 'Bronze', rating: 560, preferredClass: 'cryomancer', avatarSeed: 18 },
];

export function getInitialRankData(): RankData {
  return {
    ratingPoints: 650,
    tier: 'Bronze',
    division: 2,
    wins: 0,
    losses: 0,
    winStreak: 0,
    bestTier: 'Bronze',
    bestRating: 650,
    history: [],
    classStats: {
      knight: { matches: 0, wins: 0 },
      ranger: { matches: 0, wins: 0 },
      pyromancer: { matches: 0, wins: 0 },
      assassin: { matches: 0, wins: 0 },
      paladin: { matches: 0, wins: 0 },
      cryomancer: { matches: 0, wins: 0 },
    },
  };
}

export function loadRankData(): RankData {
  if (typeof window === 'undefined') return getInitialRankData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialRankData();
    const data = JSON.parse(raw) as RankData;
    // Verify sync with rating
    const { tier, division } = getRankTierAndDivision(data.ratingPoints);
    data.tier = tier;
    data.division = division;
    return data;
  } catch {
    return getInitialRankData();
  }
}

export function saveRankData(data: RankData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function recordMatchResult(
  current: RankData,
  match: MatchHistoryItem
): { updated: RankData; oldRating: number; newRating: number; oldTier: RankTier; newTier: RankTier; tierChanged: boolean } {
  const oldRating = current.ratingPoints;
  const oldTier = current.tier;

  const newRating = Math.max(0, current.ratingPoints + match.ratingDelta);
  const { tier: newTier, division: newDivision } = getRankTierAndDivision(newRating);

  const won = match.won;
  const newWinStreak = won ? current.winStreak + 1 : 0;
  const newWins = current.wins + (won ? 1 : 0);
  const newLosses = current.losses + (won ? 0 : 1);

  const bestRating = Math.max(current.bestRating, newRating);

  // Check if best tier reached
  const tierRanks: Record<RankTier, number> = {
    Bronze: 1,
    Silver: 2,
    Gold: 3,
    Platinum: 4,
    Diamond: 5,
    Master: 6,
    Grandmaster: 7,
  };
  const bestTier = tierRanks[newTier] > tierRanks[current.bestTier] ? newTier : current.bestTier;

  // Update class stats
  const classStats = { ...current.classStats };
  if (!classStats[match.playerClass]) {
    classStats[match.playerClass] = { matches: 0, wins: 0 };
  }
  classStats[match.playerClass].matches += 1;
  if (won) {
    classStats[match.playerClass].wins += 1;
  }

  // Prepend history
  const history = [match, ...current.history].slice(0, 30);

  const updated: RankData = {
    ratingPoints: newRating,
    tier: newTier,
    division: newDivision,
    wins: newWins,
    losses: newLosses,
    winStreak: newWinStreak,
    bestTier,
    bestRating,
    history,
    classStats,
  };

  saveRankData(updated);

  return {
    updated,
    oldRating,
    newRating,
    oldTier,
    newTier,
    tierChanged: oldTier !== newTier,
  };
}

/**
 * Calculates current progress percentage towards the next division or tier.
 */
export function getRankProgress(rating: number): { percent: number; currentDivisionTarget: number; currentDivisionBase: number } {
  for (const t of TIER_THRESHOLDS) {
    if (rating <= t.maxRating) {
      if (t.tier === 'Grandmaster') {
        return { percent: 100, currentDivisionTarget: 3500, currentDivisionBase: 3000 };
      }
      const range = t.maxRating - t.minRating;
      const step = range / 3;
      const offset = rating - t.minRating;
      const divIndex = Math.min(2, Math.floor(offset / step));
      const base = t.minRating + divIndex * step;
      const target = base + step;
      const pct = Math.min(100, Math.max(0, ((rating - base) / step) * 100));
      return { percent: Math.round(pct), currentDivisionTarget: Math.round(target), currentDivisionBase: Math.round(base) };
    }
  }
  return { percent: 100, currentDivisionTarget: 3500, currentDivisionBase: 3000 };
}

/**
 * Tier badge visual assets (colors, border styling, icons)
 */
export const TIER_CONFIG: Record<
  RankTier,
  { label: string; color: string; bgBadge: string; border: string; glow: string }
> = {
  Bronze: {
    label: 'Bronze',
    color: '#d97706',
    bgBadge: 'from-amber-950/80 to-amber-900/60',
    border: 'border-amber-700/80',
    glow: 'rgba(217, 119, 6, 0.3)',
  },
  Silver: {
    label: 'Silver',
    color: '#94a3b8',
    bgBadge: 'from-slate-900/80 to-slate-800/60',
    border: 'border-slate-400/80',
    glow: 'rgba(148, 163, 184, 0.35)',
  },
  Gold: {
    label: 'Gold',
    color: '#eab308',
    bgBadge: 'from-yellow-950/80 to-amber-900/60',
    border: 'border-yellow-400/80',
    glow: 'rgba(234, 179, 8, 0.45)',
  },
  Platinum: {
    label: 'Platinum',
    color: '#2dd4bf',
    bgBadge: 'from-teal-950/80 to-cyan-950/60',
    border: 'border-teal-400/80',
    glow: 'rgba(45, 212, 191, 0.45)',
  },
  Diamond: {
    label: 'Diamond',
    color: '#38bdf8',
    bgBadge: 'from-sky-950/80 to-blue-950/60',
    border: 'border-sky-400/80',
    glow: 'rgba(56, 189, 248, 0.55)',
  },
  Master: {
    label: 'Master',
    color: '#c084fc',
    bgBadge: 'from-purple-950/80 to-violet-950/60',
    border: 'border-purple-400/80',
    glow: 'rgba(192, 132, 252, 0.65)',
  },
  Grandmaster: {
    label: 'Grandmaster',
    color: '#f43f5e',
    bgBadge: 'from-rose-950/80 to-red-950/60',
    border: 'border-rose-400/80',
    glow: 'rgba(244, 63, 94, 0.75)',
  },
};
