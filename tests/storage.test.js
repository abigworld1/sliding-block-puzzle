import test from "node:test";
import assert from "node:assert/strict";
import { CLASSIC_LEVEL, createInitialState } from "../js/levels.js";
import { createHistory } from "../js/history.js";
import { decodeSave, encodeSave, loadGame, saveGame } from "../js/storage.js";

test("保存形式を安全に往復できる", () => {
  const data = {
    history: createHistory(createInitialState()),
    elapsedMs: 1234,
    best: { moves: 42, timeMs: 5678 },
    assistance: { hintCount: 2, autoplayMoves: 7 }
  };
  const decoded = decodeSave(encodeSave(data, CLASSIC_LEVEL), CLASSIC_LEVEL);
  assert.equal(decoded.elapsedMs, 1234);
  assert.deepEqual(decoded.best, data.best);
  assert.deepEqual(decoded.assistance, data.assistance);
  assert.equal(decoded.history.present.pieces.length, 10);
});

test("旧保存データではアシスト利用数を0として復元する", () => {
  const data = { history: createHistory(createInitialState()), elapsedMs: 0, best: {} };
  const decoded = decodeSave(encodeSave(data, CLASSIC_LEVEL), CLASSIC_LEVEL);
  assert.deepEqual(decoded.assistance, { hintCount: 0, autoplayMoves: 0 });
});

test("壊れたJSON、古いスキーマ、不正盤面を拒否する", () => {
  assert.equal(decodeSave("not json", CLASSIC_LEVEL), null);
  assert.equal(decodeSave(JSON.stringify({ schemaVersion: 0 }), CLASSIC_LEVEL), null);
  const data = { history: createHistory(createInitialState()), elapsedMs: 0, best: {} };
  const parsed = JSON.parse(encodeSave(data, CLASSIC_LEVEL));
  parsed.history.present.pieces[0].x = 99;
  assert.equal(decodeSave(JSON.stringify(parsed), CLASSIC_LEVEL), null);
});

test("Storage APIの失敗を呼び出し元へ漏らさない", () => {
  const brokenStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); } };
  assert.equal(loadGame(CLASSIC_LEVEL, brokenStorage), null);
  assert.equal(saveGame({ history: createHistory(createInitialState()), elapsedMs: 0, best: {} }, CLASSIC_LEVEL, brokenStorage), false);
});
