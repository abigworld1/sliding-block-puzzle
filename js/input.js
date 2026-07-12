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
    board.addEventListener("pointermove", (event) => this.pointerMove(event), { passive: false });
    board.addEventListener("pointerup", (event) => this.pointerUp(event));
    board.addEventListener("pointercancel", (event) => this.pointerCancel(event));
    board.addEventListener("lostpointercapture", (event) => this.pointerCancel(event));
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
      cellSize: this.board.getBoundingClientRect().width / this.level.board.cols,
      axis: null,
      negative: 0,
      positive: 0,
      preview: 0,
      animationFrame: null
    };
  }

  pointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const coalesced = event.getCoalescedEvents?.();
    const sample = coalesced?.length ? coalesced.at(-1) : event;
    const rawX = sample.clientX - this.drag.startX;
    const rawY = sample.clientY - this.drag.startY;
    if (!this.drag.axis) {
      if (Math.hypot(rawX, rawY) < DEAD_ZONE) return;
      this.drag.axis = Math.abs(rawX) >= Math.abs(rawY) ? "x" : "y";
      const state = this.getState();
      const negativeDirection = this.drag.axis === "x" ? "left" : "up";
      const positiveDirection = this.drag.axis === "x" ? "right" : "down";
      this.drag.negative = getMaxDistance(state, this.drag.pieceId, negativeDirection, this.level);
      this.drag.positive = getMaxDistance(state, this.drag.pieceId, positiveDirection, this.level);
      if (positiveDirection === "down" && this.drag.pieceId === "K" && isEscapeAvailable(state, this.level)) {
        this.drag.positive = Math.max(1, this.drag.positive);
      }
    }
    event.preventDefault();
    const raw = this.drag.axis === "x" ? rawX : rawY;
    const clamped = Math.max(-this.drag.negative * this.drag.cellSize, Math.min(this.drag.positive * this.drag.cellSize, raw));
    const pixelRatio = window.devicePixelRatio || 1;
    this.drag.preview = Math.round(clamped * pixelRatio) / pixelRatio;
    if (this.drag.animationFrame === null) {
      const activeDrag = this.drag;
      this.drag.animationFrame = requestAnimationFrame(() => {
        if (this.drag !== activeDrag) return;
        activeDrag.animationFrame = null;
        this.renderer.setPreview(
          activeDrag.pieceId,
          activeDrag.axis === "x" ? activeDrag.preview : 0,
          activeDrag.axis === "y" ? activeDrag.preview : 0
        );
      });
    }
  }

  pointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    const { pieceId, axis, preview, cellSize, animationFrame } = this.drag;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    this.drag = null;
    if (!axis) {
      this.renderer.clearPreview(pieceId);
      this.onSelect(pieceId);
      return;
    }
    const cells = Math.round(preview / cellSize);
    if (cells === 0) {
      this.renderer.clearPreview(pieceId);
      return;
    }
    const direction = axis === "x" ? (cells > 0 ? "right" : "left") : (cells > 0 ? "down" : "up");
    const state = this.getState();
    let moved;
    if (pieceId === "K" && direction === "down" && isEscapeAvailable(state, this.level) && getMaxDistance(state, pieceId, "down", this.level) === 0) {
      moved = this.onEscape();
    } else {
      moved = this.onMove(pieceId, direction, Math.abs(cells));
    }
    if (moved === false) this.renderer.clearPreview(pieceId);
    else this.renderer.finishPreview(pieceId);
  }

  pointerCancel(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    if (this.drag.animationFrame !== null) cancelAnimationFrame(this.drag.animationFrame);
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
