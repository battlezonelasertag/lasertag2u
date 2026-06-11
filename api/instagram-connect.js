/* One-time setup endpoint. Visit /api/instagram-connect to begin OAuth.
   Add ?debug=1 to see the App ID and redirect URI without redirecting. */

module.exports = function handler(req, res) {
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
  });

  const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;

  // Debug mode — shows values without redirecting
  if (req.query.debug === '1') {
    const masked = appId.length > 6
      ? appId.slice(0, 3) + '…' + appId.slice(-3)
      : '(too short to mask)';
    return res.status(200).send(`
      <pre style="font-family:monospace;padding:24px;font-size:14px;line-height:1.8">
App ID from env:  ${masked}  (${appId.length} chars)
All numeric:      ${/^\d+$/.test(appId)}
Redirect URI:     ${redirectUri}
Full OAuth URL:   ${oauthUrl}
      </pre>
      <a href="/api/instagram-connect" style="font-family:sans-serif;padding:0 24px">→ Proceed to Facebook login</a>
    `);
  }

  res.writeHead(302, { Location: oauthUrl });
  res.end();
};
