import test from "node:test";
import assert from "node:assert/strict";
import { BoardRenderer } from "../js/renderer.js";

test("ドラッグ確定時は新位置を確定してからドラッグ表示を外す", () => {
  const calls = [];
  const element = {
    style: { removeProperty(name) { calls.push(`style:${name}`); } },
    classList: { remove(name) { calls.push(`class:${name}`); } },
    get offsetWidth() {
      calls.push("layout");
      return 100;
    }
  };
  const renderer = Object.create(BoardRenderer.prototype);
  renderer.elements = new Map([["S1", element]]);
  renderer.finishPreview("S1");
  assert.deepEqual(calls, ["style:transform", "layout", "class:is-dragging"]);
});
