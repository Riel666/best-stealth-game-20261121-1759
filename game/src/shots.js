// Posed states for the entry's screenshots (shots.json). A ?shot= value puts
// the game into a state a real play session reaches, so the screenshots are
// honest renders of the game itself: same code, same state, only the path
// there is a query instead of keys and clicks.
export function applyShot(game) {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!shot) return false;
  if (shot === 'cover') {
    // Level 1 mid-hunt: you crouch behind a crate while a warden's cone
    // sweeps past, the exit glowing across the courtyard, meter half full.
    game.frozen = true;
    game.startGame();
    game.player.x = 9 * 40 + 20;
    game.player.y = 6 * 40 + 20;
    game.player.dir = Math.PI / 2;
    game.player.sneaking = true;
    game.meter = 34;
    game.levelTime = 41;
    game.score = 0;
    game.guards[0].x = 12 * 40 + 20;
    game.guards[0].y = 2 * 40 + 20;
    game.guards[0].dir = 2.0; // cone sweeping down-left, just catching you
    game.guards[1].x = 7 * 40 + 20;
    game.guards[1].y = 5 * 40 + 20;
    game.guards[1].dir = 0;
    game.setMessage('A warden patrols past — hold still behind the crate.');
    game.updateHud();
    game.draw();
    return true;
  }
  if (shot === 'alarm') {
    // Level 2, the alarm sounding: the meter full, wardens converging on
    // you as you dive for the ferns.
    game.frozen = true;
    game.loadLevel(1);
    game.state = 'play';
    game.hideOverlay();
    game.player.x = 12 * 40 + 20;
    game.player.y = 11 * 40 + 20;
    game.player.dir = -Math.PI / 2;
    game.meter = 96;
    game.alarm = true;
    game.levelAlerts = 1;
    game.alerts = 1;
    game.levelTime = 87;
    game.score = 0;
    game.guards[0].x = 10 * 40 + 20;
    game.guards[0].y = 7 * 40 + 20;
    game.guards[0].dir = Math.PI / 2;
    game.guards[0].state = 'chase';
    game.guards[1].x = 14 * 40 + 20;
    game.guards[1].y = 7 * 40 + 20;
    game.guards[1].dir = Math.PI / 2;
    game.guards[1].state = 'chase';
    game.guards[2].x = 9 * 40 + 20;
    game.guards[2].y = 11 * 40 + 20;
    game.guards[2].dir = 0;
    game.guards[2].state = 'chase';
    game.setMessage('ALARM! Every warden is hunting you — hide in the ferns!');
    game.updateHud();
    game.draw();
    return true;
  }
  if (shot === 'victory') {
    // The win screen after the third courtyard, with the final score.
    game.frozen = true;
    game.startGame();
    game.score = 3420;
    game.alerts = 1;
    game.levelIndex = 2;
    game.loadLevel(2);
    game.score = 3420;
    game.alerts = 1;
    game.state = 'victory';
    game.showVictory();
    game.updateHud();
    game.draw();
    return true;
  }
  return false;
}
