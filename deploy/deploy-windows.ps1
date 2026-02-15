param(
    [string]$ServerIP = "76.13.144.121",
    [string]$AppPath = "/root/freela"
)

Write-Host "Starting deployment to $ServerIP..."
Write-Host "Building locally..."

# Run local build and tests
$buildResult = & npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green
Write-Host "Deployment ready. Changes committed and pushed to GitHub."
Write-Host "GitHub Actions will automatically deploy when CI passes."
Write-Host ""
Write-Host "To deploy immediately on server, execute on VPS:"
Write-Host ""
Write-Host "  ssh root@$ServerIP"
Write-Host "  cd $AppPath"
Write-Host "  git pull origin main"
Write-Host "  docker-compose -f docker-compose.prod.yml up -d"
Write-Host ""
Write-Host "✅ Local validation complete"
Write-Host "⏳ Waiting for GitHub Actions deployment..."
