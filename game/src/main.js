// Bootstrap: wire the game to the page, pose a screenshot state when the
// URL asks for one (?shot=cover, ?shot=alarm, ?shot=victory — see shots.js),
// run the self-test when asked (?selftest=1), otherwise show the title
// screen. The game repaints every animation frame while playing.
import { Game } from './game.js';
import { applyShot } from './shots.js';

const game = new Game(document);
window.__game = game;

const params = new URLSearchParams(window.location.search);
const selftestMode = params.get('selftest');
if (selftestMode === '1' || selftestMode === 'alarm') {
  // Headless play-test, in fixed 1/60 s steps (no rAF: headless --dump-dom
  // produces no animation frames), reporting the result in the title and
  // #selftest. Mode 1 plays level 1 to win; mode "alarm" walks straight
  // into a warden to prove the alarm and the caught path.
  game.startGame();
  game.selftest = { frames: 0, hiding: false, result: null, alarmed: false };
  const report = document.createElement('div');
  report.id = 'selftest';
  report.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#000;color:#fff;font:14px monospace;padding:4px 8px;';
  document.body.appendChild(report);
  const dt = 1 / 60;
  while (!game.selftest.result) {
    if (selftestMode === 'alarm') {
      const g = game.guards[0];
      const dx = g.x - game.player.x;
      const dy = g.y - game.player.y;
      const len = Math.hypot(dx, dy) || 1;
      game.player.steer(dx / len, dy / len, false, dt, game.level);
      game.update(dt);
      if (game.alarm) game.selftest.alarmed = true;
      if (game.state === 'caught') {
        game.selftest.result = `PASS alarm raised (${game.selftest.alarmed}) then caught at ${game.formatTime(game.levelTime)}`;
      } else if (game.selftest.frames > 60 * 30) {
        game.selftest.result = `FAIL no catch in 30s (alarm raised: ${game.selftest.alarmed})`;
      }
      game.selftest.frames++;
    } else {
      game.debugDrive(dt);
      game.update(dt);
    }
  }
  game.draw();
  report.textContent = `SELFTEST ${game.selftest.result}`;
  document.title = `SELFTEST ${game.selftest.result}`;
} else {
  const posed = applyShot(game);
  if (!posed) game.showTitle();
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.state === 'play' && !game.frozen) game.update(dt);
    game.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
