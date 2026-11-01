const { createPrivateKey } = require('node:crypto');

function loadEd25519PrivateKey(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('UPDATE_ED25519_PRIVATE_KEY secret is required to sign release metadata.');
  }

  const unquotedValue = value.trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
  const normalizedValue = unquotedValue
    .replace(/^\uFEFF/, '')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .trim();
  const candidates = [{ key: normalizedValue }];
  const base64Value = normalizedValue.replace(/\s/g, '');

  if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64Value)) {
    const decoded = Buffer.from(base64Value, 'base64');
    if (
      decoded.length > 0
      && decoded.toString('base64') === base64Value
    ) {
      const decodedText = decoded.toString('utf8').replace(/^\uFEFF/, '').trim();
      if (decodedText.startsWith('-----BEGIN ')) {
        candidates.push({ key: decodedText });
      }
      candidates.push({ key: decoded, format: 'der', type: 'pkcs8' });
    }
  }

  let parsedKey;
  try {
    for (const candidate of candidates) {
      try {
        const privateKey = createPrivateKey(candidate);
        if (privateKey.asymmetricKeyType !== 'ed25519') {
          throw new Error('wrong-key-type');
        }
        parsedKey = privateKey;
        break;
      } catch (error) {
        if (error.message === 'wrong-key-type') {
          throw error;
        }
      }
    }
  } catch {
    throw new Error('UPDATE_ED25519_PRIVATE_KEY must contain an Ed25519 private key.');
  }

  if (!parsedKey) {
    throw new Error(
      'UPDATE_ED25519_PRIVATE_KEY must be an unencrypted Ed25519 PKCS#8 private key '
      + 'in PEM or Base64-encoded PEM/DER format.',
    );
  }
  return parsedKey;
}

module.exports = { loadEd25519PrivateKey };
