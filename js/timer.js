export class ActiveTimer {
  constructor(elapsedMs = 0) {
    this.accumulatedMs = Math.max(0, elapsedMs);
    this.startedAt = null;
  }

  start(now = performance.now()) {
    if (this.startedAt === null) this.startedAt = now;
  }

  pause(now = performance.now()) {
    if (this.startedAt !== null) {
      this.accumulatedMs += Math.max(0, now - this.startedAt);
      this.startedAt = null;
    }
  }

  reset(elapsedMs = 0) {
    this.accumulatedMs = Math.max(0, elapsedMs);
    this.startedAt = null;
  }

  get running() {
    return this.startedAt !== null;
  }

  elapsed(now = performance.now()) {
    return Math.floor(this.accumulatedMs + (this.startedAt === null ? 0 : Math.max(0, now - this.startedAt)));
  }
}
