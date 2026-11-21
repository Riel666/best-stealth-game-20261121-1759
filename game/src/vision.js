// Lantern's Edge — sight. One job: the pure geometry of seeing. No DOM,
// no state: given a level, a watcher and a target it answers whether the
// target is seen, and what the watcher's vision cone looks like once the
// walls cut it short.
import { blocksSight, isBush } from './level.js';
import { VISION_RANGE, VISION_HALF_ANGLE, BUSH_HIDE_RADIUS } from './config.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when nothing blocks the straight line between the two points:
// march along the segment in small steps and stop at the first wall/crate.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSight(level, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

// Does this guard spot the player right now? Inside the cone's range and
// angle, with a clear line of sight — unless the player is crouched in a
// fern-bush, where only a warden standing close can make them out.
export function guardSeesPlayer(level, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), guard.dir)) > VISION_HALF_ANGLE) return false;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return false;
  if (isBush(level, player.x, player.y) && dist > BUSH_HIDE_RADIUS) return false;
  return true;
}

// How close the player is to the guard, 0 at the cone's edge and 1 on top
// of them: the detection meter fills faster the closer you are caught.
export function sightCloseness(guard, player) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  return Math.max(0, 1 - dist / VISION_RANGE);
}

// The vision cone as a polygon, clipped by walls: cast a fan of rays from
// the guard's eyes and stop each one at the first wall, crate or the
// range limit. The renderer fills this polygon; the game only uses the
// angle/range test above, so the picture and the rule always agree.
export function conePolygon(level, guard) {
  const rays = 17;
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= rays; i++) {
    const a = guard.dir - VISION_HALF_ANGLE + (2 * VISION_HALF_ANGLE * i) / rays;
    const step = 6;
    let r = step;
    let px = guard.x;
    let py = guard.y;
    while (r <= VISION_RANGE) {
      px = guard.x + Math.cos(a) * r;
      py = guard.y + Math.sin(a) * r;
      if (blocksSight(level, px, py)) break;
      r += step;
    }
    points.push({ x: px, y: py });
  }
  return points;
}
