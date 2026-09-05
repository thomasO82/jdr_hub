CREATE TABLE "game_tags" (
	"game_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "game_tags_game_id_tag_id_pk" PRIMARY KEY("game_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"slug" varchar(180) NOT NULL,
	"title" varchar(160) NOT NULL,
	"system" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(16) NOT NULL,
	"status" varchar(16) DEFAULT 'DRAFT' NOT NULL,
	"visibility" varchar(16) DEFAULT 'PUBLIC' NOT NULL,
	"max_players" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "game_tags" ADD CONSTRAINT "game_tags_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tags" ADD CONSTRAINT "game_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_tags_tag_id_index" ON "game_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "games_owner_id_index" ON "games" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "games_title_index" ON "games" USING btree ("title");--> statement-breakpoint
CREATE INDEX "games_status_visibility_index" ON "games" USING btree ("status","visibility");