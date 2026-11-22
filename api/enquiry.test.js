process.env.TURNSTILE_SECRET_KEY = 'test';
process.env.RESEND_API_KEY = 'test';
const handler = require('./enquiry.js');

const sent = [];
global.fetch = async (url, opts) => {
  if (url.includes('siteverify')) return { ok: true, json: async () => ({ success: true }) };
  sent.push(JSON.parse(opts.body));
  return { ok: true, json: async () => ({ id: 'x' }) };
};

function mkRes() {
  const r = { code: null, body: null, headers: {} };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  return r;
}
const base = () => ({
  name: 'Jane', phone: '0412345678', email: 'jane@example.com',
  event_type: 'birthday-party', location: 'Nelson Bay', guest_count: '20',
  message: 'hi', _hp: '', _t: String(Date.now() - 10000),
  'cf-turnstile-response': 'tok',
});
const post = (body, ip='1.1.1.1') => {
  const res = mkRes();
  return handler({ method:'POST', body, headers:{'x-forwarded-for':ip}, socket:{} }, res).then(()=>res);
};

let fails = 0;
const check = (label, cond) => { if (!cond) { fails++; console.log('FAIL:', label); } else console.log('pass:', label); };

(async () => {
  // HTML injection in name must not survive into the email
  sent.length = 0;
  let r = await post({ ...base(), name: '<img src=x onerror=alert(1)>Jane' });
  check('injection accepted as plain text', r.code === 200);
  const html = sent.map(e => e.html).join('');
  check('no raw <img tag in email', !html.includes('<img src=x'));
  check('escaped instead', html.includes('&lt;img src=x'));

  // phone breaking out of the tel: href
  sent.length = 0;
  await post({ ...base(), phone: '0412345678' , message: '" onclick="evil()' }, '2.2.2.2');
  check('no attribute breakout', !sent.map(e=>e.html).join('').includes('onclick="evil'));

  // bad email rejected
  r = await post({ ...base(), email: 'not an email' }, '3.3.3.3');
  check('invalid email -> 400', r.code === 400);
  r = await post({ ...base(), email: 'a@b.c, victim@x.com' }, '3.3.3.4');
  check('comma-injected recipient -> 400', r.code === 400);

  // oversized field rejected
  r = await post({ ...base(), message: 'x'.repeat(5000) }, '4.4.4.4');
  check('oversized message -> 400', r.code === 400);

  // direct API post with no honeypot/timestamp still silently dropped
  sent.length = 0;
  const { _hp, _t, ...noHp } = base();
  r = await post(noHp, '5.5.5.5');
  check('missing _hp/_t -> no email sent', r.code === 200 && sent.length === 0);

  // non-string _hp must not crash
  r = await post({ ...base(), _hp: 1 }, '6.6.6.6');
  check('non-string _hp handled', r.code === 200);

  // rate limit
  const ip = '7.7.7.7';
  let codes = [];
  for (let i = 0; i < 7; i++) codes.push((await post(base(), ip)).code);
  check('6th request from same IP -> 429', codes.filter(c => c === 429).length === 2);

  // turnstile secret missing -> 500, not a silent pass
  delete process.env.TURNSTILE_SECRET_KEY;
  sent.length = 0;
  r = await post(base(), '8.8.8.8');
  check('missing turnstile secret -> 500, no email', r.code === 500 && sent.length === 0);

  console.log(fails ? `\n${fails} FAILED` : '\nAll checks passed');
  process.exit(fails ? 1 : 0);
})();
