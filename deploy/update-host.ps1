
param(
  [Parameter(Mandatory = $false)]
  [string]$TargetHost,
  [Parameter(Mandatory = $false)]
  [string]$User,
  [Parameter(Mandatory = $false)]
  [int]$Port,
  [Parameter(Mandatory = $false)]
  [string]$AppDir,
  [Parameter(Mandatory = $false)]
  [string]$HealthUrl
)

$ErrorActionPreference = "Stop"

if (-not $PSBoundParameters.ContainsKey('TargetHost')) { $TargetHost = $env:VPS_HOST }
if (-not $PSBoundParameters.ContainsKey('User')) { $User = $env:VPS_USER }
if (-not $PSBoundParameters.ContainsKey('Port')) { if ($env:VPS_SSH_PORT) { $Port = [int]$env:VPS_SSH_PORT } else { $Port = 22 } }
if (-not $PSBoundParameters.ContainsKey('AppDir')) { if ($env:VPS_APP_DIR) { $AppDir = $env:VPS_APP_DIR } else { $AppDir = '~/freela' } }
if (-not $PSBoundParameters.ContainsKey('HealthUrl')) { $HealthUrl = $env:DEPLOY_HEALTHCHECK_URL }

if (-not $TargetHost) {
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

$bashInvoke = 'bash -lc "' + $remote + '"'

Write-Host "[update-host.ps1] Deploying to $User@${TargetHost}:$Port (dir: $AppDir)"
& ssh -p $Port "$User@$TargetHost" $bashInvoke
if ($LASTEXITCODE -ne 0) {
  throw "Remote deploy failed with exit code $LASTEXITCODE"
}

Write-Host "[update-host.ps1] Done"
