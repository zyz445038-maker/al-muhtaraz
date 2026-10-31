# muhtarazm-gmail.com

## Electron runtime proof of concept

The Windows proof currently tests a packaged Electron app starting the production
Next.js standalone server on `127.0.0.1`. It does not add SQLite or offline data
operations.

```powershell
npm ci
npm run desktop:pack
npm run desktop:smoke -- --relocate
npm run desktop:smoke:crash
```

The smoke test copies the unpacked app to a temporary directory, verifies the
local Arabic page and independent API, blocks and records external renderer
requests, checks that closing Electron stops its local server, and can simulate
a stopped Next.js process. A clean Windows installation and a physically
disconnected network still require separate validation.

If the installed app cannot start its local server, inspect
`%APPDATA%\al-muhtaraz-containers\desktop-runtime.log`. The log includes the
server entry point, process ID, local readiness URL, and periodic HTTP or
connection failures; attach it when reporting startup problems.

## Windows release signing

Push a stable tag matching the `package.json` version (for example `v1.0.1`) to
run `.github/workflows/windows-release.yml`. The workflow builds and smoke-tests
the Windows installer, creates a SHA-256 sidecar and an Ed25519-signed update
manifest, then uploads them to a **draft** GitHub Release for review.

Before creating a release, configure these settings in the GitHub Actions
environment named `release.` (including the trailing period):

- Secrets: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Secret: `UPDATE_ED25519_PRIVATE_KEY`, containing the PEM private key.
  Configure required reviewers for this environment and protect the `v*` tag
  pattern so only trusted maintainers can start a signing run. The private key
  must match the public key pinned in the application. Keep it only in this
  environment secret; never commit it or paste it into source files, workflow
  logs, or chat.

The matching Ed25519 public key is pinned in
`electron/updatePublicKey.cjs`. The packaged app includes a verifier that checks
the signed manifest, release URL, product, platform, and version, and can check
the downloaded installer size and SHA-256. Automatic update discovery and
installation are intentionally not enabled yet; integrate them only after a
separate compatibility review of the Electron/NSIS installation layout.

Authenticode signing remains disabled until a trusted Windows code-signing
certificate is available.

To test a Windows build without creating a release, run the **Windows desktop
build test** workflow manually from the Actions tab. It builds and smoke-tests
the installer, then uploads the installer and SHA-256 checksum as a temporary
workflow artifact (14-day retention). This test does not use the signing secret
or publish a GitHub Release.