INSERT INTO "SiteContent" ("id", "key", "locale", "value", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'home.subtitle', 'ka', 'გადაწყვეტილებები შენი ყოველდღიური პრობლემების წინააღმდეგ', NOW(), NOW())
ON CONFLICT ("key", "locale") DO UPDATE
  SET "value" = 'გადაწყვეტილებები შენი ყოველდღიური პრობლემების წინააღმდეგ',
      "updatedAt" = NOW();
