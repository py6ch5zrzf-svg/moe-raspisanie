/** Browser/Node verifier for ES256 signed offline license tokens. No private keys here. */
const decoder = new TextDecoder();
const encoder = new TextEncoder();

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url');
  const standard = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

function invalid(reason) { return { valid: false, reason }; }

/** Returns {valid, reason?, claims?}. Never store keys or payment secrets in client code. */
export async function verifyLicense(token, publicJwk, options = {}) {
  try {
    if (typeof token !== 'string' || token.length > 8192) return invalid('invalid_token');
    if (!publicJwk || publicJwk.kty !== 'EC' || publicJwk.crv !== 'P-256') return invalid('key_not_configured');
    if (typeof options.deviceId !== 'string' || !options.deviceId) return invalid('device_id_required');
    if (typeof options.expectedKid !== 'string' || !options.expectedKid) return invalid('key_id_required');
    const segments = token.split('.');
    if (segments.length !== 3) return invalid('invalid_token');
    const [head, body, signature] = segments;
    const header = JSON.parse(decoder.decode(decodeBase64Url(head)));
    const claims = JSON.parse(decoder.decode(decodeBase64Url(body)));
    if (header.alg !== 'ES256' || header.typ !== 'MOE-LICENSE' || header.kid !== options.expectedKid) return invalid('unexpected_header');
    if (!claims || claims.v !== 1 || typeof claims.licenseId !== 'string' || !claims.licenseId ||
        typeof claims.subjectId !== 'string' || !claims.subjectId ||
        !['pro', 'college'].includes(claims.plan) ||
        typeof claims.deviceId !== 'string' || !claims.deviceId ||
        !['issuedAt','notBefore','expiresAt','offlineUntil'].every(k => Number.isSafeInteger(claims[k]))) return invalid('invalid_claims');
    if (claims.deviceId !== options.deviceId) return invalid('wrong_device');
    if (claims.offlineUntil > claims.expiresAt || claims.notBefore > claims.expiresAt || claims.issuedAt > claims.expiresAt) return invalid('invalid_dates');
    const key = await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const verified = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, decodeBase64Url(signature), encoder.encode(head + '.' + body));
    if (!verified) return invalid('invalid_signature');
    const nowSec = Math.floor((options.nowMs ?? Date.now()) / 1000);
    if (!Number.isFinite(nowSec)) return invalid('invalid_clock');
    if (claims.issuedAt > nowSec + 300 || claims.notBefore > nowSec + 300) return invalid('not_yet_valid');
    if (nowSec >= claims.expiresAt) return invalid('license_expired');
    if (nowSec >= claims.offlineUntil) return invalid('online_refresh_required');
    return { valid: true, claims };
  } catch (_) { return invalid('invalid_token'); }
}
