import { google, type calendar_v3, type Auth } from 'googleapis';
import type { CalendarEvent } from '@quick-cowork/shared';

type OAuth2Client = Auth.OAuth2Client;

const REDIRECT_URI = 'http://localhost:3847/callback';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

export class CalendarAdapter {
  private oauth2Client: OAuth2Client | null = null;
  private calendar: calendar_v3.Calendar | null = null;

  configure(clientId: string, clientSecret: string, refreshToken: string): void {
    if (!clientId || !clientSecret || !refreshToken) {
      this.oauth2Client = null;
      this.calendar = null;
      return;
    }
    const { OAuth2 } = google.auth;
    this.oauth2Client = new OAuth2(clientId, clientSecret, REDIRECT_URI);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  isConfigured(): boolean {
    return this.calendar !== null;
  }

  getAuthUrl(clientId: string, clientSecret: string): string {
    const { OAuth2 } = google.auth;
    const client = new OAuth2(clientId, clientSecret, REDIRECT_URI);
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [CALENDAR_SCOPE],
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

  async listEvents(timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    if (!this.calendar) throw new Error('Calendar not configured');
    const now = new Date().toISOString();
    const res = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || now,
      timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return (res.data.items || [])
      .filter((e) => e.id)
      .map((e) => ({
        id: e.id!,
        title: e.summary || '',
        start: new Date(e.start?.dateTime || e.start?.date || 0).getTime(),
        end: new Date(e.end?.dateTime || e.end?.date || 0).getTime(),
        description: e.description || undefined,
        location: e.location || undefined,
      }));
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    if (!this.calendar) throw new Error('Calendar not configured');
    const res = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.title,
        start: { dateTime: new Date(event.start).toISOString() },
        end: { dateTime: new Date(event.end).toISOString() },
        description: event.description,
        location: event.location,
      },
    });
    return {
      id: res.data.id || '',
      title: res.data.summary || event.title,
      start: event.start,
      end: event.end,
      description: event.description,
      location: event.location,
    };
  }
}
