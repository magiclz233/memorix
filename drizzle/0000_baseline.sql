DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skip creating extension pgcrypto due to insufficient privilege';
END
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" varchar(50) DEFAULT 'user',
	"image_url" varchar(255),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_storages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"title" varchar(255),
	"path" text NOT NULL,
	"source_type" varchar(50),
	"size" bigint,
	"mime_type" varchar(100),
	"mtime" timestamp,
	"url" text,
	"thumb_url" text,
	"user_storage_id" integer NOT NULL,
	"media_type" varchar(50) NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "photo_metadata" (
	"file_id" integer PRIMARY KEY NOT NULL,
	"description" text,
	"camera" varchar(255),
	"maker" varchar(255),
	"lens" varchar(255),
	"date_shot" timestamp,
	"exposure" double precision,
	"aperture" double precision,
	"iso" bigint,
	"focal_length" double precision,
	"flash" integer,
	"orientation" integer,
	"exposure_program" integer,
	"gps_latitude" double precision,
	"gps_longitude" double precision,
	"resolution_width" integer,
	"resolution_height" integer,
	"white_balance" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "storage_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(16) NOT NULL,
	"config" jsonb NOT NULL,
	"status" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "photo_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collection_items" (
	"collection_id" uuid NOT NULL,
	"file_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "collection_items_collection_id_file_id_pk" PRIMARY KEY("collection_id","file_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_series_items" (
	"series_id" uuid NOT NULL,
	"file_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "video_series_items_series_id_file_id_pk" PRIMARY KEY("series_id","file_id")
);
--> statement-breakpoint
ALTER TABLE "user_storages" ADD CONSTRAINT "user_storages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_storage_id_user_storages_id_fk" FOREIGN KEY ("user_storage_id") REFERENCES "public"."user_storages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD CONSTRAINT "photo_metadata_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_photo_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."photo_collections"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "video_series_items" ADD CONSTRAINT "video_series_items_series_id_video_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."video_series"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "video_series_items" ADD CONSTRAINT "video_series_items_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_path_unique" ON "files" USING btree ("user_storage_id","path");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_settings_user_key_unique" ON "user_settings" USING btree ("user_id","key");
