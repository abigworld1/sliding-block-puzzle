import { SCHEMA_VERSION, STORAGE_KEY } from "./constants.js";
import { cloneState, validateState } from "./model.js";

function validSnapshot(state, level) {
  return validateState(state, level).valid;
}

export function encodeSave({ history, elapsedMs, best }, level) {
  const snapshots = [...history.past, history.present, ...history.future];
  if (!snapshots.every((state) => validSnapshot(state, level))) throw new Error("保存対象の盤面が不正です");
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    levelId: level.id,
    history,
    elapsedMs: Math.max(0, Math.floor(elapsedMs)),
    best: {
      moves: Number.isInteger(best?.moves) && best.moves >= 0 ? best.moves : null,
      timeMs: Number.isFinite(best?.timeMs) && best.timeMs >= 0 ? Math.floor(best.timeMs) : null
    }
  });
}

export function decodeSave(serialized, level) {
  try {
    const data = JSON.parse(serialized);
    if (data?.schemaVersion !== SCHEMA_VERSION || data.levelId !== level.id) return null;
    const { history } = data;
    if (!history || !Array.isArray(history.past) || !Array.isArray(history.future) || !history.present) return null;
    if (![...history.past, history.present, ...history.future].every((state) => validSnapshot(state, level))) return null;
    if (!Number.isFinite(data.elapsedMs) || data.elapsedMs < 0) return null;
    return {
      history: {
        past: history.past.map(cloneState),
        present: cloneState(history.present),
        future: history.future.map(cloneState)
      },
      elapsedMs: Math.floor(data.elapsedMs),
      best: {
        moves: Number.isInteger(data.best?.moves) && data.best.moves >= 0 ? data.best.moves : null,
        timeMs: Number.isFinite(data.best?.timeMs) && data.best.timeMs >= 0 ? Math.floor(data.best.timeMs) : null
      }
    };
  } catch {
    return null;
  }
}

export function loadGame(level, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? decodeSave(raw, level) : null;
  } catch {
    return null;
  }
}

export function saveGame(data, level, storage = globalThis.localStorage) {
  try {
    storage?.setItem(STORAGE_KEY, encodeSave(data, level));
    return true;
  } catch {
    return false;
  }
}
