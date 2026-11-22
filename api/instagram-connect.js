/* One-time setup endpoint. Visit /api/instagram-connect?key=SETUP_KEY to begin OAuth.
   Add &debug=1 to see the App ID and redirect URI without redirecting.

   Environment variables:
     INSTAGRAM_APP_ID — Meta app ID
     SETUP_KEY        — shared secret guarding this endpoint and the callback.
                        Unset means both endpoints stay disabled. */

const { requireSetupKey, stateToken } = require('./_setup-auth.js');

module.exports = function handler(req, res) {
  const setupKey = requireSetupKey(req, res);
  if (!setupKey) return; // requireSetupKey already responded

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return res.status(500).send('INSTAGRAM_APP_ID is not set in Vercel environment variables.');
  }

  const proto       = req.headers['x-forwarded-proto'] || 'https';
  const host        = req.headers.host;
  const redirectUri = `${proto}://${host}/api/instagram-callback`;

  const params = new URLSearchParams({
    client_id:     appId,
    redirect_uri:  redirectUri,
    scope:         'instagram_basic,pages_show_list',
    response_type: 'code',
    state:         stateToken(setupKey),
  });

  const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;

  // Debug mode — shows values without redirecting
  if (req.query.debug === '1') {
    const masked = appId.length > 6
      ? appId.slice(0, 3) + '…' + appId.slice(-3)
      : '(too short to mask)';
    const proceed = `/api/instagram-connect?key=${encodeURIComponent(req.query.key)}`;
    return res.status(200).send(`
      <pre style="font-family:monospace;padding:24px;font-size:14px;line-height:1.8">
App ID from env:  ${masked}  (${appId.length} chars)
All numeric:      ${/^\d+$/.test(appId)}
Redirect URI:     ${redirectUri}
Full OAuth URL:   ${oauthUrl}
      </pre>
      <a href="${proceed}" style="font-family:sans-serif;padding:0 24px">→ Proceed to Facebook login</a>
    `);
  }

  res.writeHead(302, { Location: oauthUrl });
  res.end();
};
