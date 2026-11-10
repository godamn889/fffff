/**
 * Procedural Pixel Art Graphics Renderer
 * Renders high-fidelity retro pixel characters, animations, weapons, and spell effects
 * using crisp pixel matrix instructions on the 2D canvas.
 */

import { ClassType, Entity, Obstacle, PowerUp, Projectile, Team } from './types';

// Helper to draw a pixel rect aligned to integer coordinates
export function drawPixel(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
}

// Draw a pixel grid matrix (array of strings where each char maps to a color)
export function drawPixelMatrix(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  matrix: string[],
  palette: Record<string, string>,
  scale: number = 2
) {
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const char = row[c];
      if (char !== ' ' && char !== '.' && palette[char]) {
        ctx.fillStyle = palette[char];
        ctx.fillRect(
          Math.floor(x + c * scale),
          Math.floor(y + r * scale),
          scale,
          scale
        );
      }
    }
  }
}

// Draw animated character sprite based on class, team, facing angle, and state
export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  gameTime: number
) {
  const { x, y, facingAngle, classType, team, isPlayer, currentHp, maxHp, isAttacking, isDead, deathTimer } = entity;

  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));

  // If dead, draw crumbling / sinking death effect
  if (isDead) {
    const fade = Math.max(0, 1 - deathTimer * 1.5);
    ctx.globalAlpha = fade;
    ctx.scale(1, Math.max(0.2, 1 - deathTimer * 0.8));
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, 4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Check if facing left
  const isFacingLeft = Math.cos(facingAngle) < 0;

  // Walk cycle bobbing
  const speed = Math.hypot(entity.vx, entity.vy);
  const isMoving = speed > 10;
  const bobOffset = isMoving ? Math.sin(entity.walkCycle * 14) * 2.5 : Math.sin(gameTime * 3) * 1.2;

  // Ground team circle indicator
  ctx.save();
  ctx.scale(1, 0.45);
  ctx.beginPath();
  ctx.arc(0, 20, isPlayer ? 18 : 14, 0, Math.PI * 2);
  ctx.fillStyle = team === 'blue' ? 'rgba(56, 189, 248, 0.28)' : 'rgba(239, 68, 68, 0.28)';
  ctx.fill();
  ctx.lineWidth = isPlayer ? 2 : 1.5;
  ctx.strokeStyle = team === 'blue' ? '#38bdf8' : '#ef4444';
  ctx.stroke();

  // If player, draw a small directional triangle pointing towards aim
  if (isPlayer) {
    ctx.save();
    ctx.scale(1, 1 / 0.45);
    const pointerDist = 24;
    const px = Math.cos(facingAngle) * pointerDist;
    const py = Math.sin(facingAngle) * pointerDist;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Check hurt white flash (recently took damage)
  const isHurt = entity.stats.damageTaken > 0 && Math.sin(gameTime * 40) > 0.5 && entity.dashTimer === 0;

  // Shadow under character
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Flip horizontally if facing left
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }

  // Draw class specific pixel body
  ctx.translate(0, Math.floor(bobOffset));

  // If invisible (Assassin skill 1), draw with translucent shimmer
  const isInvisible = entity.statusEffects.some(s => s.type === 'invisible');
  if (isInvisible) {
    ctx.globalAlpha = isPlayer ? 0.4 : 0.08;
  }

  switch (classType) {
    case 'knight':
      drawKnight(ctx, isAttacking, isHurt, team);
      break;
    case 'ranger':
      drawRanger(ctx, isAttacking, isHurt, team);
      break;
    case 'pyromancer':
      drawPyromancer(ctx, isAttacking, isHurt, team, gameTime);
      break;
    case 'assassin':
      drawAssassin(ctx, isAttacking, isHurt, team);
      break;
    case 'paladin':
      drawPaladin(ctx, isAttacking, isHurt, team, gameTime);
      break;
    case 'cryomancer':
      drawCryomancer(ctx, isAttacking, isHurt, team, gameTime);
      break;
  }

  // Reset horizontal flip for overhead indicators
  if (isFacingLeft) {
    ctx.scale(-1, 1);
  }

  // Status effect visual crowns/auras
  drawStatusEffects(ctx, entity, gameTime);

  // Health bar above head (visible during combat)
  drawOverheadBar(ctx, entity, team, isPlayer);

  ctx.restore();
}

