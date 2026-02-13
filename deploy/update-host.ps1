Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $false)]
  [string]$Host = $env:VPS_HOST,

  [Parameter(Mandatory = $false)]
  [string]$User = $env:VPS_USER,

  [Parameter(Mandatory = $false)]
  [int]$Port = $(if ($env:VPS_SSH_PORT) { [int]$env:VPS_SSH_PORT } else { 22 }),

  [Parameter(Mandatory = $false)]
  [string]$AppDir = $(if ($env:VPS_APP_DIR) { $env:VPS_APP_DIR } else { "~/freela" }),

  [Parameter(Mandatory = $false)]
  [string]$HealthUrl = $env:DEPLOY_HEALTHCHECK_URL
)

if (-not $Host) {
  throw "Missing -Host (or set VPS_HOST env)."
}
if (-not $User) {
  throw "Missing -User (or set VPS_USER env)."
}

$sshCmd = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshCmd) {
  throw "OpenSSH client not found. Install it first (Windows Optional Features)."
}

$remote = "cd '$AppDir' && chmod +x deploy/update-host.sh && ./deploy/update-host.sh"
if ($HealthUrl) {
  $remote += " --health-url '$HealthUrl'"
}

$escapedRemote = $remote.Replace("'", "'\"'\"'")
$bashInvoke = "bash -lc '$escapedRemote'"

Write-Host "[update-host.ps1] Deploying to $User@$Host:$Port (dir: $AppDir)"
& ssh -p $Port "$User@$Host" $bashInvoke
if ($LASTEXITCODE -ne 0) {
  throw "Remote deploy failed with exit code $LASTEXITCODE"
}

Write-Host "[update-host.ps1] Done"
