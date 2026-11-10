/**
 * Complete 60fps Decoupled Simulation & Physics Engine
 * Handles entities, abilities, projectiles, pooled particles, floating combat text,
 * obstacle collisions, powerups, rounds, and audio feedback.
 */

import { CLASSES } from './classes';
import { MAPS } from './maps';
import { calculateDamage, checkMatchOutcome, checkRoundOutcome, circleIntersectsRect, clamp, determineMvp, distance, isAttackingFromBehind } from './rules';
import { ArenaMap, ClassType, Entity, FloatingText, GameMode, MapId, Particle, PowerUp, Projectile, TacticalPing, Team } from './types';
import { sound } from './audio';
import { drawCharacterSprite, drawObstacle, drawPowerUp, drawProjectile } from './pixelArt';
import { updateBotAI } from './ai';

export interface EngineCallbacks {
  onHudUpdate: (data: HudData) => void;
  onMatchComplete: (result: MatchResult) => void;
  onRoundChange: (roundNumber: number, blueWins: number, redWins: number) => void;
}

export interface HudData {
  playerHp: number;
  playerMaxHp: number;
  playerEnergy: number;
  playerMaxEnergy: number;
  skill1CooldownRemaining: number;
  skill2CooldownRemaining: number;
  skill1CooldownMax: number;
  skill2CooldownMax: number;
  blueScore: number;
  redScore: number;
  roundNumber: number;
  roundTimeRemaining: number;
  blueRoster: { id: string; name: string; classType: ClassType; hp: number; maxHp: number; isDead: boolean; isPlayer: boolean }[];
  redRoster: { id: string; name: string; classType: ClassType; hp: number; maxHp: number; isDead: boolean }[];
  activePing: { type: TacticalPing; text: string } | null;
}

export interface MatchResult {
  winner: Team;
  playerWon: boolean;
  blueScore: number;
  redScore: number;
  mvp: Entity;
  entities: Entity[];
  playerStats: Entity['stats'];
  matchDuration: number;
}

