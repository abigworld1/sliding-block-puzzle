import { DIRECTION_ORDER, DIRECTIONS } from "./constants.js";
import { CLASSIC_LEVEL, createInitialState } from "./levels.js";

export function cloneState(state) {
  return {
    levelId: state.levelId,
    escaped: Boolean(state.escaped),
    pieces: state.pieces.map((piece) => ({ ...piece }))
  };
}

export function getPiece(state, pieceId) {
  return state.pieces.find((piece) => piece.id === pieceId) ?? null;
}

export function buildOccupancy(state, excludedPieceId = null, level = CLASSIC_LEVEL) {
  const grid = Array.from({ length: level.board.rows }, () => Array(level.board.cols).fill(null));
  for (const piece of state.pieces) {
    if (piece.id === excludedPieceId) continue;
    for (let y = piece.y; y < piece.y + piece.h; y += 1) {
      for (let x = piece.x; x < piece.x + piece.w; x += 1) {
        if (grid[y]?.[x] !== undefined) grid[y][x] = piece.id;
      }
    }
  }
  return grid;
}

export function emptyCells(state, level = CLASSIC_LEVEL) {
  const grid = buildOccupancy(state, null, level);
  const cells = [];
  for (let y = 0; y < level.board.rows; y += 1) {
    for (let x = 0; x < level.board.cols; x += 1) {
      if (grid[y][x] === null) cells.push({ x, y });
    }
  }
  return cells;
}

function isIntegerPiece(piece) {
  return [piece.x, piece.y, piece.w, piece.h].every(Number.isInteger);
}

export function validateState(state, level = CLASSIC_LEVEL) {
  const errors = [];
  if (!state || typeof state !== "object" || !Array.isArray(state.pieces)) {
    return { valid: false, errors: ["状態の形式が不正です"] };
  }
  if (state.levelId !== level.id) errors.push("レベルIDが一致しません");
  if (level.board.cols !== 4 || level.board.rows !== 5 || level.board.exit.edge !== "bottom" || level.board.exit.x !== 1 || level.board.exit.width !== 2) {
    errors.push("盤面または出口の定義が不正です");
  }
  const definitions = new Map(level.pieces.map((piece) => [piece.id, piece]));
  const ids = new Set();
  let occupied = 0;
  const grid = Array.from({ length: level.board.rows }, () => Array(level.board.cols).fill(null));

  if (state.pieces.length !== level.pieces.length) errors.push("駒の個数が不正です");
  for (const piece of state.pieces) {
    const definition = definitions.get(piece.id);
    if (ids.has(piece.id)) errors.push(`駒ID ${piece.id} が重複しています`);
    ids.add(piece.id);
    if (!definition) {
      errors.push(`不明な駒 ${piece.id} があります`);
      continue;
    }
    if (!isIntegerPiece(piece)) errors.push(`${piece.id} の座標またはサイズが整数ではありません`);
    if (piece.kind !== definition.kind || piece.w !== definition.w || piece.h !== definition.h) {
      errors.push(`${piece.id} の種類またはサイズが不正です`);
    }
    if (piece.x < 0 || piece.y < 0 || piece.x + piece.w > level.board.cols || piece.y + piece.h > level.board.rows) {
      errors.push(`${piece.id} が盤面外にあります`);
      continue;
    }
    occupied += piece.w * piece.h;
    for (let y = piece.y; y < piece.y + piece.h; y += 1) {
      for (let x = piece.x; x < piece.x + piece.w; x += 1) {
        if (grid[y][x] !== null) errors.push(`${piece.id} が ${grid[y][x]} と重なっています`);
        grid[y][x] = piece.id;
      }
    }
  }
  for (const id of definitions.keys()) {
    if (!ids.has(id)) errors.push(`必須駒 ${id} がありません`);
  }
  if (occupied !== 18) errors.push("占有セル数が18ではありません");
  if (typeof state.escaped !== "boolean") errors.push("脱出状態が不正です");
  if (state.escaped) {
    const target = state.pieces.find((piece) => piece.id === "K");
    if (!target || target.x !== 1 || target.y !== 3) errors.push("脱出済み状態の目標駒位置が不正です");
  }
  return { valid: errors.length === 0, errors };
}

function canOccupy(piece, x, y, occupancy, level = CLASSIC_LEVEL) {
  if (x < 0 || y < 0 || x + piece.w > level.board.cols || y + piece.h > level.board.rows) return false;
  for (let row = y; row < y + piece.h; row += 1) {
    for (let col = x; col < x + piece.w; col += 1) {
      if (occupancy[row][col] !== null) return false;
    }
  }
  return true;
}

