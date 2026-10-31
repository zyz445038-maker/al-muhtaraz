$ErrorActionPreference = 'Stop'

if ($env:WINDOWS_SIGNING_CERTIFICATE_THUMBPRINT) {
  foreach ($storeName in @('Root', 'TrustedPublisher')) {
    $certificatePath = "Cert:\CurrentUser\$storeName\$($env:WINDOWS_SIGNING_CERTIFICATE_THUMBPRINT)"
    if (Test-Path -LiteralPath $certificatePath) {
      & "$env:SystemRoot\System32\certutil.exe" -user -delstore $storeName `
        $env:WINDOWS_SIGNING_CERTIFICATE_THUMBPRINT
      if ($LASTEXITCODE -ne 0) {
        throw "Could not remove the temporary signing certificate from the $storeName store."
      }
    }
  }
}

Remove-Item -LiteralPath (
  Join-Path $env:RUNNER_TEMP 'al-muhtaraz-code-signing.pfx'
) -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath (
  Join-Path $env:RUNNER_TEMP 'Al-Muhtaraz-Code-Signing.cer'
) -Force -ErrorAction SilentlyContinue
