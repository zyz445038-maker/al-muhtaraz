const assert = require('node:assert/strict');
const { createHash, generateKeyPairSync, sign } = require('node:crypto');
const test = require('node:test');
const {
  compareStableVersions,
  verifyUpdateAsset,
  verifyUpdateManifest,
} = require('../electron/updateManifest.cjs');

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const installer = Buffer.from('test installer bytes');
const validPayload = {
  schemaVersion: 1,
  productId: 'com.almuhtaraz.containers',
  platform: 'win32-x64',
  version: '1.0.1',
  tag: 'v1.0.1',
  repository: 'zyz445038-maker/al-muhtaraz',
  fileName: 'Al-Muhtaraz-Setup-1.0.1.exe',
  downloadUrl: 'https://github.com/zyz445038-maker/al-muhtaraz/releases/download/v1.0.1/Al-Muhtaraz-Setup-1.0.1.exe',
  sha256: createHash('sha256').update(installer).digest('hex'),
  sizeBytes: installer.length,
};

function createManifest(payload = validPayload) {
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  return {
    algorithm: 'Ed25519',
    payload: payloadBytes.toString('base64'),
    signature: sign(null, payloadBytes, privateKey).toString('base64'),
  };
}

test('accepts a signed update for the expected product and platform', () => {
  assert.deepEqual(
    verifyUpdateManifest(createManifest(), { publicKey, currentVersion: '1.0.0' }),
    validPayload,
  );
});

test('rejects a tampered signed payload', () => {
  const manifest = createManifest();
  const tampered = Buffer.from(manifest.payload, 'base64');
  tampered[tampered.length - 1] ^= 1;
  manifest.payload = tampered.toString('base64');
  assert.throws(
    () => verifyUpdateManifest(manifest, { publicKey, currentVersion: '1.0.0' }),
    /signature verification failed/,
  );
});

test('rejects another product and an untrusted download origin', () => {
  assert.throws(
    () => verifyUpdateManifest(createManifest({ ...validPayload, productId: 'other.product' }), { publicKey }),
    /unsupported product/,
  );
  assert.throws(
    () => verifyUpdateManifest(createManifest({
      ...validPayload,
      downloadUrl: 'https://attacker.example/file.exe',
    }), { publicKey }),
    /not an allowed GitHub release asset/,
  );
});

test('rejects installer filenames that are unsafe on Windows', () => {
  for (const fileName of ['..\\outside.exe', 'folder/file.exe', 'CON.exe']) {
    assert.throws(
      () => verifyUpdateManifest(createManifest({ ...validPayload, fileName }), { publicKey }),
      /installer filename is invalid/,
    );
  }
});

test('rejects an installer name that differs from the release naming contract', () => {
  assert.throws(
    () => verifyUpdateManifest(createManifest({
      ...validPayload,
      fileName: 'Setup.1.0.1.exe',
      downloadUrl: 'https://github.com/zyz445038-maker/al-muhtaraz/releases/download/v1.0.1/Setup.1.0.1.exe',
    }), { publicKey }),
    /installer filename is invalid/,
  );
});

test('rejects same-version and downgrade manifests', () => {
  assert.throws(
    () => verifyUpdateManifest(createManifest(), { publicKey, currentVersion: '1.0.1' }),
    /not describe a newer/,
  );
  assert.equal(compareStableVersions('1.0.1', '1.0.0'), 1);
  assert.equal(compareStableVersions('1.0.0', '1.0.1'), -1);
});

test('checks downloaded installer size and SHA-256 against signed metadata', () => {
  const payload = verifyUpdateManifest(createManifest(), { publicKey, currentVersion: '1.0.0' });
  assert.equal(verifyUpdateAsset(payload, installer), true);
  assert.throws(() => verifyUpdateAsset(payload, Buffer.from('modified installer')), /size does not match/);
  assert.throws(() => verifyUpdateAsset(payload, Buffer.from('test installer byteS')), /SHA-256 does not match/);
});
