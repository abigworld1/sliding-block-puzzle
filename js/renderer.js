import { DIRECTION_ORDER, DIRECTIONS, KIND_LABELS } from "./constants.js";
import { getMaxDistance, getPiece, isEscapeAvailable } from "./model.js";

export class BoardRenderer {
  constructor(board, piecesLayer, level) {
    this.board = board;
    this.layer = piecesLayer;
    this.level = level;
    this.elements = new Map();
  }

  ensurePieces(state) {
    for (const piece of state.pieces) {
      if (this.elements.has(piece.id)) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `piece piece--${piece.kind}`;
      button.dataset.pieceId = piece.id;
      button.innerHTML = `<span class="piece-pattern" aria-hidden="true"></span><span class="piece-name">${piece.id === "K" ? "GOAL" : piece.id}</span>`;
      this.layer.append(button);
      this.elements.set(piece.id, button);
    }
  }

  render(state, { selectedId = null, hintPieceId = null, escaping = false } = {}) {
    this.ensurePieces(state);
    this.board.classList.toggle("is-solved", state.escaped);
    for (const piece of state.pieces) {
      const element = this.elements.get(piece.id);
      element.style.setProperty("--piece-x", piece.x);
      element.style.setProperty("--piece-y", piece.y);
      element.style.setProperty("--piece-w", piece.w);
      element.style.setProperty("--piece-h", piece.h);
      element.style.removeProperty("transform");
      element.classList.toggle("is-selected", piece.id === selectedId);
      element.classList.toggle("is-hint", piece.id === hintPieceId);
      element.classList.toggle("is-escaping", escaping && piece.id === "K");
      element.setAttribute("aria-pressed", String(piece.id === selectedId));
      element.disabled = state.escaped;
      const legal = DIRECTION_ORDER.filter((direction) => getMaxDistance(state, piece.id, direction, this.level) > 0);
      if (piece.id === "K" && isEscapeAvailable(state, this.level)) legal.push("down");
      const legalText = [...new Set(legal)].map((direction) => DIRECTIONS[direction].label).join("、") || "なし";
      element.setAttribute("aria-label", `${KIND_LABELS[piece.kind]} ${piece.id}、列${piece.x + 1} 行${piece.y + 1}、移動可能: ${legalText}`);
    }
  }

  setPreview(pieceId, dx, dy) {
    const element = this.elements.get(pieceId);
    if (!element) return;
    element.classList.add("is-dragging");
    element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  }

  clearPreview(pieceId) {
    const element = this.elements.get(pieceId);
    if (!element) return;
    element.style.removeProperty("transform");
    element.classList.remove("is-dragging");
  }

  finishPreview(pieceId) {
    const element = this.elements.get(pieceId);
    if (!element) return;
    element.style.removeProperty("transform");
    // 新しいセル位置を transition:none の状態で確定してからドラッグ状態を外す。
    // ここで一度だけレイアウトを確定し、旧位置へ戻る補間が混ざるのを防ぐ。
    void element.offsetWidth;
    element.classList.remove("is-dragging");
  }

  focusPiece(pieceId) {
    this.elements.get(pieceId)?.focus();
  }

  pieceAt(state, id) {
    return getPiece(state, id);
  }
}
