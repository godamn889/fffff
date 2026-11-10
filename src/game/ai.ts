/**
 * Autonomous AI Agent Engine for Bots in 1v1, 2v2, and 3v3 Arena Combat.
 * Implements class-specific decision trees, target selection, obstacle avoidance,
 * skill execution, and obedience to player tactical pings.
 */

import { Entity, GameMode, Obstacle, PowerUp, TacticalPing } from './types';
import { distance, isAttackingFromBehind } from './rules';

export interface AIContext {
  dt: number;
  entities: Entity[];
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  activePing: { type: TacticalPing; targetId?: string; x?: number; y?: number; timer: number } | null;
  mapWidth: number;
  mapHeight: number;
}

export function updateBotAI(bot: Entity, ctx: AIContext): {
  moveX: number;
  moveY: number;
  aimAngle: number;
  triggerAttack: boolean;
  triggerSkill1: boolean;
  triggerSkill2: boolean;
} {
  // If stunned or dead, cannot act
  if (bot.isDead || bot.statusEffects.some(s => s.type === 'stunned')) {
    return { moveX: 0, moveY: 0, aimAngle: bot.facingAngle, triggerAttack: false, triggerSkill1: false, triggerSkill2: false };
  }

  const allies = ctx.entities.filter(e => e.team === bot.team && !e.isDead && e.id !== bot.id);
  const enemies = ctx.entities.filter(e => e.team !== bot.team && !e.isDead);

  // If no enemies remain, idle / celebrate
  if (enemies.length === 0) {
    return { moveX: 0, moveY: 0, aimAngle: bot.facingAngle, triggerAttack: false, triggerSkill1: false, triggerSkill2: false };
  }

  // 1. Select Target
  let target = selectTarget(bot, enemies, ctx);
  if (!target) {
    target = enemies[0];
  }

  // 2. Tactical Ping overrides
  let pingOverrideX: number | null = null;
  let pingOverrideY: number | null = null;
  if (ctx.activePing && bot.team === 'blue') {
    if (ctx.activePing.type === 'focus' && ctx.activePing.targetId) {
      const pingedEnemy = enemies.find(e => e.id === ctx.activePing!.targetId);
      if (pingedEnemy) target = pingedEnemy;
    } else if (ctx.activePing.type === 'rally' && ctx.activePing.x !== undefined) {
      pingOverrideX = ctx.activePing.x;
      pingOverrideY = ctx.activePing.y!;
    } else if (ctx.activePing.type === 'retreat') {
      // Fall back towards blue spawn (x: 100, y: bot.y)
      pingOverrideX = 120;
      pingOverrideY = bot.y;
    }
  }

  // 3. Health Powerup seeking if critically wounded
  const hpPercent = bot.currentHp / bot.maxHp;
  if (hpPercent < 0.35 && !pingOverrideX) {
    const activeHealthPack = ctx.powerUps.find(p => p.active && p.type === 'health');
    if (activeHealthPack && distance(bot.x, bot.y, activeHealthPack.x, activeHealthPack.y) < 450) {
      pingOverrideX = activeHealthPack.x;
      pingOverrideY = activeHealthPack.y;
    }
  }

  // 4. Determine movement intent based on class role
  const distToTarget = distance(bot.x, bot.y, target.x, target.y);
  let desiredDx = 0;
  let desiredDy = 0;

  if (pingOverrideX !== null && pingOverrideY !== null) {
    desiredDx = pingOverrideX - bot.x;
    desiredDy = pingOverrideY - bot.y;
  } else {
    switch (bot.classType) {
      case 'knight':
        // Melee frontliner: close in aggressively
        desiredDx = target.x - bot.x;
        desiredDy = target.y - bot.y;
        break;

      case 'ranger': {
        // Marksman: optimal distance 240px. If closer, kite away; if farther, advance
        const optimalDist = 240;
        if (distToTarget < 150) {
          // Kite backward away from target
          desiredDx = -(target.x - bot.x);
          desiredDy = -(target.y - bot.y);
        } else if (distToTarget > optimalDist + 50) {
          desiredDx = target.x - bot.x;
          desiredDy = target.y - bot.y;
        } else {
          // Circle / strafe target
          desiredDx = -(target.y - bot.y);
          desiredDy = target.x - bot.x;
        }
        break;
      }

      case 'pyromancer':
      case 'cryomancer': {
        // Mages: optimal distance 200px
        const optimalDist = 210;
        if (distToTarget < 140) {
          desiredDx = -(target.x - bot.x);
          desiredDy = -(target.y - bot.y);
        } else if (distToTarget > optimalDist + 60) {
          desiredDx = target.x - bot.x;
          desiredDy = target.y - bot.y;
        } else {
          // Strafe
          desiredDx = -(target.y - bot.y) * 0.7;
          desiredDy = (target.x - bot.x) * 0.7;
        }
        break;
      }

      case 'assassin': {
        // Flanker: if in stealth or target is distracted, dive in behind target
        const isBehind = isAttackingFromBehind(bot.x, bot.y, target.x, target.y, target.facingAngle);
        if (isBehind || distToTarget < 80) {
          // Strike directly
          desiredDx = target.x - bot.x;
          desiredDy = target.y - bot.y;
        } else {
          // Arc around to get behind target
          const rearAngle = target.facingAngle + Math.PI;
          const rearX = target.x + Math.cos(rearAngle) * 70;
          const rearY = target.y + Math.sin(rearAngle) * 70;
          desiredDx = rearX - bot.x;
          desiredDy = rearY - bot.y;
        }
        break;
      }

      case 'paladin': {
        // Bruiser/Support: stay near wounded allies, or engage enemy
        const lowestAlly = allies.reduce<Entity | null>((acc, a) => {
          if (!acc || (a.currentHp / a.maxHp) < (acc.currentHp / acc.maxHp)) return a;
          return acc;
        }, null);

        if (lowestAlly && (lowestAlly.currentHp / lowestAlly.maxHp) < 0.5) {
          // Move towards ally to protect/heal
          desiredDx = lowestAlly.x - bot.x;
          desiredDy = lowestAlly.y - bot.y;
        } else {
          desiredDx = target.x - bot.x;
          desiredDy = target.y - bot.y;
        }
        break;
      }
    }
  }

  // 5. Obstacle Avoidance (Raycasting Repulsor Vector)
  let avoidX = 0;
  let avoidY = 0;
  for (const obs of ctx.obstacles) {
    const obsCenterX = obs.x + obs.width / 2;
    const obsCenterY = obs.y + obs.height / 2;
    const d = distance(bot.x, bot.y, obsCenterX, obsCenterY);
    const repulseDist = Math.max(obs.width, obs.height) / 2 + bot.radius + 20;
    if (d < repulseDist) {
      const force = (repulseDist - d) / repulseDist;
      avoidX += (bot.x - obsCenterX) * force * 2.5;
      avoidY += (bot.y - obsCenterY) * force * 2.5;
    }
  }

  // Arena wall boundary avoidance
  const margin = 50;
  if (bot.x < margin) avoidX += (margin - bot.x) * 2;
  if (bot.x > ctx.mapWidth - margin) avoidX -= (bot.x - (ctx.mapWidth - margin)) * 2;
  if (bot.y < margin) avoidY += (margin - bot.y) * 2;
  if (bot.y > ctx.mapHeight - margin) avoidY -= (bot.y - (ctx.mapHeight - margin)) * 2;

  // Combine desired direction with obstacle avoidance
  let moveDirX = desiredDx + avoidX;
  let moveDirY = desiredDy + avoidY;
  const moveLen = Math.hypot(moveDirX, moveDirY);
  if (moveLen > 0.001) {
    moveDirX /= moveLen;
    moveDirY /= moveLen;
  }

  // 6. Aim Angle (Predictive lead for ranged, direct for melee)
  let aimAngle = Math.atan2(target.y - bot.y, target.x - bot.x);
  if (bot.classType === 'ranger' || bot.classType === 'pyromancer' || bot.classType === 'cryomancer') {
    // Predictive lead
    const bulletSpeed = 420;
    const travelTime = distToTarget / bulletSpeed;
    const leadX = target.x + target.vx * travelTime * 0.65;
    const leadY = target.y + target.vy * travelTime * 0.65;
    aimAngle = Math.atan2(leadY - bot.y, leadX - bot.x);
  }

  // 7. Decide Attack and Skills
  let triggerAttack = false;
  let triggerSkill1 = false;
  let triggerSkill2 = false;

  // Primary attack trigger
  const inRange = distToTarget <= bot.radius + target.radius + (bot.classType === 'knight' || bot.classType === 'paladin' || bot.classType === 'assassin' ? 45 : 320);
  if (inRange && bot.attackCooldownTimer <= 0) {
    triggerAttack = true;
  }

  // Skill 1 decisions
  if (bot.skill1CooldownTimer <= 0) {
    switch (bot.classType) {
      case 'knight':
        // Shield charge when target is 100-240px away to close gap
        if (distToTarget > 90 && distToTarget < 240) triggerSkill1 = true;
        break;
      case 'ranger':
        // Tumble when enemy gets dangerously close
        if (distToTarget < 120) triggerSkill1 = true;
        break;
      case 'pyromancer':
        // Flame blink when low HP or melee enemy rushes close
        if (distToTarget < 110 || hpPercent < 0.35) triggerSkill1 = true;
        break;
      case 'assassin':
        // Smoke shroud to engage stealth before striking
        if (distToTarget > 120 && distToTarget < 300) triggerSkill1 = true;
        break;
      case 'paladin': {
        // Holy sanctuary when self or nearby ally is hurt
        const woundedAllyNearby = allies.some(a => distance(bot.x, bot.y, a.x, a.y) < 180 && a.currentHp / a.maxHp < 0.65);
        if (hpPercent < 0.65 || woundedAllyNearby) triggerSkill1 = true;
        break;
      }
      case 'cryomancer':
        // Frost nova when enemies are close
        if (distToTarget < 130) triggerSkill1 = true;
        break;
    }
  }

  // Skill 2 decisions (High impact / Ultimate)
  if (bot.skill2CooldownTimer <= 0) {
    switch (bot.classType) {
      case 'knight':
        // Whirlwind when adjacent to target or multiple foes
        if (distToTarget < 75) triggerSkill2 = true;
        break;
      case 'ranger':
        // Rain of arrows when target in medium range
        if (distToTarget > 130 && distToTarget < 320) triggerSkill2 = true;
        break;
      case 'pyromancer':
        // Meteor Cataclysm at target position
        if (distToTarget > 120 && distToTarget < 320) triggerSkill2 = true;
        break;
      case 'assassin':
        // Shadow strike to execute target
        if (distToTarget > 80 && distToTarget < 250) triggerSkill2 = true;
        break;
      case 'paladin':
        // Judgement hammer
        if (distToTarget < 220) triggerSkill2 = true;
        break;
      case 'cryomancer':
        // Glacial blizzard
        if (distToTarget < 260) triggerSkill2 = true;
        break;
    }
  }

  return {
    moveX: moveDirX,
    moveY: moveDirY,
    aimAngle,
    triggerAttack,
    triggerSkill1,
    triggerSkill2,
  };
}

