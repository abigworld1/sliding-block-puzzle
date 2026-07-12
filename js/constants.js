export const STORAGE_KEY = "abigworld.escape.v1";
export const SCHEMA_VERSION = 1;

export const DIRECTIONS = Object.freeze({
  up: Object.freeze({ dx: 0, dy: -1, label: "上" }),
  right: Object.freeze({ dx: 1, dy: 0, label: "右" }),
  down: Object.freeze({ dx: 0, dy: 1, label: "下" }),
  left: Object.freeze({ dx: -1, dy: 0, label: "左" })
});

export const DIRECTION_ORDER = Object.freeze(["up", "right", "down", "left"]);

export const KIND_LABELS = Object.freeze({
  target: "目標駒",
  "domino-v": "縦長駒",
  "domino-h": "横長駒",
  single: "小駒"
});
