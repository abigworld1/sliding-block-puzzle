export function createAssistance() {
  return { hintCount: 0, autoplayMoves: 0 };
}

export function getCompletionMode(assistance) {
  if (assistance.autoplayMoves > 0) return "autoplay";
  if (assistance.hintCount > 0) return "hint";
  return "self";
}

export function describeAssistance(assistance) {
  const mode = getCompletionMode(assistance);
  if (mode === "self") return "ヒントなし・自動再生なし";
  if (mode === "hint") return `ヒントを${assistance.hintCount}回使用`;
  return `自動再生 ${assistance.autoplayMoves}手${assistance.hintCount > 0 ? `・ヒント ${assistance.hintCount}回` : ""}`;
}
