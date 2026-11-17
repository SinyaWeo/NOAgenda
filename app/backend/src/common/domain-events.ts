import { Global, Injectable, Module } from '@nestjs/common';

/** Something that happened to a task, project or comment. Subscribers (e.g. webhook delivery) react to it. */
export interface DomainEvent {
  /** 'task.created' | 'task.updated' | 'task.deleted' | 'project.created' | ... | 'comment.created' */
  name: string;
  /** What is sent to subscribers. */
  data: Record<string, unknown>;
  /** The task or project the event is about (for a comment: the task it belongs to). */
  nodeId: number;
  /** The project it belongs to (the project itself for project events), or null for a personal task. Omit to look it up. */
  projectId?: number | null;
  /** A user who always may hear about it: the project's owner, or a personal task's creator. */
  owner?: number | null;
}

type Handler = (event: DomainEvent) => void | Promise<void>;

/**
 * A minimal in-process event bus. It lets the node layer announce changes without depending on
 * whoever listens (which would be a circular module import). Handlers must not throw: a failing
 * subscriber never affects the action that raised the event.
 */
@Injectable()
export class DomainEvents {
  private readonly handlers: Handler[] = [];

  on(handler: Handler): void {
    this.handlers.push(handler);
  }

  emit(event: DomainEvent): void {
    for (const handler of this.handlers) {
      try {
        void Promise.resolve(handler(event)).catch(() => undefined);
      } catch {
        // ignore: see above
      }
    }
  }
}

@Global()
@Module({ providers: [DomainEvents], exports: [DomainEvents] })
export class EventsModule {}
