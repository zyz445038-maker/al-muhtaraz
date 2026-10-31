$ErrorActionPreference = 'Stop'

$requiredEnvironmentVariables = @(
  'WINDOWS_CODE_SIGNING_CERTIFICATE_BASE64',
  'WINDOWS_CODE_SIGNING_CERTIFICATE_PASSWORD',
  'WINDOWS_CODE_SIGNING_CERTIFICATE_SHA256'
)
foreach ($name in $requiredEnvironmentVariables) {
  if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
    throw "Required Windows signing configuration is missing: $name."
  }
}

$expectedFingerprint = $env:WINDOWS_CODE_SIGNING_CERTIFICATE_SHA256 -replace '[^0-9A-Fa-f]', ''
if ($expectedFingerprint -notmatch '^[0-9A-Fa-f]{64}$') {
  throw 'WINDOWS_CODE_SIGNING_CERTIFICATE_SHA256 must contain a SHA-256 certificate fingerprint.'
}

$certificatePath = Join-Path $env:RUNNER_TEMP 'al-muhtaraz-code-signing.pfx'
$publicCertificatePath = Join-Path $env:RUNNER_TEMP 'Al-Muhtaraz-Code-Signing.cer'
$certificate = $null
$publicCertificate = $null
$rsaKey = $null
$stores = @()

try {
  $pfxBytes = [Convert]::FromBase64String($env:WINDOWS_CODE_SIGNING_CERTIFICATE_BASE64)
  [IO.File]::WriteAllBytes($certificatePath, $pfxBytes)
  $certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new(
    $pfxBytes,
    $env:WINDOWS_CODE_SIGNING_CERTIFICATE_PASSWORD,
    [Security.Cryptography.X509Certificates.X509KeyStorageFlags]::EphemeralKeySet
  )

  if (-not $certificate.HasPrivateKey) {
    throw 'The Windows signing PFX does not contain a private key.'
  }
  if ($certificate.Subject -ne $certificate.Issuer) {
    throw 'The Windows signing certificate must be self-signed as configured for this internal release.'
  }
  if ([DateTime]::UtcNow -lt $certificate.NotBefore.ToUniversalTime() -or
    [DateTime]::UtcNow -ge $certificate.NotAfter.ToUniversalTime()) {
    throw 'The Windows signing certificate is not currently valid.'
  }

  $ekuExtension = $certificate.Extensions |
    Where-Object { $_.Oid.Value -eq '2.5.29.37' } |
    Select-Object -First 1
  $hasCodeSigningUsage = $ekuExtension -and
    $ekuExtension.EnhancedKeyUsages.Value -contains '1.3.6.1.5.5.7.3.3'
  if (-not $hasCodeSigningUsage) {
    throw 'The certificate does not include the Code Signing enhanced key usage.'
  }

  $rsaKey = [Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPublicKey($certificate)
  if (-not $rsaKey -or $rsaKey.KeySize -lt 3072) {
    throw 'The Windows signing certificate must use an RSA key of at least 3072 bits.'
  }

  $actualFingerprint = [Convert]::ToHexString(
    [Security.Cryptography.SHA256]::HashData($certificate.RawData)
  )
  if ($actualFingerprint -ne $expectedFingerprint.ToUpperInvariant()) {
    throw 'The signing certificate SHA-256 fingerprint does not match the protected environment variable.'
  }

  [IO.File]::WriteAllBytes($publicCertificatePath, $certificate.Export(
    [Security.Cryptography.X509Certificates.X509ContentType]::Cert
  ))
  $publicCertificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new(
    $publicCertificatePath
  )
  $sha1Thumbprint = $publicCertificate.Thumbprint

  @(
    "certificate_path=$certificatePath"
    "public_certificate_path=$publicCertificatePath"
    "certificate_thumbprint=$sha1Thumbprint"
  ) | Out-File -FilePath $env:GITHUB_OUTPUT -Append -Encoding utf8

  foreach ($storeName in @('Root', 'TrustedPublisher')) {
    $store = [Security.Cryptography.X509Certificates.X509Store]::new(
      $storeName,
      [Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
    )
    $store.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $stores += $store
    $store.Add($publicCertificate)
  }

  Write-Output "Validated the pinned RSA code-signing certificate ($actualFingerprint)."
  Write-Output 'Trusted the public certificate in the ephemeral GitHub runner for signature verification.'
}
catch {
  Remove-Item -LiteralPath $certificatePath, $publicCertificatePath -Force -ErrorAction SilentlyContinue
  throw "Could not prepare the Windows signing certificate: $($_.Exception.Message)"
}
finally {
  foreach ($store in $stores) {
    $store.Close()
  }
  if ($rsaKey) {
    $rsaKey.Dispose()
  }
  if ($publicCertificate) {
    $publicCertificate.Dispose()
  }
  if ($certificate) {
    $certificate.Dispose()
  }
}
