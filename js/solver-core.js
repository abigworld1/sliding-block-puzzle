import { applyMove, canonicalStateKey, enumerateMoves, getPiece, isSolved } from "./model.js";

function describeMove(state, move) {
  const piece = getPiece(state, move.pieceId);
  return {
    type: move.type,
    kind: piece.kind,
    fromX: move.fromX,
    fromY: move.fromY,
    toX: move.toX,
    toY: move.toY
  };
}

export function resolveMoveDescriptor(state, descriptor) {
  const piece = state.pieces.find((candidate) =>
    candidate.kind === descriptor.kind && candidate.x === descriptor.fromX && candidate.y === descriptor.fromY
  );
  if (!piece) return null;
  return {
    type: descriptor.type,
    pieceId: piece.id,
    fromX: descriptor.fromX,
    fromY: descriptor.fromY,
    toX: descriptor.toX,
    toY: descriptor.toY
  };
}

export function solveState(initialState, level, options = {}) {
  if (isSolved(initialState)) return { moves: [], visited: 1 };
  const maxVisited = options.maxVisited ?? 250000;
  const initialKey = canonicalStateKey(initialState);
  const queue = [{ state: initialState, key: initialKey }];
  const parents = new Map([[initialKey, null]]);
  let head = 0;
  let solvedKey = null;

  while (head < queue.length) {
    const current = queue[head++];
    for (const move of enumerateMoves(current.state, level)) {
      const next = applyMove(current.state, move, level);
      const key = canonicalStateKey(next);
      if (parents.has(key)) continue;
      parents.set(key, { previous: current.key, move: describeMove(current.state, move) });
      if (isSolved(next)) {
        solvedKey = key;
        break;
      }
      queue.push({ state: next, key });
      if (parents.size > maxVisited) throw new Error("探索上限を超えました");
    }
    if (solvedKey) break;
  }

  if (!solvedKey) return { moves: null, visited: parents.size };
  const moves = [];
  for (let key = solvedKey; key !== initialKey;) {
    const entry = parents.get(key);
    moves.push(entry.move);
    key = entry.previous;
  }
  moves.reverse();
  return { moves, visited: parents.size };
}
