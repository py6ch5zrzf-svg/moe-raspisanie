/** Server-only ES256 token issuer. Never ship private keys with a PWA. */
import { sign } from 'node:crypto';

function encode(value) { return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url'); }

export function issueLicense(claims, privateKeyPem, keyId) {
  if (!privateKeyPem || !keyId) throw new Error('Signing key and key ID are required');
  if (!claims || claims.v !== 1 || !claims.licenseId || !claims.subjectId || !claims.deviceId ||
      !['pro', 'college'].includes(claims.plan) ||
      !['issuedAt','notBefore','expiresAt','offlineUntil'].every(k => Number.isSafeInteger(claims[k]))) throw new Error('Invalid license claims');
  if (claims.offlineUntil > claims.expiresAt || claims.notBefore > claims.expiresAt) throw new Error('Invalid license dates');
  const header = { alg: 'ES256', typ: 'MOE-LICENSE', kid: keyId };
  const body = encode(header) + '.' + encode(claims);
  const signature = sign('sha256', Buffer.from(body, 'utf8'), { key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return body + '.' + signature.toString('base64url');
}
