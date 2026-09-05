CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"message" varchar(1000),
	"status" varchar(16) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_game_user_unique" UNIQUE("game_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "game_members" (
	"game_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(16) DEFAULT 'PLAYER' NOT NULL,
	"status" varchar(16) DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_members_game_id_user_id_pk" PRIMARY KEY("game_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_members" ADD CONSTRAINT "game_members_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_members" ADD CONSTRAINT "game_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "applications_game_id_index" ON "applications" USING btree ("game_id");
--> statement-breakpoint
CREATE INDEX "applications_user_id_index" ON "applications" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "applications_status_index" ON "applications" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "game_members_user_id_index" ON "game_members" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "game_members_game_status_index" ON "game_members" USING btree ("game_id","status");
