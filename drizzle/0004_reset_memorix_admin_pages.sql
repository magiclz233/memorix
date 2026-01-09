CREATE TABLE "collection_items" (
	"collection_id" uuid NOT NULL,
	"file_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "collection_items_collection_id_file_id_pk" PRIMARY KEY("collection_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "photo_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(16) NOT NULL,
	"config" jsonb NOT NULL,
	"status" varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_series_items" (
	"series_id" uuid NOT NULL,
	"file_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "video_series_items_series_id_file_id_pk" PRIMARY KEY("series_id","file_id")
);
--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_photo_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."photo_collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_series_items" ADD CONSTRAINT "video_series_items_series_id_video_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."video_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_series_items" ADD CONSTRAINT "video_series_items_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;