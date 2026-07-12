import { CLASSIC_LEVEL } from "./levels.js";
import { solveState } from "./solver-core.js";

self.addEventListener("message", (event) => {
  const { requestId, state } = event.data;
  try {
    const result = solveState(state, CLASSIC_LEVEL);
    self.postMessage({ requestId, ok: true, result });
  } catch (error) {
    self.postMessage({ requestId, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
