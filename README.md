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

## Staff account management

Administrators create staff accounts in the application. The Windows build
sends this operation to the trusted Vercel API; configure
`SUPABASE_SERVICE_ROLE_KEY` as a server-only Vercel environment secret. For
local development, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`. Never include the service-role key in the Windows build or expose
it through a `NEXT_PUBLIC_` variable.

## Archive file storage

Archive metadata remains in Supabase on both platforms. File contents use
separate durable backends: the Windows app stores files under its Electron
`userData\archive` directory (outside the install directory), while the web
app stores them in the private Supabase Storage bucket named `documents`.
Apply `supabase/migrations/003_enforce_archive_permissions.sql` and then
`supabase/migrations/004_archive_storage.sql` and
`supabase/migrations/005_archive_import_worker.sql` in order before enabling
uploads.
The migrations are not applied automatically and must be reviewed and applied
to the intended Supabase project.

Only verified PDF uploads up to 4 MB are accepted. The limit keeps multipart
uploads within the hosted serverless request-size ceiling. Web jobs are
processed by the scheduled GitHub Actions workflow every five minutes. Set a
strong `CRON_SECRET` in both the GitHub Actions secrets and Vercel production
environment; they must match. Windows jobs are processed while the
desktop app is open and an authorized archive user is signed in. Processing
uses bounded exponential retries and stale-job recovery; job claiming is
conditional so concurrent workers cannot claim the same queued job.

Back up the Windows user-data folder separately; uninstalling or losing that
device can otherwise make its local archive files unavailable.

## Windows release signing

Push a stable tag matching the `package.json` version (for example `v1.0.1`) to
run `.github/workflows/windows-release.yml`. The workflow builds and smoke-tests
the Windows installer, creates a SHA-256 sidecar and an Ed25519-signed update
manifest, verifies the Authenticode signatures, then uploads them with the
public code-signing certificate to a **draft** GitHub Release for review. Publish
the reviewed release to make it available to the updater.

Before creating a release, configure these settings in the GitHub Actions
environment named `release.` (including the trailing period):

- Secrets: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Secret: `UPDATE_ED25519_PRIVATE_KEY`, containing the PEM private key.
  Configure required reviewers for this environment and protect the `v*` tag
  pattern so only trusted maintainers can start a signing run. The private key
  must match the public key pinned in the application. Keep it only in this
  environment secret; never commit it or paste it into source files, workflow
  logs, or chat.
- Secrets: `WINDOWS_CODE_SIGNING_CERTIFICATE_BASE64` (the base64-encoded PFX)
  and `WINDOWS_CODE_SIGNING_CERTIFICATE_PASSWORD`.
- Variable: `WINDOWS_CODE_SIGNING_CERTIFICATE_SHA256`, the SHA-256 hash of the
  public certificate's DER-encoded `.cer` file.

The Windows certificate must be a currently valid, self-signed RSA certificate
with a key of at least 3072 bits and the Code Signing enhanced key usage. The
workflow checks its private key and certificate fingerprint, uses the PFX only
on the ephemeral Windows runner, signs the application executables and
installer, and verifies that each signature matches the pinned certificate.
The runner temporarily trusts the public certificate only to validate those
signatures, then removes it and the PFX. Never add the PFX or its password to
the repository, build artifacts, or release assets.

The manually triggered Windows test build can run without code-signing settings;
its artifact is clearly named `unsigned` and Windows may show an untrusted
publisher or security warning. If any signing setting is configured, all three
must be present and valid. Tagged Windows releases always require signing.

Create/export the self-signed certificate on a secured administrator-controlled
machine, using the official company name in its subject. Store the encrypted
PFX and its password as the two `WINDOWS_CODE_SIGNING_CERTIFICATE_*` secrets
in the protected `release.` environment. Export the public certificate as DER
`.cer`, calculate its SHA-256 with `Get-FileHash -Algorithm SHA256`, and store
that fingerprint in `WINDOWS_CODE_SIGNING_CERTIFICATE_SHA256`. Never paste the
private key or PFX password into chat or source control. The certificate
subject is self-asserted; it does not prove a publicly verified company
identity.

The matching Ed25519 public key is pinned in
`electron/updatePublicKey.cjs`. The Vercel endpoint
`/api/desktop-update` reads the latest **published** GitHub Release and returns
its signed manifest; the installer itself remains hosted by GitHub. The
packaged app checks this endpoint after startup, verifies the manifest and
repository, and prompts before downloading. It verifies the downloaded
installer's exact size and SHA-256 before asking whether to launch it. The user
must confirm the Windows installer; it is not run silently. The installer
should be installed over the existing copy, preserving the app's user data.
Test this upgrade flow on a managed device before publishing updates broadly.
The endpoint caches release metadata for up to five minutes.

Authenticode signing is enabled when the protected certificate configuration
is present. An internal self-signed certificate is not publicly trusted and
does not establish the legal identity of its subject. Windows may still show
SmartScreen warnings. The signed `.cer` is published only to let an
administrator verify and deploy it to the explicitly managed devices; the
application installer never imports certificates or changes Windows trust
stores. Distribute trust through administrator-managed device policy, verify
the SHA-256 fingerprint first, and limit the certificate to the three
intended devices. Because this certificate is self-signed, an administrator
must determine and test the required Windows trust stores; do not deploy it to
additional devices or use it as a general-purpose root certificate.

To test a Windows build without creating a release, run the **Windows desktop
build test** workflow manually from the Actions tab. It builds and smoke-tests
the signed installer, verifies its Authenticode signature, then uploads the
installer, SHA-256 checksum, and public certificate as a temporary workflow
artifact (14-day retention). This test does not use the Ed25519 signing secret
or publish a GitHub Release.