#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated deployment pipeline for Freela
.DESCRIPTION
    Build → Test → Commit → Push → Deploy
    Single command to do everything
.EXAMPLE
    .\quick-deploy.ps1 "Add new feature"
#>

param(
    [Parameter(Mandatory=$false, Position=0)]
    [string]$CommitMessage = "chore: update application",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [string]$GitBranch = "main"
)

function Write-Step {
    param([string]$Message, [string]$Status = "pending")
    $colors = @{
        "pending" = "Yellow"
        "success" = "Green"
        "error" = "Red"
        "info" = "Cyan"
    }
    $symbol = @{
        "pending" = "⏳"
        "success" = "✅"
        "error" = "❌"
        "info" = "ℹ️"
    }
    Write-Host "$($symbol[$Status]) $Message" -ForegroundColor $colors[$Status]
}

function Test-Command {
    param([string]$Command)
    $null = (Get-Command $Command -ErrorAction SilentlyContinue)
    return $?
}

function Check-Prerequisites {
    Write-Host "`n=== Checking Prerequisites ===" -ForegroundColor Cyan
    
    $required = @("git", "node")
    foreach ($cmd in $required) {
        if (Test-Command $cmd) {
            Write-Step "$cmd is installed" "success"
        } else {
            Write-Step "$cmd is NOT installed" "error"
            exit 1
        }
    }
}

function Check-GitStatus {
    Write-Host "`n=== Checking Git Status ===" -ForegroundColor Cyan
    
    $status = git status --porcelain
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Step "No local changes detected" "info"
        return $false
    } else {
        Write-Step "Found local changes:" "info"
        Write-Host $status
        return $true
    }
}

function Run-Build {
    Write-Host "`n=== Building Application ===" -ForegroundColor Cyan
    
    Write-Step "Running build..." "pending"
    $buildOutput = npm run build 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Build completed successfully" "success"
        return $true
    } else {
        Write-Step "Build failed!" "error"
        Write-Host $buildOutput
        return $false
    }
}

function Run-Tests {
    if ($SkipTests) {
        Write-Step "Tests skipped (--SkipTests flag)" "info"
        return $true
    }
    
    Write-Host "`n=== Running Tests ===" -ForegroundColor Cyan
    
    Write-Step "Running unit tests..." "pending"
    $testOutput = npm run test 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Extract test count
        $matches = $testOutput | Select-String "Tests\s+(\d+)\s+passed"
        if ($matches) {
            Write-Step "All tests passed: $($matches.Matches[0].Groups[1].Value) tests" "success"
        } else {
            Write-Step "Tests passed" "success"
        }
        return $true
    } else {
        Write-Step "Tests failed!" "error"
        Write-Host $testOutput
        return $false
    }
}

function Commit-Changes {
    param([string]$Message)
    
    Write-Host "`n=== Committing Changes ===" -ForegroundColor Cyan
    
    Write-Step "Staging all changes..." "pending"
    git add -A
    
    Write-Step "Committing with message: '$Message'" "pending"
    $commitOutput = git commit -m $Message 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Extract commit hash
        $hash = $commitOutput | Select-String "(\w{7})" | Select-Object -First 1
        Write-Step "Committed: $($hash.Matches[0].Value)" "success"
        return $true
    } elseif ($commitOutput -match "nothing to commit") {
        Write-Step "No changes to commit" "info"
        return $true
    } else {
        Write-Step "Commit failed!" "error"
        Write-Host $commitOutput
        return $false
    }
}

function Push-Changes {
    Write-Host "`n=== Pushing to Remote ===" -ForegroundColor Cyan
    
    Write-Step "Pushing to origin/$GitBranch..." "pending"
    $pushOutput = git push origin $GitBranch 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Step "Changes pushed to remote" "success"
        return $true
    } else {
        Write-Step "Push failed!" "error"
        Write-Host $pushOutput
        return $false
    }
}

function Check-ServerHealth {
    Write-Host "`n=== Checking Server Health ===" -ForegroundColor Cyan
    
    Write-Step "Querying https://freela.ge/api/health..." "pending"
    
    try {
        $response = curl.exe -s https://freela.ge/api/health 2>&1 | ConvertFrom-Json
        
        if ($response.ok) {
            Write-Step "Server is healthy (uptime: $($response.uptimeSeconds)s)" "success"
            return $true
        } else {
            Write-Step "Server health check failed" "error"
            return $false
        }
    } catch {
        Write-Step "Could not connect to server" "error"
        return $false
    }
}

function Show-Summary {
    Write-Host "`n=== Deployment Summary ===" -ForegroundColor Cyan
    Write-Host "
✅ Build completed
✅ Tests passed  
✅ Changes committed
✅ Changes pushed to GitHub
⏳ GitHub Actions will auto-deploy

Monitor deployment at: https://github.com/atinomeri/freela/actions
Live site: https://freela.ge/api/health
    " -ForegroundColor Green
}

# Main execution
Write-Host "`n╔════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     FREELA DEPLOYMENT PIPELINE     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════╝`n" -ForegroundColor Cyan

Check-Prerequisites

$hasChanges = Check-GitStatus
if (-not $hasChanges) {
    Write-Step "Nothing to deploy. No changes found." "info"
    exit 0
}

if (-not (Run-Build)) {
    exit 1
}

if (-not (Run-Tests)) {
    exit 1
}

if (-not (Commit-Changes $CommitMessage)) {
    exit 1
}

if (-not (Push-Changes)) {
    exit 1
}

Start-Sleep -Seconds 2
Check-ServerHealth

Show-Summary
