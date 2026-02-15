# 🚀 Freela Quick Deploy Reference

## TL;DR - The Fastest Way

### Windows (from your laptop)
```powershell
deploy "your message here"
```

### VPS (from production server)
```bash
deploy "your message here"
```

---

## Setup (One Time)

### Windows Setup
```powershell
# 1. Allow PowerShell scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 2. Add alias to PowerShell profile
# Open: $PROFILE
# Add contents of: deploy/powershell-profile.ps1
# Then reload: . $PROFILE
```

### VPS Setup
```bash
# 1. Add to ~/.bashrc or ~/.zshrc
cat deploy/bash-profile.sh >> ~/.bashrc

# 2. Reload shell
source ~/.bashrc
```

---

## What Happens When You Deploy?

### Windows Flow
```
deploy "message"
    ↓
npm run build
    ↓
npm run test
    ↓
git commit -m "message"
    ↓
git push origin main
    ↓
GitHub Actions auto-deploys! ✅
```

### VPS Flow
```
deploy "message"
    ↓
git commit & push
    ↓
git pull origin main
    ↓
docker-compose build
    ↓
docker-compose up -d
    ↓
Health check ✅
```

---

## Common Use Cases

### Deploy new feature (Windows)
```powershell
deploy "feat: add smooth page transitions"
```

### Deploy security fix (Windows)
```powershell
deploy "fix: prevent XSS vulnerability"  
```

### Emergency hotfix (VPS)
```bash
deploy "hotfix: critical bug in production"
```

### Deploy without tests (Windows)
```powershell
.\deploy\quick-deploy.ps1 -SkipTests -CommitMessage "emergency fix"
```

---

## Check Status

### Health endpoint
```bash
# Windows
curl.exe https://freela.ge/api/health

# VPS  
curl https://freela.ge/api/health
```

### GitHub Actions
Visit: https://github.com/atinomeri/freela/actions

### Live Logs (VPS)
```bash
dl  # Shows tail -f logs
```

---

## Emergency Commands

### Rollback last deployment
```bash
ssh root@76.13.144.121
cd ~/freela
git revert HEAD
deploy "revert: rollback last deployment"
```

### Restart services
```bash
ssh root@76.13.144.121
cd ~/freela
docker-compose -f docker-compose.prod.yml restart
```

### View all services
```bash
ssh root@76.13.144.121
ds  # docker status alias
```

---

## File Locations

| File | Purpose | When Used |
|------|---------|-----------|
| `deploy/quick-deploy.ps1` | Main Windows deploy | `deploy "message"` |
| `deploy/quick-deploy.sh` | Main VPS deploy | `deploy "message"` |
| `deploy/README-DEPLOY.md` | Full documentation | Reference guide |
| `deploy/config.json` | Deployment config | CI/CD pipelines |

---

## One-Liners

### Full deployment cycle  
**Windows:**
```powershell
deploy "release: v1.0.0"
```

**VPS:**
```bash
deploy "release: v1.0.0"
```

### Just push code
```powershell
git add . ; git commit -m "message" ; git push
```

### Just check health
```bash
curl https://freela.ge/api/health | jq
# or use: dh
```

---

## Aliases Available

### Windows
```powershell
deploy "message"  # Full pipeline
```

### VPS
```bash
deploy "message"  # Full pipeline
dd               # Quick deploy (default message)
dl               # View logs
dh               # Health check
ds               # Service status
dr               # Restart services
```

---

## FAQ

**Q: How long does deployment take?**
A: ~3-5 minutes total (build, test, commit, push, GitHub Actions, Docker rebuild)

**Q: What if tests fail?**
A: Deployment stops at test stage. Fix locally and retry.

**Q: Can I skip tests?**
A: Yes: `.\deploy\quick-deploy.ps1 -SkipTests "message"`

**Q: What about rollbacks?**
A: Git history is preserved. Use `git revert` for emergency rollbacks.

**Q: How do I access VPS?**
A: `ssh root@76.13.144.121`

**Q: Where are logs?**
A: Windows: `deploy/deploy.log` | VPS: `/root/freela/deploy/deploy.log`

---

**Created:** 2026-02-15  
**Last Updated:** 2026-02-15  
**Status:** ✅ Production Ready
