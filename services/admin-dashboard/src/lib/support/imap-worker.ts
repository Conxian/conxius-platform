import { generateTicketToken } from "./idgen";
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

export interface SupportEmail {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  body: string;
  messageId: string;
  inReplyTo?: string;
}

export class ImapWorker {
  private static readonly MAX_SUPPRESSED_MISSING_SOURCE_UIDS = 1000;

  private client: ImapFlow;
  private linearApiKey: string;
  private teamId: string;
  private labelCache: Map<string, string> = new Map();
  private transporter: nodemailer.Transporter;
  private suppressedMissingSourceUids: Set<number> = new Set();

  constructor() {
    this.client = new ImapFlow({
      host: process.env.SUPPORT_IMAP_HOST || 'mail.privateemail.com',
      port: parseInt(process.env.SUPPORT_IMAP_PORT || '993'),
      secure: true,
      auth: {
        user: process.env.SUPPORT_IMAP_USER || '',
        pass: process.env.SUPPORT_IMAP_PASSWORD || '',
      },
      logger: false,
    });
    this.linearApiKey = process.env.SUPPORT_LINEAR_API_KEY || '';
    this.teamId = process.env.SUPPORT_LINEAR_TEAM_ID || 'f14418e4-03cd-4fb4-8259-e5a9af8cb296';

    this.transporter = nodemailer.createTransport({
      host: process.env.SUPPORT_SMTP_HOST || 'mail.privateemail.com',
      port: parseInt(process.env.SUPPORT_SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SUPPORT_SMTP_USER || '',
        pass: process.env.SUPPORT_SMTP_PASSWORD || '',
      },
    });
  }

