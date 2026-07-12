import test from "node:test";
import assert from "node:assert/strict";
import { createAssistance, describeAssistance, getCompletionMode } from "../js/assistance.js";

test("クリア方法を自力、ヒント、自動再生に分類する", () => {
  assert.equal(getCompletionMode(createAssistance()), "self");
  assert.equal(getCompletionMode({ hintCount: 2, autoplayMoves: 0 }), "hint");
  assert.equal(getCompletionMode({ hintCount: 2, autoplayMoves: 4 }), "autoplay");
});

test("クリア画面用のアシスト利用数を説明する", () => {
  assert.equal(describeAssistance(createAssistance()), "ヒントなし・自動再生なし");
  assert.equal(describeAssistance({ hintCount: 3, autoplayMoves: 0 }), "ヒントを3回使用");
  assert.equal(describeAssistance({ hintCount: 1, autoplayMoves: 8 }), "自動再生 8手・ヒント 1回");
});
