const assert = require('node:assert/strict');
const { createPublicKey, generateKeyPairSync } = require('node:crypto');
const test = require('node:test');
const { loadEd25519PrivateKey } = require('./release-key.cjs');

test('loads a PEM-encoded Ed25519 private key', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const pem = privateKey.export({ format: 'pem', type: 'pkcs8' });
  const loaded = loadEd25519PrivateKey(pem);
  assert.deepEqual(
    createPublicKey(loaded).export({ type: 'spki', format: 'der' }),
    publicKey.export({ type: 'spki', format: 'der' }),
  );
});

test('normalizes literal escaped newlines in the PEM secret', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const pem = privateKey.export({ format: 'pem', type: 'pkcs8' });
  const escapedPem = pem.replace(/\r?\n/g, '\\n');
  const loaded = loadEd25519PrivateKey(escapedPem);
  assert.deepEqual(
    createPublicKey(loaded).export({ type: 'spki', format: 'der' }),
    publicKey.export({ type: 'spki', format: 'der' }),
  );
});

test('loads Base64-encoded PEM and PKCS#8 DER secrets', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const pem = privateKey.export({ format: 'pem', type: 'pkcs8' });
  const der = privateKey.export({ format: 'der', type: 'pkcs8' });

  for (const encoded of [
    Buffer.from(pem).toString('base64'),
    der.toString('base64'),
  ]) {
    const loaded = loadEd25519PrivateKey(encoded);
    assert.deepEqual(
      createPublicKey(loaded).export({ type: 'spki', format: 'der' }),
      publicKey.export({ type: 'spki', format: 'der' }),
    );
  }
});

test('reports invalid PEM and rejects other key algorithms', () => {
  assert.throws(
    () => loadEd25519PrivateKey('invalid'),
    /must be an unencrypted Ed25519 PKCS#8 private key/,
  );

  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.throws(
    () => loadEd25519PrivateKey(privateKey.export({ format: 'pem', type: 'pkcs8' })),
    /must contain an Ed25519 private key/,
  );
});
