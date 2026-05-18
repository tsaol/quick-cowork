import http from 'node:http';

export class OAuthManager {
  private readonly callbackPort = 3847;
  private activeServer: http.Server | null = null;

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
}
