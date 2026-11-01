import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RELEASE_API_URL = 'https://api.github.com/repos/zyz445038-maker/al-muhtaraz/releases/latest';
const MANIFEST_ASSET_NAME = 'update-manifest.json';
const MAX_MANIFEST_BYTES = 64 * 1024;
const RELEASE_CACHE_SECONDS = 300;
const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
};

export async function GET() {
  try {
    const releaseResponse = await fetch(RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Al-Muhtaraz-Desktop-Updater',
      },
      next: { revalidate: RELEASE_CACHE_SECONDS },
    });

    if (releaseResponse.status === 404) {
      return new Response(null, { status: 204, headers: RESPONSE_HEADERS });
    }
    if (!releaseResponse.ok) {
      throw new Error(`GitHub latest-release request failed with HTTP ${releaseResponse.status}.`);
    }

    const release = await releaseResponse.json();
    const manifestAsset = release.assets?.find(
      (asset: { name?: string }) => asset.name === MANIFEST_ASSET_NAME,
    );
    if (!manifestAsset || typeof manifestAsset.browser_download_url !== 'string') {
      throw new Error('The latest published GitHub release has no update manifest asset.');
    }

    const assetUrl = new URL(manifestAsset.browser_download_url);
    if (assetUrl.protocol !== 'https:' || assetUrl.hostname !== 'github.com') {
      throw new Error('The GitHub release manifest asset URL is not trusted.');
    }

    const manifestResponse = await fetch(assetUrl, {
      headers: { Accept: 'application/octet-stream' },
      next: { revalidate: RELEASE_CACHE_SECONDS },
    });
    if (!manifestResponse.ok) {
      throw new Error(`GitHub update-manifest download failed with HTTP ${manifestResponse.status}.`);
    }

    const contentLength = Number(manifestResponse.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_MANIFEST_BYTES) {
      throw new Error('The published update manifest exceeds the size limit.');
    }
    const manifestText = await manifestResponse.text();
    if (Buffer.byteLength(manifestText, 'utf8') > MAX_MANIFEST_BYTES) {
      throw new Error('The published update manifest exceeds the size limit.');
    }

    return new Response(manifestText, {
      headers: {
        ...RESPONSE_HEADERS,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Desktop update endpoint failed:', error);
    return NextResponse.json(
      { error: 'Latest desktop update is temporarily unavailable.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
