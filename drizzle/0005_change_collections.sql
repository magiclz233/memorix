CREATE TABLE "collection_media" (
	"collection_id" integer NOT NULL,
	"file_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "collection_media_collection_id_file_id_pk" PRIMARY KEY("collection_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"author" varchar(255),
	"cover_file_id" integer,
	"type" varchar(16) DEFAULT 'mixed' NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "collection_items" CASCADE;--> statement-breakpoint
DROP TABLE "photo_collections" CASCADE;--> statement-breakpoint
DROP TABLE "video_series" CASCADE;--> statement-breakpoint
DROP TABLE "video_series_items" CASCADE;--> statement-breakpoint
CREATE INDEX "collection_media_collection_sort_index" ON "collection_media" USING btree ("collection_id","sort_order");