  async poll() {
    await this.client.connect();
    const lock = await this.client.getMailboxLock('INBOX');

    try {
      // Search for unread messages
      for await (const message of this.client.fetch({ seen: false }, { source: true })) {
        const source = await this.getMessageSource(message.uid, message.source);
        if (!source) {
          continue;
        }

        const parsed = await simpleParser(source);

        const email: SupportEmail = {
          id: message.uid.toString(),
          subject: parsed.subject || '(No Subject)',
          from: parsed.from?.text || 'unknown',
          to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to[0].text : parsed.to.text) : 'unknown',
          date: parsed.date || new Date(),
          body: parsed.text || parsed.html || '',
          messageId: parsed.messageId || '',
          inReplyTo: parsed.inReplyTo,
        };

        const sanitizedSubjectForLog = this.scrubContent(email.subject);
        console.log(`[IMAP] Processing email from ${email.from.split('@')[1] || 'unknown'}: ${sanitizedSubjectForLog}`);

        const result = await this.processEmail(email);

        if (result.success) {
          await this.sendAutoAck(email, result.token);
          // Mark as seen
          await this.client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
        }
      }
    } finally {
      lock.release();
      await this.client.logout();
    }
  }

  private async getMessageSource(
    uid: number,
    initialSource: Buffer | string | null | undefined,
  ): Promise<Buffer | string | null> {
    if (typeof initialSource === 'string' || Buffer.isBuffer(initialSource)) {
      this.clearMissingSourceSuppression(uid);
      return initialSource;
    }

    const isSuppressed = this.isMissingSourceSuppressed(uid);

    if (!isSuppressed) {
      console.warn(`[IMAP] Missing source for message ${uid}; retrying fetchOne()`);
      try {
        const refetched = await this.client.fetchOne(uid, { source: true }, { uid: true });
        if (refetched !== false && refetched.source) {
          return refetched.source;
        }
      } catch (e) {
        console.warn(`[IMAP] Failed to refetch message ${uid} source`, e);
      }
    }

    if (!isSuppressed) {
      console.error(`[IMAP] Skipping message ${uid}: missing source after retry`);

      try {
        await this.client.messageFlagsAdd({ uid }, ['\\Flagged']);
      } catch (e) {
        console.warn(`[IMAP] Failed to flag message ${uid} after missing source`, e);
      }
    }

    try {
      await this.client.messageFlagsAdd({ uid }, ['\\Seen']);
      this.clearMissingSourceSuppression(uid);
    } catch (e) {
      this.suppressMissingSource(uid);
      if (!isSuppressed) {
        console.warn(`[IMAP] Failed to mark message ${uid} as seen after missing source; suppressing logs/refetch`, e);
      }
    }

    return null;
  }

  private isMissingSourceSuppressed(uid: number): boolean {
    return this.suppressedMissingSourceUids.has(uid);
  }

  private suppressMissingSource(uid: number): void {
    this.suppressedMissingSourceUids.delete(uid);
    this.suppressedMissingSourceUids.add(uid);

    if (this.suppressedMissingSourceUids.size > ImapWorker.MAX_SUPPRESSED_MISSING_SOURCE_UIDS) {
      const oldestUid = this.suppressedMissingSourceUids.values().next().value;
      if (typeof oldestUid === 'number') {
        this.suppressedMissingSourceUids.delete(oldestUid);
      }
    }
  }

  private clearMissingSourceSuppression(uid: number): void {
    this.suppressedMissingSourceUids.delete(uid);
  }

  private scrubContent(text: string): string {
    let scrubbed = text;
    // PII Redaction
    scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED-EMAIL]');
    scrubbed = scrubbed.replace(/\b(invoice|inv)-[a-z0-9-]+\b/gi, '[REDACTED-INVOICE]');

    // Token & Secret Redaction (Hex/Base64 secrets)
    scrubbed = scrubbed.replace(/\b[a-f0-9]{32,64}\b/gi, '[REDACTED-TOKEN]');

    // Bitcoin-native Redaction
    // Legacy (1, 3) and WIF (5, K, L)
    scrubbed = scrubbed.replace(/\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g, '[REDACTED-BTC-ADDR]');
    scrubbed = scrubbed.replace(/\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/g, '[REDACTED-BTC-KEY]');
    // Bech32/SegWit (bc1)
    scrubbed = scrubbed.replace(/\bbc1[a-z0-9]{39,59}\b/g, '[REDACTED-BTC-ADDR]');

    return scrubbed;
  }

  private generateTicketToken(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = generateTicketToken("SUP").split("-").pop() || "0000";
    return `SUP-${date}-${random}`;
  }

  private async linearFetch(query: string, variables?: Record<string, unknown>) {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.linearApiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }
    return result.data;
  }

  private async resolveLabels(labelNames: string[]): Promise<string[]> {
    if (this.labelCache.size === 0) {
      try {
        const query = `
          query {
            issueLabels {
              nodes {
                id
                name
              }
            }
          }
        `;
        const data = await this.linearFetch(query);
        for (const label of data.issueLabels.nodes) {
          this.labelCache.set(label.name, label.id);
        }
      } catch (e) {
        console.warn('[Linear] Could not fetch labels, proceeding with empty labels');
      }
    }

    return labelNames
      .map(name => this.labelCache.get(name))
      .filter((id): id is string => !!id);
  }

  private async processEmail(email: SupportEmail): Promise<{ success: boolean; token: string }> {
    const token = this.generateTicketToken();
    const sanitizedSubject = this.scrubContent(email.subject);
    const sanitizedBody = this.scrubContent(email.body).substring(0, 2000);
    const senderDomain = email.from.split('@')[1] || 'unknown';

    const labelNames = ['Support'];
    const lowerTo = email.to.toLowerCase();

    if (lowerTo.includes('support@conxian-labs.com')) {
      labelNames.push('Support-Public');
    } else if (lowerTo.includes('info@conxian-labs.com') || lowerTo.includes('admin@conxian-labs.com')) {
      labelNames.push('Support-Internal');
    } else if (lowerTo.includes('community@conxian-labs.com') || lowerTo.includes('builders@conxian-labs.com')) {
      labelNames.push('Support-Community');
      labelNames.push('Publish-Candidate');
    }

    const description = `
**Ticket Token:** ${token}
**Sender Domain:** ${senderDomain}
**Timestamp:** ${email.date.toISOString()}
**Message ID:** ${email.messageId}
${email.inReplyTo ? `**In Reply To:** ${email.inReplyTo}` : ''}

---

### Sanitized Summary
${sanitizedBody}

---
*Note: Raw email is preserved in PrivateEmail. Treat this issue as the triage entry point.*
`;

    try {
      const labelIds = await this.resolveLabels(labelNames);
      const query = `
        mutation IssueCreate($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              identifier
              url
            }
          }
        }
      `;

      const variables = {
        input: {
          title: `[${token}] ${sanitizedSubject}`,
          description,
          teamId: this.teamId,
          labelIds,
          stateId: 'c95cc017-74dc-4024-ba0e-147bc544a3b3', // Triage
        }
      };

      const data = await this.linearFetch(query, variables);
      console.log(`[Linear] Created issue ${data.issueCreate.issue.identifier} for ${token}`);
      return { success: true, token };
    } catch (error) {
      console.error(`[Linear] Failed to create issue for ${token}:`, error);
      return { success: false, token: '' };
    }
  }

  private async sendAutoAck(email: SupportEmail, token: string) {
    const mailOptions = {
      from: `"Conxian Labs Support" <${process.env.SUPPORT_SMTP_USER}>`,
      to: email.from,
      subject: `Re: ${email.subject} [${token}]`,
      text: `
Hello,

Thank you for contacting Conxian Labs. We have received your message and assigned it the following ticket token:

${token}

Our team will review your request and get back to you shortly.

Best regards,
The Conxian Labs Team
      `,
      inReplyTo: email.messageId,
      references: [email.messageId],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[SMTP] Sent auto-ack to ${email.from} for ${token}`);
    } catch (error) {
      console.error(`[SMTP] Failed to send auto-ack for ${token}:`, error);
    }
  }
}
