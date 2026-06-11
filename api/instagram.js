/* ============================================================
   API/INSTAGRAM.JS — Vercel Serverless Function
   Proxies Instagram Graph API so the access token stays server-side.

   Environment variable (set in Vercel project settings):
     INSTAGRAM_ACCESS_TOKEN — long-lived token from Meta Developer Console
                              (valid 60 days; refresh via /api/instagram/refresh)

   Setup steps:
     1. Go to developers.facebook.com → create an app (type: Consumer)
     2. Add "Instagram Basic Display" product
     3. Under Instagram Basic Display → Instagram Testers → add your account
     4. Generate a User Token for your test user
     5. Exchange it for a long-lived token:
        GET https://graph.instagram.com/access_token
          ?grant_type=ig_exchange_token
          &client_secret={app-secret}
          &access_token={short-lived-token}
     6. Copy the long-lived token into INSTAGRAM_ACCESS_TOKEN in Vercel
     7. Refresh before expiry (every ~50 days):
        GET https://graph.instagram.com/refresh_access_token
          ?grant_type=ig_refresh_token
          &access_token={long-lived-token}
   ============================================================ */

const FIELDS = 'id,media_type,media_url,thumbnail_url,permalink,caption';
const LIMIT   = 12;

module.exports = async function handler(req, res) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    return res.status(503).json({ error: 'Instagram not configured' });
  }

  try {
    const url = `https://graph.instagram.com/me/media?fields=${FIELDS}&limit=${LIMIT}&access_token=${token}`;
    const upstream = await fetch(url);

    if (!upstream.ok) {
      const err = await upstream.json();
      throw new Error(err.error?.message || `Instagram ${upstream.status}`);
    }

    const data = await upstream.json();

    const media = (data.data || []).filter(
      item => item.media_type === 'IMAGE' || item.media_type === 'VIDEO'
    );

    // Cache for 1 hour, serve stale up to 24 h while revalidating
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ media });
  } catch (err) {
    console.error('Instagram feed error:', err.message);
    return res.status(500).json({ error: 'Failed to load Instagram feed' });
  }
};
