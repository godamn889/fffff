import { Entity, RankTier, Team } from './types';

/**
 * Pure game rules, calculations, and mechanics formulas.
 * Completely decoupled from React and Canvas DOM for fast testing and deterministic outcomes.
 */

export const TIER_THRESHOLDS: { tier: RankTier; minRating: number; maxRating: number }[] = [
  { tier: 'Bronze', minRating: 0, maxRating: 1199 },
  { tier: 'Silver', minRating: 1200, maxRating: 1499 },
  { tier: 'Gold', minRating: 1500, maxRating: 1849 },
  { tier: 'Platinum', minRating: 1850, maxRating: 2199 },
  { tier: 'Diamond', minRating: 2200, maxRating: 2599 },
  { tier: 'Master', minRating: 2600, maxRating: 2999 },
  { tier: 'Grandmaster', minRating: 3000, maxRating: 99999 },
];

/**
 * Derives current tier and division from MMR rating points.
 */
export function getRankTierAndDivision(rating: number): { tier: RankTier; division: 1 | 2 | 3 } {
  const boundedRating = Math.max(0, rating);
  for (const t of TIER_THRESHOLDS) {
    if (boundedRating <= t.maxRating) {
      if (t.tier === 'Master' || t.tier === 'Grandmaster') {
        return { tier: t.tier, division: 1 };
      }
      const range = t.maxRating - t.minRating;
      const step = range / 3;
      const offset = boundedRating - t.minRating;
      if (offset < step) return { tier: t.tier, division: 3 };
      if (offset < step * 2) return { tier: t.tier, division: 2 };
      return { tier: t.tier, division: 1 };
    }
  }
  return { tier: 'Grandmaster', division: 1 };
}

/**
 * Calculates competitive Elo rating adjustment after an arena match.
 */
export function calculateRatingDelta(
  playerRating: number,
  enemyAvgRating: number,
  won: boolean,
  isMvp: boolean,
  winStreak: number
): number {
  const expectedWinProbability = 1 / (1 + Math.pow(10, (enemyAvgRating - playerRating) / 400));
  const kFactor = 32;
  const baseDelta = kFactor * ((won ? 1 : 0) - expectedWinProbability);

  let finalDelta = Math.round(baseDelta);

  if (won) {
    // Minimum +15 points on win
    finalDelta = Math.max(15, finalDelta);
    // MVP bonus points
    if (isMvp) finalDelta += 5;
    // Win streak bonus
    if (winStreak >= 3) finalDelta += Math.min(15, winStreak * 2);
  } else {
    // Loss penalty (maximum -28 to prevent extreme punishment, minimum -10)
    finalDelta = Math.min(-10, Math.max(-28, finalDelta));
    // MVP on losing team softens the loss
    if (isMvp) finalDelta += 4;
  }

  return finalDelta;
}

/**
 * Calculates damage mitigation after armor reduction.
 */
export function calculateDamage(
  baseDamage: number,
  targetArmor: number,
  isCrit: boolean = false,
  extraMultiplier: number = 1.0
): { finalDamage: number; isCrit: boolean } {
  // Armor mitigates damage: damage * (1 - armor/100), with maximum 65% mitigation
  const clampedArmor = Math.min(65, Math.max(0, targetArmor));
  const mitigation = 1 - clampedArmor / 100;
  const critMultiplier = isCrit ? 1.75 : 1.0;

  const raw = baseDamage * mitigation * critMultiplier * extraMultiplier;
  const finalDamage = Math.max(1, Math.round(raw));

  return { finalDamage, isCrit };
}

/**
 * Determines whether the attacker is striking the target from behind (Backstab angle).
 */
export function isAttackingFromBehind(
  attackerX: number,
  attackerY: number,
  targetX: number,
  targetY: number,
  targetFacingAngle: number
): boolean {
  // Angle from target towards attacker
  const dx = attackerX - targetX;
  const dy = attackerY - targetY;
  const angleToAttacker = Math.atan2(dy, dx);

  // Normalize angles to -PI .. PI
  let diff = angleToAttacker - targetFacingAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  // If attacker is within 70 degrees of target's direct rear (180 deg)
  return Math.abs(diff) > (Math.PI * 0.65);
}

/**
 * Checks if a circle intersects with an axis-aligned bounding box.
 */
export function circleIntersectsRect(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));

  const dx = cx - closestX;
  const dy = cy - closestY;

  return dx * dx + dy * dy < radius * radius;
}

/**
 * Computes 2D distance between points.
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Clamps a number between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Evaluates round status: if one team is entirely eliminated, returns the winning team.
 */
export function checkRoundOutcome(entities: Entity[]): Team | null {
  const blueAlive = entities.some(e => e.team === 'blue' && !e.isDead);
  const redAlive = entities.some(e => e.team === 'red' && !e.isDead);

  if (!blueAlive && redAlive) return 'red';
  if (!redAlive && blueAlive) return 'blue';
  return null;
}

/**
 * Evaluates match winner based on round score threshold.
 */
export function checkMatchOutcome(blueWins: number, redWins: number, targetWins: number): Team | null {
  if (blueWins >= targetWins) return 'blue';
  if (redWins >= targetWins) return 'red';
  return null;
}

/**
 * Finds the MVP entity among all participants based on combat performance.
 */
export function determineMvp(entities: Entity[], winningTeam: Team): Entity | null {
  if (entities.length === 0) return null;

  // Score formula: (kills * 100) + (damageDealt * 0.5) + (healingDone * 0.7) - (deaths * 40) + (teamBonus: +120)
  let bestEntity: Entity | null = null;
  let bestScore = -Infinity;

  for (const entity of entities) {
    const isWinner = entity.team === winningTeam;
    const score =
      entity.stats.kills * 120 +
      entity.stats.damageDealt * 0.5 +
      entity.stats.healingDone * 0.75 -
      entity.stats.deaths * 50 +
      (isWinner ? 100 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestEntity = entity;
    }
  }

  return bestEntity;
}
