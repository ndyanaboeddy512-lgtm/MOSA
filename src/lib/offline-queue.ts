export interface QueuedAction {
  id: string;
  actionType: "CAPTURE_DOCUMENT" | "VERIFY_BUSINESS" | "ADD_PRODUCT" | "CLAIM_BUSINESS";
  payload: any;
  timestamp: number;
  retryCount: number;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
}

class OfflineQueueManager {
  private queue: QueuedAction[] = [];
  private isOnline: boolean = true;
  private isBrowser: boolean = typeof window !== "undefined";

  constructor() {
    if (this.isBrowser) {
      this.isOnline = navigator.onLine;
      window.addEventListener("online", () => this.handleOnline());
      window.addEventListener("offline", () => this.handleOffline());
      this.loadQueue();
    }
  }

  private loadQueue() {
    if (!this.isBrowser) return;
    try {
      const saved = localStorage.getItem("mosa_offline_queue");
      if (saved) {
        this.queue = JSON.parse(saved);
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem("mosa_offline_queue", JSON.stringify(this.queue));
    } catch {
      // ignore
    }
  }

  public enqueue(actionType: QueuedAction["actionType"], payload: any): QueuedAction {
    const action: QueuedAction = {
      id: `queue-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionType,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: "PENDING",
    };
    this.queue.push(action);
    this.saveQueue();

    if (this.isOnline) {
      this.processQueue();
    }
    return action;
  }

  public getPendingCount(): number {
    return this.queue.filter((a) => a.status === "PENDING" || a.status === "SYNCING").length;
  }

  public getQueue(): QueuedAction[] {
    return this.queue;
  }

  private handleOnline() {
    this.isOnline = true;
    this.processQueue();
  }

  private handleOffline() {
    this.isOnline = false;
  }

  public async processQueue() {
    if (!this.isOnline || this.queue.length === 0) return;

    for (const item of this.queue) {
      if (item.status === "PENDING" || item.status === "FAILED") {
        item.status = "SYNCING";
        try {
          // Simulate server synchronization with idempotent retry
          await new Promise((resolve) => setTimeout(resolve, 600));
          item.status = "SYNCED";
        } catch {
          item.retryCount += 1;
          item.status = item.retryCount > 3 ? "FAILED" : "PENDING";
        }
      }
    }

    // Keep only non-synced items or recent synced items
    this.queue = this.queue.filter((a) => a.status !== "SYNCED");
    this.saveQueue();
  }
}

export const offlineQueue = new OfflineQueueManager();
