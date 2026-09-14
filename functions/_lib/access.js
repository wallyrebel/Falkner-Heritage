/* Cloudflare Access — token verification.
 *
 * Access sits in front of /admin and /api at the edge, but we verify the
 * signed token here as well. Without this, anyone who found the project's
 * *.pages.dev deployment URL would reach these routes directly, because an
 * Access policy is attached to a hostname and the preview hostnames are not
 * covered by it. Verifying the JWT closes that door.
 *
 * https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

const CERTS_TTL_MS = 60 * 60 * 1000;   // Access rotates keys slowly; an hour is plenty.
let certsCache = null;                  // { teamDomain, fetchedAt, keys: [CryptoKey-with-kid] }

function b64urlToBytes(input) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = (input.replace(/-/g, '+').replace(/_/g, '/')) + pad;
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function decodeJson(segment) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(segment)));
}

function normaliseTeamDomain(value) {
  const trimmed = String(value || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.includes('.') ? trimmed : `${trimmed}.cloudflareaccess.com`;
}

async function loadKeys(teamDomain) {
  const fresh = certsCache
    && certsCache.teamDomain === teamDomain
    && (Date.now() - certsCache.fetchedAt) < CERTS_TTL_MS;
  if (fresh) return certsCache.keys;

  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs fetch failed: ${res.status}`);
  const body = await res.json();
  if (!body || !Array.isArray(body.keys)) throw new Error('Access certs response had no keys');

  const keys = [];
  for (const jwk of body.keys) {
    try {
      const key = await crypto.subtle.importKey(
        'jwk',
        { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      keys.push({ kid: jwk.kid, key });
    } catch {
      /* Skip a key we cannot import rather than failing every request. */
    }
  }
  if (!keys.length) throw new Error('No usable Access signing keys');

  certsCache = { teamDomain, fetchedAt: Date.now(), keys };
  return keys;
}

function readToken(request) {
  const header = request.headers.get('Cf-Access-Jwt-Assertion');
  if (header) return header.trim();

  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function accessConfig(env) {
  const teamDomain = normaliseTeamDomain(env.ACCESS_TEAM_DOMAIN);
  const aud = String(env.ACCESS_AUD || '').trim();
  return { teamDomain, aud, configured: Boolean(teamDomain && aud) };
}

/* Returns { email, name } on success, or null if the request carries no valid
 * Access token. Throws only when the environment is misconfigured. */
export async function verifyAccess(request, env) {
  const { teamDomain, aud, configured } = accessConfig(env);
  if (!configured) throw new Error('ACCESS_TEAM_DOMAIN and ACCESS_AUD must both be set');

  const token = readToken(request);
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  let header, payload;
  try {
    header = decodeJson(parts[0]);
    payload = decodeJson(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== 'RS256') return null;

  const keys = await loadKeys(teamDomain);
  const candidates = header.kid ? keys.filter((k) => k.kid === header.kid) : keys;
  if (!candidates.length) return null;

  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = b64urlToBytes(parts[2]);

  let valid = false;
  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await crypto.subtle.verify('RSASSA-PKCS1-v1_5', candidate.key, signature, signed)) {
      valid = true;
      break;
    }
  }
  if (!valid) return null;

  const now = Math.floor(Date.now() / 1000);
  const skew = 60;
  if (typeof payload.exp !== 'number' || payload.exp + skew < now) return null;
  if (typeof payload.nbf === 'number' && payload.nbf - skew > now) return null;
  if (payload.iss !== `https://${teamDomain}`) return null;

  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience.includes(aud)) return null;

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) return null;

  return { email, name: String(payload.name || payload.given_name || '').trim() };
}
