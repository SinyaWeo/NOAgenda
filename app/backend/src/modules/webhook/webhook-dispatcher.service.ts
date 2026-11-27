import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Webhook } from './webhook.entity';
import { Node } from '../node/node.entity';
import { Access, NodeAccessService } from '../node/node-access.service';
import { DomainEvent, DomainEvents } from '../../common/domain-events';
import { assertPublicHttpUrl, BLOCKED_ADDRESS } from '../../common/url-guard';
import { safePost } from '../../common/safe-post';

/** Waits before the 2nd and 3rd attempt. A webhook is tried three times at most. */
const RETRY_DELAYS_MS = [2000, 10000];
const MAX_CONCURRENT = 10;
const MAX_QUEUED = 500;
/** After this many failed deliveries in a row the webhook is switched off (re-enable it to try again). */
export const MAX_CONSECUTIVE_FAILURES = 20;

export interface DeliveryResult {
  ok: boolean;
  status: number | null;
  error: string | null;
}

/**
 * Sends domain events to the webhooks that asked for them.
 *
 * - A project webhook gets events of that project; a user webhook gets events of everything the user can read.
 * - Each delivery is `POST` JSON with `X-NOAgenda-Event`, `X-NOAgenda-Delivery` and, when the webhook has a
 *   secret, `X-NOAgenda-Signature: sha256=<HMAC-SHA256 of the body>`.
 * - 5 s timeout, up to 3 attempts for network errors / 5xx / 429, no redirects followed, and the address is
 *   re-checked against internal networks right before connecting.
 * - Deliveries run in the background with bounded concurrency and never affect the action that caused them.
 */
@Injectable()
export class WebhookDispatcher implements OnModuleInit {
  private readonly logger = new Logger(WebhookDispatcher.name);
  private active = 0;
  private readonly queue: Array<() => Promise<void>> = [];

  constructor(
    @InjectRepository(Webhook) private readonly hooks: Repository<Webhook>,
    @InjectRepository(Node) private readonly nodes: Repository<Node>,
    private readonly access: NodeAccessService,
    private readonly events: DomainEvents,
  ) {}

  onModuleInit() {
    this.events.on((e) =>
      this.dispatch(e).catch((err) => this.logger.warn(`Webhook dispatch failed: ${(err as Error).message}`)),
    );
  }

  /** The project a node belongs to, for events that did not say. */
  private async projectOf(nodeId: number): Promise<number | null> {
    // withDeleted: the node (or an ancestor) may already be in the trash, e.g. for a delete event.
    const select = { id: true, type: true, parentId: true } as const;
    let cur = await this.nodes.findOne({ where: { id: nodeId }, select, withDeleted: true });
    for (let depth = 0; cur && depth < 64; depth++) {
      if (cur.type === 'project') return cur.id;
      if (cur.parentId == null) return null;
      cur = await this.nodes.findOne({ where: { id: cur.parentId }, select, withDeleted: true });
    }
    return null;
  }

  /** Webhooks that should receive this event. */
  async recipientsOf(e: DomainEvent): Promise<Webhook[]> {
    const candidates = await this.hooks.find({
      where: [
        { active: true, event: e.name },
        { active: true, event: '*' },
      ],
    });
    if (!candidates.length) return [];
    const projectId = e.projectId !== undefined ? e.projectId : await this.projectOf(e.nodeId);
    const levels = new Map<number, boolean>();
    const mayRead = async (userId: number): Promise<boolean> => {
      if (e.owner != null && userId === e.owner && (projectId == null || projectId === e.nodeId)) return true;
      if (projectId == null) return false;
      if (!levels.has(userId)) levels.set(userId, (await this.access.level(userId, projectId)) >= Access.READ);
      return levels.get(userId)!;
    };
    const out: Webhook[] = [];
    for (const hook of candidates) {
      if (hook.projectId != null) {
        if (hook.projectId === projectId) out.push(hook);
      } else if (hook.userId != null && (await mayRead(hook.userId))) {
        out.push(hook);
      }
    }
    return out;
  }

  async dispatch(e: DomainEvent): Promise<void> {
    if (e.auditOnly) return;
    for (const hook of await this.recipientsOf(e)) {
      this.enqueue(() => this.attempt(hook, e.name, e.data, 0));
    }
  }

  /** Queue a job; false when the queue is full and it was dropped. */
  private enqueue(job: () => Promise<void>): boolean {
    if (this.queue.length >= MAX_QUEUED) {
      this.logger.warn('Webhook queue is full: dropping a delivery');
      return false;
    }
    this.queue.push(job);
    this.pump();
    return true;
  }