/**
 * Intelligent Target Selection:
 * Evaluates threat priority based on health, role, proximity, and player priority.
 */
function selectTarget(bot: Entity, enemies: Entity[], ctx: AIContext): Entity | null {
  if (enemies.length === 0) return null;

  let bestTarget: Entity | null = null;
  let highestScore = -Infinity;

  for (const enemy of enemies) {
    const dist = distance(bot.x, bot.y, enemy.x, enemy.y);
    const hpRatio = enemy.currentHp / enemy.maxHp;

    // Base score from proximity (closer = higher)
    let score = 1000 - dist;

    // High priority on low HP enemies (execute potential)
    score += (1 - hpRatio) * 400;

    // Class specific preferences
    if (bot.classType === 'assassin') {
      // Assassins prioritize squishy ranged/casters
      if (enemy.classType === 'ranger' || enemy.classType === 'pyromancer' || enemy.classType === 'cryomancer') {
        score += 350;
      }
    } else if (bot.classType === 'knight') {
      // Knights prioritize the enemy closest to their squishy teammates
      score += 150;
    }

    // Ping priority
    if (ctx.activePing?.type === 'focus' && ctx.activePing.targetId === enemy.id) {
      score += 800;
    }

    if (score > highestScore) {
      highestScore = score;
      bestTarget = enemy;
    }
  }

  return bestTarget;
}
