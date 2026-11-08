const { createHash, verify } = require('node:crypto');
const UPDATE_PUBLIC_KEY = require('./updatePublicKey.cjs');

const PRODUCT_ID = 'com.almuhtaraz.containers';
const PLATFORM = 'win32-x64';
const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseStableVersion(version) {
  if (typeof version !== 'string' || !STABLE_VERSION_PATTERN.test(version)) {
    throw new Error('Update version must be a stable semantic version.');
  }
  return version.split('.').map(BigInt);
}

function compareStableVersions(left, right) {
  const leftParts = parseStableVersion(left);
  const rightParts = parseStableVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] > rightParts[index] ? 1 : -1;
    }
  }
  return 0;
}

function decodeBase64(value, label) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`Update manifest ${label} must be canonical base64.`);
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.toString('base64') !== value) {
    throw new Error(`Update manifest ${label} must be canonical base64.`);
  }
  return decoded;
}

function validatePayload(payload, currentVersion) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Update manifest payload must be an object.');
  }
  if (payload.schemaVersion !== 1 || payload.productId !== PRODUCT_ID || payload.platform !== PLATFORM) {
    throw new Error('Update manifest is for an unsupported product, platform, or schema.');
  }

  parseStableVersion(payload.version);
  if (payload.tag !== `v${payload.version}`) {
    throw new Error('Update manifest tag does not match its version.');
  }
  if (currentVersion && compareStableVersions(payload.version, currentVersion) <= 0) {
    throw new Error('Update manifest does not describe a newer application version.');
  }
  const expectedFileName = `Al-Muhtaraz-Setup-${payload.version}.exe`;
  if (payload.fileName !== expectedFileName) {
    throw new Error('Update manifest installer filename is invalid.');
  }
  if (
    /[\\/:*?"<>|\0]/u.test(payload.fileName)
    || payload.fileName.trim() !== payload.fileName
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(payload.fileName)
  ) {
    throw new Error('Update manifest installer filename is invalid.');
  }
  if (typeof payload.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(payload.sha256)) {
    throw new Error('Update manifest SHA-256 digest is invalid.');
  }
  if (!Number.isSafeInteger(payload.sizeBytes) || payload.sizeBytes < 1) {
    throw new Error('Update manifest installer size is invalid.');
  }

  let downloadUrl;
  try {
    downloadUrl = new URL(payload.downloadUrl);
  } catch {
    throw new Error('Update manifest download URL is invalid.');
  }
  const expectedPath = `/${payload.repository}/releases/download/${payload.tag}/${encodeURIComponent(payload.fileName)}`;
  if (
    downloadUrl.protocol !== 'https:'
    || downloadUrl.hostname !== 'github.com'
    || downloadUrl.port
    || downloadUrl.username
    || downloadUrl.password
    || downloadUrl.search
    || downloadUrl.hash
    || typeof payload.repository !== 'string'
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(payload.repository)
    || downloadUrl.pathname !== expectedPath
  ) {
    throw new Error('Update manifest download URL is not an allowed GitHub release asset.');
  }
}

function verifyUpdateManifest(manifest, options = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('Update manifest envelope must be an object.');
  }
  const envelopeKeys = Object.keys(manifest).sort();
  if (
    envelopeKeys.length !== 3
    || envelopeKeys[0] !== 'algorithm'
    || envelopeKeys[1] !== 'payload'
    || envelopeKeys[2] !== 'signature'
    || manifest.algorithm !== 'Ed25519'
  ) {
    throw new Error('Update manifest envelope format is unsupported.');
  }

  const payloadBytes = decodeBase64(manifest.payload, 'payload');
  const signature = decodeBase64(manifest.signature, 'signature');
  if (signature.length !== 64 || !verify(null, payloadBytes, options.publicKey || UPDATE_PUBLIC_KEY, signature)) {
    throw new Error('Update manifest signature verification failed.');
  }

  let payload;
  try {
    payload = JSON.parse(payloadBytes.toString('utf8'));
  } catch {
    throw new Error('Signed update manifest payload is not valid JSON.');
  }
  validatePayload(payload, options.currentVersion);
  return payload;
}

function verifyUpdateAsset(payload, content) {
  if (!Buffer.isBuffer(content) && !(content instanceof Uint8Array)) {
    throw new Error('Update asset content must be a byte buffer.');
  }
  validatePayload(payload);
  const bytes = Buffer.from(content);
  if (bytes.length !== payload.sizeBytes) {
    throw new Error('Update asset size does not match the signed manifest.');
  }
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== payload.sha256) {
    throw new Error('Update asset SHA-256 does not match the signed manifest.');
  }
  return true;
}

module.exports = {
  compareStableVersions,
  verifyUpdateAsset,
  verifyUpdateManifest,
};
