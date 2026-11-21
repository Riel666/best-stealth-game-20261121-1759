// Lantern's Edge — the wardens. One job: one guard's behaviour. A warden
// walks a patrol route, pauses at each post to scan, turns to investigate
// when the alarm meter climbs, hunts the player while the alarm sounds,
// and searches the last place they were seen before walking home.
import { findPath, isSolid } from './level.js';
import {
  GUARD_PATROL_SPEED,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_WAYPOINT_PAUSE,
} from './config.js';

export class Guard {
  constructor(start, route) {
    this.x = start.x;
    this.y = start.y;
    this.dir = 0; // facing, radians
    this.route = route;
    this.wpIndex = 0;
    this.state = 'patrol'; // patrol | suspicious | chase | search | return
    this.pause = 0; // seconds left scanning at a post
    this.path = []; // waypoints while hunting / returning
    this.pathIndex = 0;
    this.searchTime = 0;
    this.repath = 0; // timer: re-path to the moving player while chasing
    this.scanDir = 0; // slow sweep while searching a spot
  }

  // Where this guard is heading right now, as a list of waypoints.
  setPath(path) {
    this.path = path;
    this.pathIndex = 0;
  }

  // Walk toward a point at the given speed; returns true on arrival.
  // Slides along walls instead of sticking to them.
  stepToward(tx, ty, speed, dt, level) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const move = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * move;
    const ny = this.y + (dy / dist) * move;
    this.dir = Math.atan2(dy, dx);
    // Try the full step, then each axis alone, so corners slide.
    if (!isSolid(level, nx, ny)) {
      this.x = nx;
      this.y = ny;
    } else if (!isSolid(level, nx, this.y)) {
      this.x = nx;
    } else if (!isSolid(level, this.x, ny)) {
      this.y = ny;
    }
    return Math.hypot(tx - this.x, ty - this.y) < 3;
  }

  // Follow the queued path; true when the last waypoint is reached.
  followPath(speed, dt, level) {
    if (this.pathIndex >= this.path.length) return true;
    const wp = this.path[this.pathIndex];
    if (this.stepToward(wp.x, wp.y, speed, dt, level)) this.pathIndex++;
    return this.pathIndex >= this.path.length;
  }

  update(dt, level, player, alarm) {
    if (this.pause > 0) {
      this.pause -= dt;
      // Scan slowly left and right while standing at a post.
      this.dir += Math.sin(Date.now() / 900 + this.x) * 0.0012;
      return;
    }
    if (alarm) {
      if (this.state !== 'chase') {
        this.state = 'chase';
        this.setPath(findPath(level, this.x, this.y, player.x, player.y));
        this.repath = 0;
      }
      this.repath -= dt;
      if (this.repath <= 0) {
        this.repath = 0.6;
        this.setPath(findPath(level, this.x, this.y, player.x, player.y));
      }
      this.followPath(GUARD_CHASE_SPEED, dt, level);
      return;
    }
    if (this.state === 'chase' || this.state === 'search') {
      // The alarm stood down: search where the player was last seen.
      if (this.state === 'chase') {
        this.state = 'search';
        this.searchTime = 3;
        this.scanDir = this.dir;
      }
      this.searchTime -= dt;
      this.dir = this.scanDir + Math.sin(this.searchTime * 2.2) * 0.9;
      if (this.searchTime <= 0) {
        this.state = 'return';
        this.setPath(findPath(level, this.x, this.y, this.route[this.wpIndex].x, this.route[this.wpIndex].y));
      }
      return;
    }
    if (this.state === 'return') {
      if (this.followPath(GUARD_PATROL_SPEED, dt, level)) {
        this.state = 'patrol';
        this.pause = GUARD_WAYPOINT_PAUSE;
      }
      return;
    }
    if (this.state === 'suspicious') {
      // Walk to the spot that raised suspicion, then look around.
      if (this.followPath(GUARD_SUSPICIOUS_SPEED, dt, level)) {
        this.state = 'search';
        this.searchTime = 2.2;
        this.scanDir = this.dir;
      }
      return;
    }
    // Patrol: walk the route, pausing to scan at each post.
    const wp = this.route[this.wpIndex];
    if (this.stepToward(wp.x, wp.y, GUARD_PATROL_SPEED, dt, level)) {
      this.wpIndex = (this.wpIndex + 1) % this.route.length;
      this.pause = GUARD_WAYPOINT_PAUSE;
    }
  }

  // The alarm meter climbed past the suspicious line: go look at the
  // player's last seen spot (unless already chasing).
  investigate(x, y, level) {
    if (this.state === 'chase') return;
    this.state = 'suspicious';
    this.setPath(findPath(level, this.x, this.y, x, y));
  }
}
