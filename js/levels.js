export const CLASSIC_LEVEL = Object.freeze({
  id: "classic-escape",
  name: "クラシック",
  mode: "escape",
  board: Object.freeze({
    cols: 4,
    rows: 5,
    exit: Object.freeze({ edge: "bottom", x: 1, width: 2 })
  }),
  pieces: Object.freeze([
    { id: "K", kind: "target", x: 1, y: 0, w: 2, h: 2 },
    { id: "V1", kind: "domino-v", x: 0, y: 0, w: 1, h: 2 },
    { id: "V2", kind: "domino-v", x: 3, y: 0, w: 1, h: 2 },
    { id: "H1", kind: "domino-h", x: 1, y: 2, w: 2, h: 1 },
    { id: "V3", kind: "domino-v", x: 0, y: 3, w: 1, h: 2 },
    { id: "V4", kind: "domino-v", x: 3, y: 3, w: 1, h: 2 },
    { id: "S1", kind: "single", x: 1, y: 3, w: 1, h: 1 },
    { id: "S2", kind: "single", x: 2, y: 3, w: 1, h: 1 },
    { id: "S3", kind: "single", x: 1, y: 4, w: 1, h: 1 },
    { id: "S4", kind: "single", x: 2, y: 4, w: 1, h: 1 }
  ].map(Object.freeze))
});

export function createInitialState(level = CLASSIC_LEVEL) {
  return {
    levelId: level.id,
    escaped: false,
    pieces: level.pieces.map((piece) => ({ ...piece }))
  };
}
