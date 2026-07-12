import { DIRECTIONS, KIND_LABELS } from "./constants.js";
import { CLASSIC_LEVEL, createInitialState } from "./levels.js";
import { commitHistory, createHistory, redoHistory, undoHistory } from "./history.js";
import { applyMove, createEscapeMove, createMove, getMaxDistance, getPiece, isEscapeAvailable, validateMove } from "./model.js";
import { loadGame, saveGame } from "./storage.js";
import { ActiveTimer } from "./timer.js";
import { BoardRenderer } from "./renderer.js";
import { InputController } from "./input.js";
import { SolverClient } from "./solver-client.js";
import { resolveMoveDescriptor } from "./solver-core.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  board: $("#game-board"),
  piecesLayer: $("#pieces-layer"),
  moveCount: $("#move-count"),
  elapsedTime: $("#elapsed-time"),
  bestMoves: $("#best-moves"),
  bestTime: $("#best-time"),
  gameStateBadge: $("#game-state-badge"),
  selectedLabel: $("#selected-piece-label"),
  selectionHelp: $("#selection-help"),
  saveIndicator: $("#save-indicator"),
  farthest: $("#move-farthest"),
  undo: $("#undo-button"),
  redo: $("#redo-button"),
  restart: $("#restart-button"),
  hint: $("#hint-button"),
  solutionStep: $("#solution-step-button"),
  autoplay: $("#autoplay-button"),
  cancelSolution: $("#cancel-solution-button"),
  solverStatus: $("#solver-status"),
  solverSpinner: $("#solver-spinner"),
  live: $("#live-region"),
  helpButton: $("#help-button"),
  helpDialog: $("#help-dialog"),
  restartDialog: $("#restart-dialog"),
  confirmRestart: $("#confirm-restart-button"),
  clearDialog: $("#clear-dialog"),
  clearSummary: $("#clear-summary"),
  playAgain: $("#play-again-button")
};

const restored = loadGame(CLASSIC_LEVEL);
let history = restored?.history ?? createHistory(createInitialState());
let best = restored?.best ?? { moves: null, timeMs: null };
const timer = new ActiveTimer(restored?.elapsedMs ?? 0);
let selectedId = null;
let solution = null;
let solving = false;
let autoplayTimer = null;
let escaping = false;
let clearDialogTimer = null;
let tickCount = 0;

const renderer = new BoardRenderer(elements.board, elements.piecesLayer, CLASSIC_LEVEL);
const solver = new SolverClient();

