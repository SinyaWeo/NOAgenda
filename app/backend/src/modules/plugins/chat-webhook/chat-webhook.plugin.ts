import { BadRequestException } from '@nestjs/common';
import { assertPublicHttpUrl, BLOCKED_ADDRESS } from '../../../common/url-guard';
import { safePost } from '../../../common/safe-post';
import { ChannelError, type ChannelMessage, type FieldValues, type PluginDefinition } from '../../plugin/plugin.types';

export const CHAT_FORMATS = ['auto', 'slack', 'discord', 'teams', 'mattermost'] as const;
export type ChatFormat = Exclude<(typeof CHAT_FORMATS)[number], 'auto'>;

/** The chat a webhook URL belongs to, from its address; Slack-compatible (Mattermost & co.) otherwise. */
export function detectFormat(rawUrl: string): ChatFormat {
  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();
  if (host === 'hooks.slack.com') return 'slack';
  if (
    (host === 'discord.com' || host === 'discordapp.com' || host.endsWith('.discord.com')) &&
    url.pathname.startsWith('/api/webhooks/')
  ) {
    return 'discord';
  }
  if (
    host.endsWith('.webhook.office.com') ||
    host.endsWith('.logic.azure.com') ||
    host.endsWith('.powerplatform.com') ||
    host.endsWith('.powerautomate.com')
  ) {
    return 'teams';
  }
  return 'mattermost';
}

/** Is `host` one of the allowed hosts (or a subdomain of one)? An empty list allows any public host. */
export function hostAllowed(host: string, allowedHosts: string | undefined): boolean {
  const allowed = (allowedHosts ?? '')
    .split(/[\s,]+/)
    .map((h) => h.trim().toLowerCase().replace(/^\*\./, ''))
    .filter(Boolean);
  if (!allowed.length) return true;
  const h = host.toLowerCase();
  return allowed.some((a) => h === a || h.endsWith('.' + a));
}

/** Slack mrkdwn / Mattermost: escape markup and defuse @channel-style mentions (a word joiner after @). */
const slackText = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/@/g, '@\u2060');
/** Discord / Teams markdown: escape formatting characters so a task title cannot style or ping. */
const markdownText = (s: string) => s.replace(/([\\*_~`|>[\]()#])/g, '\\$1').replace(/@/g, '@\u2060');

/** The JSON body each chat expects. Plain text with one link to the app; nothing from the user is markup. */
export function chatPayload(format: ChatFormat, m: ChannelMessage): unknown {
  switch (format) {
    case 'slack':
      return { text: m.link ? `${slackText(m.text)}\n<${m.link}|${slackText(m.linkLabel)}>` : slackText(m.text) };
    case 'mattermost':
      return { text: m.link ? `${slackText(m.text)}\n[${markdownText(m.linkLabel)}](${m.link})` : slackText(m.text) };
    case 'discord':
      // allowed_mentions: nothing in the message may ping anyone, whatever the text says.
      return {
        content: m.link ? `${markdownText(m.text)}\n<${m.link}>` : markdownText(m.text),
        allowed_mentions: { parse: [] },
      };
    case 'teams':
      // Teams "Workflows" webhooks take an Adaptive Card.
      return {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.4',
              body: [{ type: 'TextBlock', text: markdownText(m.text), wrap: true }],
              actions: m.link ? [{ type: 'Action.OpenUrl', title: m.linkLabel, url: m.link }] : [],
            },
          },
        ],
      };
  }
}

/** Overridable in tests. */
export const transport = { post: safePost };

async function send(m: ChannelMessage, settings: FieldValues, admin: FieldValues): Promise<void> {
  const url = settings.url;
  if (!url) throw new ChannelError('No webhook address is set', false);
  const host = new URL(url).hostname;
  if (!hostAllowed(host, admin.allowedHosts)) throw new ChannelError(`${host} is not an allowed chat host`, false);
  try {
    await assertPublicHttpUrl(url); // DNS may have changed since it was saved
  } catch (err) {
    throw new ChannelError((err as Error).message, false);
  }
  const format = settings.format && settings.format !== 'auto' ? (settings.format as ChatFormat) : detectFormat(url);
  let status: number;
  try {
    status = await transport.post(
      url,
      { 'Content-Type': 'application/json', 'User-Agent': 'NOAgenda' },
      JSON.stringify(chatPayload(format, m)),
    );
  } catch (err) {
    const blocked = (err as NodeJS.ErrnoException).code === BLOCKED_ADDRESS;
    const timedOut = (err as Error).name === 'TimeoutError' || (err as Error).name === 'AbortError';
    throw new ChannelError(timedOut ? 'Timed out' : (err as Error).message, !blocked);
  }
  if (status >= 200 && status < 300) return;
  if (status >= 300 && status < 400) throw new ChannelError('Redirects are not followed', false);
  throw new ChannelError(`HTTP ${status}`, status >= 500 || status === 429);
}

/**
 * Chat webhook: each user posts their own notifications to a chat they own (a Slack, Discord, Microsoft
 * Teams or Mattermost incoming webhook). The webhook address is the secret: anyone who has it can post to
 * that chat, so it is stored encrypted and never shown again. The admin can limit which chat hosts are allowed.
 */
export const chatWebhookPlugin: PluginDefinition = {
  key: 'chat-webhook',
  name: 'Chat webhook',
  description: 'Sends each user’s notifications to their own Slack, Discord, Microsoft Teams or Mattermost chat.',
  adminFields: [{ key: 'allowedHosts', kind: 'text', maxLength: 1024 }],
  userFields: [
    { key: 'url', kind: 'secret', required: true, maxLength: 2048 },
    { key: 'format', kind: 'select', options: CHAT_FORMATS, default: 'auto' },
  ],
  validateAdmin(config) {
    const hosts = (config.allowedHosts ?? '').split(/[\s,]+/).filter(Boolean);
    if (hosts.some((h) => !/^(\*\.)?[a-z0-9.-]+$/i.test(h))) {
      throw new BadRequestException('Allowed hosts must be host names separated by commas');
    }
  },
  async validateUser(settings, admin) {
    if (!settings.url) return;
    let url: URL;
    try {
      url = new URL(settings.url);
    } catch {
      throw new BadRequestException('url must be a valid http(s) URL');
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:')
      throw new BadRequestException('url must be a valid http(s) URL');
    if (!hostAllowed(url.hostname, admin.allowedHosts)) {
      throw new BadRequestException('This chat host is not allowed on this server');
    }
    await assertPublicHttpUrl(settings.url);
  },
  channel: { send },
};
