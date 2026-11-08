const assert = require('node:assert/strict');
const test = require('node:test');
const { fetchRelease, validateInstallerUrl } = require('./verify-release-assets.cjs');

function configureGitHubMocks(t, handler) {
  const originalFetch = global.fetch;
  const originalToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'test-token';
  global.fetch = handler;
  t.after(() => {
    global.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
  });
}

test('finds the matching draft through the authenticated releases list', async (t) => {
  configureGitHubMocks(t, async (url, options) => {
    assert.equal(
      url,
      'https://api.github.com/repos/example/app/releases?per_page=100&page=1',
    );
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response(JSON.stringify([
      { tag_name: 'v1.0.3', draft: false },
      { tag_name: 'v1.0.2', draft: true },
      { tag_name: 'v1.0.3', draft: true, id: 123 },
    ]), { status: 200 });
  });

  const release = await fetchRelease('v1.0.3', '--draft', 'example/app');
  assert.equal(release.id, 123);
});

test('keeps published release lookup by tag', async (t) => {
  configureGitHubMocks(t, async (url) => {
    assert.equal(
      url,
      'https://api.github.com/repos/example/app/releases/tags/v1.0.3',
    );
    return new Response(JSON.stringify({ tag_name: 'v1.0.3', draft: false }), {
      status: 200,
    });
  });

  const release = await fetchRelease('v1.0.3', '--published', 'example/app');
  assert.equal(release.tag_name, 'v1.0.3');
  assert.equal(release.draft, false);
});

test('allows GitHub draft URLs while requiring the signed final release URL', () => {
  const expectedUrl = 'https://github.com/example/app/releases/download/v1.0.3/Al-Muhtaraz-Setup-1.0.3.exe';
  const draftUrl = 'https://github.com/example/app/releases/download/untagged-abc/Al-Muhtaraz-Setup-1.0.3.exe';

  assert.doesNotThrow(() => validateInstallerUrl('--draft', expectedUrl, draftUrl, expectedUrl));
  assert.throws(
    () => validateInstallerUrl('--draft', draftUrl, draftUrl, expectedUrl),
    /Signed manifest URL/,
  );
  assert.throws(
    () => validateInstallerUrl('--published', expectedUrl, draftUrl, expectedUrl),
    /Published installer URL/,
  );
  assert.doesNotThrow(() => validateInstallerUrl('--published', expectedUrl, expectedUrl, expectedUrl));
});
