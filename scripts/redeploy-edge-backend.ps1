param(
  [string]$ImageName = "scramjet-edge-backend:latest",
  [string]$ContainerName = "proxy-edge-backend",
  [int]$Port = 4143
)

$ErrorActionPreference = "Stop"

Push-Location (Resolve-Path "$PSScriptRoot\..")
try {
  docker build -f Dockerfile.edge-backend -t $ImageName .

  $existing = docker ps -aq --filter "name=^/$ContainerName$"
  if ($existing) {
    docker rm -f $ContainerName | Out-Null
  }

  $envArgs = @()
  if (Test-Path ".env") {
    $envArgs = @("--env-file", ".env")
  }

  docker run -d `
    --name $ContainerName `
    --restart unless-stopped `
    -p "${Port}:4143" `
    -v proxy-edge-cookie-store:/data/cookies `
    @envArgs `
    $ImageName | Out-Null

  Start-Sleep -Seconds 2

  $localHealth = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/healthz" -UseBasicParsing -TimeoutSec 15
  if ($localHealth.StatusCode -ne 200 -or $localHealth.Content.Trim() -ne "ok") {
    throw "Local health check failed: $($localHealth.StatusCode) $($localHealth.Content)"
  }

  Write-Host "Backend redeployed: http://127.0.0.1:$Port/healthz"
} finally {
  Pop-Location
}
