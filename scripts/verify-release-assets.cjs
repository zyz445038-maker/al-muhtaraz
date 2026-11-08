const { createHash } = require('node:crypto');
const { verifyUpdateManifest } = require('../electron/updateManifest.cjs');

const API_BASE_URL = 'https://api.github.com';
const UPDATE_CHECK_URL = 'https://al-muhtaraz.vercel.app/api/desktop-update';
const MAX_MANIFEST_BYTES = 64 * 1024;
const POLL_INTERVAL_MS = 15_000;
const PUBLISHED_MANIFEST_TIMEOUT_MS = 10 * 60 * 1000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function githubRequest(url, headers = {}, timeoutMs = 60_000) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}`,
      'User-Agent': 'Al-Muhtaraz-Release-Verification',
      'X-GitHub-Api-Version': '2022-11-28',
      ...headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed with HTTP ${response.status}: ${url}`);
  }
  return response;
}

async function verifyUploadedInstaller(asset, payload) {
  const response = await githubRequest(
    asset.url,
    { Accept: 'application/octet-stream' },
    30 * 60 * 1000,
  );
  assert(response.body, 'GitHub returned no uploaded installer content.');

  const hash = createHash('sha256');
  let sizeBytes = 0;
  for await (const chunk of response.body) {
    sizeBytes += chunk.length;
    assert(sizeBytes <= payload.sizeBytes, 'Uploaded installer exceeds the signed manifest size.');
    hash.update(chunk);
  }
  assert(sizeBytes === payload.sizeBytes, 'Uploaded installer size does not match the signed manifest.');
  assert(hash.digest('hex') === payload.sha256, 'Uploaded installer SHA-256 does not match the signed manifest.');
}

async function readBoundedBody(response, maxBytes, label) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    totalBytes += chunk.length;
    assert(totalBytes <= maxBytes, `${label} exceeds the size limit.`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, totalBytes);
}

async function fetchRelease(tag, mode, repository) {
  if (mode === '--published') {
    const releaseResponse = await githubRequest(`${API_BASE_URL}/repos/${repository}/releases/tags/${tag}`);
    return releaseResponse.json();
  }

  for (let page = 1; ; page += 1) {
    const url = `${API_BASE_URL}/repos/${repository}/releases?per_page=100&page=${page}`;
    const releasesResponse = await githubRequest(url);
    const releases = await releasesResponse.json();
    assert(Array.isArray(releases), 'GitHub releases response must be an array.');
    const matchingDrafts = releases.filter(release => release.tag_name === tag && release.draft);
    assert(matchingDrafts.length <= 1, `Found multiple draft releases for ${tag}.`);
    if (matchingDrafts.length === 1) return matchingDrafts[0];
    if (releases.length < 100) break;
  }

  throw new Error(`Draft release ${tag} was not found in the authenticated GitHub releases list.`);
}

async function fetchReleaseManifest(tag, mode) {
  const repository = process.env.GITHUB_REPOSITORY;
  assert(
    typeof repository === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository),
    'GITHUB_REPOSITORY must identify an owner/repository.',
  );
  assert(process.env.GH_TOKEN || process.env.GITHUB_TOKEN, 'A GitHub token is required to verify release assets.');

  const release = await fetchRelease(tag, mode, repository);
  const version = tag.replace(/^v/, '');
  const installerName = `Al-Muhtaraz-Setup-${version}.exe`;
  const expectedInstallerUrl =
    `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(installerName)}`;
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const matchingAssets = assets.filter(asset => asset.name === installerName);
  assert(matchingAssets.length === 1, `Release must contain exactly one ${installerName} asset.`);
  const installerAsset = matchingAssets[0];
  assert(
    installerAsset.browser_download_url === expectedInstallerUrl,
    'Published installer URL does not match the release naming contract.',
  );
  if (installerAsset.digest) {
    assert(
      /^sha256:[a-f0-9]{64}$/.test(installerAsset.digest),
      'GitHub returned an invalid installer digest.',
    );
  }

  const manifestAssets = assets.filter(asset => asset.name === 'update-manifest.json');
  assert(manifestAssets.length === 1, 'Release must contain exactly one update-manifest.json asset.');
  const manifestAsset = manifestAssets[0];
  const manifestResponse = await githubRequest(manifestAsset.url, {
    Accept: 'application/octet-stream',
  });
  const manifestBytes = await readBoundedBody(
    manifestResponse,
    MAX_MANIFEST_BYTES,
    'Release update manifest',
  );
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const payload = verifyUpdateManifest(manifest);

  assert(payload.repository === repository, 'Signed manifest repository does not match the release.');
  assert(payload.tag === tag, 'Signed manifest tag does not match the release.');
  assert(payload.fileName === installerName, 'Signed manifest filename does not match the uploaded installer.');
  assert(payload.downloadUrl === installerAsset.browser_download_url, 'Signed manifest URL does not match the uploaded installer URL.');
  assert(payload.sizeBytes === installerAsset.size, 'Signed manifest size does not match the uploaded installer size.');
  assert(
    !installerAsset.digest || installerAsset.digest === `sha256:${payload.sha256}`,
    'Signed manifest SHA-256 does not match GitHub’s uploaded asset digest.',
  );
  await verifyUploadedInstaller(installerAsset, payload);

  return { manifest, payload, expectedInstallerUrl, release };
}