function drawOverheadBar(ctx: CanvasRenderingContext2D, entity: Entity, team: Team, isPlayer: boolean) {
  const hpPercent = Math.max(0, entity.currentHp / entity.maxHp);
  const barW = isPlayer ? 32 : 24;
  const barH = 4;
  const barY = -28;

  // Background frame
  ctx.fillStyle = '#09090b';
  ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, barH + 2);

  // Red/Dark background
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(-barW / 2, barY, barW, barH);

  // Health fill
  const fillW = Math.floor(barW * hpPercent);
  if (fillW > 0) {
    ctx.fillStyle = team === 'blue' ? (isPlayer ? '#22c55e' : '#38bdf8') : '#ef4444';
    ctx.fillRect(-barW / 2, barY, fillW, barH);
    // Highlight top line
    ctx.fillStyle = team === 'blue' ? '#86efac' : '#fca5a5';
    ctx.fillRect(-barW / 2, barY, fillW, 1);
  }

  // Name tag
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = isPlayer ? '#fde047' : (team === 'blue' ? '#bae6fd' : '#fecaca');
  ctx.fillText(entity.name, 0, barY - 4);
}

function drawStatusEffects(ctx: CanvasRenderingContext2D, entity: Entity, gameTime: number) {
  // Stunned stars
  if (entity.statusEffects.some(s => s.type === 'stunned')) {
    const starCount = 3;
    for (let i = 0; i < starCount; i++) {
      const angle = gameTime * 6 + (i * (Math.PI * 2 / starCount));
      const sx = Math.cos(angle) * 12;
      const sy = -24 + Math.sin(angle) * 4;
      ctx.fillStyle = '#facc15';
      ctx.fillRect(Math.floor(sx) - 1, Math.floor(sy) - 1, 3, 3);
    }
  }

  // Chilled frost particles
  if (entity.statusEffects.some(s => s.type === 'chilled')) {
    ctx.fillStyle = '#67e8f9';
    for (let i = 0; i < 4; i++) {
      const fx = Math.sin(gameTime * 4 + i) * 10;
      const fy = -10 + (Math.cos(gameTime * 3 + i) * 8);
      ctx.fillRect(Math.floor(fx), Math.floor(fy), 2, 2);
    }
  }

  // Burning embers
  if (entity.statusEffects.some(s => s.type === 'burning')) {
    ctx.fillStyle = '#f97316';
    for (let i = 0; i < 4; i++) {
      const bx = ((i * 7) % 16) - 8;
      const by = -6 - ((gameTime * 20 + i * 5) % 18);
      ctx.fillRect(Math.floor(bx), Math.floor(by), 2, 2);
    }
  }

  // Shielded barrier
  if (entity.statusEffects.some(s => s.type === 'shielded')) {
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -6, 16, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// --- Class Specific Handcrafted Pixel Models ---

function drawKnight(ctx: CanvasRenderingContext2D, isAttacking: boolean, isHurt: boolean, team: Team) {
  const p: Record<string, string> = isHurt ? {
    'S': '#ffffff', 'D': '#ffffff', 'M': '#ffffff', 'G': '#ffffff', 'H': '#ffffff', 'E': '#ffffff', 'B': '#ffffff', 'W': '#ffffff', 'Hw': '#ffffff'
  } : {
    'S': '#cbd5e1', // Steel light
    'D': '#64748b', // Steel dark
    'M': '#334155', // Plate shadow
    'G': '#f59e0b', // Gold trim
    'H': '#1e293b', // Visor slit
    'E': '#ef4444', // Plume red
    'B': team === 'blue' ? '#0284c7' : '#dc2626', // Cape
    'W': '#f8fafc', // Sword blade
    'Hw': '#94a3b8', // Sword hilt
  };

  const matrix = [
    "   EEE          ",
    "  EGGEE         ",
    "  GSSGG         ",
    "  SHHS          ",
    "  SSDD          ",
    " BSSDDGB        ",
    "BSSDDDDDB       ",
    "B SSDDD B       ",
    "B DDDDD B       ",
    "  DM MD         ",
    "  DM MD         ",
    "  SS SS         ",
    "  DD DD         ",
  ];

  drawPixelMatrix(ctx, -14, -20, matrix, p, 2);

  // Sword in hand
  ctx.save();
  if (isAttacking) {
    ctx.translate(6, -6);
    ctx.rotate(Math.PI / 4);
    // Glowing slash trail
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(4, -14, 18, 3);
  } else {
    ctx.translate(8, -8);
    ctx.rotate(-Math.PI / 6);
  }
  // Greatsword blade
  ctx.fillStyle = isHurt ? '#ffffff' : '#f8fafc';
  ctx.fillRect(0, -16, 4, 16);
  ctx.fillStyle = isHurt ? '#ffffff' : '#94a3b8';
  ctx.fillRect(-3, 0, 10, 3); // Crossguard
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 3, 3, 5); // Grip
  ctx.restore();
}

function drawRanger(ctx: CanvasRenderingContext2D, isAttacking: boolean, isHurt: boolean, team: Team) {
  const p: Record<string, string> = isHurt ? {
    'H': '#ffffff', 'F': '#ffffff', 'L': '#ffffff', 'D': '#ffffff', 'S': '#ffffff', 'B': '#ffffff', 'E': '#ffffff'
  } : {
    'H': '#15803d', // Green hood
    'F': '#fed7aa', // Face skin
    'L': '#854d0e', // Leather armor
    'D': '#3f6212', // Dark woodland
    'S': '#166534', // Pants
    'B': team === 'blue' ? '#38bdf8' : '#f87171', // Scarf / team band
    'E': '#1e293b', // Eyes
  };

  const matrix = [
    "   HHH          ",
    "  HHHHH         ",
    "  HFFEE         ",
    "  HFFFF         ",
    "   BBB          ",
    "  LLLLLD        ",
    "  LLLLLD        ",
    "  DDDDDD        ",
    "   SS SS        ",
    "   SS SS        ",
    "   DD DD        ",
  ];

  drawPixelMatrix(ctx, -12, -18, matrix, p, 2);

  // Curved Longbow
  ctx.save();
  ctx.translate(8, -8);
  ctx.fillStyle = isHurt ? '#ffffff' : '#78350f';
  ctx.fillRect(0, -12, 3, 24);
  ctx.fillRect(3, -10, 2, 20);
  // Bowstring
  ctx.fillStyle = isAttacking ? '#facc15' : '#e2e8f0';
  ctx.fillRect(5, -10, 1, 20);
  if (isAttacking) {
    // Arrow nocked
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-4, -1, 14, 2);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-7, -2, 3, 4); // Fletching
  }
  ctx.restore();
}

