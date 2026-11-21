// Lantern's Edge — you. One job: the player's movement. Keyboard steering
// (WASD / arrows), Shift to sneak, and click-to-move along a path the level
// finds for you. Collision slides along walls; the game, not this file,
// decides what the wardens see.
import { findPath, isSolid } from './level.js';
import { PLAYER_RADIUS, PLAYER_SPEED, PLAYER_SNEAK_SPEED } from './config.js';

export class Player {
  constructor(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.dir = -Math.PI / 2; // facing up the courtyard at the start
    this.sneaking = false;
    this.moving = false;
    this.path = []; // click-to-move waypoints
    this.pathIndex = 0;
    this.stepPhase = 0; // advances while walking, for the footstep sound
  }

  // Keyboard steering for one frame. Returns nothing; moving/sneaking are
  // read by the game for the detection meter and the footstep sound.
  steer(dx, dy, sneak, dt, level) {
    this.path = [];
    this.pathIndex = 0;
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    this.sneaking = sneak && this.moving;
    if (!this.moving) return;
    const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
    const nx = dx / len;
    const ny = dy / len;
    this.dir = Math.atan2(ny, nx);
    this.moveBy(nx * speed * dt, ny * speed * dt, level);
    this.stepPhase += (speed * dt) / 26;
  }

  // Walk to a clicked spot: find a route and follow it until a key is
  // pressed (steer clears the path) or the spot is reached.
  clickTo(tx, ty, level) {
    this.path = findPath(level, this.x, this.y, tx, ty);
    this.pathIndex = 0;
  }

  update(dt, level) {
    if (this.pathIndex >= this.path.length) {
      this.moving = false;
      this.sneaking = false;
      return;
    }
    const wp = this.path[this.pathIndex];
    const dx = wp.x - this.x;
    const dy = wp.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) {
      this.pathIndex++;
      return;
    }
    const speed = PLAYER_SPEED;
    const move = Math.min(dist, speed * dt);
    this.dir = Math.atan2(dy, dx);
    this.moving = true;
    this.sneaking = false;
    this.moveBy((dx / dist) * move, (dy / dist) * move, level);
    this.stepPhase += move / 26;
  }

  // Move with collision: try the full step, then each axis alone.
  moveBy(mx, my, level) {
    const r = PLAYER_RADIUS;
    const blocked = (x, y) =>
      isSolid(level, x - r, y - r) || isSolid(level, x + r, y - r) ||
      isSolid(level, x - r, y + r) || isSolid(level, x + r, y + r);
    if (!blocked(this.x + mx, this.y + my)) {
      this.x += mx;
      this.y += my;
    } else if (!blocked(this.x + mx, this.y)) {
      this.x += mx;
    } else if (!blocked(this.x, this.y + my)) {
      this.y += my;
    }
  }
}
