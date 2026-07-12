import test from "node:test";
import assert from "node:assert/strict";
import { CLASSIC_LEVEL, createInitialState } from "../js/levels.js";
import { applyMove, isSolved, validateMove } from "../js/model.js";
import { resolveMoveDescriptor, solveState } from "../js/solver-core.js";

test("ソルバーが初期配置から合法手だけで脱出する", { timeout: 15000 }, () => {
  let state = createInitialState();
  const result = solveState(state, CLASSIC_LEVEL);
  assert.ok(Array.isArray(result.moves));
  assert.ok(result.moves.length > 0);
  for (const descriptor of result.moves) {
    const move = resolveMoveDescriptor(state, descriptor);
    assert.ok(move, `解決できない手: ${JSON.stringify(descriptor)}`);
    assert.equal(validateMove(state, move).valid, true);
    state = applyMove(state, move);
  }
  assert.equal(isSolved(state), true);
});
