-- Enable pg_trgm extension for trigram-based indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on Project.title for fast ILIKE / contains queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Project_title_trgm_idx"
  ON "Project" USING gin ("title" gin_trgm_ops);

-- GIN trigram index on Project.description for fast ILIKE / contains queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Project_description_trgm_idx"
  ON "Project" USING gin ("description" gin_trgm_ops);

-- GIN trigram index on Profile.title for freelancer search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Profile_title_trgm_idx"
  ON "Profile" USING gin ("title" gin_trgm_ops);

-- GIN trigram index on Profile.bio for freelancer search
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Profile_bio_trgm_idx"
  ON "Profile" USING gin ("bio" gin_trgm_ops);
