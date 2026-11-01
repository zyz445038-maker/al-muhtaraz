const { createPrivateKey } = require('node:crypto');

function loadEd25519PrivateKey(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('UPDATE_ED25519_PRIVATE_KEY secret is required to sign release metadata.');
  }

  const pem = value.replace(/(?:\\r)?\\n/g, '\n').trim();
  let privateKey;
  try {
    privateKey = createPrivateKey(pem);
  } catch {
    throw new Error(
      'UPDATE_ED25519_PRIVATE_KEY must be an unencrypted PEM-encoded Ed25519 private key. '
      + 'Preserve its PEM header and line breaks.',
    );
  }

  if (privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('UPDATE_ED25519_PRIVATE_KEY must contain an Ed25519 private key.');
  }
  return privateKey;
}

module.exports = { loadEd25519PrivateKey };
