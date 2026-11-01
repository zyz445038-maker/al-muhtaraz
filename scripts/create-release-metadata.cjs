const { createHash, createPublicKey, sign } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const UPDATE_PUBLIC_KEY = require('../electron/updatePublicKey.cjs');
const { loadEd25519PrivateKey } = require('./release-key.cjs');
const { verifyUpdateAsset, verifyUpdateManifest } = require('../electron/updateManifest.cjs');

const PRODUCT_ID = 'com.almuhtaraz.containers';
const PLATFORM = 'win32-x64';
const DIST_DIRECTORY = path.resolve(__dirname, '..', 'dist');

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const tag = process.env.GITHUB_REF_NAME;
  const privateKeyValue = process.env.UPDATE_ED25519_PRIVATE_KEY;
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY must identify an owner/repository.');
  }
  if (!tag || !/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag)) {
    throw new Error('GITHUB_REF_NAME must be a stable vMAJOR.MINOR.PATCH release tag.');
  }
  const privateKey = loadEd25519PrivateKey(privateKeyValue);
  const signingPublicKey = createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
  const trustedPublicKey = createPublicKey(UPDATE_PUBLIC_KEY).export({ type: 'spki', format: 'der' });
  if (!signingPublicKey.equals(trustedPublicKey)) {
    throw new Error('UPDATE_ED25519_PRIVATE_KEY does not match the public key pinned in the application.');
  }

  const packageJson = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const version = tag.slice(1);
  if (packageJson.version !== version) {
    throw new Error(`Release tag ${tag} does not match package version ${packageJson.version}.`);
  }

  const installers = (await fs.readdir(DIST_DIRECTORY, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.exe') && entry.name.includes('Setup'));
  if (installers.length !== 1) {
    throw new Error(`Expected exactly one Windows Setup installer in ${DIST_DIRECTORY}; found ${installers.length}.`);
  }

  const fileName = installers[0].name;
  const installerPath = path.join(DIST_DIRECTORY, fileName);
  const installer = await fs.readFile(installerPath);
  const payload = {
    schemaVersion: 1,
    productId: PRODUCT_ID,
    platform: PLATFORM,
    version,
    tag,
    repository,
    fileName,
    downloadUrl: `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(fileName)}`,
    sha256: createHash('sha256').update(installer).digest('hex'),
    sizeBytes: installer.length,
  };
  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const signature = sign(null, payloadBytes, privateKey).toString('base64');
  const manifest = {
    algorithm: 'Ed25519',
    payload: payloadBytes.toString('base64'),
    signature,
  };
  const verifiedPayload = verifyUpdateManifest(manifest);
  verifyUpdateAsset(verifiedPayload, installer);

  await fs.writeFile(`${installerPath}.sha256`, `${payload.sha256}  ${fileName}\n`, { flag: 'wx' });
  await fs.writeFile(
    path.join(DIST_DIRECTORY, 'update-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: 'wx' },
  );
  console.log(`Created SHA-256 checksum and signed update manifest for ${tag}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