function currentState() {
  return history.present;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function announce(message) {
  elements.live.textContent = "";
  window.setTimeout(() => { elements.live.textContent = message; }, 20);
}

function describeDescriptor(descriptor) {
  if (!descriptor) return "";
  if (descriptor.type === "escape") return "目標駒を下の出口へ脱出";
  const dx = descriptor.toX - descriptor.fromX;
  const dy = descriptor.toY - descriptor.fromY;
  const direction = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
  return `${KIND_LABELS[descriptor.kind]}を${DIRECTIONS[direction].label}へ${Math.abs(dx || dy)}セル`;
}

function hintPieceId() {
  if (!solution?.length) return null;
  return resolveMoveDescriptor(currentState(), solution[0])?.pieceId ?? null;
}

function render() {
  if (selectedId && !getPiece(currentState(), selectedId)) selectedId = null;
  renderer.render(currentState(), { selectedId, hintPieceId: hintPieceId(), escaping });
  elements.moveCount.textContent = String(history.past.length);
  elements.elapsedTime.textContent = formatTime(timer.elapsed());
  elements.bestMoves.textContent = best.moves ?? "—";
  elements.bestTime.textContent = best.timeMs === null ? "—" : formatTime(best.timeMs);
  elements.undo.disabled = history.past.length === 0;
  elements.redo.disabled = history.future.length === 0;
  elements.restart.disabled = history.past.length === 0 && timer.elapsed() === 0;
  elements.gameStateBadge.textContent = currentState().escaped ? "脱出成功" : "挑戦中";
  elements.gameStateBadge.classList.toggle("is-clear", currentState().escaped);

  const selected = selectedId ? getPiece(currentState(), selectedId) : null;
  elements.selectedLabel.textContent = selected ? `${KIND_LABELS[selected.kind]} ${selected.id}` : "未選択";
  elements.selectionHelp.textContent = selected
    ? `${KIND_LABELS[selected.kind]} ${selected.id} を選択中。光る方向ボタンまたは矢印キーで移動できます。`
    : "駒をドラッグするか、選んで矢印キーで動かしてください。";
  for (const button of document.querySelectorAll("[data-direction]")) {
    const direction = button.dataset.direction;
    const canEscape = selected?.id === "K" && direction === "down" && isEscapeAvailable(currentState(), CLASSIC_LEVEL);
    const canMove = selected && getMaxDistance(currentState(), selected.id, direction, CLASSIC_LEVEL) > 0;
    button.disabled = currentState().escaped || (!canMove && !canEscape);
  }
  elements.solutionStep.disabled = solving || !solution?.length || currentState().escaped;
  elements.cancelSolution.disabled = !solving && !solution?.length && autoplayTimer === null;
  elements.hint.disabled = solving || currentState().escaped;
  elements.solverSpinner.hidden = !solving;
}

function persist() {
  const saved = saveGame({ history, elapsedMs: timer.elapsed(), best }, CLASSIC_LEVEL);
  elements.saveIndicator.textContent = saved ? "自動保存" : "保存できません";
}

function beginTimerIfNeeded() {
  if (!document.hidden && !currentState().escaped && !timer.running) timer.start();
}

function stopAutoplay() {
  if (autoplayTimer !== null) window.clearTimeout(autoplayTimer);
  autoplayTimer = null;
  elements.autoplay.textContent = "自動再生";
}

function clearSolution({ cancelWorker = true, status = "現在の局面から解答を探索できます。" } = {}) {
  stopAutoplay();
  if (cancelWorker) solver.cancel();
  solution = null;
  solving = false;
  elements.solverStatus.textContent = status;
}

function updateBest() {
  const moves = history.past.length;
  const timeMs = timer.elapsed();
  if (best.moves === null || moves < best.moves) best.moves = moves;
  if (best.timeMs === null || timeMs < best.timeMs) best.timeMs = timeMs;
}

function showClearDialog() {
  clearDialogTimer = null;
  if (!currentState().escaped) return;
  elements.clearSummary.textContent = `${history.past.length}手、${formatTime(timer.elapsed())}でクリアしました。`;
  if (!elements.clearDialog.open) elements.clearDialog.showModal();
  announce(`脱出成功。${history.past.length}手、${formatTime(timer.elapsed())}でクリアしました。`);
}

function commitMove(move, { fromSolution = false } = {}) {
  const validation = validateMove(currentState(), move, CLASSIC_LEVEL);
  if (!validation.valid) {
    announce(validation.reason);
    return false;
  }
  if (!fromSolution) clearSolution();
  const next = applyMove(currentState(), move, CLASSIC_LEVEL);
  beginTimerIfNeeded();
  history = commitHistory(history, next);
  if (move.type === "move") selectedId = move.pieceId;

  if (next.escaped) {
    escaping = true;
    selectedId = null;
    timer.pause();
    stopAutoplay();
    updateBest();
    elements.solverStatus.textContent = "目標駒が出口から脱出しました。";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    clearDialogTimer = window.setTimeout(showClearDialog, reduced ? 30 : 520);
  }
  persist();
  render();
  if (move.type === "escape") announce("目標駒を出口へ動かしました。");
  else {
    const piece = getPiece(next, move.pieceId);
    const distance = Math.abs(move.toX - move.fromX || move.toY - move.fromY);
    announce(`${KIND_LABELS[piece.kind]} ${piece.id} を${distance}セル動かしました。`);
  }
  return true;
}

function movePiece(pieceId, direction, distance = 1, options = {}) {
  const maximum = getMaxDistance(currentState(), pieceId, direction, CLASSIC_LEVEL);
  if (maximum < 1) {
    announce(`${DIRECTIONS[direction].label}には動かせません。`);
    return false;
  }
  const actualDistance = Math.min(distance, maximum);
  return commitMove(createMove(currentState(), pieceId, direction, actualDistance), options);
}

function escapeTarget(options = {}) {
  if (!isEscapeAvailable(currentState(), CLASSIC_LEVEL)) {
    announce("目標駒はまだ出口直前にありません。");
    return false;
  }
  return commitMove(createEscapeMove(currentState()), options);
}

function selectPiece(pieceId) {
  if (currentState().escaped) return;
  selectedId = selectedId === pieceId ? pieceId : pieceId;
  const piece = getPiece(currentState(), pieceId);
  announce(`${KIND_LABELS[piece.kind]} ${piece.id} を選択しました。`);
  render();
}

function undo() {
  if (history.past.length === 0) return;
  if (clearDialogTimer !== null) window.clearTimeout(clearDialogTimer);
  clearDialogTimer = null;
  if (elements.clearDialog.open) elements.clearDialog.close();
  escaping = false;
  clearSolution();
  history = undoHistory(history);
  if (!currentState().escaped && history.past.length > 0) beginTimerIfNeeded();
  else if (history.past.length === 0) timer.pause();
  persist();
  render();
  announce("1手戻しました。Redoでやり直せます。");
}

function redo() {
  if (history.future.length === 0) return;
  clearSolution();
  history = redoHistory(history);
  if (currentState().escaped) {
    timer.pause();
    updateBest();
    showClearDialog();
  } else beginTimerIfNeeded();
  persist();
  render();
  announce("1手やり直しました。");
}

function resetGame() {
  if (clearDialogTimer !== null) window.clearTimeout(clearDialogTimer);
  clearDialogTimer = null;
  if (elements.clearDialog.open) elements.clearDialog.close();
  if (elements.restartDialog.open) elements.restartDialog.close();
  clearSolution();
  history = createHistory(createInitialState());
  timer.reset();
  selectedId = null;
  escaping = false;
  persist();
  render();
  announce("初期配置に戻しました。");
}

async function requestSolution() {
  if (currentState().escaped) return false;
  stopAutoplay();
  solution = null;
  solving = true;
  elements.solverStatus.textContent = "現在の局面から解答を探索中…";
  render();
  try {
    const result = await solver.solve(currentState());
    solving = false;
    if (!result.moves) {
      elements.solverStatus.textContent = "この局面からの解答は見つかりませんでした。";
      announce("解答が見つかりませんでした。");
      render();
      return false;
    }
    solution = result.moves;
    elements.solverStatus.textContent = solution.length
      ? `次の一手: ${describeDescriptor(solution[0])}（残り${solution.length}手）`
      : "すでにクリアしています。";
    announce(solution.length ? `ヒント。${describeDescriptor(solution[0])}。` : "すでにクリアしています。");
    render();
    return true;
  } catch (error) {
    solving = false;
    if (error.name !== "AbortError") {
      elements.solverStatus.textContent = `探索エラー: ${error.message}`;
      announce("解答の探索中にエラーが発生しました。");
    }
    render();
    return false;
  }
}

async function ensureSolution() {
  return solution?.length ? true : requestSolution();
}

async function stepSolution() {
  if (!(await ensureSolution()) || !solution?.length) return false;
  const descriptor = solution[0];
  const move = resolveMoveDescriptor(currentState(), descriptor);
  if (!move) {
    clearSolution({ status: "局面が変わったため、解答を再探索してください。" });
    render();
    return false;
  }
  const moved = commitMove(move, { fromSolution: true });
  if (!moved) return false;
  solution.shift();
  if (!currentState().escaped) {
    elements.solverStatus.textContent = solution.length
      ? `次の一手: ${describeDescriptor(solution[0])}（残り${solution.length}手）`
      : "解答の再生が完了しました。";
  }
  render();
  return true;
}

async function toggleAutoplay() {
  if (autoplayTimer !== null) {
    stopAutoplay();
    elements.solverStatus.textContent = solution?.length ? `一時停止中（残り${solution.length}手）` : "自動再生を停止しました。";
    render();
    return;
  }
  if (!(await ensureSolution()) || !solution?.length) return;
  elements.autoplay.textContent = "一時停止";
  const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 90 : 430;
  const playNext = async () => {
    autoplayTimer = null;
    const moved = await stepSolution();
    if (!moved || currentState().escaped || !solution?.length) {
      stopAutoplay();
      render();
      return;
    }
    elements.autoplay.textContent = "一時停止";
    autoplayTimer = window.setTimeout(playNext, delay);
    render();
  };
  autoplayTimer = window.setTimeout(playNext, 120);
  render();
}

new InputController({
  board: elements.board,
  renderer,
  level: CLASSIC_LEVEL,
  getState: currentState,
  onSelect: selectPiece,
  onMove: (pieceId, direction, distance) => movePiece(pieceId, direction, distance),
  onEscape: () => escapeTarget()
});

for (const button of document.querySelectorAll("[data-direction]")) {
  button.addEventListener("click", () => {
    if (!selectedId) return;
    const direction = button.dataset.direction;
    if (selectedId === "K" && direction === "down" && isEscapeAvailable(currentState(), CLASSIC_LEVEL) && getMaxDistance(currentState(), "K", "down", CLASSIC_LEVEL) === 0) {
      escapeTarget();
      return;
    }
    const maximum = getMaxDistance(currentState(), selectedId, direction, CLASSIC_LEVEL);
    movePiece(selectedId, direction, elements.farthest.checked ? maximum : 1);
  });
}

elements.undo.addEventListener("click", undo);
elements.redo.addEventListener("click", redo);
elements.restart.addEventListener("click", () => elements.restartDialog.showModal());
elements.confirmRestart.addEventListener("click", (event) => { event.preventDefault(); resetGame(); });
elements.hint.addEventListener("click", requestSolution);
elements.solutionStep.addEventListener("click", stepSolution);
elements.autoplay.addEventListener("click", toggleAutoplay);
elements.cancelSolution.addEventListener("click", () => {
  clearSolution({ status: "解答ナビを中止しました。" });
  announce("解答ナビを中止しました。");
  render();
});
elements.helpButton.addEventListener("click", () => elements.helpDialog.showModal());
elements.playAgain.addEventListener("click", (event) => { event.preventDefault(); resetGame(); });

document.addEventListener("keydown", (event) => {
  if ([...document.querySelectorAll("dialog")].some((dialog) => dialog.open)) return;
  const target = event.target;
  const isFormControl = target.matches("input, select, textarea, button:not(.piece)");
  if (isFormControl) return;
  const modifier = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (modifier && key === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  } else if (modifier && key === "y") {
    event.preventDefault();
    redo();
  } else if (!modifier && key === "r") {
    event.preventDefault();
    elements.restartDialog.showModal();
  } else if (!modifier && key === "h") {
    event.preventDefault();
    requestSolution();
  } else if (event.key === "Escape" && selectedId) {
    selectedId = null;
    announce("選択を解除しました。");
    render();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    timer.pause();
    persist();
  } else if (history.past.length > 0 && !currentState().escaped) {
    timer.start();
  }
});

window.addEventListener("beforeunload", () => persist());
window.addEventListener("pagehide", () => persist());

window.setInterval(() => {
  elements.elapsedTime.textContent = formatTime(timer.elapsed());
  tickCount += 1;
  if (timer.running && tickCount % 20 === 0) persist();
}, 250);

if (history.past.length > 0 && !currentState().escaped && !document.hidden) timer.start();
if (currentState().escaped) {
  escaping = false;
  elements.solverStatus.textContent = "保存されたクリア済みの局面です。";
}
render();
if (restored) announce("保存した続きから再開しました。");
