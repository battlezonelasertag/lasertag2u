/* ============================================================
   API/ENQUIRY.JS — Vercel Serverless Function
   Receives form POST, sends enquiry email via Resend.

   Environment variables (set in Vercel project settings):
     RESEND_API_KEY   — from resend.com/api-keys (required)
     RESEND_FROM      — e.g. "Laser Tag 2 U <enquiries@lasertag2u.com.au>"
                        Requires domain verified in Resend.
                        Omit to use Resend's test address during development.
     ENQUIRY_TO       — destination inbox (defaults to info@lasertag2u.com.au)
   ============================================================ */

const EVENT_TYPE_LABELS = {
  'school-fete':       'School Fete / Fair',
  'council-community': 'Council / Community',
  'sports-club':       'Sports Club',
  'birthday-party':    'Birthday Party',
  'vacation-care':     'OSHC / Vacation Care',
  'corporate':         'Corporate Group',
  'other':             'Other',
};

// Formats a YYYY-MM-DD value as "Sat, 12 September 2026".
// Returns null for anything that isn't a well-formed date, so unvalidated
// input never reaches the email HTML.
function formatEventDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return date.toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function buildEnquiryHtml({ name, phone, email, eventTypeLabel, eventDateLabel, location, guest_count, message, source_page }) {
  const rows = [
    ['Name',        name],
    ['Phone',       `<a href="tel:${phone}" style="color:#2c2f30;text-decoration:none;">${phone}</a>`],
    ['Email',       `<a href="mailto:${email}" style="color:#2c2f30;text-decoration:none;">${email}</a>`],
    ['Event Type',  eventTypeLabel],
    eventDateLabel ? ['Event Date', eventDateLabel] : null,
    ['Location',    location],
    guest_count ? ['Guest Count', guest_count] : null,
    message      ? ['Message',     message]     : null,
    ['Enquiry via', source_page || 'website'],
  ]
    .filter(Boolean)
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 20px 10px 0;color:#5a6068;font-size:14px;vertical-align:top;white-space:nowrap;width:120px;">${label}</td>
        <td style="padding:10px 0;color:#2c2f30;font-size:14px;font-weight:600;line-height:1.5;">${value}</td>
      </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="background:#2c2f30;border-radius:12px 12px 0 0;padding:28px 32px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Laser Tag 2 U</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">New Enquiry</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.55);">${eventTypeLabel} · ${name}</p>
    </div>
    <div style="background:#ffffff;padding:32px;border-left:1px solid #e6e8ea;border-right:1px solid #e6e8ea;">
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
    </div>
    <div style="background:#f5f6f7;border:1px solid #e6e8ea;border-radius:0 0 12px 12px;padding:18px 32px;">
      <p style="margin:0;font-size:13px;color:#5a6068;">Hit <strong>Reply</strong> to respond directly to ${name}.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildConfirmationHtml({ name, eventTypeLabel }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px;">
    <div style="background:#2c2f30;border-radius:12px 12px 0 0;padding:28px 32px;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Laser Tag 2 U</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">We've got your enquiry!</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.55);">${eventTypeLabel}</p>
    </div>
    <div style="background:#ffffff;padding:32px;border-left:1px solid #e6e8ea;border-right:1px solid #e6e8ea;">
      <p style="margin:0 0 16px;font-size:15px;color:#2c2f30;line-height:1.6;">Hi ${name},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#2c2f30;line-height:1.6;">Thanks for reaching out! We've received your enquiry and will get back to you as soon as possible — usually within one business day.</p>
      <p style="margin:0 0 24px;font-size:15px;color:#2c2f30;line-height:1.6;">In the meantime, if you need to speak with us urgently you can call us on <a href="tel:1300661565" style="color:#97ca46;font-weight:600;text-decoration:none;">1300 661 565</a>.</p>
      <p style="margin:0;font-size:15px;color:#2c2f30;line-height:1.6;">Talk soon,<br><strong>The Laser Tag 2 U Team</strong></p>
    </div>
    <div style="background:#f5f6f7;border:1px solid #e6e8ea;border-radius:0 0 12px 12px;padding:18px 32px;">
      <p style="margin:0;font-size:13px;color:#5a6068;">lasertag2u.com.au &nbsp;·&nbsp; 1300 661 565 &nbsp;·&nbsp; Port Stephens, NSW</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(apiKey, payload) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || `Resend ${response.status}`);
  }

  return response.json();
}

const SPAM_KEYWORDS = [
  'casino', 'viagra', 'cialis', 'crypto', 'bitcoin', 'nft', 'loan', 'forex',
  'seo service', 'backlink', 'click here', 'make money', 'work from home',
  'free money', 'cheap meds', 'pharmacy', 'investment opportunity',
];

function isSpam({ _hp, _t, name, message }) {
  // Missing honeypot or timestamp field means a direct API POST (bot bypassing the form)
  if (_hp === undefined || _t === undefined) return true;

  // Honeypot filled — bot
  if (_hp.trim() !== '') return true;

  // Submitted too fast or timestamp is invalid/stale
  const elapsed = Date.now() - parseInt(_t, 10);
  if (isNaN(elapsed) || elapsed < 5000 || elapsed > 7200000) return true;

  // Spam keywords in name or message
  const text = `${name || ''} ${message || ''}`.toLowerCase();
  if (SPAM_KEYWORDS.some(kw => text.includes(kw))) return true;

  return false;
}

async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY not set — skipping Turnstile verification');
    return true;
  }

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification error:', err.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    name,
    phone,
    email,
    event_type,
    event_date,
    location,
    guest_count,
    message,
    _source_page,
    _hp,
    _t,
    'cf-turnstile-response': turnstileToken,
  } = req.body || {};

  if (!name || !email || !phone || !event_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Silent reject for bots — return 200 so they think it worked
  if (isSpam({ _hp, _t, name, message })) {
    return res.status(200).json({ ok: true });
  }

  // Verify Cloudflare Turnstile token — missing token is a hard reject
  if (!turnstileToken) {
    return res.status(200).json({ ok: true });
  }

  const remoteIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket?.remoteAddress;
  const turnstileOk = await verifyTurnstile(turnstileToken, remoteIp);
  if (!turnstileOk) {
    return res.status(200).json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const eventTypeLabel = EVENT_TYPE_LABELS[event_type] || event_type;
  const eventDateLabel = formatEventDate(event_date);
  const fromAddress    = process.env.RESEND_FROM || 'onboarding@resend.dev';
  const toAddress      = process.env.ENQUIRY_TO  || 'info@lasertag2u.com.au';

  try {
    await Promise.all([
      // Notification to the business
      sendEmail(apiKey, {
        from:     fromAddress,
        to:       [toAddress],
        reply_to: email,
        subject:  `New Enquiry — ${eventTypeLabel} · ${name}${eventDateLabel ? ` · ${eventDateLabel}` : ''}`,
        html:     buildEnquiryHtml({ name, phone, email, eventTypeLabel, eventDateLabel, location, guest_count, message, source_page: _source_page }),
      }),
      // Confirmation to the customer
      sendEmail(apiKey, {
        from:    fromAddress,
        to:      [email],
        subject: `We've received your enquiry — Laser Tag 2 U`,
        html:    buildConfirmationHtml({ name, eventTypeLabel }),
      }),
    ]);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Enquiry send failed:', err.message);
    return res.status(500).json({ error: 'Failed to send enquiry' });
  }
};
