$ErrorActionPreference = 'Stop'

$expectedFingerprint = $env:WINDOWS_CODE_SIGNING_CERTIFICATE_SHA256 -replace '[^0-9A-Fa-f]', ''
if ($expectedFingerprint -notmatch '^[0-9A-Fa-f]{64}$') {
  throw 'WINDOWS_CODE_SIGNING_CERTIFICATE_SHA256 must contain a SHA-256 certificate fingerprint.'
}

$appDirectory = Join-Path $env:GITHUB_WORKSPACE 'dist\win-unpacked'
$installerFiles = @(Get-ChildItem -LiteralPath (Join-Path $env:GITHUB_WORKSPACE 'dist') -File -Filter '*Setup*.exe')
$applicationExecutables = @(Get-ChildItem -LiteralPath $appDirectory -File -Filter '*.exe' -Recurse)
if ($installerFiles.Count -ne 1) {
  throw "Expected one Windows Setup installer; found $($installerFiles.Count)."
}
if ($applicationExecutables.Count -eq 0) {
  throw 'No application executables were found in the packaged app.'
}

$targets = @($applicationExecutables) + @($installerFiles)
foreach ($target in $targets) {
  $signature = Get-AuthenticodeSignature -LiteralPath $target.FullName
  if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate) {
    throw "Authenticode verification failed for $($target.Name): $($signature.Status) $($signature.StatusMessage)"
  }

  $actualFingerprint = [Convert]::ToHexString(
    [Security.Cryptography.SHA256]::HashData($signature.SignerCertificate.RawData)
  )
  if ($actualFingerprint -ne $expectedFingerprint.ToUpperInvariant()) {
    throw "Unexpected signing certificate on $($target.Name): $actualFingerprint."
  }

  Write-Output "PASS: $($target.Name) has a valid Authenticode signature from the pinned certificate."
}

Copy-Item -LiteralPath $env:WINDOWS_SIGNING_PUBLIC_CERTIFICATE -Destination (
  Join-Path $env:GITHUB_WORKSPACE 'dist\Al-Muhtaraz-Code-Signing.cer'
)