async function waitForPublishedManifest(tag) {
  const deadline = Date.now() + PUBLISHED_MANIFEST_TIMEOUT_MS;
  let lastError = 'The update endpoint has not published the requested release yet.';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(UPDATE_CHECK_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
        cache: 'no-store',
      });
      if (response.ok) {
        const manifest = await response.json();
        const payload = verifyUpdateManifest(manifest);
        if (payload.tag === tag) return payload;
        lastError = `Update endpoint still serves ${payload.tag}, expected ${tag}.`;
      } else {
        lastError = `Update endpoint returned HTTP ${response.status}.`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Published update endpoint did not become ready: ${lastError}`);
}

async function verifyInstallerDownload(payload, url) {
  assert(url === payload.downloadUrl, 'Installer download must use the URL in the signed manifest.');
  const response = await fetch(url, {
    headers: { Accept: 'application/octet-stream' },
    signal: AbortSignal.timeout(30 * 60 * 1000),
    cache: 'no-store',
  });
  if (!response.ok || !response.body) {
    throw new Error(`Installer download failed with HTTP ${response.status}.`);
  }

  const hash = createHash('sha256');
  let sizeBytes = 0;
  for await (const chunk of response.body) {
    sizeBytes += chunk.length;
    if (sizeBytes > payload.sizeBytes) {
      throw new Error('Downloaded installer exceeds the signed manifest size.');
    }
    hash.update(chunk);
  }
  assert(sizeBytes === payload.sizeBytes, 'Downloaded installer size does not match the signed manifest.');
  assert(hash.digest('hex') === payload.sha256, 'Downloaded installer SHA-256 does not match the signed manifest.');
}

async function main() {
  const tag = process.argv[2];
  const mode = process.argv[3];
  assert(/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag || ''), 'Pass a stable vMAJOR.MINOR.PATCH release tag.');
  assert(mode === '--draft' || mode === '--published', 'Choose --draft or --published verification mode.');

  const releaseInfo = await fetchReleaseManifest(tag, mode);
  assert(
    releaseInfo.release.draft === (mode === '--draft'),
    mode === '--draft' ? 'Pre-publication validation requires a draft release.' : 'Post-publication validation requires a published release.',
  );
  console.log(`PASS: signed manifest matches the uploaded GitHub asset name, URL, size, and SHA-256 for ${tag}.`);

  if (mode === '--draft') return;

  const endpointPayload = await waitForPublishedManifest(tag);
  assert(endpointPayload.downloadUrl === releaseInfo.expectedInstallerUrl, 'Update endpoint URL differs from the verified release asset URL.');
  await verifyInstallerDownload(endpointPayload, endpointPayload.downloadUrl);
  console.log(`PASS: ${UPDATE_CHECK_URL} serves the signed ${tag} manifest, and its installer URL downloads with matching size and SHA-256.`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { fetchRelease };
