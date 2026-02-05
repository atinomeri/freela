-- migrate CLIENT -> EMPLOYER (safety for old data)
UPDATE "User" SET "role" = 'EMPLOYER' WHERE "role" = 'CLIENT';
