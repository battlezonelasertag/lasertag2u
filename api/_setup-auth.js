/* Shared guard for the one-time Instagram setup endpoints.
   Vercel does not route files prefixed with "_", so this is not a public endpoint. */

const crypto = require('crypto');

// The OAuth `state` sent to Meta and checked on the way back. Derived from the
// key rather than being the key, so the secret never reaches Meta's logs.
// shortcut: static per key, not a per-request nonce — replay also needs a live
// single-use Facebook `code`. Swap for a signed nonce if this stops being a
// one-off setup flow.
function stateToken(secret) {
  return crypto.createHmac('sha256', secret).update('instagram-setup').digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Returns the key on success. On failure it responds and returns null, so
// callers must `if (!requireSetupKey(req, res)) return;`.
function requireSetupKey(req, res) {
  const setupKey = process.env.SETUP_KEY;

  // Fail closed: an unset key disables setup rather than opening it.
  if (!setupKey) {
    res.status(503).send('Setup is disabled. Set SETUP_KEY in the Vercel environment to enable it.');
    return null;
  }
  if (!req.query.key || !safeEqual(req.query.key, setupKey)) {
    res.status(404).send('Not found');
    return null;
  }
  return setupKey;
}

module.exports = { requireSetupKey, stateToken, safeEqual };
