const { createPublicKey } = require('node:crypto');
const UPDATE_PUBLIC_KEY = require('../electron/updatePublicKey.cjs');
const { loadEd25519PrivateKey } = require('./release-key.cjs');

try {
  const privateKey = loadEd25519PrivateKey(process.env.UPDATE_ED25519_PRIVATE_KEY);
  const signingPublicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
  const trustedPublicKey = createPublicKey(UPDATE_PUBLIC_KEY).export({ type: 'spki', format: 'der' });
  if (!signingPublicKey.equals(trustedPublicKey)) {
    throw new Error('UPDATE_ED25519_PRIVATE_KEY does not match the public key pinned in the application.');
  }
  console.log('PASS: release signing key matches the public key pinned in the application.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
