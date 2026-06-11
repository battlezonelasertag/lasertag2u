/* ============================================================
   API/INSTAGRAM.JS — Vercel Serverless Function
   Fetches recent media from Instagram Graph API (v21.0).
   Requires a Professional (Business/Creator) Instagram account.

   Environment variables (set in Vercel project settings):
     INSTAGRAM_USER_ID      — your Instagram Business Account ID
     INSTAGRAM_ACCESS_TOKEN — long-lived User Access Token (60-day expiry)

   Setup: see instructions at the bottom of this file.
   ============================================================ */

const GRAPH_VERSION = 'v21.0';
const FIELDS        = 'id,media_type,media_url,thumbnail_url,permalink,caption';
const LIMIT         = 12;

module.exports = async function handler(req, res) {
  const token  = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!token || !userId) {
    return res.status(503).json({ error: 'Instagram not configured' });
  }

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${userId}/media`
      + `?fields=${FIELDS}&limit=${LIMIT}&access_token=${token}`;

    const upstream = await fetch(url);

    if (!upstream.ok) {
      const err = await upstream.json();
      throw new Error(err.error?.message || `Graph API ${upstream.status}`);
    }

    const data = await upstream.json();

    const media = (data.data || []).filter(
      item => item.media_type === 'IMAGE' || item.media_type === 'VIDEO'
    );

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ media });
  } catch (err) {
    console.error('Instagram feed error:', err.message);
    return res.status(500).json({ error: 'Failed to load Instagram feed' });
  }
};

/*
   ── SETUP GUIDE ────────────────────────────────────────────────

   1. MAKE INSTAGRAM PROFESSIONAL
      Instagram app → Profile → Edit Profile → Switch to Professional Account
      Choose "Creator" or "Business". Free, takes 1 minute.

   2. CONNECT TO A FACEBOOK PAGE
      Instagram app → Settings → Account → Linked Accounts → Facebook
      Connect to your Facebook Page (create one if needed — can be unpublished).

   3. CREATE A META DEVELOPER APP
      - Go to developers.facebook.com → My Apps → Create App
      - Goal: "Other" → Type: "Business" → name it anything (e.g. "LT2U Site")
      - In the app dashboard, click "Add Product" → find "Instagram" → click Set Up

   4. GET A USER ACCESS TOKEN
      - Go to graph.facebook.com/explorer
      - Top-right: select your new app from the dropdown
      - Click "Generate Access Token" → log in and approve permissions:
          ✓ instagram_basic
          ✓ pages_show_list
      - Copy the short-lived token shown

   5. FIND YOUR INSTAGRAM BUSINESS ACCOUNT ID
      Run this in the Graph Explorer (or paste into browser, replacing TOKEN):
        GET https://graph.facebook.com/v21.0/me/accounts?access_token=TOKEN
      → Note the Page ID from the response, then run:
        GET https://graph.facebook.com/v21.0/{PAGE_ID}?fields=instagram_business_account&access_token=TOKEN
      → Copy the "id" value inside "instagram_business_account" — that's your INSTAGRAM_USER_ID

   6. EXCHANGE FOR A LONG-LIVED TOKEN (valid 60 days)
      In Graph Explorer or browser:
        GET https://graph.facebook.com/v21.0/oauth/access_token
          ?grant_type=fb_exchange_token
          &client_id={YOUR_APP_ID}
          &client_secret={YOUR_APP_SECRET}
          &fb_exchange_token={SHORT_LIVED_TOKEN}
      → Copy the returned access_token — that's your INSTAGRAM_ACCESS_TOKEN

   7. ADD TO VERCEL
      Vercel dashboard → your project → Settings → Environment Variables:
        INSTAGRAM_USER_ID      = (the ID from step 5)
        INSTAGRAM_ACCESS_TOKEN = (the token from step 6)
      Then Redeploy.

   8. REFRESH BEFORE EXPIRY (every ~50 days)
      GET https://graph.facebook.com/v21.0/oauth/access_token
        ?grant_type=fb_exchange_token
        &client_id={APP_ID}
        &client_secret={APP_SECRET}
        &fb_exchange_token={CURRENT_TOKEN}
      Update INSTAGRAM_ACCESS_TOKEN in Vercel and redeploy.
*/
