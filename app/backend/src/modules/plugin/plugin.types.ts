import type { NotificationType } from '../notification/notification.entity';

/**
 * Built-in plugins. A plugin is a Nest module in this repository that registers a PluginDefinition with
 * the PluginRegistry when it starts. Nothing is loaded from disk at runtime: plugins are reviewed,
 * typed and shipped in the image like the rest of the code.
 *
 * Texts (name, description, field labels and help) live in the frontend catalog under
 * `plugins.<key>.*`; the English `name` / `description` here are only a fallback for the API.
 */
export type PluginFieldKind = 'text' | 'secret' | 'select';

export interface PluginField {
  key: string;
  /** `secret`: stored encrypted, never returned by the API (only whether it is set). */
  kind: PluginFieldKind;
  /** Must be set before the plugin (admin fields) or the user's channel (user fields) can be switched on. */
  required?: boolean;
  /** Allowed values of a `select` field. */
  options?: readonly string[];
  /** Used when the field is not set. */
  default?: string;
  /** Longest accepted value (default 2048). */
  maxLength?: number;
}

/** One notification on its way to a channel, already worded in the recipient's language. */
export interface ChannelMessage {
  userId: number;
  /** Null for the test message. */
  type: NotificationType | null;
  text: string;
  /** Absolute link to the task or project in the app, when there is one. */
  link: string | null;
  /** "Open in NOAgenda", in the recipient's language. */
  linkLabel: string;
}

/** A failed delivery; `retry` when trying again later may help (network trouble, 5xx, 429). */
export class ChannelError extends Error {
  constructor(
    message: string,
    readonly retry: boolean,
  ) {
    super(message);
  }
}

export type FieldValues = Record<string, string>;

export interface PluginDefinition {
  /** Stable id, also the database key: lowercase letters, digits and dashes. */
  key: string;
  name: string;
  description: string;
  /** Instance-wide settings, edited by the app admin. */
  adminFields: readonly PluginField[];
  /** Per-user settings; a plugin without them has no section in the user's settings. */
  userFields: readonly PluginField[];
  /** Check settings before they are saved; throw a BadRequestException with a readable message. */
  validateAdmin?(config: FieldValues): Promise<void> | void;
  validateUser?(settings: FieldValues, admin: FieldValues): Promise<void> | void;
  /**
   * A notification channel: deliver one message to one user, with their settings and the admin config.
   * Throw a ChannelError on failure. Runs in the background; it never affects the action that caused it.
   */
  channel?: {
    send(message: ChannelMessage, settings: FieldValues, admin: FieldValues): Promise<void>;
  };
}

export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'task_assigned',
  'task_comment',
  'task_reminder',
  'project_added',
  'project_transferred',
  'project_transferred_away',
];
