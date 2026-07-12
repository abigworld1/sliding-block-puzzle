import test from "node:test";
import assert from "node:assert/strict";
import { ActiveTimer } from "../js/timer.js";

test("タイマーは稼働中だけ加算し、一時停止と再開ができる", () => {
  const timer = new ActiveTimer(500);
  assert.equal(timer.elapsed(100), 500);
  timer.start(100);
  assert.equal(timer.elapsed(350), 750);
  timer.pause(400);
  assert.equal(timer.elapsed(900), 800);
  timer.start(1000);
  assert.equal(timer.elapsed(1200), 1000);
  timer.reset();
  assert.equal(timer.elapsed(5000), 0);
});
