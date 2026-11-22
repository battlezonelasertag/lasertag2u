/* Guard tests for the one-time Instagram setup endpoints. Run: node api/instagram-setup.test.js */
process.env.INSTAGRAM_APP_ID = '1234567890';

const mkRes = () => {
  const r = { code: null, body: null, redirect: null };
  r.status = c => { r.code = c; return r; };
  r.send = b => { r.body = b; return r; };
  r.writeHead = (c, h) => { r.code = c; r.redirect = h.Location; return r; };
  r.end = () => r;
  return r;
};

let fails = 0;
const check = (label, cond) => {
  if (!cond) { fails++; console.log('FAIL:', label); } else console.log('pass:', label); };

const call = async (mod, query) => {
  const res = mkRes();
  await require(mod)({ query, headers: { host: 'lasertag2u.com.au' } }, res);
  return res;
};

(async () => {
  const CONNECT = './instagram-connect.js';
  const CB      = './instagram-callback.js';

  // --- Fail closed when SETUP_KEY is unset ---
  delete process.env.SETUP_KEY;
  check('connect disabled without SETUP_KEY',  (await call(CONNECT, {})).code === 503);
  check('callback disabled without SETUP_KEY', (await call(CB, { code: 'x' })).code === 503);

  // --- With a key set ---
  process.env.SETUP_KEY = 'correct-horse-battery-staple';
  const { stateToken } = require('./_setup-auth.js');
  const good = stateToken(process.env.SETUP_KEY);

  check('connect rejects no key',        (await call(CONNECT, {})).code === 404);
  check('connect rejects wrong key',     (await call(CONNECT, { key: 'nope' })).code === 404);
  check('connect rejects key prefix',    (await call(CONNECT, { key: 'correct-horse' })).code === 404);

  const ok = await call(CONNECT, { key: process.env.SETUP_KEY });
  check('connect redirects with right key', ok.code === 302);
  check('redirect goes to facebook',        /^https:\/\/www\.facebook\.com\//.test(ok.redirect || ''));
  check('redirect carries state',           (ok.redirect || '').includes(`state=${good}`));
  check('redirect does NOT leak SETUP_KEY', !(ok.redirect || '').includes(process.env.SETUP_KEY));

  // --- Callback CSRF: a forged link has no valid state ---
  check('callback rejects missing state', (await call(CB, { code: 'attacker' })).code === 400);
  check('callback rejects wrong state',   (await call(CB, { code: 'attacker', state: 'abc' })).code === 400);

  // Correct state gets past the guard (then fails on the real network call, which is fine)
  const passed = await call(CB, { code: 'x', state: good });
  check('callback accepts valid state', passed.code !== 400 && passed.code !== 404);

  console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
  process.exit(fails ? 1 : 0);
})();
