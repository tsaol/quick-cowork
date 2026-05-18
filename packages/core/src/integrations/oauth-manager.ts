import http from 'node:http';
import { google, type Auth } from 'googleapis';

export type OAuthProvider = 'gmail' | 'calendar';

const REDIRECT_URI = 'http://localhost:3847/callback';
const PROVIDER_SCOPES: Record<OAuthProvider, string[]> = {
  gmail: ['https://www.googleapis.com/auth/gmail.modify'],
  calendar: ['https://www.googleapis.com/auth/calendar'],
};

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

export interface OAuthTokens {
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
}

export class OAuthManager {
  private readonly callbackPort = 3847;
  private activeServer: http.Server | null = null;

  /**
   * Run the full OAuth consent flow for `provider`. Opens the authorization
   * URL via `openWindow`, captures the callback on localhost, exchanges the
   * code for tokens, and returns them. Caller is responsible for persisting
   * the refresh token.
   */
  async startOAuth(
    provider: OAuthProvider,
    credentials: OAuthCredentials,
    openWindow: (url: string) => void,
  ): Promise<OAuthTokens> {
    const client = this.makeClient(credentials);
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: PROVIDER_SCOPES[provider],
    });
    const code = await this.startOAuthFlow(authUrl, openWindow);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error('No refresh token returned. Revoke app access and reauthorize.');
    }
    return {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token || undefined,
      expiryDate: tokens.expiry_date || undefined,
    };
  }

  /**
   * Get a fresh access token from a stored refresh token. Returns the new
   * tokens (refreshToken is unchanged unless Google rotates it).
   */
  async getTokens(
    credentials: OAuthCredentials,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    const client = this.makeClient(credentials);
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials: refreshed } = await client.refreshAccessToken();
    return {
      refreshToken: refreshed.refresh_token || refreshToken,
      accessToken: refreshed.access_token || undefined,
      expiryDate: refreshed.expiry_date || undefined,
    };
  }

  async refreshToken(
    credentials: OAuthCredentials,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    return this.getTokens(credentials, refreshToken);
  }

  /**
   * Lower-level helper: start the localhost callback server, open the auth
   * URL, and return the OAuth code. Used internally by `startOAuth` and
   * exposed for callers that build their own auth URL (e.g. adapter
   * `getAuthUrl` paths).
   */
  async startOAuthFlow(authUrl: string, openWindow: (url: string) => void): Promise<string> {
    if (this.activeServer) {
      this.activeServer.close();
      this.activeServer = null;
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
        if (this.activeServer) {
          this.activeServer.close();
          this.activeServer = null;
        }
      };

      const server = http.createServer((req, res) => {
        try {
          const url = new URL(req.url || '/', `http://localhost:${this.callbackPort}`);
          if (url.pathname !== '/callback') {
            res.writeHead(404);
            res.end();
            return;
          }
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(
            '<html><body style="font-family:system-ui;padding:40px;text-align:center;">' +
              '<h2>Authorization complete.</h2>' +
              '<p>You can close this window and return to Quick Cowork.</p>' +
              '</body></html>',
          );
          if (error) {
            finish(() => reject(new Error(`OAuth error: ${error}`)));
          } else if (code) {
            finish(() => resolve(code));
          } else {
            finish(() => reject(new Error('No authorization code received')));
          }
        } catch (err) {
          finish(() => reject(err instanceof Error ? err : new Error(String(err))));
        }
      });

      server.on('error', (err) => finish(() => reject(err)));

      server.listen(this.callbackPort, () => {
        try {
          openWindow(authUrl);
        } catch (err) {
          finish(() => reject(err instanceof Error ? err : new Error(String(err))));
        }
      });

      this.activeServer = server;

      setTimeout(() => {
        finish(() => reject(new Error('OAuth timeout: no callback received in 2 minutes')));
      }, 120000);
    });
  }

  private makeClient(credentials: OAuthCredentials): Auth.OAuth2Client {
    const { OAuth2 } = google.auth;
    return new OAuth2(credentials.clientId, credentials.clientSecret, REDIRECT_URI);
  }
}
