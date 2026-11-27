import type { Logger } from '@nestjs/common';

/**
 * Background jobs with bounded concurrency and a bounded backlog (outgoing deliveries): a slow or broken
 * endpoint can neither pile up unlimited work nor hold the request that caused it.
 */
export class JobQueue {
  private active = 0;
  private readonly queue: Array<() => Promise<void>> = [];

  constructor(
    private readonly logger: Logger,
    private readonly name: string,
    private readonly concurrency = 5,
    private readonly maxQueued = 500,
  ) {}

  /** Queue a job; false when the backlog is full and it was dropped. */
  push(job: () => Promise<void>): boolean {
    if (this.queue.length >= this.maxQueued) {
      this.logger.warn(`${this.name} queue is full: dropping a job`);
      return false;
    }
    this.queue.push(job);
    this.pump();
    return true;
  }

  /** Jobs waiting or running (for tests). */
  get size(): number {
    return this.queue.length + this.active;
  }

  private pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const job = this.queue.shift() as () => Promise<void>;
      this.active++;
      job()
        .catch((err: unknown) => this.logger.warn(`${this.name} job failed: ${(err as Error).message}`))
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }
}
