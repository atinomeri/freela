# 🚀 Freela Deployment Guide

## Quick Start

### From Windows (Local Development)
```powershell
# Single command to build → test → commit → push
cd c:\Users\admin\Desktop\freela
.\deploy\quick-deploy.ps1 "Your commit message here"
```

**What it does:**
1. ✅ Checks prerequisites (git, node)
2. ✅ Runs `npm run build`
3. ✅ Runs `npm run test` 
4. ✅ Commits changes with your message
5. ✅ Pushes to GitHub main branch
6. ✅ GitHub Actions auto-deploys

### From VPS (Production Server)
```bash
cd ~/freela
./deploy/quick-deploy.sh "Your commit message here"
```

**What it does:**
1. ✅ Commits local changes
2. ✅ Pushes to GitHub
3. ✅ Pulls latest code
4. ✅ Rebuilds Docker images
5. ✅ Restarts all containers
6. ✅ Verifies health check

---

## Step-by-Step Examples

### Example 1: Deploy page transition changes
**From Windows:**
```powershell
.\deploy\quick-deploy.ps1 "feat: add smooth page transitions"
```

### Example 2: Deploy security fix
**From Windows:**
```powershell
.\deploy\quick-deploy.ps1 "fix: security vulnerability in auth"
```

### Example 3: Deploy directly on VPS
```bash
ssh root@76.13.144.121
cd ~/freela
./deploy/quick-deploy.sh "feat: new feature deployment"
```

---

## Automated Deployment Pipeline

### GitHub Actions Workflow
The repository includes automated CI/CD:

1. **Trigger:** Push to `main` branch or manual trigger
2. **Steps:**
   - Validate required secrets
   - Configure SSH connection
   - Clone repository on VPS
   - Run git pull
   - Restart Docker services
   - Verify health check

**Monitor at:** https://github.com/atinomeri/freela/actions

---

## Environment Setup

### Windows Prerequisite
Allow PowerShell script execution:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### VPS Prerequisite
Ensure deploy script is executable:
```bash
chmod +x ~/freela/deploy/quick-deploy.sh
```

---

## Troubleshooting

### Build fails
```powershell
# Clear build cache and retry
npm run clean
npm install
npm run build
```

### Tests fail
```powershell
# Run tests locally to debug
npm run test
```

### GitHub Actions not deploying
1. Check secrets are configured: https://github.com/atinomeri/freela/settings/secrets/actions
2. Verify SSH key has access to VPS
3. Check workflow status: https://github.com/atinomeri/freela/actions

### VPS deployment fails
```bash
# SSH into VPS and check logs
ssh root@76.13.144.121
cd ~/freela
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Key Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `quick-deploy.ps1` | Windows deployment pipeline | PowerShell with commit message |
| `quick-deploy.sh` | VPS deployment pipeline | Bash with commit message |
| `update-host.sh` | SSH-based deployment | Called by GitHub Actions |
| `deploy-windows.ps1` | Alternative Windows deploy | PowerShell automation |

---

## Health Check

After deployment, verify the server is healthy:

```bash
# From Windows
curl.exe https://freela.ge/api/health

# From VPS
curl https://freela.ge/api/health
```

Expected response:
```json
{
  "ok": true,
  "time": "2026-02-15T12:34:56.789Z",
  "uptimeSeconds": 1234,
  "ms": 2
}
```

---

## Monitoring

### Real-time logs
```bash
# SSH into VPS
ssh root@76.13.144.121
cd ~/freela

# View all services
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f app
```

### Production status
- **Site:** https://freela.ge
- **Health API:** https://freela.ge/api/health
- **GitHub Actions:** https://github.com/atinomeri/freela/actions
- **VPS IP:** 76.13.144.121

---

## Deployment Checklist

Before deploying to production:

- [ ] All local tests pass (`npm run test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Code is committed
- [ ] Descriptive commit message
- [ ] No uncommitted changes
- [ ] GitHub Actions passed on main branch

---

## Need Help?

Check deployment logs:
```bash
# Windows deployment
cat deploy/deploy.log

# VPS deployment  
tail -f /root/freela/deploy/deploy.log
```

---

**Last Updated:** 2026-02-15
**Maintainer:** Freela Team