export function getMaxDistance(state, pieceId, direction, level = CLASSIC_LEVEL) {
  if (state.escaped) return 0;
  const piece = getPiece(state, pieceId);
  const vector = DIRECTIONS[direction];
  if (!piece || !vector) return 0;
  const occupancy = buildOccupancy(state, pieceId, level);
  let distance = 0;
  while (canOccupy(piece, piece.x + vector.dx * (distance + 1), piece.y + vector.dy * (distance + 1), occupancy, level)) {
    distance += 1;
  }
  return distance;
}

export function isEscapeAvailable(state, level = CLASSIC_LEVEL) {
  if (state.escaped) return false;
  const target = getPiece(state, "K");
  return Boolean(target && target.x === level.board.exit.x && target.y + target.h === level.board.rows);
}

export function createMove(state, pieceId, direction, distance = 1) {
  const piece = getPiece(state, pieceId);
  const vector = DIRECTIONS[direction];
  if (!piece || !vector || !Number.isInteger(distance) || distance < 1) return null;
  return {
    type: "move",
    pieceId,
    fromX: piece.x,
    fromY: piece.y,
    toX: piece.x + vector.dx * distance,
    toY: piece.y + vector.dy * distance
  };
}

export function createEscapeMove(state) {
  const target = getPiece(state, "K");
  if (!target) return null;
  return { type: "escape", pieceId: "K", fromX: target.x, fromY: target.y, toX: target.x, toY: target.y };
}

export function validateMove(state, move, level = CLASSIC_LEVEL) {
  if (!move || state.escaped) return { valid: false, reason: "移動できない状態です" };
  const piece = getPiece(state, move.pieceId);
  if (!piece) return { valid: false, reason: "対象の駒がありません" };
  if (move.fromX !== piece.x || move.fromY !== piece.y) return { valid: false, reason: "移動元が現在位置と異なります" };
  if (move.type === "escape") {
    return isEscapeAvailable(state, level)
      ? { valid: true }
      : { valid: false, reason: "出口直前ではありません" };
  }
  if (move.type !== "move" || ![move.toX, move.toY].every(Number.isInteger)) {
    return { valid: false, reason: "移動形式が不正です" };
  }
  const dx = move.toX - piece.x;
  const dy = move.toY - piece.y;
  if ((dx === 0) === (dy === 0)) return { valid: false, reason: "斜め移動または0セル移動です" };
  const direction = dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up";
  const distance = Math.abs(dx || dy);
  if (distance > getMaxDistance(state, piece.id, direction, level)) {
    return { valid: false, reason: "盤外または他の駒に衝突します" };
  }
  return { valid: true };
}

export function applyMove(state, move, level = CLASSIC_LEVEL) {
  const result = validateMove(state, move, level);
  if (!result.valid) throw new Error(result.reason);
  const next = cloneState(state);
  if (move.type === "escape") {
    next.escaped = true;
    return next;
  }
  const piece = getPiece(next, move.pieceId);
  piece.x = move.toX;
  piece.y = move.toY;
  return next;
}

export function inverseMove(move) {
  if (!move || move.type !== "move") return null;
  return { ...move, fromX: move.toX, fromY: move.toY, toX: move.fromX, toY: move.fromY };
}

export function enumerateMoves(state, level = CLASSIC_LEVEL) {
  if (state.escaped) return [];
  const moves = [];
  for (const piece of state.pieces) {
    for (const direction of DIRECTION_ORDER) {
      const maximum = getMaxDistance(state, piece.id, direction, level);
      for (let distance = 1; distance <= maximum; distance += 1) {
        moves.push(createMove(state, piece.id, direction, distance));
      }
    }
  }
  if (isEscapeAvailable(state, level)) moves.push(createEscapeMove(state));
  return moves;
}

export function isSolved(state) {
  return state.escaped === true;
}

export function serializeState(state) {
  return JSON.stringify({
    levelId: state.levelId,
    escaped: state.escaped,
    pieces: [...state.pieces].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, kind, x, y, w, h }) => ({ id, kind, x, y, w, h }))
  });
}

export function deserializeState(serialized, level = CLASSIC_LEVEL) {
  const parsed = JSON.parse(serialized);
  const result = validateState(parsed, level);
  if (!result.valid) throw new Error(result.errors.join("; "));
  return cloneState(parsed);
}

export function canonicalStateKey(state) {
  if (state.escaped) return "escaped";
  const groups = new Map();
  for (const piece of state.pieces) {
    if (!groups.has(piece.kind)) groups.set(piece.kind, []);
    groups.get(piece.kind).push(`${piece.x}${piece.y}`);
  }
  return ["target", "domino-h", "domino-v", "single"]
    .map((kind) => `${kind}:${(groups.get(kind) ?? []).sort().join(",")}`)
    .join("|");
}

export function resetState(level = CLASSIC_LEVEL) {
  return createInitialState(level);
}
