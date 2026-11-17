import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AppSettingsService } from '../app-settings/app-settings.service';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends transactional email over SMTP.
 *
 * Config: SMTP_HOST, SMTP_PORT (587), SMTP_SECURE (true for 465), SMTP_USER, SMTP_PASS, MAIL_FROM.
 * Without SMTP_HOST nothing is sent: the message is written to the log instead
 * (so password reset links are usable in development) and `enabled` is false.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport?: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly appSettings: AppSettingsService) {
    this.from = process.env.MAIL_FROM || 'NOAgenda <no-reply@localhost>';
    if (process.env.SMTP_HOST) {
      this.transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    } else if (process.env.NODE_ENV === 'production') {
      this.logger.warn('SMTP_HOST is not set: password reset and verification emails cannot be delivered.');
    }
  }

  /** Absolute link to a frontend page (PUBLIC_URL, else the CORS origin, else local dev). */
  link(path: string, query: Record<string, string> = {}): string {
    const base = (process.env.PUBLIC_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
    const qs = new URLSearchParams(query).toString();
    return `${base}${path}${qs ? '?' + qs : ''}`;
  }

  /** The configured app name, for subjects and wording. */
  appName(): Promise<string> {
    return this.appSettings.getAppName();
  }

  /** True when mail can really be delivered. */
  get enabled(): boolean {
    return !!this.transport;
  }

  /** Never throws: callers must not leak (or fail on) delivery problems. Returns success. */
  async send(msg: MailMessage): Promise<boolean> {
    if (!this.transport) {
      // The body holds single-use reset/verification links: log it only outside production.
      const body = process.env.NODE_ENV === 'production' ? '' : `\n${msg.text}`;
      this.logger.log(`[mail disabled] To: ${msg.to} | ${msg.subject}${body}`);
      return false;
    }
    try {
      await this.transport.sendMail({ from: this.from, ...msg });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send "${msg.subject}" to ${msg.to}: ${(err as Error).message}`);
      return false;
    }
  }
}
