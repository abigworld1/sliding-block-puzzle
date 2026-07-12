export class SolverClient {
  constructor() {
    this.sequence = 0;
    this.pending = null;
    this.createWorker();
  }

  createWorker() {
    this.worker = new Worker(new URL("./solver-worker.js", import.meta.url), { type: "module" });
    this.worker.addEventListener("message", (event) => this.handleMessage(event));
    this.worker.addEventListener("error", () => this.failPending(new Error("ソルバーを起動できませんでした")));
  }

  solve(state) {
    this.cancel();
    const requestId = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending = { requestId, resolve, reject };
      this.worker.postMessage({ requestId, state });
    });
  }

  handleMessage(event) {
    if (!this.pending || event.data.requestId !== this.pending.requestId) return;
    const { resolve, reject } = this.pending;
    this.pending = null;
    if (event.data.ok) resolve(event.data.result);
    else reject(new Error(event.data.error));
  }

  failPending(error) {
    if (!this.pending) return;
    const { reject } = this.pending;
    this.pending = null;
    reject(error);
  }

  cancel() {
    if (!this.worker) return;
    if (this.pending) {
      const { reject } = this.pending;
      this.pending = null;
      reject(new DOMException("探索を中止しました", "AbortError"));
    }
    this.worker.terminate();
    this.createWorker();
  }

  destroy() {
    if (this.pending) this.pending.reject(new DOMException("探索を終了しました", "AbortError"));
    this.pending = null;
    this.worker?.terminate();
    this.worker = null;
  }
}
