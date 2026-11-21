// Lantern's Edge — input. One job: turn keyboard and mouse into a small
// state the game reads each frame. WASD and arrows steer, Shift sneaks,
// a click walks to that spot, R restarts, M toggles sound. The game owns
// what any of it means.
export class Input {
  constructor(canvas, onKey) {
    this.keys = new Set();
    this.onKey = onKey; // (code) => void, for single-press actions
    this.click = null; // {x, y} in canvas pixels, consumed by the game
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.onKey(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.click = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    });
  }

  // The steering vector for this frame, from keys held down.
  steerVector() {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) dx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) dy += 1;
    return { dx, dy, sneak: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') };
  }

  takeClick() {
    const c = this.click;
    this.click = null;
    return c;
  }
}
