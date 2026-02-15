# PowerShell Profile Aliases for Freela Deployment
# Add these to your PowerShell profile: $PROFILE

# Global deployment function
function Deploy-Freela {
    param(
        [Parameter(Mandatory=$false, Position=0)]
        [string]$Message = "chore: update application"
    )
    
    $scriptPath = "c:\Users\admin\Desktop\freela\deploy\quick-deploy.ps1"
    
    if (-not (Test-Path $scriptPath)) {
        Write-Host "Error: Deploy script not found at $scriptPath" -ForegroundColor Red
        return
    }
    
    & $scriptPath -CommitMessage $Message
}

# Quick deploy alias
Set-Alias -Name deploy -Value Deploy-Freela -Scope Global -Force

# Usage examples (add to PowerShell):
# deploy "your commit message"
# deploy "feat: add new feature"
# deploy "fix: security patch"

# Export for persistence
Export-ModuleMember -Function Deploy-Freela -Alias deploy
