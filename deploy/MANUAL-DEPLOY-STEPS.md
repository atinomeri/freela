# 🚀 Срочный Деплой (Manual)

Если GitHub Actions не деплоит, выполните эти команды на **VPS консоли** (Hostinger/другой хостинг):

## Способ 1: Через VPS Web Console (Самый прямой)

1. Откройте: **Hostinger VPS Console** или **Hetzner Console**
2. Выполните эту команду:

```bash
cd /root/freela && \
git pull origin main && \
docker-compose -f docker-compose.prod.yml up -d && \
sleep 3 && \
curl https://freela.ge/api/health
```

3. Если увидели `"ok":true` - деплой успешен ✅

---

## Способ 2: Через SSH (Если имеется SSH доступ)

```bash
ssh root@76.13.144.121
```

Потом выполните:
```bash
cd /root/freela
git pull origin main
docker-compose -f docker-compose.prod.yml up -d
sleep 5
curl https://freela.ge/api/health
```

---

## Способ 3: Просто перезагрузить контейнеры

Если код уже на VPS, просто перезагрузите:

```bash
cd /root/freela
docker-compose -f docker-compose.prod.yml restart
sleep 3
curl https://freela.ge/api/health
```

---

## Способ 4: Очистить всё и пересобрать

Если есть проблемы с кэшем:

```bash
cd /root/freela
git fetch origin main
git reset --hard origin/main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f  # Смотри логи
```

---

## После деплоя

1. Проверьте здоровье:
   ```bash
   curl https://freela.ge/api/health
   ```

2. На своем компьютере:
   - Откройте https://freela.ge
   - **Hard refresh**: Ctrl+Shift+R (Windows/Linux) или Cmd+Shift+R (Mac)
   - Кликайте между страницами
   - Вы должны видеть плавные fade-in/fade-out переходы ✨

---

## Проверка что было задеплоено

```bash
cd /root/freela
git log --oneline -3
# Должны видеть:
# 29c2728 fix: add missing dependency in PageTransition useEffect hook
```

---

## Если всё ещё не работает

1. Проверьте контейнер APP:
   ```bash
   docker logs freela-app --tail 50
   ```

2. Проверьте Nginx/Caddy:
   ```bash
   docker logs freela-caddy --tail 50
   ```

3. Перезагрузите ВСЕ контейнеры:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker system prune -f
   docker-compose -f docker-compose.prod.yml up -d
   ```

---

**Status Check URL:** https://freela.ge/api/health

**Stack:** Next.js + PostgreSQL + Redis + Docker
