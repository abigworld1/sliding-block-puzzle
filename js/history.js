import { cloneState } from "./model.js";

export function createHistory(initialState) {
  return { past: [], present: cloneState(initialState), future: [] };
}

export function commitHistory(history, nextState) {
  return {
    past: [...history.past, cloneState(history.present)],
    present: cloneState(nextState),
    future: []
  };
}

export function undoHistory(history) {
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: cloneState(history.past.at(-1)),
    future: [cloneState(history.present), ...history.future.map(cloneState)]
  };
}

export function redoHistory(history) {
  if (history.future.length === 0) return history;
  return {
    past: [...history.past.map(cloneState), cloneState(history.present)],
    present: cloneState(history.future[0]),
    future: history.future.slice(1).map(cloneState)
  };
}