function drawPyromancer(ctx: CanvasRenderingContext2D, isAttacking: boolean, isHurt: boolean, team: Team, gameTime: number) {
  const p: Record<string, string> = isHurt ? {
    'R': '#ffffff', 'D': '#ffffff', 'G': '#ffffff', 'E': '#ffffff', 'F': '#ffffff'
  } : {
    'R': '#c2410c', // Crimson robe
    'D': '#7c2d12', // Shadow robe
    'G': '#f59e0b', // Gold trim
    'E': '#fde047', // Glowing eyes
    'F': '#1c1917', // Dark hood interior
  };

  const matrix = [
    "   RRR          ",
    "  RRRRR         ",
    "  RFEER         ",
    "  RFFFR         ",
    "   GGG          ",
    "  RRRRRD        ",
    " RRRRRRDD       ",
    " RRRRRRDD       ",
    " RRRRRRDDD      ",
    "  RRR RRD       ",
    "  DDD DDD       ",
  ];

  drawPixelMatrix(ctx, -12, -18, matrix, p, 2);

  // Brimstone Staff with animated flame orb
  ctx.save();
  ctx.translate(8, -8);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, -10, 3, 22); // Shaft
  // Staff top
  ctx.fillStyle = '#d97706';
  ctx.fillRect(-2, -14, 7, 4);
  // Swirling Fire Orb
  const flamePulse = 1 + Math.sin(gameTime * 12) * 0.25;
  ctx.fillStyle = Math.sin(gameTime * 20) > 0 ? '#f97316' : '#facc15';
  ctx.beginPath();
  ctx.arc(1, -16, 4 * flamePulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAssassin(ctx: CanvasRenderingContext2D, isAttacking: boolean, isHurt: boolean, team: Team) {
  const p: Record<string, string> = isHurt ? {
    'S': '#ffffff', 'D': '#ffffff', 'M': '#ffffff', 'E': '#ffffff', 'T': '#ffffff'
  } : {
    'S': '#581c87', // Dark violet hood
    'D': '#3b0764', // Deep shadow
    'M': '#18181b', // Face mask
    'E': '#c084fc', // Glowing purple eyes
    'T': team === 'blue' ? '#38bdf8' : '#ec4899', // Scarf accent
  };

  const matrix = [
    "   SSS          ",
    "  SSSSS         ",
    "  SMEES         ",
    "  SMMMS         ",
    "   TTTTTT       ",
    "  DDDDD         ",
    "  DDDDD         ",
    "  DDDDD         ",
    "   DD DD        ",
    "   DD DD        ",
    "   MM MM        ",
  ];

  drawPixelMatrix(ctx, -12, -18, matrix, p, 2);

  // Twin glowing daggers
  ctx.save();
  ctx.translate(6, -6);
  if (isAttacking) {
    ctx.rotate(Math.PI / 3);
  }
  // Front dagger
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, -6, 2, 8);
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(2, -4, 2, 5); // Rune glow
  ctx.fillStyle = '#18181b';
  ctx.fillRect(-1, 2, 4, 3); // Hilt
  // Back dagger
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-10, -4, 2, 8);
  ctx.restore();
}

