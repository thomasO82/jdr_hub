CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"proposal_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" varchar(16) DEFAULT 'PROPOSED' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_sessions_proposal_unique" UNIQUE("proposal_id")
);
--> statement-breakpoint
CREATE TABLE "time_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"proposer_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" varchar(16) DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_votes" (
	"proposal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote" varchar(8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_votes_proposal_user_pk" PRIMARY KEY("proposal_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_proposal_id_time_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."time_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_proposals" ADD CONSTRAINT "time_proposals_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_proposals" ADD CONSTRAINT "time_proposals_proposer_id_users_id_fk" FOREIGN KEY ("proposer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_votes" ADD CONSTRAINT "time_votes_proposal_id_time_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."time_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_votes" ADD CONSTRAINT "time_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_sessions_game_start_index" ON "game_sessions" USING btree ("game_id","starts_at");--> statement-breakpoint
CREATE INDEX "game_sessions_status_index" ON "game_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "time_proposals_game_start_index" ON "time_proposals" USING btree ("game_id","starts_at");--> statement-breakpoint
CREATE INDEX "time_proposals_status_index" ON "time_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "time_votes_user_index" ON "time_votes" USING btree ("user_id");
