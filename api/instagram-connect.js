/* One-time setup endpoint. Visit /api/instagram-connect to begin OAuth. */

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

  res.writeHead(302, { Location: `https://www.facebook.com/v21.0/dialog/oauth?${params}` });
  res.end();
};