  private pump() {
    while (this.active < MAX_CONCURRENT && this.queue.length) {
      const job = this.queue.shift()!;
      this.active++;
      job()
        .catch((err) => this.logger.warn(`Webhook delivery crashed: ${(err as Error).message}`))
        .finally(() => {
          this.active--;
          this.pump();
        });
    }
  }

  /** One attempt: POST the payload. Never throws. */
  async deliverOnce(
    hook: Pick<Webhook, 'url' | 'secret'>,
    event: string,
    data: unknown,
  ): Promise<DeliveryResult & { retry: boolean }> {
    const body = JSON.stringify({ event, deliveredAt: new Date().toISOString(), data });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NOAgenda-Webhook',
      'X-NOAgenda-Event': event,
      'X-NOAgenda-Delivery': randomUUID(),
    };
    if (hook.secret)
      headers['X-NOAgenda-Signature'] = 'sha256=' + createHmac('sha256', hook.secret).update(body).digest('hex');
    try {
      await assertPublicHttpUrl(hook.url); // DNS may have changed since it was saved
    } catch (err) {
      return { ok: false, status: null, error: this.clip((err as Error).message), retry: false };
    }
    try {
      const status = await this.send(hook.url, headers, body);
      if (status >= 200 && status < 300) return { ok: true, status, error: null, retry: false };
      return {
        ok: false,
        status,
        error: status >= 300 && status < 400 ? 'Redirects are not followed' : `HTTP ${status}`,
        retry: status >= 500 || status === 429,
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === BLOCKED_ADDRESS) {
        // The name resolved to an internal address at connect time (see publicLookup).
        return { ok: false, status: null, error: this.clip((err as Error).message), retry: false };
      }
      const timedOut = (err as Error).name === 'TimeoutError' || (err as Error).name === 'AbortError';
      return {
        ok: false,
        status: null,
        error: timedOut ? 'Timed out' : this.clip((err as Error).message),
        retry: true,
      };
    }
  }

  /**
   * POST `body` and resolve with the HTTP status. Redirects are not followed (they could lead somewhere
   * internal) and the connection goes through {@link publicLookup}, which refuses internal addresses using
   * the very DNS answer it connects to. Public so tests can replace it.
   */
  send(rawUrl: string, headers: Record<string, string>, body: string): Promise<number> {
    return safePost(rawUrl, headers, body);
  }

  private clip(s: string): string {
    return s.length > 255 ? s.slice(0, 254) + '…' : s;
  }

  /**
   * One delivery attempt from the queue. A retryable failure is put back in the queue after its delay
   * instead of waiting here, so a slow or broken endpoint does not keep a worker slot while it waits.
   */
  private async attempt(hook: Webhook, event: string, data: unknown, n: number): Promise<void> {
    const result = await this.deliverOnce(hook, event, data);
    const delay = RETRY_DELAYS_MS[n];
    if (!result.ok && result.retry && delay !== undefined) {
      setTimeout(() => {
        if (!this.enqueue(() => this.attempt(hook, event, data, n + 1))) void this.record(hook.id, result);
      }, delay).unref();
      return;
    }
    await this.record(hook.id, result);
  }

  /** Remember the outcome; too many failures in a row switch the webhook off. */
  async record(id: number, r: DeliveryResult): Promise<void> {
    try {
      if (r.ok) {
        await this.hooks.update(id, {
          lastStatus: r.status,
          lastError: null,
          lastDeliveryAt: new Date(),
          failureCount: 0,
        });
        return;
      }
      await this.hooks.update(id, { lastStatus: r.status, lastError: r.error, lastDeliveryAt: new Date() });
      await this.hooks.increment({ id }, 'failureCount', 1);
      const hook = await this.hooks.findOne({ where: { id }, select: { id: true, failureCount: true, active: true } });
      if (hook && hook.active && hook.failureCount >= MAX_CONSECUTIVE_FAILURES) {
        await this.hooks.update(id, { active: false });
        this.logger.warn(`Webhook ${id} switched off after ${hook.failureCount} failed deliveries in a row`);
      }
    } catch (err) {
      this.logger.warn(`Could not record webhook result: ${(err as Error).message}`);
    }
  }

  /** "Send test": one synchronous `ping`, recorded like a real delivery. */
  async sendTest(hook: Webhook): Promise<DeliveryResult> {
    const { retry: _retry, ...result } = await this.deliverOnce(hook, 'ping', {
      message: 'Test delivery from NOAgenda',
      webhookId: hook.id,
    });
    await this.record(hook.id, result);
    return result;
  }
}
