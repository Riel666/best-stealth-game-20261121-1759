# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Riel666/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Riel666/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Lantern's Edge — a top-down stealth game. Slip through three lamplit courtyards past patrolling wardens, hide behind crates and in the tall fern-bushes, and reach the green exit door unseen. A warden's vision cone fills your detection meter; break line of sight and the alarm cools — but if the meter fills, every warden hunts you down.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Validation

Local runs (twice, fresh output dirs) wrote identical bytes:

`node main.ts` with `MAKEFUN_OUTPUT_DIR` set copies `game/` and `screenshots/` and writes `dossier.json` (350,949 bytes). Screenshots are real renders of the game in headless Chromium at 1280x800: `1-cover.jpg` (74,099 bytes), `2-alarm.jpg` (81,904 bytes), `3-victory.jpg` (62,724 bytes) — each under the 256 KiB cap.

Headless play-tests with the real rules: `?selftest=1` clears level 1 in 0:09 with no alarm raised (score 1810); `?selftest=alarm` raises the alarm and gets caught at 0:03. Node smoke tests of the pure logic (levels, BFS paths, vision cones, bush hiding, guard patrol/investigate/search) all pass.

## Play

Move with WASD or the arrow keys, or click a spot to walk there. Hold Shift to sneak — slower, but much harder to spot. Bushes hide you completely unless a warden walks right up to you. Reach the glowing exit to clear a level; three levels, rising patrols, one score. `R` restarts, `M` toggles sound.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nrw7bbqr&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