function drawPaladin(ctx: CanvasRenderingContext2D, isAttacking: boolean, isHurt: boolean, team: Team, gameTime: number) {
  const p: Record<string, string> = isHurt ? {
    'G': '#ffffff', 'S': '#ffffff', 'D': '#ffffff', 'F': '#ffffff', 'C': '#ffffff'
  } : {
    'G': '#eab308', // Gold armor
    'S': '#fef08a', // Bright gold
    'D': '#713f12', // Bronze shadow
    'F': '#fed7aa', // Face
    'C': team === 'blue' ? '#0284c7' : '#b91c1c', // Cape
  };

  const matrix = [
    "   GGG          ",
    "  GGGGG         ",
    "  GFFFG         ",
    "  GFFFG         ",
    "   SSS          ",
    " CSSGGGD        ",
    "CSSSGGGD        ",
    " CSSGGGD        ",
    "  DD DDD        ",
    "  GG GG         ",
    "  DD DD         ",
  ];

  drawPixelMatrix(ctx, -12, -18, matrix, p, 2);

  // Halo overhead
  ctx.save();
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, -22 + Math.sin(gameTime * 4) * 1.5, 8, 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Holy Warhammer
  ctx.translate(8, -6);
  if (isAttacking) {
    ctx.rotate(Math.PI / 4);
  }
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, -8, 3, 18); // Shaft
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-5, -14, 12, 6); // Hammer head
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-3, -12, 8, 2); // Inset gold
  ctx.restore();
}

function drawCryomancer(ctx: CanvasRenderingContext2D, isAttacking: boolean, isHurt: boolean, team: Team, gameTime: number) {
  const p: Record<string, string> = isHurt ? {
    'C': '#ffffff', 'D': '#ffffff', 'W': '#ffffff', 'E': '#ffffff', 'M': '#ffffff'
  } : {
    'C': '#06b6d4', // Cyan ice
    'D': '#164e63', // Deep arctic
    'W': '#cffafe', // Shimmering frost
    'E': '#67e8f9', // Cyan glowing eyes
    'M': '#0e7490', // Mask
  };

  const matrix = [
    "   CCC          ",
    "  WCCCW         ",
    "  CMEEC         ",
    "  CMMMC         ",
    "   WWW          ",
    "  CCCCCD        ",
    " WCCCCCDD       ",
    " WCCCCCDD       ",
    "  DDD DDD       ",
    "  CC   CC       ",
    "  DD   DD       ",
  ];

  drawPixelMatrix(ctx, -12, -18, matrix, p, 2);

  // Floating Glacial Crystal Orb
  const floatY = -8 + Math.sin(gameTime * 5) * 3;
  ctx.save();
  ctx.translate(10, floatY);
  ctx.fillStyle = '#a5f3fc';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0891b2';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// Draw projectiles (Arrows, Fireballs, Ice Shards, Hammers)
export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile, gameTime: number) {
  ctx.save();
  ctx.translate(proj.x, proj.y);
  const angle = Math.atan2(proj.vy, proj.vx);
  ctx.rotate(angle);

  switch (proj.element) {
    case 'fire':
      // Blazing fireball
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(1, 0, proj.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Trail flames
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-proj.radius * 1.5, -2, proj.radius, 4);
      break;

    case 'ice':
      // Sharp Glacial Shard
      ctx.fillStyle = '#a5f3fc';
      ctx.beginPath();
      ctx.moveTo(proj.radius * 1.5, 0);
      ctx.lineTo(-proj.radius, -proj.radius * 0.7);
      ctx.lineTo(-proj.radius * 0.5, 0);
      ctx.lineTo(-proj.radius, proj.radius * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;

    case 'holy':
      // Radiant Hammer or Orb
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.stroke();
      break;

    case 'physical':
    default:
      // Wooden Arrow with steel tip & fletching
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, -1, 14, 2); // Shaft
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(4, -3);
      ctx.lineTo(4, 3);
      ctx.closePath();
      ctx.fill(); // Tip
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-9, -2, 3, 4); // Fletching
      break;
  }

  ctx.restore();
}