const MAX_PARTICLES = 250;
const MAX_FLOATING_TEXT = 40;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  // Arena & Mode
  private map: ArenaMap;
  private mode: GameMode;
  private playerClass: ClassType;
  private targetWins: number = 2; // Best of 3 (first to 2 wins)

  // Simulation State
  private entities: Entity[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private powerUps: PowerUp[] = [];

  // Round Management
  private blueWins: number = 0;
  private redWins: number = 0;
  private roundNumber: number = 1;
  private roundTimer: number = 90; // seconds
  private roundState: 'intermission' | 'active' | 'round_over' | 'match_over' = 'intermission';
  private roundStateTimer: number = 2.0; // countdown before round starts
  private roundBannerText: string = 'ROUND 1 - FIGHT!';

  // Juice & Feedback
  private hitstopTimer: number = 0;
  private screenShakeTrauma: number = 0;
  private gameTime: number = 0;
  private totalMatchTime: number = 0;

  // Tactical Pings
  private activePing: { type: TacticalPing; targetId?: string; x?: number; y?: number; timer: number } | null = null;

  // Input State
  private keysHeld: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseDown: boolean = false;

  // Loop control
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private hudThrottleTimer: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    mapId: MapId,
    mode: GameMode,
    playerClass: ClassType,
    botBlueClasses: ClassType[],
    botRedClasses: ClassType[],
    callbacks: EngineCallbacks
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2d context');
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;

    this.map = MAPS[mapId] || MAPS.courtyard;
    this.mode = mode;
    this.playerClass = playerClass;
    this.callbacks = callbacks;

    // Initialize participants
    this.setupRosters(botBlueClasses, botRedClasses);

    // Initialize particles ring buffer
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: '#fff',
        alpha: 0,
      });
    }

    // Attach Input Listeners
    this.attachInputs();
  }

  private setupRosters(botBlueClasses: ClassType[], botRedClasses: ClassType[]) {
    this.entities = [];
    const classDef = CLASSES[this.playerClass];

    // 1. Create Human Player
    const player: Entity = {
      id: 'player',
      team: 'blue',
      isPlayer: true,
      classType: this.playerClass,
      name: 'YOU',
      x: this.map.spawns.blue[0].x,
      y: this.map.spawns.blue[0].y,
      vx: 0,
      vy: 0,
      radius: 14,
      facingAngle: 0,
      currentHp: classDef.baseHp,
      maxHp: classDef.baseHp,
      currentEnergy: 100,
      maxEnergy: 100,
      armor: classDef.armor,
      speed: classDef.speed,
      attackCooldownTimer: 0,
      skill1CooldownTimer: 0,
      skill2CooldownTimer: 0,
      isAttacking: false,
      attackPhaseTimer: 0,
      isDashing: false,
      dashTimer: 0,
      statusEffects: [],
      stats: { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, healingDone: 0 },
      targetId: null,
      walkCycle: 0,
      isDead: false,
      deathTimer: 0,
    };
    this.entities.push(player);

    // 2. Create Blue Bot Teammates
    botBlueClasses.forEach((cls, idx) => {
      const def = CLASSES[cls];
      const spawn = this.map.spawns.blue[idx + 1] || this.map.spawns.blue[0];
      const botNames = ['Cobalt', 'Lapis', 'Sapphire'];
      this.entities.push({
        id: `blue-bot-${idx}`,
        team: 'blue',
        isPlayer: false,
        classType: cls,
        name: botNames[idx % botNames.length],
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        radius: 14,
        facingAngle: 0,
        currentHp: def.baseHp,
        maxHp: def.baseHp,
        currentEnergy: 100,
        maxEnergy: 100,
        armor: def.armor,
        speed: def.speed,
        attackCooldownTimer: 0,
        skill1CooldownTimer: 0,
        skill2CooldownTimer: 0,
        isAttacking: false,
        attackPhaseTimer: 0,
        isDashing: false,
        dashTimer: 0,
        statusEffects: [],
        stats: { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, healingDone: 0 },
        targetId: null,
        walkCycle: 0,
        isDead: false,
        deathTimer: 0,
      });
    });

    // 3. Create Red Bot Enemies
    const redNames = ['Crimson', 'Viper', 'Scarlet'];
    botRedClasses.forEach((cls, idx) => {
      const def = CLASSES[cls];
      const spawn = this.map.spawns.red[idx] || this.map.spawns.red[0];
      this.entities.push({
        id: `red-bot-${idx}`,
        team: 'red',
        isPlayer: false,
        classType: cls,
        name: redNames[idx % redNames.length],
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        radius: 14,
        facingAngle: Math.PI,
        currentHp: def.baseHp,
        maxHp: def.baseHp,
        currentEnergy: 100,
        maxEnergy: 100,
        armor: def.armor,
        speed: def.speed,
        attackCooldownTimer: 0,
        skill1CooldownTimer: 0,
        skill2CooldownTimer: 0,
        isAttacking: false,
        attackPhaseTimer: 0,
        isDashing: false,
        dashTimer: 0,
        statusEffects: [],
        stats: { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, healingDone: 0 },
        targetId: null,
        walkCycle: 0,
        isDead: false,
        deathTimer: 0,
      });
    });

    // Reset powerups
    this.powerUps = JSON.parse(JSON.stringify(this.map.powerUps));
  }

  private resetRoundPositions() {
    let blueIdx = 0;
    let redIdx = 0;
    for (const ent of this.entities) {
      const def = CLASSES[ent.classType];
      ent.isDead = false;
      ent.deathTimer = 0;
      ent.currentHp = def.baseHp;
      ent.currentEnergy = 100;
      ent.vx = 0;
      ent.vy = 0;
      ent.statusEffects = [];
      ent.attackCooldownTimer = 0;
      ent.skill1CooldownTimer = 0;
      ent.skill2CooldownTimer = 0;
      ent.isAttacking = false;
      ent.isDashing = false;

      if (ent.team === 'blue') {
        const spawn = this.map.spawns.blue[blueIdx++] || this.map.spawns.blue[0];
        ent.x = spawn.x;
        ent.y = spawn.y;
        ent.facingAngle = 0;
      } else {
        const spawn = this.map.spawns.red[redIdx++] || this.map.spawns.red[0];
        ent.x = spawn.x;
        ent.y = spawn.y;
        ent.facingAngle = Math.PI;
      }
    }

    this.projectiles = [];
    this.powerUps = JSON.parse(JSON.stringify(this.map.powerUps));
    this.roundTimer = 90;
    this.roundState = 'intermission';
    this.roundStateTimer = 2.0;
    this.roundBannerText = `ROUND ${this.roundNumber} - FIGHT!`;
    this.activePing = null;
  }

  // --- Input Management ---

  private onKeyDown = (e: KeyboardEvent) => {
    // Esc / P for pause
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      this.togglePause();
      return;
    }

    this.keysHeld.add(e.key.toLowerCase());

    // Tactical Pings
    if (e.key === 'f' || e.key === 'F') {
      this.triggerTacticalPing('focus');
    } else if (e.key === 'c' || e.key === 'C') {
      this.triggerTacticalPing('rally');
    } else if (e.key === 'v' || e.key === 'V') {
      this.triggerTacticalPing('retreat');
    }

    // Ability hotkeys
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.triggerPlayerSkill1();
    } else if (e.key === 'e' || e.key === 'E') {
      this.triggerPlayerSkill2();
    } else if (e.key === 'q' || e.key === 'Q') {
      this.triggerPlayerSkill1();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.key.toLowerCase());
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouseX = (e.clientX - rect.left) * scaleX;
    this.mouseY = (e.clientY - rect.top) * scaleY;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = true;
      this.triggerPlayerPrimaryAttack();
    } else if (e.button === 2) {
      e.preventDefault();
      this.triggerPlayerSkill1();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isMouseDown = false;
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private onBlur = () => {
    this.keysHeld.clear();
    this.isMouseDown = false;
  };

  private attachInputs() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('blur', this.onBlur);
  }

  public destroy() {
    this.isRunning = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('blur', this.onBlur);
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    document.body.dataset.state = this.isPaused ? 'paused' : 'playing';
    return this.isPaused;
  }

  public setPaused(p: boolean) {
    this.isPaused = p;
    document.body.dataset.state = this.isPaused ? 'paused' : 'playing';
  }

  // --- Tactical Pings ---

  public triggerTacticalPing(type: TacticalPing) {
    const player = this.entities.find(e => e.isPlayer);
    if (!player || player.isDead) return;

    sound.playPing();

    if (type === 'focus') {
      // Find enemy closest to cursor
      const enemies = this.entities.filter(e => e.team === 'red' && !e.isDead);
      let closest: Entity | null = null;
      let minDist = 180;
      for (const enemy of enemies) {
        const d = distance(this.mouseX, this.mouseY, enemy.x, enemy.y);
        if (d < minDist) {
          minDist = d;
          closest = enemy;
        }
      }
      this.activePing = {
        type: 'focus',
        targetId: closest?.id,
        x: closest ? closest.x : this.mouseX,
        y: closest ? closest.y : this.mouseY,
        timer: 4.0,
      };
      this.spawnFloatingText(this.activePing.x!, this.activePing.y!, 'FOCUS TARGET!', '#facc15');
    } else if (type === 'rally') {
      this.activePing = {
        type: 'rally',
        x: player.x,
        y: player.y,
        timer: 4.0,
      };
      this.spawnFloatingText(player.x, player.y - 20, 'RALLY HERE!', '#38bdf8');
    } else if (type === 'retreat') {
      this.activePing = {
        type: 'retreat',
        timer: 3.5,
      };
      this.spawnFloatingText(player.x, player.y - 20, 'RETREAT / FALL BACK!', '#ef4444');
    }
  }

  // --- Player Verbs ---

  public triggerPlayerPrimaryAttack() {
    const player = this.entities.find(e => e.isPlayer);
    if (!player || player.isDead || this.isPaused || this.roundState !== 'active') return;
    if (player.attackCooldownTimer > 0) return;

    const angle = Math.atan2(this.mouseY - player.y, this.mouseX - player.x);
    this.executeAttack(player, angle);
  }

  public triggerPlayerSkill1() {
    const player = this.entities.find(e => e.isPlayer);
    if (!player || player.isDead || this.isPaused || this.roundState !== 'active') return;
    if (player.skill1CooldownTimer > 0) return;

    const angle = Math.atan2(this.mouseY - player.y, this.mouseX - player.x);
    this.executeSkill1(player, angle);
  }

  public triggerPlayerSkill2() {
    const player = this.entities.find(e => e.isPlayer);
    if (!player || player.isDead || this.isPaused || this.roundState !== 'active') return;
    if (player.skill2CooldownTimer > 0) return;

    const angle = Math.atan2(this.mouseY - player.y, this.mouseX - player.x);
    this.executeSkill2(player, angle);
  }

  // --- Combat Execution ---

  private executeAttack(attacker: Entity, angle: number) {
    const def = CLASSES[attacker.classType];
    attacker.attackCooldownTimer = def.attackCooldown;
    attacker.facingAngle = angle;
    attacker.isAttacking = true;
    attacker.attackPhaseTimer = 0.18;

    if (def.attackType === 'melee') {
      // Melee swing arc
      sound.playSlash();
      this.spawnSwingParticles(attacker, angle);

      // Hit check for enemies in front within range
      const enemies = this.entities.filter(e => e.team !== attacker.team && !e.isDead);
      for (const enemy of enemies) {
        const d = distance(attacker.x, attacker.y, enemy.x, enemy.y);
        if (d <= def.attackRange + enemy.radius) {
          // Check angle cone (within ~75 degrees of facing)
          const angleToEnemy = Math.atan2(enemy.y - attacker.y, enemy.x - attacker.x);
          let diff = angleToEnemy - angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          if (Math.abs(diff) < Math.PI * 0.42) {
            // Check backstab for Assassin
            let isCrit = false;
            let mult = 1.0;
            if (attacker.classType === 'assassin') {
              const fromBehind = isAttackingFromBehind(attacker.x, attacker.y, enemy.x, enemy.y, enemy.facingAngle);
              const fromStealth = attacker.statusEffects.some(s => s.type === 'invisible');
              if (fromBehind || fromStealth) {
                isCrit = true;
                mult = 2.0;
              }
            }

            this.applyDamage(attacker, enemy, def.attackDamage, isCrit, mult, 'physical');

            // Paladin Passive: Radiant Aura heals lowest ally on hit
            if (attacker.classType === 'paladin') {
              const allies = this.entities.filter(e => e.team === attacker.team && !e.isDead);
              const lowest = allies.reduce<Entity | null>((acc, a) => {
                if (!acc || a.currentHp < acc.currentHp) return a;
                return acc;
              }, null);
              if (lowest && lowest.currentHp < lowest.maxHp) {
                const healAmt = 15;
                lowest.currentHp = Math.min(lowest.maxHp, lowest.currentHp + healAmt);
                attacker.stats.healingDone += healAmt;
                this.spawnFloatingText(lowest.x, lowest.y - 15, `+${healAmt}`, '#86efac');
                sound.playHeal();
              }
            }
          }
        }
      }
    } else {
      // Ranged projectile
      if (attacker.classType === 'ranger') {
        sound.playArrowShoot();
        this.projectiles.push({
          id: `proj-${Date.now()}-${Math.random()}`,
          ownerId: attacker.id,
          team: attacker.team,
          x: attacker.x + Math.cos(angle) * 16,
          y: attacker.y + Math.sin(angle) * 16,
          vx: Math.cos(angle) * 520,
          vy: Math.sin(angle) * 520,
          radius: 6,
          damage: def.attackDamage,
          element: 'physical',
          rangeRemaining: def.attackRange,
          piercing: false,
          isSplash: false,
          splashRadius: 0,
          color: '#e2e8f0',
        });
      } else if (attacker.classType === 'pyromancer') {
        sound.playFireball();
        this.projectiles.push({
          id: `proj-${Date.now()}-${Math.random()}`,
          ownerId: attacker.id,
          team: attacker.team,
          x: attacker.x + Math.cos(angle) * 16,
          y: attacker.y + Math.sin(angle) * 16,
          vx: Math.cos(angle) * 440,
          vy: Math.sin(angle) * 440,
          radius: 8,
          damage: def.attackDamage,
          element: 'fire',
          rangeRemaining: def.attackRange,
          piercing: false,
          isSplash: true,
          splashRadius: 36,
          color: '#ea580c',
        });
      } else if (attacker.classType === 'cryomancer') {
        sound.playIceSpell();
        this.projectiles.push({
          id: `proj-${Date.now()}-${Math.random()}`,
          ownerId: attacker.id,
          team: attacker.team,
          x: attacker.x + Math.cos(angle) * 16,
          y: attacker.y + Math.sin(angle) * 16,
          vx: Math.cos(angle) * 460,
          vy: Math.sin(angle) * 460,
          radius: 7,
          damage: def.attackDamage,
          element: 'ice',
          rangeRemaining: def.attackRange,
          piercing: false,
          isSplash: false,
          splashRadius: 0,
          color: '#67e8f9',
        });
      }
    }
  }

  private executeSkill1(attacker: Entity, angle: number) {
    const def = CLASSES[attacker.classType];
    attacker.skill1CooldownTimer = def.skill1.cooldown;
    attacker.facingAngle = angle;

    switch (attacker.classType) {
      case 'knight':
        // Shield Charge: Dash forward with stun hitbox
        sound.playDash();
        attacker.isDashing = true;
        attacker.dashTimer = 0.28;
        attacker.vx = Math.cos(angle) * 620;
        attacker.vy = Math.sin(angle) * 620;
        this.spawnBurst(attacker.x, attacker.y, '#38bdf8', 12);
        break;

      case 'ranger':
        // Tumble roll backward/sideways and drop caltrops
        sound.playDash();
        attacker.isDashing = true;
        attacker.dashTimer = 0.22;
        attacker.vx = -Math.cos(angle) * 500;
        attacker.vy = -Math.sin(angle) * 500;
        this.spawnBurst(attacker.x, attacker.y, '#86efac', 10);
        // Caltrops slow nearby pursuers
        this.entities.filter(e => e.team !== attacker.team && distance(attacker.x, attacker.y, e.x, e.y) < 90)
          .forEach(e => {
            e.statusEffects.push({ type: 'chilled', duration: 2.5 });
            this.spawnFloatingText(e.x, e.y - 10, 'SLOWED!', '#86efac');
          });
        break;

      case 'pyromancer':
        // Flame Blink teleport
        sound.playDash();
        this.spawnBurst(attacker.x, attacker.y, '#f97316', 16);
        // Teleport 160px forward
        const targetX = clamp(attacker.x + Math.cos(angle) * 160, 40, this.map.width - 40);
        const targetY = clamp(attacker.y + Math.sin(angle) * 160, 40, this.map.height - 40);
        attacker.x = targetX;
        attacker.y = targetY;
        this.spawnBurst(attacker.x, attacker.y, '#f97316', 16);
        // Ignite enemies at destination
        this.entities.filter(e => e.team !== attacker.team && distance(attacker.x, attacker.y, e.x, e.y) < 70)
          .forEach(e => {
            e.statusEffects.push({ type: 'burning', duration: 3.0 });
            this.applyDamage(attacker, e, 30, false, 1.0, 'fire');
          });
        break;

      case 'assassin':
        // Smoke Shroud: Stealth invisibility + speed
        sound.playDash();
        this.spawnBurst(attacker.x, attacker.y, '#a855f7', 20);
        attacker.statusEffects.push({ type: 'invisible', duration: 2.5 });
        attacker.statusEffects.push({ type: 'haste', duration: 2.5 });
        this.spawnFloatingText(attacker.x, attacker.y - 15, 'STEALTH!', '#c084fc');
        break;

      case 'paladin': {
        // Holy Sanctuary: Area heal and cleanse
        sound.playHeal();
        this.spawnBurst(attacker.x, attacker.y, '#facc15', 24);
        const allies = this.entities.filter(e => e.team === attacker.team && distance(attacker.x, attacker.y, e.x, e.y) < 180);
        for (const ally of allies) {
          const heal = 85;
          ally.currentHp = Math.min(ally.maxHp, ally.currentHp + heal);
          ally.statusEffects = ally.statusEffects.filter(s => s.type !== 'burning' && s.type !== 'chilled' && s.type !== 'stunned');
          attacker.stats.healingDone += heal;
          this.spawnFloatingText(ally.x, ally.y - 15, `+${heal} HP`, '#facc15');
        }
        break;
      }

      case 'cryomancer':
        // Frost Nova: Freeze surrounding enemies
        sound.playIceSpell();
        this.spawnBurst(attacker.x, attacker.y, '#67e8f9', 24);
        this.entities.filter(e => e.team !== attacker.team && distance(attacker.x, attacker.y, e.x, e.y) < 120)
          .forEach(e => {
            e.statusEffects.push({ type: 'stunned', duration: 1.4 });
            this.applyDamage(attacker, e, 35, false, 1.0, 'ice');
            this.spawnFloatingText(e.x, e.y - 15, 'FROZEN!', '#67e8f9');
          });
        break;
    }
  }

  private executeSkill2(attacker: Entity, angle: number) {
    const def = CLASSES[attacker.classType];
    attacker.skill2CooldownTimer = def.skill2.cooldown;
    attacker.facingAngle = angle;

    switch (attacker.classType) {
      case 'knight':
        // Whirlwind: Spin twice, hit all adjacent enemies
        sound.playSlash();
        this.screenShakeTrauma = Math.min(1.0, this.screenShakeTrauma + 0.35);
        this.spawnBurst(attacker.x, attacker.y, '#38bdf8', 25);
        this.entities.filter(e => e.team !== attacker.team && distance(attacker.x, attacker.y, e.x, e.y) < 95)
          .forEach(e => {
            this.applyDamage(attacker, e, 90, false, 1.0, 'physical');
            this.spawnFloatingText(e.x, e.y - 10, 'WHIRLWIND!', '#38bdf8');
          });
        break;

      case 'ranger':
        // Rain of Arrows: Cone volley of 7 piercing arrows
        sound.playArrowShoot();
        for (let i = -3; i <= 3; i++) {
          const spreadAngle = angle + (i * Math.PI) / 22;
          this.projectiles.push({
            id: `proj-${Date.now()}-${i}`,
            ownerId: attacker.id,
            team: attacker.team,
            x: attacker.x + Math.cos(spreadAngle) * 16,
            y: attacker.y + Math.sin(spreadAngle) * 16,
            vx: Math.cos(spreadAngle) * 580,
            vy: Math.sin(spreadAngle) * 580,
            radius: 5,
            damage: 28,
            element: 'physical',
            rangeRemaining: 400,
            piercing: true,
            isSplash: false,
            splashRadius: 0,
            color: '#86efac',
          });
        }
        break;

      case 'pyromancer':
        // Meteor Cataclysm: Target area explosion
        sound.playFireball();
        this.screenShakeTrauma = Math.min(1.0, this.screenShakeTrauma + 0.5);
        const meteorX = clamp(this.mouseX || (attacker.x + Math.cos(angle) * 180), 60, this.map.width - 60);
        const meteorY = clamp(this.mouseY || (attacker.y + Math.sin(angle) * 180), 60, this.map.height - 60);
        this.spawnBurst(meteorX, meteorY, '#ea580c', 35);
        this.entities.filter(e => e.team !== attacker.team && distance(meteorX, meteorY, e.x, e.y) < 110)
          .forEach(e => {
            this.applyDamage(attacker, e, 95, true, 1.0, 'fire');
            e.statusEffects.push({ type: 'burning', duration: 3.5 });
            this.spawnFloatingText(e.x, e.y - 15, 'METEOR CRIT!', '#f97316');
          });
        break;

      case 'assassin': {
        // Shadow Strike: teleport behind enemy and strike
        const enemies = this.entities.filter(e => e.team !== attacker.team && !e.isDead);
        const target = enemies.reduce<Entity | null>((acc, e) => {
          const d = distance(attacker.x, attacker.y, e.x, e.y);
          if (!acc || d < distance(attacker.x, attacker.y, acc.x, acc.y)) return e;
          return acc;
        }, null);

        if (target) {
          sound.playDash();
          this.spawnBurst(attacker.x, attacker.y, '#a855f7', 15);
          const rearAngle = target.facingAngle + Math.PI;
          attacker.x = target.x + Math.cos(rearAngle) * 35;
          attacker.y = target.y + Math.sin(rearAngle) * 35;
          attacker.facingAngle = target.facingAngle;
          this.spawnBurst(attacker.x, attacker.y, '#a855f7', 15);
          this.applyDamage(attacker, target, 85, true, 1.25, 'shadow');
          this.spawnFloatingText(target.x, target.y - 15, 'ASSASSINATE!', '#c084fc');
        }
        break;
      }

      case 'paladin':
        // Judgement Hammer: Throw hammer and shield allies
        sound.playShieldBlock();
        this.screenShakeTrauma = Math.min(1.0, this.screenShakeTrauma + 0.35);
        this.projectiles.push({
          id: `proj-${Date.now()}`,
          ownerId: attacker.id,
          team: attacker.team,
          x: attacker.x + Math.cos(angle) * 16,
          y: attacker.y + Math.sin(angle) * 16,
          vx: Math.cos(angle) * 480,
          vy: Math.sin(angle) * 480,
          radius: 12,
          damage: 65,
          element: 'holy',
          rangeRemaining: 320,
          piercing: false,
          isSplash: true,
          splashRadius: 50,
          color: '#fef08a',
        });
        // Grant shield to self and allies
        this.entities.filter(e => e.team === attacker.team && distance(attacker.x, attacker.y, e.x, e.y) < 160)
          .forEach(e => {
            e.statusEffects.push({ type: 'shielded', duration: 4.0 });
            this.spawnFloatingText(e.x, e.y - 10, 'DIVINE SHIELD', '#facc15');
          });
        break;

      case 'cryomancer':
        // Glacial Blizzard: Persistent slow and damage
        sound.playIceSpell();
        this.spawnBurst(attacker.x + Math.cos(angle) * 100, attacker.y + Math.sin(angle) * 100, '#67e8f9', 30);
        this.entities.filter(e => e.team !== attacker.team && distance(attacker.x + Math.cos(angle) * 100, attacker.y + Math.sin(angle) * 100, e.x, e.y) < 130)
          .forEach(e => {
            this.applyDamage(attacker, e, 60, false, 1.0, 'ice');
            e.statusEffects.push({ type: 'chilled', duration: 4.0 });
            this.spawnFloatingText(e.x, e.y - 15, 'BLIZZARD!', '#67e8f9');
          });
        break;
    }
  }

  private applyDamage(
    attacker: Entity,
    target: Entity,
    baseDamage: number,
    isCrit: boolean,
    mult: number,
    element: string
  ) {
    if (target.isDead) return;

    // Check shielded status
    const shieldIndex = target.statusEffects.findIndex(s => s.type === 'shielded');
    if (shieldIndex !== -1) {
      sound.playShieldBlock();
      target.statusEffects.splice(shieldIndex, 1);
      this.spawnFloatingText(target.x, target.y - 15, 'BLOCKED!', '#facc15');
      this.spawnBurst(target.x, target.y, '#fef08a', 10);
      return;
    }

    // Passive: Knight Iron Fortitude (extra mitigation under 35% HP)
    let effectiveArmor = target.armor;
    if (target.classType === 'knight' && target.currentHp / target.maxHp < 0.35) {
      effectiveArmor += 25;
    }

    const { finalDamage, isCrit: wasCrit } = calculateDamage(baseDamage, effectiveArmor, isCrit, mult);

    target.currentHp = Math.max(0, target.currentHp - finalDamage);
    attacker.stats.damageDealt += finalDamage;
    target.stats.damageTaken += finalDamage;

    // Audio & Hitstop & Trauma
    const isHeavy = wasCrit || finalDamage > 60;
    sound.playHit(isHeavy);
    if (isHeavy) {
      this.hitstopTimer = 0.06;
      this.screenShakeTrauma = Math.min(1.0, this.screenShakeTrauma + 0.3);
    }

    // Floating damage text
    const textCol = wasCrit ? '#f97316' : (attacker.team === 'blue' ? '#38bdf8' : '#ef4444');
    const label = wasCrit ? `CRIT! -${finalDamage}` : `-${finalDamage}`;
    this.spawnFloatingText(target.x, target.y - 12, label, textCol, wasCrit ? 1.3 : 1.0);

    // Particle blood / sparks
    this.spawnBurst(target.x, target.y, wasCrit ? '#f97316' : '#cbd5e1', isHeavy ? 14 : 7);

    // Check Death
    if (target.currentHp <= 0) {
      this.handleEntityDeath(attacker, target);
    }
  }

  private handleEntityDeath(killer: Entity, victim: Entity) {
    victim.isDead = true;
    victim.deathTimer = 0;
    killer.stats.kills += 1;
    victim.stats.deaths += 1;

    sound.playKill();
    this.hitstopTimer = 0.08;
    this.screenShakeTrauma = Math.min(1.0, this.screenShakeTrauma + 0.5);

    const banner = victim.isPlayer ? 'YOU WERE SLAIN!' : `${victim.name} ELIMINATED!`;
    this.spawnFloatingText(victim.x, victim.y - 25, banner, '#ef4444', 1.4);
    this.spawnBurst(victim.x, victim.y, victim.team === 'blue' ? '#38bdf8' : '#ef4444', 30);

    // Check round victory
    const roundWinTeam = checkRoundOutcome(this.entities);
    if (roundWinTeam && this.roundState === 'active') {
      this.roundState = 'round_over';
      this.roundStateTimer = 2.5;

      if (roundWinTeam === 'blue') {
        this.blueWins += 1;
        this.roundBannerText = 'ROUND WON!';
        sound.playRoundWin();
      } else {
        this.redWins += 1;
        this.roundBannerText = 'ROUND LOST!';
        sound.playRoundLoss();
      }

      this.callbacks.onRoundChange(this.roundNumber, this.blueWins, this.redWins);

      // Check match victory
      const matchWinner = checkMatchOutcome(this.blueWins, this.redWins, this.targetWins);
      if (matchWinner) {
        this.roundState = 'match_over';
        this.roundStateTimer = 2.0;
      }
    }
  }

  // --- Particle & Text VFX Pool ---

  private spawnBurst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      // Find inactive particle
      const p = this.particles.find(part => part.life <= 0);
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.35 + Math.random() * 0.3;
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 3;
      p.color = color;
      p.alpha = 1.0;
    }
  }

  private spawnSwingParticles(attacker: Entity, angle: number) {
    for (let i = 0; i < 6; i++) {
      const p = this.particles.find(part => part.life <= 0);
      if (!p) break;
      const arc = angle - Math.PI * 0.3 + (i / 6) * Math.PI * 0.6;
      p.x = attacker.x + Math.cos(arc) * 24;
      p.y = attacker.y + Math.sin(arc) * 24;
      p.vx = Math.cos(arc) * 80;
      p.vy = Math.sin(arc) * 80;
      p.life = 0.2;
      p.maxLife = 0.2;
      p.size = 3;
      p.color = attacker.team === 'blue' ? '#38bdf8' : '#ef4444';
      p.alpha = 1.0;
    }
  }

  private spawnFloatingText(x: number, y: number, text: string, color: string, scale: number = 1.0) {
    if (this.floatingTexts.length >= MAX_FLOATING_TEXT) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      id: `txt-${Date.now()}-${Math.random()}`,
      x,
      y,
      text,
      color,
      life: 1.1,
      maxLife: 1.1,
      vy: -35,
      scale,
    });
  }

  // --- Main 60fps Loop ---

  public start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.dispatchHudState();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;

    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    const dt = Math.min(rawDt, 0.05); // Clamped dt

    if (!this.isPaused) {
      this.update(dt);
      this.render();
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.gameTime += dt;
    this.totalMatchTime += dt;

    // Decay screenshake
    if (this.screenShakeTrauma > 0) {
      this.screenShakeTrauma = Math.max(0, this.screenShakeTrauma - dt * 2.2);
    }

    // Tick hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      // While in hitstop, physics do not advance, but particles continue
      this.updateVFXOnly(dt);
      return;
    }

    // Active Ping countdown
    if (this.activePing) {
      this.activePing.timer -= dt;
      if (this.activePing.timer <= 0) this.activePing = null;
    }

    // Round State Transitions
    if (this.roundState === 'intermission') {
      this.roundStateTimer -= dt;
      if (this.roundStateTimer <= 0) {
        this.roundState = 'active';
        this.roundBannerText = '';
      }
    } else if (this.roundState === 'round_over') {
      this.roundStateTimer -= dt;
      if (this.roundStateTimer <= 0) {
        this.roundNumber += 1;
        this.resetRoundPositions();
      }
    } else if (this.roundState === 'match_over') {
      this.roundStateTimer -= dt;
      if (this.roundStateTimer <= 0) {
        this.finishMatch();
        return;
      }
    } else if (this.roundState === 'active') {
      // Round timer ticking
      this.roundTimer = Math.max(0, this.roundTimer - dt);
      if (this.roundTimer <= 0) {
        // Sudden death or highest total HP wins
        const blueHp = this.entities.filter(e => e.team === 'blue' && !e.isDead).reduce((a, b) => a + b.currentHp, 0);
        const redHp = this.entities.filter(e => e.team === 'red' && !e.isDead).reduce((a, b) => a + b.currentHp, 0);
        const winner: Team = blueHp >= redHp ? 'blue' : 'red';
        if (winner === 'blue') this.blueWins++; else this.redWins++;
        this.roundState = 'round_over';
        this.roundStateTimer = 2.5;
        this.roundBannerText = winner === 'blue' ? 'TIME UP - BLUE WINS!' : 'TIME UP - RED WINS!';
      }
    }

    // 1. Update Human Player Movement
    const player = this.entities.find(e => e.isPlayer);
    if (player && !player.isDead) {
      let mx = 0;
      let my = 0;
      if (this.keysHeld.has('w') || this.keysHeld.has('arrowup')) my -= 1;
      if (this.keysHeld.has('s') || this.keysHeld.has('arrowdown')) my += 1;
      if (this.keysHeld.has('a') || this.keysHeld.has('arrowleft')) mx -= 1;
      if (this.keysHeld.has('d') || this.keysHeld.has('arrowright')) mx += 1;

      const len = Math.hypot(mx, my);
      if (len > 0) {
        mx /= len;
        my /= len;
      }

      // Haste status speed boost
      const hasteMod = player.statusEffects.some(s => s.type === 'haste') ? 1.3 : 1.0;
      const chillMod = player.statusEffects.some(s => s.type === 'chilled') ? 0.75 : 1.0;

      if (!player.isDashing) {
        player.vx = mx * player.speed * hasteMod * chillMod;
        player.vy = my * player.speed * hasteMod * chillMod;
      }

      // Aim direction faces cursor
      player.facingAngle = Math.atan2(this.mouseY - player.y, this.mouseX - player.x);

      // Auto-attack if mouse is held down
      if (this.isMouseDown && player.attackCooldownTimer <= 0) {
        this.triggerPlayerPrimaryAttack();
      }
    }

    // 2. Update AI Bots
    const aiContext = {
      dt,
      entities: this.entities,
      obstacles: this.map.obstacles,
      powerUps: this.powerUps,
      activePing: this.activePing,
      mapWidth: this.map.width,
      mapHeight: this.map.height,
    };

    for (const bot of this.entities) {
      if (bot.isPlayer || bot.isDead) continue;

      const aiDecision = updateBotAI(bot, aiContext);
      const hasteMod = bot.statusEffects.some(s => s.type === 'haste') ? 1.3 : 1.0;
      const chillMod = bot.statusEffects.some(s => s.type === 'chilled') ? 0.75 : 1.0;

      if (!bot.isDashing) {
        bot.vx = aiDecision.moveX * bot.speed * hasteMod * chillMod;
        bot.vy = aiDecision.moveY * bot.speed * hasteMod * chillMod;
      }
      bot.facingAngle = aiDecision.aimAngle;

      if (aiDecision.triggerAttack && this.roundState === 'active') {
        this.executeAttack(bot, bot.facingAngle);
      }
      if (aiDecision.triggerSkill1 && this.roundState === 'active') {
        this.executeSkill1(bot, bot.facingAngle);
      }
      if (aiDecision.triggerSkill2 && this.roundState === 'active') {
        this.executeSkill2(bot, bot.facingAngle);
      }
    }

    // 3. Move Entities and Handle Collisions
    for (const ent of this.entities) {
      // Cooldown timers
      if (ent.attackCooldownTimer > 0) ent.attackCooldownTimer = Math.max(0, ent.attackCooldownTimer - dt);
      if (ent.skill1CooldownTimer > 0) ent.skill1CooldownTimer = Math.max(0, ent.skill1CooldownTimer - dt);
      if (ent.skill2CooldownTimer > 0) ent.skill2CooldownTimer = Math.max(0, ent.skill2CooldownTimer - dt);

      // Attack phase
      if (ent.attackPhaseTimer > 0) {
        ent.attackPhaseTimer = Math.max(0, ent.attackPhaseTimer - dt);
        if (ent.attackPhaseTimer === 0) ent.isAttacking = false;
      }

      // Dash timer
      if (ent.dashTimer > 0) {
        ent.dashTimer = Math.max(0, ent.dashTimer - dt);
        if (ent.dashTimer === 0) ent.isDashing = false;
      }

      // Status effects
      for (let i = ent.statusEffects.length - 1; i >= 0; i--) {
        const s = ent.statusEffects[i];
        s.duration -= dt;
        if (s.type === 'burning') {
          // DoT tick
          ent.currentHp = Math.max(0, ent.currentHp - 6 * dt);
          if (ent.currentHp <= 0 && !ent.isDead) {
            const dummyKiller = this.entities.find(e => e.team !== ent.team) || ent;
            this.handleEntityDeath(dummyKiller, ent);
          }
        }
        if (s.duration <= 0) ent.statusEffects.splice(i, 1);
      }

      // Death timer
      if (ent.isDead) {
        ent.deathTimer += dt;
        continue;
      }

      // Apply velocity
      const nextX = ent.x + ent.vx * dt;
      const nextY = ent.y + ent.vy * dt;

      // Obstacle collision resolution
      let resolvedX = nextX;
      let resolvedY = nextY;

      for (const obs of this.map.obstacles) {
        if (circleIntersectsRect(resolvedX, ent.y, ent.radius, obs.x, obs.y, obs.width, obs.height)) {
          resolvedX = ent.x; // Block horizontal
        }
        if (circleIntersectsRect(ent.x, resolvedY, ent.radius, obs.x, obs.y, obs.width, obs.height)) {
          resolvedY = ent.y; // Block vertical
        }
      }

      // Perimeter map boundaries
      ent.x = clamp(resolvedX, ent.radius + 15, this.map.width - ent.radius - 15);
      ent.y = clamp(resolvedY, ent.radius + 15, this.map.height - ent.radius - 15);

      // Walk cycle animation
      if (Math.hypot(ent.vx, ent.vy) > 10) {
        ent.walkCycle += dt;
      }
    }

    // 4. Entity-to-Entity collision separation
    for (let i = 0; i < this.entities.length; i++) {
      for (let j = i + 1; j < this.entities.length; j++) {
        const a = this.entities[i];
        const b = this.entities[j];
        if (a.isDead || b.isDead) continue;

        const d = distance(a.x, a.y, b.x, b.y);
        const minDist = a.radius + b.radius;
        if (d < minDist && d > 0.001) {
          const overlap = minDist - d;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;

          // Knight dash slam collision
          if (a.isDashing && a.classType === 'knight' && a.team !== b.team) {
            this.applyDamage(a, b, 40, true, 1.0, 'physical');
            b.statusEffects.push({ type: 'stunned', duration: 1.2 });
            a.isDashing = false;
            a.dashTimer = 0;
            sound.playShieldBlock();
          }
        }
      }
    }

    // 5. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      const traveled = Math.hypot(proj.vx * dt, proj.vy * dt);
      proj.rangeRemaining -= traveled;

      // Obstacle collision
      let hitObstacle = false;
      for (const obs of this.map.obstacles) {
        if (circleIntersectsRect(proj.x, proj.y, proj.radius, obs.x, obs.y, obs.width, obs.height)) {
          hitObstacle = true;
          this.spawnBurst(proj.x, proj.y, proj.color, 6);
          // If crate, damage it
          if (obs.type === 'crate' && obs.health !== undefined) {
            obs.health -= proj.damage;
            if (obs.health <= 0) {
              this.spawnBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, '#92400e', 18);
              this.map.obstacles = this.map.obstacles.filter(o => o !== obs);
            }
          }
          break;
        }
      }

      if (hitObstacle || proj.rangeRemaining <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Entity hit check
      const targets = this.entities.filter(e => e.team !== proj.team && !e.isDead);
      for (const target of targets) {
        if (distance(proj.x, proj.y, target.x, target.y) <= proj.radius + target.radius) {
          const owner = this.entities.find(e => e.id === proj.ownerId) || target;

          if (proj.isSplash) {
            // Splash explosion
            this.spawnBurst(proj.x, proj.y, proj.color, 18);
            for (const splashTarget of targets) {
              if (distance(proj.x, proj.y, splashTarget.x, splashTarget.y) <= proj.splashRadius) {
                this.applyDamage(owner, splashTarget, proj.damage, false, 1.0, proj.element);
              }
            }
          } else {
            this.applyDamage(owner, target, proj.damage, false, 1.0, proj.element);
          }

          if (!proj.piercing) {
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // 6. Update PowerUps
    for (const pu of this.powerUps) {
      if (!pu.active) {
        pu.respawnTimer -= dt;
        if (pu.respawnTimer <= 0) {
          pu.active = true;
        }
        continue;
      }

      for (const ent of this.entities) {
        if (ent.isDead) continue;
        if (distance(ent.x, ent.y, pu.x, pu.y) <= ent.radius + pu.radius) {
          pu.active = false;
          pu.respawnTimer = 22.0; // 22s respawn
          sound.playPowerup();
          this.spawnBurst(pu.x, pu.y, '#facc15', 18);

          if (pu.type === 'health') {
            const heal = 120;
            ent.currentHp = Math.min(ent.maxHp, ent.currentHp + heal);
            this.spawnFloatingText(ent.x, ent.y - 15, `+${heal} HP`, '#22c55e', 1.2);
          } else if (pu.type === 'haste') {
            ent.statusEffects.push({ type: 'haste', duration: 7.0 });
            this.spawnFloatingText(ent.x, ent.y - 15, 'HASTE SPEED BOOST!', '#06b6d4', 1.2);
          } else if (pu.type === 'damage') {
            ent.statusEffects.push({ type: 'shielded', duration: 6.0 });
            this.spawnFloatingText(ent.x, ent.y - 15, 'POWER SHIELD!', '#ef4444', 1.2);
          } else if (pu.type === 'energy') {
            ent.skill1CooldownTimer = 0;
            ent.skill2CooldownTimer = 0;
            this.spawnFloatingText(ent.x, ent.y - 15, 'COOLDOWNS RESET!', '#eab308', 1.2);
          }
          break;
        }
      }
    }

    // 7. Update Particles & Text VFX
    this.updateVFXOnly(dt);

    // 8. Throttle HUD Updates to React (~10Hz)
    this.hudThrottleTimer += dt;
    if (this.hudThrottleTimer >= 0.08) {
      this.hudThrottleTimer = 0;
      this.dispatchHudState();
    }
  }

  private updateVFXOnly(dt: number) {
    // Particles
    for (const p of this.particles) {
      if (p.life > 0) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        p.alpha = Math.max(0, p.life / p.maxLife);
      }
    }

    // Floating combat text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const txt = this.floatingTexts[i];
      txt.y += txt.vy * dt;
      txt.life -= dt;
      if (txt.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private dispatchHudState() {
    const player = this.entities.find(e => e.isPlayer);
    const def = CLASSES[this.playerClass];

    const blueRoster = this.entities
      .filter(e => e.team === 'blue')
      .map(e => ({
        id: e.id,
        name: e.name,
        classType: e.classType,
        hp: Math.round(e.currentHp),
        maxHp: e.maxHp,
        isDead: e.isDead,
        isPlayer: e.isPlayer,
      }));

    const redRoster = this.entities
      .filter(e => e.team === 'red')
      .map(e => ({
        id: e.id,
        name: e.name,
        classType: e.classType,
        hp: Math.round(e.currentHp),
        maxHp: e.maxHp,
        isDead: e.isDead,
      }));

    this.callbacks.onHudUpdate({
      playerHp: player ? Math.round(player.currentHp) : 0,
      playerMaxHp: player ? player.maxHp : def.baseHp,
      playerEnergy: player ? Math.round(player.currentEnergy) : 100,
      playerMaxEnergy: 100,
      skill1CooldownRemaining: player ? Math.max(0, player.skill1CooldownTimer) : 0,
      skill2CooldownRemaining: player ? Math.max(0, player.skill2CooldownTimer) : 0,
      skill1CooldownMax: def.skill1.cooldown,
      skill2CooldownMax: def.skill2.cooldown,
      blueScore: this.blueWins,
      redScore: this.redWins,
      roundNumber: this.roundNumber,
      roundTimeRemaining: Math.ceil(this.roundTimer),
      blueRoster,
      redRoster,
      activePing: this.activePing
        ? {
            type: this.activePing.type,
            text:
              this.activePing.type === 'focus'
                ? 'FOCUS PINGED TARGET!'
                : this.activePing.type === 'rally'
                ? 'RALLY TO PLAYER!'
                : 'FALL BACK / RETREAT!',
          }
        : null,
    });
  }

  private finishMatch() {
    this.isRunning = false;
    document.body.dataset.state = 'gameover';

    const winner: Team = this.blueWins >= this.targetWins ? 'blue' : 'red';
    const player = this.entities.find(e => e.isPlayer);
    const mvp = determineMvp(this.entities, winner) || this.entities[0];

    this.callbacks.onMatchComplete({
      winner,
      playerWon: winner === 'blue',
      blueScore: this.blueWins,
      redScore: this.redWins,
      mvp,
      entities: this.entities,
      playerStats: player ? player.stats : { kills: 0, deaths: 0, damageDealt: 0, damageTaken: 0, healingDone: 0 },
      matchDuration: Math.round(this.totalMatchTime),
    });
  }

  // --- Rendering Pass ---

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Apply Screenshake offset
    ctx.save();
    if (this.screenShakeTrauma > 0) {
      const shakeMag = this.screenShakeTrauma * this.screenShakeTrauma * 14;
      const ox = (Math.random() * 2 - 1) * shakeMag;
      const oy = (Math.random() * 2 - 1) * shakeMag;
      ctx.translate(ox, oy);
    }

    // 1. Draw Arena Floor & Grid Pattern
    ctx.fillStyle = this.map.floorColor;
    ctx.fillRect(0, 0, w, h);

    // Floor stone tile grid lines
    ctx.fillStyle = this.map.floorPatternColor;
    const tileSize = 50;
    for (let x = 0; x < w; x += tileSize) {
      ctx.fillRect(x, 0, 1, h);
    }
    for (let y = 0; y < h; y += tileSize) {
      ctx.fillRect(0, y, w, 1);
    }

    // Decorative Center Arena Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 90, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Draw Arena Obstacles
    for (const obs of this.map.obstacles) {
      drawObstacle(ctx, obs);
    }

    // 3. Draw Arena Powerups
    for (const pu of this.powerUps) {
      drawPowerUp(ctx, pu, this.gameTime);
    }

    // 4. Draw Projectiles
    for (const proj of this.projectiles) {
      drawProjectile(ctx, proj, this.gameTime);
    }

    // 5. Draw Entities (Characters)
    // Sort entities by Y position for proper 2.5D depth occlusion!
    const sortedEntities = [...this.entities].sort((a, b) => a.y - b.y);
    for (const ent of sortedEntities) {
      drawCharacterSprite(ctx, ent, this.gameTime);
    }

    // 6. Draw Pooled Particles
    for (const p of this.particles) {
      if (p.life > 0) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        ctx.restore();
      }
    }

    // 7. Draw Floating Combat Text
    for (const txt of this.floatingTexts) {
      ctx.save();
      ctx.font = `bold ${Math.floor(11 * txt.scale)}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      // Black outline
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      ctx.strokeText(txt.text, txt.x, txt.y);
      ctx.fillStyle = txt.color;
      ctx.fillText(txt.text, txt.x, txt.y);
      ctx.restore();
    }

    // 8. Draw Tactical Ping Map Markers
    if (this.activePing && this.activePing.x !== undefined && this.activePing.y !== undefined) {
      ctx.save();
      const pulse = 1 + Math.sin(this.gameTime * 8) * 0.3;
      ctx.strokeStyle = this.activePing.type === 'focus' ? '#facc15' : (this.activePing.type === 'rally' ? '#38bdf8' : '#ef4444');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.activePing.x, this.activePing.y, 22 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 9. Draw Round Banner (Intermission / Round Won / Lost)
    if (this.roundBannerText) {
      ctx.save();
      ctx.fillStyle = 'rgba(9, 9, 11, 0.75)';
      ctx.fillRect(0, h / 2 - 36, w, 72);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, h / 2 - 36);
      ctx.lineTo(w, h / 2 - 36);
      ctx.moveTo(0, h / 2 + 36);
      ctx.lineTo(w, h / 2 + 36);
      ctx.stroke();

      ctx.font = '20px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 8;
      ctx.fillText(this.roundBannerText, w / 2, h / 2);
      ctx.restore();
    }

    // 10. Outer Arena Border Walls
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, w - 14, h - 14);

    ctx.restore();
  }
}
