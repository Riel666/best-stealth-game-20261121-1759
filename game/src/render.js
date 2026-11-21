// Lantern's Edge — drawing. One job: paint one frame of the courtyard on
// the canvas. Floor, walls, crates and ferns first, then a night mask with
// light cut around your lantern and the exit, then the wardens' vision
// cones over the dark (so what is safe reads at a glance), then the figures,
// then the fern canopy over anyone hiding inside it.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, COLORS } from './config.js';
import { conePolygon } from './vision.js';

// A stable pseudo-random number for one tile, so the floor speckles never
// shimmer between frames.
function hashTile(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  return ((h * 1274126177) >> 8) / 8388608;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = document.createElement('canvas');
    this.light.width = VIEW_W;
    this.light.height = VIEW_H;
    this.time = 0;
  }

  draw(game) {
    const { ctx } = this;
    const level = game.level;
    this.time += 1 / 60;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    this.drawFloor(ctx, level);
    this.drawExit(ctx, level);
    this.drawBushesUnder(ctx, level);
    this.drawWalls(ctx, level);
    this.drawCrates(ctx, level);
    this.drawNight(ctx, game);
    this.drawCones(ctx, game);
    this.drawGuards(ctx, game);
    this.drawPlayer(ctx, game);
    this.drawBushesOver(ctx, level);
    if (game.alarm) this.drawAlarmEdge(ctx);
  }

  drawFloor(ctx, level) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = x * TILE;
        const py = y * TILE;
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(px, py, TILE, TILE);
        // A few pale speckles per tile, same every frame.
        const h = hashTile(x, y);
        if (h > 0.55) {
          ctx.fillStyle = 'rgba(255, 240, 200, 0.05)';
          ctx.fillRect(px + 8 + h * 18, py + 10 + (1 - h) * 16, 3, 3);
        }
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
      }
    }
  }

  drawExit(ctx, level) {
    const { x, y } = level.exit;
    const pulse = 0.75 + Math.sin(this.time * 3) * 0.25;
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 64);
    glow.addColorStop(0, `rgba(88, 214, 141, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(88, 214, 141, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 64, y - 64, 128, 128);
    ctx.fillStyle = '#123524';
    ctx.fillRect(x - 17, y - 19, 34, 38);
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(x - 13, y - 15, 26, 30);
    ctx.fillStyle = COLORS.exitGlow;
    ctx.fillRect(x - 13, y - 15, 26, 4);
    ctx.fillStyle = '#0d2b1a';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x, y + 34);
  }

  drawBushesUnder(ctx, level) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (level.grid[y][x] !== 'B') continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        ctx.fillStyle = 'rgba(20, 60, 28, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, 19, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // The fern canopy, drawn after the figures so a hidden player is
  // visibly tucked inside the leaves.
  drawBushesOver(ctx, level) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (level.grid[y][x] !== 'B') continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        ctx.fillStyle = COLORS.bush;
        for (const [ox, oy, r] of [[-9, -4, 10], [8, -6, 11], [0, 6, 11], [-2, -10, 8], [10, 7, 8]]) {
          ctx.beginPath();
          ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = COLORS.bushLight;
        for (const [ox, oy, r] of [[-6, -8, 4], [7, 2, 4], [-1, 8, 3]]) {
          ctx.beginPath();
          ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawWalls(ctx, level) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (level.grid[y][x] !== '#') continue;
        const px = x * TILE;
        const py = y * TILE;
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 7);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE, TILE);
      }
    }
  }

  drawCrates(ctx, level) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (level.grid[y][x] !== 'C') continue;
        const px = x * TILE + 4;
        const py = y * TILE + 4;
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px, py, TILE - 8, TILE - 8);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + TILE - 8, py + TILE - 8);
        ctx.moveTo(px + TILE - 8, py);
        ctx.lineTo(px, py + TILE - 8);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  }

  // Night over the courtyard, with light cut out around your lantern and
  // the exit door: the lit ground is the ground you can read.
  drawNight(ctx, game) {
    const lc = this.light.getContext('2d');
    lc.clearRect(0, 0, VIEW_W, VIEW_H);
    lc.fillStyle = COLORS.dark;
    lc.fillRect(0, 0, VIEW_W, VIEW_H);
    lc.globalCompositeOperation = 'destination-out';
    const cut = (x, y, r) => {
      const g = lc.createRadialGradient(x, y, r * 0.25, x, y, r);
      g.addColorStop(0, 'rgba(0, 0, 0, 1)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(x, y, r, 0, Math.PI * 2);
      lc.fill();
    };
    cut(game.player.x, game.player.y, 175);
    cut(game.level.exit.x, game.level.exit.y, 95);
    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0);
  }

  drawCones(ctx, game) {
    for (const guard of game.guards) {
      const poly = conePolygon(game.level, guard);
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fillStyle = guard.state === 'chase' ? COLORS.coneAlert : COLORS.cone;
      ctx.fill();
    }
  }

  drawGuards(ctx, game) {
    for (const guard of game.guards) {
      const { x, y } = guard;
      // A soft shadow under the warden.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + 11, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body and helmet, facing the way they look.
      ctx.fillStyle = COLORS.guard;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.guardHelmet;
      ctx.beginPath();
      ctx.arc(x + Math.cos(guard.dir) * 4, y + Math.sin(guard.dir) * 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b1a12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(guard.dir) * 20, y + Math.sin(guard.dir) * 20);
      ctx.stroke();
      ctx.lineWidth = 1;
      // "?" while suspicious or searching, "!" while hunting.
      let mark = '';
      if (guard.state === 'chase') mark = '!';
      else if (guard.state === 'suspicious' || guard.state === 'search') mark = '?';
      if (mark) {
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = guard.state === 'chase' ? '#ff6b5e' : '#ffd76a';
        ctx.fillText(mark, x, y - 22);
      }
    }
  }

  drawPlayer(ctx, game) {
    const p = game.player;
    const { x, y } = p;
    // Lantern light around you.
    const glow = ctx.createRadialGradient(x, y, 6, x, y, 60);
    glow.addColorStop(0, 'rgba(242, 201, 76, 0.35)');
    glow.addColorStop(1, 'rgba(242, 201, 76, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 60, y - 60, 120, 120);
    // Shadow, cloak, hood and lantern.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 11, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.playerCloak;
    ctx.beginPath();
    ctx.moveTo(x, y - 13);
    ctx.lineTo(x - 11, y + 10);
    ctx.lineTo(x + 11, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8d9b0';
    ctx.beginPath();
    ctx.arc(x, y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    // The lantern swings ahead of you as you walk.
    const lx = x + Math.cos(p.dir) * 16;
    const ly = y + Math.sin(p.dir) * 16;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.beginPath();
    ctx.moveTo(x, y - 2);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    // A small ring while sneaking, so the slow walk reads clearly.
    if (p.sneaking) {
      ctx.strokeStyle = 'rgba(242, 201, 76, 0.7)';
      ctx.beginPath();
      ctx.arc(x, y, 18 + Math.sin(this.time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // A red pulse at the screen's edge while the alarm sounds.
  drawAlarmEdge(ctx) {
    const pulse = 0.25 + Math.sin(this.time * 6) * 0.12;
    ctx.strokeStyle = `rgba(255, 70, 55, ${pulse})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, VIEW_W - 10, VIEW_H - 10);
    ctx.lineWidth = 1;
  }
}
