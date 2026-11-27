import { BadRequestException } from '@nestjs/common';
import { chatPayload, chatWebhookPlugin, detectFormat, hostAllowed, transport } from '../chat-webhook.plugin';
import { ChannelError, type ChannelMessage } from '../../../plugin/plugin.types';

const msg: ChannelMessage = {
  userId: 7,
  type: 'task_comment',
  text: 'Ann commented on "<b>Fix</b> @channel *now* & [x](y)"',
  link: 'https://app.example/tasks/42',
  linkLabel: 'Open in NOAgenda',
};

describe('chat webhook plugin', () => {
  it('detects the chat from the address', () => {
    expect(detectFormat('https://hooks.slack.com/services/T/B/X')).toBe('slack');
    expect(detectFormat('https://discord.com/api/webhooks/1/abc')).toBe('discord');
    expect(detectFormat('https://prod-12.westeurope.logic.azure.com/workflows/x')).toBe('teams');
    expect(detectFormat('https://contoso.webhook.office.com/webhookb2/x')).toBe('teams');
    expect(detectFormat('https://chat.example.org/hooks/abc')).toBe('mattermost');
  });

  it('limits hosts when the admin set a list (subdomains included); an empty list allows any', () => {
    expect(hostAllowed('hooks.slack.com', '')).toBe(true);
    expect(hostAllowed('hooks.slack.com', 'slack.com, discord.com')).toBe(true);
    expect(hostAllowed('evil.example', 'slack.com')).toBe(false);
    expect(hostAllowed('notslack.com', 'slack.com')).toBe(false);
    expect(hostAllowed('a.b.example', '*.b.example')).toBe(true);
  });

  it('Slack: markup escaped, mentions defused, one link to the app', () => {
    const { text } = chatPayload('slack', msg) as { text: string };
    expect(text).toContain('&lt;b&gt;Fix&lt;/b&gt;');
    expect(text).toContain('&amp;');
    expect(text).not.toContain('@channel');
    expect(text.endsWith('\n<https://app.example/tasks/42|Open in NOAgenda>')).toBe(true);
  });

  it('Discord: formatting escaped and no mentions allowed at all', () => {
    const body = chatPayload('discord', msg) as { content: string; allowed_mentions: { parse: string[] } };
    expect(body.allowed_mentions).toEqual({ parse: [] });
    expect(body.content).toContain('\\*now\\*');
    expect(body.content).toContain('\\[x\\]\\(y\\)');
    expect(body.content).not.toContain('@channel');
    expect(body.content.endsWith('\n<https://app.example/tasks/42>')).toBe(true);
  });

  it('Teams: an Adaptive Card with the text and an "open" button', () => {
    const body = chatPayload('teams', msg) as {
      attachments: { content: { body: { text: string }[]; actions: { url: string; title: string }[] } }[];
    };
    const card = body.attachments[0].content;
    expect(card.body[0].text).toContain('\\*now\\*');
    expect(card.actions).toEqual([
      { type: 'Action.OpenUrl', title: 'Open in NOAgenda', url: 'https://app.example/tasks/42' },
    ]);
  });

  describe('send', () => {
    const post = jest.spyOn(transport, 'post');
    afterEach(() => post.mockReset());
    const send = (settings: Record<string, string>, admin: Record<string, string> = {}) =>
      chatWebhookPlugin.channel!.send(msg, settings, admin);

    it('posts the payload for the detected chat', async () => {
      post.mockResolvedValue(204);
      await send({ url: 'https://8.8.8.8/hooks/abc', format: 'auto' });
      const [url, headers, body] = post.mock.calls[0];
      expect(url).toBe('https://8.8.8.8/hooks/abc');
      expect(headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(body)).toHaveProperty('text');
    });

    it('a chosen format wins over detection', async () => {
      post.mockResolvedValue(200);
      await send({ url: 'https://8.8.8.8/hooks/abc', format: 'discord' });
      expect(JSON.parse(post.mock.calls[0][2])).toHaveProperty('allowed_mentions');
    });

    it('5xx and 429 are retried, other errors and redirects are not', async () => {
      for (const [status, retry] of [
        [500, true],
        [429, true],
        [404, false],
        [302, false],
      ] as const) {
        post.mockResolvedValueOnce(status);
        const err = (await send({ url: 'https://8.8.8.8/h' }).catch((e: unknown) => e)) as ChannelError;
        expect([err.constructor.name, err.retry]).toEqual(['ChannelError', retry]);
      }
    });

    it('refuses internal addresses and hosts the admin did not allow, without sending', async () => {
      await expect(send({ url: 'http://127.0.0.1/h' })).rejects.toMatchObject({ retry: false });
      await expect(send({ url: 'https://8.8.8.8/h' }, { allowedHosts: 'slack.com' })).rejects.toThrow(/not an allowed/);
      expect(post).not.toHaveBeenCalled();
    });
  });

  it('checks a new address when the user saves it', async () => {
    const v = chatWebhookPlugin.validateUser!;
    await expect(v({ url: 'ftp://x' }, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(v({ url: 'http://10.0.0.5/hook' }, {})).rejects.toThrow(/public address/);
    await expect(v({ url: 'https://8.8.8.8/h' }, { allowedHosts: 'slack.com' })).rejects.toThrow(/not allowed/);
    await expect(v({ url: 'https://8.8.8.8/h' }, {})).resolves.toBeUndefined();
  });

  it('checks the admin host list', () => {
    expect(() => chatWebhookPlugin.validateAdmin!({ allowedHosts: 'slack.com, *.discord.com' })).not.toThrow();
    expect(() => chatWebhookPlugin.validateAdmin!({ allowedHosts: 'https://slack.com/x' })).toThrow(/host names/);
  });
});
