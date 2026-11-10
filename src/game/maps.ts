import { ArenaMap, MapId } from './types';

export const MAPS: Record<MapId, ArenaMap> = {
  courtyard: {
    id: 'courtyard',
    name: 'Castle Courtyard',
    description: 'Ancient royal training grounds with fortified stone pillars, flanking corridors, and center health rune.',
    width: 1000,
    height: 700,
    floorColor: '#1e293b',
    floorPatternColor: '#0f172a',
    wallColor: '#334155',
    accentColor: '#38bdf8',
    obstacles: [
      // Outer perimeter borders are handled in physics, these are interior obstacles
      // 4 symmetrical stone pillars
      { x: 260, y: 180, width: 60, height: 60, type: 'pillar' },
      { x: 680, y: 180, width: 60, height: 60, type: 'pillar' },
      { x: 260, y: 460, width: 60, height: 60, type: 'pillar' },
      { x: 680, y: 460, width: 60, height: 60, type: 'pillar' },
      // Central stone walls creating cover
      { x: 470, y: 140, width: 60, height: 80, type: 'wall' },
      { x: 470, y: 480, width: 60, height: 80, type: 'wall' },
      // Wooden crates providing destructible/light cover
      { x: 380, y: 320, width: 40, height: 40, type: 'crate', health: 60, maxHealth: 60 },
      { x: 580, y: 320, width: 40, height: 40, type: 'crate', health: 60, maxHealth: 60 },
    ],
    spawns: {
      blue: [
        { x: 120, y: 350 },
        { x: 140, y: 260 },
        { x: 140, y: 440 },
      ],
      red: [
        { x: 880, y: 350 },
        { x: 860, y: 260 },
        { x: 860, y: 440 },
      ],
    },
    powerUps: [
      { id: 'pu-center', x: 500, y: 350, type: 'health', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-top', x: 500, y: 70, type: 'energy', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-bot', x: 500, y: 630, type: 'damage', active: true, respawnTimer: 0, radius: 16 },
    ],
  },

  cavern: {
    id: 'cavern',
    name: 'Crystal Cavern',
    description: 'Subterranean grotto glittering with glowing crystals and winding tunnels favoring ambushes.',
    width: 1000,
    height: 700,
    floorColor: '#090d16',
    floorPatternColor: '#040711',
    wallColor: '#1e1b4b',
    accentColor: '#818cf8',
    obstacles: [
      { x: 300, y: 200, width: 50, height: 100, type: 'crystal' },
      { x: 650, y: 200, width: 50, height: 100, type: 'crystal' },
      { x: 300, y: 400, width: 50, height: 100, type: 'crystal' },
      { x: 650, y: 400, width: 50, height: 100, type: 'crystal' },
      { x: 460, y: 310, width: 80, height: 80, type: 'pillar' },
      { x: 180, y: 320, width: 45, height: 60, type: 'crystal' },
      { x: 775, y: 320, width: 45, height: 60, type: 'crystal' },
    ],
    spawns: {
      blue: [
        { x: 100, y: 350 },
        { x: 120, y: 220 },
        { x: 120, y: 480 },
      ],
      red: [
        { x: 900, y: 350 },
        { x: 880, y: 220 },
        { x: 880, y: 480 },
      ],
    },
    powerUps: [
      { id: 'pu-center', x: 500, y: 350, type: 'damage', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-left', x: 230, y: 150, type: 'health', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-right', x: 770, y: 550, type: 'haste', active: true, respawnTimer: 0, radius: 16 },
    ],
  },

  foundry: {
    id: 'foundry',
    name: 'Molten Foundry',
    description: 'Infernal volcanic chamber filled with molten lava channels and intense close-quarters brawls.',
    width: 1000,
    height: 700,
    floorColor: '#1c1917',
    floorPatternColor: '#0c0a09',
    wallColor: '#451a03',
    accentColor: '#ea580c',
    obstacles: [
      { x: 240, y: 240, width: 70, height: 70, type: 'pillar' },
      { x: 690, y: 240, width: 70, height: 70, type: 'pillar' },
      { x: 240, y: 390, width: 70, height: 70, type: 'pillar' },
      { x: 690, y: 390, width: 70, height: 70, type: 'pillar' },
      { x: 440, y: 220, width: 120, height: 40, type: 'wall' },
      { x: 440, y: 440, width: 120, height: 40, type: 'wall' },
    ],
    spawns: {
      blue: [
        { x: 110, y: 350 },
        { x: 130, y: 250 },
        { x: 130, y: 450 },
      ],
      red: [
        { x: 890, y: 350 },
        { x: 870, y: 250 },
        { x: 870, y: 450 },
      ],
    },
    powerUps: [
      { id: 'pu-center', x: 500, y: 350, type: 'damage', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-left', x: 180, y: 180, type: 'health', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-right', x: 820, y: 520, type: 'health', active: true, respawnTimer: 0, radius: 16 },
    ],
  },

  grove: {
    id: 'grove',
    name: 'Mystic Grove',
    description: 'Enchanted druidic sanctuary with ancient overgrown monoliths and abundant healing energies.',
    width: 1000,
    height: 700,
    floorColor: '#052e16',
    floorPatternColor: '#022c22',
    wallColor: '#14532d',
    accentColor: '#22c55e',
    obstacles: [
      { x: 320, y: 180, width: 60, height: 60, type: 'pillar' },
      { x: 620, y: 180, width: 60, height: 60, type: 'pillar' },
      { x: 320, y: 460, width: 60, height: 60, type: 'pillar' },
      { x: 620, y: 460, width: 60, height: 60, type: 'pillar' },
      { x: 460, y: 280, width: 80, height: 140, type: 'crystal' },
    ],
    spawns: {
      blue: [
        { x: 120, y: 350 },
        { x: 150, y: 240 },
        { x: 150, y: 460 },
      ],
      red: [
        { x: 880, y: 350 },
        { x: 850, y: 240 },
        { x: 850, y: 460 },
      ],
    },
    powerUps: [
      { id: 'pu-top', x: 500, y: 140, type: 'health', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-bot', x: 500, y: 560, type: 'health', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-left', x: 220, y: 350, type: 'energy', active: true, respawnTimer: 0, radius: 16 },
      { id: 'pu-right', x: 780, y: 350, type: 'haste', active: true, respawnTimer: 0, radius: 16 },
    ],
  },
};

export const MAP_LIST = Object.values(MAPS);
