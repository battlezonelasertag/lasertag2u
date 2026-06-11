/* Handles Facebook OAuth callback. Exchanges code for tokens, finds IG User ID, displays results. */

const GRAPH = 'https://graph.facebook.com/v21.0';

module.exports = async function handler(req, res) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(errorPage(`Facebook declined access: ${error_description || error}`));
  }
  if (!code) {
    return res.status(400).send(errorPage('No authorisation code received from Facebook.'));
  }

  const appId     = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const proto     = req.headers['x-forwarded-proto'] || 'https';
  const host      = req.headers.host;
  const redirectUri = `${proto}://${host}/api/instagram-callback`;

  try {
    // 1. Short-lived token
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    const shortData = await shortRes.json();
    if (!shortRes.ok) throw new Error(shortData.error?.message || 'Token exchange failed');
    const shortToken = shortData.access_token;

    // 2. Long-lived token (~60 days)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    if (!longRes.ok) throw new Error(longData.error?.message || 'Long-lived token exchange failed');
    const longToken  = longData.access_token;
    const expiryDays = longData.expires_in ? Math.round(longData.expires_in / 86400) : 60;

    // 3. Try to discover IG User ID (best-effort — not required if already known)
    let igUserId = null;
    let pageName = null;

    try {
      const pagesRes  = await fetch(`${GRAPH}/me/accounts?access_token=${longToken}`);
      const pagesData = await pagesRes.json();
      if (pagesRes.ok && pagesData.data?.length) {
        for (const page of pagesData.data) {
          const igRes  = await fetch(`${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${longToken}`);
          const igData = await igRes.json();
          if (igData.instagram_business_account?.id) {
            igUserId = igData.instagram_business_account.id;
            pageName = page.name;
            break;
          }
        }
      }
    } catch (_) { /* non-fatal */ }

    return res.status(200).send(successPage({ igUserId, longToken, expiryDays, pageName }));

  } catch (err) {
    console.error('Instagram callback error:', err.message);
    return res.status(500).send(errorPage(err.message));
  }
};

function successPage({ igUserId, longToken, expiryDays, pageName }) {
  const userIdBlock = igUserId
    ? `<div class="card">
        <label>INSTAGRAM_USER_ID</label>
        <div class="value" title="Click to select">${igUserId}</div>
        <p class="hint">Click the value to select it, then copy.</p>
       </div>`
    : `<div class="card" style="border-color:#ffe082;background:#fff8e1;">
        <label>INSTAGRAM_USER_ID</label>
        <p style="font-size:14px;color:#7a5c00;line-height:1.6;">Could not auto-detect — use <strong>17841402907917345</strong> (visible in your Meta Business Suite → Instagram accounts page).</p>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instagram Setup — Laser Tag 2 U</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f6f7;color:#2c2f30;padding:48px 24px}
  .wrap{max-width:560px;margin:0 auto}
  .badge{display:inline-block;background:#cafd00;color:#2c2f30;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:20px}
  h1{font-size:24px;font-weight:700;margin-bottom:8px}
  .sub{font-size:15px;color:#5a6068;margin-bottom:32px}
  .card{background:#fff;border:1px solid #e6e8ea;border-radius:12px;padding:24px;margin-bottom:16px}
  .card label{display:block;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#5a6068;margin-bottom:10px}
  .value{font-family:'Menlo','Courier New',monospace;font-size:13px;background:#f5f6f7;border:1px solid #e6e8ea;border-radius:6px;padding:12px 14px;word-break:break-all;cursor:pointer;user-select:all;line-height:1.5}
  .value:hover{border-color:#cafd00}
  .hint{font-size:12px;color:#5a6068;margin-top:8px}
  .warn{background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:14px 16px;font-size:13px;color:#7a5c00;margin-bottom:24px;line-height:1.5}
  ol{padding-left:20px;margin-bottom:32px}
  li{font-size:14px;color:#5a6068;margin-bottom:8px;line-height:1.5}
  li strong{color:#2c2f30}
  .footer{font-size:12px;color:#adb1b4;margin-top:32px}
</style>
</head>
<body>
<div class="wrap">
  <div class="badge">✓ Token generated</div>
  <h1>Almost there — copy these into Vercel</h1>
  <p class="sub">${pageName ? `Page: <strong>${pageName}</strong> &mdash; ` : ''}Token generated successfully.</p>

  ${userIdBlock}

  <div class="card">
    <label>INSTAGRAM_ACCESS_TOKEN &nbsp;&middot;&nbsp; expires in ${expiryDays} days</label>
    <div class="value" title="Click to select">${longToken}</div>
    <p class="hint">Click the value to select it, then copy.</p>
  </div>

  <div class="warn">⚠️ This token expires in <strong>${expiryDays} days</strong>. To renew it, visit <strong>/api/instagram-connect</strong> again before it expires.</div>

  <ol>
    <li>Go to <strong>Vercel → your project → Settings → Environment Variables</strong></li>
    <li>Add (or update) <strong>INSTAGRAM_USER_ID</strong> with the value above</li>
    <li>Add (or update) <strong>INSTAGRAM_ACCESS_TOKEN</strong> with the value above</li>
    <li>Click <strong>Save</strong> then go to <strong>Deployments → Redeploy</strong></li>
  </ol>

  <p class="footer">You can close this page. Don't share these values with anyone.</p>
</div>
</body>
</html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Instagram Setup Error</title>
<style>
  body{font-family:-apple-system,sans-serif;background:#f5f6f7;color:#2c2f30;padding:48px 24px;max-width:560px;margin:0 auto}
  h1{font-size:20px;margin-bottom:12px;color:#c0392b}
  p{font-size:15px;color:#5a6068;line-height:1.6}
  a{color:#2c2f30}
</style>
</head>
<body>
  <h1>Setup failed</h1>
  <p>${message}</p>
  <p style="margin-top:24px"><a href="/api/instagram-connect">← Try again</a></p>
</body>
</html>`;
}
