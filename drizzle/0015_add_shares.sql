CREATE TABLE IF NOT EXISTS "shares" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255),
	"file_ids" integer[] DEFAULT '{}' NOT NULL,
	"password_hash" text,
	"expires_at" timestamp,
	"role" varchar(16) DEFAULT 'viewer' NOT NULL,
	"allow_download" boolean DEFAULT true NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shares_user_id_idx" ON "shares" USING btree ("user_id");
