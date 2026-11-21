// Lantern's Edge — the three courtyards. One job: the level maps, turning
// them into a grid the game can query, and grid pathfinding (BFS) the
// guards and click-to-move both use.
//
// Map legend: '#' wall, '.' floor, 'C' crate (blocks sight and movement),
// 'B' fern-bush (walkable, hides you), 'P' your spawn, 'E' the exit door,
// 'G' a warden spawn. Each warden's patrol route is a list of tile
// coordinates walked in order, pausing to scan at each post.
import { COLS, ROWS, TILE } from './config.js';

export const LEVELS = [
  {
    name: 'Courtyard of Lanterns',
    hint: 'Two wardens walk the courtyard. Crates block their sight — bushes hide you.',
    map: [
      '########################',
      '#P......C......B.......#',
      '#......................#',
      '#..####....C.....####..#',
      '#..####..........####..#',
      '#......B......C........#',
      '#......................#',
      '#..C.....####.....B....#',
      '#........####..........#',
      '#...B...####....C......#',
      '#......................#',
      '#......C.....B......E..#',
      '#......................#',
      '#..####....C.....####..#',
      '#..####..........####..#',
      '########################',
    ],
    guards: [
      { spawn: [12, 2], route: [[4, 2], [19, 2]] },
      { spawn: [7, 13], route: [[7, 13], [7, 5], [17, 5], [16, 13]] },
    ],
  },
  {
    name: 'Storehouse Rows',
    hint: 'Three wardens now, and the crates stand in long rows. Learn the patrol rhythm.',
    map: [
      '########################',
      '#P...C......B....C.....#',
      '#....C............C....#',
      '#.####....####....###..#',
      '#.####....####....###..#',
      '#......................#',
      '#..B....C....C.....B...#',
      '#......................#',
      '#.####....####....###..#',
      '#.####....####....###..#',
      '#......................#',
      '#...C.....B....C.......#',
      '#....C..........C...E..#',
      '#......................#',
      '#..B....C....C.....B...#',
      '########################',
    ],
    guards: [
      { spawn: [5, 5], route: [[5, 5], [18, 5]] },
      { spawn: [12, 7], route: [[12, 7], [12, 13], [20, 13], [20, 7]] },
      { spawn: [3, 14], route: [[3, 14], [3, 11], [9, 11], [9, 14]] },
    ],
  },
  {
    name: 'The Lantern Vault',
    hint: 'Four wardens guard the vault door. The ferns are your only friends.',
    map: [
      '########################',
      '#P....B.....C.....B....#',
      '#..####...#####...###..#',
      '#..####...#####...###..#',
      '#......................#',
      '#.C....B......C....B...#',
      '#......................#',
      '#..####..#####...####..#',
      '#..####..#####...####..#',
      '#......................#',
      '#.B....C......B....C...#',
      '#......................#',
      '#..####...#####...###..#',
      '#..####...#####...###..#',
      '#....B.....C.....B...E.#',
      '########################',
    ],
    guards: [
      { spawn: [8, 4], route: [[8, 4], [15, 4]] },
      { spawn: [15, 9], route: [[15, 9], [8, 9]] },
      { spawn: [4, 10], route: [[4, 10], [4, 6], [11, 6], [11, 10]] },
      { spawn: [18, 10], route: [[18, 10], [18, 6], [13, 6], [13, 10]] },
    ],
  },
];

// Parse one level definition into a live level: a grid of tiles plus the
// spawn, exit and warden starts in pixels.
export function parseLevel(def) {
  const grid = def.map.map((row) => row.split(''));
  let spawn = null;
  let exit = null;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = grid[y][x];
      if (ch === 'P') { spawn = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }; grid[y][x] = '.'; }
      if (ch === 'E') { exit = { x: x * TILE + TILE / 2, y: y * TILE + TILE / 2 }; grid[y][x] = '.'; }
      if (ch === 'G') grid[y][x] = '.';
    }
  }
  const guards = def.guards.map((g) => ({
    x: g.spawn[0] * TILE + TILE / 2,
    y: g.spawn[1] * TILE + TILE / 2,
    route: g.route.map(([tx, ty]) => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })),
  }));
  return { name: def.name, hint: def.hint, grid, spawn, exit, guards };
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.grid[ty][tx];
}

// A tile blocks movement (walls and crates). Bushes do not.
export function isSolid(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '#' || t === 'C';
}

// A tile blocks a warden's sight (walls and crates). Bushes do not block
// sight — they hide whoever stands inside them instead.
export function blocksSight(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '#' || t === 'C';
}

export function isBush(level, px, py) {
  return tileAt(level, px, py) === 'B';
}

export function isExit(level, px, py) {
  const dx = px - level.exit.x;
  const dy = py - level.exit.y;
  return dx * dx + dy * dy < (TILE * 0.55) * (TILE * 0.55);
}

// Breadth-first search over walkable tiles. Returns a list of pixel
// waypoints from start to goal (empty when no route exists). Used by
// click-to-move and by wardens hunting or returning to patrol.
export function findPath(level, sx, sy, gx, gy) {
  const startX = Math.floor(sx / TILE);
  const startY = Math.floor(sy / TILE);
  const goalX = Math.floor(gx / TILE);
  const goalY = Math.floor(gy / TILE);
  if (startX === goalX && startY === goalY) return [{ x: gx, y: gy }];
  const key = (x, y) => y * COLS + x;
  const prev = new Map();
  const seen = new Set([key(startX, startY)]);
  const queue = [[startX, startY]];
  const walkable = (x, y) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    const t = level.grid[y][x];
    return t !== '#' && t !== 'C';
  };
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    if (x === goalX && y === goalY) {
      const path = [];
      let cur = key(x, y);
      while (cur !== key(startX, startY)) {
        const cx = cur % COLS;
        const cy = Math.floor(cur / COLS);
        path.unshift({ x: cx * TILE + TILE / 2, y: cy * TILE + TILE / 2 });
        cur = prev.get(cur);
      }
      path[path.length - 1] = { x: gx, y: gy };
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!walkable(nx, ny) || seen.has(key(nx, ny))) continue;
      seen.add(key(nx, ny));
      prev.set(key(nx, ny), key(x, y));
      queue.push([nx, ny]);
    }
  }
  return [];
}
