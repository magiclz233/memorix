ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(50);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';
UPDATE "users" SET "role" = 'user' WHERE "role" IS NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image_url" varchar(255);
