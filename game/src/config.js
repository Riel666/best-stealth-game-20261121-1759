// Lantern's Edge — shared tuning constants. One job: the numbers every
// other module agrees on, so a balance change happens in exactly one place.
export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

export const PLAYER_SPEED = 150; // px per second, walking
export const PLAYER_SNEAK_SPEED = 85; // px per second, holding Shift
export const PLAYER_RADIUS = 13;

export const GUARD_PATROL_SPEED = 62;
export const GUARD_SUSPICIOUS_SPEED = 88;
export const GUARD_CHASE_SPEED = 128;
export const GUARD_CATCH_RADIUS = 26;
export const GUARD_WAYPOINT_PAUSE = 0.9; // seconds spent scanning at a post

export const VISION_RANGE = 195; // how far a warden can spot you
export const VISION_HALF_ANGLE = 0.61; // ~35 degrees each side of facing
export const BUSH_HIDE_RADIUS = 72; // a warden must be this close to spot you in a bush

export const METER_FILL_BASE = 95; // per second while fully seen, up close
export const METER_FILL_FAR = 0.45; // multiplier at the edge of the cone
export const METER_SNEAK_MULT = 0.45; // sneaking fills the meter slower
export const METER_MOVING_MULT = 1.25; // moving fills it faster
export const METER_DRAIN = 22; // per second while unseen
export const METER_DRAIN_BUSH = 34; // per second while hidden in a bush
export const METER_SUSPICIOUS = 55; // a warden turns to investigate
export const METER_ALARM = 100; // the alarm sounds, every warden hunts
export const METER_CALM = 28; // below this the alarm stands down

export const COLORS = {
  floorA: '#2b2539',
  floorB: '#262031',
  wall: '#4d4266',
  wallTop: '#6a5c8c',
  crate: '#7a5a34',
  crateEdge: '#5d4326',
  bush: '#2f6b3a',
  bushLight: '#3f8a4c',
  exit: '#58d68d',
  exitGlow: '#9ff5c0',
  player: '#f2c94c',
  playerCloak: '#3b2f5e',
  guard: '#c9503f',
  guardHelmet: '#e8e0d0',
  cone: 'rgba(255, 214, 106, 0.20)',
  coneAlert: 'rgba(255, 90, 70, 0.28)',
  dark: 'rgba(7, 5, 15, 0.52)',
};
