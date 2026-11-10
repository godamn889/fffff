import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDamage,
  calculateRatingDelta,
  getRankTierAndDivision,
  checkRoundOutcome,
  checkMatchOutcome,
  circleIntersectsRect,
  isAttackingFromBehind,
  clamp,
} from './rules';
import { Entity } from './types';

test('getRankTierAndDivision calculates correct tier and division boundaries', () => {
  assert.deepEqual(getRankTierAndDivision(500), { tier: 'Bronze', division: 2 });
  assert.deepEqual(getRankTierAndDivision(1150), { tier: 'Bronze', division: 1 });
  assert.deepEqual(getRankTierAndDivision(1300), { tier: 'Silver', division: 2 });
  assert.deepEqual(getRankTierAndDivision(1600), { tier: 'Gold', division: 3 });
  assert.deepEqual(getRankTierAndDivision(1650), { tier: 'Gold', division: 2 });
  assert.deepEqual(getRankTierAndDivision(1780), { tier: 'Gold', division: 1 });
  assert.deepEqual(getRankTierAndDivision(2350), { tier: 'Diamond', division: 2 });
  assert.deepEqual(getRankTierAndDivision(3200), { tier: 'Grandmaster', division: 1 });
});

test('calculateRatingDelta awards positive RP on win with streak and MVP bonus', () => {
  const winDelta = calculateRatingDelta(1500, 1500, true, true, 4);
  assert.ok(winDelta >= 25, `Expected win delta to be >= 25, got ${winDelta}`);

  const lossDelta = calculateRatingDelta(1500, 1500, false, false, 0);
  assert.ok(lossDelta < 0, `Expected loss delta to be negative, got ${lossDelta}`);
});

test('calculateDamage applies armor reduction and critical multiplier', () => {
  // 100 base damage against 20% armor -> 80
  const normal = calculateDamage(100, 20, false);
  assert.equal(normal.finalDamage, 80);

  // Critical strike (1.75x) -> 80 * 1.75 = 140
  const crit = calculateDamage(100, 20, true);
  assert.equal(crit.finalDamage, 140);
});

test('isAttackingFromBehind detects rear flank angle correctly', () => {
  // Target is facing Right (angle = 0) at (100, 100)
  // Attacker is to the left at (50, 100) -> behind target!
  const isFlanking = isAttackingFromBehind(50, 100, 100, 100, 0);
  assert.equal(isFlanking, true);

  // Attacker is in front at (150, 100) -> in front of target
  const isFrontal = isAttackingFromBehind(150, 100, 100, 100, 0);
  assert.equal(isFrontal, false);
});

test('circleIntersectsRect detects collision and misses correctly', () => {
  // Rect at (100, 100) with width 50, height 50
  // Circle at (90, 110) with radius 15 -> overlaps left edge
  assert.equal(circleIntersectsRect(90, 110, 15, 100, 100, 50, 50), true);

  // Circle far away at (20, 20) with radius 10 -> no overlap
  assert.equal(circleIntersectsRect(20, 20, 10, 100, 100, 50, 50), false);
});

test('checkRoundOutcome identifies eliminated team', () => {
  const mockEntities: Entity[] = [
    {
      id: 'p1',
      team: 'blue',
      isPlayer: true,
      classType: 'knight',
      name: 'Player',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 16,
      facingAngle: 0,
      currentHp: 100,
      maxHp: 100,
      currentEnergy: 100,
      maxEnergy: 100,
      armor: 10,
      speed: 150,
      attackCooldownTimer: 0,
      skill1CooldownTimer: 0,
      skill2CooldownTimer: 0,
      isAttacking: false,
      attackPhaseTimer: 0,
      isDashing: false,
      dashTimer: 0,
      statusEffects: [],
      stats: { kills: 1, deaths: 0, damageDealt: 100, damageTaken: 20, healingDone: 0 },
      targetId: null,
      walkCycle: 0,
      isDead: false,
      deathTimer: 0,
    },
    {
      id: 'bot1',
      team: 'red',
      isPlayer: false,
      classType: 'ranger',
      name: 'Red Bot',
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 16,
      facingAngle: 0,
      currentHp: 0,
      maxHp: 100,
      currentEnergy: 100,
      maxEnergy: 100,
      armor: 10,
      speed: 150,
      attackCooldownTimer: 0,
      skill1CooldownTimer: 0,
      skill2CooldownTimer: 0,
      isAttacking: false,
      attackPhaseTimer: 0,
      isDashing: false,
      dashTimer: 0,
      statusEffects: [],
      stats: { kills: 0, deaths: 1, damageDealt: 20, damageTaken: 100, healingDone: 0 },
      targetId: null,
      walkCycle: 0,
      isDead: true,
      deathTimer: 1.0,
    },
  ];

  assert.equal(checkRoundOutcome(mockEntities), 'blue');
});

test('checkMatchOutcome checks target rounds reached', () => {
  assert.equal(checkMatchOutcome(2, 0, 2), 'blue');
  assert.equal(checkMatchOutcome(1, 2, 2), 'red');
  assert.equal(checkMatchOutcome(1, 1, 2), null);
});

test('clamp restricts numbers within bounds', () => {
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(7, 0, 10), 7);
});
