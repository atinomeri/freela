INSERT INTO "SiteContent" ("id", "key", "locale", "value", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'home.subtitle', 'ka', 'Freela აერთიანებს დამკვეთებს და ფრილანსერებს', NOW(), NOW())
ON CONFLICT ("key", "locale") DO UPDATE
  SET "value" = 'Freela აერთიანებს დამკვეთებს და ფრილანსერებს',
      "updatedAt" = NOW();
