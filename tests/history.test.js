import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../js/levels.js";
import { applyMove, createMove, serializeState } from "../js/model.js";
import { commitHistory, createHistory, redoHistory, undoHistory } from "../js/history.js";

test("Undo、Redo、新規移動後のRedo破棄が正しい", () => {
  const initial = createInitialState();
  let history = createHistory(initial);
  const moved = applyMove(initial, createMove(initial, "H1", "left"));
  history = commitHistory(history, moved);
  assert.equal(history.past.length, 1);
  history = undoHistory(history);
  assert.equal(serializeState(history.present), serializeState(initial));
  assert.equal(history.future.length, 1);
  history = redoHistory(history);
  assert.equal(serializeState(history.present), serializeState(moved));
  history = undoHistory(history);
  const alternative = applyMove(initial, createMove(initial, "H1", "right"));
  history = commitHistory(history, alternative);
  assert.equal(history.future.length, 0);
});
