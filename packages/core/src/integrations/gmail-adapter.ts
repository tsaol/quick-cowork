import { google, type gmail_v1, type Auth } from 'googleapis';
import type { GmailMessage } from '@quick-cowork/shared';

type OAuth2Client = Auth.OAuth2Client;

const REDIRECT_URI = 'http://localhost:3847/callback';
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

export class GmailAdapter {
  private oauth2Client: OAuth2Client | null = null;
  private gmail: gmail_v1.Gmail | null = null;

  configure(clientId: string, clientSecret: string, refreshToken: string): void {
    if (!clientId || !clientSecret || !refreshToken) {
      this.oauth2Client = null;
      this.gmail = null;
      return;
    }
    const { OAuth2 } = google.auth;
    this.oauth2Client = new OAuth2(clientId, clientSecret, REDIRECT_URI);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  isConfigured(): boolean {
    return this.gmail !== null;
  }

  getAuthUrl(clientId: string, clientSecret: string): string {
    const { OAuth2 } = google.auth;
    const client = new OAuth2(clientId, clientSecret, REDIRECT_URI);
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [GMAIL_SCOPE],
    });
  }

  async exchangeCodeForRefreshToken(
    clientId: string,
    clientSecret: string,
    code: string,
  ): Promise<string> {
    const { OAuth2 } = google.auth;
    const client = new OAuth2(clientId, clientSecret, REDIRECT_URI);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error('No refresh token returned. Revoke app access and reauthorize.');
    }
    return tokens.refresh_token;
  }

  async listEmails(query?: string, maxResults = 20): Promise<GmailMessage[]> {
    if (!this.gmail) throw new Error('Gmail not configured');
    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: query || '',
      maxResults,
    });
    const messages = res.data.messages || [];
    const results: GmailMessage[] = [];
    for (const msg of messages) {
      if (!msg.id) continue;
      const full = await this.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });
      const headers = full.data.payload?.headers || [];
      const get = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
      results.push({
        id: msg.id,
        from: get('From'),
        to: get('To'),
        subject: get('Subject'),
        body: full.data.snippet || '',
        date: Number(full.data.internalDate) || 0,
      });
    }
    return results;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (!this.gmail) throw new Error('Gmail not configured');
    const message = `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`;
    const raw = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    await this.gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  }
}
