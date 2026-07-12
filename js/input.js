import { getMaxDistance, isEscapeAvailable } from "./model.js";

const DEAD_ZONE = 6;
const KEY_DIRECTIONS = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left" };

export class InputController {
  constructor({ board, renderer, level, getState, onSelect, onMove, onEscape }) {
    this.board = board;
    this.renderer = renderer;
    this.level = level;
    this.getState = getState;
    this.onSelect = onSelect;
    this.onMove = onMove;
    this.onEscape = onEscape;
    this.drag = null;
    board.addEventListener("pointerdown", (event) => this.pointerDown(event));
    board.addEventListener("pointermove", (event) => this.pointerMove(event));
    board.addEventListener("pointerup", (event) => this.pointerUp(event));
    board.addEventListener("pointercancel", (event) => this.pointerCancel(event));
    board.addEventListener("keydown", (event) => this.keyDown(event));
  }

  pointerDown(event) {
    if (event.button !== 0) return;
    const element = event.target.closest(".piece");
    if (!element || element.disabled) return;
    const pieceId = element.dataset.pieceId;
    this.onSelect(pieceId);
    element.setPointerCapture(event.pointerId);
    this.drag = {
      pointerId: event.pointerId,
      pieceId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      preview: 0
    };
  }

  pointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const rawX = event.clientX - this.drag.startX;
    const rawY = event.clientY - this.drag.startY;
    if (!this.drag.axis) {
      if (Math.hypot(rawX, rawY) < DEAD_ZONE) return;
      this.drag.axis = Math.abs(rawX) >= Math.abs(rawY) ? "x" : "y";
    }
    event.preventDefault();
    const state = this.getState();
    const cell = this.board.clientWidth / this.level.board.cols;
    const negativeDirection = this.drag.axis === "x" ? "left" : "up";
    const positiveDirection = this.drag.axis === "x" ? "right" : "down";
    const negative = getMaxDistance(state, this.drag.pieceId, negativeDirection, this.level);
    let positive = getMaxDistance(state, this.drag.pieceId, positiveDirection, this.level);
    if (positiveDirection === "down" && this.drag.pieceId === "K" && isEscapeAvailable(state, this.level)) positive = Math.max(1, positive);
    const raw = this.drag.axis === "x" ? rawX : rawY;
    this.drag.preview = Math.max(-negative * cell, Math.min(positive * cell, raw));
    this.renderer.setPreview(this.drag.pieceId, this.drag.axis === "x" ? this.drag.preview : 0, this.drag.axis === "y" ? this.drag.preview : 0);
  }

  pointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const { pieceId, axis, preview } = this.drag;
    this.renderer.clearPreview(pieceId);
    this.drag = null;
    if (!axis) {
      this.onSelect(pieceId);
      return;
    }
    const cell = this.board.clientWidth / this.level.board.cols;
    const cells = Math.round(preview / cell);
    if (cells === 0) return;
    const direction = axis === "x" ? (cells > 0 ? "right" : "left") : (cells > 0 ? "down" : "up");
    const state = this.getState();
    if (pieceId === "K" && direction === "down" && isEscapeAvailable(state, this.level) && getMaxDistance(state, pieceId, "down", this.level) === 0) {
      this.onEscape();
      return;
    }
    this.onMove(pieceId, direction, Math.abs(cells));
  }

  pointerCancel(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    this.renderer.clearPreview(this.drag.pieceId);
    this.drag = null;
  }

  keyDown(event) {
    const element = event.target.closest(".piece");
    if (!element) return;
    const pieceId = element.dataset.pieceId;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.onSelect(pieceId);
      return;
    }
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    this.onSelect(pieceId);
    const state = this.getState();
    if (pieceId === "K" && direction === "down" && isEscapeAvailable(state, this.level) && getMaxDistance(state, pieceId, direction, this.level) === 0) {
      this.onEscape();
      return;
    }
    const maximum = getMaxDistance(state, pieceId, direction, this.level);
    if (maximum > 0) this.onMove(pieceId, direction, event.shiftKey ? maximum : 1);
  }
}
