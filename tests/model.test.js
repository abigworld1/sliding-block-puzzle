import test from "node:test";
import assert from "node:assert/strict";
import { CLASSIC_LEVEL, createInitialState } from "../js/levels.js";
import {
  applyMove,
  canonicalStateKey,
  createEscapeMove,
  createMove,
  deserializeState,
  emptyCells,
  getMaxDistance,
  inverseMove,
  isEscapeAvailable,
  serializeState,
  validateMove,
  validateState
} from "../js/model.js";

test("初期配置は妥当で空きセルが正しい", () => {
  const state = createInitialState();
  assert.equal(validateState(state).valid, true);
  assert.deepEqual(emptyCells(state), [{ x: 0, y: 2 }, { x: 3, y: 2 }]);
});

test("初期状態の必須合法手を列挙できる", () => {
  const state = createInitialState();
  for (const [pieceId, direction] of [["H1", "left"], ["H1", "right"], ["V3", "up"], ["V4", "up"]]) {
    assert.equal(getMaxDistance(state, pieceId, direction), 1, `${pieceId} ${direction}`);
    assert.equal(validateMove(state, createMove(state, pieceId, direction)).valid, true);
  }
});

test("重なり、盤外、斜め、0セル、途中の障害物を拒否する", () => {
  const state = createInitialState();
  assert.equal(validateMove(state, { type: "move", pieceId: "K", fromX: 1, fromY: 0, toX: 0, toY: 0 }).valid, false);
  assert.equal(validateMove(state, { type: "move", pieceId: "H1", fromX: 1, fromY: 2, toX: -1, toY: 2 }).valid, false);
  assert.equal(validateMove(state, { type: "move", pieceId: "H1", fromX: 1, fromY: 2, toX: 2, toY: 3 }).valid, false);
  assert.equal(validateMove(state, { type: "move", pieceId: "H1", fromX: 1, fromY: 2, toX: 1, toY: 2 }).valid, false);
  assert.equal(validateMove(state, { type: "move", pieceId: "V3", fromX: 0, fromY: 3, toX: 0, toY: 0 }).valid, false);
  const rotated = createInitialState();
  const vertical = rotated.pieces.find((piece) => piece.id === "V1");
  [vertical.w, vertical.h] = [vertical.h, vertical.w];
  assert.equal(validateState(rotated).valid, false);
});

test("移動と逆移動で元の状態に戻る", () => {
  const state = createInitialState();
  const move = createMove(state, "H1", "left");
  const moved = applyMove(state, move);
  const restored = applyMove(moved, inverseMove(move));
  assert.equal(serializeState(restored), serializeState(state));
});

test("直列化と復元が往復し、不正状態を拒否する", () => {
  const state = createInitialState();
  assert.equal(serializeState(deserializeState(serializeState(state))), serializeState(state));
  const invalid = createInitialState();
  invalid.pieces.find((piece) => piece.id === "K").x = -1;
  assert.throws(() => deserializeState(JSON.stringify(invalid)));
});

test("同形駒のIDを入れ替えても正規化キーは同じ", () => {
  const state = createInitialState();
  const swapped = createInitialState();
  const first = swapped.pieces.find((piece) => piece.id === "S1");
  const second = swapped.pieces.find((piece) => piece.id === "S4");
  [first.x, second.x] = [second.x, first.x];
  [first.y, second.y] = [second.y, first.y];
  assert.equal(canonicalStateKey(swapped), canonicalStateKey(state));
});

test("目標駒は出口直前だけで脱出できる", () => {
  const state = createInitialState();
  assert.equal(isEscapeAvailable(state), false);
  assert.equal(validateMove(state, createEscapeMove(state)).valid, false);

  const ready = createInitialState();
  ready.pieces = ready.pieces.filter((piece) => !["S1", "S2", "S3", "S4"].includes(piece.id));
  const target = ready.pieces.find((piece) => piece.id === "K");
  target.y = 3;
  // バリデータ対象ではない局所テスト用状態。出口判定は目標位置だけに依存する。
  assert.equal(isEscapeAvailable(ready, CLASSIC_LEVEL), true);
  assert.equal(validateMove(ready, { type: "move", pieceId: "K", fromX: 1, fromY: 3, toX: 1, toY: 4 }).valid, false);
  const escaped = applyMove(ready, createEscapeMove(ready));
  assert.equal(escaped.escaped, true);
  assert.equal(target.y, 3);
});

test("不正なレベル状態を検出する", () => {
  const overlap = createInitialState();
  overlap.pieces.find((piece) => piece.id === "S1").x = 2;
  assert.equal(validateState(overlap).valid, false);
  const duplicate = createInitialState();
  duplicate.pieces[1].id = "K";
  assert.equal(validateState(duplicate).valid, false);
  const wrongLevel = createInitialState();
  wrongLevel.levelId = "unknown";
  assert.equal(validateState(wrongLevel).valid, false);
});
