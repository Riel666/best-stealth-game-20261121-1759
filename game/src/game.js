// Lantern's Edge — the game. One job: hold the state and run one frame of
// it. Levels, the detection meter, the alarm, scoring, the HUD and the
// overlays all live here; sight lives in vision.js, wardens in guards.js,
// movement in player.js, drawing in render.js, sound in audio.js.
import { LEVELS, parseLevel, isBush, isExit, findPath } from './level.js';
import { Guard } from './guards.js';
import { Player } from './player.js';
import { Renderer } from './render.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { guardSeesPlayer, sightCloseness } from './vision.js';
import {
  VIEW_W,
  VIEW_H,
  TILE,
  COLS,
  ROWS,
  METER_FILL_BASE,
  METER_FILL_FAR,
  METER_SNEAK_MULT,
  METER_MOVING_MULT,
  METER_DRAIN,
  METER_DRAIN_BUSH,
  METER_SUSPICIOUS,
  METER_ALARM,
  METER_CALM,
  GUARD_CATCH_RADIUS,
} from './config.js';

export class Game {
  constructor(doc) {
    this.doc = doc;
    this.canvas = doc.getElementById('game');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.renderer = new Renderer(this.canvas);
    this.sound = new SoundBank();
    this.input = new Input(this.canvas, (code) => this.onKey(code));
    this.state = 'title'; // title | play | levelClear | caught | victory
    this.levelIndex = 0;
    this.score = 0;
    this.meter = 0;
    this.alarm = false;
    this.alarmEpisode = false;
    this.alerts = 0; // alarms raised across the whole run
    this.levelAlerts = 0;
    this.levelTime = 0;
    this.suspicionRaised = false;
    this.lastSeen = null;
    this.selftest = null; // {frames, result} while the self-test runs
    this.frozen = false; // a posed ?shot= state: drawn but never updated
    const soundBtn = doc.getElementById('soundBtn');
    if (soundBtn) soundBtn.addEventListener('click', () => this.toggleSound());
    const restartBtn = doc.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (this.state === 'title') this.startGame();
        else this.retryLevel();
      });
    }
    this.loadLevel(0);
    this.updateHud();
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVELS[index]);
    this.player = new Player(this.level.spawn);
    this.guards = this.level.guards.map((g) => new Guard(g, g.route));
    this.meter = 0;
    this.alarm = false;
    this.alarmEpisode = false;
    this.levelAlerts = 0;
    this.levelTime = 0;
    this.suspicionRaised = false;
    this.lastSeen = null;
  }

  startGame() {
    this.score = 0;
    this.alerts = 0;
    this.loadLevel(0);
    this.state = 'play';
    this.hideOverlay();
    this.setMessage('Reach the green exit door — unseen if you can.');
    this.sound.levelStart();
    this.updateHud();
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.state = 'victory';
      this.showVictory();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.state = 'play';
    this.hideOverlay();
    this.setMessage(this.level.hint);
    this.sound.levelStart();
    this.updateHud();
  }

  retryLevel() {
    this.loadLevel(this.levelIndex);
    this.state = 'play';
    this.hideOverlay();
    this.setMessage(this.level.hint);
    this.updateHud();
  }

  onKey(code) {
    if (code === 'KeyR' && this.state !== 'title') this.retryLevel();
    if (code === 'KeyM') this.toggleSound();
    if (code === 'Enter' && this.state === 'title') this.startGame();
  }

  toggleSound() {
    const on = this.sound.toggle();
    const btn = this.doc.getElementById('soundBtn');
    if (btn) btn.textContent = on ? 'Sound: on' : 'Sound: off';
  }

  // One frame of play. dt is seconds since the last frame.
  update(dt) {
    if (this.state !== 'play') return;
    this.levelTime += dt;

    const { dx, dy, sneak } = this.input.steerVector();
    if (dx !== 0 || dy !== 0) {
      this.player.steer(dx, dy, sneak, dt, this.level);
    } else {
      this.player.update(dt, this.level);
    }
    const click = this.input.takeClick();
    if (click) this.player.clickTo(click.x, click.y, this.level);
    if (this.player.moving) this.sound.footstep(this.player.sneaking);

    // --- detection: any warden with eyes on you fills the meter.
    let seen = false;
    let closest = 0;
    for (const guard of this.guards) {
      if (guardSeesPlayer(this.level, guard, this.player)) {
        seen = true;
        closest = Math.max(closest, sightCloseness(guard, this.player));
        this.lastSeen = { x: this.player.x, y: this.player.y };
      }
    }
    const inBush = isBush(this.level, this.player.x, this.player.y);
    if (seen) {
      const rate = METER_FILL_BASE * (METER_FILL_FAR + (1 - METER_FILL_FAR) * closest)
        * (this.player.sneaking ? METER_SNEAK_MULT : 1)
        * (this.player.moving ? METER_MOVING_MULT : 1);
      this.meter = Math.min(METER_ALARM, this.meter + rate * dt);
    } else {
      this.meter = Math.max(0, this.meter - (inBush ? METER_DRAIN_BUSH : METER_DRAIN) * dt);
    }

    if (!this.suspicionRaised && this.meter >= METER_SUSPICIOUS && this.meter < METER_ALARM) {
      this.suspicionRaised = true;
      this.sound.suspicious();
      for (const guard of this.guards) {
        if (this.lastSeen) guard.investigate(this.lastSeen.x, this.lastSeen.y, this.level);
      }
      this.setMessage('A warden thinks they saw something — break line of sight!');
    }
    if (this.meter < METER_SUSPICIOUS) this.suspicionRaised = false;

    if (!this.alarm && this.meter >= METER_ALARM) {
      this.alarm = true;
      this.alarmEpisode = true;
      this.alerts++;
      this.levelAlerts++;
      this.setMessage('ALARM! Every warden is hunting you — hide in the ferns!');
    }
    if (this.alarm && this.meter <= METER_CALM) {
      this.alarm = false;
      this.alarmEpisode = false;
      this.setMessage('The alarm dies down. The wardens are searching — stay out of sight.');
    }
    if (this.alarm) this.sound.alarmTick(dt);

    for (const guard of this.guards) {
      guard.update(dt, this.level, this.player, this.alarm);
    }

    // Caught: a hunting warden lays a hand on you.
    if (this.alarm) {
      for (const guard of this.guards) {
        if (Math.hypot(guard.x - this.player.x, guard.y - this.player.y) < GUARD_CATCH_RADIUS) {
          this.caught();
          return;
        }
      }
    }

    // Through the exit: the level is yours.
    if (isExit(this.level, this.player.x, this.player.y)) {
      this.levelClear();
      return;
    }

    this.updateHud();
  }

  levelClear() {
    const timeBonus = Math.max(0, 600 - Math.floor(this.levelTime) * 10);
    const ghostBonus = this.levelAlerts === 0 ? 300 : 0;
    const gained = 1000 + timeBonus + ghostBonus;
    this.score += gained;
    this.state = 'levelClear';
    this.sound.win();
    const last = this.levelIndex + 1 >= LEVELS.length;
    const title = last ? 'The Vault is yours' : `${this.level.name} — cleared`;
    const body = `<p class="big">+${gained} points</p>
      <p>Time ${this.formatTime(this.levelTime)} · Alarms this level: ${this.levelAlerts}</p>
      <p>${this.levelAlerts === 0 ? 'Not a single warden raised the alarm. A ghost.' : 'You were spotted — but you slipped away.'}</p>
      <p>Total score: <b>${this.score}</b></p>`;
    const button = last
      ? `<button type="button" id="nextBtn">See your result</button>`
      : `<button type="button" id="nextBtn">Next courtyard</button>`;
    this.showOverlay(title, body, button);
    const btn = this.doc.getElementById('nextBtn');
    if (btn) btn.addEventListener('click', () => this.nextLevel());
    this.updateHud();
  }

  caught() {
    this.state = 'caught';
    this.sound.caught();
    this.showOverlay(
      'Caught in the lamplight',
      `<p>A warden caught you in the open on <b>${this.level.name}</b>.</p>
       <p>Time ${this.formatTime(this.levelTime)} · Alarms so far: ${this.alerts}</p>
       <p>Tip: wait for a patrol to turn, slip behind a crate, and hide in the ferns until the meter drains.</p>`,
      `<button type="button" id="retryBtn">Try again (R)</button>`,
    );
    const btn = this.doc.getElementById('retryBtn');
    if (btn) btn.addEventListener('click', () => this.retryLevel());
    this.updateHud();
  }

  showVictory() {
    this.sound.win();
    this.showOverlay(
      'Lantern\'s Edge — you slipped through every courtyard',
      `<p class="big">Final score: ${this.score}</p>
       <p>Three courtyards, ${LEVELS.length} exits, ${this.alerts} alarm${this.alerts === 1 ? '' : 's'} raised.</p>
       <p>${this.alerts === 0 ? 'A perfect ghost run — no warden ever sounded the alarm.' : 'The wardens are still arguing about the lantern they saw move by itself.'}</p>`,
      `<button type="button" id="againBtn">Play again</button>`,
    );
    const btn = this.doc.getElementById('againBtn');
    if (btn) btn.addEventListener('click', () => this.startGame());
    this.updateHud();
  }

  showTitle() {
    this.state = 'title';
    this.showOverlay(
      'Lantern\'s Edge',
      `<p>A top-down stealth game. Slip through three lamplit courtyards past the wardens, and reach the green exit door unseen.</p>
       <p><b>WASD / arrows</b> move · <b>Shift</b> sneak · <b>click</b> walk to a spot · <b>R</b> restart · <b>M</b> sound</p>
       <p>Crates block a warden's sight. Fern-bushes hide you unless a warden walks right up. A full detection meter sounds the alarm — break line of sight and hide until it cools.</p>`,
      `<button type="button" id="startBtn">Begin the first courtyard</button>`,
    );
    const btn = this.doc.getElementById('startBtn');
    if (btn) btn.addEventListener('click', () => this.startGame());
  }

  // --- HUD and overlays (DOM, kept out of the canvas) ---

  showOverlay(title, body, buttons) {
    const overlay = this.doc.getElementById('overlay');
    const card = this.doc.getElementById('overlayCard');
    card.innerHTML = `<h2>${title}</h2>${body}${buttons}`;
    overlay.classList.add('show');
  }

  hideOverlay() {
    this.doc.getElementById('overlay').classList.remove('show');
  }

  setMessage(text) {
    const el = this.doc.getElementById('message');
    if (el) el.textContent = text;
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  updateHud() {
    const set = (id, text) => {
      const el = this.doc.getElementById(id);
      if (el) el.textContent = text;
    };
    set('levelName', `Level ${this.levelIndex + 1} · ${this.level.name}`);
    set('timer', this.formatTime(this.levelTime));
    set('score', String(this.score));
    const fill = this.doc.getElementById('alertFill');
    if (fill) {
      fill.style.width = `${this.meter}%`;
      fill.className = this.alarm ? 'alarm' : this.meter >= METER_SUSPICIOUS ? 'warm' : '';
    }
    const label = this.doc.getElementById('alertLabel');
    if (label) {
      label.textContent = this.alarm ? 'ALARM' : this.meter >= METER_SUSPICIOUS ? 'Suspicious' : 'Unseen';
    }
    const dots = this.doc.getElementById('levelDots');
    if (dots) {
      dots.innerHTML = LEVELS.map((l, i) => `<span class="dot${i < this.levelIndex ? ' done' : ''}${i === this.levelIndex ? ' now' : ''}">${i + 1}</span>`).join('');
    }
  }

  draw() {
    this.renderer.draw(this);
  }

  // --- self-test: play level 1 with the real rules, hiding in a bush when
  // the meter climbs. Used by ?selftest=1 in headless Chrome only; it
  // drives the same input the player uses and reports win / caught /
  // timeout into document.title and #selftest.
  debugDrive(dt) {
    if (!this.selftest) return;
    this.selftest.frames++;
    const st = this.selftest;
    if (this.state === 'levelClear' || this.state === 'victory') {
      st.result = `PASS level cleared in ${this.formatTime(this.levelTime)} score ${this.score}`;
      return;
    }
    if (this.state === 'caught') {
      st.result = 'FAIL caught by a warden';
      return;
    }
    if (this.selftest.frames > 60 * 75) {
      st.result = 'FAIL timeout after 75s of play';
      return;
    }
    // Hot meter: run for the nearest fern-bush and wait it out.
    if (this.meter > 55 && !this.selftest.hiding) {
      const bush = this.nearestBush();
      if (bush) {
        this.selftest.hiding = true;
        this.player.clickTo(bush.x, bush.y, this.level);
      }
    }
    if (this.selftest.hiding) {
      if (this.meter < 25) {
        this.selftest.hiding = false;
        this.player.clickTo(this.level.exit.x, this.level.exit.y, this.level);
      }
      return;
    }
    if (this.player.path.length === 0) {
      this.player.clickTo(this.level.exit.x, this.level.exit.y, this.level);
    }
  }

  nearestBush() {
    let best = null;
    let bestDist = Infinity;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.level.grid[y][x] !== 'B') continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        const d = Math.hypot(cx - this.player.x, cy - this.player.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x: cx, y: cy };
        }
      }
    }
    return best;
  }
}
