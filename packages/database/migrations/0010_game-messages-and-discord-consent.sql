CREATE TABLE "discord_guild_join_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"state_digest" varchar(43) NOT NULL,
	"code_verifier" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_guild_join_attempts_state_digest_unique" UNIQUE("state_digest")
);
--> statement-breakpoint
CREATE TABLE "game_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" varchar(2000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_server_joined_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "discord_server_prompt_dismissed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discord_guild_join_attempts" ADD CONSTRAINT "discord_guild_join_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discord_guild_join_attempts" ADD CONSTRAINT "discord_guild_join_attempts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_messages" ADD CONSTRAINT "game_messages_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_messages" ADD CONSTRAINT "game_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discord_guild_join_attempts_user_id_index" ON "discord_guild_join_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "discord_guild_join_attempts_expiry_index" ON "discord_guild_join_attempts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "game_messages_game_created_id_index" ON "game_messages" USING btree ("game_id","created_at","id");