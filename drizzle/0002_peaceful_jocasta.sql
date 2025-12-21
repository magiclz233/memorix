CREATE TABLE "files" (
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
CREATE TABLE "photo_metadata" (
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
CREATE TABLE "user_storages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_storage_id_user_storages_id_fk" FOREIGN KEY ("user_storage_id") REFERENCES "public"."user_storages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_metadata" ADD CONSTRAINT "photo_metadata_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_storages" ADD CONSTRAINT "user_storages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_path_unique" ON "files" USING btree ("user_storage_id","path");