// Draw arena obstacles (Stone Walls, Pillars, Crates, Crystals)
export function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle) {
  const { x, y, width, height, type } = obs;

  ctx.save();

  // Shadow under obstacle
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x + 4, y + 4, width, height);

  switch (type) {
    case 'wall':
      // Stone brick wall
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, width, height);
      // Top lit bevel
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, width, 4);
      ctx.fillRect(x, y, 4, height);
      // Dark bottom edge
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y + height - 4, width, 4);
      ctx.fillRect(x + width - 4, y, 4, height);
      // Brick mortar lines
      ctx.fillStyle = '#1e293b';
      for (let by = y + 12; by < y + height; by += 14) {
        ctx.fillRect(x, by, width, 1);
      }
      break;

    case 'pillar':
      // Round carved stone pillar
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + 2, y + 2, width - 4, 6); // Cap
      ctx.fillRect(x + 2, y + height - 8, width - 4, 6); // Base
      ctx.fillStyle = '#38bdf8';
      // Runic center glyph
      ctx.fillRect(x + width / 2 - 2, y + height / 2 - 6, 4, 12);
      ctx.fillRect(x + width / 2 - 6, y + height / 2 - 2, 12, 4);
      break;

    case 'crystal':
      // Glowing amethyst/cyan crystal spire
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(x + 3, y + 3, width - 6, height - 6);
      ctx.fillStyle = '#99f6e4';
      ctx.fillRect(x + 5, y + 5, width - 10, 4);
      break;

    case 'crate':
      // Wooden destructible crate
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
      // Planks & X brace
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x + 4, y + 4, width - 8, 3);
      ctx.fillRect(x + 4, y + height - 7, width - 8, 3);
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + width - 2, y + height - 2);
      ctx.moveTo(x + width - 2, y + 2);
      ctx.lineTo(x + 2, y + height - 2);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

// Draw arena powerups (Health, Energy, Haste, Damage)
export function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp, gameTime: number) {
  if (!pu.active) return;

  ctx.save();
  const bobY = Math.sin(gameTime * 4) * 4;
  ctx.translate(pu.x, pu.y + bobY);

  // Ground glowing pedestal
  ctx.save();
  ctx.scale(1, 0.4);
  ctx.beginPath();
  ctx.arc(0, 30, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
  ctx.fill();
  ctx.restore();

  // Powerup icon
  switch (pu.type) {
    case 'health':
      // Green Heart / Cross
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillRect(-5, -2, 10, 4);
      break;

    case 'energy':
      // Yellow lightning spark
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-2, -8);
      ctx.lineTo(4, -2);
      ctx.lineTo(0, -1);
      ctx.lineTo(3, 8);
      ctx.lineTo(-4, 1);
      ctx.lineTo(-1, 0);
      ctx.closePath();
      ctx.fill();
      break;

    case 'haste':
      // Cyan wing / boots
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cffafe';
      ctx.fillRect(-4, -1, 8, 2);
      break;

    case 'damage':
      // Red crossed swords / skull
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(-1, -5, 2, 10);
      ctx.fillRect(-4, -2, 8, 2);
      break;
  }

  ctx.restore();
}
